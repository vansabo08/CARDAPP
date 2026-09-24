import type { Pedido } from './tipos';

/**
 * As contas da dashboard: o dia, a semana, o mês e o ano.
 *
 * Funções puras — recebem pedidos e devolvem números. Têm testes, e é
 * por isso que a página é só desenho: nenhuma conta se faz no meio do
 * JSX, onde ninguém lhe pode chamar erro.
 *
 * TUDO EM HORA DE LUANDA. Angola é UTC+1 o ano inteiro, sem mudança de
 * hora, por isso a conversão é somar sessenta minutos e ler o relógio em
 * UTC. Sem isto, um pedido da meia-noite e meia contava para o dia
 * anterior — e o dono, que fechou a casa às duas da manhã, não percebia
 * porquê.
 *
 * AS JANELAS SÃO CORRIDAS, e não o "mês até hoje": comparar os últimos
 * trinta dias com os trinta anteriores é justo em qualquer dia do mês.
 * No dia 2, "este mês contra o mês passado" comparava dois dias com
 * trinta, e a queda de 90 % era só do calendário.
 */

export type Periodo = 'dia' | 'semana' | 'mes' | 'ano';

export const PERIODOS: readonly Periodo[] = ['dia', 'semana', 'mes', 'ano'];

export const NOME_PERIODO: Record<Periodo, string> = {
  dia: 'Hoje',
  semana: '7 dias',
  mes: '30 dias',
  ano: '12 meses',
};

/** O que se compara com o quê, dito por extenso. */
export const CONTRA: Record<Periodo, string> = {
  dia: 'do que ontem',
  semana: 'do que os 7 dias antes',
  mes: 'do que os 30 dias antes',
  ano: 'do que os 12 meses antes',
};

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

export type Janela = { inicio: Date; fim: Date };

/** O relógio de Luanda, lido em UTC. */
function emLuanda(data: Date) {
  return new Date(data.getTime() + HORA);
}

/** Meia-noite de Luanda, `recuo` dias atrás, devolvida em UTC. */
function meiaNoite(recuo: number, agora: Date) {
  const luanda = emLuanda(agora);
  const marca = Date.UTC(luanda.getUTCFullYear(), luanda.getUTCMonth(), luanda.getUTCDate() - recuo);
  return new Date(marca - HORA);
}

/** Quantos dias inteiros cada período conta. O ano conta por meses. */
const DIAS_DO_PERIODO: Record<Exclude<Periodo, 'ano'>, number> = { dia: 1, semana: 7, mes: 30 };

/**
 * A janela de um período e a janela igual imediatamente antes — é com
 * essa que se compara.
 */
export function janelaDoPeriodo(periodo: Periodo, agora: Date = new Date()) {
  const fim = meiaNoite(-1, agora); // meia-noite da noite que vem

  if (periodo === 'ano') {
    const luanda = emLuanda(agora);
    const inicio = new Date(Date.UTC(luanda.getUTCFullYear(), luanda.getUTCMonth() - 11, 1) - HORA);
    const inicioAntes = new Date(
      Date.UTC(luanda.getUTCFullYear(), luanda.getUTCMonth() - 23, 1) - HORA,
    );
    return { actual: { inicio, fim }, anterior: { inicio: inicioAntes, fim: inicio } };
  }

  const dias = DIAS_DO_PERIODO[periodo];
  const inicio = meiaNoite(dias - 1, agora);
  const inicioAntes = meiaNoite(dias * 2 - 1, agora);
  return { actual: { inicio, fim }, anterior: { inicio: inicioAntes, fim: inicio } };
}

export type Barra = { rotulo: string; valor: number; destaque?: boolean };

export type PratoContado = { nome: string; qtd: number; valor: number };

export type Estatisticas = {
  periodo: Periodo;
  /** Kwanzas que entraram na janela. */
  receita: number;
  pedidos: number;
  /** Pratos, bebidas e extras somados à unidade. */
  itens: number;
  /** Valor médio por pedido, ao Kwanza. */
  medio: number;
  /** Variação de cada número contra a janela anterior, em percentagem. */
  variacao: { receita: number | null; pedidos: number | null; itens: number | null; medio: number | null };
  /** A série do gráfico: horas, dias ou meses, conforme o período. */
  serie: Barra[];
  /** O que mais sai, por quantidade. */
  top: PratoContado[];
  /** Quanto rende cada hora do dia — onde está o movimento. */
  porHora: Barra[];
  /** A mesa que mais pediu, e quanto. */
  melhorMesa: { mesa: number; total: number } | null;
};

/** Os pedidos de uma janela, pela ordem em que entraram. */
export function dentroDa(janela: Janela, pedidos: Pedido[]) {
  return pedidos.filter((p) => {
    const t = new Date(p.created_at).getTime();
    return Number.isFinite(t) && t >= janela.inicio.getTime() && t < janela.fim.getTime();
  });
}

function somar(pedidos: Pedido[]) {
  const receita = pedidos.reduce((s, p) => s + (Number.isFinite(p.total) ? p.total : 0), 0);
  const itens = pedidos.reduce(
    (s, p) => s + (p.itens ?? []).reduce((si, i) => si + (i.qtd ?? 0), 0),
    0,
  );
  return { receita, itens, pedidos: pedidos.length, medio: pedidos.length ? Math.round(receita / pedidos.length) : 0 };
}

/**
 * De quanto subiu ou desceu, em percentagem.
 *
 * Sem nada antes não há variação nenhuma — devolve `null`, e o ecrã
 * escreve "sem termo de comparação" em vez de um +100 % que não quer
 * dizer nada. Subir de zero para um não é subir cem por cento.
 */
export function variacao(agora: number, antes: number): number | null {
  if (!antes) return null;
  return Math.round(((agora - antes) / antes) * 1000) / 10;
}

const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/**
 * A série do gráfico, com um degrau por hora, por dia ou por mês — e com
 * os degraus vazios lá dentro. Um dia sem pedidos é informação: o
 * gráfico tem de mostrar o buraco, não fechá-lo.
 */
function serieDe(periodo: Periodo, janela: Janela, pedidos: Pedido[], agora: Date): Barra[] {
  const caixas = new Map<string, Barra>();
  const chaveDe = (data: Date) => {
    const l = emLuanda(data);
    if (periodo === 'dia') return String(l.getUTCHours());
    if (periodo === 'ano') return `${l.getUTCFullYear()}-${l.getUTCMonth()}`;
    return `${l.getUTCFullYear()}-${l.getUTCMonth()}-${l.getUTCDate()}`;
  };

  // Primeiro os degraus todos, a zero, pela ordem do tempo.
  if (periodo === 'dia') {
    for (let h = 0; h < 24; h++) caixas.set(String(h), { rotulo: `${h}h`, valor: 0 });
  } else if (periodo === 'ano') {
    const l = emLuanda(agora);
    for (let n = 11; n >= 0; n--) {
      const d = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth() - n, 1));
      caixas.set(`${d.getUTCFullYear()}-${d.getUTCMonth()}`, {
        rotulo: MES_CURTO[d.getUTCMonth()],
        valor: 0,
      });
    }
  } else {
    const dias = DIAS_DO_PERIODO[periodo];
    for (let n = dias - 1; n >= 0; n--) {
      const d = emLuanda(new Date(agora.getTime() - n * DIA));
      const rotulo =
        periodo === 'semana'
          ? DIA_CURTO[d.getUTCDay()]
          : `${d.getUTCDate()}${d.getUTCDate() === 1 ? ` ${MES_CURTO[d.getUTCMonth()]}` : ''}`;
      caixas.set(`${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`, { rotulo, valor: 0 });
    }
  }

  for (const pedido of dentroDa(janela, pedidos)) {
    const caixa = caixas.get(chaveDe(new Date(pedido.created_at)));
    if (caixa) caixa.valor += pedido.total;
  }

  const serie = [...caixas.values()];

  /*
   * No dia, as horas em que a casa está fechada não interessam a
   * ninguém: corta-se o vazio das pontas, e fica a janela do serviço.
   * Se o dia ainda não teve nada, mostra-se do meio-dia à meia-noite.
   */
  if (periodo === 'dia') {
    const primeiro = serie.findIndex((b) => b.valor > 0);
    if (primeiro < 0) return serie.slice(10, 24);
    const ultimo = serie.length - 1 - [...serie].reverse().findIndex((b) => b.valor > 0);
    return serie.slice(Math.max(0, primeiro - 1), Math.min(serie.length, ultimo + 2));
  }

  return serie;
}

/** Quanto rendeu cada hora do dia, somando todos os dias da janela. */
function porHoraDe(pedidos: Pedido[]): Barra[] {
  const horas = Array.from({ length: 24 }, (_, h) => ({ rotulo: `${h}h`, valor: 0 }));
  for (const pedido of pedidos) {
    const data = new Date(pedido.created_at);
    if (Number.isNaN(data.getTime())) continue;
    horas[emLuanda(data).getUTCHours()].valor += pedido.total;
  }

  const melhor = horas.reduce((m, h) => (h.valor > m.valor ? h : m), horas[0]);
  const comMovimento = horas.filter((h) => h.valor > 0);
  if (!comMovimento.length) return [];

  const primeira = horas.indexOf(comMovimento[0]);
  const ultima = horas.lastIndexOf(comMovimento[comMovimento.length - 1]);
  return horas
    .slice(primeira, ultima + 1)
    .map((h) => ({ ...h, destaque: h.valor > 0 && h.valor === melhor.valor }));
}

function topDe(pedidos: Pedido[], quantos: number): PratoContado[] {
  const contagem = new Map<string, PratoContado>();
  for (const pedido of pedidos) {
    for (const item of pedido.itens ?? []) {
      const actual = contagem.get(item.nome) ?? { nome: item.nome, qtd: 0, valor: 0 };
      actual.qtd += item.qtd;
      actual.valor += item.qtd * item.preco;
      contagem.set(item.nome, actual);
    }
  }
  return [...contagem.values()]
    .sort((a, b) => b.qtd - a.qtd || b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt'))
    .slice(0, quantos);
}

function melhorMesaDe(pedidos: Pedido[]) {
  const porMesa = new Map<number, number>();
  for (const pedido of pedidos) {
    if (pedido.mesa == null) continue;
    porMesa.set(pedido.mesa, (porMesa.get(pedido.mesa) ?? 0) + pedido.total);
  }
  let melhor: { mesa: number; total: number } | null = null;
  for (const [mesa, total] of porMesa) {
    if (!melhor || total > melhor.total || (total === melhor.total && mesa < melhor.mesa)) {
      melhor = { mesa, total };
    }
  }
  return melhor;
}

/**
 * Tudo o que a dashboard mostra, de uma vez.
 *
 * Recebe os pedidos das duas janelas juntos — os da janela e os da
 * anterior — e separa-os aqui. Assim a página faz uma consulta só à base
 * de dados, e não duas.
 */
export function estatisticas(
  periodo: Periodo,
  pedidos: Pedido[],
  agora: Date = new Date(),
  quantosNoTop = 5,
): Estatisticas {
  const { actual, anterior } = janelaDoPeriodo(periodo, agora);
  const dentro = dentroDa(actual, pedidos);
  const antes = somar(dentroDa(anterior, pedidos));
  const agoraNumeros = somar(dentro);

  return {
    periodo,
    ...agoraNumeros,
    variacao: {
      receita: variacao(agoraNumeros.receita, antes.receita),
      pedidos: variacao(agoraNumeros.pedidos, antes.pedidos),
      itens: variacao(agoraNumeros.itens, antes.itens),
      medio: variacao(agoraNumeros.medio, antes.medio),
    },
    serie: serieDe(periodo, actual, pedidos, agora),
    top: topDe(dentro, quantosNoTop),
    porHora: porHoraDe(dentro),
    melhorMesa: melhorMesaDe(dentro),
  };
}

export function ePeriodo(valor: unknown): valor is Periodo {
  return typeof valor === 'string' && (PERIODOS as readonly string[]).includes(valor);
}
