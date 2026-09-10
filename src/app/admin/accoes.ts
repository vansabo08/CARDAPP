'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdministrador } from '@/lib/admin';
import { utilizadorActual } from '@/lib/supabase/servidor';
import { clienteAdministrador } from '@/lib/supabase/administrador';
import type { Plano } from '@/lib/tipos';
import { proximaExpiracao } from '@/lib/planos';

/**
 * Acções do painel administrativo.
 *
 * Cada uma volta a verificar quem chama. Uma barreira só no layout não
 * chega: as Server Actions são endpoints, e quem souber o identificador
 * pode chamá-las directamente sem passar pela página.
 */

type Resultado = { ok: boolean; erro?: string };

const PLANOS_VALIDOS: Plano[] = ['mesa', 'sala'];

function actualizou(slug?: string): Resultado {
  revalidatePath('/admin');
  if (slug) revalidatePath(`/${slug}`);
  return { ok: true };
}

/**
 * Escreve no livro o que foi feito, a quem, e a partir de quê.
 *
 * Não é desconfiança de ninguém: é para que, quando um dono perguntar
 * "quem me mudou o plano?", haja uma resposta que não seja um encolher
 * de ombros. Um painel que mexe em contas alheias sem deixar rasto é um
 * painel em que não se pode confiar — nem quem o usa consegue provar
 * que não fez o que não fez.
 *
 * Guarda o antes e o depois. Saber que houve uma mudança sem saber de
 * que para quê não serve para nada.
 *
 * Nunca deita a acção abaixo: se o registo falhar, a mudança que o
 * utilizador pediu já aconteceu, e recusá-la agora seria pior.
 */
async function registar(
  accao: string,
  restauranteId: string,
  antes: Record<string, unknown> | null,
  depois: Record<string, unknown> | null,
) {
  try {
    const supabase = clienteAdministrador();
    if (!supabase) return;

    const quem = (await utilizadorActual())?.email ?? 'desconhecido';

    const { data } = await supabase
      .from('restaurants')
      .select('nome')
      .eq('id', restauranteId)
      .maybeSingle();

    await supabase.from('auditoria').insert({
      quem,
      accao,
      restaurante_id: restauranteId,
      restaurante_nome: (data as { nome?: string } | null)?.nome ?? null,
      antes,
      depois,
    });
  } catch {
    /* o livro falhou; a acção não se desfaz por causa disso */
  }
}

/**
 * Desligar um restaurante tira-o do ar: a RLS deixa de o servir ao
 * público e o cardápio passa a dar 404. É reversível — ao contrário de
 * apagar, que aqui não existe de propósito.
 */
export async function alternarActivo(id: string, activo: boolean): Promise<Resultado> {
  await exigirAdministrador();

  const supabase = clienteAdministrador();
  if (!supabase) return { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY em falta.' };

  const { data, error } = await supabase
    .from('restaurants')
    .update({ activo })
    .eq('id', id)
    .select('slug')
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };

  await registar('conta ' + (activo ? 'ligada' : 'desligada'), id, { activo: !activo }, { activo });
  return actualizou((data as { slug?: string } | null)?.slug);
}

export async function mudarPlano(id: string, plano: Plano): Promise<Resultado> {
  await exigirAdministrador();

  if (!PLANOS_VALIDOS.includes(plano)) {
    return { ok: false, erro: 'Plano desconhecido.' };
  }

  const supabase = clienteAdministrador();
  if (!supabase) return { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY em falta.' };

  const { data: antes } = await supabase
    .from('restaurants')
    .select('plano')
    .eq('id', id)
    .maybeSingle();

  const { data, error } = await supabase
    .from('restaurants')
    .update({ plano })
    .eq('id', id)
    .select('slug')
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };

  await registar(
    'plano alterado',
    id,
    { plano: (antes as { plano?: string } | null)?.plano ?? null },
    { plano },
  );
  return actualizou((data as { slug?: string } | null)?.slug);
}

/**
 * Marca mais um mes pago.
 *
 * Enquanto o Multicaixa Express e o AppyPay nao estiverem ligados, o
 * pagamento acontece fora da aplicacao — por transferencia, em mao, como
 * for. Alguem tem de o registar, e e aqui. Sem isto o periodo de
 * experiencia acabava e nao havia forma de o desbloquear sem ir a base
 * de dados a mao.
 *
 * Soma a partir da data que ja la esta, e nao a partir de hoje: quem
 * paga com cinco dias de sobra nao pode perder esses cinco dias.
 */
export async function marcarPago(id: string, meses = 1): Promise<Resultado> {
  await exigirAdministrador();

  const quantos = Math.max(1, Math.min(24, Math.floor(meses)));

  const supabase = clienteAdministrador();
  if (!supabase) return { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY em falta.' };

  const { data: actual } = await supabase
    .from('restaurants')
    .select('plano, acesso_expira_em')
    .eq('id', id)
    .maybeSingle();

  const linha = actual as { plano?: Plano; acesso_expira_em?: string | null } | null;
  const plano = linha?.plano ?? 'mesa';

  // Um mês de cada vez, somando a partir do que já lá está — a mesma
  // conta que o webhook faz, e pela mesma razão: quem paga adiantado
  // não perde os dias que lhe faltavam.
  let ate = linha?.acesso_expira_em ?? null;
  for (let i = 0; i < quantos; i++) ate = proximaExpiracao(ate, plano).toISOString();

  const { data, error } = await supabase
    .from('restaurants')
    .update({ acesso_expira_em: ate })
    .eq('id', id)
    .select('slug')
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };

  await registar(
    `${quantos} ${quantos === 1 ? 'mês pago' : 'meses pagos'}`,
    id,
    { acesso_expira_em: linha?.acesso_expira_em ?? null },
    { acesso_expira_em: ate },
  );
  return actualizou((data as { slug?: string } | null)?.slug);
}
