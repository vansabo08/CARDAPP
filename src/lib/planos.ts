import type { Plano } from './tipos';

/**
 * Os planos, os preços e a conta dos sete dias.
 *
 * Fica isolado aqui, sem React nem Supabase, porque a mesma pergunta —
 * "esta casa pode usar o Cardapp hoje?" — é feita pelo painel, pela
 * página de preços e pela administração. Se cada um a respondesse à sua
 * maneira, mais dia menos dia discordavam.
 */

export const DIAS_DE_TESTE = 7;

/** Kwanzas por mês. */
export const PRECO_PLANO: Record<Plano, number> = {
  mesa: 14900,
  sala: 19900,
};

/**
 * O que cada plano dá.
 *
 * Só entra aqui o que existe mesmo no código. Uma lista de preços que
 * promete o que a aplicação não faz é uma dívida que se paga ao balcão,
 * com um cliente zangado à frente.
 */
export const INCLUI: Record<Plano, string[]> = {
  mesa: [
    'Mesas sem limite',
    'Pratos sem limite',
    'Pedidos pelo WhatsApp ou dentro da aplicação',
    'Cliente acompanha o estado do pedido',
    'Cartões de mesa em PDF, e cada QR à parte',
    'Marca Cardapp visível no cardápio',
  ],
  sala: [
    'Tudo o que o plano Mesa tem',
    'Sem a marca Cardapp — o cardápio é só da casa',
    'Fotografia de capa e cor da marca',
    'Estatísticas do dia: total, média e pratos mais pedidos',
    'Resumo do dia por email, todas as manhãs',
  ],
};

/**
 * Onde se paga cada plano.
 *
 * Os endereços vivem no ambiente e não no código: são criados na
 * Kursinha, podem mudar, e uma mudança de endereço de pagamento não
 * merece um deploy. Sem eles configurados, o botão leva à conversa de
 * WhatsApp — que é o que já funcionava antes de haver plataforma.
 *
 * `NEXT_PUBLIC_` porque isto é lido no browser e não tem nada de
 * secreto: é o mesmo endereço que qualquer cliente vê na barra.
 */
export const PAGAMENTO_POR_OMISSAO: Record<Plano, string> = {
  mesa: 'https://pay.kursinha.com/c/6a0c3beddb1169d43a28e16c',
  sala: 'https://pay.kursinha.com/c/69fc6b443420b95cb08c1ebe',
};

/**
 * O troço final do endereço é o identificador do produto na Kursinha, e
 * é por ele que o webhook sabe qual plano foi comprado. Fica aqui ao
 * lado do link para os dois não se separarem: mudar um sem o outro
 * daria um pagamento que abre a conta no plano errado.
 */
export const PRODUTO_KURSINHA: Record<Plano, string> = {
  mesa: '6a0c3beddb1169d43a28e16c',
  sala: '69fc6b443420b95cb08c1ebe',
};

export function linkDePagamento(plano: Plano): string | null {
  const links: Record<Plano, string | undefined> = {
    mesa: process.env.NEXT_PUBLIC_KURSINHA_MESA,
    sala: process.env.NEXT_PUBLIC_KURSINHA_SALA,
  };

  const doAmbiente = links[plano]?.trim();
  const link = doAmbiente && /^https?:\/\//.test(doAmbiente) ? doAmbiente : PAGAMENTO_POR_OMISSAO[plano];

  return /^https?:\/\//.test(link) ? link : null;
}

export type EstadoAssinatura = 'teste' | 'activo' | 'expirado';

type Assinatura = {
  teste_termina_em?: string | null;
  pago_ate?: string | null;
};

function data(valor: string | null | undefined) {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Em que pé está a conta.
 *
 * Duas datas em vez de um estado guardado: um estado tem de ser
 * corrigido por alguém a cada mudança, e uma data corrige-se sozinha com
 * a passagem do tempo. Quem pagou manda sobre quem está em teste — se
 * alguém pagar ao terceiro dia, não perde os quatro que faltavam nem
 * fica preso ao estado antigo.
 *
 * Uma conta sem nenhuma das datas conta como em teste, e não como
 * expirada: é o que acontece a uma linha antiga que a migração não
 * apanhou, e trancar uma casa por causa de um campo vazio é o pior erro
 * que este código pode cometer.
 */
export function estadoAssinatura(r: Assinatura, agora: Date = new Date()): EstadoAssinatura {
  const pago = data(r.pago_ate);
  if (pago && pago > agora) return 'activo';

  const teste = data(r.teste_termina_em);
  if (!teste) return 'teste';

  return teste > agora ? 'teste' : 'expirado';
}

/**
 * Dias que faltam do teste, arredondados para cima.
 *
 * Para cima porque "falta 1 dia" com dezoito horas pela frente é
 * verdade, e "faltam 0 dias" com dezoito horas pela frente é mentira.
 */
export function diasDeTesteQueFaltam(r: Assinatura, agora: Date = new Date()): number {
  const teste = data(r.teste_termina_em);
  if (!teste) return DIAS_DE_TESTE;

  const restante = teste.getTime() - agora.getTime();
  return restante <= 0 ? 0 : Math.ceil(restante / 86_400_000);
}

/** O que dizer a quem está em teste, sem alarmar quem tem tempo. */
export function avisoDoTeste(dias: number): string {
  if (dias <= 0) return 'O período de experiência terminou.';
  if (dias === 1) return 'Último dia de experiência.';
  if (dias <= 3) return `Faltam ${dias} dias de experiência.`;
  return `Está a experimentar o Cardapp. Faltam ${dias} dias.`;
}

/** Quando um teste iniciado agora termina. */
export function fimDoTeste(inicio: Date = new Date()): Date {
  return new Date(inicio.getTime() + DIAS_DE_TESTE * 86_400_000);
}
