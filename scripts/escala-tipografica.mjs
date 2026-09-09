/**
 * Põe todos os tamanhos de letra na escala do Tailwind.
 *
 *   node scripts/escala-tipografica.mjs            # mostra o que faria
 *   node scripts/escala-tipografica.mjs --aplicar
 *
 * A regra da casa: nenhum valor arbitrário. Um tamanho que não caia
 * exactamente num degrau desce para o degrau abaixo — nunca sobe, senão
 * o texto cresce sozinho e a hierarquia da página muda de sentido.
 *
 * As entrelinhas seguem no mesmo passo. De nada serve trocar `text-[15px]`
 * por `text-sm` e deixar um `leading-[1.65]` ao lado: continua a ser um
 * valor inventado, e passa a brigar com a entrelinha que o degrau já
 * traz. Vão para os nomes do Tailwind, que são da escala.
 *
 * Faz-se por script e não à mão porque são 260 ocorrências em 25
 * ficheiros: à mão, a probabilidade de trocar um degrau sem dar por isso
 * é maior do que a de o script se enganar.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Os degraus, em pixéis. */
const DEGRAUS = [
  ['text-xs', 12],
  ['text-sm', 14],
  ['text-base', 16],
  ['text-lg', 18],
  ['text-xl', 20],
  ['text-2xl', 24],
  ['text-3xl', 30],
  ['text-4xl', 36],
  ['text-5xl', 48],
  ['text-6xl', 60],
  ['text-7xl', 72],
  ['text-8xl', 96],
  ['text-9xl', 128],
];

/** Entrelinhas com nome. */
const ENTRELINHAS = [
  ['leading-none', 1],
  ['leading-tight', 1.25],
  ['leading-snug', 1.375],
  ['leading-normal', 1.5],
  ['leading-relaxed', 1.625],
  ['leading-loose', 2],
];

function degrauPara(px) {
  let escolhido = DEGRAUS[0][0];
  for (const [nome, valor] of DEGRAUS) {
    if (valor <= px) escolhido = nome;
  }
  // Abaixo do menor degrau não há para onde descer: fica no menor.
  return escolhido;
}

function entrelinhaPara(valor) {
  let escolhida = ENTRELINHAS[0][0];
  for (const [nome, v] of ENTRELINHAS) {
    if (v <= valor) escolhida = nome;
  }
  return escolhida;
}

function ficheiros(raiz) {
  const saida = [];
  for (const nome of readdirSync(raiz)) {
    const caminho = join(raiz, nome);
    if (statSync(caminho).isDirectory()) saida.push(...ficheiros(caminho));
    else if (/\.(tsx|ts|css)$/.test(nome)) saida.push(caminho);
  }
  return saida;
}

const aplicar = process.argv.includes('--aplicar');
const contagem = new Map();
let tocados = 0;

for (const caminho of ficheiros('src')) {
  const antes = readFileSync(caminho, 'utf8');

  const depois = antes
    .replace(/text-\[([0-9.]+)px\]/g, (_, px) => {
      const novo = degrauPara(Number(px));
      contagem.set(`${px}px → ${novo}`, (contagem.get(`${px}px → ${novo}`) ?? 0) + 1);
      return novo;
    })
    .replace(/leading-\[([0-9.]+)\]/g, (_, v) => {
      const novo = entrelinhaPara(Number(v));
      contagem.set(`${v} → ${novo}`, (contagem.get(`${v} → ${novo}`) ?? 0) + 1);
      return novo;
    });

  if (depois !== antes) {
    tocados++;
    if (aplicar) writeFileSync(caminho, depois);
  }
}

const linhas = [...contagem.entries()].sort((a, b) => b[1] - a[1]);
for (const [troca, vezes] of linhas) console.log(`  ${String(vezes).padStart(3)}x  ${troca}`);

console.log(`\n${tocados} ficheiros, ${linhas.reduce((s, [, n]) => s + n, 0)} substituições.`);
if (!aplicar) console.log('Ensaio. Para aplicar: --aplicar\n');
