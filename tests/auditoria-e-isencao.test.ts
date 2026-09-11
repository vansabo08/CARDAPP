import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cardapioNoAr, estadoDaConta, lembreteDevido, painelAberto } from '../src/lib/planos';

/**
 * Duas coisas que mexem em dinheiro e em dados alheios.
 *
 * A ISENÇÃO não é um caminho novo no código: apoia-se em `acesso_expira_em`
 * a nulo, que já significava "sem prazo" em todo o lado, e a base apaga a
 * data sempre que a linha for isenta. Isso é uma decisão que só se
 * aguenta se o significado de nulo estiver preso por testes — se um dia
 * alguém fizer nulo passar a "expirada", a casa do dono fecha e ninguém
 * liga as duas coisas.
 *
 * A AUDITORIA é a coisa mais perigosa que a aplicação faz. O que tem de
 * ficar provado é que a trava não está no browser: o cookie sozinho não
 * pode valer nada.
 */

/* ------------------------------------------------------------------ */
/* A isenção                                                           */
/* ------------------------------------------------------------------ */

describe('uma casa isenta', () => {
  it('conta como activa, e não como expirada', () => {
    expect(estadoDaConta(null)).toBe('activa');
  });

  it('tem o painel aberto', () => {
    expect(painelAberto(estadoDaConta(null))).toBe(true);
  });

  it('tem o cardápio no ar', () => {
    expect(cardapioNoAr(estadoDaConta(null))).toBe(true);
  });

  it('nunca recebe lembretes de renovação', () => {
    expect(lembreteDevido(null)).toBeNull();
    // E em nenhum momento do ciclo, que é o que faria falta descobrir
    // pela pior via: um email a pedir dinheiro a quem é dono disto.
    for (const dias of [-40, -4, -1, 0, 1, 3, 7, 30]) {
      const agora = new Date(Date.now() + dias * 86_400_000);
      expect(lembreteDevido(null, agora)).toBeNull();
    }
  });

  it('e continua activa daqui a dez anos', () => {
    const daquiA10Anos = new Date(Date.now() + 3650 * 86_400_000);
    expect(estadoDaConta(null, daquiA10Anos)).toBe('activa');
  });
});

/* ------------------------------------------------------------------ */
/* A auditoria                                                         */
/* ------------------------------------------------------------------ */

let admin = true;
const armazem = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nome: string) => {
      const valor = armazem.get(nome);
      return valor === undefined ? undefined : { name: nome, value: valor };
    },
    set: (nome: string, valor: string) => armazem.set(nome, valor),
    delete: (nome: string) => armazem.delete(nome),
    getAll: () => [...armazem].map(([name, value]) => ({ name, value })),
  }),
}));

vi.mock('../src/lib/admin', () => ({
  eAdministrador: async () => admin,
  exigirAdministrador: async () => {
    if (!admin) throw new Error('Sem autorização.');
  },
}));

const { casaEmAuditoria, marcarAuditoria, limparAuditoria, DURACAO_DA_AUDITORIA } = await import(
  '../src/lib/auditoria'
);

beforeEach(() => {
  admin = true;
  armazem.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('entrar na casa de outra pessoa', () => {
  it('sem cookie não se está em auditoria nenhuma', async () => {
    expect(await casaEmAuditoria()).toBeNull();
  });

  it('com cookie e sendo administrador, entra', async () => {
    await marcarAuditoria('casa-alheia');
    expect(await casaEmAuditoria()).toBe('casa-alheia');
  });

  it('O COOKIE SOZINHO NÃO VALE NADA', async () => {
    /*
     * A trava é esta. Se a permissão fosse verificada só à entrada e o
     * cookie passasse a valer por si, qualquer pessoa que descobrisse o
     * nome do cookie escrevia lá um identificador e entrava na casa que
     * quisesse — com escrita, que é o que torna isto grave.
     */
    await marcarAuditoria('casa-alheia');
    admin = false;
    expect(await casaEmAuditoria()).toBeNull();
  });

  it('deixa de valer assim que a permissão é retirada', async () => {
    await marcarAuditoria('casa-alheia');
    expect(await casaEmAuditoria()).toBe('casa-alheia');

    admin = false;
    expect(await casaEmAuditoria()).toBeNull();

    admin = true;
    expect(await casaEmAuditoria()).toBe('casa-alheia');
  });

  it('sair limpa mesmo', async () => {
    await marcarAuditoria('casa-alheia');
    await limparAuditoria();
    expect(await casaEmAuditoria()).toBeNull();
  });

  it('não dura mais do que duas horas', () => {
    // Uma auditoria esquecida em aberto é o caminho mais provável para
    // se estragar uma casa sem querer.
    expect(DURACAO_DA_AUDITORIA).toBeLessThanOrEqual(2 * 60 * 60);
    expect(DURACAO_DA_AUDITORIA).toBeGreaterThan(0);
  });
});
