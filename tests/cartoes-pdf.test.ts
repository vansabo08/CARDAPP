import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gerarCartoesPdf, urlDaMesa } from '../src/lib/cartoes-pdf';
import { MESAS_DEMO, RESTAURANTE_DEMO } from '../src/data/demo';
import { nomeDaMesa } from '../src/lib/format';

const BASE = 'https://cardapp.ao';

describe('urlDaMesa', () => {
  it('aponta para o cardápio com o número da mesa', () => {
    expect(urlDaMesa('tia-bela', 7, BASE)).toBe('https://cardapp.ao/tia-bela?mesa=7');
  });

  it('não duplica a barra final do domínio', () => {
    expect(urlDaMesa('tia-bela', 1, 'https://cardapp.ao/')).toBe('https://cardapp.ao/tia-bela?mesa=1');
  });
});

describe('gerarCartoesPdf', () => {
  it('produz um PDF com seis cartões por página', async () => {
    const blob = await gerarCartoesPdf(RESTAURANTE_DEMO, MESAS_DEMO, BASE);
    const texto = await blob.text();

    expect(blob.type).toBe('application/pdf');
    expect(texto.startsWith('%PDF')).toBe(true);

    // 12 mesas, 6 por página → 2 páginas
    const paginas = texto.match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(paginas).toHaveLength(2);

    // Guardado para se poder abrir e conferir a folha impressa.
    mkdirSync('tests/saida', { recursive: true });
    writeFileSync('tests/saida/cartoes-mesa.pdf', Buffer.from(await blob.arrayBuffer()));
  }, 30000);

  it('cabe numa página quando há poucas mesas', async () => {
    const blob = await gerarCartoesPdf(RESTAURANTE_DEMO, MESAS_DEMO.slice(0, 6), BASE);
    const texto = await blob.text();
    const paginas = texto.match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(paginas).toHaveLength(1);
  }, 30000);
});

/* ------------------------------------------------------------------ */
/* O nome da mesa                                                      */
/* ------------------------------------------------------------------ */

describe('nomeDaMesa', () => {
  it('usa o nome que a casa deu', () => {
    expect(nomeDaMesa({ numero: 12, nome: 'Esplanada 1' })).toBe('Esplanada 1');
  });

  it('sem nome, continua a ser o número com dois dígitos', () => {
    expect(nomeDaMesa({ numero: 7 })).toBe('Mesa 07');
    expect(nomeDaMesa({ numero: 7, nome: null })).toBe('Mesa 07');
    // Um nome só com espaços é o mesmo que nome nenhum.
    expect(nomeDaMesa({ numero: 7, nome: '   ' })).toBe('Mesa 07');
  });

  it('aceita só o número, para quem já não tem a mesa à mão', () => {
    // O pedido guarda a mesa como um inteiro, e não a linha inteira.
    expect(nomeDaMesa(3)).toBe('Mesa 03');
  });
});

describe('o cartão impresso', () => {
  it('leva o nome da mesa, quando ela tem um', async () => {
    const baptizadas = MESAS_DEMO.slice(0, 2).map((mesa, i) =>
      i === 0 ? { ...mesa, nome: 'Esplanada 1' } : mesa,
    );

    const texto = await (await gerarCartoesPdf(RESTAURANTE_DEMO, baptizadas, BASE)).text();

    // O jsPDF escreve o texto no fluxo sem comprimir, letra a letra.
    expect(texto).toContain('Esplanada 1');
    expect(texto).toContain('Mesa 02');
  });
});
