import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Aplicar um pagamento órfão à conta certa.
 *
 * Isto mexe em dinheiro nos dois sentidos: de menos, e a casa fica
 * fechada tendo pago; de mais, e dá-se serviço que ninguém comprou. As
 * duas travas que interessam são a de quem chama — só administrador — e
 * a de não aplicar duas vezes o mesmo pagamento.
 *
 * A segunda é a mais traiçoeira. Um duplo-clique, um recarregar da
 * página, dois separadores abertos: qualquer um deles dava dois meses
 * por um pagamento, e ninguém dava por ela porque o resultado *parece*
 * certo — a conta abriu.
 */

/* ------------------------------------------------------------------ */
/* Uma base de dados de mentira, com só o que esta acção toca          */
/* ------------------------------------------------------------------ */

type Pagamento = {
  id: string;
  restaurant_id: string | null;
  plano: string | null;
  email: string | null;
};

type Casa = {
  id: string;
  plano: string;
  acesso_expira_em: string | null;
  slug: string;
};

const estado: { pagamentos: Pagamento[]; casas: Casa[]; auditoria: unknown[] } = {
  pagamentos: [],
  casas: [],
  auditoria: [],
};

let admin = true;

function tabela(nome: string) {
  const alvo = () =>
    nome === 'pagamentos'
      ? (estado.pagamentos as unknown as Record<string, unknown>[])
      : nome === 'restaurants'
        ? (estado.casas as unknown as Record<string, unknown>[])
        : (estado.auditoria as Record<string, unknown>[]);

  const construtor = {
    _filtro: null as null | { campo: string; valor: unknown },
    _mudanca: null as null | Record<string, unknown>,

    select() {
      return construtor;
    },
    update(mudanca: Record<string, unknown>) {
      construtor._mudanca = mudanca;
      return construtor;
    },
    insert(linha: Record<string, unknown>) {
      alvo().push(linha);
      return Promise.resolve({ data: null, error: null });
    },
    eq(campo: string, valor: unknown) {
      construtor._filtro = { campo, valor };

      if (construtor._mudanca) {
        const mudanca = construtor._mudanca;
        construtor._mudanca = null;
        for (const linha of alvo()) {
          if (linha[campo] === valor) Object.assign(linha, mudanca);
        }
        return Promise.resolve({ data: null, error: null });
      }

      return construtor;
    },
    maybeSingle() {
      const f = construtor._filtro;
      const achada = f ? alvo().find((l) => l[f.campo] === f.valor) ?? null : null;
      construtor._filtro = null;
      return Promise.resolve({ data: achada, error: null });
    },
  };

  return construtor;
}

vi.mock('../src/lib/supabase/administrador', () => ({
  clienteAdministrador: () => ({ from: (nome: string) => tabela(nome) }),
  servicoConfigurado: () => true,
}));

vi.mock('../src/lib/supabase/servidor', () => ({
  utilizadorActual: async () => ({ email: 'vansabo08@gmail.com' }),
}));

vi.mock('../src/lib/admin', async (original) => {
  const real = await original<typeof import('../src/lib/admin')>();
  return {
    ...real,
    exigirAdministrador: async () => {
      if (!admin) throw new Error('Sem autorização.');
    },
  };
});

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { aplicarPagamento } = await import('../src/app/admin/accoes');

/* ------------------------------------------------------------------ */

const DIA = 86_400_000;

beforeEach(() => {
  admin = true;
  estado.auditoria = [];
  estado.casas = [
    {
      id: 'casa-1',
      plano: 'mesa',
      acesso_expira_em: new Date(Date.now() + 5 * DIA).toISOString(),
      slug: 'tamariz',
    },
  ];
  estado.pagamentos = [
    { id: 'pag-1', restaurant_id: null, plano: 'sala', email: 'outro@gmail.com' },
    { id: 'pag-2', restaurant_id: 'casa-1', plano: 'mesa', email: 'tamariz@gmail.com' },
  ];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('aplicar um pagamento à mão', () => {
  it('abre a conta e soma os dias a partir do que ela já tinha', async () => {
    const antes = new Date(estado.casas[0].acesso_expira_em!).getTime();

    const r = await aplicarPagamento('pag-1', 'casa-1');
    expect(r.ok).toBe(true);

    const depois = new Date(estado.casas[0].acesso_expira_em!).getTime();
    const acrescentados = Math.round((depois - antes) / DIA);

    // Trinta dias do plano, somados aos cinco que faltavam — e não a
    // contar de hoje, que perdia esses cinco.
    expect(acrescentados).toBe(30);
  });

  it('sobe a casa ao plano que foi comprado', async () => {
    await aplicarPagamento('pag-1', 'casa-1');
    expect(estado.casas[0].plano).toBe('sala');
  });

  it('carimba o pagamento com a casa a que passou a pertencer', async () => {
    await aplicarPagamento('pag-1', 'casa-1');
    expect(estado.pagamentos[0].restaurant_id).toBe('casa-1');
  });

  it('recusa aplicar duas vezes o mesmo pagamento', async () => {
    const primeira = await aplicarPagamento('pag-1', 'casa-1');
    expect(primeira.ok).toBe(true);

    const expiraDepoisDaPrimeira = estado.casas[0].acesso_expira_em;

    const segunda = await aplicarPagamento('pag-1', 'casa-1');
    expect(segunda.ok).toBe(false);
    expect(segunda.erro).toMatch(/já foi aplicado/i);

    // E, sobretudo, a data não se mexeu.
    expect(estado.casas[0].acesso_expira_em).toBe(expiraDepoisDaPrimeira);
  });

  it('recusa um pagamento que já nasceu com dono', async () => {
    const r = await aplicarPagamento('pag-2', 'casa-1');
    expect(r.ok).toBe(false);
  });

  it('recusa um pagamento que não existe', async () => {
    const r = await aplicarPagamento('nao-existe', 'casa-1');
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/não encontrado/i);
  });

  it('recusa uma conta que não existe, e não carimba o pagamento', async () => {
    const r = await aplicarPagamento('pag-1', 'casa-nenhuma');
    expect(r.ok).toBe(false);
    expect(estado.pagamentos[0].restaurant_id).toBeNull();
  });

  it('recusa quem não é administrador', async () => {
    admin = false;
    await expect(aplicarPagamento('pag-1', 'casa-1')).rejects.toThrow(/autoriza/i);
    expect(estado.pagamentos[0].restaurant_id).toBeNull();
  });

  it('deixa rasto no livro', async () => {
    await aplicarPagamento('pag-1', 'casa-1');
    expect(estado.auditoria).toHaveLength(1);
  });
});
