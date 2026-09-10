import { describe, expect, it } from 'vitest';
import {
  DIAS_DE_TESTE,
  INCLUI,
  PRECO_PLANO,
  avisoDoTeste,
  diasDeTesteQueFaltam,
  estadoAssinatura,
  fimDoTeste,
} from '../src/lib/planos';
import type { Plano } from '../src/lib/tipos';

const AGORA = new Date('2026-09-10T12:00:00Z');
const daqui = (dias: number) =>
  new Date(AGORA.getTime() + dias * 86_400_000).toISOString();

describe('tabela de precos', () => {
  it('tem dois planos, e nenhum e gratuito', () => {
    const planos = Object.keys(PRECO_PLANO) as Plano[];
    expect(planos.sort()).toEqual(['mesa', 'sala']);
    for (const plano of planos) expect(PRECO_PLANO[plano]).toBeGreaterThan(0);
  });

  it('o Sala custa mais do que o Mesa', () => {
    expect(PRECO_PLANO.sala).toBeGreaterThan(PRECO_PLANO.mesa);
  });

  it('os precos sao os combinados', () => {
    expect(PRECO_PLANO.mesa).toBe(14900);
    expect(PRECO_PLANO.sala).toBe(19900);
  });

  it('cada plano diz o que inclui', () => {
    for (const plano of Object.keys(PRECO_PLANO) as Plano[]) {
      expect(INCLUI[plano].length).toBeGreaterThan(2);
      for (const linha of INCLUI[plano]) expect(linha.trim()).not.toBe('');
    }
  });
});

describe('estado da assinatura', () => {
  it('esta em teste enquanto a data nao passar', () => {
    expect(estadoAssinatura({ teste_termina_em: daqui(3) }, AGORA)).toBe('teste');
  });

  it('expira quando a data passa', () => {
    expect(estadoAssinatura({ teste_termina_em: daqui(-1) }, AGORA)).toBe('expirado');
  });

  it('quem pagou manda sobre o teste, mesmo com o teste a correr', () => {
    // Pagar ao terceiro dia nao pode custar os quatro que faltavam.
    expect(
      estadoAssinatura({ teste_termina_em: daqui(4), pago_ate: daqui(30) }, AGORA),
    ).toBe('activo');
  });

  it('quem pagou e deixou caducar volta a valer pelo teste', () => {
    expect(
      estadoAssinatura({ teste_termina_em: daqui(2), pago_ate: daqui(-5) }, AGORA),
    ).toBe('teste');
  });

  it('pagamento caducado e teste acabado da expirado', () => {
    expect(
      estadoAssinatura({ teste_termina_em: daqui(-9), pago_ate: daqui(-1) }, AGORA),
    ).toBe('expirado');
  });

  it('sem datas nenhumas conta como teste, nunca como expirado', () => {
    // Uma linha antiga que a migracao nao apanhou nao pode trancar uma
    // casa: e o pior erro que este codigo podia cometer.
    expect(estadoAssinatura({}, AGORA)).toBe('teste');
    expect(estadoAssinatura({ teste_termina_em: null, pago_ate: null }, AGORA)).toBe('teste');
  });

  it('aguenta uma data que nao e data', () => {
    expect(estadoAssinatura({ teste_termina_em: 'ontem' }, AGORA)).toBe('teste');
  });
});

describe('dias que faltam', () => {
  it('conta os dias inteiros que faltam', () => {
    expect(diasDeTesteQueFaltam({ teste_termina_em: daqui(7) }, AGORA)).toBe(7);
    expect(diasDeTesteQueFaltam({ teste_termina_em: daqui(1) }, AGORA)).toBe(1);
  });

  it('arredonda para cima, porque meio dia ainda e um dia', () => {
    expect(diasDeTesteQueFaltam({ teste_termina_em: daqui(0.75) }, AGORA)).toBe(1);
    expect(diasDeTesteQueFaltam({ teste_termina_em: daqui(2.1) }, AGORA)).toBe(3);
  });

  it('nao devolve numeros negativos', () => {
    expect(diasDeTesteQueFaltam({ teste_termina_em: daqui(-4) }, AGORA)).toBe(0);
  });

  it('sem data, assume o periodo inteiro', () => {
    expect(diasDeTesteQueFaltam({}, AGORA)).toBe(DIAS_DE_TESTE);
  });
});

describe('aviso do teste', () => {
  it('muda de tom a medida que aperta', () => {
    expect(avisoDoTeste(7)).toContain('7');
    expect(avisoDoTeste(1)).toBe('Último dia de experiência.');
    expect(avisoDoTeste(0)).toContain('terminou');
  });

  it('nunca sai em branco', () => {
    for (const dias of [-1, 0, 1, 2, 3, 4, 7, 30]) {
      expect(avisoDoTeste(dias).trim()).not.toBe('');
    }
  });

  it('nao fala no plural quando falta um so dia', () => {
    expect(avisoDoTeste(1)).not.toContain('dias');
  });
});

describe('fim do teste', () => {
  it('sao sete dias a contar do inicio', () => {
    const fim = fimDoTeste(AGORA);
    const dias = (fim.getTime() - AGORA.getTime()) / 86_400_000;
    expect(dias).toBe(DIAS_DE_TESTE);
  });

  it('uma conta criada agora comeca em teste', () => {
    expect(
      estadoAssinatura({ teste_termina_em: fimDoTeste(AGORA).toISOString() }, AGORA),
    ).toBe('teste');
  });
});
