import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dataPorExtenso, janelaDoDiaEmLuanda, resumoDoDia } from '../src/lib/resumo';
import { assuntoResumo, htmlResumo, textoResumo } from '../src/lib/email/molde-resumo';
import type { Pedido } from '../src/lib/tipos';

function pedido(
  id: string,
  hora: string,
  itens: { nome: string; qtd: number; preco: number }[],
): Pedido {
  return {
    id,
    restaurant_id: 'r1',
    table_id: null,
    itens,
    total: itens.reduce((s, i) => s + i.qtd * i.preco, 0),
    created_at: hora,
    // O resumo do dia conta pedidos, nao estados: fica no que a base
    // poe por omissao quando um pedido cai.
    estado: 'novo',
    actualizado_em: hora,
  };
}

/** 7 de Setembro de 2026 em Luanda (UTC+1). */
const PEDIDOS: Pedido[] = [
  pedido('p1', '2026-09-07T18:42:00Z', [
    { nome: 'Muamba de Galinha', qtd: 2, preco: 4500 },
    { nome: 'Cuca 33cl', qtd: 3, preco: 600 },
  ]),
  pedido('p2', '2026-09-07T18:10:00Z', [{ nome: 'Mufete', qtd: 2, preco: 7500 }]),
  pedido('p3', '2026-09-07T12:05:00Z', [{ nome: 'Muamba de Galinha', qtd: 1, preco: 4500 }]),
];

describe('resumoDoDia', () => {
  it('soma pedidos, itens e valor', () => {
    const r = resumoDoDia(PEDIDOS);
    expect(r.pedidos).toBe(3);
    expect(r.itens).toBe(8);
    expect(r.total).toBe(9000 + 1800 + 15000 + 4500);
  });

  it('calcula a média por pedido', () => {
    const r = resumoDoDia(PEDIDOS);
    expect(r.media).toBe(Math.round(r.total / 3));
  });

  it('ordena os pratos pela quantidade', () => {
    const r = resumoDoDia(PEDIDOS);
    expect(r.top[0]).toEqual({ nome: 'Muamba de Galinha', qtd: 3, valor: 13500 });
    expect(r.top[1]).toEqual({ nome: 'Cuca 33cl', qtd: 3, valor: 1800 });
    expect(r.top[2]).toEqual({ nome: 'Mufete', qtd: 2, valor: 15000 });
  });

  it('desempata pelo valor quando a quantidade é igual', () => {
    const r = resumoDoDia(PEDIDOS);
    const muamba = r.top.findIndex((p) => p.nome === 'Muamba de Galinha');
    const cuca = r.top.findIndex((p) => p.nome === 'Cuca 33cl');
    expect(muamba).toBeLessThan(cuca);
  });

  it('corta o top no tamanho pedido', () => {
    expect(resumoDoDia(PEDIDOS, 2).top).toHaveLength(2);
  });

  it('encontra a hora de ponta em hora de Luanda', () => {
    // Dois pedidos às 19h de Luanda (18h UTC), um às 13h.
    expect(resumoDoDia(PEDIDOS).horaDePonta).toBe(19);
  });

  it('aguenta um dia sem pedidos', () => {
    const r = resumoDoDia([]);
    expect(r).toMatchObject({ pedidos: 0, itens: 0, total: 0, media: 0, horaDePonta: null });
    expect(r.top).toEqual([]);
  });

  it('ignora datas inválidas no cálculo da hora', () => {
    const r = resumoDoDia([pedido('x', 'não é data', [{ nome: 'Funge', qtd: 1, preco: 1500 }])]);
    expect(r.horaDePonta).toBeNull();
    expect(r.total).toBe(1500);
  });
});

describe('janelaDoDiaEmLuanda', () => {
  it('devolve a meia-noite de Luanda em UTC', () => {
    // 8 de Setembro, 06:00 em Luanda = 05:00 UTC.
    const { inicio, fim } = janelaDoDiaEmLuanda(0, new Date('2026-09-08T05:00:00Z'));
    expect(inicio.toISOString()).toBe('2026-09-07T23:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-09-08T23:00:00.000Z');
  });

  it('recua um dia para o email da manhã', () => {
    const { inicio, fim } = janelaDoDiaEmLuanda(1, new Date('2026-09-08T05:00:00Z'));
    expect(inicio.toISOString()).toBe('2026-09-06T23:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-09-07T23:00:00.000Z');
  });

  it('a janela de ontem apanha um pedido das 19h de Luanda', () => {
    const { inicio, fim } = janelaDoDiaEmLuanda(1, new Date('2026-09-08T05:00:00Z'));
    const doPedido = new Date('2026-09-07T18:42:00Z');
    expect(doPedido >= inicio && doPedido < fim).toBe(true);
  });

  it('a janela dura exactamente 24 horas', () => {
    const { inicio, fim } = janelaDoDiaEmLuanda(1, new Date('2026-09-08T05:00:00Z'));
    expect(fim.getTime() - inicio.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe('email do resumo', () => {
  const dados = {
    nomeRestaurante: 'Tia Bela',
    data: new Date('2026-09-07T23:00:00Z'),
    resumo: resumoDoDia(PEDIDOS),
    ligacaoPainel: 'https://cardapp.ao/painel',
  };

  it('põe os números no assunto', () => {
    expect(assuntoResumo(dados)).toContain('3 pedidos');
    expect(assuntoResumo(dados)).toContain('30.300 Kz');
  });

  it('muda o assunto quando não houve pedidos', () => {
    const vazio = { ...dados, resumo: resumoDoDia([]) };
    expect(assuntoResumo(vazio)).toContain('não entraram pedidos');
  });

  it('escreve os pratos e os valores no corpo', () => {
    const html = htmlResumo(dados);
    expect(html).toContain('Muamba de Galinha');
    expect(html).toContain('30.300 Kz');
    expect(html).toContain('https://cardapp.ao/painel');
  });

  it('escapa o nome do restaurante', () => {
    const html = htmlResumo({ ...dados, nomeRestaurante: '<script>mau()</script>' });
    expect(html).not.toContain('<script>mau()');
    expect(html).toContain('&lt;script&gt;');
  });

  it('recusa uma ligação que não seja http', () => {
    const html = htmlResumo({ ...dados, ligacaoPainel: 'javascript:roubar()' });
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="#"');
  });

  it('tem sempre versão em texto simples', () => {
    const texto = textoResumo(dados);
    expect(texto).toContain('Tia Bela');
    expect(texto).toContain('1. Muamba de Galinha');
    expect(texto.endsWith('— enviado via Cardapp')).toBe(true);
  });

  it('a versão em texto também trata o dia vazio', () => {
    const texto = textoResumo({ ...dados, resumo: resumoDoDia([]) });
    expect(texto).toContain('não entrou nenhum pedido');
  });

  it('deixa uma pré-visualização em tests/saida para se poder abrir', () => {
    mkdirSync('tests/saida', { recursive: true });
    writeFileSync('tests/saida/email-resumo.html', htmlResumo(dados));
    writeFileSync('tests/saida/email-resumo-vazio.html', htmlResumo({ ...dados, resumo: resumoDoDia([]) }));
    expect(existsSync('tests/saida/email-resumo.html')).toBe(true);
  });
});

describe('dataPorExtenso', () => {
  it('escreve em português e começa por maiúscula', () => {
    const texto = dataPorExtenso(new Date('2026-09-07T12:00:00Z'));
    expect(texto).toMatch(/^[A-ZÀ-Ú]/);
    expect(texto.toLowerCase()).toContain('setembro');
  });
});
