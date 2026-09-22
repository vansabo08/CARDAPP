import { describe, expect, it } from 'vitest';
import { CHAVES, TEXTOS, em, traduzir } from '@/components/cardapio/idioma';

describe('o cardápio em duas línguas', () => {
  it('o inglês tem exactamente as mesmas frases que o português', () => {
    expect([...CHAVES.en].sort()).toEqual([...CHAVES.pt].sort());
  });

  it('nenhuma frase fica vazia em nenhuma das línguas', () => {
    for (const idioma of ['pt', 'en'] as const) {
      for (const [chave, texto] of Object.entries(TEXTOS[idioma])) {
        const valor = texto;
        expect(valor, `${idioma}.${chave}`).toBeTruthy();
      }
    }
  });

  it('um texto da casa sem inglês cai para o português', () => {
    expect(em('en', 'Muamba de Galinha', null)).toBe('Muamba de Galinha');
    expect(em('en', 'Muamba de Galinha', '   ')).toBe('Muamba de Galinha');
    expect(em('en', 'Muamba de Galinha', 'Chicken Muamba')).toBe('Chicken Muamba');
  });

  it('em português, o inglês nunca aparece', () => {
    expect(em('pt', 'Muamba de Galinha', 'Chicken Muamba')).toBe('Muamba de Galinha');
  });

  it('uma descrição que não existe continua a não existir', () => {
    expect(em('en', null, null)).toBeNull();
  });

  it('as frases fixas mudam com a língua', () => {
    expect(traduzir('en', 'pedirConta')).not.toBe(traduzir('pt', 'pedirConta'));
  });
});
