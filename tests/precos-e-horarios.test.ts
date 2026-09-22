import { describe, expect, it } from 'vitest';
import {
  contarLinha,
  descontoEmPercentagem,
  precoDeMontra,
  promocaoActiva,
  temEscolhasObrigatorias,
} from '@/lib/precos';
import {
  agoraEmLuanda,
  categoriasDeAgora,
  descreverDias,
  menuActivo,
} from '@/lib/horarios';
import type { CategoriaComPratos, MenuHorario, Prato } from '@/lib/tipos';

/**
 * O preço de um prato com opções, e o horário dos cardápios.
 *
 * O preço é calculado duas vezes: no telemóvel, para mostrar, e no
 * servidor, para gravar. É a mesma função — estes testes são o que a
 * impede de mudar sem ninguém dar por isso.
 */

// Segunda-feira, 21 de Setembro de 2026, 13:00 em Luanda (12:00 UTC).
const SEGUNDA_13H = Date.parse('2026-09-21T12:00:00Z');

const muamba: Prato = {
  id: 'p1',
  category_id: 'c1',
  nome: 'Muamba',
  descricao: null,
  preco: 4000,
  foto_url: null,
  disponivel: true,
  ordem: 0,
  grupos: [
    {
      id: 'g-tam',
      nome: 'Tamanho',
      tipo: 'variante',
      minimo: 1,
      maximo: 1,
      ordem: 0,
      opcoes: [
        { id: 'pequeno', nome: 'Pequeno', preco: 3000, disponivel: true, ordem: 0 },
        { id: 'grande', nome: 'Grande', preco: 5000, disponivel: true, ordem: 1 },
        { id: 'familia', nome: 'Família', preco: 9000, disponivel: false, ordem: 2 },
      ],
    },
    {
      id: 'g-ext',
      nome: 'Extras',
      tipo: 'extra',
      minimo: 0,
      maximo: 2,
      ordem: 1,
      opcoes: [
        { id: 'queijo', nome: 'Queijo', preco: 500, disponivel: true, ordem: 0 },
        { id: 'ovo', nome: 'Ovo', preco: 300, disponivel: true, ordem: 1 },
        { id: 'banana', nome: 'Banana', preco: 400, disponivel: true, ordem: 2 },
      ],
    },
  ],
};

const simples: Prato = { ...muamba, id: 'p2', grupos: [] };

describe('o preço de uma linha', () => {
  it('sem opções é o preço do prato', () => {
    expect(contarLinha(simples, [], SEGUNDA_13H)).toEqual({ ok: true, unitario: 4000, opcoes: [] });
  });

  it('com tamanho é o preço do tamanho, e os extras somam', () => {
    const conta = contarLinha(muamba, ['grande', 'queijo', 'ovo'], SEGUNDA_13H);
    expect(conta.ok && conta.unitario).toBe(5000 + 500 + 300);
    expect(conta.ok && conta.opcoes.map((o) => o.nome)).toEqual(['Grande', 'Queijo', 'Ovo']);
  });

  it('o tamanho é obrigatório', () => {
    expect(contarLinha(muamba, ['queijo'], SEGUNDA_13H)).toMatchObject({ ok: false, codigo: 'escolha', erro: 'Escolha tamanho.' });
  });

  it('não passa do máximo de extras', () => {
    const conta = contarLinha(muamba, ['pequeno', 'queijo', 'ovo', 'banana'], SEGUNDA_13H);
    expect(conta.ok).toBe(false);
  });

  it('dois tamanhos ao mesmo tempo não', () => {
    expect(contarLinha(muamba, ['pequeno', 'grande'], SEGUNDA_13H).ok).toBe(false);
  });

  it('um tamanho esgotado não se pede', () => {
    expect(contarLinha(muamba, ['familia'], SEGUNDA_13H).ok).toBe(false);
  });

  it('uma opção de outro prato é recusada — é o que o servidor tem de travar', () => {
    expect(contarLinha(simples, ['queijo'], SEGUNDA_13H).ok).toBe(false);
    expect(contarLinha(muamba, ['grande', 'inventada'], SEGUNDA_13H).ok).toBe(false);
  });

  it('sabe quando o prato pede escolhas antes de ir para o carrinho', () => {
    expect(temEscolhasObrigatorias(muamba)).toBe(true);
    expect(temEscolhasObrigatorias(simples)).toBe(false);
  });
});

describe('a promoção', () => {
  const emPromo: Prato = {
    ...muamba,
    preco_promocional: 3200,
    promo_inicio: '2026-09-20T00:00:00Z',
    promo_fim: '2026-09-23T00:00:00Z',
  };

  it('só conta dentro das datas', () => {
    expect(promocaoActiva(emPromo, SEGUNDA_13H)).toBe(true);
    expect(promocaoActiva(emPromo, Date.parse('2026-09-19T12:00:00Z'))).toBe(false);
    expect(promocaoActiva(emPromo, Date.parse('2026-09-23T00:00:00Z'))).toBe(false);
  });

  it('acaba sozinha: no dia seguinte ao fim, o preço volta', () => {
    const depois = Date.parse('2026-09-24T12:00:00Z');
    const conta = contarLinha({ ...emPromo, grupos: [] }, [], depois);
    expect(conta.ok && conta.unitario).toBe(4000);
  });

  it('o selo diz o desconto: 3 200 sobre 4 000 é -20%', () => {
    expect(descontoEmPercentagem(emPromo)).toBe(20);
  });

  it('desconta o tamanho na mesma proporção, mas não os extras', () => {
    const conta = contarLinha(emPromo, ['grande', 'queijo'], SEGUNDA_13H);
    // Grande: 5 000 × 0,8 = 4 000; o queijo fica a 500.
    expect(conta.ok && conta.unitario).toBe(4500);
  });

  it('um preço de promoção maior do que o normal não é promoção', () => {
    expect(promocaoActiva({ ...emPromo, preco_promocional: 5000 }, SEGUNDA_13H)).toBe(false);
  });

  it('na lista mostra "desde" o tamanho mais barato, com o preço de antes riscado', () => {
    expect(precoDeMontra(emPromo, SEGUNDA_13H)).toEqual({ desde: true, agora: 2400, antes: 3000 });
    expect(precoDeMontra(simples, SEGUNDA_13H)).toEqual({ desde: false, agora: 4000, antes: null });
  });
});

describe('a hora de Luanda', () => {
  it('é UTC+1, seja qual for o fuso do aparelho', () => {
    expect(agoraEmLuanda(SEGUNDA_13H)).toEqual({ dia: 1, minutos: 13 * 60 });
  });

  it('às 23:30 UTC de domingo já é segunda em Luanda', () => {
    expect(agoraEmLuanda(Date.parse('2026-09-20T23:30:00Z')).dia).toBe(1);
  });
});

describe('os menus por horário', () => {
  const almoco: MenuHorario = { id: 'a', nome: 'Almoço', hora_inicio: '12:00:00', hora_fim: '15:00:00', dias: [1, 2, 3, 4, 5], ordem: 0 };
  const noite: MenuHorario = { id: 'n', nome: 'Noite', hora_inicio: '20:00', hora_fim: '02:00', dias: [5], ordem: 1 };

  it('o almoço serve à segunda às 13:00 e não às 15:00 em ponto', () => {
    expect(menuActivo(almoco, SEGUNDA_13H)).toBe(true);
    expect(menuActivo(almoco, Date.parse('2026-09-21T14:00:00Z'))).toBe(false);
  });

  it('o almoço de dias úteis não serve ao domingo', () => {
    expect(menuActivo(almoco, Date.parse('2026-09-20T12:00:00Z'))).toBe(false);
  });

  it('a noite de sexta atravessa a meia-noite e ainda serve à 01:00 de sábado', () => {
    // Sábado 26, 01:00 em Luanda = sexta 25, 00:00 UTC.
    expect(menuActivo(noite, Date.parse('2026-09-26T00:00:00Z'))).toBe(true);
    // Sábado 26, 21:00 em Luanda: a noite é só de sexta.
    expect(menuActivo(noite, Date.parse('2026-09-26T20:00:00Z'))).toBe(false);
  });

  it('uma categoria sem horário aparece sempre; uma com horário, só dentro dele', () => {
    const categorias = [
      { id: 'bebidas', restaurant_id: 'r', nome: 'Bebidas', ordem: 0, menu_id: null, itens: [] },
      { id: 'pratos', restaurant_id: 'r', nome: 'Pratos', ordem: 1, menu_id: 'a', itens: [] },
      { id: 'orfa', restaurant_id: 'r', nome: 'Órfã', ordem: 2, menu_id: 'apagado', itens: [] },
    ] satisfies CategoriaComPratos[];

    const aoDomingo = categoriasDeAgora(categorias, [almoco], Date.parse('2026-09-20T12:00:00Z'));
    expect(aoDomingo.map((c) => c.id)).toEqual(['bebidas', 'orfa']);
    expect(categoriasDeAgora(categorias, [almoco], SEGUNDA_13H).map((c) => c.id)).toEqual(['bebidas', 'pratos', 'orfa']);
  });

  it('descreve os dias como se fala', () => {
    expect(descreverDias([1, 2, 3, 4, 5])).toBe('seg a sex');
    expect(descreverDias([0, 1, 2, 3, 4, 5, 6])).toBe('todos os dias');
    expect(descreverDias([0, 6])).toBe('dom, sáb');
  });
});
