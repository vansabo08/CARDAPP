import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Quem entra na secção de administração.
 *
 * Esta é a barreira que separa ver as contas de todos de ver só a sua.
 * Esteve dependente de uma variável de ambiente que nunca chegou a
 * existir em produção — a secção funcionava no computador de quem a
 * escreveu e respondia 404 no sítio onde era precisa, sem nada no ecrã
 * que explicasse porquê.
 *
 * Agora o dono está escrito no código e o ambiente manda por cima. As
 * duas metades disso têm de ficar provadas: que o dono entra sempre, e
 * que a lista do ambiente, quando existe, é a única que conta — senão o
 * dono ficaria de porta aberta para sempre, mesmo depois de alguém o
 * querer trocar.
 */

let emailDaSessao: string | null = 'vansabo08@gmail.com';

vi.mock('../src/lib/supabase/servidor', () => ({
  utilizadorActual: async () => (emailDaSessao ? { email: emailDaSessao, id: 'u1' } : null),
}));

vi.mock('../src/lib/supabase/administrador', () => ({
  clienteAdministrador: () => null,
  servicoConfigurado: () => false,
}));

const { eAdministrador, exigirAdministrador, haAdministradoresDefinidos } = await import(
  '../src/lib/admin'
);

beforeEach(() => {
  emailDaSessao = 'vansabo08@gmail.com';
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('a porta do administrador', () => {
  it('o dono entra sem variável de ambiente nenhuma', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    expect(await eAdministrador()).toBe(true);
    expect(haAdministradoresDefinidos()).toBe(true);
  });

  it('entra também com maiúsculas e espaços à volta', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    emailDaSessao = '  VanSabo08@Gmail.com  '.trim();
    expect(await eAdministrador()).toBe(true);
  });

  it('mais ninguém entra', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    emailDaSessao = 'outra.pessoa@gmail.com';
    expect(await eAdministrador()).toBe(false);
  });

  it('sem sessão não entra ninguém', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    emailDaSessao = null;
    expect(await eAdministrador()).toBe(false);
  });

  it('a variável de ambiente substitui a lista por inteiro', async () => {
    // Quem estiver no ambiente entra...
    vi.stubEnv('ADMIN_EMAILS', 'outro@empresa.ao');
    emailDaSessao = 'outro@empresa.ao';
    expect(await eAdministrador()).toBe(true);

    // ...e o dono deixa de entrar, que é o que faz disto uma
    // substituição e não um acrescento. Sem isto, escrever o dono no
    // código deixava-o de porta aberta para sempre.
    emailDaSessao = 'vansabo08@gmail.com';
    expect(await eAdministrador()).toBe(false);
  });

  it('aceita vários no ambiente, separados por vírgula', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'um@a.ao, dois@b.ao ,tres@c.ao');
    for (const quem of ['um@a.ao', 'dois@b.ao', 'tres@c.ao']) {
      emailDaSessao = quem;
      expect(await eAdministrador()).toBe(true);
    }
    emailDaSessao = 'quatro@d.ao';
    expect(await eAdministrador()).toBe(false);
  });

  it('a barreira das acções do servidor atira quem não é', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    emailDaSessao = 'intruso@gmail.com';
    await expect(exigirAdministrador()).rejects.toThrow(/autoriza/i);
  });

  it('e deixa passar quem é', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    await expect(exigirAdministrador()).resolves.toBeUndefined();
  });
});
