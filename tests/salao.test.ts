import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HORAS_ATE_ESQUECER,
  haQuantoTempo,
  minutosDesde,
  montarSalao,
  resumoDaConta,
  totalDaSessao,
  type LinhaPedido,
  type LinhaSessao,
} from '@/lib/salao';

/**
 * As contas do salão.
 *
 * O total de uma mesa e a conta que se entrega ao cliente são os únicos
 * números do CardApp que alguém paga à frente de quem os leu. Um erro
 * aqui não é um gráfico torto: é um cliente a discutir a conta.
 */

const AGORA = Date.parse('2026-09-21T13:00:00Z');
const ha = (min: number) => new Date(AGORA - min * 60_000).toISOString();

describe('o total da mesa', () => {
  it('soma os pedidos', () => {
    expect(totalDaSessao([{ total: 1200, estado: 'entregue' }, { total: 9000, estado: 'preparar' }])).toBe(10200);
  });

  it('um pedido cancelado não se cobra', () => {
    expect(totalDaSessao([{ total: 1200, estado: 'entregue' }, { total: 9000, estado: 'cancelado' }])).toBe(1200);
  });

  it('um pedido ainda por preparar conta — o cliente vai comê-lo', () => {
    expect(totalDaSessao([{ total: 4500, estado: 'novo' }])).toBe(4500);
  });

  it('não deixa lixo de vírgula flutuante', () => {
    expect(totalDaSessao([{ total: 0.1, estado: 'novo' }, { total: 0.2, estado: 'novo' }])).toBe(0.3);
  });
});

describe('a conta entregue ao cliente', () => {
  it('o mesmo prato ao mesmo preço é uma linha só, com a quantidade somada', () => {
    const { linhas, total } = resumoDaConta([
      { estado: 'entregue', itens: [{ nome: 'Cuca 33cl', qtd: 2, preco: 600, obs: null }] },
      { estado: 'entregue', itens: [{ nome: 'Cuca 33cl', qtd: 1, preco: 600, obs: null }] },
    ]);
    expect(linhas).toEqual([{ nome: 'Cuca 33cl', obs: null, qtd: 3, preco: 600, subtotal: 1800 }]);
    expect(total).toBe(1800);
  });

  it('observações diferentes ficam em linhas diferentes', () => {
    const { linhas } = resumoDaConta([
      {
        estado: 'entregue',
        itens: [
          { nome: 'Mufete', qtd: 1, preco: 7500, obs: 'sem cebola' },
          { nome: 'Mufete', qtd: 1, preco: 7500, obs: null },
        ],
      },
    ]);
    expect(linhas).toHaveLength(2);
  });

  it('o que foi cancelado não aparece na conta', () => {
    const { linhas, total } = resumoDaConta([
      { estado: 'cancelado', itens: [{ nome: 'Mufete', qtd: 1, preco: 7500, obs: null }] },
      { estado: 'entregue', itens: [{ nome: 'Kitaba', qtd: 1, preco: 1800, obs: null }] },
    ]);
    expect(linhas.map((l) => l.nome)).toEqual(['Kitaba']);
    expect(total).toBe(1800);
  });

  it('a conta bate com o total da mesa', () => {
    const pedidos = [
      { estado: 'entregue' as const, total: 3000, itens: [{ nome: 'A', qtd: 2, preco: 1500, obs: null }] },
      { estado: 'novo' as const, total: 700, itens: [{ nome: 'B', qtd: 1, preco: 700, obs: null }] },
      { estado: 'cancelado' as const, total: 999, itens: [{ nome: 'C', qtd: 1, preco: 999, obs: null }] },
    ];
    expect(resumoDaConta(pedidos).total).toBe(totalDaSessao(pedidos));
  });
});

describe('o salão montado', () => {
  const mesas = [
    { id: 'm2', numero: 2 },
    { id: 'm1', numero: 1 },
    { id: 'm3', numero: 3 },
  ];
  const sessoes: LinhaSessao[] = [
    { id: 's1', mesa_id: 'm1', estado: 'aberta', aberta_em: ha(30), conta_pedida_em: null, fechada_em: null, total_fecho: null },
    { id: 's3', mesa_id: 'm3', estado: 'conta_pedida', aberta_em: ha(60), conta_pedida_em: ha(2), fechada_em: null, total_fecho: null },
    { id: 'velha', mesa_id: 'm2', estado: 'fechada', aberta_em: ha(300), conta_pedida_em: null, fechada_em: ha(200), total_fecho: '5000' },
  ];
  const pedidos: LinhaPedido[] = [
    { id: 'p1', sessao_id: 's1', itens: [], total: '1500', estado: 'entregue', created_at: ha(20), observacao: null },
    { id: 'p0', sessao_id: 's1', itens: [], total: 600, estado: 'entregue', created_at: ha(28), observacao: null },
    { id: 'px', sessao_id: 'velha', itens: [], total: 5000, estado: 'entregue', created_at: ha(250), observacao: null },
    { id: 'sem', sessao_id: null, itens: [], total: 100, estado: 'novo', created_at: ha(1), observacao: null },
  ];

  const salao = montarSalao(
    mesas,
    sessoes,
    pedidos,
    [{ id: 'a1', mesa_id: 'm3', tipo: 'conta', criado_em: ha(2) }],
    AGORA,
  );

  it('vem pela ordem das mesas', () => {
    expect(salao.map((m) => m.numero)).toEqual([1, 2, 3]);
  });

  it('uma mesa sem sessão viva está livre — a sessão fechada não conta', () => {
    const m2 = salao.find((m) => m.numero === 2)!;
    expect(m2.estado).toBe('livre');
    expect(m2.sessao).toBeNull();
    expect(m2.total).toBe(0);
  });

  it('a mesa ocupada tem os pedidos dela, por ordem de chegada, e o total', () => {
    const m1 = salao.find((m) => m.numero === 1)!;
    expect(m1.estado).toBe('aberta');
    expect(m1.pedidos.map((p) => p.id)).toEqual(['p0', 'p1']);
    expect(m1.total).toBe(2100);
  });

  it('a chamada fica na mesa certa, com o número dela', () => {
    const m3 = salao.find((m) => m.numero === 3)!;
    expect(m3.estado).toBe('conta_pedida');
    expect(m3.alertas).toEqual([{ id: 'a1', mesa_id: 'm3', mesa: 3, tipo: 'conta', criado_em: ha(2) }]);
  });

  it('um pedido sem mesa não se cola a mesa nenhuma', () => {
    expect(salao.flatMap((m) => m.pedidos).some((p) => p.id === 'sem')).toBe(false);
  });
});

describe('há quanto tempo', () => {
  it('fala como se fala', () => {
    expect(haQuantoTempo(ha(0), AGORA)).toBe('agora');
    expect(haQuantoTempo(ha(5), AGORA)).toBe('há 5 min');
    expect(haQuantoTempo(ha(60), AGORA)).toBe('há 1 h');
    expect(haQuantoTempo(ha(85), AGORA)).toBe('há 1 h 25');
  });

  it('um relógio adiantado não dá minutos negativos', () => {
    expect(minutosDesde(new Date(AGORA + 120_000).toISOString(), AGORA)).toBe(0);
  });
});

describe('a mesa esquecida', () => {
  // A base aplica a mesma regra no gatilho que abre as sessões: passado
  // este tempo sem pedidos, o pedido seguinte abre uma sessão nova.
  const mesas = [{ id: 'm1', numero: 1 }];
  const sessao = (abertaHaMin: number): LinhaSessao => ({
    id: 's', mesa_id: 'm1', estado: 'aberta', aberta_em: ha(abertaHaMin),
    conta_pedida_em: null, fechada_em: null, total_fecho: null,
  });
  const pedido = (haMin: number): LinhaPedido => ({
    id: 'p' + haMin, sessao_id: 's', itens: [], total: 100, estado: 'entregue',
    created_at: ha(haMin), observacao: null,
  });
  const limite = HORAS_ATE_ESQUECER * 60;

  it('sem pedidos há mais de quatro horas, a mesa aparece livre', () => {
    const [m] = montarSalao(mesas, [sessao(limite + 60)], [pedido(limite + 5)], [], AGORA);
    expect(m.estado).toBe('livre');
  });

  it('um pedido recente mantém a mesa ocupada, mesmo aberta há muito', () => {
    const [m] = montarSalao(mesas, [sessao(limite + 60)], [pedido(limite + 50), pedido(20)], [], AGORA);
    expect(m.estado).toBe('aberta');
  });

  it('a regra da base e a do salão dizem o mesmo número de horas', () => {
    const sql = readFileSync(
      path.join(process.cwd(), 'supabase/migrations/0021_sessoes_esquecidas.sql'),
      'utf8',
    );
    expect(sql).toContain(`interval '${HORAS_ATE_ESQUECER} hours'`);
  });
});

describe('a conta com opções', () => {
  it('o tamanho e os extras entram no nome da linha, e separam as linhas', () => {
    const { linhas } = resumoDaConta([
      {
        estado: 'entregue',
        itens: [
          { nome: 'Muamba', qtd: 1, preco: 6000, opcoes: [{ grupo: 'Tamanho', nome: 'Grande', preco: 6000, tipo: 'variante' }] },
          { nome: 'Muamba', qtd: 2, preco: 3000, opcoes: [{ grupo: 'Tamanho', nome: 'Pequena', preco: 3000, tipo: 'variante' }] },
        ],
      },
    ]);
    expect(linhas.map((l) => `${l.qtd} × ${l.nome}`)).toEqual(['1 × Muamba (Grande)', '2 × Muamba (Pequena)']);
  });
});
