'use client';

import * as React from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ProvedorDeMovimento, ASSINATURA } from '@/components/cardapio/movimento';

/**
 * O ecrã do telemóvel a ser usado.
 *
 * Um mockup parado mostra o produto; este mostra o que se faz com ele.
 * Os ecrãs passam sozinhos, na ordem em que acontecem a sério — o
 * cardápio, o pedido a andar, a cozinha a receber — e quem está a ler a
 * página vê a história inteira sem carregar em nada.
 *
 * TRÊS CUIDADOS:
 *
 * 1. SÓ ANDA QUANDO SE VÊ. Fora do ecrã pára, e volta ao primeiro. Um
 *    carrossel a correr numa página que ninguém está a ver é bateria e
 *    processador gastos à toa, e num telemóvel isso sente-se.
 * 2. QUEM PEDE MENOS MOVIMENTO FICA COM O PRIMEIRO. Nada anda sozinho,
 *    e o ecrã continua a mostrar o cardápio.
 * 3. O NOME DE CADA PASSO VAI POR BAIXO, escrito. A imagem passa depressa
 *    demais para se perceber sozinha o que mudou.
 */

export type Passo = { rotulo: string; ecra: React.ReactNode };

/** Quanto tempo fica cada ecrã. Tempo de ler o rótulo e olhar. */
const DEMORA = 3800;

export function EcraEmUso({ passos }: { passos: Passo[] }) {
  return (
    <ProvedorDeMovimento>
      <Ciclo passos={passos} />
    </ProvedorDeMovimento>
  );
}

function Ciclo({ passos }: { passos: Passo[] }) {
  const [n, setN] = React.useState(0);
  const [aVer, setAVer] = React.useState(false);
  const caixa = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const no = caixa.current;
    if (!no || typeof IntersectionObserver === 'undefined') return setAVer(true);
    const observador = new IntersectionObserver(([e]) => setAVer(e.isIntersecting), {
      threshold: 0.35,
    });
    observador.observe(no);
    return () => observador.disconnect();
  }, []);

  /*
   * Também pára com o separador escondido. Sem isto, o ciclo continuava
   * a trocar ecrãs numa página que ninguém tem à frente — e cada troca
   * desenha um mockup inteiro, com as suas fotografias.
   */
  const [separadorAberto, setSeparadorAberto] = React.useState(true);
  React.useEffect(() => {
    const ver = () => setSeparadorAberto(document.visibilityState === 'visible');
    ver();
    document.addEventListener('visibilitychange', ver);
    return () => document.removeEventListener('visibilitychange', ver);
  }, []);

  React.useEffect(() => {
    if (!aVer || !separadorAberto || passos.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const relogio = window.setInterval(() => setN((actual) => (actual + 1) % passos.length), DEMORA);
    return () => window.clearInterval(relogio);
  }, [aVer, separadorAberto, passos.length]);

  const passo = passos[n];

  return (
    <div ref={caixa} className="relative h-full w-full">
      <AnimatePresence initial={false} mode="popLayout">
        <m.div
          key={n}
          className="absolute inset-0"
          initial={{ opacity: 0, y: 26, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -22, scale: 0.98 }}
          transition={{ duration: 0.5, ease: ASSINATURA }}
        >
          {passo.ecra}
        </m.div>
      </AnimatePresence>

      {/*
        O rótulo do passo, por cima do vidro e em baixo, onde não tapa o
        que interessa. Vive dentro do ecrã do aparelho — é desenhado à
        escala dele, por isso o texto é grande em pixels.
      */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-16">
        <AnimatePresence mode="wait">
          <m.span
            key={passo.rotulo}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: ASSINATURA }}
            className="rounded-full bg-[#17161b]/85 px-6 py-3 font-sans text-[22px] font-semibold text-white backdrop-blur-sm"
          >
            {passo.rotulo}
          </m.span>
        </AnimatePresence>
      </div>

      {/* As bolinhas: quantos passos são, e em qual vai. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center gap-2 pb-9">
        {passos.map((p, i) => (
          <span
            key={p.rotulo}
            className="h-2.5 rounded-full bg-white transition-all duration-300"
            style={{ width: i === n ? 26 : 10, opacity: i === n ? 0.95 : 0.4 }}
          />
        ))}
      </div>
    </div>
  );
}
