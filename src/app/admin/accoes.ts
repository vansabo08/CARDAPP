'use server';

import { revalidatePath } from 'next/cache';
import { eAdministrador, exigirAdministrador } from '@/lib/admin';
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

/**
 * Cola um pagamento órfão à conta a que ele pertence.
 *
 * Um pagamento fica órfão quando entra com um email que não tem conta no
 * Cardapp — pagou-se com o email do costume e registou-se com outro, que
 * é a avaria mais humana que este sistema tem. O webhook faz o que deve:
 * grava, não abre nada a ninguém, e escreve porquê. Faltava a outra
 * metade, que é alguém poder dizer "este pagamento é desta casa".
 *
 * Só se aplica um pagamento que ainda não tenha dono. Se já tem, já
 * contou dias uma vez, e voltar a aplicá-lo dava dois meses por um
 * pagamento — e a segunda vez ninguém dava por ela.
 */
export async function aplicarPagamento(
  pagamentoId: string,
  restauranteId: string,
): Promise<Resultado> {
  await exigirAdministrador();

  const supabase = clienteAdministrador();
  if (!supabase) return { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY em falta.' };

  const { data: pago } = await supabase
    .from('pagamentos')
    .select('id, restaurant_id, plano, email, valor')
    .eq('id', pagamentoId)
    .maybeSingle();

  const pagamento = pago as
    | { id: string; restaurant_id: string | null; plano: Plano | null; email: string | null }
    | null;

  if (!pagamento) return { ok: false, erro: 'Pagamento não encontrado.' };
  if (pagamento.restaurant_id) {
    return { ok: false, erro: 'Este pagamento já foi aplicado a uma conta.' };
  }

  const { data: actual } = await supabase
    .from('restaurants')
    .select('plano, acesso_expira_em, slug')
    .eq('id', restauranteId)
    .maybeSingle();

  const casa = actual as
    | { plano?: Plano; acesso_expira_em?: string | null; slug?: string }
    | null;

  if (!casa) return { ok: false, erro: 'Conta não encontrada.' };

  /*
   * O plano do pagamento manda; o da casa é o recurso.
   *
   * Quem pagou 19.900 comprou Sala, e a conta tem de passar a Sala mesmo
   * que estivesse em Mesa — é a mesma regra do webhook, e por aqui tem
   * de ser a mesma, senão o caminho manual dava resultado diferente do
   * automático para o mesmo dinheiro.
   */
  const plano = pagamento.plano ?? casa.plano ?? 'mesa';
  const ate = proximaExpiracao(casa.acesso_expira_em ?? null, plano).toISOString();

  const { error } = await supabase
    .from('restaurants')
    .update({ acesso_expira_em: ate, plano })
    .eq('id', restauranteId);

  if (error) return { ok: false, erro: error.message };

  /*
   * A conta já abriu. Daqui para baixo nada pode desfazer isso: se o
   * carimbo no pagamento falhar, fica um pagamento por marcar — chato, e
   * visível na lista — em vez de uma casa fechada com o dinheiro pago.
   */
  await supabase
    .from('pagamentos')
    .update({
      restaurant_id: restauranteId,
      tipo: 'pago',
      nota: `Aplicado à mão a partir de ${pagamento.email ?? 'email desconhecido'}.`,
    })
    .eq('id', pagamentoId);

  await registar(
    'pagamento aplicado à mão',
    restauranteId,
    { acesso_expira_em: casa.acesso_expira_em ?? null, plano: casa.plano ?? null },
    { acesso_expira_em: ate, plano },
  );

  return actualizou(casa.slug);
}

/* ------------------------------------------------------------------ */
/* Comprovativos de transferência                                      */
/* ------------------------------------------------------------------ */

/**
 * Aprovar ou recusar um comprovativo.
 *
 * A casa já tem acesso provisório desde que o subiu — isto decide se o
 * provisório vira mês ou se a porta se fecha outra vez.
 *
 * Aprovar soma os dias do plano à data que a conta tinha ANTES da
 * cortesia. Somar por cima dos três dias provisórios dava trinta e três
 * por um pagamento de trinta, todos os meses, e ninguém daria por ela.
 */
export async function decidirComprovativo(
  comprovativoId: string,
  aprovado: boolean,
  nota?: string,
): Promise<Resultado> {
  await exigirAdministrador();

  const supabase = clienteAdministrador();
  if (!supabase) return { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY em falta.' };

  const { data: bruto } = await supabase
    .from('comprovativos')
    .select('id, restaurant_id, plano, estado, expirava_em')
    .eq('id', comprovativoId)
    .maybeSingle();

  const comprovativo = bruto as
    | {
        id: string;
        restaurant_id: string;
        plano: Plano;
        estado: string;
        expirava_em: string | null;
      }
    | null;

  if (!comprovativo) return { ok: false, erro: 'Comprovativo não encontrado.' };

  // Decidir duas vezes o mesmo comprovativo dava dois meses por um
  // pagamento — e a segunda vez ninguém a via.
  if (comprovativo.estado !== 'a_espera') {
    return { ok: false, erro: 'Este comprovativo já foi decidido.' };
  }

  const { data: casaBruta } = await supabase
    .from('restaurants')
    .select('acesso_expira_em, slug')
    .eq('id', comprovativo.restaurant_id)
    .maybeSingle();

  const casa = casaBruta as { acesso_expira_em: string | null; slug?: string } | null;
  const antes = casa?.acesso_expira_em ?? null;

  /*
   * A recusa fecha a porta a partir de agora, e não devolve a data
   * antiga: essa já tinha expirado, que foi o que trouxe a casa aqui.
   */
  const ate = aprovado
    ? proximaExpiracao(comprovativo.expirava_em, comprovativo.plano).toISOString()
    : new Date().toISOString();

  const { error } = await supabase
    .from('restaurants')
    .update({ acesso_expira_em: ate })
    .eq('id', comprovativo.restaurant_id);

  if (error) return { ok: false, erro: error.message };

  // A conta já mudou. Se o carimbo falhar fica um comprovativo por
  // decidir na fila — visível, e corrigível — em vez de uma casa com o
  // acesso mexido sem se saber porquê.
  await supabase
    .from('comprovativos')
    .update({
      estado: aprovado ? 'aprovado' : 'recusado',
      decidido_em: new Date().toISOString(),
      decidido_por: (await utilizadorActual())?.email ?? 'desconhecido',
      nota: nota?.trim() || null,
    })
    .eq('id', comprovativoId);

  await registar(
    aprovado ? 'comprovativo aprovado' : 'comprovativo recusado',
    comprovativo.restaurant_id,
    { acesso_expira_em: antes },
    { acesso_expira_em: ate },
  );

  return actualizou(casa?.slug);
}

/**
 * Quantos comprovativos esperam decisão, e qual foi o último a entrar.
 *
 * Serve o sino do administrador, e por isso é uma pergunta e não uma
 * subscrição. O Realtime do Supabase respeita a RLS, e a RLS dos
 * comprovativos só deixa passar o dono da casa — quem administra não é
 * dono de casa nenhuma, e a lista de administradores vive no ambiente,
 * onde uma política de base de dados não lhe chega.
 *
 * Perguntar de minuto a minuto resolve o mesmo com uma consulta leve.
 * Um comprovativo não é um pedido de mesa: ninguém está à espera de pé.
 */
export async function comprovativosPendentes(): Promise<{
  quantos: number;
  ultimo: string | null;
}> {
  if (!(await eAdministrador())) return { quantos: 0, ultimo: null };

  const supabase = clienteAdministrador();
  if (!supabase) return { quantos: 0, ultimo: null };

  const { data } = await supabase
    .from('comprovativos')
    .select('id')
    .eq('estado', 'a_espera')
    .order('enviado_em', { ascending: false });

  const linhas = (data ?? []) as { id: string }[];
  return { quantos: linhas.length, ultimo: linhas[0]?.id ?? null };
}
