import type { CategoriaComPratos, MenuHorario } from './tipos';

/**
 * Os cardápios por horário, sempre na hora de Luanda.
 *
 * O telemóvel do cliente pode estar noutro fuso (um turista, um telefone
 * mal acertado), e o servidor da Vercel corre em UTC. Nenhum dos dois é
 * a hora do restaurante. Angola não muda a hora, por isso Luanda é
 * sempre UTC+1 — e é essa a única hora que conta aqui.
 */

const UMA_HORA = 3_600_000;
const NOMES_DOS_DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** O dia da semana (0 = domingo) e o minuto do dia, em Luanda. */
export function agoraEmLuanda(agora: number = Date.now()) {
  const local = new Date(agora + UMA_HORA);
  return { dia: local.getUTCDay(), minutos: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

/** "12:00" ou "12:00:00" → 720. */
export function minutosDoDia(hora: string) {
  const [h, m] = hora.split(':').map((n) => Number.parseInt(n, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * O menu está a servir agora?
 *
 * Um menu que atravessa a meia-noite (20:00–02:00) pertence ao dia em que
 * começa: à 01:00 de sábado conta o "sexta" do menu, porque é a noite de
 * sexta que ainda não acabou.
 */
export function menuActivo(menu: Pick<MenuHorario, 'hora_inicio' | 'hora_fim' | 'dias'>, agora: number = Date.now()) {
  const { dia, minutos } = agoraEmLuanda(agora);
  const inicio = minutosDoDia(menu.hora_inicio);
  const fim = minutosDoDia(menu.hora_fim);

  if (inicio < fim) return menu.dias.includes(dia) && minutos >= inicio && minutos < fim;

  // Atravessa a meia-noite.
  if (minutos >= inicio) return menu.dias.includes(dia);
  if (minutos < fim) return menu.dias.includes((dia + 6) % 7);
  return false;
}

/**
 * As categorias que o cliente vê agora.
 *
 * Uma categoria sem horário aparece sempre — as bebidas não fecham ao
 * fim do almoço. Uma com horário só aparece dentro dele. Um horário que
 * já não existe conta como "sem horário": mais vale mostrar do que
 * esconder um prato por causa de um horário apagado.
 */
export function categoriasDeAgora(
  categorias: CategoriaComPratos[],
  menus: MenuHorario[],
  agora: number = Date.now(),
) {
  const porId = new Map(menus.map((m) => [m.id, m]));
  return categorias.filter((c) => {
    const menu = c.menu_id ? porId.get(c.menu_id) : undefined;
    return !menu || menuActivo(menu, agora);
  });
}

/** Os menus a servir agora, pela ordem do dono. */
export function menusDeAgora(menus: MenuHorario[], agora: number = Date.now()) {
  return [...menus].sort((a, b) => a.ordem - b.ordem).filter((m) => menuActivo(m, agora));
}

/** "12:00" a partir de "12:00:00". */
export function horaCurta(hora: string) {
  return hora.slice(0, 5);
}

/** "seg a sex", "todos os dias", "sáb, dom". */
export function descreverDias(dias: number[]) {
  const ordenados = [...new Set(dias)].sort((a, b) => a - b);
  if (ordenados.length === 7) return 'todos os dias';
  const seguidos = ordenados.every((d, i) => i === 0 || d === ordenados[i - 1] + 1);
  if (seguidos && ordenados.length >= 3) {
    return `${NOMES_DOS_DIAS[ordenados[0]]} a ${NOMES_DOS_DIAS[ordenados[ordenados.length - 1]]}`;
  }
  return ordenados.map((d) => NOMES_DOS_DIAS[d]).join(', ');
}

/** "Almoço · 12:00–15:00 · seg a sex". */
export function descreverMenu(menu: MenuHorario) {
  return `${menu.nome} · ${horaCurta(menu.hora_inicio)}–${horaCurta(menu.hora_fim)} · ${descreverDias(menu.dias)}`;
}

/**
 * De uma data guardada para o campo "data e hora" do painel, em Luanda.
 *
 * O campo `datetime-local` não tem fuso: mostra o que lá se puser. Se se
 * pusesse a data em UTC, o dono via a promoção a acabar às 23:00 quando a
 * marcou para a meia-noite.
 */
export function paraCampoLuanda(iso: string | null | undefined) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  return new Date(t + UMA_HORA).toISOString().slice(0, 16);
}

/** O contrário: o que o dono escreveu no campo, lido como hora de Luanda. */
export function deCampoLuanda(valor: string) {
  if (!valor) return null;
  const t = Date.parse(`${valor}:00+01:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}
