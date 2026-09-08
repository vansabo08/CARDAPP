/**
 * A decisão de qual categoria está a ser lida.
 *
 * Vive fora do componente de propósito: é a peça que estava errada em
 * produção — a barra mostrava "Grelhados" enquanto se lia "Pratos
 * Principais" — e dentro de um efeito de scroll não há maneira honesta
 * de lhe passar testes.
 */

export type TopoDeSeccao = {
  id: string;
  /** Distância do topo da secção ao topo do ecrã, como no getBoundingClientRect. */
  topo: number;
};

/**
 * A categoria activa é a última cujo topo já passou por baixo da barra
 * fixa. Antes de a primeira lá chegar, vale a primeira; no fim da
 * página vale sempre a última, porque as secções curtas do fundo nunca
 * chegam a alcançar o limite.
 */
export function categoriaActiva(
  seccoes: TopoDeSeccao[],
  limite: number,
  noFimDaPagina = false,
): string {
  if (!seccoes.length) return '';
  if (noFimDaPagina) return seccoes[seccoes.length - 1].id;

  let escolhida = seccoes[0].id;
  for (const seccao of seccoes) {
    if (seccao.topo - limite <= 0) escolhida = seccao.id;
  }
  return escolhida;
}
