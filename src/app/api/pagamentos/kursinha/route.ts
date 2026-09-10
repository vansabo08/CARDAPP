import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { clienteAdministrador } from '@/lib/supabase/administrador';
import { lerEvento, novoPagoAte, planoDoProduto, planoDoValor } from '@/lib/pagamentos';
import { PRECO_PLANO, PRODUTO_KURSINHA } from '@/lib/planos';

/**
 * O aviso de pagamento da Kursinha.
 *
 * Uma chamada a este endereço dá um mês de acesso pago a uma casa. É o
 * ponto mais sensível da aplicação: qualquer pessoa no mundo lhe pode
 * bater à porta. Por isso, três barreiras, por esta ordem:
 *
 * 1. A assinatura. A Kursinha manda `X-Webhook-Signature: sha256=<hmac>`,
 *    calculado sobre o corpo cru com o segredo combinado. Vale mais do
 *    que um segredo à solta no endereço: prova também que o corpo não
 *    foi mexido pelo caminho. Comparada em tempo constante, para o
 *    número de tentativas não revelar o quanto se acertou.
 * 2. O evento é reclamado antes de ser aplicado. Um webhook que não
 *    recebe 200 é reenviado, e as plataformas reenviam com gosto — sem
 *    isto, o mesmo pagamento dava dois meses.
 * 3. O que não se percebe fica registado e não abre nada. Abrir por
 *    engano dá um mês de graça; fechar por engano tira o painel a uma
 *    casa a meio do serviço.
 *
 * Nada aqui confia no corpo do pedido para decidir *quem* é a casa: o
 * email é procurado na base, e se não houver conta com aquele email não
 * se abre coisa nenhuma.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Compara sem deixar o tempo de resposta dizer quantos caracteres acertaram. */
function segredoConfere(recebido: string | null, esperado: string) {
  if (!recebido) return false;

  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  // `timingSafeEqual` exige o mesmo comprimento; compará-los antes
  // revelaria o tamanho, que não é segredo nenhum.
  if (a.length !== b.length) return false;

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

  const supabase = clienteAdministrador();
  if (!supabase) {
    // 503 e não 200: sem chave de serviço não se gravou nada, e o
    // fornecedor deve voltar a tentar.
    return NextResponse.json({ erro: 'SUPABASE_SERVICE_ROLE_KEY em falta.' }, { status: 503 });
  }

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
      | { id: string; plano: string; pago_ate: string | null }
      | undefined;

    if (linha) {
      restauranteId = linha.id;
      planoActual = linha.plano;
      pagoAteActual = linha.pago_ate;
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

  if (erroRegisto) {
    // 23505 = unique_violation: este aviso já cá tinha entrado. Responde
    // 200 para o fornecedor parar de reenviar, e não volta a aplicar.
    if (erroRegisto.code === '23505') {
      return NextResponse.json({ ok: true, repetido: true });
    }
    return NextResponse.json({ erro: 'Não foi possível registar.' }, { status: 500 });
  }

  if (tipo === 'ignorado' || !restauranteId) {
    return NextResponse.json({ ok: true, aplicado: false, motivo: nota });
  }

  /* ---------------------------------------------------------------- */
  /* Abrir ou fechar                                                   */
  /* ---------------------------------------------------------------- */
  const mudanca: Record<string, unknown> =
    tipo === 'pago'
      ? {
          pago_ate: novoPagoAte(pagoAteActual, evento.meses).toISOString(),
          // O plano só muda se o produto o disser. Um aviso sem produto
          // reconhecido renova o que a casa já tinha, em vez de a
          // despromover em silêncio.
          plano: planoComprado ?? planoActual ?? 'mesa',
        }
      : { pago_ate: new Date().toISOString() };

  const { error: erroMudanca } = await supabase
    .from('restaurants')
    .update(mudanca)
    .eq('id', restauranteId);

  if (erroMudanca) {
    // A reclamação fica desfeita para o reenvio do fornecedor poder
    // tentar outra vez. Sem isto, o evento ficava marcado como tratado
    // e o pagamento perdia-se em silêncio.
    await supabase.from('pagamentos').delete().eq('id', registo.id);
    return NextResponse.json({ erro: 'Não foi possível aplicar.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, aplicado: true, tipo });
}

/**
 * A Kursinha (e quase todas) verifica o endereço com um GET antes de
 * gravar o webhook. Responde-se sem dizer nada de útil a quem passar
 * por aqui por acaso.
 */
export function GET() {
  return NextResponse.json({ ok: true });
}
