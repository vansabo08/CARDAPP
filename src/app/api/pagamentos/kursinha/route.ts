import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { after, NextResponse } from 'next/server';
import { clienteAdministrador } from '@/lib/supabase/administrador';
import { lerEvento, planoDoProduto, planoDoValor } from '@/lib/pagamentos';
import { PLANOS, PRECO_PLANO, PRODUTO_KURSINHA, proximaExpiracao } from '@/lib/planos';

/**
 * O aviso de pagamento da Kursinha.
 *
 * Uma chamada a este endereço dá um mês de acesso pago a uma casa. É o
 * ponto mais sensível da aplicação: qualquer pessoa no mundo lhe pode
 * bater à porta.
 *
 * DUAS PORTAS, POR ESTA ORDEM.
 *
 * Vindo `X-Webhook-Signature`, vale o HMAC-SHA256 do corpo cru. É a
 * porta melhor: prova o segredo e prova que o corpo não foi mexido pelo
 * caminho.
 *
 * Não vindo, vale o `?chave=` no endereço. O painel da Kursinha não tem
 * onde pôr um segredo, por isso ela não assina nada — e uma porta que
 * ninguém pode abrir não é segurança, é um endereço morto. O segredo no
 * endereço é mais fraco (quem vir o URL vê o segredo), mas é o que esta
 * plataforma permite, e continua a manter de fora quem não o conhece.
 *
 * As duas comparações são em tempo constante, e a do `?chave=` passa
 * pelos dois valores por SHA-256 antes de comparar, para o tempo de
 * resposta não revelar sequer o comprimento do segredo.
 *
 * E DEPOIS DE ENTRAR:
 *
 * O evento é reclamado antes de ser aplicado. Um webhook que não recebe
 * 200 é reenviado, e as plataformas reenviam com gosto — sem isto, o
 * mesmo pagamento dava dois meses.
 *
 * O que não se percebe fica registado e não abre nada. Abrir por engano
 * dá um mês de graça; fechar por engano tira o painel a uma casa a meio
 * do serviço.
 *
 * Nada aqui confia no corpo do pedido para decidir *quem* é a casa: o
 * email é procurado na base, e se não houver conta com aquele email não
 * se abre coisa nenhuma.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Compara dois segredos sem revelar nada — nem o conteúdo, nem o
 * comprimento.
 *
 * O `timingSafeEqual` exige buffers do mesmo tamanho, e a saída fácil —
 * `if (a.length !== b.length) return false` — devolve resposta num
 * instante quando o tamanho não bate e demora o dobro quando bate.
 * Quem medir o tempo descobre o comprimento do segredo, e um segredo
 * cujo comprimento se conhece é um segredo mais pequeno.
 *
 * Passa-se os dois por SHA-256 antes de comparar: saem sempre 32 bytes,
 * seja qual for a entrada, e a comparação é sempre do mesmo tamanho.
 */
function segredoConfere(recebido: string | null, esperado: string) {
  if (!recebido) return false;

  const a = createHash('sha256').update(recebido, 'utf8').digest();
  const b = createHash('sha256').update(esperado, 'utf8').digest();

  return timingSafeEqual(a, b);
}

/**
 * A assinatura da Kursinha: HMAC-SHA256 do corpo cru, em hexadecimal,
 * com o prefixo `sha256=`.
 *
 * Tem de ser calculada sobre o texto exactamente como chegou. Voltar a
 * serializar o objecto depois de o ler daria outro texto — outra ordem
 * de chaves, outros espaços — e outra assinatura.
 */
function assinaturaConfere(cabecalho: string | null, corpo: string, segredo: string) {
  if (!cabecalho) return false;

  const recebido = cabecalho.trim().replace(/^sha256=/i, '').toLowerCase();
  if (!/^[0-9a-f]+$/.test(recebido) || recebido.length % 2 !== 0) return false;

  const esperado = createHmac('sha256', segredo).update(corpo, 'utf8').digest('hex');

  const a = Buffer.from(recebido, 'hex');
  const b = Buffer.from(esperado, 'hex');
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export async function POST(pedido: Request) {
  const esperado = process.env.KURSINHA_WEBHOOK_SECRET ?? '';

  // Sem segredo configurado o endereço fica fechado. O contrário — abrir
  // a porta enquanto ninguém configurou — seria a falha mais cara
  // possível num deploy apressado.
  if (!esperado) {
    return NextResponse.json({ erro: 'Webhook não configurado.' }, { status: 503 });
  }

  // O corpo é lido como texto porque a assinatura é calculada sobre ele
  // tal e qual chegou. Só depois se converte em objecto.
  const corpo = await pedido.text();

  const assinatura = pedido.headers.get('x-webhook-signature');

  let autorizado: boolean;
  if (assinatura) {
    autorizado = assinaturaConfere(assinatura, corpo, esperado);
  } else {
    // Sem segredo configurado do lado da Kursinha não vem assinatura
    // nenhuma. Aceita-se então o mesmo segredo à antiga — em cabeçalho
    // ou em `?chave=` — para o endereço poder ser testado antes de estar
    // tudo montado. Havendo assinatura, é ela que manda.
    const url = new URL(pedido.url);
    autorizado = segredoConfere(
      pedido.headers.get('x-cardapp-assinatura') ??
        pedido.headers.get('x-webhook-secret') ??
        pedido.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
        url.searchParams.get('chave'),
      esperado,
    );
  }

  if (!autorizado) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 });
  }

  if (!clienteAdministrador()) {
    // 503 e não 200: sem chave de serviço não se gravou nada, e o
    // fornecedor deve voltar a tentar.
    return NextResponse.json({ erro: 'SUPABASE_SERVICE_ROLE_KEY em falta.' }, { status: 503 });
  }

  /*
   * A resposta sai já; o trabalho fica para depois dela.
   *
   * A Kursinha só precisa de saber que o aviso chegou, e um webhook que
   * demora a responder é um webhook que a plataforma dá por falhado e
   * reenvia. O `after` do Next mantém a função viva depois da resposta.
   *
   * Mover o trabalho para depois não estraga a idempotência: quem a
   * garante é o índice único sobre (fornecedor, evento_id), não a ordem
   * das operações. Dois avisos simultâneos do mesmo evento continuam a
   * dar uma reclamação só — o segundo bate no índice e pára.
   */
  after(() => processar(bruto));

  return NextResponse.json({ ok: true, recebido: true });
}

/**
 * O que se faz com o aviso, já depois de a resposta ter saído.
 *
 * Nada aqui pode deitar abaixo o pedido — ele já acabou. Por isso o que
 * corre mal fica escrito na tabela, que é onde se vai procurar quando um
 * pagamento não abrir a conta.
 */
async function processar(bruto: unknown) {
  const supabase = clienteAdministrador();
  if (!supabase) return;

  const evento = lerEvento(bruto);

  /* ---------------------------------------------------------------- */
  /* De quem é esta conta                                              */
  /* ---------------------------------------------------------------- */
  let restauranteId: string | null = null;
  let planoActual: string | null = null;
  let pagoAteActual: string | null = null;

  if (evento.email) {
    const { data } = await supabase.rpc('restaurante_por_email', { e: evento.email });
    const linha = (Array.isArray(data) ? data[0] : data) as
      | { id: string; plano: string; pago_ate: string | null; acesso_expira_em: string | null }
      | undefined;

    if (linha) {
      restauranteId = linha.id;
      planoActual = linha.plano;
      pagoAteActual = linha.acesso_expira_em ?? linha.pago_ate;
    }
  }

  /*
   * Um endereço serve os dois planos: qual foi comprado sai do aviso.
   *
   * Primeiro pelo identificador do produto, que é o sinal fiável.
   * Depois pelo valor, para quando o aviso não traz produto nenhum
   * reconhecível — sem esse segundo sinal, quem pagasse 19.900 para
   * subir de Mesa para Sala pagava e ficava em Mesa.
   */
  const planoComprado =
    planoDoProduto(evento.produto, {
      mesa: process.env.KURSINHA_PRODUTO_MESA ?? PRODUTO_KURSINHA.mesa,
      sala: process.env.KURSINHA_PRODUTO_SALA ?? PRODUTO_KURSINHA.sala,
    }) ?? planoDoValor(evento.valor, PRECO_PLANO);

  let tipo = evento.tipo;
  let nota = evento.motivo ?? null;

  if (tipo === 'pago' && !restauranteId) {
    // Alguém pagou com um email que não tem conta no Cardapp. Não é um
    // erro do fornecedor nem nosso: é uma pessoa que comprou antes de
    // criar a conta, ou que usou outro email. Fica registado para se
    // poder resolver à mão, e não se abre nada a ninguém.
    tipo = 'ignorado';
    nota = `Pagamento de ${evento.email}, mas não há conta com esse email.`;
  }

  /* ---------------------------------------------------------------- */
  /* Reclamar o evento antes de o aplicar                              */
  /* ---------------------------------------------------------------- */
  const { data: registo, error: erroRegisto } = await supabase
    .from('pagamentos')
    .insert({
      restaurant_id: restauranteId,
      fornecedor: 'kursinha',
      evento_id: evento.eventoId,
      tipo,
      email: evento.email,
      plano: planoComprado,
      valor: evento.valor,
      meses: evento.meses,
      bruto: bruto as Record<string, unknown>,
      nota,
    })
    .select('id')
    .single();

  // 23505 = unique_violation: este aviso já cá tinha entrado, e não se
  // volta a aplicar. Qualquer outro erro fica por aqui — sem reclamação
  // não há nada a aplicar com segurança.
  if (erroRegisto || !registo) return;

  if (tipo === 'ignorado' || !restauranteId) return;

  /* ---------------------------------------------------------------- */
  /* Abrir ou fechar                                                   */
  /* ---------------------------------------------------------------- */
  /*
   * A Kursinha só vende pagamento único: não há assinatura nem evento de
   * renovação. Cada compra aprovada acrescenta os dias do plano — a
   * partir da data que já lá está, se ainda for futura, para quem paga
   * adiantado não perder o que lhe faltava.
   */
  const plano = (planoComprado ?? planoActual ?? 'mesa') as keyof typeof PLANOS;

  const mudanca: Record<string, unknown> =
    tipo === 'pago'
      ? {
          acesso_expira_em: proximaExpiracao(pagoAteActual, plano).toISOString(),
          // O plano só muda se o produto o disser. Um aviso sem produto
          // reconhecido renova o que a casa já tinha, em vez de a
          // despromover em silêncio.
          plano,
        }
      : { acesso_expira_em: new Date().toISOString() };

  const { error: erroMudanca } = await supabase
    .from('restaurants')
    .update(mudanca)
    .eq('id', restauranteId);

  if (erroMudanca) {
    /*
     * A resposta já saiu com 200, por isso a Kursinha não vai reenviar.
     * O registo fica — é a prova de que o dinheiro entrou — mas larga o
     * `evento_id`, o que liberta a chave única e deixa um reenvio à mão
     * voltar a tentar. Apagar a linha perdia o rasto do pagamento; deixá-la
     * intacta trancava a chave para sempre.
     */
    await supabase
      .from('pagamentos')
      .update({
        evento_id: null,
        tipo: 'ignorado',
        nota: `Pagamento recebido mas não aplicado: ${erroMudanca.message}`,
      })
      .eq('id', registo.id);
  }
}

/**
 * A Kursinha (e quase todas) verifica o endereço com um GET antes de
 * gravar o webhook. Responde-se sem dizer nada de útil a quem passar
 * por aqui por acaso.
 */
export function GET() {
  return NextResponse.json({ ok: true });
}
