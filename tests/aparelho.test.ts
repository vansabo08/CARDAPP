import { afterEach, describe, expect, it, vi } from 'vitest';
import { abertoComoApp, eIphone, eSafari } from '@/lib/aparelho';

/**
 * Quem está a ver isto, e de onde.
 *
 * Destas três respostas dependem dois avisos que são o avesso um do
 * outro: o convite para instalar, que só aparece a quem ainda não
 * instalou, e o aviso do ícone, que só aparece a quem já instalou. Se
 * `abertoComoApp` mentisse, ou apareciam os dois ao mesmo tempo, ou não
 * aparecia nenhum.
 *
 * O caso que obriga a ter isto escrito é o iPad. Desde que passou a ter
 * teclado, diz ao mundo que é um Macintosh — o `userAgent` não tem lá a
 * palavra iPad. Quem acreditar nele mostra a um iPad instruções de
 * computador, que não existem. O que o desmente é o toque.
 */

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadDisfarcado:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  chromeNoIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
};

/** Finge um aparelho: o que o browser diz ser, e quantos dedos aceita. */
function aparelho(userAgent: string, toques = 0, extra: Record<string, unknown> = {}) {
  vi.stubGlobal('navigator', { userAgent, maxTouchPoints: toques, ...extra });
}

/** Finge a janela: `standalone` é o sinal do iOS, a media query é a do resto. */
function janela(autonomo: boolean) {
  vi.stubGlobal('window', {
    matchMedia: (q: string) => ({ matches: autonomo && q.includes('standalone') }),
    navigator: globalThis.navigator,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('de que aparelho se trata', () => {
  it('o iPhone diz que é um iPhone', () => {
    aparelho(UA.iphone);
    expect(eIphone()).toBe(true);
  });

  it('o iPad diz que é um Mac, e o toque desmente-o', () => {
    aparelho(UA.ipadDisfarcado, 5);
    expect(eIphone()).toBe(true);
  });

  it('um Mac a sério continua a ser um Mac', () => {
    aparelho(UA.ipadDisfarcado, 0);
    expect(eIphone()).toBe(false);
  });

  it('o Android não é um iPhone', () => {
    aparelho(UA.android, 5);
    expect(eIphone()).toBe(false);
  });

  it('o Chrome dentro do iPhone não serve, porque o menu de Partilha ali não é o certo', () => {
    aparelho(UA.chromeNoIphone);
    expect(eIphone()).toBe(true);
    expect(eSafari()).toBe(false);
  });
});

describe('aberto do ecrã inicial ou de dentro do browser', () => {
  it('o Android autónomo conta como instalado', () => {
    aparelho(UA.android, 5);
    janela(true);
    expect(abertoComoApp()).toBe(true);
  });

  it('o iPhone diz o mesmo à maneira dele', () => {
    aparelho(UA.iphone, 5, { standalone: true });
    janela(false);
    expect(abertoComoApp()).toBe(true);
  });

  it('dentro do browser, não', () => {
    aparelho(UA.android, 5);
    janela(false);
    expect(abertoComoApp()).toBe(false);
  });

  it('no servidor, onde não há janela nenhuma, também não', () => {
    // O convite e o aviso decidem-se dentro de um efeito, já no browser.
    // Se isto respondesse que sim, o HTML do servidor deixaria de bater
    // certo com o do browser e a hidratação partia-se.
    vi.stubGlobal('window', undefined);
    expect(abertoComoApp()).toBe(false);
  });
});
