'use client';

import * as React from 'react';
import { m, useInView } from 'motion/react';
import { ProvedorDeMovimento, ASSINATURA } from '@/components/cardapio/movimento';

/**
 * Entra quando se chega, sai quando se passa.
 *
 * O `Revelar` que a página já usa aparece uma vez e fica — é a entrada
 * discreta do texto. Isto é outra coisa: o bloco entra pelo lado, com
 * profundidade, e recolhe quando sai do ecrã, de modo que voltar atrás
 * volta a mostrá-lo. Serve para os telemóveis e os cartões, que é onde
 * o movimento conta alguma coisa; num parágrafo seria só uma pessoa a
 * ler um texto que foge.
 *
 * Quem tem "reduzir movimento" ligado recebe tudo quieto e visível — é o
 * `MotionConfig` do provedor que trata disso.
 */

type Lado = 'esquerda' | 'direita' | 'baixo';

const DE_ONDE: Record<Lado, { x?: number; y?: number; rotate?: number }> = {
  esquerda: { x: -70, rotate: -3 },
  direita: { x: 70, rotate: 3 },
  baixo: { y: 60 },
};

export function EntraESai({
  children,
  de = 'baixo',
  atraso = 0,
  className,
}: {
  children: React.ReactNode;
  de?: Lado;
  /** Segundos, para escalonar dois ou três blocos seguidos. */
  atraso?: number;
  className?: string;
}) {
  return (
    <ProvedorDeMovimento>
      <Bloco de={de} atraso={atraso} className={className}>
        {children}
      </Bloco>
    </ProvedorDeMovimento>
  );
}

function Bloco({
  children,
  de,
  atraso,
  className,
}: {
  children: React.ReactNode;
  de: Lado;
  atraso: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  /*
   * A margem tira uma fatia de cima e de baixo do ecrã: o bloco só conta
   * como "à vista" quando entra a sério, e sai antes de chegar à borda.
   * Sem isto, um bloco alto nunca deixava de estar à vista e a saída não
   * chegava a acontecer.
   */
  const aVista = useInView(ref, { margin: '-12% 0px -12% 0px' });

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...DE_ONDE[de] }}
      animate={
        aVista
          ? { opacity: 1, x: 0, y: 0, rotate: 0 }
          : { opacity: 0, ...DE_ONDE[de] }
      }
      transition={{ duration: 0.62, ease: ASSINATURA, delay: aVista ? atraso : 0 }}
    >
      {children}
    </m.div>
  );
}
