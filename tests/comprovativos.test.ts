import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * O pagamento à mão: transferir, provar, e alguém confirmar.
 *
 * As contas erradas aqui custam nos dois sentidos. De menos, e a casa
 * fica fechada tendo pago. De mais, e dá-se serviço que ninguém comprou
 * — e o de mais é o que não se nota, porque o resultado parece certo.
 *
 * A conta que mais me preocupa é a dos dias provisórios. Aprovar tem de
 * somar os 30 à data que a conta tinha ANTES da cortesia, senão dá 33
 * por um pagamento de 30, todos os meses, para sempre.
 */

type Comprovativo = {
  id: string;
  restaurant_id: string;
  plano: string;
  estado: string;
  expirava_em: string | null;
  decidido_em?: string | null;
  decidido_por?: string | null;
  nota?: string | null;
};

type Casa = { id: string; plano: string; acesso_expira_em: string | null; slug: string };

const estado: { comprovativos: Comprovativo[]; casas: Casa[]; auditoria: unknown[] } = {
  comprovativos: [],
  casas: [],
  auditoria: [],
};

let admin = true;

function tabela(nome: string) {
  const alvo = () =>
    nome === 'comprovativos'
      ? (estado.comprovativos as unknown as Record<string, unknown>[])
      : nome === 'restaurants'
        ? (estado.casas as unknown as Record<string, unknown>[])
        : (estado.auditoria as Record<string, unknown>[]);

  const c = {
    _filtros: [] as { campo: string; valor: unknown }[],
    _mudanca: null as null | Record<string, unknown>,

    select() {
      return c;
    },
    update(m: Record<string, unknown>) {
      c._mudanca = m;
      return c;
    },
    insert(linha: Record<string, unknown>) {
      alvo().push(linha);
      return Promise.resolve({ data: null, error: null });
    },
    eq(campo: string, valor: unknown) {
      c._filtros.push({ campo, valor });

      if (c._mudanca) {
        const m = c._mudanca;
        const filtros = c._filtros;
        c._mudanca = null;
        c._filtros = [];
        for (const linha of alvo()) {
          if (filtros.every((f) => linha[f.campo] === f.valor)) Object.assign(linha, m);
        }
        return Promise.resolve({ data: null, error: null });
      }

      return c;
    },
    maybeSingle() {
      const filtros = c._filtros;
      c._filtros = [];
      const achada = alvo().find((l) => filtros.every((f) => l[f.campo] === f.valor)) ?? null;
      return Promise.resolve({ data: achada, error: null });
    },
  };

  return c;
}

vi.mock('../src/lib/supabase/administrador', () => ({
  clienteAdministrador: () => ({ from: (nome: string) => tabela(nome) }),
  servicoConfigurado: () => true,
}));

vi.mock('../src/lib/supabase/servidor', () => ({
  utilizadorActual: async () => ({ email: 'vansabo08@gmail.com', id: 'dono-1' }),
}));

vi.mock('../src/lib/admin', async (original) => {
  const real = await original<typeof import('../src/lib/admin')>();
  return {
    ...real,
    eAdministrador: async () => admin,
    exigirAdministrador: async () => {
      if (!admin) throw new Error('Sem autorização.');
    },
  };
});

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { decidirComprovativo } = await import('../src/app/admin/accoes');

const DIA = 86_400_000;

/** A data que a conta tinha antes de alguém subir seja o que for. */
const EXPIRAVA = new Date(Date.now() + 4 * DIA).toISOString();

beforeEach(() => {
  admin = true;
  estado.auditoria = [];
  estado.casas = [
    {
      id: 'casa-1',
      plano: 'mesa',
      // O acesso provisório já mexeu nesta data: são os 3 dias da
      // cortesia, e não os 4 que a conta tinha.
      acesso_expira_em: new Date(Date.now() + 3 * DIA).toISOString(),
      slug: 'tamariz',
    },
  ];
  estado.comprovativos = [
    {
      id: 'comp-1',
      restaurant_id: 'casa-1',
      plano: 'mesa',
      estado: 'a_espera',
      expirava_em: EXPIRAVA,
    },
  ];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('decidir um comprovativo', () => {
  it('aprovar soma os 30 dias à data de ANTES da cortesia, e não por cima dela', async () => {
    const r = await decidirComprovativo('comp-1', true);
    expect(r.ok).toBe(true);

    const ficou = new Date(estado.casas[0].acesso_expira_em!).getTime();
    const esperado = new Date(EXPIRAVA).getTime() + 30 * DIA;

    // Se somasse por cima dos 3 dias provisórios dava 33 por um
    // pagamento de 30 — o erro que ninguém veria.
    expect(Math.round((ficou - esperado) / 1000)).toBe(0);
  });

  it('recusar fecha o painel na hora', async () => {
    await decidirComprovativo('comp-1', false);

    const ficou = new Date(estado.casas[0].acesso_expira_em!).getTime();
    expect(ficou).toBeLessThanOrEqual(Date.now() + 2000);
  });

  it('recusar não devolve a data antiga — essa já tinha expirado', async () => {
    estado.comprovativos[0].expirava_em = new Date(Date.now() - 10 * DIA).toISOString();
    await decidirComprovativo('comp-1', false);

    const ficou = new Date(estado.casas[0].acesso_expira_em!).getTime();
    expect(ficou).toBeGreaterThan(Date.now() - 5000);
  });

  it('marca o comprovativo como decidido, e por quem', async () => {
    await decidirComprovativo('comp-1', true);
    expect(estado.comprovativos[0].estado).toBe('aprovado');
    expect(estado.comprovativos[0].decidido_por).toBe('vansabo08@gmail.com');
  });

  it('recusa decidir duas vezes o mesmo comprovativo', async () => {
    const primeira = await decidirComprovativo('comp-1', true);
    expect(primeira.ok).toBe(true);

    const depoisDaPrimeira = estado.casas[0].acesso_expira_em;

    const segunda = await decidirComprovativo('comp-1', true);
    expect(segunda.ok).toBe(false);
    expect(segunda.erro).toMatch(/já foi decidido/i);
    expect(estado.casas[0].acesso_expira_em).toBe(depoisDaPrimeira);
  });

  it('não deixa aprovar um que já tinha sido recusado', async () => {
    await decidirComprovativo('comp-1', false);
    const r = await decidirComprovativo('comp-1', true);
    expect(r.ok).toBe(false);
  });

  it('recusa um comprovativo que não existe', async () => {
    const r = await decidirComprovativo('nao-existe', true);
    expect(r.ok).toBe(false);
  });

  it('recusa quem não é administrador, e não mexe na conta', async () => {
    admin = false;
    const antes = estado.casas[0].acesso_expira_em;
    await expect(decidirComprovativo('comp-1', true)).rejects.toThrow(/autoriza/i);
    expect(estado.casas[0].acesso_expira_em).toBe(antes);
    expect(estado.comprovativos[0].estado).toBe('a_espera');
  });

  it('deixa rasto no livro', async () => {
    await decidirComprovativo('comp-1', true);
    expect(estado.auditoria).toHaveLength(1);
  });
});
