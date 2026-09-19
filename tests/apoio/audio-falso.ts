/**
 * Um AudioContext que não toca nada: regista.
 *
 * Guarda cada oscilador, cada ganho e cada rampa que o código agenda, e
 * depois sabe sintetizar isso tal como o Web Audio o faria. Serve para os
 * testes medirem o som que o código produz — e não um modelo dele escrito
 * à parte, que pode concordar consigo próprio e discordar do código.
 */

type Evento =
  | { tipo: 'set'; v: number; t: number }
  | { tipo: 'exp'; v: number; t: number }
  | { tipo: 'lin'; v: number; t: number }
  | { tipo: 'alvo'; v: number; t: number; tau: number };

export class ParametroFalso {
  eventos: Evento[] = [];
  constructor(public value: number) {}

  setValueAtTime(v: number, t: number) {
    this.eventos.push({ tipo: 'set', v, t });
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.eventos.push({ tipo: 'exp', v, t });
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.eventos.push({ tipo: 'lin', v, t });
    return this;
  }
  setTargetAtTime(v: number, t: number, tau: number) {
    this.eventos.push({ tipo: 'alvo', v, t, tau });
    return this;
  }
  cancelScheduledValues(t: number) {
    this.eventos = this.eventos.filter((e) => e.t < t);
    return this;
  }

  private cache: { fonte: Evento[]; n: number; ordenados: Evento[] } | null = null;

  /** Ordenados uma vez só: a síntese pergunta isto a cada amostra. */
  private ordenados() {
    const c = this.cache;
    if (c && c.fonte === this.eventos && c.n === this.eventos.length) return c.ordenados;
    const ordenados = [...this.eventos].sort((a, b) => a.t - b.t);
    this.cache = { fonte: this.eventos, n: this.eventos.length, ordenados };
    return ordenados;
  }

  /** O valor no instante t, pelas regras do Web Audio para estes eventos. */
  em(t: number): number {
    const ordenados = this.ordenados();
    let v = this.value;
    let tAnt = -Infinity;
    let alvo: { x: number; t0: number; tau: number; v0: number } | null = null;
    const curva = (tt: number) =>
      alvo ? alvo.x + (alvo.v0 - alvo.x) * Math.exp(-(tt - alvo.t0) / alvo.tau) : v;

    for (const e of ordenados) {
      if (e.tipo === 'set') {
        if (t < e.t) return curva(t);
        v = e.v;
        tAnt = e.t;
        alvo = null;
      } else if (e.tipo === 'exp' || e.tipo === 'lin') {
        // Uma rampa parte do evento anterior; depois de um alvo, parte do
        // ponto onde a curva do alvo ia nesse instante.
        const v0 = alvo ? curva(tAnt) : v;
        if (t < e.t) {
          const f = (t - tAnt) / (e.t - tAnt);
          return e.tipo === 'exp' ? v0 * Math.pow(e.v / v0, f) : v0 + (e.v - v0) * f;
        }
        v = e.v;
        tAnt = e.t;
        alvo = null;
      } else {
        if (t < e.t) return curva(t);
        alvo = { x: e.v, t0: e.t, tau: e.tau, v0: curva(e.t) };
        tAnt = e.t;
      }
    }
    return curva(t);
  }
}

export class GanhoFalso {
  gain = new ParametroFalso(1);
  destino: GanhoFalso | 'saida' | null = null;
  connect(d: GanhoFalso | { saida: true }) {
    this.destino = d instanceof GanhoFalso ? d : 'saida';
    return d;
  }
  disconnect() {}
}

export class OsciladorFalso {
  type = 'sine';
  frequency = new ParametroFalso(440);
  inicio = Infinity;
  fim = Infinity;
  destino: GanhoFalso | null = null;
  onended: (() => void) | null = null;
  connect(d: GanhoFalso) {
    this.destino = d;
    return d;
  }
  start(t: number) {
    this.inicio = t;
  }
  stop(t: number) {
    this.fim = t;
  }
}

export class ContextoFalso {
  static ultimo: ContextoFalso | null = null;

  currentTime = 0;
  state = 'running';
  destination = { saida: true as const };
  osciladores: OsciladorFalso[] = [];

  constructor() {
    ContextoFalso.ultimo = this;
  }
  async resume() {}
  createOscillator() {
    const o = new OsciladorFalso();
    this.osciladores.push(o);
    return o;
  }
  createGain() {
    return new GanhoFalso();
  }
}

/* ------------------------------------------------------------------ */
/* Síntese e medição                                                   */
/* ------------------------------------------------------------------ */

export const TAXA = 48_000;

/** Soma tudo o que os osciladores agendaram, ganho a ganho até à saída. */
export function sintetizar(osciladores: OsciladorFalso[], duracao: number) {
  const buf = new Float64Array(Math.ceil(duracao * TAXA));

  for (const o of osciladores) {
    const f = o.frequency.value;
    const i0 = Math.max(0, Math.ceil(o.inicio * TAXA));
    const i1 = Math.min(buf.length, Math.floor(o.fim * TAXA));

    // A cadeia de ganhos entre o oscilador e a saída.
    const cadeia: ParametroFalso[] = [];
    for (let g = o.destino; g; g = g.destino instanceof GanhoFalso ? g.destino : null) {
      cadeia.push(g.gain);
    }

    for (let i = i0; i < i1; i++) {
      const t = i / TAXA;
      let g = 1;
      for (const p of cadeia) g *= p.em(t);
      buf[i] += g * Math.sin(2 * Math.PI * f * (t - o.inicio));
    }
  }

  return buf;
}

/* A ponderação K da norma ITU-R BS.1770, com os coeficientes oficiais para 48 kHz. */
function biquad(x: Float64Array, b: number[], a: number[]) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let n = 0; n < x.length; n++) {
    const v = b[0] * x[n] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[n]; y2 = y1; y1 = v; y[n] = v;
  }
  return y;
}

function ponderarK(x: Float64Array) {
  const e1 = biquad(
    x,
    [1.53512485958697, -2.69169618940638, 1.19839281085285],
    [1, -1.69065929318241, 0.73248077421585],
  );
  return biquad(e1, [1, -2, 1], [1, -1.99004745483398, 0.99007225036621]);
}

const lufs = (media: number) => -0.691 + 10 * Math.log10(media);

/**
 * O que interessa ouvir num alarme.
 *
 * - pico: tem de ficar abaixo de 1, senão a onda satura;
 * - cadaToque: a sonoridade da janela de 400 ms mais alta (a "momentânea" da norma);
 * - noTempo: a sonoridade média ao longo de um ciclo, já em regime.
 */
export function medir(buf: Float64Array, ciclo: number) {
  let pico = 0;
  for (const v of buf) pico = Math.max(pico, Math.abs(v));

  const k = ponderarK(buf);

  const janela = Math.round(0.4 * TAXA);
  const passo = Math.round(0.1 * TAXA);
  let cadaToque = -Infinity;
  for (let i = 0; i + janela <= k.length; i += passo) {
    let s = 0;
    for (let n = i; n < i + janela; n++) s += k[n] * k[n];
    cadaToque = Math.max(cadaToque, lufs(s / janela));
  }

  const a = Math.round(2 * ciclo * TAXA);
  const b = Math.min(k.length, Math.round(3 * ciclo * TAXA));
  let s = 0;
  for (let n = a; n < b; n++) s += k[n] * k[n];

  return { pico, cadaToque, noTempo: lufs(s / (b - a)) };
}
