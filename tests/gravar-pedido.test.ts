import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * O que chega à base de dados quando o cliente carrega em "Pedir".
 *
 * Este teste existe por causa de uma falha que passou por todos os
 * outros: a observação do pedido era lida do corpo, cortada, guardada
 * numa variável — e deixada de fora da gravação. O cliente escrevia
 * "sem cebola", o servidor recebia-o, e a cozinha nunca o via.
 *
 * Nenhum teste apanhou isto porque nenhum olhava para o objecto que vai
 * para o `insert`. Testava-se o percurso dos estados, os rótulos, o
 * texto do WhatsApp — tudo à volta, e nada no sítio onde se perdia.
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

vi.mock('../src/lib/dados', () => ({
  obterRestaurantePorSlug: async () => ({ id: 'casa-1', slug: 'tamariz' }),
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
  itens: [{ nome: 'Frango assado', qtd: 2, preco: 4500 }],
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
      itens: [{ nome: 'Frango assado', qtd: 1, preco: 4500, obs: 'bem passado' }],
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

  it('ignora uma observação que não seja texto', async () => {
    await pedir({ ...BASE, observacao: { maldade: true } });
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
