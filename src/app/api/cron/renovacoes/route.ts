import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  anotarCanal,
  casasParaAvisar,
  enviarLembrete,
  reclamarLembrete,
} from '@/lib/lembretes';

/**
 * Os avisos de renovação, uma vez por dia.
 *
 * A Kursinha vende pagamento único e não avisa ninguém de nada. Se o
 * Cardapp não lembrar, a casa descobre que o prazo acabou quando um
 * cliente lhe disser que o QR não abre — que é o pior sítio possível
 * para descobrir.
 *
 * O aviso é reclamado ANTES de ser enviado, e não depois. Se fosse ao
 * contrário e o envio falhasse a meio, o cron de amanhã voltava a
 * mandar; e o de depois de amanhã outra vez. Reclamar primeiro custa,
 * no pior caso, um aviso perdido — muito melhor do que uma casa a
 * receber o mesmo email cinco manhãs seguidas.
 *
 * Nada aqui deixa um erro numa casa estragar as outras: cada uma é
 * tratada à parte e o que falhar fica na contagem.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Um cron não tem pressa, mas tem contas a mais para o tempo normal. */
export const maxDuration = 60;

/**
 * O mesmo cuidado do webhook: comparação de comprimento fixo, para o
 * tempo de resposta não revelar sequer o tamanho do segredo.
 */
function segredoConfere(recebido: string | null, esperado: string) {
  if (!recebido) return false;

  const a = createHash('sha256').update(recebido, 'utf8').digest();
  const b = createHash('sha256').update(esperado, 'utf8').digest();

  return timingSafeEqual(a, b);
}

async function correr(pedido: Request) {
  const esperado = process.env.CRON_SECRET ?? '';

  // Sem segredo configurado, fechado. Um endereço que percorre todas as
  // contas e manda emails não pode ficar aberto por omissão.
  if (!esperado) {
    return NextResponse.json({ erro: 'CRON_SECRET em falta.' }, { status: 503 });
  }

  const url = new URL(pedido.url);
  const recebido =
    // A Vercel manda `Authorization: Bearer <CRON_SECRET>` nos crons dela.
    pedido.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    pedido.headers.get('x-cron-secret') ??
    url.searchParams.get('chave');

  if (!segredoConfere(recebido, esperado)) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  }

  const casas = await casasParaAvisar();

  let enviados = 0;
  let repetidos = 0;
  let registados = 0;

  for (const casa of casas) {
    // Reclama primeiro: é o que impede o mesmo aviso de sair todas as
    // manhãs enquanto a casa não paga.
    const primeiraVez = await reclamarLembrete(casa);
    if (!primeiraVez) {
      repetidos++;
      continue;
    }

    const resultado = await enviarLembrete(casa);
    await anotarCanal(casa, resultado);

    if (resultado.canal === 'email') enviados++;
    else registados++;
  }

  return NextResponse.json({
    ok: true,
    vistas: casas.length,
    enviados,
    registados,
    repetidos,
  });
}

/** A Vercel chama os crons por GET. */
export async function GET(pedido: Request) {
  return correr(pedido);
}

/** E à mão dá jeito poder chamar por POST. */
export async function POST(pedido: Request) {
  return correr(pedido);
}
