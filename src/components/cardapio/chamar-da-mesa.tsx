'use client';

import * as React from 'react';
import { AnimatePresence, m } from 'motion/react';
import { BellRing, Check, Loader2, ReceiptText, X } from 'lucide-react';
import type { RespostaChamada } from '@/app/api/mesa/chamar/route';
import { cn } from '@/lib/utils';
import { ASSINATURA, MOLA } from './movimento';
import { useIdioma, type Chave } from './idioma';

/**
 * Chamar o empregado e pedir a conta, sem levantar o braço.
 *
 * UM BOTÃO REDONDO À ESQUERDA, QUE ABRE OS DOIS. A primeira versão tinha
 * os dois à vista, à direita — e ficavam por cima dos botões "+" dos
 * pratos, que também vivem à direita. O cliente ia juntar uma Cuca e
 * chamava o empregado. À esquerda só há fotografias, e um círculo
 * pequeno tapa menos do que duas pílulas.
 *
 * Depois de um toque, a opção fica "avisado" durante um minuto, que é o
 * mesmo travão que a base aplica. Carregar outra vez não fazia nada de
 * útil, e o cliente fica a saber que foi ouvido.
 */

type Tipo = 'empregado' | 'conta';

const TRAVAO_MS = 60_000;

const OPCOES: { tipo: Tipo; rotulo: Chave; Icone: typeof BellRing }[] = [
  { tipo: 'conta', rotulo: 'pedirConta', Icone: ReceiptText },
  { tipo: 'empregado', rotulo: 'chamar', Icone: BellRing },
];

export function ChamarDaMesa({
  slug,
  mesa,
  comCarrinho,
}: {
  slug: string;
  mesa: number;
  /** Com o carrinho à vista, o botão sobe para não ficar por baixo dele. */
  comCarrinho: boolean;
}) {
  const { idioma, t } = useIdioma();
  const [aberto, setAberto] = React.useState(false);
  const [aChamar, setAChamar] = React.useState<Tipo | null>(null);
  const [avisados, setAvisados] = React.useState<Partial<Record<Tipo, number>>>({});
  const [aviso, setAviso] = React.useState<{ texto: string; ok: boolean } | null>(null);
  const caixa = React.useRef<HTMLDivElement>(null);

  // Os travões acabam sozinhos: a opção volta a ficar disponível.
  React.useEffect(() => {
    const proximo = Math.min(...Object.values(avisados).map((ate) => ate ?? Infinity));
    if (!Number.isFinite(proximo)) return;
    const relogio = window.setTimeout(() => {
      const agora = Date.now();
      setAvisados((a) =>
        Object.fromEntries(Object.entries(a).filter(([, ate]) => (ate ?? 0) > agora)),
      );
    }, Math.max(0, proximo - Date.now()) + 50);
    return () => window.clearTimeout(relogio);
  }, [avisados]);

  React.useEffect(() => {
    if (!aviso) return;
    const relogio = window.setTimeout(() => setAviso(null), 4200);
    return () => window.clearTimeout(relogio);
  }, [aviso]);

  // Fecha com Escape e com um toque fora — o gesto de "deixa estar".
  React.useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    const aoTocar = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    window.addEventListener('keydown', aoTeclar);
    window.addEventListener('pointerdown', aoTocar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      window.removeEventListener('pointerdown', aoTocar);
    };
  }, [aberto]);

  async function chamar(tipo: Tipo) {
    if (aChamar || avisados[tipo]) return;
    setAChamar(tipo);

    try {
      const resposta = await fetch('/api/mesa/chamar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, mesa, tipo, idioma }),
      });
      const corpo = (await resposta.json()) as RespostaChamada;

      if (corpo.estado === 'recusado') {
        setAviso({ texto: corpo.mensagem, ok: false });
      } else {
        setAvisados((a) => ({ ...a, [tipo]: Date.now() + TRAVAO_MS }));
        setAviso({ texto: corpo.mensagem, ok: true });
        // Um toque curto no telemóvel confirma, mesmo de olhos no prato.
        navigator.vibrate?.(35);
      }
    } catch {
      setAviso({ texto: t('semLigacao'), ok: false });
    } finally {
      setAChamar(null);
      setAberto(false);
    }
  }

  const algumAvisado = Boolean(avisados.empregado || avisados.conta);

  return (
    <>
      <m.div
        ref={caixa}
        className="fixed left-3 z-30 flex flex-col-reverse items-start gap-2"
        initial={false}
        animate={{ bottom: comCarrinho ? 104 : 20 }}
        transition={MOLA}
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <m.button
          type="button"
          onClick={() => setAberto((a) => !a)}
          whileTap={{ scale: 0.92 }}
          transition={MOLA}
          aria-expanded={aberto}
          aria-controls="chamar-opcoes"
          aria-label={aberto ? t('fechar') : t('chamarOuConta')}
          className={cn(
            'relative flex h-12 w-12 items-center justify-center rounded-full shadow-elevacao-2',
            'border border-black/10 bg-grafite-carta text-creme',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja focus-visible:ring-offset-2',
          )}
        >
          <AnimatePresence initial={false} mode="wait">
            <m.span
              key={aberto ? 'x' : 'sino'}
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="flex"
            >
              {aberto ? <X className="h-5 w-5" aria-hidden /> : <BellRing className="h-5 w-5 text-laranja" aria-hidden />}
            </m.span>
          </AnimatePresence>
          {algumAvisado && !aberto ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-verde ring-2 ring-grafite-carta">
              <Check className="h-2.5 w-2.5 text-white" aria-hidden />
            </span>
          ) : null}
        </m.button>

        <AnimatePresence>
          {aberto ? (
            <m.div
              id="chamar-opcoes"
              className="flex flex-col items-start gap-2"
              initial="escondido"
              animate="visivel"
              exit="escondido"
              variants={{ visivel: { transition: { staggerChildren: 0.05 } }, escondido: {} }}
            >
              {OPCOES.map(({ tipo, rotulo, Icone }) => {
                const avisado = Boolean(avisados[tipo]);
                return (
                  <m.button
                    key={tipo}
                    type="button"
                    data-tipo={tipo}
                    onClick={() => chamar(tipo)}
                    disabled={aChamar !== null || avisado}
                    variants={{
                      escondido: { opacity: 0, y: 10, scale: 0.95 },
                      visivel: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: ASSINATURA } },
                    }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={avisado ? `${t(rotulo)}: ${t('avisado')}` : t(rotulo)}
                    className={cn(
                      'flex h-11 items-center gap-2 rounded-full pl-3.5 pr-4 font-sans text-sm font-semibold shadow-elevacao-2',
                      'border border-black/10 bg-grafite-carta text-creme',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja',
                      avisado && 'border-verde/40 text-creme/80',
                    )}
                  >
                    {aChamar === tipo ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : avisado ? (
                      <Check className="h-4 w-4 text-verde" aria-hidden />
                    ) : (
                      <Icone className="h-4 w-4 text-laranja" aria-hidden />
                    )}
                    {avisado ? `${t(rotulo)} · ${t('avisado')}` : t(rotulo)}
                  </m.button>
                );
              })}
            </m.div>
          ) : null}
        </AnimatePresence>
      </m.div>

      {/* A confirmação aparece em cima, onde os olhos estão, e vai-se sozinha. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4"
        aria-live="polite"
      >
        <AnimatePresence>
          {aviso ? (
            <m.p
              key={aviso.texto}
              role="status"
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.26, ease: ASSINATURA }}
              className={cn(
                'flex max-w-[420px] items-center gap-2.5 rounded-full px-4 py-3 font-sans text-sm font-semibold shadow-elevacao-3-escura',
                aviso.ok ? 'bg-grafite-carta text-creme' : 'bg-[#3a1d18] text-[#ffb4a8]',
              )}
            >
              {aviso.ok ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-verde text-white">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
              ) : null}
              {aviso.texto}
            </m.p>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
