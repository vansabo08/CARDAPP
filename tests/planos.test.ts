import { describe, expect, it } from 'vitest';
import {
  DIAS_DE_CORTESIA,
  INCLUI,
  PLANOS,
  PRECO_PLANO,
  PRODUTO_KURSINHA,
  avisoDoPrazo,
  cardapioNoAr,
  diasAteExpirar,
  diasDesdeExpirar,
  estadoDaConta,
  lembreteDevido,
  linkDePagamento,
  painelAberto,
  proximaExpiracao,
  type Plano,
} from '../src/lib/planos';

const AGORA = new Date('2026-09-10T12:00:00Z');
const daqui = (dias: number) => new Date(AGORA.getTime() + dias * 86_400_000);

describe('tabela de planos', () => {
  it('tem dois planos, ambos pagos', () => {
    const planos = Object.keys(PLANOS) as Plano[];
    expect(planos.sort()).toEqual(['mesa', 'sala']);
    for (const p of planos) expect(PLANOS[p].preco).toBeGreaterThan(0);
  });

  it('os precos e os dias sao os combinados', () => {
    expect(PLANOS.mesa.preco).toBe(14900);
    expect(PLANOS.sala.preco).toBe(19900);
    expect(PLANOS.mesa.dias).toBe(30);
    expect(PLANOS.sala.dias).toBe(30);
  });

  it('o identificador do produto vive dentro do link', () => {
    // Se se separarem, um pagamento abre a conta no plano errado.
    for (const p of ['mesa', 'sala'] as Plano[]) {
      expect(PLANOS[p].link).toContain(PLANOS[p].produtoId);
      expect(linkDePagamento(p)).toContain(PLANOS[p].produtoId);
    }
  });

  it('os identificadores sao os que a Kursinha tem', () => {
    expect(PRODUTO_KURSINHA.mesa).toBe('6a0c3beddb1169d43a28e16c');
    expect(PRODUTO_KURSINHA.sala).toBe('69fc6b443420b95cb08c1ebe');
  });

  it('os atalhos batem certo com a configuracao', () => {
    expect(PRECO_PLANO.mesa).toBe(PLANOS.mesa.preco);
    expect(PRECO_PLANO.sala).toBe(PLANOS.sala.preco);
  });

  it('cada plano diz o que inclui', () => {
    for (const p of ['mesa', 'sala'] as Plano[]) {
      expect(INCLUI[p].length).toBeGreaterThan(2);
    }
  });
});

describe('somar dias a uma compra', () => {
  it('soma A PARTIR DA EXPIRACAO quando ela ainda esta no futuro', () => {
    // Quem paga com 10 dias de sobra fica com 40, nao com 30.
    const nova = proximaExpiracao(daqui(10), 'mesa', AGORA);
    expect(Math.round((nova.getTime() - AGORA.getTime()) / 86_400_000)).toBe(40);
  });

  it('soma a partir de HOJE quando ja expirou', () => {
    // Os dias que passaram sem pagamento nao se devolvem.
    const nova = proximaExpiracao(daqui(-5), 'mesa', AGORA);
    expect(Math.round((nova.getTime() - AGORA.getTime()) / 86_400_000)).toBe(30);
  });

  it('sem data nenhuma, conta de hoje', () => {
    const nova = proximaExpiracao(null, 'sala', AGORA);
    expect(Math.round((nova.getTime() - AGORA.getTime()) / 86_400_000)).toBe(30);
  });

  it('aguenta uma data que nao e data', () => {
    const nova = proximaExpiracao('ontem', 'mesa', AGORA);
    expect(Math.round((nova.getTime() - AGORA.getTime()) / 86_400_000)).toBe(30);
  });

  it('duas compras seguidas somam sessenta dias', () => {
    const primeira = proximaExpiracao(null, 'mesa', AGORA);
    const segunda = proximaExpiracao(primeira, 'mesa', AGORA);
    expect(Math.round((segunda.getTime() - AGORA.getTime()) / 86_400_000)).toBe(60);
  });
});

describe('os quatro estados', () => {
  it('activa quando falta mais de uma semana', () => {
    expect(estadoDaConta(daqui(30), AGORA)).toBe('activa');
    expect(estadoDaConta(daqui(8), AGORA)).toBe('activa');
  });

  it('a_expirar nos ultimos sete dias', () => {
    expect(estadoDaConta(daqui(7), AGORA)).toBe('a_expirar');
    expect(estadoDaConta(daqui(3), AGORA)).toBe('a_expirar');
    expect(estadoDaConta(daqui(0.1), AGORA)).toBe('a_expirar');
  });

  it('cortesia nos tres dias a seguir a expirar', () => {
    expect(estadoDaConta(daqui(-0.1), AGORA)).toBe('cortesia');
    expect(estadoDaConta(daqui(-1), AGORA)).toBe('cortesia');
    expect(estadoDaConta(daqui(-DIAS_DE_CORTESIA), AGORA)).toBe('cortesia');
  });

  it('expirada depois da cortesia', () => {
    expect(estadoDaConta(daqui(-DIAS_DE_CORTESIA - 0.1), AGORA)).toBe('expirada');
    expect(estadoDaConta(daqui(-30), AGORA)).toBe('expirada');
  });

  it('sem data conta como activa, nunca como expirada', () => {
    // Uma linha que a migracao nao apanhou nao pode fechar uma casa.
    expect(estadoDaConta(null, AGORA)).toBe('activa');
    expect(estadoDaConta(undefined, AGORA)).toBe('activa');
    expect(estadoDaConta('nao e data', AGORA)).toBe('activa');
  });
});

describe('o que abre e o que fecha em cada estado', () => {
  it('em cortesia o cardapio continua no ar', () => {
    // Nao se deixa QR morto nas mesas por um pagamento que atrasou um dia.
    expect(cardapioNoAr('cortesia')).toBe(true);
    expect(painelAberto('cortesia')).toBe(true);
  });

  it('so expirada fecha as duas coisas', () => {
    expect(cardapioNoAr('expirada')).toBe(false);
    expect(painelAberto('expirada')).toBe(false);
  });

  it('activa e a_expirar servem tudo', () => {
    for (const e of ['activa', 'a_expirar'] as const) {
      expect(cardapioNoAr(e)).toBe(true);
      expect(painelAberto(e)).toBe(true);
    }
  });
});

describe('contagem de dias', () => {
  it('conta os que faltam, arredondando para cima', () => {
    expect(diasAteExpirar(daqui(7), AGORA)).toBe(7);
    expect(diasAteExpirar(daqui(0.5), AGORA)).toBe(1);
  });

  it('nao devolve negativos', () => {
    expect(diasAteExpirar(daqui(-4), AGORA)).toBe(0);
  });

  it('conta os que passaram desde a expiracao', () => {
    expect(diasDesdeExpirar(daqui(-3), AGORA)).toBe(3);
    expect(diasDesdeExpirar(daqui(5), AGORA)).toBe(0);
  });
});

describe('lembretes', () => {
  it('dispara a sete, tres e um dia', () => {
    expect(lembreteDevido(daqui(7), AGORA)).toBe('faltam_7');
    expect(lembreteDevido(daqui(3), AGORA)).toBe('faltam_3');
    expect(lembreteDevido(daqui(1), AGORA)).toBe('falta_1');
  });

  it('dispara no dia de expirar e no fim da cortesia', () => {
    expect(lembreteDevido(daqui(-0.2), AGORA)).toBe('expira_hoje');
    expect(lembreteDevido(daqui(-DIAS_DE_CORTESIA), AGORA)).toBe('fim_cortesia');
  });

  it('cala-se nos dias que nao sao de aviso', () => {
    expect(lembreteDevido(daqui(30), AGORA)).toBeNull();
    expect(lembreteDevido(daqui(5), AGORA)).toBeNull();
    expect(lembreteDevido(daqui(2), AGORA)).toBeNull();
    // Ja expirada ha muito: nao se insiste para sempre.
    expect(lembreteDevido(daqui(-20), AGORA)).toBeNull();
  });

  it('manda um so de cada vez, o mais urgente', () => {
    // Se o cron falhar um dia, nao se despejam tres emails de enfiada.
    const devido = lembreteDevido(daqui(1), AGORA);
    expect(devido).toBe('falta_1');
  });

  it('sem data nao manda nada', () => {
    expect(lembreteDevido(null, AGORA)).toBeNull();
  });
});

describe('aviso ao dono', () => {
  it('muda de tom conforme aperta', () => {
    expect(avisoDoPrazo('activa', 30)).toBe('');
    expect(avisoDoPrazo('a_expirar', 5)).toContain('5 dias');
    expect(avisoDoPrazo('a_expirar', 1)).toContain('Último dia');
    expect(avisoDoPrazo('cortesia', 0)).toContain('ainda está no ar');
    expect(avisoDoPrazo('expirada', 0)).toContain('saiu do ar');
  });

  it('nao fala no plural quando falta um so dia', () => {
    expect(avisoDoPrazo('a_expirar', 1)).not.toContain('dias');
  });
});
