import { describe, expect, it } from 'vitest';
import { categoriaActiva, type TopoDeSeccao } from '../src/lib/cardapio';

/**
 * Geometria tirada do cardápio real da Tia Bela, com a barra fixa a
 * ocupar 79px e uma folga de 12px — o `limite` é 91.
 */
const LIMITE = 91;

function seccoes(...topos: number[]): TopoDeSeccao[] {
  const nomes = ['entradas', 'principais', 'grelhados', 'bebidas', 'sobremesas'];
  return topos.map((topo, i) => ({ id: nomes[i], topo }));
}

describe('categoriaActiva', () => {
  it('fica na primeira antes de haver scroll', () => {
    expect(categoriaActiva(seccoes(300, 900, 1500, 2100, 2600), LIMITE)).toBe('entradas');
  });

  it('muda quando o topo da secção passa por baixo da barra', () => {
    // "principais" ainda está 2px abaixo do limite
    expect(categoriaActiva(seccoes(-400, 93, 700, 1300, 1800), LIMITE)).toBe('entradas');
    // e agora já passou
    expect(categoriaActiva(seccoes(-400, 90, 700, 1300, 1800), LIMITE)).toBe('principais');
  });

  it('escolhe a última que passou, não a primeira visível', () => {
    // Este é o caso que estava errado em produção: com secções de
    // alturas diferentes, apanhava-se uma que ainda vinha a caminho.
    const r = categoriaActiva(seccoes(-1246, -821, -247, 204, 728), LIMITE);
    expect(r).toBe('grelhados');
  });

  it('acompanha até ao fundo', () => {
    expect(categoriaActiva(seccoes(-2400, -1900, -1300, -700, -120), LIMITE)).toBe('sobremesas');
  });

  it('trata o topo exactamente no limite como já passado', () => {
    expect(categoriaActiva(seccoes(-400, 91, 900, 1400, 1900), LIMITE)).toBe('principais');
  });

  it('no fim da página vale sempre a última, mesmo que curta', () => {
    // "sobremesas" tem duas linhas e nunca chega a subir até ao limite
    const antes = categoriaActiva(seccoes(-3000, -2400, -1800, -1000, 400), LIMITE);
    expect(antes).toBe('bebidas');

    const noFim = categoriaActiva(seccoes(-3000, -2400, -1800, -1000, 400), LIMITE, true);
    expect(noFim).toBe('sobremesas');
  });

  it('aguenta uma lista vazia', () => {
    expect(categoriaActiva([], LIMITE)).toBe('');
  });

  it('com uma só categoria devolve-a sempre', () => {
    expect(categoriaActiva(seccoes(900), LIMITE)).toBe('entradas');
    expect(categoriaActiva(seccoes(-900), LIMITE)).toBe('entradas');
  });
});
