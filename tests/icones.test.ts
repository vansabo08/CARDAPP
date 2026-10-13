import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import manifest from '../src/app/manifest';
import { CAMINHO, LARGURA, ALTURA_CAIXA_ALTA } from '../scripts/marca-palavra.js';

/**
 * A marca, tal como cada sítio a exige.
 *
 * Nada disto se vê a correr a aplicação no computador: um ícone maskable
 * com a marca fora da zona segura só aparece cortado no ecrã inicial de
 * um Android, um ícone de iPhone com transparência só aparece com um
 * fundo que ninguém escolheu, e um contorno aberto no logótipo só se vê
 * quando alguém repara que diz "CardA".
 *
 * Os ficheiros saem todos de `scripts/gerar-marca.mjs`. O que se guarda
 * aqui é o que o gerador tem de continuar a cumprir.
 */

const AMARELO = [255, 194, 26];
const TINTA = [28, 26, 23];

const pixeis = async (ficheiro: string) =>
  sharp(`public/${ficheiro}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

function cor(d: Awaited<ReturnType<typeof pixeis>>, x: number, y: number) {
  const i = (y * d.info.width + x) * 4;
  return [d.data[i], d.data[i + 1], d.data[i + 2], d.data[i + 3]];
}

const alfa = (d: Awaited<ReturnType<typeof pixeis>>, x: number, y: number) => cor(d, x, y)[3];

/** Quantos pixéis são tinta: opacos e escuros. */
function tinta(d: Awaited<ReturnType<typeof pixeis>>) {
  let quantos = 0;
  for (let i = 0; i < d.data.length; i += 4) {
    const escuro = d.data[i] + d.data[i + 1] + d.data[i + 2] < 200;
    if (d.data[i + 3] > 200 && escuro) quantos += 1;
  }
  return quantos;
}

const perto = (a: number[], b: number[], folga = 12) =>
  a.slice(0, 3).every((v, i) => Math.abs(v - b[i]) <= folga);

/* ------------------------------------------------------------------ */
/* A palavra                                                           */
/* ------------------------------------------------------------------ */

describe('a palavra "CardApp"', () => {
  /*
   * ISTO JÁ CORREU ERRADO. O conversor de fonte para curvas não fechava
   * os contornos — nem um único Z em sete letras — e o desenhador, ao
   * chegar a um contorno aberto, desistia a meio: o logótipo apareceu a
   * dizer "CardA" com um A por acabar. Não dá erro nenhum; só se vê.
   */
  it('tem todos os contornos fechados', () => {
    expect(CAMINHO.endsWith('Z')).toBe(true);
    // Sete letras, e cada uma com pelo menos um contorno; as que têm
    // buraco (a, d, p, p) levam dois.
    expect((CAMINHO.match(/Z/g) ?? []).length).toBeGreaterThanOrEqual(7);
  });

  it('tem as medidas com que o logótipo é montado', () => {
    expect(LARGURA).toBeGreaterThan(400);
    expect(ALTURA_CAIXA_ALTA).toBeGreaterThan(60);
  });
});

/* ------------------------------------------------------------------ */
/* Os logótipos                                                        */
/* ------------------------------------------------------------------ */

describe('os logótipos em SVG', () => {
  const ler = (f: string) => readFileSync(`public/brand/${f}`, 'utf8');

  it.each([
    'cardapp-simbolo-primary.svg',
    'cardapp-simbolo-ondark.svg',
    'cardapp-horizontal-primary.svg',
    'cardapp-horizontal-white.svg',
  ])('%s é um SVG com caixa de desenho', (ficheiro) => {
    const svg = ler(ficheiro);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="0 0 ');
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });

  it('o símbolo é quadrado e o horizontal respeita a proporção', () => {
    expect(ler('cardapp-simbolo-primary.svg')).toContain('viewBox="0 0 100 100"');

    const caixa = ler('cardapp-horizontal-primary.svg').match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    expect(caixa).toBeTruthy();
    const racio = Number(caixa![1]) / Number(caixa![2]);
    // Deformar o logótipo é a primeira coisa que o guia proíbe.
    expect(racio).toBeGreaterThan(4.5);
    expect(racio).toBeLessThan(5);
  });

  it('usa as cores do guia, e só essas', () => {
    const claro = ler('cardapp-horizontal-primary.svg');
    expect(claro).toContain('#1C1A17');
    expect(claro).toContain('#FFC21A');

    // A versão de uma cor só não leva cor nenhuma além do branco: o
    // prato é vazado, para mostrar o fundo que estiver por trás.
    const branco = ler('cardapp-horizontal-white.svg');
    expect(branco).toContain('#FFFFFF');
    expect(branco).not.toContain('#FFC21A');
    expect(branco).not.toContain('<circle');
  });
});

/* ------------------------------------------------------------------ */
/* Os ícones                                                           */
/* ------------------------------------------------------------------ */

describe('os ícones', () => {
  it.each([
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ])('%s tem %i px, cantos redondos e o amarelo da marca', async (ficheiro, lado) => {
    const d = await pixeis(ficheiro);
    expect(d.info.width).toBe(lado);
    expect(d.info.height).toBe(lado);

    // O canto transparente é o que faz o arredondado.
    expect(alfa(d, 0, 0)).toBe(0);
    expect(alfa(d, lado - 1, lado - 1)).toBe(0);

    // A meio do bordo de cima já é ladrilho amarelo.
    expect(perto(cor(d, Math.round(lado / 2), 2), AMARELO)).toBe(true);
    expect(tinta(d)).toBeGreaterThan(0);
  });

  it.each([
    ['apple-touch-icon.png', 180],
    ['icon-maskable-512.png', 512],
  ])('%s não tem transparência nenhuma', async (ficheiro, lado) => {
    // O iPhone pinta de preto o que é transparente, e o Android recorta
    // o maskable à forma do sistema: um canto transparente é um buraco.
    const d = await pixeis(ficheiro);
    expect(d.info.width).toBe(lado);
    for (let i = 3; i < d.data.length; i += 4) {
      if (d.data[i] !== 255) throw new Error(`pixel transparente em ${ficheiro}`);
    }
  });

  it('no maskable, a marca fica dentro da zona que o Android nunca corta', async () => {
    // A zona segura é um círculo com 80 % da largura: tudo o que for
    // tinta tem de caber lá dentro, porque o resto pode ser cortado.
    const d = await pixeis('icon-maskable-512.png');
    const l = d.info.width;
    let maisLonge = 0;

    for (let y = 0; y < l; y++) {
      for (let x = 0; x < l; x++) {
        if (perto(cor(d, x, y), TINTA, 40)) {
          maisLonge = Math.max(maisLonge, Math.hypot(x - l / 2, y - l / 2));
        }
      }
    }

    expect(maisLonge).toBeGreaterThan(0);
    expect(maisLonge).toBeLessThanOrEqual(0.4 * l);
  });

  it('o favicon vai em SVG e em ICO', () => {
    expect(readFileSync('public/favicon.svg', 'utf8').startsWith('<svg')).toBe(true);

    const b = readFileSync('public/favicon.ico');
    expect(b.readUInt16LE(2)).toBe(1); // tipo: ícone
    expect(b.readUInt16LE(4)).toBe(1); // uma imagem
    const inicio = b.readUInt32LE(18);
    expect(b.subarray(inicio, inicio + 4).toString('latin1')).toBe('\x89PNG');
  });

  it('todos os ícones do manifesto existem', () => {
    for (const icone of manifest().icons ?? []) {
      const caminho = `public${icone.src.split('?')[0]}`;
      expect(existsSync(caminho), caminho).toBe(true);
    }
  });

  it('não ficou para trás nenhum ícone da marca antiga', () => {
    for (const velho of [
      'public/logo.png',
      'public/logo-128.png',
      'public/icone-192.png',
      'public/icone-512.png',
      'public/icone-maskable-512.png',
      'public/favicon-32.png',
    ]) {
      expect(existsSync(velho), velho).toBe(false);
    }
  });
});
