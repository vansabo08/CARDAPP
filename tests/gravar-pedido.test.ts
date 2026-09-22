import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CategoriaComPratos } from '@/lib/tipos';

/**
 * O que chega à base de dados quando o cliente carrega em "Pedir".
 *
 * Este teste existe por causa de uma falha que passou por todos os
 * outros: a observação do pedido era lida do corpo, cortada, guardada
 * numa variável — e deixada de fora da gravação. O cliente escrevia
 * "sem cebola", o servidor recebia-o, e a cozinha nunca o via.
 *
 * Nenhum teste apanhou isto porque nenhum olhava para o objecto que vai
 * para o `insert`. Este olha — e, desde a fase 3 do Plano Sala, olha
 * também para o preço, que passou a vir da base e não do telemóvel.
 */

let gravado: Record<string, unknown> | null = null;

vi.mock('../src/lib/supabase/servidor', () => ({
  clienteServidor: async () => ({
    from: () => ({
      insert: (linha: Record<string, unknown>) => {
        gravado = linha;
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

/** As mesas desta casa. Qualquer outra conta como de outro restaurante. */
const MESAS_DA_CASA = new Set(['mesa-4']);

vi.mock('../src/lib/supabase/publico', () => ({
  clientePublico: () => ({
    from: () => {
      let id = '';
      const consulta = {
        select: () => consulta,
        eq: (coluna: string, valor: string) => {
          if (coluna === 'id') id = valor;
          return consulta;
        },
        maybeSingle: async () => ({ data: MESAS_DA_CASA.has(id) ? { id } : null }),
      };
      return consulta;
    },
  }),
}));

const CARDAPIO: CategoriaComPratos[] = [
  {
    id: 'c1',
    restaurant_id: 'casa-1',
    nome: 'Pratos',
    ordem: 0,
    itens: [
      { id: 'p-frango', category_id: 'c1', nome: 'Frango assado', descricao: null, preco: 4500, foto_url: null, disponivel: true, ordem: 0 },
      { id: 'p-esgotado', category_id: 'c1', nome: 'Calulu', descricao: null, preco: 5500, foto_url: null, disponivel: false, ordem: 1 },
      {
        id: 'p-muamba',
        category_id: 'c1',
        nome: 'Muamba',
        descricao: null,
        preco: 4000,
        foto_url: null,
        disponivel: true,
        ordem: 2,
        grupos: [
          {
            id: 'g1',
            nome: 'Tamanho',
            tipo: 'variante',
            minimo: 1,
            maximo: 1,
            ordem: 0,
            opcoes: [{ id: 'grande', nome: 'Grande', preco: 6000, disponivel: true, ordem: 0 }],
          },
          {
            id: 'g2',
            nome: 'Extras',
            tipo: 'extra',
            minimo: 0,
            maximo: 3,
            ordem: 1,
            opcoes: [{ id: 'queijo', nome: 'Queijo', preco: 500, disponivel: true, ordem: 0 }],
          },
        ],
      },
    ],
  },
];

vi.mock('../src/lib/dados', () => ({
  obterRestaurantePorSlug: async () => ({ id: 'casa-1', slug: 'tamariz' }),
  obterCardapio: async () => CARDAPIO,
  eDemonstracao: () => false,
}));

const { POST } = await import('../src/app/api/pedidos/route');

function pedir(corpo: Record<string, unknown>) {
  return POST(
    new Request('https://exemplo.test/api/pedidos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
    }),
  );
}

const BASE = {
  slug: 'tamariz',
  table_id: 'mesa-4',
  itens: [{ item_id: 'p-frango', nome: 'Frango assado', qtd: 2, preco: 4500 }],
};

beforeEach(() => {
  gravado = null;
});

describe('gravar um pedido', () => {
  it('a observação do pedido chega à base de dados', async () => {
    const r = await pedir({ ...BASE, observacao: 'Sem cebola, por favor' });
    expect(r.status).toBe(200);
    expect(gravado?.observacao).toBe('Sem cebola, por favor');
  });

  it('a observação de cada prato também chega', async () => {
    await pedir({
      ...BASE,
      itens: [{ item_id: 'p-frango', qtd: 1, obs: 'bem passado' }],
    });
    const itens = gravado?.itens as { obs: string | null }[];
    expect(itens[0].obs).toBe('bem passado');
  });

  it('sem observação grava nulo, e não uma frase vazia', async () => {
    // Uma frase vazia desenharia no painel uma caixa de observação sem
    // nada lá dentro — e a cozinha ia procurar o que não existe.
    await pedir({ ...BASE, observacao: '   ' });
    expect(gravado?.observacao).toBeNull();
  });

  it('corta a observação aos 200 caracteres', async () => {
    await pedir({ ...BASE, observacao: 'a'.repeat(500) });
    expect((gravado?.observacao as string).length).toBe(200);
  });

  it('ignora uma observação que não seja texto, e grava o pedido na mesma', async () => {
    const r = await pedir({ ...BASE, observacao: { maldade: true } });
    expect(r.status).toBe(200);
    expect(gravado?.observacao).toBeNull();
  });

  it('não grava o estado nem a confirmação que o cliente mande', async () => {
    /*
     * Um pedido enviado já "confirmado" nunca faria o alarme tocar, e um
     * enviado já "entregue" nem apareceria na fila. O que o cliente pode
     * escrever aqui é só o que ele sabe: o que pediu, e para que mesa.
     */
    await pedir({ ...BASE, estado: 'entregue', confirmado_em: new Date().toISOString() });
    expect(gravado).not.toHaveProperty('estado');
    expect(gravado).not.toHaveProperty('confirmado_em');
  });

  it('recalcula o total, e não confia no que vem do cliente', async () => {
    await pedir({ ...BASE, total: 1 });
    expect(gravado?.total).toBe(9000);
  });
});

describe('o preço vem da base', () => {
  it('um preço inventado na linha é ignorado', async () => {
    await pedir({ ...BASE, itens: [{ item_id: 'p-frango', qtd: 2, preco: 1 }] });
    const itens = gravado?.itens as { preco: number }[];
    expect(itens[0].preco).toBe(4500);
    expect(gravado?.total).toBe(9000);
  });

  it('o cardápio antigo, que só manda o nome, também leva o preço da base', async () => {
    await pedir({ ...BASE, itens: [{ nome: 'frango assado', qtd: 1, preco: 0 }] });
    expect(gravado?.total).toBe(4500);
  });

  it('com tamanho e extras, a conta é a do tamanho mais os extras', async () => {
    await pedir({ ...BASE, itens: [{ item_id: 'p-muamba', qtd: 2, opcao_ids: ['grande', 'queijo'] }] });
    const [linha] = gravado?.itens as { preco: number; opcoes: { nome: string }[] }[];
    expect(linha.preco).toBe(6500);
    expect(linha.opcoes.map((o) => o.nome)).toEqual(['Grande', 'Queijo']);
    expect(gravado?.total).toBe(13000);
  });

  it('sem o tamanho obrigatório não se grava nada', async () => {
    const r = await pedir({ ...BASE, itens: [{ item_id: 'p-muamba', qtd: 1, opcao_ids: [] }] });
    expect(r.status).toBe(409);
    expect(gravado).toBeNull();
  });

  it('uma opção de outro prato é recusada', async () => {
    const r = await pedir({ ...BASE, itens: [{ item_id: 'p-frango', qtd: 1, opcao_ids: ['queijo'] }] });
    expect(r.status).toBe(409);
    expect(gravado).toBeNull();
  });

  it('um prato que esgotou entretanto é recusado, com o nome dele', async () => {
    const r = await pedir({ ...BASE, itens: [{ item_id: 'p-esgotado', qtd: 1 }] });
    expect(r.status).toBe(409);
    expect((await r.json()).erro).toContain('Calulu');
  });

  it('um prato que não existe é recusado', async () => {
    const r = await pedir({ ...BASE, itens: [{ nome: 'Lagosta', qtd: 1, preco: 1 }] });
    expect(r.status).toBe(409);
  });

  it('uma mesa de outra casa não fica no pedido', async () => {
    await pedir({ ...BASE, table_id: 'mesa-de-outro-restaurante' });
    expect(gravado?.table_id).toBeNull();
    await pedir(BASE);
    expect(gravado?.table_id).toBe('mesa-4');
  });
});
