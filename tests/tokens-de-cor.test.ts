import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import configuracao from '../tailwind.config';

/**
 * As cores da casa, e as regras que já foram quebradas três vezes.
 *
 * 1. UMA COR USADA COM TRANSPARÊNCIA TEM DE IR EM CANAIS. Declarada como
 *    cor inteira (`var(--laranja)`), o modificador `/15` não tem onde
 *    entrar: a regra sai inválida e o browser deita-a fora sem dizer
 *    nada. Aconteceu ao creme (texto que devia ser mais apagado e
 *    aparecia aceso), ao dourado (trinta sítios, incluindo o fundo do
 *    separador activo) e ao verde (o tom dos pedidos prontos).
 *
 * 2. A OPACIDADE TEM DE EXISTIR NA ESCALA. `bg-laranja/12` não gera
 *    classe nenhuma: a escala salta de 10 para 15. Ou se usa um degrau,
 *    ou se escreve o valor entre parênteses rectos.
 *
 * 3. O CONTRASTE TEM DE PASSAR. O laranja é a cor de tudo o que importa
 *    — botões, números, avisos —, e um laranja bonito que não se lê não
 *    serve para nada.
 *
 * Nada disto se vê a olho: uma classe inválida não dá erro, não aparece
 * na consola, e o ecrã fica só um bocadinho pior.
 */

const RAIZ = process.cwd();
const config = readFileSync(path.join(RAIZ, 'tailwind.config.ts'), 'utf8');
const css = readFileSync(path.join(RAIZ, 'src/app/globals.css'), 'utf8');

/* ------------------------------------------------------------------ */
/* Contraste                                                           */
/* ------------------------------------------------------------------ */

function variavel(nome: string) {
  const achado = css.match(new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})`));
  if (!achado) throw new Error(`--${nome} não está no globals.css`);
  return achado[1];
}

function luminancia(hex: string) {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

/**
 * O ACENTO TEM DUAS ALTURAS, E É POR ISSO QUE ESTAS MEDIDAS MUDARAM.
 *
 * Com a app clara, o âmbar (`--laranja`) é cor de fundo: a letra escura
 * por cima dele lê-se a 10:1. Como letra, sobre o branco da página,
 * esse mesmo âmbar dá 1,6:1 — por isso o texto usa o tom escuro
 * (`--laranja-escuro`), e é esse que o Tailwind serve em `text-laranja`
 * (ver o `textColor` da configuração).
 *
 * Se alguém voltar a apontar o texto para o âmbar, um destes falha.
 */
describe('contraste da paleta', () => {
  it('a letra escura lê-se dentro do botão âmbar', () => {
    expect(contraste(variavel('creme'), variavel('laranja'))).toBeGreaterThanOrEqual(4.5);
  });

  it('o âmbar do rato por cima também aguenta letra escura', () => {
    expect(contraste(variavel('creme'), variavel('laranja-claro'))).toBeGreaterThanOrEqual(4.5);
  });

  it('o laranja escrito lê-se sobre a página', () => {
    // É o tom que  serve; o âmbar aqui daria 1,6.
    expect(contraste(variavel('laranja-escuro'), variavel('grafite'))).toBeGreaterThanOrEqual(4.5);
  });

  it('o laranja escrito também se lê dentro de um cartão branco', () => {
    expect(contraste(variavel('laranja-escuro'), variavel('grafite-alto'))).toBeGreaterThanOrEqual(4.5);
  });

  it('a tinta lê-se sobre a página', () => {
    expect(contraste(variavel('creme'), variavel('grafite'))).toBeGreaterThanOrEqual(4.5);
  });
});

/* ------------------------------------------------------------------ */
/* Transparências                                                      */
/* ------------------------------------------------------------------ */

/** Os degraus que o Tailwind gera sozinho. */
const ESCALA = new Set([
  '0', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50',
  '55', '60', '65', '70', '75', '80', '85', '90', '95', '100',
]);

/** Cores do Tailwind que já sabem levar transparência. */
const DE_FABRICA = new Set(['white', 'black', 'transparent', 'current', 'inherit']);

/**
 * As cores da casa, achatadas, e se cada uma aceita transparência.
 *
 * Lida da configuração a sério, e não do texto do ficheiro: a primeira
 * versão deste teste procurava o padrão com uma expressão regular, e ela
 * engolia o bloco de uma cor ao apanhar o da anterior — dava o grafite
 * por bom quando ele era exactamente o que estava partido.
 */
function coresDaCasa() {
  const mapa = new Map<string, boolean>();
  const cores = (configuracao.theme?.extend?.colors ?? {}) as Record<string, unknown>;

  for (const [nome, valor] of Object.entries(cores)) {
    if (typeof valor === 'string') {
      mapa.set(nome, valor.includes('<alpha-value>'));
      continue;
    }
    for (const [sufixo, cor] of Object.entries(valor as Record<string, string>)) {
      const chave = sufixo === 'DEFAULT' ? nome : `${nome}-${sufixo}`;
      mapa.set(chave, String(cor).includes('<alpha-value>'));
    }
  }
  return mapa;
}

function* ficheiros(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* ficheiros(p);
    else if (/\.tsx?$/.test(e.name)) yield p;
  }
}

/** Ex.: `bg-laranja/15`, `text-creme/70`, `border-verde/[0.06]`. */
const USO =
  /\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|decoration|placeholder|caret|accent)-([a-z][a-z-]*)\/(\[[^\]]+\]|[0-9]+)/g;

const usos: { ficheiro: string; token: string; opacidade: string }[] = [];
for (const f of ficheiros(path.join(RAIZ, 'src'))) {
  const texto = readFileSync(f, 'utf8');
  for (const [, token, opacidade] of texto.matchAll(USO)) {
    usos.push({ ficheiro: path.relative(RAIZ, f), token, opacidade });
  }
}

describe('transparências das cores da casa', () => {
  it('há transparências para verificar', () => {
    expect(usos.length).toBeGreaterThan(20);
  });

  it('toda a cor usada com transparência está declarada em canais', () => {
    const cores = coresDaCasa();
    const falhas = usos
      // Só as cores da casa: as do Tailwind já sabem levar transparência.
      .filter((u) => !DE_FABRICA.has(u.token) && cores.has(u.token) && !cores.get(u.token))
      .map((u) => `${u.ficheiro}: ${u.token}/${u.opacidade}`);

    expect([...new Set(falhas)]).toEqual([]);
  });

  it('toda a opacidade cai num degrau da escala, ou vai entre parênteses', () => {
    const falhas = usos
      .filter((u) => !u.opacidade.startsWith('[') && !ESCALA.has(u.opacidade))
      .map((u) => `${u.ficheiro}: ${u.token}/${u.opacidade}`);

    expect([...new Set(falhas)]).toEqual([]);
  });
});
