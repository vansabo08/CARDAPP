export type Plano = 'balcao' | 'mesa' | 'sala';

/**
 * Por onde o pedido sai do cardápio.
 *
 * Escolha da casa, nas definições, e não do cliente: quem decide por
 * onde entram os pedidos é quem os tem de atender. Pôr os dois botões à
 * frente do cliente dividia cada pedido em dois caminhos possíveis e
 * obrigava a casa a vigiar ambos.
 *
 * `whatsapp` é o que sempre existiu e o que vem por omissão — nenhuma
 * casa muda de funcionamento sem o pedir. `app` guarda o pedido no
 * Cardapp e dá ao cliente um ecrã para acompanhar o estado.
 */
export type ModoPedido = 'whatsapp' | 'app';

export type Restaurante = {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  /** Fotografia larga do topo do cardápio. */
  capa_url: string | null;
  whatsapp: string;
  cor_marca: string;
  plano: Plano;
  activo: boolean;
  modo_pedido: ModoPedido;
};

export type Mesa = {
  id: string;
  restaurant_id: string;
  numero: number;
  qr_token: string;
};

export type Categoria = {
  id: string;
  restaurant_id: string;
  nome: string;
  ordem: number;
};

export type Prato = {
  id: string;
  category_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  foto_url: string | null;
  disponivel: boolean;
  ordem: number;
};

export type CategoriaComPratos = Categoria & { itens: Prato[] };

/** Uma linha do carrinho ou de um pedido gravado. */
export type ItemPedido = {
  nome: string;
  qtd: number;
  /** Preco unitario em Kwanzas. */
  preco: number;
  obs?: string | null;
};

/** O percurso de um pedido. `cancelado` sai de lado, em qualquer ponto. */
export type EstadoPedido =
  | 'novo'
  | 'preparar'
  | 'pronto'
  | 'caminho'
  | 'entregue'
  | 'cancelado';

export type Pedido = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  itens: ItemPedido[];
  total: number;
  created_at: string;
  estado: EstadoPedido;
  actualizado_em: string;
  mesa?: number | null;
};

/**
 * O pedido como o cliente o vê, sem sessão nenhuma.
 *
 * Vem da função `pedido_publico`, que recebe o id e devolve uma linha
 * só — com o nome da casa e o número da mesa já resolvidos, para o ecrã
 * de acompanhamento não ter de fazer mais perguntas.
 */
export type PedidoPublico = {
  id: string;
  estado: EstadoPedido;
  itens: ItemPedido[];
  total: number;
  created_at: string;
  actualizado_em: string;
  mesa: number | null;
  restaurante: string;
  restaurante_slug: string;
};

/** Tudo o que a mensagem de WhatsApp precisa de saber. */
export type PedidoParaMensagem = {
  restaurante: string;
  mesa?: number | null;
  itens: ItemPedido[];
  /** Opcional: se faltar, e somado a partir dos itens. */
  total?: number;
  /** Opcional: por omissao usa a hora actual de Luanda. */
  data?: Date;
  /** Opcional: por omissao "na mesa". */
  pagamento?: string;
};

export const LIMITES_PLANO: Record<Plano, { mesas: number; pratos: number; marca: boolean; estatisticas: boolean }> = {
  balcao: { mesas: 1, pratos: 15, marca: true, estatisticas: false },
  mesa: { mesas: Infinity, pratos: Infinity, marca: false, estatisticas: false },
  sala: { mesas: Infinity, pratos: Infinity, marca: false, estatisticas: true },
};

export const NOME_PLANO: Record<Plano, string> = {
  balcao: 'Balcão',
  mesa: 'Mesa',
  sala: 'Sala',
};
