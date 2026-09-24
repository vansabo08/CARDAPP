'use client';

import * as React from 'react';
import { m, useMotionValue, useSpring } from 'motion/react';
import { ProvedorDeMovimento } from '@/components/cardapio/movimento';
import { Telemovel } from './telemovel';

/**
 * O aparelho do herói, a flutuar.
 *
 * Estava parado, como uma fotografia de catálogo. Um telemóvel parado
 * num sítio onde tudo o resto respira parece uma imagem colada. Este:
 *
 * 1. PAIRA. Sobe e desce doze pixels em oito segundos, com uma inclinação
 *    de menos de um grau. É lento de propósito — o que se nota é que
 *    está vivo, não o movimento em si.
 * 2. SEGUE O RATO. No computador, inclina-se para o lado onde o cursor
 *    está, como um objecto que se vira para quem olha. A mola dá-lhe
 *    peso; sem ela seria um espelho a copiar o rato.
 * 3. FICA PARA TRÁS. A rolar, desce mais devagar do que o texto ao lado.
 *    É o paralaxe: duas coisas à mesma distância movem-se juntas, e é
 *    isso que faz uma página parecer chapada.
 *
 * Quem tem "reduzir movimento" ligado no telefone vê-o quieto: o
 * `MotionConfig` do provedor trata disso.
 *
 * O TAMANHO. O aparelho é desenhado sempre a 330 px e encolhido por CSS,
 * e não redesenhado em cada tamanho de ecrã: assim o ecrã lá dentro é o
 * mesmo em toda a parte, e não há salto nenhum entre o que o servidor
 * manda e o que o browser mostra.
 */

const LARGURA = 330;
/** Altura do aparelho para esta largura — moldura incluída. */
const ALTURA = 695;

export function TelemovelFlutuante({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorDeMovimento>
      <Aparelho>{children}</Aparelho>
    </ProvedorDeMovimento>
  );
}

function Aparelho({ children }: { children: React.ReactNode }) {
  const inclinacaoX = useMotionValue(0);
  const inclinacaoY = useMotionValue(0);
  const deriva = useMotionValue(0);

  const molaX = useSpring(inclinacaoX, { stiffness: 90, damping: 18, mass: 0.6 });
  const molaY = useSpring(inclinacaoY, { stiffness: 90, damping: 18, mass: 0.6 });
  const molaDeriva = useSpring(deriva, { stiffness: 70, damping: 20, mass: 0.5 });

  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const comRato = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let pedido = 0;

    function mover(evento: PointerEvent) {
      if (pedido) return;
      pedido = requestAnimationFrame(() => {
        pedido = 0;
        // −1 a 1 a partir do meio do ecrã; oito graus chegam para dar volume.
        const x = (evento.clientX / window.innerWidth) * 2 - 1;
        const y = (evento.clientY / window.innerHeight) * 2 - 1;
        inclinacaoY.set(x * 8);
        inclinacaoX.set(-y * 5);
      });
    }

    function rolar() {
      if (pedido) return;
      pedido = requestAnimationFrame(() => {
        pedido = 0;
        // Fica para trás, mas com tecto: não se despega da coluna de texto.
        deriva.set(Math.min(window.scrollY * 0.06, 42));
      });
    }

    if (comRato) window.addEventListener('pointermove', mover, { passive: true });
    window.addEventListener('scroll', rolar, { passive: true });
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('scroll', rolar);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, [deriva, inclinacaoX, inclinacaoY]);

  return (
    <m.div
      /* A caixa que ocupa o lugar na grelha. O aparelho lá dentro está
         encolhido por transformação, que não ocupa espaço nenhum — por
         isso a altura vem da proporção. */
      className="relative w-[136px] [--escala:0.412] sm:w-[190px] sm:[--escala:0.5757] lg:w-[330px] lg:[--escala:1]"
      style={{ aspectRatio: `${LARGURA} / ${ALTURA}`, y: molaDeriva }}
    >
      {/*
        A SOMBRA NO CHÃO, e não um halo por trás.

        Aqui esteve uma mancha — primeiro escura, depois laranja — atrás
        do aparelho. Uma nódoa a pairar no ar não existe em lado nenhum:
        um objecto suspenso faz sombra por baixo de si, achatada, mais
        aberta e mais clara quanto mais alto está.

        Esta é uma elipse desfocada por baixo do aparelho, que encolhe e
        escurece ao ritmo do voo — quando o telemóvel sobe, ela abre e
        desmaia. O `y` do voo vive no elemento de cima; aqui a elipse faz
        o contrário dele, que é o que dá o peso.
      */}
      <m.div
        aria-hidden
        className="pointer-events-none absolute inset-x-[8%] bottom-[-5%] -z-10 h-[7%] rounded-[50%] bg-[#17161b] blur-xl"
        animate={{ opacity: [0.3, 0.16, 0.3], scaleX: [1, 0.86, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <m.div
        className="absolute inset-0"
        style={{ perspective: 1200, rotateX: molaX, rotateY: molaY, transformStyle: 'preserve-3d' }}
      >
        <m.div
          className="absolute inset-0"
          animate={{ y: [0, -12, 0], rotate: [-0.7, 0.7, -0.7] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="origin-top-left"
            style={{ width: LARGURA, transform: 'scale(var(--escala))' }}
          >
            <Telemovel largura={LARGURA}>{children}</Telemovel>
          </div>
        </m.div>
      </m.div>
    </m.div>
  );
}
