/**
 * Dois planos, ambos pagos, ambos com sete dias livres no início.
 *
 * Havia um terceiro, o Balcão, gratuito para sempre e limitado a uma
 * mesa e quinze pratos. Saiu.
 */
export type Plano = 'mesa' | 'sala';

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
 * CardApp e dá ao cliente um ecrã para acompanhar o estado.
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
  /**
   * Até quando a casa tem acesso. Uma data só: o teste é o primeiro
   * crédito de dias, e cada compra acrescenta mais.
   */
  acesso_expira_em: string | null;
  /** Ficam do modelo anterior, para não partir leituras antigas. */
  teste_termina_em: string | null;
  pago_ate: string | null;
  /**
   * O que o cardápio do cliente faz a um prato esgotado: mostra-o riscado,
   * ou esconde-o. Só o Plano Sala escolhe; o Mesa mostra sempre.
   */
  esgotado_modo?: 'mostrar' | 'esconder';
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
  /** O horário em que a categoria aparece. Sem horário, aparece sempre. */
  menu_id?: string | null;
  /** O nome em inglês. Vazio, o cliente lê o português. */
  nome_en?: string | null;
};

/**
 * Uma janela de serviço: "Almoço, 12:00–15:00, segunda a sexta".
 *
 * As horas são de Luanda e vêm como "HH:MM" ou "HH:MM:SS". Um fim antes
 * do início atravessa a meia-noite. Os dias contam-se como no JavaScript:
 * 0 é domingo.
 */
export type MenuHorario = {
  id: string;
  nome: string;
  hora_inicio: string;
  hora_fim: string;
  dias: number[];
  ordem: number;
  nome_en?: string | null;
};

export type Opcao = {
  id: string;
  nome: string;
  nome_en?: string | null;
  preco: number;
  disponivel: boolean;
  ordem: number;
};

/**
 * Um grupo de opções de um prato.
 *
 * `variante`: escolha única e obrigatória; o preço da opção é o preço do
 * prato nesse tamanho. `extra`: de `minimo` a `maximo` opções, cada uma
 * somada ao preço.
 */
export type GrupoOpcoes = {
  id: string;
  nome: string;
  nome_en?: string | null;
  tipo: 'variante' | 'extra';
  minimo: number;
  maximo: number;
  ordem: number;
  opcoes: Opcao[];
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
  /** Preço de promoção, se houver. Só conta dentro das datas. */
  preco_promocional?: number | null;
  promo_inicio?: string | null;
  promo_fim?: string | null;
  /** O prato em destaque no topo do cardápio. Um por casa. */
  prato_do_dia?: boolean;
  grupos?: GrupoOpcoes[];
  /** Em inglês. Vazios, o cliente lê o português. */
  nome_en?: string | null;
  descricao_en?: string | null;
};

export type CategoriaComPratos = Categoria & { itens: Prato[] };

/** Uma opção escolhida, como vai para o pedido e para a mensagem. */
export type OpcaoEscolhida = {
  grupo: string;
  nome: string;
  /** Na variante é o preço do prato nesse tamanho; no extra, o que se soma. */
  preco: number;
  tipo: 'variante' | 'extra';
};

/** Uma linha do carrinho ou de um pedido gravado. */
export type ItemPedido = {
  nome: string;
  qtd: number;
  /** Preço unitário em Kwanzas — com a variante, os extras e a promoção já contados. */
  preco: number;
  obs?: string | null;
  /** O prato na base. Com ele, o servidor refaz a conta em vez de a aceitar. */
  item_id?: string;
  /** O que o cliente escolheu: tamanho, extras. */
  opcoes?: OpcaoEscolhida[];
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
  /** O que o cliente escreveu sobre o pedido todo. */
  observacao?: string | null;
  /** Quando alguém da casa confirmou que viu. É o que cala o alarme. */
  confirmado_em?: string | null;
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
  /** Observação do pedido inteiro, não de um prato. */
  observacao?: string | null;
};

/**
 * O que cada plano deixa fazer.
 *
 * Nenhum dos dois limita mesas ou pratos — o que os separa é a marca e
 * o que a casa vê sobre o seu próprio serviço. Os campos ficam na mesma
 * porque o código que os lê não tem de saber disso, e porque um limite
 * pode voltar sem se mexer em dez ficheiros.
 */
export const LIMITES_PLANO: Record<Plano, { mesas: number; pratos: number; marca: boolean; estatisticas: boolean }> = {
  mesa: { mesas: Infinity, pratos: Infinity, marca: true, estatisticas: false },
  sala: { mesas: Infinity, pratos: Infinity, marca: false, estatisticas: true },
};

export const NOME_PLANO: Record<Plano, string> = {
  mesa: 'Mesa',
  sala: 'Sala',
};

/** Alguém da equipa de uma casa, além do dono. */
export type Membro = {
  id: string;
  email: string;
  nome: string | null;
  papel: import('./papeis').PapelDeMembro;
  convidado_em: string;
  /** Nulo enquanto o convite não for aceite. */
  aceite_em: string | null;
};

/* ------------------------------------------------------------------ */
/* O salão                                                             */
/* ------------------------------------------------------------------ */

/**
 * Onde está uma mesa, do ponto de vista de quem anda na sala.
 *
 * "livre" não vem da base: é não haver sessão viva. Os outros três são
 * o estado da sessão.
 */
export type EstadoMesa = 'livre' | 'aberta' | 'conta_pedida' | 'a_limpar';

export type TipoAlerta = 'empregado' | 'conta';

export type AlertaMesa = {
  id: string;
  mesa_id: string;
  mesa: number;
  tipo: TipoAlerta;
  criado_em: string;
};

export type PedidoDaSessao = {
  id: string;
  itens: ItemPedido[];
  total: number;
  estado: EstadoPedido;
  created_at: string;
  observacao: string | null;
};

export type MesaNoSalao = {
  id: string;
  numero: number;
  estado: EstadoMesa;
  sessao: {
    id: string;
    aberta_em: string;
    conta_pedida_em: string | null;
    fechada_em: string | null;
    total_fecho: number | null;
  } | null;
  pedidos: PedidoDaSessao[];
  /** Soma dos pedidos que não foram cancelados. */
  total: number;
  alertas: AlertaMesa[];
};
