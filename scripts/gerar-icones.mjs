/**
 * Gera o logótipo e os ícones da aplicação a partir do logótipo oficial:
 * faca e garfo brancos, cruzados, num disco preto.
 *
 *   node scripts/gerar-icones.mjs                     (a partir de public/logo.png)
 *   node scripts/gerar-icones.mjs caminho/do/logo.png (a partir de outro ficheiro)
 *
 * A IMAGEM NÃO É REDESENHADA. É o ficheiro que a casa escolheu, recortado à
 * volta do disco e exportado em PNG — os ícones são essa imagem, reduzida.
 *
 * Antes era o contrário: o símbolo tinha sido redesenhado em vector porque
 * o ficheiro de origem trazia marcas de água. O logótipo passou a ser a
 * imagem oficial, tal como está, e o redesenho saiu.
 *
 * MARCA DE ÁGUA. A imagem actual traz "turbologo" em marca de água — é a
 * pré-visualização do site onde o logótipo foi feito. Não se vê dentro da
 * aplicação (até 64 px), mal se nota a 192 px, e lê-se a 512 px, que é o
 * ícone do ecrã de instalação e de arranque no Android. Não é removida
 * aqui: tirá-la seria alterar o logótipo e contornar a licença de quem o
 * vende. Quando houver o ficheiro limpo, basta correr este script com ele:
 *
 *   node scripts/gerar-icones.mjs Downloads/logo-limpo.png
 *
 * e tudo o que está abaixo sai de novo a partir dele.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

/** O preto do disco. Os ícones sem transparência usam este, para o disco não ter costura. */
const PRETO_DO_DISCO = { r: 0, g: 0, b: 0, alpha: 1 };

/**
 * Encontra o disco preto na imagem e devolve-o recortado num quadrado.
 *
 * Procura os pixeis opacos e escuros — o disco — e recorta à volta, com
 * dois pixeis de folga para o bordo suave não ficar cortado.
 *
 * Se a imagem vier com fundo (sem transparência nos cantos), o fundo é
 * tirado com uma máscara circular do tamanho do disco. Se já vier
 * transparente, como a actual, não se lhe toca: o disco dela já é redondo
 * (o raio varia 3 px em 888) e o bordo já é suave.
 */
async function discoRecortado(origem) {
  const { data, info } = await sharp(origem)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: L, height: A, channels: C } = info;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;

  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const i = (y * L + x) * C;
      const opaco = data[i + 3] >= 128;
      const escuro = (data[i] + data[i + 1] + data[i + 2]) / 3 < 60;
      if (opaco && escuro) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }

  if (x1 < 0) throw new Error('Não encontrei o disco preto do logótipo nesta imagem.');

  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const raio = Math.max(x1 - x0, y1 - y0) / 2;
  const lado = Math.ceil(raio * 2) + 4;
  const esquerda = Math.max(0, Math.round(cx - lado / 2));
  const topo = Math.max(0, Math.round(cy - lado / 2));

  let recorte = sharp(origem)
    .ensureAlpha()
    .extract({
      left: esquerda,
      top: topo,
      width: Math.min(lado, L - esquerda),
      height: Math.min(lado, A - topo),
    });

  // Tem fundo? Vê-se num canto: numa imagem já recortada, os cantos são transparentes.
  const canto = data[(Math.max(0, topo) * L + Math.max(0, esquerda)) * C + 3];
  if (canto >= 128) {
    const mascara = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
        <circle cx="${lado / 2}" cy="${lado / 2}" r="${raio}" fill="#fff"/>
      </svg>`,
    );
    recorte = sharp(await recorte.png().toBuffer()).composite([{ input: mascara, blend: 'dest-in' }]);
  }

  return { buffer: await recorte.png().toBuffer(), lado };
}

/** Container ICO com um único PNG lá dentro — o sharp não exporta ICO. */
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
  const origem = process.argv[2] ?? 'public/logo.png';
  // Lido para memória antes de escrever: a origem pode ser o próprio public/logo.png.
  const { buffer: disco, lado } = await discoRecortado(readFileSync(origem));

  const feitos = [];
  const guardar = (caminho, dados) => {
    writeFileSync(caminho, dados);
    feitos.push(`${caminho} — ${Math.max(1, Math.round(dados.length / 1024))} kB`);
  };

  /** O logótipo redondo, com os cantos transparentes. */
  const redondo = (l) =>
    sharp(disco).resize(l, l, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();

  /**
   * O logótipo sobre preto, sem transparência nenhuma.
   *
   * O iPhone pinta de preto o que for transparente num ícone, e o Android
   * recorta o ícone maskable à forma que o telemóvel usar. Com o fundo do
   * mesmo preto do disco, o bordo do disco desaparece e fica a faca e o
   * garfo sobre preto, no formato do sistema — que é como o logótipo se
   * vê num ecrã inicial.
   */
  const sobrePreto = (l) =>
    sharp(disco)
      .resize(l, l, { kernel: 'lanczos3' })
      .flatten({ background: PRETO_DO_DISCO })
      .png({ compressionLevel: 9 })
      .toBuffer();

  guardar('public/logo.png', await sharp(disco).png({ compressionLevel: 9 }).toBuffer());
  guardar('public/logo-128.png', await redondo(128));

  guardar('public/favicon-32.png', await redondo(32));
  guardar('public/favicon.ico', ico(await redondo(32), 32));
  guardar('public/icone-192.png', await redondo(192));
  guardar('public/icone-512.png', await redondo(512));
  guardar('public/apple-touch-icon.png', await sobrePreto(180));

  /*
   * O Android pode cortar até 10% de cada lado de um ícone maskable. Os
   * talheres ocupam 74% do raio do disco, e a zona que nunca é cortada
   * vai até 80% — cabem sem encolher. O teste dos ícones confirma-o.
   */
  guardar('public/icone-maskable-512.png', await sobrePreto(512));

  console.log(`\nA partir de ${origem} (disco de ${lado} px):`);
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
