import { describe, expect, it } from 'vitest';
import { formatarKz, normalizarWhatsApp, whatsAppValido } from '../src/lib/format';
import {
  LARGURA_LINHA,
  alinhar,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  totalDoPedido,
} from '../src/lib/whatsapp';
import type { PedidoParaMensagem } from '../src/lib/tipos';

/** 19:42 em Luanda (UTC+1). */
const HORA = new Date('2026-09-07T18:42:00Z');

const pedidoExemplo: PedidoParaMensagem = {
  restaurante: 'Tia Bela',
  mesa: 7,
  data: HORA,
  itens: [
    { nome: 'Muamba de Galinha', qtd: 2, preco: 4500 },
    { nome: 'Calulu de Peixe', qtd: 1, preco: 5500, obs: 'sem piripiri' },
    { nome: 'Cuca 33cl', qtd: 3, preco: 600 },
  ],
};

describe('formatarKz', () => {
  it('usa o ponto como separador de milhares', () => {
    expect(formatarKz(900)).toBe('900 Kz');
    expect(formatarKz(1800)).toBe('1.800 Kz');
    expect(formatarKz(9000)).toBe('9.000 Kz');
    expect(formatarKz(16300)).toBe('16.300 Kz');
    expect(formatarKz(1234567)).toBe('1.234.567 Kz');
  });

  it('so mostra centimos quando existem', () => {
    expect(formatarKz(4500)).toBe('4.500 Kz');
    expect(formatarKz(4500.5)).toBe('4.500,50 Kz');
    expect(formatarKz(4500.05)).toBe('4.500,05 Kz');
  });

  it('trata o zero e os negativos', () => {
    expect(formatarKz(0)).toBe('0 Kz');
    expect(formatarKz(-1500)).toBe('-1.500 Kz');
    expect(formatarKz(2500, { comSufixo: false })).toBe('2.500');
  });
});

describe('alinhar', () => {
  it('preenche ate a largura fixa da coluna', () => {
    const linha = alinhar('2x Muamba de Galinha', '9.000 Kz');
    expect(linha).toBe('2x Muamba de Galinha ......... 9.000 Kz');
    expect(linha.length).toBe(LARGURA_LINHA);
  });

  it('mantem os precos na mesma coluna para rotulos de tamanhos diferentes', () => {
    const curto = alinhar('3x Cuca 33cl', '1.800 Kz');
    const longo = alinhar('1x Calulu de Peixe', '5.500 Kz');
    expect(curto.length).toBe(LARGURA_LINHA);
    expect(longo.length).toBe(LARGURA_LINHA);
    expect(curto.indexOf('1.800 Kz')).toBe(longo.indexOf('5.500 Kz'));
  });

  it('nao corta nomes compridos, garante apenas dois pontos de separacao', () => {
    const linha = alinhar('2x Camarao Grelhado com Funge de Bombo', '24.000 Kz');
    expect(linha).toContain('Camarao Grelhado com Funge de Bombo');
    expect(linha).toContain(' .. ');
  });
});

describe('buildWhatsAppMessage', () => {
  it('produz exactamente o formato acordado', () => {
    const esperado = [
      '🍽 NOVO PEDIDO — Mesa 07',
      'Tia Bela · 19:42',
      '',
      '▪️ 2x Muamba de Galinha ......... 9.000 Kz',
      '▪️ 1x Calulu de Peixe ........... 5.500 Kz',
      '   ↳ sem piripiri',
      '▪️ 3x Cuca 33cl ................. 1.800 Kz',
      '',
      'TOTAL ....................... 16.300 Kz',
      'Pagamento: na mesa',
      '',
      '— enviado via Cardapp',
    ].join('\n');

    expect(buildWhatsAppMessage(pedidoExemplo)).toBe(esperado);
  });

  it('da a todas as linhas de item a mesma largura de coluna', () => {
    const marcador = '▪️ '.length;
    const linhasItem = buildWhatsAppMessage(pedidoExemplo)
      .split('\n')
      .filter((l) => l.startsWith('▪️'));

    expect(linhasItem).toHaveLength(3);
    for (const linha of linhasItem) {
      expect(linha.length).toBe(LARGURA_LINHA + marcador);
    }
  });

  it('escreve o TOTAL na mesma largura de coluna', () => {
    const linhaTotal = buildWhatsAppMessage(pedidoExemplo)
      .split('\n')
      .find((l) => l.startsWith('TOTAL'))!;
    expect(linhaTotal.length).toBe(LARGURA_LINHA);
  });

  it('mostra o preco da linha, nao o unitario', () => {
    expect(buildWhatsAppMessage(pedidoExemplo)).toContain('2x Muamba de Galinha ......... 9.000 Kz');
  });

  it('omite a linha de observacao quando nao ha observacao', () => {
    const msg = buildWhatsAppMessage({
      restaurante: 'Tia Bela',
      mesa: 7,
      data: HORA,
      itens: [{ nome: 'Funge de Bombo', qtd: 1, preco: 1500 }],
    });
    expect(msg).not.toContain('↳');
  });

  it('ignora observacoes vazias ou so com espacos', () => {
    const msg = buildWhatsAppMessage({
      restaurante: 'Tia Bela',
      mesa: 7,
      data: HORA,
      itens: [{ nome: 'Mufete', qtd: 1, preco: 7500, obs: '   ' }],
    });
    expect(msg).not.toContain('↳');
  });

  it('escreve uma observacao por cada item que a tenha', () => {
    const msg = buildWhatsAppMessage({
      restaurante: 'Tia Bela',
      mesa: 3,
      data: HORA,
      itens: [
        { nome: 'Mufete', qtd: 1, preco: 7500, obs: 'sem cebola' },
        { nome: 'Cuca 33cl', qtd: 2, preco: 600, obs: 'bem gelada' },
      ],
    });
    expect(msg).toContain('   ↳ sem cebola');
    expect(msg).toContain('   ↳ bem gelada');
    expect(msg.match(/↳/g)).toHaveLength(2);
  });

  it('acrescenta zero a esquerda no numero da mesa', () => {
    const msg = buildWhatsAppMessage({ ...pedidoExemplo, mesa: 3 });
    expect(msg.startsWith('🍽 NOVO PEDIDO — Mesa 03')).toBe(true);
  });

  it('nao acrescenta zero em mesas de dois digitos', () => {
    const msg = buildWhatsAppMessage({ ...pedidoExemplo, mesa: 14 });
    expect(msg.startsWith('🍽 NOVO PEDIDO — Mesa 14')).toBe(true);
  });

  it('trata o pedido sem mesa como Balcao', () => {
    const msg = buildWhatsAppMessage({ ...pedidoExemplo, mesa: null });
    expect(msg.startsWith('🍽 NOVO PEDIDO — Balcão')).toBe(true);
  });

  it('soma o total quando nao vem dado', () => {
    expect(buildWhatsAppMessage(pedidoExemplo)).toContain('16.300 Kz');
    expect(totalDoPedido(pedidoExemplo.itens)).toBe(16300);
  });

  it('respeita um total ja calculado', () => {
    const msg = buildWhatsAppMessage({ ...pedidoExemplo, total: 20000 });
    expect(msg).toContain('20.000 Kz');
  });

  it('permite outra forma de pagamento', () => {
    const msg = buildWhatsAppMessage({ ...pedidoExemplo, pagamento: 'Multicaixa Express' });
    expect(msg).toContain('Pagamento: Multicaixa Express');
  });

  it('assina sempre no fim', () => {
    expect(buildWhatsAppMessage(pedidoExemplo).endsWith('— enviado via Cardapp')).toBe(true);
  });
});

describe('buildWhatsAppUrl', () => {
  it('normaliza o numero e codifica a mensagem', () => {
    const url = buildWhatsAppUrl('+244 923 456 789', pedidoExemplo);
    expect(url.startsWith('https://wa.me/244923456789?text=')).toBe(true);
    expect(url).not.toContain(' ');
    expect(decodeURIComponent(url.split('?text=')[1])).toBe(buildWhatsAppMessage(pedidoExemplo));
  });
});

describe('numeros de WhatsApp angolanos', () => {
  it('aceita as formas habituais de escrever', () => {
    expect(normalizarWhatsApp('923456789')).toBe('244923456789');
    expect(normalizarWhatsApp('+244 923 456 789')).toBe('244923456789');
    expect(normalizarWhatsApp('00244923456789')).toBe('244923456789');
    expect(normalizarWhatsApp('244-923-456-789')).toBe('244923456789');
  });

  it('valida o formato 244 seguido de nove digitos', () => {
    expect(whatsAppValido('923456789')).toBe(true);
    expect(whatsAppValido('+244 923 456 789')).toBe(true);
    expect(whatsAppValido('12345')).toBe(false);
    expect(whatsAppValido('244123456789')).toBe(false);
  });
});
