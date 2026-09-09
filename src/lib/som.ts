/**
 * O sino que toca quando cai um pedido.
 *
 * O som é gerado, não é um ficheiro. Um mp3 seriam mais uns quilobytes a
 * descarregar, uma licença a confirmar e uma coisa a falhar quando a
 * rede da casa estiver má — e o que é preciso são duas notas.
 *
 * São duas notas em quinta (lá e mi), com um ataque rápido e uma cauda
 * curta: ouve-se numa sala com gente e não irrita quem passa o turno ao
 * lado do balcão.
 */

type Contexto = AudioContext & { resume: () => Promise<void> };

let contexto: Contexto | null = null;

function obterContexto(): Contexto | null {
  if (typeof window === 'undefined') return null;

  const Construtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!Construtor) return null;
  if (!contexto) contexto = new Construtor() as Contexto;
  return contexto;
}

export function somSuportado() {
  return obterContexto() !== null;
}

/**
 * Os browsers só deixam tocar som depois de a pessoa tocar no ecrã.
 *
 * Isto tem de correr dentro do gesto — o clique no botão que liga o som.
 * Sem ele, o contexto fica suspenso e o primeiro pedido do dia entrava
 * em silêncio, que é precisamente o pedido que ninguém pode perder.
 */
export async function desbloquearSom() {
  const ctx = obterContexto();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

/** Uma nota, com envelope próprio para não estalar no início nem no fim. */
function nota(ctx: Contexto, frequencia: number, comeco: number, duracao: number, volume: number) {
  const oscilador = ctx.createOscillator();
  const ganho = ctx.createGain();

  oscilador.type = 'sine';
  oscilador.frequency.setValueAtTime(frequencia, comeco);

  // Rampas em vez de saltos: um salto de ganho ouve-se como um "click".
  ganho.gain.setValueAtTime(0.0001, comeco);
  ganho.gain.exponentialRampToValueAtTime(volume, comeco + 0.015);
  ganho.gain.exponentialRampToValueAtTime(0.0001, comeco + duracao);

  oscilador.connect(ganho);
  ganho.connect(ctx.destination);

  oscilador.start(comeco);
  oscilador.stop(comeco + duracao + 0.05);
}

export function tocarSino() {
  const ctx = obterContexto();
  if (!ctx || ctx.state !== 'running') return false;

  const agora = ctx.currentTime;
  nota(ctx, 880, agora, 0.34, 0.16); // lá
  nota(ctx, 1318.5, agora + 0.13, 0.42, 0.12); // mi, uma quinta acima

  return true;
}
