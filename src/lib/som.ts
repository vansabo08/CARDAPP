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
 * A casa já disse que quer o som.
 *
 * Guarda-se no aparelho, e não na conta, porque a decisão é do aparelho:
 * o telemóvel do balcão toca, o portátil do escritório não tem de tocar.
 */
const CHAVE = 'cardapp:som';

export function lembrarSom(ligado: boolean) {
  try {
    if (ligado) localStorage.setItem(CHAVE, '1');
    else localStorage.removeItem(CHAVE);
  } catch {
    /* janela privada, ou armazenamento bloqueado: não é motivo para falhar */
  }
}

export function somLembrado() {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

/**
 * Liga o som ao primeiro toque em qualquer sítio da página.
 *
 * Os browsers exigem um gesto antes de deixar tocar seja o que for, e
 * não há forma de contornar isso — nem devia haver. O que se pode fazer
 * é não obrigar a casa a procurar um botão: o primeiro clique que der
 * no painel, seja onde for, serve de gesto. Depois disso o aparelho
 * toca sozinho a cada pedido.
 *
 * Devolve a função que desfaz a escuta.
 */
export function ligarSomAoPrimeiroGesto(aoLigar: (ligado: boolean) => void) {
  if (typeof window === 'undefined') return () => {};

  let feito = false;

  async function tentar() {
    if (feito) return;
    const pronto = await desbloquearSom();
    if (!pronto) return;
    feito = true;
    aoLigar(true);
    remover();
  }

  function remover() {
    window.removeEventListener('pointerdown', tentar);
    window.removeEventListener('keydown', tentar);
    window.removeEventListener('touchstart', tentar);
  }

  // Uma tentativa imediata: se o contexto já estiver desbloqueado nesta
  // aba, nem é preciso esperar por gesto nenhum.
  void tentar();

  window.addEventListener('pointerdown', tentar);
  window.addEventListener('keydown', tentar);
  window.addEventListener('touchstart', tentar);

  return remover;
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
