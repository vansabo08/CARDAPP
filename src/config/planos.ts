/**
 * A tabela de planos, num sítio só.
 *
 * Preço, identificador do produto na Kursinha, endereço de pagamento e
 * quantos dias cada compra vale — tudo junto, e nada disto espalhado
 * pelo handler do webhook. O identificador e o link partilham o mesmo
 * código: separá-los daria um pagamento a abrir a conta no plano
 * errado, e é o tipo de engano que só se descobre com um cliente
 * zangado à frente.
 *
 * A Kursinha só vende pagamento único — não tem assinatura nem evento de
 * renovação. Por isso o ciclo é simples e manual: cada compra aprovada
 * acrescenta 30 dias, e quem quiser continuar volta a comprar. O
 * Cardapp encarrega-se de avisar antes que acabe.
 */

export type Plano = 'mesa' | 'sala';

export type ConfiguracaoDoPlano = {
  nome: string;
  /** `data.product.id` no aviso da Kursinha. */
  produtoId: string;
  /** Kwanzas por compra. */
  preco: number;
  /** Dias de acesso que cada compra aprovada acrescenta. */
  dias: number;
  link: string;
};

export const PLANOS: Record<Plano, ConfiguracaoDoPlano> = {
  mesa: {
    nome: 'Mesa',
    produtoId: '6a0c3beddb1169d43a28e16c',
    preco: 14900,
    dias: 30,
    link: 'https://pay.kursinha.com/c/6a0c3beddb1169d43a28e16c',
  },
  sala: {
    nome: 'Sala',
    produtoId: '69fc6b443420b95cb08c1ebe',
    preco: 19900,
    dias: 30,
    link: 'https://pay.kursinha.com/c/69fc6b443420b95cb08c1ebe',
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
