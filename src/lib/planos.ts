import {
  AVISAR_A,
  DIAS_DE_CORTESIA,
  DIAS_DE_TESTE,
  ORDEM_DOS_PLANOS,
  PLANOS,
  type Plano,
} from '@/config/planos';

export { DIAS_DE_CORTESIA, DIAS_DE_TESTE, ORDEM_DOS_PLANOS, PLANOS };
export type { Plano };

const DIA = 86_400_000;

/* ------------------------------------------------------------------ */
/* Atalhos sobre a configuração                                        */
/* ------------------------------------------------------------------ */

export const PRECO_PLANO: Record<Plano, number> = {
  mesa: PLANOS.mesa.preco,
  sala: PLANOS.sala.preco,
};

export const PRODUTO_KURSINHA: Record<Plano, string> = {
  mesa: PLANOS.mesa.produtoId,
  sala: PLANOS.sala.produtoId,
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
 * Onde se paga. O ambiente manda sobre a configuração, para um endereço
 * poder mudar sem deploy.
 */
export function linkDePagamento(plano: Plano): string {
  const doAmbiente = (
    plano === 'mesa' ? process.env.NEXT_PUBLIC_KURSINHA_MESA : process.env.NEXT_PUBLIC_KURSINHA_SALA
  )?.trim();

  return doAmbiente && /^https?:\/\//.test(doAmbiente) ? doAmbiente : PLANOS[plano].link;
}

/* ------------------------------------------------------------------ */
/* Quando acaba o acesso                                               */
/* ------------------------------------------------------------------ */

function data(valor: string | Date | null | undefined): Date | null {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * A nova data de expiração depois de uma compra aprovada.
 *
 * Soma a partir da data que já lá está, e não a partir de hoje: quem
 * paga com cinco dias de sobra não pode perder esses cinco dias — pagou
 * por trinta e recebe trinta. Só quando já expirou é que a contagem
 * recomeça de agora, porque os dias que passaram sem pagamento não se
 * devolvem.
 */
export function proximaExpiracao(
  actual: string | Date | null | undefined,
  plano: Plano,
  agora: Date = new Date(),
): Date {
  const dias = PLANOS[plano].dias;
  const anterior = data(actual);
  const base = anterior && anterior > agora ? anterior : agora;

  return new Date(base.getTime() + dias * DIA);
}

/* ------------------------------------------------------------------ */
/* Em que pé está a conta                                              */
/* ------------------------------------------------------------------ */

/**
 * `activa` está longe do fim. `a_expirar` está nos últimos sete dias e
 * ainda serve tudo. `cortesia` já passou da data mas continua a servir o
 * cardápio — não se deixa QR morto nas mesas de um restaurante por causa
 * de um pagamento que atrasou um dia. `expirada` é o fim: painel
 * fechado e cardápio fora do ar.
 */
export type EstadoConta = 'activa' | 'a_expirar' | 'cortesia' | 'expirada';

export function estadoDaConta(
  acessoExpiraEm: string | Date | null | undefined,
  agora: Date = new Date(),
): EstadoConta {
  const expira = data(acessoExpiraEm);

  // Sem data, conta como activa. Uma linha que a migração não apanhou
  // não pode fechar uma casa: é o pior erro que este código pode fazer.
  if (!expira) return 'activa';

  const restante = expira.getTime() - agora.getTime();

  if (restante > AVISAR_A[0] * DIA) return 'activa';
  if (restante > 0) return 'a_expirar';
  if (-restante <= DIAS_DE_CORTESIA * DIA) return 'cortesia';

  return 'expirada';
}

/** O painel abre? */
export function painelAberto(estado: EstadoConta) {
  return estado !== 'expirada';
}

/**
 * O cardápio público serve?
 *
 * Continua a servir em cortesia, de propósito. Quem paga a conta de um
 * cardápio morto a meio do serviço são os clientes sentados à mesa, que
 * não têm nada a ver com a assinatura de ninguém.
 */
export function cardapioNoAr(estado: EstadoConta) {
  return estado !== 'expirada';
}

/** Dias inteiros até expirar. Zero ou menos quando já passou. */
export function diasAteExpirar(
  acessoExpiraEm: string | Date | null | undefined,
  agora: Date = new Date(),
): number {
  const expira = data(acessoExpiraEm);
  if (!expira) return DIAS_DE_TESTE;

  const restante = expira.getTime() - agora.getTime();
  return restante <= 0 ? 0 : Math.ceil(restante / DIA);
}

/** Dias inteiros desde que expirou. Zero enquanto não passou. */
export function diasDesdeExpirar(
  acessoExpiraEm: string | Date | null | undefined,
  agora: Date = new Date(),
): number {
  const expira = data(acessoExpiraEm);
  if (!expira) return 0;

  const passado = agora.getTime() - expira.getTime();
  return passado <= 0 ? 0 : Math.floor(passado / DIA);
}

/* ------------------------------------------------------------------ */
/* Lembretes                                                           */
/* ------------------------------------------------------------------ */

export type TipoLembrete = 'faltam_7' | 'faltam_3' | 'falta_1' | 'expira_hoje' | 'fim_cortesia';

const POR_DIAS: Record<number, TipoLembrete> = {
  7: 'faltam_7',
  3: 'faltam_3',
  1: 'falta_1',
};

/**
 * Que aviso é devido hoje, se algum.
 *
 * Devolve um só: se uma conta estivesse a dois dias e o cron não tivesse
 * corrido ontem, mandar os avisos todos de uma vez seria três emails
 * seguidos a dizer quase o mesmo. Manda-se o mais urgente e segue-se.
 *
 * A repetição não é travada aqui — é o índice único de
 * `lembretes_enviados` que a trava, e é onde tem de estar: o cron corre
 * todos os dias, e a conta que está a sete dias hoje continua "a sete
 * dias" durante quase vinte e quatro horas.
 */
export function lembreteDevido(
  acessoExpiraEm: string | Date | null | undefined,
  agora: Date = new Date(),
): TipoLembrete | null {
  const expira = data(acessoExpiraEm);
  if (!expira) return null;

  const restante = expira.getTime() - agora.getTime();

  if (restante > 0) {
    const dias = Math.ceil(restante / DIA);
    return POR_DIAS[dias] ?? null;
  }

  const passados = Math.floor(-restante / DIA);
  if (passados === 0) return 'expira_hoje';
  if (passados === DIAS_DE_CORTESIA) return 'fim_cortesia';

  return null;
}

export const ASSUNTO_LEMBRETE: Record<TipoLembrete, string> = {
  faltam_7: 'Faltam 7 dias do seu Cardapp',
  faltam_3: 'Faltam 3 dias do seu Cardapp',
  falta_1: 'Amanhã acaba o seu Cardapp',
  expira_hoje: 'O seu Cardapp acaba hoje',
  fim_cortesia: 'O seu cardápio saiu do ar',
};

/** O que dizer a quem está a chegar ao fim, sem alarmar quem tem tempo. */
export function avisoDoPrazo(estado: EstadoConta, dias: number): string {
  if (estado === 'expirada') return 'O acesso terminou e o cardápio saiu do ar.';
  if (estado === 'cortesia') {
    return 'O prazo acabou. O cardápio ainda está no ar, mas por pouco tempo.';
  }
  if (estado === 'a_expirar') {
    if (dias <= 1) return 'Último dia. Renove para o cardápio não sair do ar.';
    return `Faltam ${dias} dias. Renove para o cardápio não sair do ar.`;
  }
  return '';
}
