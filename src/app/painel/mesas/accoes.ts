'use server';

import { revalidatePath } from 'next/cache';
import { clienteDoPainel } from '@/lib/supabase/servidor';
import { obterMesas, obterRestauranteDoDono } from '@/lib/dados';
import { gerarToken } from '@/lib/utils';
import { LIMITES_PLANO, type Mesa } from '@/lib/tipos';
import { nomeDaMesa } from '@/lib/format';

type Resultado = { ok: boolean; demonstracao?: boolean; erro?: string; mesas?: Mesa[] };

/** Acrescenta mesas, continuando a numeração onde ela ficou. */
export async function acrescentarMesas(quantidade: number): Promise<Resultado> {
  const quantas = Math.max(1, Math.min(50, Math.floor(quantidade)));

  const supabase = await clienteDoPainel();
  const restaurante = await obterRestauranteDoDono();
  if (!supabase || !restaurante) return { ok: true, demonstracao: true };

  const existentes = await obterMesas(restaurante.id);
  const limite = LIMITES_PLANO[restaurante.plano].mesas;
  if (existentes.length + quantas > limite) {
    return {
      ok: false,
      erro: `O plano actual permite ${limite} ${limite === 1 ? 'mesa' : 'mesas'}.`,
    };
  }

  const maior = existentes.reduce((m, mesa) => Math.max(m, mesa.numero), 0);
  const novas = Array.from({ length: quantas }, (_, i) => ({
    restaurant_id: restaurante.id,
    numero: maior + i + 1,
    qr_token: gerarToken(),
  }));

  const { data, error } = await supabase
    .from('tables')
    .insert(novas)
    .select('id, restaurant_id, numero, qr_token, nome');

  if (error) return { ok: false, erro: error.message };

  revalidatePath('/painel/mesas');
  return { ok: true, mesas: (data as Mesa[]) ?? [] };
}

export async function apagarMesa(id: string): Promise<Resultado> {
  const supabase = await clienteDoPainel();
  const restaurante = await obterRestauranteDoDono();
  if (!supabase || !restaurante) return { ok: true, demonstracao: true };

  // A casa vai por extenso: em auditoria a RLS não está a guardar isto.
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurante.id);
  if (error) return { ok: false, erro: error.message };

  revalidatePath('/painel/mesas');
  return { ok: true };
}

/**
 * Diz quantas mesas a casa tem, e a lista passa a ser essa.
 *
 * É a pergunta que o dono faz a si próprio — "quantas mesas tenho?" —
 * em vez de "quantas quero juntar", que o obriga a fazer a subtracção
 * de cabeça. Acrescenta as que faltam e tira as que sobram, sempre
 * pelas últimas: as primeiras já têm cartões impressos e colados.
 *
 * UMA MESA COM PEDIDOS NÃO SE APAGA. A base recusa, porque o pedido
 * aponta para ela, e isso é de propósito: apagá-la levaria atrás o
 * histórico do que lá se comeu. Nesse caso pára-se e diz-se porquê, em
 * vez de deixar a lista a meio sem explicação.
 */
export async function definirTotalDeMesas(total: number): Promise<Resultado> {
  const quantas = Math.max(0, Math.min(200, Math.floor(total)));

  const supabase = await clienteDoPainel();
  const restaurante = await obterRestauranteDoDono();
  if (!supabase || !restaurante) return { ok: true, demonstracao: true };

  const limite = LIMITES_PLANO[restaurante.plano].mesas;
  if (quantas > limite) {
    return {
      ok: false,
      erro: `O plano actual permite ${limite} ${limite === 1 ? 'mesa' : 'mesas'}.`,
    };
  }

  const existentes = await obterMesas(restaurante.id);

  if (quantas > existentes.length) {
    return acrescentarMesas(quantas - existentes.length);
  }

  if (quantas < existentes.length) {
    const aTirar = [...existentes].sort((a, b) => b.numero - a.numero).slice(0, existentes.length - quantas);

    for (const mesa of aTirar) {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', mesa.id)
        .eq('restaurant_id', restaurante.id);

      if (error) {
        revalidatePath('/painel/mesas');
        return {
          ok: false,
          erro: `A ${nomeDaMesa(mesa)} já tem pedidos e por isso não se apaga. A casa ficou com ${
            existentes.length - aTirar.indexOf(mesa)
          } mesas.`,
        };
      }
    }
  }

  revalidatePath('/painel/mesas');
  return { ok: true, mesas: await obterMesas(restaurante.id) };
}

/**
 * Dá um nome à mesa, ou tira-lho.
 *
 * O nome é só uma etiqueta: o número continua a ser quem ela é para o
 * QR e para os pedidos. Vazio volta a "Mesa 07".
 */
export async function renomearMesa(id: string, nome: string): Promise<Resultado> {
  const limpo = nome.trim().slice(0, 24);

  const supabase = await clienteDoPainel();
  const restaurante = await obterRestauranteDoDono();
  if (!supabase || !restaurante) return { ok: true, demonstracao: true };

  const { error } = await supabase
    .from('tables')
    .update({ nome: limpo || null })
    .eq('id', id)
    .eq('restaurant_id', restaurante.id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath('/painel/mesas');
  return { ok: true };
}
