/**
 * O que se consegue saber do aparelho, e que muda o que se mostra.
 *
 * Fica fora dos componentes porque dois deles precisam do mesmo: o
 * convite para instalar, que só aparece a quem ainda não instalou, e o
 * aviso do ícone, que só aparece a quem já instalou. São o avesso um do
 * outro, e por isso nunca se sobrepõem.
 *
 * Nada disto pode ser chamado durante o render. Não há `window` no
 * servidor, e o HTML que vem de lá tem de ser igual ao que o browser
 * desenha — perguntar pelo aparelho a meio do render parte a
 * hidratação. Chama-se dentro de um `useEffect`, depois de a página
 * assentar.
 */

/** Aberto do ecrã inicial, e não de dentro do browser. */
export function abertoComoApp() {
  if (typeof window === 'undefined') return false;
  const autonomo = window.matchMedia?.('(display-mode: standalone)').matches;
  const naDoca = (window.navigator as { standalone?: boolean }).standalone === true;
  return Boolean(autonomo || naDoca);
}

export function eIphone() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // O iPad moderno diz que é um Mac; o toque desmente-o.
  const iPadDisfarcado = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadDisfarcado;
}

/** Dentro do Chrome/Firefox do iOS não há sequer o menu de Partilha certo. */
export function eSafari() {
  if (typeof navigator === 'undefined') return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}
