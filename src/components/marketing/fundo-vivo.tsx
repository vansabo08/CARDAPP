'use client';

import * as React from 'react';

/**
 * O fundo da página inicial.
 *
 * Um preto liso lê-se como página morta. Por baixo de tudo ficam três
 * brasas quentes muito difusas a derivar devagar, grão fino e vinheta —
 * e, no rato, um holofote dourado que segue o cursor.
 *
 * Tudo em CSS: as brasas são gradientes radiais (não há filtros de
 * desfoque a custar pixels) e o holofote só actualiza duas variáveis
 * dentro de requestAnimationFrame.
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
      <div className="brasa brasa-ouro absolute -right-[18vw] -top-[26vw] h-[78vw] w-[78vw]" />
      <div className="brasa brasa-cobre absolute -left-[24vw] top-[38vh] h-[70vw] w-[70vw]" />
      <div className="brasa brasa-fria absolute bottom-[-30vw] right-[6vw] h-[62vw] w-[62vw]" />

      {comRato ? <div ref={ref} className="holofote absolute inset-0" /> : null}

      <div className="vinheta" />
      <div className="grao absolute inset-0" />
    </div>
  );
}
