import { describe, expect, it } from 'vitest';
import { COR_ESTADO, COR_SERIE } from '@/lib/cores';

/**
 * As cores do painel de administração, medidas.
 *
 * O comentário do `lib/cores` diz que os valores foram medidos e não
 * escolhidos a olho. Um comentário não impede ninguém de trocar um hex
 * por outro que fique giro; este ficheiro impede.
 *
 * A régua é a do sistema de visualização: distância euclidiana em OKLab
 * vezes cem, com a simulação de daltonismo de Machado, Oliveira e
 * Fernandes (2009) no grau máximo. São as mesmas contas do validador,
 * copiadas para aqui porque ele não vem dentro do repositório — e é por
 * isso que os números deste ficheiro batem certo com os dele.
 *
 * O que se guarda:
 *
 * 1. AS QUATRO BARRAS DE ESTADO TÊM DE SE DISTINGUIR. Saem uma por baixo
 *    da outra, na mesma barra, e duas delas — "A acabar" e "Em cortesia"
 *    — são exactamente as que se comparam. Já estiveram a 13,6 uma da
 *    outra, abaixo dos 15 a que dois tons deixam de se separar mesmo a
 *    olho bom.
 *
 * 2. A COR DAS SÉRIES TEM DE SER LARANJA DA CASA, E LEGÍVEL. Já foi
 *    dourada depois da marca ter passado a laranja, e o painel inteiro
 *    ficou laranja com uma linha dourada no meio.
 */

const FUNDO = '#0f0e0d'; // --grafite

/* ------------------------------------------------------------------ */
/* A régua                                                             */
/* ------------------------------------------------------------------ */

/** Machado, Oliveira e Fernandes (2009), grau 1.0, em RGB linear. */
const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
} as const;

type Vista = keyof typeof MACHADO;

const paraLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function linear(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => paraLinear(parseInt(h.slice(i, i + 2), 16) / 255));
  return [r, g, b];
}

function simular([r, g, b]: [number, number, number], vista: Vista): [number, number, number] {
  const M = MACHADO[vista];
  const limitar = (c: number) => Math.max(0, Math.min(1, c));
  return [
    limitar(M[0][0] * r + M[0][1] * g + M[0][2] * b),
    limitar(M[1][0] * r + M[1][1] * g + M[1][2] * b),
    limitar(M[2][0] * r + M[2][1] * g + M[2][2] * b),
  ];
}

function oklab([r, g, b]: [number, number, number]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Distância entre duas cores, em OKLab vezes cem. Sem vista, é a normal. */
function distancia(a: string, b: string, vista?: Vista) {
  const x = oklab(vista ? simular(linear(a), vista) : linear(a));
  const y = oklab(vista ? simular(linear(b), vista) : linear(b));
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

function luminosidade(hex: string) {
  return oklab(linear(hex))[0];
}

function chroma(hex: string) {
  const [, a, b] = oklab(linear(hex));
  return Math.hypot(a, b);
}

function contraste(a: string, b: string) {
  const rel = (hex: string) => {
    const [r, g, bl] = linear(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [claro, escuro] = [rel(a), rel(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

/* ------------------------------------------------------------------ */
/* As barras de estado                                                 */
/* ------------------------------------------------------------------ */

/** A ordem em que saem na barra do administrador, de cima para baixo. */
const NA_BARRA = [COR_ESTADO.bom, COR_ESTADO.aviso, COR_ESTADO.serio, COR_ESTADO.critico];

const VIZINHOS = NA_BARRA.slice(0, -1).map((cor, i) => [cor, NA_BARRA[i + 1]] as const);

describe('as quatro barras de estado', () => {
  it.each(VIZINHOS)('%s e %s distinguem-se a olho nu', (a, b) => {
    expect(distancia(a, b)).toBeGreaterThanOrEqual(15);
  });

  it.each(VIZINHOS)('%s e %s distinguem-se para quem não distingue cores', (a, b) => {
    // Aqui o chão é 8. Abaixo de 6 nem com rótulo ao lado serviria; entre
    // 6 e 8 só serve porque o rótulo está sempre lá — e está.
    const pior = Math.min(distancia(a, b, 'protan'), distancia(a, b, 'deutan'));
    expect(pior).toBeGreaterThanOrEqual(8);
  });

  it.each(NA_BARRA)('%s lê-se sobre o fundo escuro', (cor) => {
    expect(contraste(cor, FUNDO)).toBeGreaterThanOrEqual(3);
  });

  it.each(NA_BARRA)('%s tem cor a sério, e não um cinzento com pretensões', (cor) => {
    expect(chroma(cor)).toBeGreaterThanOrEqual(0.1);
  });
});

/* ------------------------------------------------------------------ */
/* A cor das séries                                                    */
/* ------------------------------------------------------------------ */

describe('a cor da linha e das barras', () => {
  it('cai dentro da banda de luminosidade do modo escuro', () => {
    // O laranja dos botões, #ff5b24, fica em 0,684 e sai da banda: num
    // botão é para saltar à vista, num gráfico é para se ler.
    expect(luminosidade(COR_SERIE)).toBeGreaterThanOrEqual(0.48);
    expect(luminosidade(COR_SERIE)).toBeLessThanOrEqual(0.67);
  });

  it('lê-se sobre o fundo escuro', () => {
    expect(contraste(COR_SERIE, FUNDO)).toBeGreaterThanOrEqual(3);
  });

  it('continua a ser o laranja da casa, e não um dourado qualquer', () => {
    // A um degrau do laranja da marca. Se alguém a trocar por um tom de
    // outra família, isto cai.
    expect(distancia(COR_SERIE, '#ff5b24')).toBeLessThan(8);
  });
});
