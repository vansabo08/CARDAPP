/**
 * A tabela de planos, num sítio só.
 *
 * Preço, identificador do plano, dias de acesso e
 * quantos dias cada compra vale — tudo junto, e nada disto espalhado
 * pelo handler do webhook. O identificador e o link partilham o mesmo
 * código: separá-los daria um pagamento a abrir a conta no plano
 * errado, e é o tipo de engano que só se descobre com um cliente
 * zangado à frente.
 *
 * Não há assinatura nem débito automático — não há evento de
 * renovação. Por isso o ciclo é simples e manual: cada compra aprovada
 * acrescenta 30 dias, e quem quiser continuar volta a comprar. O
 * CardApp encarrega-se de avisar antes que acabe.
 */

export type Plano = 'mesa' | 'sala';

export type ConfiguracaoDoPlano = {
  nome: string;
  /** Identificador do plano, usado nos registos de pagamento. */
  produtoId: string;
  /** Kwanzas por compra. */
  preco: number;
  /** Dias de acesso que cada compra aprovada acrescenta. */
  dias: number;
};

export const PLANOS: Record<Plano, ConfiguracaoDoPlano> = {
  mesa: {
    nome: 'Mesa',
    produtoId: '6a0c3beddb1169d43a28e16c',
    preco: 14900,
    dias: 30,
  },
  sala: {
    nome: 'Sala',
    produtoId: '69fc6b443420b95cb08c1ebe',
    preco: 19900,
    dias: 30,
  },
};

export const ORDEM_DOS_PLANOS: Plano[] = ['mesa', 'sala'];

/** Dias livres quando a conta é criada, antes de haver pagamento nenhum. */
export const DIAS_DE_TESTE = 7;

/**
 * Depois de expirar, ainda se serve durante estes dias.
 *
 * Não é generosidade: é para não haver QR morto nas mesas de um
 * restaurante por causa de um pagamento que atrasou um dia. O painel
 * avisa; o cardápio continua a servir.
 */
export const DIAS_DE_CORTESIA = 3;

/** A quantos dias do fim se começa a avisar. */
export const AVISAR_A = [7, 3, 1] as const;

/* ------------------------------------------------------------------ */
/* O que cada plano abre                                               */
/* ------------------------------------------------------------------ */

/**
 * As funcionalidades que dependem do plano.
 *
 * O que não está nesta lista é de toda a gente: o cardápio, o QR das
 * mesas, os pedidos, o interruptor de "hoje há". O Plano Mesa não perde
 * nada do que já tinha; o Sala acrescenta.
 */
export type Funcionalidade =
  | 'estatisticas'
  | 'sem_marca'
  | 'chamar_empregado'
  | 'salao'
  | 'equipa'
  | 'relatorios'
  | 'esgotado_ao_vivo'
  | 'opcoes'
  | 'menus_horario'
  | 'promocoes'
  | 'avaliacoes';

const TUDO_O_QUE_E_SALA: readonly Funcionalidade[] = [
  'estatisticas',
  'sem_marca',
  'chamar_empregado',
  'salao',
  'equipa',
  'relatorios',
  'esgotado_ao_vivo',
  'opcoes',
  'menus_horario',
  'promocoes',
  'avaliacoes',
];

export const FUNCIONALIDADES_DO_PLANO: Record<Plano, readonly Funcionalidade[]> = {
  mesa: [],
  sala: TUDO_O_QUE_E_SALA,
};

/**
 * Quantas pessoas, além do dono, cabem na equipa de cada plano.
 *
 * Configurável sem mexer no código: `LIMITE_MEMBROS_SALA` no ambiente
 * muda o do Sala. O Mesa não tem equipa — é o dono sozinho.
 */
export function limiteDeMembros(plano: Plano): number {
  if (plano !== 'sala') return 0;
  const doAmbiente = Number.parseInt(process.env.LIMITE_MEMBROS_SALA ?? '', 10);
  return Number.isFinite(doAmbiente) && doAmbiente >= 0 ? doAmbiente : 8;
}
