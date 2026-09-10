/**
 * Ler um aviso de pagamento sem saber de cor a forma dele.
 *
 * O plano é vendido na Kursinha, que não publica documentação do
 * webhook. Em vez de adivinhar um formato e ficar refém dele, isto
 * procura os campos que interessam onde quer que eles estejam — no topo
 * do objecto, dentro de `data`, dentro de `customer`, aninhados. As
 * plataformas de infoprodutos usam quase todas as mesmas palavras, em
 * arrumações diferentes.
 *
 * Isto não é permissividade por preguiça: o corpo cru fica guardado na
 * tabela `pagamentos`, e um evento que não se consiga ler é registado
 * como 'ignorado' em vez de abrir seja o que for. Na dúvida, não se
 * abre nada — abrir por engano dá um mês de graça, e é o erro barato;
 * fechar por engano tira o painel a uma casa a meio do serviço.
 */

/** O que se conclui de um aviso. */
export type EventoPagamento = {
  /** Id do lado do fornecedor. Sem ele não há como travar repetições. */
  eventoId: string | null;
  tipo: 'pago' | 'anulado' | 'ignorado';
  email: string | null;
  /** Como o fornecedor chama ao produto comprado. */
  produto: string | null;
  valor: number | null;
  /** Quantos meses este pagamento vale. */
  meses: number;
  /** Porque é que ficou 'ignorado', para aparecer na tabela. */
  motivo?: string;
};

/* ------------------------------------------------------------------ */
/* Procura em profundidade                                             */
/* ------------------------------------------------------------------ */

function eObjecto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Primeiro valor cujo caminho termina numa das chaves pedidas.
 *
 * Percorre por níveis (largura primeiro) e não em profundidade: um
 * `email` no topo do objecto vale mais do que um `email` enterrado três
 * níveis abaixo dentro de `seller`. A ordem das chaves também conta — a
 * primeira que aparecer na lista ganha.
 */
/** `saleId`, `sale_id` e `SALE-ID` são a mesma chave para efeitos de procura. */
function normalizar(chave: string): string {
  return chave.toLowerCase().replace(/[_\-\s]/g, '');
}

function procurar(raiz: unknown, chaves: string[]): unknown {
  for (const chave of chaves) {
    const alvo = normalizar(chave);
    const fila: unknown[] = [raiz];

    while (fila.length) {
      const actual = fila.shift();
      if (!eObjecto(actual)) continue;

      for (const [k, v] of Object.entries(actual)) {
        if (normalizar(k) === alvo && v !== null && v !== '') return v;
      }
      for (const v of Object.values(actual)) {
        if (eObjecto(v)) fila.push(v);
        else if (Array.isArray(v)) for (const item of v) if (eObjecto(item)) fila.push(item);
      }
    }
  }
  return undefined;
}

function texto(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  return null;
}

function numero(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;

  if (typeof v === 'string') {
    // "14.900,00" e "14900.00" chegam os dois.
    const limpo = v.replace(/[^\d,.-]/g, '');
    const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
    const n = Number(normal);
    return Number.isFinite(n) ? n : null;
  }

  // Dinheiro costuma vir embrulhado: `price: { value, currency }`. A
  // chave certa é `price`, mas o número está uma camada abaixo.
  if (eObjecto(v)) {
    for (const chave of ['value', 'amount', 'valor', 'total', 'cents']) {
      const dentro = v[chave];
      if (dentro !== undefined && dentro !== null) return numero(dentro);
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* O que é que o evento diz                                            */
/* ------------------------------------------------------------------ */

/** Palavras que, em qualquer destas plataformas, querem dizer "pagou". */
const ABRE = [
  'paid',
  'pago',
  'approved',
  'aprovado',
  'aprovada',
  'completed',
  'complete',
  'concluido',
  'concluida',
  'success',
  'sucesso',
  'active',
  'activa',
  'ativo',
  'ativa',
  'renewed',
  'renovado',
];

/** E as que querem dizer "deixou de pagar". */
const FECHA = [
  'refund',
  'refunded',
  'reembolso',
  'reembolsado',
  'chargeback',
  'cancel',
  'cancelled',
  'canceled',
  'cancelado',
  'cancelada',
  'expired',
  'expirado',
  'expirada',
  'failed',
  'falhou',
  'recusado',
  'declined',
  'disputa',
  'dispute',
];

function classificar(sinal: string | null): { tipo: EventoPagamento['tipo']; motivo?: string } {
  if (!sinal) return { tipo: 'ignorado', motivo: 'Sem estado no aviso.' };

  const s = sinal.toLowerCase();

  // O fecho vê-se primeiro: "payment.refunded" contém "payment", e a
  // ordem inversa deixaria passar um reembolso como pagamento.
  if (FECHA.some((p) => s.includes(p))) return { tipo: 'anulado' };
  if (ABRE.some((p) => s.includes(p))) return { tipo: 'pago' };

  return { tipo: 'ignorado', motivo: `Estado desconhecido: ${sinal}` };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * O identificador de uma coisa que tanto pode vir como texto — `product:
 * "abc"` — como embrulhada num objecto — `product: { id, name }`. Dentro
 * do objecto o id vale mais do que o nome: o nome muda quando alguém
 * reescreve a página de vendas, o id não.
 */
function identificador(v: unknown): string | null {
  const directo = texto(v);
  if (directo) return directo;

  if (eObjecto(v)) {
    for (const chave of ['id', 'product_id', 'productId', 'code', 'slug', 'name', 'nome']) {
      const dentro = texto(v[chave]);
      if (dentro) return dentro;
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* A forma documentada da Kursinha                                     */
/* ------------------------------------------------------------------ */

/**
 * A Kursinha publica o formato do webhook, e quando o corpo tem essa
 * forma lê-se por ela e não à apalpadela.
 *
 * A procura genérica abaixo continua a existir para o que chegar de
 * outra maneira, mas errava aqui em dois sítios. O `data.product` é um
 * objecto, e dela saía `null` em vez do plano. E o único `id` à vista
 * era o do produto — igual em todas as compras do mesmo plano: a segunda
 * venda do Plano Sala entrava como repetição da primeira, respondia
 * "repetido" e não abria conta nenhuma.
 *
 * O id do evento é `event:saleId`, como a documentação manda. O nome do
 * evento entra de propósito: a compra e o reembolso da mesma venda são
 * dois avisos, e com o `saleId` sozinho o reembolso passava por
 * repetição da compra e nunca fechava a conta.
 */
function lerKursinha(bruto: Record<string, unknown>): EventoPagamento | null {
  const nomeEvento = texto(bruto.event);
  const dados = bruto.data;
  if (!nomeEvento || !eObjecto(dados)) return null;

  const venda = texto(dados.saleId) ?? texto(dados.orderId);
  if (!venda) return null;

  const eventoId = `${nomeEvento}:${venda}`;

  // O estado manda sobre o nome do evento: `sale.approved` com
  // `status: "pending"` ainda não é dinheiro em casa.
  const { tipo, motivo } = classificar(texto(dados.status) ?? nomeEvento);

  const comprador = eObjecto(dados.buyer) ? dados.buyer : {};
  const emailBruto = texto(comprador.email);
  const email = emailBruto && EMAIL.test(emailBruto) ? emailBruto.toLowerCase() : null;

  const produtoObj = eObjecto(dados.product) ? dados.product : {};
  const produto = identificador(produtoObj);

  // O preço do produto e não o `netAmount`: o líquido já vem com a
  // comissão e a taxa descontadas, e não bate com a tabela de preços.
  const valor = numero(produtoObj.price) ?? numero(dados.netAmount);

  if (tipo === 'pago' && !email) {
    return {
      eventoId,
      tipo: 'ignorado',
      email: null,
      produto,
      valor,
      meses: 1,
      motivo: 'Pagamento sem email do comprador — não há a quem abrir a conta.',
    };
  }

  // Um pagamento vale um mês. A Kursinha não manda período no aviso, e
  // inventar mais do que um mês a partir do preço seria dar acesso com
  // base num palpite.
  return { eventoId, tipo, email, produto, valor, meses: 1, motivo };
}

export function lerEvento(bruto: unknown): EventoPagamento {
  if (!eObjecto(bruto)) {
    return {
      eventoId: null,
      tipo: 'ignorado',
      email: null,
      produto: null,
      valor: null,
      meses: 1,
      motivo: 'O corpo não é um objecto.',
    };
  }

  const kursinha = lerKursinha(bruto);
  if (kursinha) return kursinha;

  const sinal =
    texto(procurar(bruto, ['status', 'estado', 'event', 'evento', 'type', 'tipo', 'action'])) ??
    null;

  const { tipo, motivo } = classificar(sinal);

  const emailBruto = texto(
    procurar(bruto, ['email', 'customer_email', 'buyer_email', 'email_comprador']),
  );
  const email = emailBruto && EMAIL.test(emailBruto) ? emailBruto.toLowerCase() : null;

  const eventoId = texto(
    procurar(bruto, [
      'sale_id',
      'event_id',
      'evento_id',
      'transaction_id',
      'transaction',
      'order_id',
      'pedido_id',
      'reference',
      'referencia',
      'codigo',
      'code',
      'id',
    ]),
  );

  const produto = identificador(
    procurar(bruto, [
      'product_id',
      'produto_id',
      'plan_id',
      'plano_id',
      'offer_id',
      'product',
      'produto',
      'plan',
      'plano',
      'offer',
      'oferta',
      'product_name',
      'nome_produto',
    ]),
  );

  const valor = numero(procurar(bruto, ['amount', 'valor', 'price', 'preco', 'total']));

  const mesesLidos = numero(procurar(bruto, ['months', 'meses', 'periodo_meses', 'quantity']));
  // Um pagamento vale um mês salvo indicação em contrário, e nunca mais
  // de doze de uma vez: um número absurdo vindo de fora não pode dar
  // acesso vitalício por engano.
  const meses = mesesLidos && mesesLidos >= 1 ? Math.min(12, Math.floor(mesesLidos)) : 1;

  if (tipo === 'pago' && !email) {
    return {
      eventoId,
      tipo: 'ignorado',
      email: null,
      produto,
      valor,
      meses,
      motivo: 'Pagamento sem email — não há a quem abrir a conta.',
    };
  }

  return { eventoId, tipo, email, produto, valor, meses, motivo };
}

/* ------------------------------------------------------------------ */
/* Do produto para o plano                                             */
/* ------------------------------------------------------------------ */

/**
 * Qual dos dois planos foi comprado.
 *
 * Os identificadores dos produtos vêm do ambiente e não do código: são
 * criados na Kursinha, mudam sem aviso, e não há razão para um deploy
 * por causa disso. A comparação é frouxa de propósito — tanto serve o
 * id do produto como o nome dele.
 */
export function planoDoProduto(
  produto: string | null,
  mapa: { mesa?: string | null; sala?: string | null },
): 'mesa' | 'sala' | null {
  if (!produto) return null;
  const p = produto.toLowerCase().trim();

  // O Sala vê-se primeiro: se alguém puser identificadores em que um
  // contém o outro, é o plano maior que deve ganhar — dar a mais é
  // recuperável, dar a menos é uma reclamação.
  if (mapa.sala && p.includes(mapa.sala.toLowerCase().trim())) return 'sala';
  if (mapa.mesa && p.includes(mapa.mesa.toLowerCase().trim())) return 'mesa';

  if (p.includes('sala')) return 'sala';
  if (p.includes('mesa')) return 'mesa';

  return null;
}

/**
 * Qual o plano, a julgar pelo que foi pago.
 *
 * Segundo sinal, para quando o aviso não traz produto reconhecível. Sem
 * ele, um pagamento sem produto renovava o plano que a casa já tinha —
 * e quem pagasse 19.900 para subir de Mesa para Sala pagava e ficava em
 * Mesa. Pior do que não abrir: cobra e não entrega.
 *
 * Os preços podem chegar em Kwanzas ou em cêntimos, conforme a
 * plataforma, por isso testam-se os dois. A margem é de 500 Kz para
 * aguentar taxas e arredondamentos sem confundir os planos, que estão a
 * 5.000 Kz um do outro.
 */
export function planoDoValor(
  valor: number | null,
  precos: { mesa: number; sala: number },
): 'mesa' | 'sala' | null {
  if (!valor || valor <= 0) return null;

  const MARGEM = 500;
  // Em cêntimos, 14.900 Kz chegam como 1490000.
  const candidatos = [valor, valor / 100];

  for (const v of candidatos) {
    if (Math.abs(v - precos.sala) <= MARGEM) return 'sala';
    if (Math.abs(v - precos.mesa) <= MARGEM) return 'mesa';
  }

  return null;
}

/**
 * Até quando fica pago.
 *
 * Soma a partir do que já lá está, e não a partir de hoje: quem renova
 * com cinco dias de sobra não pode perder esses cinco dias.
 */
export function novoPagoAte(
  actual: string | null | undefined,
  meses: number,
  agora: Date = new Date(),
): Date {
  const anterior = actual ? new Date(actual) : null;
  const valido = anterior && !Number.isNaN(anterior.getTime()) ? anterior : null;
  const inicio = valido && valido > agora ? valido : agora;

  return new Date(inicio.getTime() + meses * 30 * 86_400_000);
}
