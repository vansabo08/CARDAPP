import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Cada escrita do painel só toca na casa em que se está.
 *
 * Isto não precisava de teste enquanto as escritas iam com a sessão do
 * dono: a RLS garantia-o. Com a auditoria, o painel passou a escrever com
 * a chave de serviço, que passa por cima da RLS — e dez escritas que
 * diziam só "o pedido com este id" passaram a poder mexer em qualquer
 * pedido de qualquer casa.
 *
 * Aqui há duas casas na base e o painel está na primeira. Tudo o que se
 * tentar fazer com um id da segunda tem de sair sem ter tocado em nada.
 */

type Linha = Record<string, unknown>;

const base: { orders: Linha[]; categories: Linha[]; items: Linha[]; tables: Linha[] } = {
  orders: [],
  categories: [],
  items: [],
  tables: [],
};

/** Simula o PostgREST o suficiente para \`update/delete ... eq ... in\`. */
function tabela(nome: keyof typeof base) {
  const filtros: ((l: Linha) => boolean)[] = [];
  let mudanca: Linha | null = null;
  let apagar = false;

  function correr() {
    const tocadas = base[nome].filter((l) => filtros.every((f) => f(l)));
    if (apagar) base[nome] = base[nome].filter((l) => !tocadas.includes(l));
    else if (mudanca) for (const l of tocadas) Object.assign(l, mudanca);
    return tocadas;
  }

  const c: Record<string, unknown> = {
    select: () => c,
    update: (m: Linha) => ((mudanca = m), c),
    delete: () => ((apagar = true), c),
    insert: (l: Linha) => (base[nome].push(l), c),
    eq: (campo: string, valor: unknown) => (filtros.push((l) => l[campo] === valor), c),
    is: (campo: string, valor: unknown) => (filtros.push((l) => (l[campo] ?? null) === valor), c),
    in: (campo: string, valores: unknown[]) => (filtros.push((l) => valores.includes(l[campo])), c),
    single: () => Promise.resolve({ data: correr()[0] ?? null, error: null }),
    maybeSingle: () => Promise.resolve({ data: correr()[0] ?? null, error: null }),
    then: (ok: (v: unknown) => void) => ok({ data: correr(), error: null }),
  };
  return c;
}

vi.mock('../src/lib/supabase/servidor', () => ({
  clienteDoPainel: async () => ({ from: (n: keyof typeof base) => tabela(n) }),
}));

vi.mock('../src/lib/dados', () => ({
  obterRestauranteDoDono: async () => ({ id: 'casa-a', slug: 'casa-a', plano: 'sala' }),
  obterMesas: async () => [],
}));

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const pedidos = await import('../src/app/painel/pedidos/accoes');
const cardapio = await import('../src/app/painel/cardapio/accoes');
const mesas = await import('../src/app/painel/mesas/accoes');

beforeEach(() => {
  base.orders = [
    { id: 'p-a', restaurant_id: 'casa-a', estado: 'novo', confirmado_em: null },
    { id: 'p-b', restaurant_id: 'casa-b', estado: 'novo', confirmado_em: null },
  ];
  base.categories = [
    { id: 'cat-a', restaurant_id: 'casa-a', nome: 'Entradas' },
    { id: 'cat-b', restaurant_id: 'casa-b', nome: 'Da outra casa' },
  ];
  base.items = [
    { id: 'prato-a', category_id: 'cat-a', nome: 'Kitaba', disponivel: true },
    { id: 'prato-b', category_id: 'cat-b', nome: 'Da outra casa', disponivel: true },
  ];
  base.tables = [
    { id: 'mesa-a', restaurant_id: 'casa-a', numero: 1 },
    { id: 'mesa-b', restaurant_id: 'casa-b', numero: 1 },
  ];
});

const daOutraCasa = <T extends Linha>(lista: T[], id: string) => lista.find((l) => l.id === id)!;

describe('pedidos', () => {
  it('confirmar um pedido desta casa funciona', async () => {
    await pedidos.confirmarPedido('p-a');
    expect(daOutraCasa(base.orders, 'p-a').confirmado_em).not.toBeNull();
  });

  it('confirmar um pedido de outra casa não lhe toca', async () => {
    await pedidos.confirmarPedido('p-b');
    expect(daOutraCasa(base.orders, 'p-b').confirmado_em).toBeNull();
  });

  it('mudar o estado de um pedido de outra casa é recusado, e não lhe toca', async () => {
    const r = await pedidos.mudarEstado('p-b', 'entregue');
    expect(r.ok).toBe(false);
    expect(daOutraCasa(base.orders, 'p-b').estado).toBe('novo');
  });

  it('não pede sessão — em auditoria não há sessão nenhuma', async () => {
    // Antes respondia "Sessão terminada" a quem administrava.
    const r = await pedidos.mudarEstado('p-a', 'preparar');
    expect(r.ok).toBe(true);
  });
});

describe('cardápio', () => {
  it('renomear uma categoria de outra casa não lhe toca', async () => {
    await cardapio.renomearCategoria('cat-b', 'Mexido');
    expect(daOutraCasa(base.categories, 'cat-b').nome).toBe('Da outra casa');
  });

  it('apagar uma categoria de outra casa não a apaga', async () => {
    await cardapio.apagarCategoria('cat-b');
    expect(base.categories.some((c) => c.id === 'cat-b')).toBe(true);
  });

  it('criar um prato numa categoria de outra casa é recusado', async () => {
    const antes = base.items.length;
    const r = await cardapio.criarPrato('cat-b', {
      nome: 'Intruso',
      descricao: null,
      preco: 1,
      foto_url: null,
      disponivel: true,
    });
    expect(r.ok).toBe(false);
    expect(base.items.length).toBe(antes);
  });

  it('esgotar um prato de outra casa não lhe toca', async () => {
    await cardapio.alternarDisponivel('prato-b', false);
    expect(daOutraCasa(base.items, 'prato-b').disponivel).toBe(true);
  });

  it('apagar um prato de outra casa não o apaga', async () => {
    await cardapio.apagarPrato('prato-b');
    expect(base.items.some((i) => i.id === 'prato-b')).toBe(true);
  });

  it('e um prato desta casa apaga-se normalmente', async () => {
    await cardapio.apagarPrato('prato-a');
    expect(base.items.some((i) => i.id === 'prato-a')).toBe(false);
  });
});

describe('mesas', () => {
  it('apagar uma mesa de outra casa não a apaga', async () => {
    await mesas.apagarMesa('mesa-b');
    expect(base.tables.some((t) => t.id === 'mesa-b')).toBe(true);
  });
});
