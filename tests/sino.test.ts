import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextoFalso, medir, sintetizar, type OsciladorFalso } from './apoio/audio-falso';
import { INSISTENCIA } from '../src/lib/decisao-do-sino';

/**
 * O sino dos pedidos: mais alto do que era, sem nunca saturar.
 *
 * Este som já mudou quatro vezes, e cada mudança foi para o tornar mais
 * audível sem o tornar insuportável. Estes testes guardam as duas pontas
 * disso com números:
 *
 * - nunca passa de 1.0, que é onde a onda satura e o sino vira sirene;
 * - nunca fica abaixo do que já foi conseguido, medido em LUFS (ITU-R
 *   BS.1770) contra as duas notas que tocavam antes.
 *
 * O som medido é o que o código agenda — os osciladores, os ganhos e as
 * rampas que o \`tocarSino\` pede ao AudioContext — e não um modelo dele
 * escrito à parte.
 */

let relogio = 0;
const global = globalThis as unknown as { window?: unknown };

beforeEach(() => {
  vi.resetModules();
  global.window = { AudioContext: ContextoFalso };
  ContextoFalso.ultimo = null;
  relogio = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => relogio);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.window;
});

const carregar = () => import('../src/lib/som');

/** Toca como o painel toca: de INSISTENCIA em INSISTENCIA. */
async function tocarAlarme(vezes: number) {
  const som = await carregar();
  for (let i = 0; i < vezes; i++) {
    relogio = i * INSISTENCIA;
    if (ContextoFalso.ultimo) ContextoFalso.ultimo.currentTime = relogio / 1000;
    await som.tocarSino();
  }
  return ContextoFalso.ultimo!;
}

/**
 * O som de antes, tal como o código de antes o agendava (a53ff7e): lá e
 * mi em senos, a 0.95 e 0.85, de 4 em 4 segundos.
 */
function sinoAntigo(vezes: number) {
  const ctx = new ContextoFalso();
  const nota = (f: number, comeco: number, duracao: number, volume: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, comeco);
    g.gain.exponentialRampToValueAtTime(volume, comeco + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, comeco + duracao);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(comeco);
    o.stop(comeco + duracao + 0.05);
  };
  for (let i = 0; i < vezes; i++) {
    nota(880, i * 4, 0.5, 0.95);
    nota(1318.5, i * 4 + 0.13, 0.62, 0.85);
  }
  return ctx;
}

const ANTIGO = medir(sintetizar(sinoAntigo(4).osciladores, 17), 4);

let novo: ReturnType<typeof medir> | null = null;
async function medirNovo() {
  if (!novo) {
    const ctx = await tocarAlarme(4);
    novo = medir(sintetizar(ctx.osciladores, 13), INSISTENCIA / 1000);
  }
  return novo;
}

/* ------------------------------------------------------------------ */

describe('o som do sino', () => {
  it('cada toque são duas pancadas, cada uma com as cinco parciais do sino', async () => {
    const ctx = await tocarAlarme(1);
    expect(ctx.osciladores).toHaveLength(10);

    // As duas pancadas: dois grupos de arranque, 220 ms um do outro.
    const arranques = ctx.osciladores.map((o) => Math.round(o.inicio * 100) / 100);
    const grupos = [...new Set(arranques)].sort();
    expect(grupos).toHaveLength(2);
    expect(grupos[1] - grupos[0]).toBeCloseTo(0.22, 2);
  });

  it('o fundamental é o lá de 1760 Hz, e o hum é o lá antigo, de 880', async () => {
    const ctx = await tocarAlarme(1);
    const frequencias = ctx.osciladores.map((o) => o.frequency.value);
    expect(frequencias).toContain(1760);
    expect(frequencias).toContain(880);
  });

  it('toca de 2 em 2 segundos', () => {
    expect(INSISTENCIA).toBe(2000);
  });
});

describe('quanto se ouve', () => {
  it('nunca satura, nem com as caudas dos toques anteriores a soar', async () => {
    const { pico } = await medirNovo();
    expect(pico).toBeLessThan(0.96);
    // E também não ficou baixo por engano: está no tecto.
    expect(pico).toBeGreaterThan(0.9);
  });

  it('cada toque soa pelo menos 6,5 LU acima das duas notas antigas', async () => {
    const { cadaToque } = await medirNovo();
    expect(cadaToque - ANTIGO.cadaToque).toBeGreaterThanOrEqual(6.5);
  });

  it('o alarme, ao longo do tempo, soa pelo menos 12 LU acima do antigo', async () => {
    // Dez LU é, aproximadamente, o dobro da sonoridade percebida.
    const { noTempo } = await medirNovo();
    expect(noTempo - ANTIGO.noTempo).toBeGreaterThanOrEqual(12);
  });
});

describe('toques sobrepostos', () => {
  it('dois toques a menos de 1,5 s não se somam', async () => {
    // Somados, dois picos de 0.95 davam 1.9: a onda saturava.
    const som = await carregar();
    relogio = 0;
    await som.tocarSino();
    relogio = 500;
    await som.tocarSino();
    expect(ContextoFalso.ultimo!.osciladores).toHaveLength(10);
  });

  it('passado 1,5 s, toca outra vez', async () => {
    const som = await carregar();
    relogio = 0;
    await som.tocarSino();
    relogio = 1500;
    await som.tocarSino();
    expect(ContextoFalso.ultimo!.osciladores).toHaveLength(20);
  });
});

describe('calar o sino a meio', () => {
  async function tocarECalar() {
    const som = await carregar();
    await som.tocarSino();
    const ctx = ContextoFalso.ultimo!;
    ctx.currentTime = 0.3;
    relogio = 300;
    som.calarSino();
    return { som, ctx };
  }

  it('pára todos os osciladores em 60 ms', async () => {
    const { ctx } = await tocarECalar();
    for (const o of ctx.osciladores) expect(o.fim).toBeLessThanOrEqual(0.36 + 1e-9);
  });

  it('a partir daí não se ouve nada', async () => {
    // A queixa foi esta: carregar em "Recebido" e o som continuar.
    const { ctx } = await tocarECalar();
    const buf = sintetizar(ctx.osciladores, 2);
    let depois = 0;
    for (let i = Math.ceil(0.36 * 48_000); i < buf.length; i++) depois = Math.max(depois, Math.abs(buf[i]));
    expect(depois).toBe(0);
  });

  it('desce em rampa, e não de uma vez — um corte seco estala', async () => {
    const { ctx } = await tocarECalar();
    const o = ctx.osciladores[1] as OsciladorFalso;
    const saida = (o.destino!.destino as { gain: { em: (t: number) => number } }).gain;
    expect(saida.em(0.3)).toBeCloseTo(1, 5);
    expect(saida.em(0.325)).toBeCloseTo(0.5, 2);
    expect(saida.em(0.35)).toBe(0);
  });

  it('um pedido novo logo a seguir toca já, sem esperar pela trava', async () => {
    const { som, ctx } = await tocarECalar();
    relogio = 400;
    ctx.currentTime = 0.4;
    await som.tocarSino();
    expect(ctx.osciladores).toHaveLength(20);
  });
});
