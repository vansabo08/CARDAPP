/**
 * Gera os ícones da aplicação a partir do símbolo da marca: faca e
 * garfo cruzados, brancos sobre o preto do Cardapp.
 *
 *   node scripts/gerar-icones.mjs
 *
 * O símbolo está redesenhado em vector porque o ficheiro de origem
 * vinha com marcas de água. O desenho aqui é o mesmo de
 * src/components/marca-simbolo.tsx — se um mudar, muda o outro.
 *
 * O .ico é escrito à mão porque o sharp não o exporta. Um ICO pode
 * levar um PNG lá dentro tal e qual — é o que todos os browsers
 * modernos lêem.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
// O Node retira os tipos sozinho: a geometria vem do mesmo ficheiro que
// o componente React usa, para os dois nunca divergirem.
import { simboloSvgInterior } from '../src/lib/simbolo.ts';

const PRETO = '#0B0B0B';
const BRANCO = '#FFFFFF';

/**
 * `escala` encolhe o símbolo dentro da tela. Nos ícones normais ocupa
 * quase tudo — sem margem branca à volta, que era o que se pedia. No
 * maskable encolhe, porque o Android corta até 20% de cada lado.
 */
function svg(lado, { escala = 0.76, fundo = PRETO, cor = BRANCO } = {}) {
  const desloca = (100 - 100 * escala) / 2;
  const camadaFundo = fundo === 'none' ? '' : `<rect width="100" height="100" fill="${fundo}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 100 100">
  ${camadaFundo}
  <g transform="translate(${desloca} ${desloca}) scale(${escala})">${simboloSvgInterior(cor)}</g>
</svg>`;
}

async function png(lado, opcoes) {
  return sharp(Buffer.from(svg(lado, opcoes))).png({ compressionLevel: 9 }).toBuffer();
}

/** Container ICO com um único PNG lá dentro. */
function ico(pngBuffer, lado) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0);
  cabecalho.writeUInt16LE(1, 2);
  cabecalho.writeUInt16LE(1, 4);

  const entrada = Buffer.alloc(16);
  entrada.writeUInt8(lado >= 256 ? 0 : lado, 0);
  entrada.writeUInt8(lado >= 256 ? 0 : lado, 1);
  entrada.writeUInt16LE(1, 4);
  entrada.writeUInt16LE(32, 6);
  entrada.writeUInt32LE(pngBuffer.length, 8);
  entrada.writeUInt32LE(22, 12);

  return Buffer.concat([cabecalho, entrada, pngBuffer]);
}

async function principal() {
  const feitos = [];
  const guardar = (caminho, dados) => {
    writeFileSync(caminho, dados);
    feitos.push(`${caminho} — ${Math.max(1, Math.round(dados.length / 1024))} kB`);
  };

  guardar('public/favicon-32.png', await png(32));
  guardar('public/favicon.ico', ico(await png(32), 32));
  guardar('public/icone-192.png', await png(192));
  guardar('public/icone-512.png', await png(512));
  guardar('public/apple-touch-icon.png', await png(180));

  // O Android corta os cantos: o símbolo encolhe para caber no círculo.
  guardar('public/icone-maskable-512.png', await png(512, { escala: 0.52 }));

  // Versão recortada, para onde já há fundo escuro por baixo.
  guardar(
    'public/simbolo.png',
    await sharp(Buffer.from(svg(512, { fundo: 'none' })))
      .png({ compressionLevel: 9 })
      .toBuffer(),
  );

  console.log('\nÍcones gerados:');
  feitos.forEach((f) => console.log('  ·', f));
}

/**
 * Chapa fotográfica das imagens de partilha.
 * O satori (next/og) lê JPEG e PNG com segurança; WebP não.
 */
async function chapaDePartilha() {
  mkdirSync('public/og', { recursive: true });

  const saida = await sharp('public/pratos/moamba-ginguba.webp')
    .resize({ width: 560, height: 630, fit: 'cover', position: 'attention' })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  writeFileSync('public/og/prato.jpg', saida);
  console.log(`  · public/og/prato.jpg — ${Math.round(saida.length / 1024)} kB`);
}

await principal();
await chapaDePartilha();
