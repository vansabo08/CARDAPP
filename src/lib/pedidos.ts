import type { EstadoPedido } from './tipos';

/**
 * A vida de um pedido, do momento em que cai até à mesa.
 *
 * Fica isolado aqui, sem React e sem Supabase, porque é a regra que o
 * painel e o ecrã do cliente têm de contar da mesma maneira. Se a
 * cozinha diz "pronto" e o cliente lê outra coisa, perde-se a confiança
 * que a funcionalidade inteira existe para ganhar.
 */

export const ESTADOS: EstadoPedido[] = [
  'novo',
  'preparar',
  'pronto',
  'caminho',
  'entregue',
];

/** O que o dono lê no painel. */
export const ROTULO_PAINEL: Record<EstadoPedido, string> = {
  novo: 'Novo',
  preparar: 'A preparar',
  pronto: 'Pronto',
  caminho: 'A caminho',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

/**
 * O que o cliente lê. Fala do pedido dele, não do estado interno da
 * casa: "Recebemos o seu pedido" diz mais do que "Novo".
 */
export const ROTULO_CLIENTE: Record<EstadoPedido, string> = {
  novo: 'Recebemos o seu pedido',
  preparar: 'A cozinha está a preparar',
  pronto: 'Pronto',
  caminho: 'A caminho da mesa',
  entregue: 'Entregue',
  cancelado: 'Pedido cancelado',
};

/**
 * Uma palavra por etapa, para a régua do percurso.
 *
 * Tirar a última palavra dos rótulos longos dava "pedido" e "mesa", que
 * não dizem nada fora da frase de onde saíram.
 */
export const ROTULO_CURTO: Record<EstadoPedido, string> = {
  novo: 'Recebido',
  preparar: 'A preparar',
  pronto: 'Pronto',
  caminho: 'A caminho',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const EXPLICACAO_CLIENTE: Record<EstadoPedido, string> = {
  novo: 'Já está no ecrã do restaurante. Falta alguém confirmar.',
  preparar: 'Está a ser feito agora.',
  pronto: 'Está feito e à espera de seguir.',
  caminho: 'Vai a sair para si.',
  entregue: 'Bom apetite.',
  cancelado: 'Fale com o restaurante se não estava à espera disto.',
};

/** Estados a partir dos quais já não há para onde avançar. */
export function eEstadoFinal(estado: EstadoPedido) {
  return estado === 'entregue' || estado === 'cancelado';
}

/** Os cinco do percurso, mais o cancelamento, que sai de lado. */
export const TODOS_OS_ESTADOS: EstadoPedido[] = [...ESTADOS, 'cancelado'];

export function estadoValido(valor: unknown): valor is EstadoPedido {
  return typeof valor === 'string' && (TODOS_OS_ESTADOS as string[]).includes(valor);
}

/**
 * O passo seguinte, ou null se já não houver.
 *
 * "A caminho" não se aplica a quem serve à mesa, por isso não se força:
 * o painel mostra os avanços possíveis e quem serve escolhe. Esta função
 * responde só ao "qual é o passo óbvio".
 */
export function proximoEstado(estado: EstadoPedido): EstadoPedido | null {
  if (eEstadoFinal(estado)) return null;
  const i = ESTADOS.indexOf(estado);
  if (i < 0) return null;
  return ESTADOS[i + 1] ?? null;
}

/**
 * Avanços que fazem sentido oferecer a partir do estado actual.
 *
 * Nunca deixa recuar: um pedido que voltasse de "pronto" para "novo"
 * confundiria o cliente que está a olhar para o ecrã. Corrigir um engano
 * é cancelar, que é explícito.
 */
export function avancosPossiveis(estado: EstadoPedido): EstadoPedido[] {
  if (eEstadoFinal(estado)) return [];
  const i = ESTADOS.indexOf(estado);
  if (i < 0) return [];
  return ESTADOS.slice(i + 1);
}

/**
 * Quanto do percurso já foi feito, de 0 a 1, para a barra do cliente.
 * Um pedido cancelado não tem percurso.
 */
export function progresso(estado: EstadoPedido): number {
  if (estado === 'cancelado') return 0;
  const i = ESTADOS.indexOf(estado);
  if (i < 0) return 0;
  return i / (ESTADOS.length - 1);
}

/** Há quanto tempo caiu, em texto curto para o painel. */
export function hAQuantoTempo(criado: string | Date, agora: Date = new Date()) {
  const inicio = typeof criado === 'string' ? new Date(criado) : criado;
  const minutos = Math.floor((agora.getTime() - inicio.getTime()) / 60000);

  if (minutos < 1) return 'agora mesmo';
  if (minutos === 1) return 'há 1 minuto';
  if (minutos < 60) return `há ${minutos} minutos`;

  const horas = Math.floor(minutos / 60);
  if (horas === 1) return 'há 1 hora';
  return `há ${horas} horas`;
}
