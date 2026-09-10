/**
 * A paleta dos gráficos e dos estados.
 *
 * Vive fora dos componentes de propósito. Estava dentro de `graficos.tsx`,
 * que é um ficheiro `'use client'`, e a página do administrador — que
 * corre no servidor — importava a constante de lá. O Next não deixa: uma
 * exportação que não seja componente, atravessando essa fronteira, chega
 * ao servidor como uma referência vazia. O código compilava, passava nos
 * tipos, e as quatro barras de estado saíam todas douradas.
 *
 * Um módulo sem `'use client'` é lido dos dois lados pelo que é.
 *
 * OS VALORES FORAM VALIDADOS, NÃO ESCOLHIDOS A OLHO. Passaram pelo
 * validador contra o fundo escuro: banda de luminosidade, chroma mínimo,
 * separação para daltonismo e contraste. O dourado da marca falhava duas
 * dessas, e com o vermelho e o verde adjacentes o par caía a 6.5 de
 * separação — meteu-se o azul entre eles e passou a 8.4.
 *
 * Ficam de fora dispersões com estas quatro cores: em todos os pares (e
 * não só nos vizinhos) o vermelho e o dourado não se distinguem o
 * suficiente.
 */

/** Cores de estado. Nunca sozinhas: vão sempre com rótulo ao lado. */
export const COR_ESTADO = {
  bom: '#0ca30c',
  aviso: '#fab219',
  serio: '#ec835a',
  critico: '#d03b3b',
} as const;

export type TomDeEstado = keyof typeof COR_ESTADO;

/** O dourado das séries. É o da marca, escurecido até passar no fundo. */
export const COR_SERIE = '#c98500';
