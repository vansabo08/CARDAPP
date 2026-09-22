'use client';

import * as React from 'react';
import { LazyMotion, MotionConfig, domAnimation, type Transition, type Variants } from 'motion/react';

/**
 * O movimento do cardápio do cliente.
 *
 * O cardápio era um papel: tudo aparecia de uma vez e nada respondia ao
 * dedo. Um cardápio que mexe diz ao cliente que está vivo — que o prato
 * entrou no pedido, que a categoria mudou, que aquilo é para tocar.
 *
 * TRÊS REGRAS:
 *
 * 1. É LEVE. Carrega-se o conjunto `domAnimation`, e não o `domMax`: fica
 *    de fora a animação de layout partilhado, que é a parte pesada. A
 *    pastilha da categoria que desliza faz-se com uma transformação de
 *    CSS, que não custa nada. Este ecrã abre num telemóvel barato, com
 *    dados móveis, à mesa — é o ecrã que mais tem de ser rápido.
 *
 * 2. É CURTO. Entre 150 e 300 ms nas respostas ao toque. O que demora
 *    mais — a capa a assentar — é ambiente, não bloqueia nada.
 *
 * 3. RESPEITA QUEM PEDE MENOS MOVIMENTO. Com `reducedMotion="user"`, quem
 *    ligou "reduzir movimento" no telefone vê as coisas aparecerem, sem
 *    deslizar nem crescer. Não é enfeite: há quem fique enjoado.
 */
export function ProvedorDeMovimento({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** A curva da casa: sai depressa e pousa devagar. */
export const ASSINATURA: Transition['ease'] = [0.22, 1, 0.36, 1];

/** Mola para o que responde ao dedo — o carrinho, o contador. */
export const MOLA: Transition = { type: 'spring', stiffness: 520, damping: 32, mass: 0.7 };

/** Sobe um pouco e aparece. É a entrada de quase tudo. */
export const SUBIR: Variants = {
  escondido: { opacity: 0, y: 14 },
  visivel: { opacity: 1, y: 0, transition: { duration: 0.32, ease: ASSINATURA } },
};

/** Vem da direita — para a fila de destaques, que se lê na horizontal. */
export const DA_DIREITA: Variants = {
  escondido: { opacity: 0, x: 24 },
  visivel: { opacity: 1, x: 0, transition: { duration: 0.36, ease: ASSINATURA } },
};

/**
 * Um contentor que faz os filhos entrarem em cascata.
 *
 * O atraso entre filhos é pequeno, e tem tecto: numa categoria de trinta
 * pratos, o último não pode ficar um segundo à espera da sua vez.
 */
export function cascata(entreFilhos = 0.045, antes = 0): Variants {
  return {
    escondido: {},
    visivel: { transition: { staggerChildren: entreFilhos, delayChildren: antes } },
  };
}

/** Só a primeira passagem conta: voltar atrás não repete a entrada. */
export const UMA_VEZ = { once: true, margin: '0px 0px -8% 0px' } as const;
