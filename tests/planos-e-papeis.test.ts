import { readdirSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FUNCIONALIDADES_DO_PLANO,
  PLANOS,
  limiteDeMembros,
  type Funcionalidade,
} from '@/config/planos';
import { APRESENTACAO, ligacaoParaAbrir, temFuncionalidade } from '@/lib/funcionalidades';
import {
  PAPEIS_DE_MEMBRO,
  areaDoCaminho,
  paginaInicial,
  podeEntrar,
  podeGerirEquipa,
  type Area,
  type Papel,
} from '@/lib/papeis';

/**
 * O que cada plano abre, e onde cada papel entra.
 *
 * São duas tabelas pequenas de que depende muita coisa: o menu, a porta
 * de cada página (o middleware) e o cartão de upgrade. Um engano aqui
 * não parte nada à vista — dá de graça o que se vende, ou mostra a um
 * empregado o plano e a faturação da casa.
 */

const TODAS = Object.keys(APRESENTACAO) as Funcionalidade[];
const PAPEIS: Papel[] = ['dono', 'gerente', 'empregado', 'cozinha'];

describe('o que cada plano abre', () => {
  it('o Mesa não abre nenhuma funcionalidade do Sala', () => {
    for (const f of TODAS) expect(temFuncionalidade({ plano: 'mesa' }, f), f).toBe(false);
  });

  it('o Sala abre todas', () => {
    for (const f of TODAS) expect(temFuncionalidade({ plano: 'sala' }, f), f).toBe(true);
  });

  it('sem casa, nada', () => {
    expect(temFuncionalidade(null, 'equipa')).toBe(false);
    expect(temFuncionalidade(undefined, 'equipa')).toBe(false);
  });

  it('toda a funcionalidade vendida tem o que dizer no cartão de upgrade', () => {
    for (const f of FUNCIONALIDADES_DO_PLANO.sala) {
      expect(APRESENTACAO[f]?.nome, f).toBeTruthy();
      expect(APRESENTACAO[f]?.frase, f).toBeTruthy();
    }
  });

  it('o cartão manda comprar o Sala na Kursinha', () => {
    expect(ligacaoParaAbrir('equipa')).toBe(PLANOS.sala.link);
    expect(PLANOS.sala.link).toMatch(/^https:\/\/pay\.kursinha\.com\//);
  });
});

describe('quantas pessoas cabem na equipa', () => {
  const antes = process.env.LIMITE_MEMBROS_SALA;
  afterEach(() => {
    if (antes === undefined) delete process.env.LIMITE_MEMBROS_SALA;
    else process.env.LIMITE_MEMBROS_SALA = antes;
  });

  it('o Mesa não tem equipa', () => {
    expect(limiteDeMembros('mesa')).toBe(0);
  });

  it('o Sala tem oito lugares por omissão', () => {
    delete process.env.LIMITE_MEMBROS_SALA;
    expect(limiteDeMembros('sala')).toBe(8);
  });

  it('o ambiente muda o limite do Sala sem mexer no código', () => {
    process.env.LIMITE_MEMBROS_SALA = '15';
    expect(limiteDeMembros('sala')).toBe(15);
  });

  it('um valor estragado no ambiente não abre lugares infinitos', () => {
    process.env.LIMITE_MEMBROS_SALA = 'muitos';
    expect(limiteDeMembros('sala')).toBe(8);
  });
});

describe('onde cada papel entra', () => {
  const esperado: Record<Papel, Area[]> = {
    dono: ['resumo', 'pedidos', 'salao', 'mesas', 'cardapio', 'relatorios', 'avaliacoes', 'equipa', 'definicoes', 'pagar'],
    gerente: ['resumo', 'pedidos', 'salao', 'mesas', 'cardapio', 'relatorios', 'avaliacoes', 'equipa'],
    empregado: ['pedidos', 'salao'],
    cozinha: ['pedidos'],
  };
  const areas: Area[] = esperado.dono;

  it.each(PAPEIS)('%s entra exactamente onde deve', (papel) => {
    const entra = areas.filter((a) => podeEntrar(papel, a));
    expect(entra).toEqual(esperado[papel]);
  });

  it('só o dono vê o plano, a faturação e as definições da conta', () => {
    for (const papel of PAPEIS) {
      const devia = papel === 'dono';
      expect(podeEntrar(papel, 'pagar'), papel).toBe(devia);
      expect(podeEntrar(papel, 'definicoes'), papel).toBe(devia);
    }
  });

  it('só o dono e o gerente mexem na equipa', () => {
    expect(PAPEIS.filter(podeGerirEquipa)).toEqual(['dono', 'gerente']);
  });

  it('não há papel de dono para dar num convite', () => {
    expect(PAPEIS_DE_MEMBRO).not.toContain('dono');
  });

  it.each(PAPEIS)('a página inicial de %s é uma página onde pode entrar', (papel) => {
    // Se não fosse, o middleware mandava-o para lá, a porta fechava-se,
    // e mandava-o outra vez: um redireccionamento sem fim.
    const area = areaDoCaminho(paginaInicial(papel));
    expect(area).not.toBeNull();
    expect(podeEntrar(papel, area!)).toBe(true);
  });
});

describe('a área de cada caminho', () => {
  it('conhece as páginas do painel', () => {
    expect(areaDoCaminho('/painel')).toBe('resumo');
    expect(areaDoCaminho('/painel/pedidos')).toBe('pedidos');
    expect(areaDoCaminho('/painel/equipa')).toBe('equipa');
    expect(areaDoCaminho('/painel/definicoes')).toBe('definicoes');
  });

  it('um prefixo parecido não conta: /painel/pedidosx não é /painel/pedidos', () => {
    expect(areaDoCaminho('/painel/pedidosx')).toBe('resumo');
  });

  it('fora do painel não há área', () => {
    expect(areaDoCaminho('/')).toBeNull();
    expect(areaDoCaminho('/painelx')).toBeNull();
    expect(areaDoCaminho('/tia-bela')).toBeNull();
  });

  it('uma página do painel por registar fica fechada à sala e à cozinha', () => {
    const area = areaDoCaminho('/painel/uma-pagina-nova');
    expect(podeEntrar('empregado', area!)).toBe(false);
    expect(podeEntrar('cozinha', area!)).toBe(false);
  });

  it('toda a página que existe no painel está registada', () => {
    // A regra de cima é a rede; esta é a obrigação. Uma página nova sem
    // registo cai no "resumo" e fecha-se a quem devia entrar.
    const pasta = path.join(process.cwd(), 'src/app/painel');
    const paginas = readdirSync(pasta, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    for (const pagina of paginas) {
      const area = areaDoCaminho(`/painel/${pagina}`);
      expect(area, pagina).not.toBe('resumo');
    }
  });
});
