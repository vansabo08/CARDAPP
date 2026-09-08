/**
 * Gera os ícones da aplicação a partir de uma só forma: o ponto dourado
 * do logótipo sobre o preto da marca.
 *
 *   node scripts/gerar-icones.mjs
 *
 * O .ico é escrito à mão porque o sharp não o exporta. Um ICO pode
 * levar um PNG lá dentro tal e qual — é o que todos os browsers
 * modernos lêem.
 */

import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const PRETO = '#0B0B0B';
const OURO = '#C9A227';

/**
 * O ponto ocupa 34% do lado. Menos do que isto desaparece a 16px na
 * barra de separadores; mais, e deixa de parecer o ponto do logótipo.
 */
function svg(lado, { raio = 0 } = {}) {
  const centro = lado / 2;
  const ponto = lado * 0.17;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <rect width="${lado}" height="${lado}" rx="${raio}" fill="${PRETO}"/>
  <circle cx="${centro}" cy="${centro}" r="${ponto}" fill="${OURO}"/>
</svg>`;
}

async function png(lado, opcoes) {
  return sharp(Buffer.from(svg(lado, opcoes))).png({ compressionLevel: 9 }).toBuffer();
}

/** Container ICO com um único PNG lá dentro. */
function ico(pngBuffer, lado) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0); // reservado
  cabecalho.writeUInt16LE(1, 2); // tipo: ícone
  cabecalho.writeUInt16LE(1, 4); // quantas imagens

  const entrada = Buffer.alloc(16);
  entrada.writeUInt8(lado >= 256 ? 0 : lado, 0); // largura (0 = 256)
  entrada.writeUInt8(lado >= 256 ? 0 : lado, 1); // altura
  entrada.writeUInt8(0, 2); // cores da paleta
  entrada.writeUInt8(0, 3); // reservado
  entrada.writeUInt16LE(1, 4); // planos
  entrada.writeUInt16LE(32, 6); // bits por pixel
  entrada.writeUInt32LE(pngBuffer.length, 8);
  entrada.writeUInt32LE(6 + 16, 12); // onde começam os dados

  return Buffer.concat([cabecalho, entrada, pngBuffer]);
}

async function principal() {
  const feitos = [];

  const guardar = (caminho, dados) => {
    writeFileSync(caminho, dados);
    feitos.push(`${caminho} — ${Math.max(1, Math.round(dados.length / 1024))} kB`);
  };

  // Barra de separadores. Quadrado, sem cantos redondos.
  guardar('public/favicon-32.png', await png(32));
  guardar('public/favicon.ico', ico(await png(32), 32));

  // Ecrã inicial e instalação. O Android recorta sozinho.
  guardar('public/icone-192.png', await png(192));
  guardar('public/icone-512.png', await png(512));

  // O iOS já arredonda: enviamos quadrado e cheio.
  guardar('public/apple-touch-icon.png', await png(180));

  // Maskable: o Android corta até 20% de cada lado, por isso o fundo
  // tem de sangrar e o ponto encolher.
  const mascara = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${PRETO}"/>
  <circle cx="256" cy="256" r="61" fill="${OURO}"/>
</svg>`;
  guardar(
    'public/icone-maskable-512.png',
    await sharp(Buffer.from(mascara)).png({ compressionLevel: 9 }).toBuffer(),
  );

  console.log('\nÍcones gerados:');
  feitos.forEach((f) => console.log('  ·', f));
}

principal();

/**
 * Chapa fotográfica das imagens de partilha.
 * O satori (next/og) lê JPEG e PNG com segurança; WebP não.
 */
async function chapaDePartilha() {
  const { mkdirSync } = await import('node:fs');
  mkdirSync('public/og', { recursive: true });

  const saida = await sharp('public/pratos/moamba-ginguba.webp')
    .resize({ width: 560, height: 630, fit: 'cover', position: 'attention' })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  writeFileSync('public/og/prato.jpg', saida);
  console.log(`  · public/og/prato.jpg — ${Math.round(saida.length / 1024)} kB`);
}

await chapaDePartilha();
