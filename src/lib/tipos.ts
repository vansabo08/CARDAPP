export type Plano = 'balcao' | 'mesa' | 'sala';

export type Restaurante = {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  whatsapp: string;
  cor_marca: string;
  plano: Plano;
  activo: boolean;
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

export type Pedido = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  itens: ItemPedido[];
  total: number;
  created_at: string;
  mesa?: number | null;
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
