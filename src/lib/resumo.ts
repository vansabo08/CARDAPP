import type { Pedido } from './tipos';

/**
 * Contas do dia — as mesmas para o painel e para o email da manhã.
 * Função pura: recebe pedidos, devolve números. Tem testes.
 */

export type PratoContado = {
  nome: string;
  qtd: number;
  valor: number;
};

export type ResumoDoDia = {
  pedidos: number;
  itens: number;
  total: number;
  /** Valor médio por pedido, arredondado ao Kwanza. */
  media: number;
  top: PratoContado[];
  /** Hora com mais movimento, em Luanda. Null quando não há pedidos. */
  horaDePonta: number | null;
};

export function resumoDoDia(pedidos: Pedido[], quantosNoTop = 5): ResumoDoDia {
  const total = pedidos.reduce((s, p) => s + p.total, 0);
  const itens = pedidos.reduce((s, p) => s + p.itens.reduce((si, i) => si + i.qtd, 0), 0);

  const contagem = new Map<string, PratoContado>();
  for (const pedido of pedidos) {
    for (const item of pedido.itens) {
      const actual = contagem.get(item.nome) ?? { nome: item.nome, qtd: 0, valor: 0 };
      actual.qtd += item.qtd;
      actual.valor += item.qtd * item.preco;
      contagem.set(item.nome, actual);
    }
  }

  const top = [...contagem.values()]
    .sort((a, b) => b.qtd - a.qtd || b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt'))
    .slice(0, quantosNoTop);

  return {
    pedidos: pedidos.length,
    itens,
    total,
    media: pedidos.length ? Math.round(total / pedidos.length) : 0,
    top,
    horaDePonta: calcularHoraDePonta(pedidos),
  };
}

/** Angola não muda a hora: é sempre UTC+1. */
function calcularHoraDePonta(pedidos: Pedido[]) {
  if (!pedidos.length) return null;

  const porHora = new Map<number, number>();
  for (const pedido of pedidos) {
    const data = new Date(pedido.created_at);
    if (Number.isNaN(data.getTime())) continue;
    const hora = new Date(data.getTime() + 60 * 60 * 1000).getUTCHours();
    porHora.set(hora, (porHora.get(hora) ?? 0) + 1);
  }

  if (!porHora.size) return null;

  let melhorHora = 0;
  let melhorContagem = -1;
  for (const [hora, contagem] of porHora) {
    if (contagem > melhorContagem || (contagem === melhorContagem && hora < melhorHora)) {
      melhorHora = hora;
      melhorContagem = contagem;
    }
  }
  return melhorHora;
}

/**
 * Janela de um dia inteiro de Luanda, devolvida em UTC.
 * `recuo` a 1 dá o dia de ontem, que é o que o email da manhã conta.
 */
export function janelaDoDiaEmLuanda(recuo = 0, agora: Date = new Date()) {
  const luanda = new Date(agora.getTime() + 60 * 60 * 1000);
  const meiaNoite = Date.UTC(
    luanda.getUTCFullYear(),
    luanda.getUTCMonth(),
    luanda.getUTCDate() - recuo,
  );
  const inicio = new Date(meiaNoite - 60 * 60 * 1000);
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio, fim };
}

/** "domingo, 7 de Setembro" — para o assunto do email. */
export function dataPorExtenso(data: Date) {
  const texto = new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Luanda',
  }).format(data);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
