import { describe, expect, it } from 'vitest';
import { CHAVES, traduzir } from '@/components/cardapio/idioma';

/**
 * As frases fixas do cardápio.
 *
 * Já foram duas tabelas, uma por língua, e o teste guardava que não
 * divergiam. Ficou uma só — o que se guarda agora é que nenhuma frase
 * fica vazia e que as variáveis são substituídas, que é o erro que
 * chega ao ecrã em forma de "Mesa {n}".
 */
describe('os textos do cardápio', () => {
  it('nenhuma frase está vazia', () => {
    for (const chave of CHAVES) {
      expect(traduzir(chave as never), chave).toBeTruthy();
    }
  });

  it('as variáveis são preenchidas', () => {
    const texto = traduzir('mesa', { n: '07' });
    expect(texto).toContain('07');
    expect(texto).not.toContain('{');
  });
});
