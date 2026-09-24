'use client';

import * as React from 'react';
import Image from 'next/image';
import { FOTO_CASA_CHEIA } from '@/lib/fotos';

/**
 * O fundo da página inicial: a casa cheia, de cima a baixo.
 *
 * A fotografia ocupa a página toda e fica presa ao ecrã (`fixed`): o
 * conteúdo rola por cima dela, como se fosse uma janela para a sala. É a
 * forma mais barata de paralaxe que há — não custa um único cálculo em
 * JavaScript, porque é o browser que segura a imagem.
 *
 * POR CIMA DELA VÊM TRÊS VÉUS. Sem eles, o texto branco caía em cima das
 * camisas brancas dos empregados e não se lia nada. A fotografia é
 * ambiente; quem manda é o texto.
 *
 * E por cima de tudo continuam as brasas quentes a derivar devagar, o
 * grão e — no rato — o holofote que segue o cursor.
 */
export function FundoVivo() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [comRato, setComRato] = React.useState(false);

  React.useEffect(() => {
    // Em telemóvel não há cursor: poupamos o trabalho todo.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    setComRato(true);

    let pedido = 0;
    let x = 0;
    let y = 0;

    function mover(evento: PointerEvent) {
      x = evento.clientX;
      y = evento.clientY;
      if (pedido) return;
      pedido = requestAnimationFrame(() => {
        pedido = 0;
        const no = ref.current;
        if (!no) return;
        no.style.setProperty('--rato-x', `${x}px`);
        no.style.setProperty('--rato-y', `${y}px`);
      });
    }

    window.addEventListener('pointermove', mover, { passive: true });
    return () => {
      window.removeEventListener('pointermove', mover);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-grafite">
      <Image
        src={FOTO_CASA_CHEIA}
        alt=""
        fill
        priority
        sizes="100vw"
        quality={55}
        className="object-cover object-center"
      />
      {/* Primeiro véu: baixa a fotografia toda a um plano de fundo. */}
      <div className="absolute inset-0 bg-grafite/[0.80]" />
      {/* Segundo: fecha o topo e o fundo, onde a barra e o rodapé assentam. */}
      <div className="absolute inset-0 bg-gradient-to-b from-grafite via-grafite/70 to-grafite" />
      {/* Terceiro: puxa o lado esquerdo, que é onde o texto vive. */}
      <div className="absolute inset-0 bg-gradient-to-r from-grafite via-grafite/70 to-grafite/40" />

      <div className="brasa brasa-laranja absolute -right-[18vw] -top-[26vw] h-[78vw] w-[78vw]" />
      <div className="brasa brasa-cobre absolute -left-[24vw] top-[38vh] h-[70vw] w-[70vw]" />
      <div className="brasa brasa-fria absolute bottom-[-30vw] right-[6vw] h-[62vw] w-[62vw]" />

      {comRato ? <div ref={ref} className="holofote absolute inset-0" /> : null}

      <div className="vinheta" />
      <div className="grao absolute inset-0" />
    </div>
  );
}
