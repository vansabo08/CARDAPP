import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import manifest from '../src/app/manifest';

/**
 * O logótipo e os ícones, tal como cada sítio os exige.
 *
 * Nada disto se vê a correr a aplicação no computador: um ícone maskable
 * com a marca fora da zona segura só aparece cortado no ecrã inicial de
 * um Android, e um ícone de iPhone com transparência só aparece com um
 * fundo que ninguém escolheu. Por isso fica testado aqui.
 *
 * A MARCA MUDOU, E ESTES TESTES COM ELA. Era um disco preto cheio, com
 * talheres brancos recortados lá dentro, e o que se guardava era que o
 * disco enchia o quadrado e que os talheres não saíam da zona segura.
 * A marca nova é um C aberto com um cartão ao meio: já não há disco, e
 * o branco deixou de ser a marca para passar a ser o fundo. O que se
 * guarda agora é o que continua a valer — que a marca tem fundo
 * transparente, que os ícones têm cantos redondos, que os dois que o
 * sistema recorta não têm transparência nenhuma, e que a tinta cabe na
 * zona que o Android nunca corta.
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

/** Quantos pixéis são tinta: opacos e escuros. */
function tinta(d: Awaited<ReturnType<typeof pixeis>>) {
  let quantos = 0;
  for (let i = 0; i < d.data.length; i += 4) {
    const escuro = d.data[i] + d.data[i + 1] + d.data[i + 2] < 200;
    if (d.data[i + 3] > 200 && escuro) quantos += 1;
  }
  return quantos;
}

describe('o logótipo', () => {
  it('é um PNG quadrado', async () => {
    const m = await sharp('public/logo.png').metadata();
    expect(m.format).toBe('png');
    expect(m.width).toBe(m.height);
  });

  it('tem fundo transparente e tinta a sério', async () => {
    // Vai ao lado da palavra "CardApp", em cima de fundos diferentes: um
    // fundo branco cozido na imagem apareceria como um quadrado.
    const d = await pixeis('logo.png');
    const l = d.info.width;

    for (const [x, y] of [
      [2, 2],
      [l - 3, 2],
      [2, l - 3],
      [l - 3, l - 3],
    ]) {
      expect(alfa(d, x, y), `canto ${x},${y}`).toBe(0);
    }

    // E a marca ocupa o quadrado: pelo menos um oitavo dele é tinta.
    expect(tinta(d)).toBeGreaterThan((l * l) / 8);
  });
});

describe('os ícones', () => {
  it.each([
    ['favicon-32.png', 32],
    ['icone-192.png', 192],
    ['icone-512.png', 512],
  ])('%s tem %i px e cantos redondos', async (ficheiro, lado) => {
    const d = await pixeis(ficheiro);
    expect(d.info.width).toBe(lado);
    expect(d.info.height).toBe(lado);

    // O canto é transparente — é o que faz o arredondado — e o meio é
    // a folha branca onde a marca assenta.
    expect(alfa(d, 0, 0)).toBe(0);
    expect(alfa(d, lado - 1, lado - 1)).toBe(0);
    expect(alfa(d, Math.round(lado / 2), Math.round(lado / 2))).toBe(255);
    expect(tinta(d)).toBeGreaterThan(0);
  });

  it('a marca sozinha, em 128, continua transparente nos cantos', async () => {
    const d = await pixeis('logo-128.png');
    expect(d.info.width).toBe(128);
    expect(alfa(d, 0, 0)).toBe(0);
    expect(tinta(d)).toBeGreaterThan(0);
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

  it('no maskable, a marca fica dentro da zona que o Android nunca corta', async () => {
    // A zona segura é um círculo com 80% da largura: tudo o que for
    // tinta tem de caber lá dentro, porque o resto pode ser cortado.
    const d = await pixeis('icone-maskable-512.png');
    const l = d.info.width;
    const seguro = 0.4 * l;

    let maisLonge = 0;
    for (let y = 0; y < l; y++) {
      for (let x = 0; x < l; x++) {
        const [r, g, b] = cor(d, x, y);
        if (r + g + b < 200) maisLonge = Math.max(maisLonge, Math.hypot(x - l / 2, y - l / 2));
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
