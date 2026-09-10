import { describe, expect, it } from 'vitest';
import { lerEvento, novoPagoAte, planoDoProduto, planoDoValor } from '../src/lib/pagamentos';

const AGORA = new Date('2026-09-10T12:00:00Z');

describe('ler o aviso de pagamento', () => {
  it('le um corpo simples, com tudo no topo', () => {
    const e = lerEvento({
      id: 'evt_1',
      status: 'paid',
      email: 'Casa@Exemplo.ao',
      product: 'plano-mesa',
      amount: 14900,
    });

    expect(e.tipo).toBe('pago');
    expect(e.eventoId).toBe('evt_1');
    expect(e.email).toBe('casa@exemplo.ao'); // normalizado
    expect(e.produto).toBe('plano-mesa');
    expect(e.valor).toBe(14900);
    expect(e.meses).toBe(1);
  });

  it('le um corpo aninhado, que e como a maioria manda', () => {
    const e = lerEvento({
      event: 'purchase.approved',
      data: {
        transaction_id: 'tx_99',
        customer: { name: 'Tia Bela', email: 'tia@bela.ao' },
        product: { id: 'prod_sala', name: 'Plano Sala' },
        purchase: { price: { value: '19.900,00' } },
      },
    });

    expect(e.tipo).toBe('pago');
    expect(e.eventoId).toBe('tx_99');
    expect(e.email).toBe('tia@bela.ao');
    expect(e.valor).toBe(19900);
  });

  it('prefere o email de cima ao email enterrado do vendedor', () => {
    // Um `seller.email` nao pode abrir a conta ao vendedor.
    const e = lerEvento({
      status: 'approved',
      email: 'comprador@exemplo.ao',
      seller: { email: 'vendedor@kursinha.com' },
    });
    expect(e.email).toBe('comprador@exemplo.ao');
  });

  it('reconhece as varias formas de dizer que pagou', () => {
    for (const sinal of ['paid', 'PAGO', 'approved', 'aprovada', 'completed', 'success', 'active']) {
      expect(lerEvento({ status: sinal, email: 'a@b.ao' }).tipo).toBe('pago');
    }
  });

  it('reconhece as varias formas de dizer que deixou de pagar', () => {
    for (const sinal of [
      'refunded',
      'reembolso',
      'chargeback',
      'cancelled',
      'cancelado',
      'expired',
      'declined',
    ]) {
      expect(lerEvento({ status: sinal, email: 'a@b.ao' }).tipo).toBe('anulado');
    }
  });

  it('um reembolso nunca passa por pagamento', () => {
    // "payment.refunded" contem "payment"; a ordem tem de dar o fecho.
    expect(lerEvento({ event: 'payment.refunded', email: 'a@b.ao' }).tipo).toBe('anulado');
    expect(lerEvento({ event: 'subscription.canceled', email: 'a@b.ao' }).tipo).toBe('anulado');
  });

  it('ignora o que nao percebe, em vez de abrir', () => {
    const e = lerEvento({ status: 'seja_o_que_for', email: 'a@b.ao' });
    expect(e.tipo).toBe('ignorado');
    expect(e.motivo).toContain('seja_o_que_for');
  });

  it('nao abre um pagamento sem email', () => {
    // Sem email nao ha a quem abrir; abrir a esmo era pior.
    const e = lerEvento({ status: 'paid', product: 'mesa' });
    expect(e.tipo).toBe('ignorado');
    expect(e.motivo).toContain('email');
  });

  it('recusa um email que nao e um email', () => {
    expect(lerEvento({ status: 'paid', email: 'nao-e-email' }).tipo).toBe('ignorado');
  });

  it('aguenta lixo sem rebentar', () => {
    for (const lixo of [null, undefined, 'texto', 42, [], true]) {
      const e = lerEvento(lixo);
      expect(e.tipo).toBe('ignorado');
    }
  });

  it('nunca deixa passar mais de doze meses de uma vez', () => {
    // Um numero absurdo vindo de fora nao pode dar acesso vitalicio.
    expect(lerEvento({ status: 'paid', email: 'a@b.ao', months: 999 }).meses).toBe(12);
    expect(lerEvento({ status: 'paid', email: 'a@b.ao', months: 3 }).meses).toBe(3);
    expect(lerEvento({ status: 'paid', email: 'a@b.ao', months: 0 }).meses).toBe(1);
    expect(lerEvento({ status: 'paid', email: 'a@b.ao', months: -5 }).meses).toBe(1);
  });
});

describe('do produto para o plano', () => {
  const mapa = { mesa: 'prod_abc', sala: 'prod_xyz' };

  it('usa os identificadores do ambiente', () => {
    expect(planoDoProduto('prod_abc', mapa)).toBe('mesa');
    expect(planoDoProduto('prod_xyz', mapa)).toBe('sala');
  });

  it('reconhece o nome quando nao ha identificador', () => {
    expect(planoDoProduto('Plano Mesa', {})).toBe('mesa');
    expect(planoDoProduto('PLANO SALA', {})).toBe('sala');
  });

  it('na duvida entre os dois, ganha o maior', () => {
    // Dar a mais e recuperavel; dar a menos e uma reclamacao.
    expect(planoDoProduto('mesa e sala', {})).toBe('sala');
  });

  it('devolve nulo quando nao reconhece', () => {
    expect(planoDoProduto('outra coisa', mapa)).toBeNull();
    expect(planoDoProduto(null, mapa)).toBeNull();
  });
});

describe('do valor para o plano', () => {
  const precos = { mesa: 14900, sala: 19900 };

  it('reconhece os dois precos', () => {
    expect(planoDoValor(14900, precos)).toBe('mesa');
    expect(planoDoValor(19900, precos)).toBe('sala');
  });

  it('aguenta o valor em centimos', () => {
    expect(planoDoValor(1490000, precos)).toBe('mesa');
    expect(planoDoValor(1990000, precos)).toBe('sala');
  });

  it('perdoa taxas e arredondamentos pequenos', () => {
    expect(planoDoValor(14750, precos)).toBe('mesa');
    expect(planoDoValor(20100, precos)).toBe('sala');
  });

  it('nao confunde os dois planos, que estao a 5.000 Kz um do outro', () => {
    // A margem tem de ser muito menor do que a distancia entre eles.
    expect(planoDoValor(14900, precos)).not.toBe('sala');
    expect(planoDoValor(19900, precos)).not.toBe('mesa');
  });

  it('devolve nulo para valores que nao sao de plano nenhum', () => {
    expect(planoDoValor(5000, precos)).toBeNull();
    expect(planoDoValor(0, precos)).toBeNull();
    expect(planoDoValor(null, precos)).toBeNull();
    expect(planoDoValor(-14900, precos)).toBeNull();
  });
});

describe('ate quando fica pago', () => {
  it('um mes a partir de hoje, quando nao havia nada', () => {
    const ate = novoPagoAte(null, 1, AGORA);
    expect(Math.round((ate.getTime() - AGORA.getTime()) / 86_400_000)).toBe(30);
  });

  it('soma ao que ja la estava, sem comer os dias que faltavam', () => {
    const daquiA10 = new Date(AGORA.getTime() + 10 * 86_400_000).toISOString();
    const ate = novoPagoAte(daquiA10, 1, AGORA);
    expect(Math.round((ate.getTime() - AGORA.getTime()) / 86_400_000)).toBe(40);
  });

  it('uma data ja passada nao encurta nem alonga: conta-se de hoje', () => {
    const haUmMes = new Date(AGORA.getTime() - 30 * 86_400_000).toISOString();
    const ate = novoPagoAte(haUmMes, 1, AGORA);
    expect(Math.round((ate.getTime() - AGORA.getTime()) / 86_400_000)).toBe(30);
  });

  it('aguenta uma data invalida', () => {
    const ate = novoPagoAte('nao e data', 1, AGORA);
    expect(Math.round((ate.getTime() - AGORA.getTime()) / 86_400_000)).toBe(30);
  });

  it('varios meses somam', () => {
    const ate = novoPagoAte(null, 3, AGORA);
    expect(Math.round((ate.getTime() - AGORA.getTime()) / 86_400_000)).toBe(90);
  });
});
