import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import manifest from '../src/app/manifest';

/**
 * O logótipo e os ícones, tal como cada sítio os exige.
 *
 * Nada disto se vê a correr a aplicação no computador: um ícone maskable
 * com os talheres fora da zona segura só aparece cortado no ecrã inicial
 * de um Android, e um ícone de iPhone com transparência só aparece com um
 * fundo que ninguém escolheu. Por isso fica testado aqui.
 */

const pixeis = async (ficheiro: string) =>
  sharp(`public/${ficheiro}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

function alfa(d: Awaited<ReturnType<typeof pixeis>>, x: number, y: number) {
  return d.data[(y * d.info.width + x) * 4 + 3];
}

function cor(d: Awaited<ReturnType<typeof pixeis>>, x: number, y: number) {
  const i = (y * d.info.width + x) * 4;
  return [d.data[i], d.data[i + 1], d.data[i + 2], d.data[i + 3]];
}

describe('o logótipo', () => {
  it('é um PNG quadrado', async () => {
    const m = await sharp('public/logo.png').metadata();
    expect(m.format).toBe('png');
    expect(m.width).toBe(m.height);
  });

  it('é redondo: os cantos são transparentes e o disco é preto', async () => {
    const d = await pixeis('logo.png');
    const l = d.info.width;
    for (const [x, y] of [[2, 2], [l - 3, 2], [2, l - 3], [l - 3, l - 3]]) {
      expect(alfa(d, x, y), `canto ${x},${y}`).toBe(0);
    }
    // Perto do bordo, no topo, dentro do disco: preto opaco.
    expect(cor(d, Math.round(l / 2), Math.round(l * 0.05))).toEqual([0, 0, 0, 255]);
  });

  it('o disco enche o quadrado, sem margem à volta', async () => {
    const d = await pixeis('logo.png');
    const l = d.info.width;
    // Nos quatro pontos cardeais, a 2% do bordo, já é disco.
    for (const [x, y] of [[l / 2, l * 0.02], [l / 2, l * 0.98], [l * 0.02, l / 2], [l * 0.98, l / 2]]) {
      expect(alfa(d, Math.round(x), Math.round(y))).toBe(255);
    }
  });
});

describe('os ícones', () => {
  it.each([
    ['favicon-32.png', 32],
    ['icone-192.png', 192],
    ['icone-512.png', 512],
    ['logo-128.png', 128],
  ])('%s tem %i px e é redondo', async (ficheiro, lado) => {
    const d = await pixeis(ficheiro);
    expect(d.info.width).toBe(lado);
    expect(d.info.height).toBe(lado);
    expect(alfa(d, 0, 0)).toBe(0);
    expect(alfa(d, lado - 1, lado - 1)).toBe(0);
  });

  it.each([
    ['apple-touch-icon.png', 180],
    ['icone-maskable-512.png', 512],
  ])('%s não tem transparência nenhuma', async (ficheiro, lado) => {
    // O iPhone pinta de preto o que é transparente, e o Android recorta o
    // maskable à forma do sistema: um canto transparente seria um buraco.
    const d = await pixeis(ficheiro);
    expect(d.info.width).toBe(lado);
    for (let i = 3; i < d.data.length; i += 4) {
      if (d.data[i] !== 255) throw new Error(`pixel transparente em ${ficheiro}`);
    }
  });

  it('no maskable, os talheres ficam dentro da zona que o Android nunca corta', async () => {
    // A zona segura é um círculo com 80% da largura. Tudo o que for
    // branco — a faca e o garfo — tem de caber lá dentro.
    const d = await pixeis('icone-maskable-512.png');
    const l = d.info.width;
    const seguro = 0.4 * l;
    let maisLonge = 0;
    for (let y = 0; y < l; y++) {
      for (let x = 0; x < l; x++) {
        // Só os opacos: um pixel transparente pode guardar branco na cor
        // sem se ver, e contava como talher.
        const [r, g, b, a] = cor(d, x, y);
        if (a === 255 && r + g + b > 600) {
          maisLonge = Math.max(maisLonge, Math.hypot(x - l / 2, y - l / 2));
        }
      }
    }
    expect(maisLonge).toBeGreaterThan(0);
    expect(maisLonge).toBeLessThanOrEqual(seguro);
  });

  it('o favicon.ico é um ICO com um PNG lá dentro', () => {
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
});
