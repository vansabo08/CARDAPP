'use client';

import * as React from 'react';
import { Download, Share, X } from 'lucide-react';
import { MarcaSimbolo } from '@/components/marca-simbolo';
import { cn } from '@/lib/utils';

/**
 * O convite para instalar o Cardapp no ecrã inicial.
 *
 * Android e iOS não se instalam da mesma maneira, e não há forma de os
 * tratar igual:
 *
 * O Chrome dispara `beforeinstallprompt` e deixa a página pedir a
 * instalação quando quiser. Aí é um botão, e o sistema trata do resto.
 *
 * O Safari do iPhone nunca disparou esse evento e não tem API nenhuma
 * para isto — a Apple exige que a pessoa passe pelo menu de Partilha.
 * Por isso ali não se pode instalar por código: mostra-se o caminho, com
 * o ícone certo, e é o mais honesto que se consegue fazer.
 *
 * Só aparece no painel, e nunca no cardápio público. Quem lê o QR da
 * mesa veio pedir comida, não instalar uma aplicação — e um convite por
 * cima do botão de enviar o pedido custaria pedidos. Quem tira proveito
 * de o ter no ecrã inicial é a casa, que abre isto todos os dias.
 *
 * Aparece em cima porque o rodapé do painel já é da doca.
 */

const CHAVE = 'cardapp:convite-instalar';
/** Recusado hoje, sossegado por um mês. */
const DESCANSO = 30 * 24 * 60 * 60 * 1000;
/** Deixa a pessoa chegar ao que veio fazer antes de lhe pedir algo. */
const ESPERA = 8000;

type EventoDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function jaInstalado() {
  if (typeof window === 'undefined') return true;
  const autonomo = window.matchMedia?.('(display-mode: standalone)').matches;
  const naDoca = (window.navigator as { standalone?: boolean }).standalone === true;
  return Boolean(autonomo || naDoca);
}

function eIphone() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // O iPad moderno diz que é um Mac; o toque desmente-o.
  const iPadDisfarcado = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadDisfarcado;
}

/** Dentro do Chrome/Firefox do iOS não há sequer o menu de Partilha certo. */
function eSafari() {
  if (typeof navigator === 'undefined') return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}

function descansando() {
  try {
    const ate = Number(localStorage.getItem(CHAVE) ?? 0);
    return Date.now() < ate;
  } catch {
    return false;
  }
}

export function ConviteInstalar() {
  const [visivel, setVisivel] = React.useState(false);
  /**
   * A entrada é uma animação de CSS, não um estado que o JavaScript
   * acende um frame depois.
   *
   * A primeira versão fazia `requestAnimationFrame(() => setEntrou(true))`,
   * e o rAF não corre em separadores em segundo plano: o convite ficava
   * montado a opacidade zero — invisível, mas presente e alcançável pelo
   * tabulador. Uma entrada que depende do relógio do browser pode nunca
   * acontecer; uma que é CSS acontece sempre.
   */
  const [aSair, setASair] = React.useState(false);
  const evento = React.useRef<EventoDeInstalacao | null>(null);
  const [modo, setModo] = React.useState<'android' | 'ios' | null>(null);

  React.useEffect(() => {
    if (jaInstalado() || descansando()) return;

    let relogio: number | undefined;

    function mostrar(qual: 'android' | 'ios') {
      setModo(qual);
      relogio = window.setTimeout(() => setVisivel(true), ESPERA);
    }

    function aoPoderInstalar(e: Event) {
      // Sem isto o Chrome mostra a sua própria barra, que não se controla.
      e.preventDefault();
      evento.current = e as EventoDeInstalacao;
      mostrar('android');
    }

    window.addEventListener('beforeinstallprompt', aoPoderInstalar);

    // No iPhone o evento nunca chega: decide-se pelo aparelho.
    if (eIphone() && eSafari()) mostrar('ios');

    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
      window.clearTimeout(relogio);
    };
  }, []);

  function dispensar() {
    setASair(true);
    window.setTimeout(() => setVisivel(false), 250);
    try {
      localStorage.setItem(CHAVE, String(Date.now() + DESCANSO));
    } catch {
      /* sem armazenamento: volta a perguntar na próxima visita */
    }
  }

  async function instalar() {
    const e = evento.current;
    if (!e) return;

    await e.prompt();
    const { outcome } = await e.userChoice;

    // Aceite ou recusado, o convite cumpriu — o sistema assume daqui.
    evento.current = null;
    if (outcome === 'accepted') {
      setASair(true);
      window.setTimeout(() => setVisivel(false), 250);
    } else {
      dispensar();
    }
  }

  if (!visivel || !modo) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-3 top-3 z-[70] mx-auto max-w-[440px]',
        // A entrada é CSS; a saída é transição, 30% mais rápida.
        aSair
          ? '-translate-y-3 opacity-0 transition-[opacity,transform] duration-normal ease-saida'
          : 'animate-descer',
      )}
      role="dialog"
      aria-label="Instalar o Cardapp"
    >
      <div className="vidro flex items-start gap-3 rounded-cartao p-3.5 shadow-elevacao-3-escura">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-campo border border-linha bg-creme/[0.05]">
          <MarcaSimbolo className="h-5 w-5 text-ouro" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-creme">Instalar o Cardapp</p>

          {modo === 'android' ? (
            <p className="mt-1 text-pretty font-sans text-xs leading-normal text-tenue">
              Fica no ecrã inicial e abre como uma aplicação, sem barra do browser.
            </p>
          ) : (
            <p className="mt-1 text-pretty font-sans text-xs leading-normal text-tenue">
              Toque em{' '}
              <Share className="inline h-3.5 w-3.5 -translate-y-px text-creme" aria-label="Partilhar" />{' '}
              <span className="text-creme">Partilhar</span> e depois em{' '}
              <span className="text-creme">Adicionar ao ecrã principal</span>.
            </p>
          )}

          {modo === 'android' ? (
            <button
              type="button"
              onClick={instalar}
              className={cn(
                'mt-3 inline-flex items-center gap-2 rounded-full bg-ouro px-4 py-2',
                'font-sans text-xs font-semibold text-grafite shadow-elevacao-1',
                'transition-[background-color,transform,box-shadow] duration-rapida ease-assinatura',
                'hover:-translate-y-px hover:bg-ouro-claro hover:shadow-elevacao-2',
                'active:translate-y-0 active:scale-[0.97]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro focus-visible:ring-offset-2 focus-visible:ring-offset-grafite',
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Instalar
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={dispensar}
          aria-label="Agora não"
          className={cn(
            'shrink-0 rounded-full p-1.5 text-tenue',
            'transition-colors duration-rapida ease-assinatura hover:text-creme',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro',
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
