import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../src/app/api/cron/renovacoes/route';

/**
 * A porta do cron.
 *
 * Este endereço percorre todas as contas e manda emails. Deixá-lo aberto
 * seria dar a qualquer pessoa um botão para disparar avisos a todos os
 * restaurantes — e para queimar os lembretes do ciclo, que só saem uma
 * vez.
 */

const SEGREDO = 'segredo-do-cron-de-teste';
const ENDERECO = 'https://exemplo.test/api/cron/renovacoes';

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SEGREDO);
  // Sem chave de serviço não há base de dados nos testes: o cron corre
  // sobre uma lista vazia, que é quanto basta para provar a porta.
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('porta do cron', () => {
  it('recusa quem chega sem segredo', async () => {
    const r = await GET(new Request(ENDERECO));
    expect(r.status).toBe(401);
  });

  it('recusa o segredo errado', async () => {
    const r = await GET(new Request(`${ENDERECO}?chave=nao-e-esta`));
    expect(r.status).toBe(401);
  });

  it('recusa um segredo que e o prefixo do certo', async () => {
    const r = await GET(new Request(`${ENDERECO}?chave=${SEGREDO.slice(0, -1)}`));
    expect(r.status).toBe(401);
  });

  it('aceita o Bearer que a Vercel manda nos crons dela', async () => {
    const r = await GET(
      new Request(ENDERECO, { headers: { Authorization: `Bearer ${SEGREDO}` } }),
    );
    expect(r.status).toBe(200);
  });

  it('aceita o segredo no endereco', async () => {
    const r = await GET(new Request(`${ENDERECO}?chave=${encodeURIComponent(SEGREDO)}`));
    expect(r.status).toBe(200);
  });

  it('tambem responde a POST, para se poder disparar a mao', async () => {
    const r = await POST(
      new Request(ENDERECO, { method: 'POST', headers: { Authorization: `Bearer ${SEGREDO}` } }),
    );
    expect(r.status).toBe(200);
  });

  it('fecha-se quando nao ha segredo configurado', async () => {
    // Nunca abrir por omissao: um endereco destes aberto e um megafone.
    vi.stubEnv('CRON_SECRET', '');
    const r = await GET(new Request(`${ENDERECO}?chave=seja-o-que-for`));
    expect(r.status).toBe(503);
  });

  it('devolve a contagem do que fez', async () => {
    const r = await GET(new Request(`${ENDERECO}?chave=${encodeURIComponent(SEGREDO)}`));
    const corpo = (await r.json()) as Record<string, unknown>;

    expect(corpo.ok).toBe(true);
    for (const campo of ['vistas', 'enviados', 'registados', 'repetidos']) {
      expect(typeof corpo[campo]).toBe('number');
    }
  });
});
