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

/**
 * Uma nota, com envelope próprio para não estalar no início nem no fim.
 *
 * A onda é quadrada e não sinusoidal. Uma sinusóide é uma frequência
 * pura e some no ruído de uma cozinha — tachos, extractor, gente a
 * falar. A quadrada traz os harmónicos ímpares todos, e são eles que
 * atravessam. É mais feia de ouvir e é essa a intenção: isto não é
 * música, é um alarme.
 */
function nota(ctx: Contexto, frequencia: number, comeco: number, duracao: number, volume: number) {
  const oscilador = ctx.createOscillator();
  const ganho = ctx.createGain();

  oscilador.type = 'square';
  oscilador.frequency.setValueAtTime(frequencia, comeco);

  // Rampas em vez de saltos: um salto de ganho ouve-se como um "click".
  ganho.gain.setValueAtTime(0.0001, comeco);
  ganho.gain.exponentialRampToValueAtTime(volume, comeco + 0.008);
  ganho.gain.setValueAtTime(volume, comeco + duracao * 0.7);
  ganho.gain.exponentialRampToValueAtTime(0.0001, comeco + duracao);

  oscilador.connect(ganho);
  ganho.connect(ctx.destination);

  oscilador.start(comeco);
  oscilador.stop(comeco + duracao + 0.05);
}

/**
 * Toca o sino, acordando o contexto se for preciso.
 *
 * A primeira versão desistia em silêncio quando o contexto não estava a
 * correr — e é precisamente o que acontece na vida real: o browser
 * suspende o AudioContext quando o separador passa para segundo plano, e
 * um painel de cozinha vive em segundo plano. O pedido caía, o contexto
 * estava suspenso, e o sino não tocava.
 *
 * Uma vez desbloqueado por um gesto, o contexto pode voltar a correr sem
 * novo gesto. Por isso pede-se `resume()` antes de tocar, sempre.
 */
export async function tocarSino() {
  const ctx = obterContexto();
  if (!ctx) return false;

  if (ctx.state !== 'running') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }

  if (ctx.state !== 'running') return false;

  /*
   * Uma sirene, não uma campainha.
   *
   * Passou por duas notas suaves (inaudíveis numa cozinha) e depois por
   * quatro apitos secos (melhor, mas ainda se confundia com um telemóvel
   * qualquer). Isto é um varrimento de frequência: sobe de 1.1 kHz a
   * 2.4 kHz e volta, três vezes seguidas.
   *
   * O varrimento é o que faz a diferença. O ouvido habitua-se depressa a
   * um tom fixo e deixa de o notar — é por isso que os alarmes a sério,
   * dos bombeiros às ambulâncias, variam sempre. Um som que muda não se
   * deixa ignorar.
   *
   * Um oscilador de cada vez, com espaço entre eles: assim pode ir a
   * 0.55 de ganho sem saturar. Somar vozes ao mesmo tempo obrigava a
   * baixar cada uma, e um som distorcido ouve-se pior do que um som
   * limpo alto.
   */
  const agora = ctx.currentTime;
  const CICLO = 0.36;

  for (let i = 0; i < 3; i++) {
    sirene(ctx, agora + i * CICLO, CICLO * 0.82, 0.55);
  }

  return true;
}

/**
 * Meio ciclo de sirene: sobe e volta a descer.
 *
 * A frequência é desenhada com rampas em vez de saltos — um salto de
 * frequência ouve-se como um estalo, e o que se quer é o deslize.
 */
function sirene(ctx: Contexto, comeco: number, duracao: number, volume: number) {
  const oscilador = ctx.createOscillator();
  const ganho = ctx.createGain();

  oscilador.type = 'square';
  oscilador.frequency.setValueAtTime(1100, comeco);
  oscilador.frequency.linearRampToValueAtTime(2400, comeco + duracao * 0.5);
  oscilador.frequency.linearRampToValueAtTime(1100, comeco + duracao);

  ganho.gain.setValueAtTime(0.0001, comeco);
  ganho.gain.exponentialRampToValueAtTime(volume, comeco + 0.01);
  ganho.gain.setValueAtTime(volume, comeco + duracao - 0.03);
  ganho.gain.exponentialRampToValueAtTime(0.0001, comeco + duracao);

  oscilador.connect(ganho);
  ganho.connect(ctx.destination);

  oscilador.start(comeco);
  oscilador.stop(comeco + duracao + 0.02);
}

/* ------------------------------------------------------------------ */
/* Aviso do sistema                                                    */
/* ------------------------------------------------------------------ */

/**
 * O som resolve o separador em segundo plano. Não resolve o painel
 * fechado, nem o telemóvel bloqueado — aí o browser congela a página e
 * não há áudio nenhum a sair dela.
 *
 * Um aviso do sistema aparece mesmo com o separador atrás de outro, e é
 * o que se pode fazer sem servidor de notificações. Pede-se a permissão
 * ao mesmo tempo que o som, no mesmo gesto, para não haver duas
 * perguntas.
 */
export async function pedirAvisos() {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export function avisarDoPedido(mesa: number | null, total: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;

  try {
    new Notification('Pedido novo no Cardapp', {
      body: mesa != null ? `Mesa ${mesa} — ${total}` : `Sem mesa — ${total}`,
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      // Um pedido substitui o aviso do anterior em vez de empilhar dez.
      tag: 'cardapp-pedido',
      renotify: true,
    } as NotificationOptions);
    return true;
  } catch {
    return false;
  }
}
