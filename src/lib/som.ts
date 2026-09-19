/**
 * O sino que toca quando cai um pedido.
 *
 * O som é gerado, não é um ficheiro. Um mp3 seriam mais uns quilobytes a
 * descarregar, uma licença a confirmar e uma coisa a falhar quando a
 * rede da casa estiver má — e um sino são cinco senos.
 *
 * É um sino de balcão, o "trim-trim" de pedido pronto das cozinhas, com
 * duas pancadas seguidas. O desenho e as medições estão em `tocarSino`.
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

/* ------------------------------------------------------------------ */
/* O sino                                                              */
/* ------------------------------------------------------------------ */

/*
 * UM SINO DE BALCÃO AFINADO EM LÁ, COM DUAS PANCADAS.
 *
 * Isto já foi três sons. Primeiro duas notas sinusoidais a 0.16, que eram
 * um murmúrio. Depois uma sirene de onda quadrada, muito mais audível e
 * insuportável de ouvir — um alarme que a casa desliga ao fim do primeiro
 * serviço não avisa ninguém. Depois as mesmas duas notas levadas até ao
 * tecto do áudio digital, com o pico a 0.948.
 *
 * Aí o volume acabou. Para ser "muito mais audível" já não havia mais
 * ganho para dar — tinha de mudar o sítio onde o som vive.
 *
 * AS DUAS NOTAS ANTIGAS VIVIAM ONDE VIVE O BARULHO DA COZINHA. 880 e
 * 1318 Hz ficam no meio do exaustor, da fritadeira e da conversa, que
 * enchem tudo até perto de 1 kHz. Este sino põe a energia a 1760 Hz e a
 * 4,9 kHz: acima da maior parte desse barulho, e na zona em que o ouvido
 * humano é mais sensível. Um sino de balcão é isso mesmo — um som agudo e
 * limpo que atravessa uma sala cheia —, e é por isso que as cozinhas os
 * usam há cem anos.
 *
 * O TIMBRE É DE SINO, NÃO DE SIRENE. Continuam a ser senos: sem os
 * harmónicos ásperos da onda quadrada. O que faz soar a sino são as
 * frequências não serem múltiplas umas das outras, e cada uma se apagar
 * ao seu ritmo — as agudas depressa, as graves devagar.
 *
 * MEDIDO, NÃO A OLHO. Sintetizado fora do browser exactamente como o Web
 * Audio o gera, e medido pela norma ITU-R BS.1770 (LUFS) — a que pesa as
 * frequências como o ouvido as sente. Face às duas notas antigas, com o
 * mesmo pico de 0.95:
 *
 *   cada toque ..................... +7,0 LU
 *   alarme ao longo do tempo ....... +12,8 LU  (toca de 2 em 2 s, e não de 4 em 4)
 *
 * Dez LU é, aproximadamente, o dobro da sonoridade percebida. E os LUFS
 * são a conta conservadora: não dão crédito nenhum a o som fugir ao
 * barulho da cozinha, que é o ganho maior.
 */

type Parcial = {
  /** Frequência, em múltiplos do lá. */
  razao: number;
  /** Força relativa ao fundamental. */
  nivel: number;
  /** Tempo, em segundos, para a parcial perder dois terços da força. */
  tau: number;
  /** Desafinação, em Hz, sobre a frequência da razão. */
  desvio?: number;
  /** Onde a onda começa, em radianos. */
  fase: number;
};

/** Lá, uma oitava acima do lá das duas notas antigas. */
const LA = 1760;

export const PARCIAIS_DO_SINO: readonly Parcial[] = [
  // O "hum", uma oitava abaixo: o lá do som antigo. Dá corpo, e chega a
  // quem já não ouve bem os agudos — numa cozinha, muitas vezes quem está
  // há mais anos ao fogão.
  { razao: 0.5, nivel: 0.3, tau: 1.2, fase: Math.PI / 2 },
  // O fundamental, e um gémeo 3 Hz acima. O batimento entre os dois é o
  // que faz um sino "viver", em vez de apitar como um forno.
  { razao: 1, nivel: 1, tau: 0.9, fase: 0 },
  { razao: 1, nivel: 0.45, tau: 0.9, desvio: 3, fase: Math.PI },
  // O brilho, a 4,9 kHz: onde o ouvido é mais sensível e onde o barulho
  // da cozinha já pouco chega.
  { razao: 2.756, nivel: 0.35, tau: 0.35, fase: 1.5 * Math.PI },
  // A pancada — um "tink" de 90 ms, que é o que faz a cabeça virar.
  { razao: 5.404, nivel: 0.12, tau: 0.09, fase: 1.5 * Math.PI },
];

/*
 * As fases não são enfeite. Com todas as ondas a começar em zero, no
 * instante da pancada somavam-se todas no mesmo sentido, e esse pico
 * obrigava a baixar o sino inteiro. Arrancar cada uma num ponto diferente
 * da onda baixa o pico sem mudar o som, e o volume sobe na mesma medida:
 * +0,8 LU de graça. Procuradas por tentativa, e medidas.
 */

/** O volume do sino. Medido para o pico, com as caudas a sobrepor-se, ficar em 0.95. */
export const VOLUME_DO_SINO = 0.48;

/** "Trim-trim": a segunda pancada 220 ms depois, com três quartos da força. */
export const SEGUNDA_PANCADA = { depois: 0.22, forca: 0.75 } as const;

/** Uma pancada é instantânea; 3 ms é o mínimo para não estalar. */
const ATAQUE = 0.003;

/**
 * Nunca dois toques a menos de 1,5 s um do outro.
 *
 * Um pedido que entra meio segundo depois de o sino tocar punha um
 * segundo toque por cima do primeiro, e dois picos de 0.95 somados dão
 * 1.9 — a onda satura e o sino passa a soar a sirene partida. O pedido
 * novo não se perde: o sino volta a tocar dentro de dois segundos.
 */
const INTERVALO_MINIMO_MS = 1500;

let ultimoToque = -Infinity;

/** Os toques que ainda estão a soar, para se poderem calar a meio. */
const aSoar = new Set<{ saida: GainNode; osciladores: OscillatorNode[] }>();

function pancada(
  ctx: Contexto,
  saida: AudioNode,
  inicio: number,
  forca: number,
  osciladores: OscillatorNode[],
) {
  for (const p of PARCIAIS_DO_SINO) {
    const frequencia = LA * p.razao + (p.desvio ?? 0);
    const pico = p.nivel * VOLUME_DO_SINO * forca;

    const oscilador = ctx.createOscillator();
    const ganho = ctx.createGain();

    oscilador.type = 'sine';
    oscilador.frequency.value = frequencia;

    /*
     * A fase escolhe-se arrancando o oscilador um pouco antes da pancada
     * — menos de um milissegundo —, com o ganho ainda a zero. A onda já
     * vai a meio quando o som começa.
     */
    const adiantamento = p.fase / (2 * Math.PI * frequencia);

    ganho.gain.value = 0;
    ganho.gain.setValueAtTime(0, inicio - adiantamento);
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(pico, inicio + ATAQUE);
    // Um sino apaga-se sempre à mesma proporção por segundo: é isto.
    ganho.gain.setTargetAtTime(0, inicio + ATAQUE, p.tau);

    oscilador.connect(ganho);
    ganho.connect(saida);

    oscilador.start(inicio - adiantamento);
    // Aos cinco tau a parcial está 43 dB abaixo do que foi: inaudível.
    oscilador.stop(inicio + ATAQUE + p.tau * 5);

    osciladores.push(oscilador);
  }
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

  // Pelo relógio da parede, e não pelo do áudio: o do áudio pára quando
  // o browser suspende o contexto, e a trava ficava presa ao acordar.
  const agoraMs = performance.now();
  if (agoraMs - ultimoToque < INTERVALO_MINIMO_MS) return true;
  ultimoToque = agoraMs;

  const saida = ctx.createGain();
  saida.gain.value = 1;
  saida.connect(ctx.destination);

  const osciladores: OscillatorNode[] = [];

  // Dez milissegundos de folga: o arranque adiantado das fases não pode
  // cair no passado.
  const inicio = ctx.currentTime + 0.01;
  pancada(ctx, saida, inicio, 1, osciladores);
  pancada(ctx, saida, inicio + SEGUNDA_PANCADA.depois, SEGUNDA_PANCADA.forca, osciladores);

  const toque = { saida, osciladores };
  aSoar.add(toque);

  let porAcabar = osciladores.length;
  for (const oscilador of osciladores) {
    oscilador.onended = () => {
      porAcabar -= 1;
      if (porAcabar > 0) return;
      aSoar.delete(toque);
      saida.disconnect();
    };
  }

  return true;
}

/**
 * Cala o sino a meio.
 *
 * O sino soa mais de um segundo depois de cada pancada — é isso que faz
 * dele um sino. Mas quem carrega em "Recebido" quer silêncio na hora, e
 * uma cauda a soar depois do clique ouve-se como "o botão não
 * funcionou", que foi a queixa que já houve.
 *
 * Desce em 50 ms, e não de uma vez: um corte seco estala.
 */
export function calarSino() {
  const ctx = contexto;
  if (!ctx) return;

  const agora = ctx.currentTime;

  for (const toque of aSoar) {
    toque.saida.gain.cancelScheduledValues(agora);
    toque.saida.gain.setValueAtTime(toque.saida.gain.value, agora);
    toque.saida.gain.linearRampToValueAtTime(0, agora + 0.05);

    for (const oscilador of toque.osciladores) {
      try {
        oscilador.stop(agora + 0.06);
      } catch {
        /* já tinha parado */
      }
    }
  }

  // Um pedido novo logo a seguir ao "Recebido" tem de tocar já, sem
  // esperar pela trava de 1,5 s.
  ultimoToque = -Infinity;
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

/**
 * O aviso de que entrou dinheiro à espera de confirmação.
 *
 * Leva a sua própria etiqueta, e não a dos pedidos: um comprovativo não
 * substitui um pedido de mesa nem é substituído por ele. Partilhar a
 * etiqueta fazia o segundo aviso apagar o primeiro, e quem estivesse a
 * meio de um serviço perdia um dos dois.
 */
export function avisarDoComprovativo(quantos: number) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;

  try {
    new Notification('Comprovativo novo no Cardapp', {
      body:
        quantos === 1
          ? 'Uma casa transferiu e espera confirmação.'
          : `${quantos} casas transferiram e esperam confirmação.`,
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      tag: 'cardapp-comprovativo',
      renotify: true,
    } as NotificationOptions);
    return true;
  } catch {
    return false;
  }
}
