import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../src/app/api/pagamentos/kursinha/route';

/**
 * A porta do webhook.
 *
 * Não se testa aqui o que acontece depois de entrar — isso vive em
 * `pagamentos.test.ts` e na base de dados. Testa-se quem entra e quem
 * fica de fora, que é a parte onde um engano custa dinheiro a sério.
 *
 * O 503 que aparece a seguir a uma chave válida é o sinal de que a
 * autenticação passou: sem `SUPABASE_SERVICE_ROLE_KEY` no ambiente de
 * testes, a rota pára logo a seguir. É esse 503 que distingue "entrou"
 * de "não entrou" sem precisar de base de dados nenhuma.
 */

const SEGREDO = 'segredo-de-teste-com-um-comprimento-qualquer';
const ENDERECO = 'https://exemplo.test/api/pagamentos/kursinha';

/** Um aviso com a forma documentada da Kursinha. */
const AVISO = {
  event: 'sale.approved',
  timestamp: '2026-09-10T10:15:30.000Z',
  data: {
    saleId: '65a1b2c3d4e5f67890123456',
    orderId: '65a1b2c3d4e5f67890129999',
    status: 'approved',
    product: { id: '6a0c3beddb1169d43a28e16c', name: 'Plano Mesa', price: 14900, currency: 'AOA' },
    buyer: { id: 'b1', name: 'Tia Bela', email: 'tia@bela.ao', phone: '923000000' },
    payment: { method: 'reference', transactionId: 'TXN_1' },
    netAmount: 12500,
    serviceFee: 1000,
  },
};

const corpo = JSON.stringify(AVISO);

function pedir(url: string, cabecalhos: Record<string, string> = {}, texto = corpo) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cabecalhos },
    body: texto,
  });
}

beforeEach(() => {
  vi.stubEnv('KURSINHA_WEBHOOK_SECRET', SEGREDO);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('porta por ?chave=', () => {
  it('deixa entrar com a chave certa', async () => {
    const r = await POST(pedir(`${ENDERECO}?chave=${encodeURIComponent(SEGREDO)}`));
    // Passou a autenticação: parou depois, por falta de chave de serviço.
    expect(r.status).toBe(503);
  });

  it('recusa a chave errada', async () => {
    const r = await POST(pedir(`${ENDERECO}?chave=nao-e-esta`));
    expect(r.status).toBe(401);
  });

  it('recusa uma chave que e o prefixo da certa', async () => {
    // Se a comparação parasse no primeiro carácter diferente, um
    // atacante descobria o segredo letra a letra.
    const r = await POST(pedir(`${ENDERECO}?chave=${SEGREDO.slice(0, -1)}`));
    expect(r.status).toBe(401);
  });

  it('recusa uma chave com o comprimento certo mas errada', async () => {
    const trocada = 'x'.repeat(SEGREDO.length);
    const r = await POST(pedir(`${ENDERECO}?chave=${trocada}`));
    expect(r.status).toBe(401);
  });

  it('recusa quando nao vem chave nenhuma', async () => {
    const r = await POST(pedir(ENDERECO));
    expect(r.status).toBe(401);
  });

  it('recusa a chave vazia', async () => {
    const r = await POST(pedir(`${ENDERECO}?chave=`));
    expect(r.status).toBe(401);
  });
});

describe('porta por assinatura', () => {
  function assinar(texto: string, comSegredo = SEGREDO) {
    return 'sha256=' + createHmac('sha256', comSegredo).update(texto, 'utf8').digest('hex');
  }

  it('deixa entrar com a assinatura certa', async () => {
    const r = await POST(pedir(ENDERECO, { 'X-Webhook-Signature': assinar(corpo) }));
    expect(r.status).toBe(503);
  });

  it('recusa a assinatura de outro segredo', async () => {
    const r = await POST(pedir(ENDERECO, { 'X-Webhook-Signature': assinar(corpo, 'outro') }));
    expect(r.status).toBe(401);
  });

  it('recusa um corpo adulterado com uma assinatura verdadeira', async () => {
    // A propriedade que interessa: quem apanhar um aviso legítimo não lhe
    // pode trocar o email pelo seu.
    const outro = JSON.stringify({
      ...AVISO,
      data: { ...AVISO.data, buyer: { ...AVISO.data.buyer, email: 'ladrao@exemplo.test' } },
    });
    const r = await POST(pedir(ENDERECO, { 'X-Webhook-Signature': assinar(corpo) }, outro));
    expect(r.status).toBe(401);
  });

  it('recusa uma assinatura que nao e hexadecimal', async () => {
    const r = await POST(pedir(ENDERECO, { 'X-Webhook-Signature': 'sha256=nao-e-hex' }));
    expect(r.status).toBe(401);
  });

  it('havendo assinatura, e ela que manda — a chave certa nao a salva', async () => {
    // Senão bastava juntar `?chave=` para contornar uma assinatura má.
    const r = await POST(
      pedir(`${ENDERECO}?chave=${encodeURIComponent(SEGREDO)}`, {
        'X-Webhook-Signature': assinar(corpo, 'outro'),
      }),
    );
    expect(r.status).toBe(401);
  });
});

describe('sem segredo configurado', () => {
  it('fecha o endereco em vez de o abrir', async () => {
    vi.stubEnv('KURSINHA_WEBHOOK_SECRET', '');
    const r = await POST(pedir(`${ENDERECO}?chave=seja-o-que-for`));
    expect(r.status).toBe(503);
  });
});

describe('corpo invalido', () => {
  it('recusa o que nao e JSON, depois de autenticar', async () => {
    const r = await POST(
      pedir(`${ENDERECO}?chave=${encodeURIComponent(SEGREDO)}`, {}, 'isto não é json'),
    );
    expect(r.status).toBe(400);
  });
});
