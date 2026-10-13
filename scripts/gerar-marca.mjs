/**
 * A marca do CardApp, gerada de uma fonte só.
 *
 *   node scripts/gerar-marca.mjs
 *
 * Daqui saem os logótipos em SVG (public/brand/) e os ícones em PNG
 * (public/), todos a partir da mesma geometria — a do guia de marca:
 * o canto de um QR que se abre num C, com o prato ao centro.
 *
 * PORQUÊ UM GERADOR, E NÃO FICHEIROS SOLTOS. A marca aparece em nove
 * sítios, em quatro tamanhos e em dois fundos. Desenhada à mão em cada
 * um, bastava mudar o raio de um canto para ficarem diferentes entre si
 * — e ninguém dá por isso até ver o ícone ao lado do logótipo. Assim há
 * um sítio onde se muda, e um comando que repõe tudo.
 *
 * O texto "CardApp" vive em `marca-palavra.js`, já em curvas: o
 * logótipo não depende de a Poppins estar instalada em lado nenhum.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const exigir = createRequire(import.meta.url);
const sharp = exigir('sharp');
const PALAVRA = exigir('./marca-palavra.js');

/* ------------------------------------------------------------------ */
/* As cores do guia                                                    */
/* ------------------------------------------------------------------ */

const AMARELO = '#FFC21A';
const TINTA = '#1C1A17';
const CREME = '#FFF6DC';
const BRANCO = '#FFFFFF';

/* ------------------------------------------------------------------ */
/* O símbolo                                                           */
/* ------------------------------------------------------------------ */

/**
 * O C, medido no guia e normalizado para uma caixa de 100×100.
 *
 * É um quadrado de cantos muito redondos com um buraco quadrado ao
 * meio, uma fenda a abrir o lado direito — é ela que transforma o
 * quadrado num C — e o prato, um ponto, no centro do buraco.
 *
 * A fenda é cortada com uma máscara, e não com `fill-rule`: com a regra
 * par-ímpar, a zona onde a fenda passa por cima do buraco contava duas
 * vezes e voltava a encher-se de tinta.
 */
const S = {
  raioExterior: 28,
  buraco: { x: 25, y: 25, lado: 50, raio: 11.5 },
  fenda: { x: 62, y: 38.2, altura: 23.6, raio: 4 },
  ponto: { cx: 50, cy: 50, r: 12.5 },
};

function simbolo({ corDoC, corDoPonto, id = 'c' }) {
  const { buraco: b, fenda: f, ponto: p } = S;
  return [
    `<mask id="${id}">`,
    `<rect width="100" height="100" rx="${S.raioExterior}" fill="#fff"/>`,
    `<rect x="${b.x}" y="${b.y}" width="${b.lado}" height="${b.lado}" rx="${b.raio}" fill="#000"/>`,
    // Passa dos 100 de propósito: assim só os cantos da esquerda
    // arredondam, e a fenda abre a direito no bordo.
    `<rect x="${f.x}" y="${f.y}" width="${100 - f.x + 10}" height="${f.altura}" rx="${f.raio}" fill="#000"/>`,
    `</mask>`,
    `<rect width="100" height="100" rx="${S.raioExterior}" fill="${corDoC}" mask="url(#${id})"/>`,
    corDoPonto ? `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="${corDoPonto}"/>` : '',
  ].join('');
}

const svgSimbolo = (opcoes) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="CardApp">${simbolo(opcoes)}</svg>\n`;

/* ------------------------------------------------------------------ */
/* O logótipo horizontal                                               */
/* ------------------------------------------------------------------ */

/**
 * O símbolo e a palavra, lado a lado.
 *
 * A palavra é desenhada a 100 de corpo e encolhida para a altura de
 * caixa alta bater com 56 % do símbolo — é a proporção do guia. O
 * espaço entre os dois é o diâmetro do prato, que é também a área de
 * protecção que o guia manda respeitar.
 */
function svgHorizontal({ corDoC, corDoPonto, corDaPalavra }) {
  const escala = (100 * 0.56) / PALAVRA.ALTURA_CAIXA_ALTA;
  const espaco = S.ponto.r * 2;
  const palavraLargura = PALAVRA.LARGURA * escala;
  const larguraTotal = 100 + espaco + palavraLargura;

  // A palavra fica com a caixa alta centrada na altura do símbolo.
  const base = 50 + (PALAVRA.ALTURA_CAIXA_ALTA * escala) / 2;
  const x = 100 + espaco - PALAVRA.ESQUERDA * escala;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${larguraTotal.toFixed(1)} 100" ` +
    `width="${larguraTotal.toFixed(1)}" height="100" role="img" aria-label="CardApp">` +
    simbolo({ corDoC, corDoPonto }) +
    `<g transform="translate(${x.toFixed(2)} ${base.toFixed(2)}) scale(${escala.toFixed(4)})">` +
    `<path d="${PALAVRA.CAMINHO}" fill="${corDaPalavra}"/>` +
    `</g></svg>\n`
  );
}

/* ------------------------------------------------------------------ */
/* Os ícones                                                           */
/* ------------------------------------------------------------------ */

/**
 * O ícone da aplicação: ladrilho amarelo, C de tinta, prato creme.
 *
 * É a aplicação que o guia mostra no ecrã inicial do telemóvel. O
 * amarelo é o que se reconhece de longe entre vinte ícones; o preto
 * sobre branco desaparecia entre eles.
 *
 * `raio` é a fracção do lado — os ícones vão com cantos redondos, menos
 * o maskable, que o Android recorta à maneira dele.
 */
function svgIcone({ raio = 0.22, margem = 0.17 } = {}) {
  const lado = 100;
  const r = (raio * lado).toFixed(2);
  const dentro = lado * (1 - margem * 2);
  const escala = dentro / 100;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" width="${lado}" height="${lado}">` +
    `<rect width="${lado}" height="${lado}" rx="${r}" fill="${AMARELO}"/>` +
    `<g transform="translate(${(lado * margem).toFixed(2)} ${(lado * margem).toFixed(2)}) scale(${escala.toFixed(4)})">` +
    simbolo({ corDoC: TINTA, corDoPonto: CREME }) +
    `</g></svg>\n`
  );
}

/* ------------------------------------------------------------------ */
/* Escrever                                                            */
/* ------------------------------------------------------------------ */

// `fileURLToPath`, e não o `pathname` do URL: a pasta tem espaços no
// nome, e por ali chegavam como %20 — os ficheiros iam parar a uma
// pasta com um nome que ninguém escreveu.
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const emPublic = (...p) => path.join(RAIZ, 'public', ...p);

function guardar(caminho, dados) {
  fs.mkdirSync(path.dirname(caminho), { recursive: true });
  fs.writeFileSync(caminho, dados);
  const kb = Math.max(1, Math.round(dados.length / 1024));
  console.log(`  ${path.relative(RAIZ, caminho).split(path.sep).join('/')}  ${kb} KB`);
}

const png = (svg, lado) =>
  sharp(Buffer.from(svg)).resize(lado, lado, { fit: 'fill' }).png({ compressionLevel: 9 }).toBuffer();

async function principal() {
  console.log('Logótipos (SVG)');
  guardar(
    emPublic('brand', 'cardapp-simbolo-primary.svg'),
    svgSimbolo({ corDoC: TINTA, corDoPonto: AMARELO }),
  );
  guardar(
    emPublic('brand', 'cardapp-simbolo-ondark.svg'),
    svgSimbolo({ corDoC: AMARELO, corDoPonto: BRANCO }),
  );
  guardar(
    emPublic('brand', 'cardapp-horizontal-primary.svg'),
    svgHorizontal({ corDoC: TINTA, corDoPonto: AMARELO, corDaPalavra: TINTA }),
  );
  guardar(
    emPublic('brand', 'cardapp-horizontal-white.svg'),
    /*
     * A versão de uma cor só, para fundos escuros: tudo branco e o
     * prato vazado. O guia manda assim — o ponto mostra o fundo que
     * estiver por trás, seja ele qual for, e por isso esta versão serve
     * em cima de uma fotografia ou de um carimbo a uma cor.
     */
    svgHorizontal({ corDoC: BRANCO, corDoPonto: null, corDaPalavra: BRANCO }),
  );

  console.log('Ícones (PNG)');
  const redondo = svgIcone({ raio: 0.22 });
  const quadrado = svgIcone({ raio: 0 });
  // O maskable leva a marca mais pequena: o Android corta até 20 % de
  // cada lado, e o que sair da zona segura desaparece no recorte.
  const maskable = svgIcone({ raio: 0, margem: 0.28 });

  guardar(emPublic('icon-192.png'), await png(redondo, 192));
  guardar(emPublic('icon-512.png'), await png(redondo, 512));
  guardar(emPublic('icon-maskable-512.png'), await png(maskable, 512));
  guardar(emPublic('apple-touch-icon.png'), await png(quadrado, 180));

  // O favicon vai em SVG (o browser escolhe-o quando sabe lê-lo) e em
  // ICO, que é o que o /favicon.ico serve a quem não sabe.
  guardar(emPublic('favicon.svg'), svgIcone({ raio: 0.22, margem: 0.14 }));
  const favicon32 = await png(svgIcone({ raio: 0.22, margem: 0.14 }), 32);
  guardar(emPublic('favicon.ico'), paraIco(favicon32));

  // Para o cartão de partilha, que é desenhado fora do browser e só
  // sabe ler imagens de pontos.
  guardar(emPublic('brand', 'cardapp-simbolo-128.png'), await png(svgSimbolo({ corDoC: TINTA, corDoPonto: AMARELO }), 128));
}

/** Um ICO com um PNG lá dentro — é o que os browsers aceitam. */
function paraIco(pngBuffer) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0);
  cabecalho.writeUInt16LE(1, 2);
  cabecalho.writeUInt16LE(1, 4);

  const entrada = Buffer.alloc(16);
  entrada[0] = 32;
  entrada[1] = 32;
  entrada.writeUInt16LE(1, 4);
  entrada.writeUInt16LE(32, 6);
  entrada.writeUInt32LE(pngBuffer.length, 8);
  entrada.writeUInt32LE(22, 12);

  return Buffer.concat([cabecalho, entrada, pngBuffer]);
}

principal();
