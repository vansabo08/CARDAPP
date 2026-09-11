import { describe, expect, it } from 'vitest';
import { CARENCIA_DO_CLIQUE, decidirPorConfirmar } from '../src/lib/decisao-do-sino';

/**
 * "Carreguei em Recebido e o alarme continuou a tocar."
 *
 * O botão escondia-se na hora, mas o sino continuava a contar o pedido
 * como por confirmar até o Realtime lhe dizer o contrário. Se o evento se
 * perdesse, contava-o para sempre. Estes testes seguem o clique ao longo
 * do tempo e verificam, a cada momento, se o sino deve tocar.
 */

const T0 = 1_000_000;

describe('carregar em "Recebido"', () => {
  it('cala o pedido mesmo que a base ainda o dê por confirmar', () => {
    // O clique foi agora. A gravação ainda não chegou à base, que por
    // isso continua a devolver o pedido como por confirmar.
    const vistos = new Map([['p1', T0]]);
    const d = decidirPorConfirmar(['p1'], new Set(['p1']), vistos, T0 + 500);

    expect(d.porConfirmar.has('p1')).toBe(false);
    expect(d.porConfirmar.size).toBe(0);
  });

  it('continua calado durante toda a carência', () => {
    const vistos = new Map([['p1', T0]]);
    for (const passados of [0, 1_000, 4_000, 8_000, CARENCIA_DO_CLIQUE]) {
      const d = decidirPorConfirmar(['p1'], new Set(), vistos, T0 + passados);
      expect(d.porConfirmar.has('p1'), `aos ${passados} ms`).toBe(false);
    }
  });

  it('volta a tocar se, passada a carência, a base diz que ninguém confirmou', () => {
    // A gravação falhou. Calar para sempre seria pior do que o defeito
    // original: um pedido perdido sem ninguém saber.
    const vistos = new Map([['p1', T0]]);
    const d = decidirPorConfirmar(['p1'], new Set(), vistos, T0 + CARENCIA_DO_CLIQUE + 1);

    expect(d.porConfirmar.has('p1')).toBe(true);
    expect(d.vistosAgora.has('p1')).toBe(false);
  });

  it('não cala os outros pedidos que continuam à espera', () => {
    const vistos = new Map([['p1', T0]]);
    const d = decidirPorConfirmar(['p1', 'p2'], new Set(['p1', 'p2']), vistos, T0 + 500);

    expect(d.porConfirmar.has('p1')).toBe(false);
    expect(d.porConfirmar.has('p2')).toBe(true);
  });
});

describe('o que a base diz manda sobre o que o sino se lembra', () => {
  it('um pedido confirmado noutro telemóvel sai, mesmo sem evento nenhum', () => {
    // O sino tinha-o, o Realtime nunca disse nada, a base já não o traz.
    const d = decidirPorConfirmar([], new Set(['p1']), new Map(), T0);
    expect(d.porConfirmar.size).toBe(0);
  });

  it('um pedido que o Realtime perdeu entra, e conta como novo', () => {
    const d = decidirPorConfirmar(['p9'], new Set(), new Map(), T0);
    expect(d.porConfirmar.has('p9')).toBe(true);
    expect(d.apareceuNovo).toBe(true);
  });

  it('um pedido que o sino já conhecia não conta como novo', () => {
    // Senão tocava a mais a cada ida à base.
    const d = decidirPorConfirmar(['p1'], new Set(['p1']), new Map(), T0);
    expect(d.apareceuNovo).toBe(false);
  });

  it('um pedido acabado de confirmar não conta como novo quando volta', () => {
    const vistos = new Map([['p1', T0]]);
    const d = decidirPorConfirmar(['p1'], new Set(), vistos, T0 + 1_000);
    expect(d.apareceuNovo).toBe(false);
  });
});
