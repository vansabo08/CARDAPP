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
  bom: '#15803d',
  aviso: '#d97706',
  serio: '#b45309',
  critico: '#b3261e',
} as const;

export type TomDeEstado = keyof typeof COR_ESTADO;

/**
 * A cor das séries — a linha dos pedidos por dia e as barras das casas.
 *
 * É o laranja da marca, no tom que se lê sobre branco. O âmbar dos
 * botões, numa linha de dois pixéis, desaparecia contra o cartão: 1,8
 * para 1. Este dá 5,2 e continua a ser a mesma família.
 *
 * Acompanha a marca: quando o laranja dos botões abriu, este abriu com
 * ele. Já esteve dourado depois de a marca passar a laranja, e o painel
 * inteiro ficou laranja com uma linha dourada no meio.
 */
export const COR_SERIE = '#c2410c';

/**
 * As cores da dashboard da casa: verde, azul, laranja — e o vermelho
 * das descidas.
 *
 * Medidas contra o cartão branco, e não contra o cinzento da página: é
 * em cima do cartão que os gráficos vivem. As quatro passam a banda de
 * luminosidade do modo claro, o chroma e o contraste.
 *
 * A REGRA QUE AS ACOMPANHA, E SEM A QUAL NÃO SE PODEM USAR: cada uma
 * manda no seu cartão, sozinha. Nunca duas na mesma figura.
 *
 * Porquê: medidas todas contra todas, o vermelho e o laranja ficam a
 * 2,8 um do outro mesmo para quem vê todas as cores, e a 2,2 para quem
 * não distingue verdes de vermelhos — muito abaixo dos 15 e dos 8 que
 * se exigem. Lado a lado, no mesmo gráfico, seriam a mesma barra. Uma
 * por cartão, cada uma com o seu título por cima, e a pergunta "qual é
 * qual" nunca chega a existir.
 *
 * O vermelho não é categoria: é o sinal de que um número desceu, e vai
 * sempre com a seta para baixo ao lado — nunca sozinho a dizer mau.
 */
export const COR_GRAFICO = {
  receita: '#1a7f4b',
  pedidos: '#2563c9',
  movimento: COR_SERIE,
  descida: '#c0392b',
} as const;

export type SerieDaCasa = keyof typeof COR_GRAFICO;

/**
 * A cor da casa, escurecida até se ler sobre a folha branca.
 *
 * Cada restaurante escolhe a sua cor, e muitas são douradas, amarelas ou
 * cor de areia — bonitas num fundo escuro, invisíveis num claro. O nome
 * da casa no topo do cardápio chegou a ficar a 1,5:1 sobre o véu branco
 * da fotografia: lá estava escrito, e não se lia.
 *
 * Esta função devolve a cor tal como é quando ela já se lê, e uma versão
 * dela escurecida quando não. Escurecer é misturar com preto, o que
 * mantém o tom — o dourado continua dourado, mais fechado — em vez de
 * trocar a cor da casa por uma nossa.
 */
export function corQueSeLe(cor: string, minimo = 3.2): string {
  const canais = paraCanais(cor);
  if (!canais) return cor;

  let [r, g, b] = canais;
  for (let n = 0; n < 12; n++) {
    if (contrasteComBranco([r, g, b]) >= minimo) break;
    r = Math.round(r * 0.88);
    g = Math.round(g * 0.88);
    b = Math.round(b * 0.88);
  }
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function paraCanais(cor: string): [number, number, number] | null {
  const hex = cor.trim().replace('#', '');
  const inteiro =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(inteiro)) return null;
  return [0, 2, 4].map((i) => parseInt(inteiro.slice(i, i + 2), 16)) as [number, number, number];
}

function contrasteComBranco([r, g, b]: [number, number, number]) {
  const linear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luz = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return 1.05 / (luz + 0.05);
}
