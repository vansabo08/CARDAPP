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
 * OS VALORES FORAM MEDIDOS, NÃO ESCOLHIDOS A OLHO. Cada um passou pelo
 * validador contra o fundo escuro — banda de luminosidade, chroma mínimo,
 * separação para daltonismo, distância a olho nu e contraste — e o
 * `tests/cores-dos-graficos.test.ts` volta a medir a cada corrida.
 */

/**
 * Cores de estado. Nunca sozinhas: vão sempre com rótulo ao lado.
 *
 * O `serio` era um laranja claro, `#ec835a`, e ao lado do `aviso` ficava
 * a 13,6 de distância — abaixo dos 15 a que dois tons deixam de se
 * distinguir mesmo a olho bom. E são justamente os dois que se comparam:
 * na barra do administrador, "A acabar (7 dias)" e "Em cortesia" saem um
 * por baixo do outro. Passou a âmbar, que abre o par para 15,3 e ainda
 * conta a mesma história — amarelo, âmbar, vermelho, do menos ao mais
 * grave.
 *
 * O `aviso` fica acima da banda de luminosidade de propósito: a banda
 * serve para nenhuma série gritar mais alto do que as outras, e um aviso
 * existe precisamente para gritar.
 */
export const COR_ESTADO = {
  bom: '#0ca30c',
  aviso: '#fab219',
  serio: '#c88228',
  critico: '#d03b3b',
} as const;

export type TomDeEstado = keyof typeof COR_ESTADO;

/**
 * A cor das séries — a linha dos pedidos por dia e as barras das casas.
 *
 * É o laranja da marca, um degrau abaixo. O `#ff5b24` dos botões tem
 * luminosidade 0,684 e fica fora da banda do modo escuro; este tem 0,60,
 * cai dentro, e lê-se a 5,3:1 sobre o grafite. É o mesmo laranja, sem
 * ser o que berra.
 *
 * Era o dourado da marca antiga. A marca mudou e o gráfico ficou para
 * trás: o painel inteiro laranja e a única linha dele dourada.
 */
export const COR_SERIE = '#e8561f';
