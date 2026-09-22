'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { emModoDemonstracao, obterPapelNoPainel, obterRestauranteDoDono } from '@/lib/dados';
import { temFuncionalidade } from '@/lib/funcionalidades';
import { podeEntrar } from '@/lib/papeis';
import { resumoDaConta, type LinhaDaConta } from '@/lib/salao';
import { clienteDoPainel, utilizadorActual } from '@/lib/supabase/servidor';
import type { EstadoPedido, ItemPedido } from '@/lib/tipos';

/**
 * O que se faz a uma mesa a partir do salão.
 *
 * Escrevem com o cliente do painel — a sessão de quem está ligado —, e a
 * base confere o papel em cada escrita (`sessoes_alteracao_equipa`,
 * `alertas_alteracao_equipa`). A verificação daqui em cima é para
 * devolver uma frase clara em vez de "0 linhas alteradas".
 */

export type Resultado<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { dados: T }))
  | { ok: false; erro: string };

const ID = z.uuid({ error: 'Mesa desconhecida.' });

async function autorizar() {
  if (emModoDemonstracao()) {
    return { ok: false as const, erro: 'Na demonstração as mesas não mudam — nada é gravado.' };
  }
  const [restaurante, papel, utilizador] = await Promise.all([
    obterRestauranteDoDono(),
    obterPapelNoPainel(),
    utilizadorActual(),
  ]);
  if (!restaurante || !utilizador) return { ok: false as const, erro: 'A sessão terminou. Volte a entrar.' };
  if (!temFuncionalidade(restaurante, 'salao')) {
    return { ok: false as const, erro: 'O salão faz parte do Plano Sala.' };
  }
  if (!podeEntrar(papel, 'salao')) {
    return { ok: false as const, erro: 'O seu papel não mexe nas mesas.' };
  }
  const supabase = await clienteDoPainel();
  if (!supabase) return { ok: false as const, erro: 'Sem ligação à base.' };
  return { ok: true as const, restauranteId: restaurante.id, quem: utilizador.id, supabase };
}

function feito() {
  revalidatePath('/painel/salao');
  return { ok: true as const };
}

export async function atenderAlerta(entrada: unknown): Promise<Resultado> {
  const dados = z.object({ id: ID }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: 'Chamada desconhecida.' };

  const acesso = await autorizar();
  if (!acesso.ok) return acesso;

  const { error } = await acesso.supabase
    .from('alertas')
    .update({ atendido_em: new Date().toISOString(), atendido_por: acesso.quem })
    .eq('id', dados.data.id)
    .eq('restaurante_id', acesso.restauranteId)
    .is('atendido_em', null);

  if (error) return { ok: false, erro: 'Não foi possível marcar como atendido. Tente outra vez.' };
  return feito();
}

/** Marca a mesa como ocupada sem esperar por um pedido pelo cardápio. */
export async function abrirMesa(entrada: unknown): Promise<Resultado> {
  const dados = z.object({ mesaId: ID }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: 'Mesa desconhecida.' };

  const acesso = await autorizar();
  if (!acesso.ok) return acesso;

  const { error } = await acesso.supabase.from('sessoes_mesa').insert({
    restaurante_id: acesso.restauranteId,
    mesa_id: dados.data.mesaId,
  });

  if (error) {
    // 23505: alguém abriu a mesma mesa agora mesmo, ou chegou um pedido.
    if (error.code === '23505') return feito();
    return { ok: false, erro: 'Não foi possível abrir a mesa. Tente outra vez.' };
  }
  return feito();
}

// 'A limpar' não se escolhe à mão: chega-se lá fechando a conta, que é o
// que guarda o total. Uma mesa a limpar sem conta fechada perdia o valor.
const ESTADO_A_MAO = z.enum(['aberta', 'conta_pedida'], {
  error: 'Estado desconhecido.',
});

export async function mudarEstadoDaMesa(entrada: unknown): Promise<Resultado> {
  const dados = z.object({ sessaoId: ID, estado: ESTADO_A_MAO }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: 'Pedido inválido.' };

  const acesso = await autorizar();
  if (!acesso.ok) return acesso;

  const agora = new Date().toISOString();
  const { estado } = dados.data;
  const { error } = await acesso.supabase
    .from('sessoes_mesa')
    .update({
      estado,
      ...(estado === 'conta_pedida' ? { conta_pedida_em: agora } : {}),
    })
    .eq('id', dados.data.sessaoId)
    .eq('restaurante_id', acesso.restauranteId)
    .neq('estado', 'fechada');

  if (error) return { ok: false, erro: 'Não foi possível mudar o estado. Tente outra vez.' };
  return feito();
}

export type ContaFechada = { linhas: LinhaDaConta[]; total: number; pedidos: number };

/**
 * Fecha a conta: guarda o total, marca a mesa "a limpar" e dá por
 * atendidas as chamadas que ela tinha.
 *
 * O total é recalculado aqui, a partir dos pedidos, e não recebido do
 * ecrã. Um ecrã com dois minutos de atraso não pode fechar uma conta sem
 * o último pedido que entrou.
 */
export async function fecharConta(entrada: unknown): Promise<Resultado<ContaFechada>> {
  const dados = z.object({ sessaoId: ID }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: 'Mesa desconhecida.' };

  const acesso = await autorizar();
  if (!acesso.ok) return acesso;

  const { data: sessao } = await acesso.supabase
    .from('sessoes_mesa')
    .select('id, mesa_id, estado')
    .eq('id', dados.data.sessaoId)
    .eq('restaurante_id', acesso.restauranteId)
    .maybeSingle();

  if (!sessao || sessao.estado === 'fechada') {
    return { ok: false, erro: 'Esta mesa já não está aberta.' };
  }

  const { data: pedidos } = await acesso.supabase
    .from('orders')
    .select('itens, estado')
    .eq('sessao_id', sessao.id);

  const conta = resumoDaConta(
    ((pedidos ?? []) as { itens: ItemPedido[] | null; estado: EstadoPedido }[]).map((p) => ({
      itens: Array.isArray(p.itens) ? p.itens : [],
      estado: p.estado,
    })),
  );

  const agora = new Date().toISOString();
  const { error } = await acesso.supabase
    .from('sessoes_mesa')
    .update({
      estado: 'a_limpar',
      fechada_em: agora,
      fechada_por: acesso.quem,
      total_fecho: conta.total,
    })
    .eq('id', sessao.id)
    .eq('restaurante_id', acesso.restauranteId);

  if (error) return { ok: false, erro: 'Não foi possível fechar a conta. Tente outra vez.' };

  // As chamadas desta mesa ficam respondidas: a conta foi entregue.
  await acesso.supabase
    .from('alertas')
    .update({ atendido_em: agora, atendido_por: acesso.quem })
    .eq('mesa_id', sessao.mesa_id)
    .eq('restaurante_id', acesso.restauranteId)
    .is('atendido_em', null);

  revalidatePath('/painel/salao');
  return {
    ok: true,
    dados: {
      linhas: conta.linhas,
      total: conta.total,
      pedidos: (pedidos ?? []).filter((p) => p.estado !== 'cancelado').length,
    },
  };
}

/** A mesa está pronta para os próximos: a sessão acaba e a mesa fica livre. */
export async function mesaLimpa(entrada: unknown): Promise<Resultado> {
  const dados = z.object({ sessaoId: ID }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: 'Mesa desconhecida.' };

  const acesso = await autorizar();
  if (!acesso.ok) return acesso;

  const { error } = await acesso.supabase
    .from('sessoes_mesa')
    .update({ estado: 'fechada', limpa_em: new Date().toISOString() })
    .eq('id', dados.data.sessaoId)
    .eq('restaurante_id', acesso.restauranteId);

  if (error) return { ok: false, erro: 'Não foi possível libertar a mesa. Tente outra vez.' };
  return feito();
}
