import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gerarCartoesPdf, urlDaMesa } from '../src/lib/cartoes-pdf';
import { MESAS_DEMO, RESTAURANTE_DEMO } from '../src/data/demo';

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
