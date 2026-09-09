import { describe, expect, it } from 'vitest';
import {
  ESTADOS,
  EXPLICACAO_CLIENTE,
  ROTULO_CLIENTE,
  ROTULO_PAINEL,
  TODOS_OS_ESTADOS,
  avancosPossiveis,
  eEstadoFinal,
  estadoValido,
  hAQuantoTempo,
  progresso,
  proximoEstado,
} from '../src/lib/pedidos';
import type { EstadoPedido } from '../src/lib/tipos';

describe('percurso do pedido', () => {
  it('comeca em novo e acaba em entregue', () => {
    expect(ESTADOS[0]).toBe('novo');
    expect(ESTADOS[ESTADOS.length - 1]).toBe('entregue');
  });

  it('avanca um passo de cada vez', () => {
    expect(proximoEstado('novo')).toBe('preparar');
    expect(proximoEstado('preparar')).toBe('pronto');
    expect(proximoEstado('pronto')).toBe('caminho');
    expect(proximoEstado('caminho')).toBe('entregue');
  });

  it('nao avanca a partir de um estado final', () => {
    expect(proximoEstado('entregue')).toBeNull();
    expect(proximoEstado('cancelado')).toBeNull();
  });

  it('reconhece os estados finais', () => {
    expect(eEstadoFinal('entregue')).toBe(true);
    expect(eEstadoFinal('cancelado')).toBe(true);
    expect(eEstadoFinal('novo')).toBe(false);
    expect(eEstadoFinal('caminho')).toBe(false);
  });
});

describe('avancos possiveis', () => {
  it('oferece todos os passos a frente, e nenhum atras', () => {
    // Quem serve a mesa salta o "a caminho"; quem entrega ao domicilio
    // usa-o. Por isso oferecem-se os dois e nao se impoe nenhum.
    expect(avancosPossiveis('novo')).toEqual(['preparar', 'pronto', 'caminho', 'entregue']);
    expect(avancosPossiveis('pronto')).toEqual(['caminho', 'entregue']);
    expect(avancosPossiveis('caminho')).toEqual(['entregue']);
  });

  it('nunca deixa recuar', () => {
    for (const estado of ESTADOS) {
      const indice = ESTADOS.indexOf(estado);
      for (const avanco of avancosPossiveis(estado)) {
        expect(ESTADOS.indexOf(avanco)).toBeGreaterThan(indice);
      }
    }
  });

  it('nao oferece nada quando ja acabou', () => {
    expect(avancosPossiveis('entregue')).toEqual([]);
    expect(avancosPossiveis('cancelado')).toEqual([]);
  });
});

describe('estadoValido', () => {
  it('aceita os seis estados reais', () => {
    for (const estado of TODOS_OS_ESTADOS) {
      expect(estadoValido(estado)).toBe(true);
    }
  });

  it('recusa o resto', () => {
    // A rota que muda o estado recebe isto de fora, por isso a barreira
    // tem de aguentar o que vier.
    for (const lixo of ['', 'NOVO', 'pago', 'novo ', null, undefined, 7, {}, ['novo']]) {
      expect(estadoValido(lixo)).toBe(false);
    }
  });
});

describe('progresso', () => {
  it('vai de zero a um ao longo do percurso', () => {
    expect(progresso('novo')).toBe(0);
    expect(progresso('entregue')).toBe(1);
  });

  it('cresce sempre, nunca encolhe', () => {
    let anterior = -1;
    for (const estado of ESTADOS) {
      const valor = progresso(estado);
      expect(valor).toBeGreaterThan(anterior);
      anterior = valor;
    }
  });

  it('nao desenha percurso nenhum para um pedido cancelado', () => {
    expect(progresso('cancelado')).toBe(0);
  });
});

describe('rotulos', () => {
  it('cobrem todos os estados, sem faltar nenhum', () => {
    // Um estado sem rotulo apareceria em branco no ecra do cliente.
    for (const estado of TODOS_OS_ESTADOS) {
      expect(ROTULO_PAINEL[estado]).toBeTruthy();
      expect(ROTULO_CLIENTE[estado]).toBeTruthy();
      expect(EXPLICACAO_CLIENTE[estado]).toBeTruthy();
    }
  });

  it('fala ao cliente do pedido dele, nao do estado interno da casa', () => {
    expect(ROTULO_CLIENTE.novo).not.toBe(ROTULO_PAINEL.novo);
    expect(ROTULO_CLIENTE.novo.toLowerCase()).toContain('pedido');
  });
});

describe('hAQuantoTempo', () => {
  const agora = new Date('2026-09-09T12:00:00Z');
  const menos = (minutos: number) => new Date(agora.getTime() - minutos * 60000);

  it('conta minutos e horas em portugues', () => {
    expect(hAQuantoTempo(menos(0), agora)).toBe('agora mesmo');
    expect(hAQuantoTempo(menos(1), agora)).toBe('há 1 minuto');
    expect(hAQuantoTempo(menos(7), agora)).toBe('há 7 minutos');
    expect(hAQuantoTempo(menos(60), agora)).toBe('há 1 hora');
    expect(hAQuantoTempo(menos(185), agora)).toBe('há 3 horas');
  });

  it('aceita a data em texto, como vem da base de dados', () => {
    expect(hAQuantoTempo(menos(5).toISOString(), agora)).toBe('há 5 minutos');
  });

  it('nao diz disparates para uma data no futuro', () => {
    // Relogios dessincronizados acontecem; "há -2 minutos" nao pode sair.
    const futuro = new Date(agora.getTime() + 2 * 60000);
    expect(hAQuantoTempo(futuro, agora)).toBe('agora mesmo');
  });
});

describe('cobertura dos tipos', () => {
  it('a lista de estados bate certo com o tipo', () => {
    const doTipo: EstadoPedido[] = [
      'novo',
      'preparar',
      'pronto',
      'caminho',
      'entregue',
      'cancelado',
    ];
    expect([...TODOS_OS_ESTADOS].sort()).toEqual([...doTipo].sort());
  });
});
