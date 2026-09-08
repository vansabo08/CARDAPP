/**
 * Geometria do símbolo do Cardapp: faca e garfo cruzados.
 *
 * Vive aqui sozinha porque é usada em dois sítios que não se falam — o
 * componente React e o gerador de ícones em PNG. Se estivesse escrita
 * duas vezes, um dia divergiam e ninguém dava por isso.
 *
 * Desenhada numa tela de 100×100, as duas peças apontadas para cima e
 * rodadas depois: é o que garante que a faca e o garfo têm a mesma
 * espessura de cabo.
 */

export const ANGULO_FACA = -40;
export const ANGULO_GARFO = 40;

/**
 * Lâmina: ponta em cima, estreita e comprida. Uma lâmina larga demais
 * deixa de se ler como faca e passa a colher — foi o primeiro erro.
 */
export const FACA_LAMINA =
  'M50 8c4.2 5.2 6.6 12.8 6.6 21.8 0 7.6-1.8 12.9-4.2 15.4v3.4h-4.8v-3.4c-2.4-2.5-4.2-7.8-4.2-15.4C43.4 20.8 45.8 13.2 50 8z';

/** Cabo, comum às duas peças. */
export const CABO = { x: 47.2, y: 46, largura: 5.6, altura: 42, raio: 2.8 };

/** Três dentes do garfo. */
export const GARFO_DENTES = [
  { x: 41.6, y: 11, largura: 4, altura: 22, raio: 2 },
  { x: 48, y: 11, largura: 4, altura: 22, raio: 2 },
  { x: 54.4, y: 11, largura: 4, altura: 22, raio: 2 },
];

/** Cabeça que junta os dentes ao cabo. */
export const GARFO_CABECA =
  'M40.4 31h19.2v4.6c0 6.2-2.6 10.2-6.3 11.8v3h-6.6v-3c-3.7-1.6-6.3-5.6-6.3-11.8V31z';

/**
 * O mesmo símbolo em SVG puro, para quem não pode renderizar React —
 * o gerador de ícones.
 */
export function simboloSvgInterior(cor: string) {
  const cabo = `<rect x="${CABO.x}" y="${CABO.y}" width="${CABO.largura}" height="${CABO.altura}" rx="${CABO.raio}"/>`;
  const dentes = GARFO_DENTES.map(
    (d) => `<rect x="${d.x}" y="${d.y}" width="${d.largura}" height="${d.altura}" rx="${d.raio}"/>`,
  ).join('');

  return `<g fill="${cor}">
    <g transform="rotate(${ANGULO_FACA} 50 50)"><path d="${FACA_LAMINA}"/>${cabo}</g>
    <g transform="rotate(${ANGULO_GARFO} 50 50)">${dentes}<path d="${GARFO_CABECA}"/>${cabo}</g>
  </g>`;
}
