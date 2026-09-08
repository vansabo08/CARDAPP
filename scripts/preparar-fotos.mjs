/**
 * Traz as fotografias em resolução decente e converte-as para WebP.
 *
 * As primeiras vieram a 700px de largura — o herói do cardápio estica-as
 * até ~1425px e fica desfocado, e as miniaturas ficam ilegíveis em ecrãs
 * 2x e 3x. O `next/image` gera os tamanhos todos a partir da origem, por
 * isso o que é preciso é uma origem grande, uma só vez.
 *
 *   node scripts/preparar-fotos.mjs
 */

import { readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const PASTA = 'public/pratos';
const LARGURA = 1600;
const QUALIDADE = 76;
const AGENTE = 'Mozilla/5.0 (CardappDemo)';

/** Os créditos são a fonte única: dali saem os identificadores. */
function lerCreditos() {
  const texto = readFileSync(`${PASTA}/CREDITOS.md`, 'utf8');
  const pares = [];
  for (const linha of texto.split('\n')) {
    const m = linha.match(/^\|\s*([a-z0-9-]+)\.(?:jpg|webp)\s*\|\s*unsplash\.com\/photos\/([\w-]+)\s*\|/i);
    if (m) pares.push({ ficheiro: m[1], id: m[2] });
  }
  return pares;
}

async function principal() {
  const fotos = lerCreditos();
  if (!fotos.length) {
    console.error('Não consegui ler os créditos. Nada feito.');
    process.exitCode = 1;
    return;
  }

  let total = 0;

  for (const { ficheiro, id } of fotos) {
    const url = `https://images.unsplash.com/photo-${id}?w=${LARGURA}&q=85&fm=jpg&fit=max`;

    const resposta = await fetch(url, { headers: { 'User-Agent': AGENTE } });
    if (!resposta.ok) {
      console.log(`✗ ${ficheiro}: HTTP ${resposta.status}`);
      continue;
    }

    const original = Buffer.from(await resposta.arrayBuffer());
    const imagem = sharp(original);
    const { width = 0, height = 0 } = await imagem.metadata();

    const saida = await imagem
      .resize({ width: LARGURA, withoutEnlargement: true })
      .webp({ quality: QUALIDADE, effort: 5 })
      .toBuffer();

    writeFileSync(`${PASTA}/${ficheiro}.webp`, saida);
    total += saida.length;

    console.log(
      `✓ ${ficheiro.padEnd(17)} ${String(width).padStart(4)}x${String(height).padEnd(4)}` +
        ` → ${String(Math.round(saida.length / 1024)).padStart(4)} kB webp`,
    );
  }

  // Os JPEG antigos, de 700px, deixam de fazer falta.
  let apagados = 0;
  for (const f of readdirSync(PASTA)) {
    if (f.endsWith('.jpg')) {
      unlinkSync(`${PASTA}/${f}`);
      apagados++;
    }
  }

  console.log(`\n${fotos.length} imagens em WebP, ${Math.round(total / 1024)} kB no total.`);
  console.log(`${apagados} JPEG de 700px apagados.`);
}

principal();
