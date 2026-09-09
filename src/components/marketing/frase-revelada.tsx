'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * A frase que se acende à medida que se lê.
 *
 * Um só observador, na frase inteira. Quando ela entra no ecrã, as
 * palavras acendem em cascata da esquerda para a direita — e a cascata é
 * feita pelo `transition-delay` de cada palavra, não por temporizadores
 * em JavaScript. O browser trata do resto.
 *
 * A primeira versão observava cada palavra à parte, para acender ao
 * cruzar uma linha de gatilho. Ficava bonito no papel e meio partido no
 * ecrã: parte das palavras acendia e as outras ficavam apagadas para
 * sempre, porque bastava um observador perder um elemento para aquela
 * palavra nunca mais acender. Um efeito que pode meio-falhar deixa a
 * frase ilegível a meio, e esta frase é a promessa do produto.
 */
export function FraseRevelada({
  texto,
  className,
}: {
  texto: string;
  className?: string;
}) {
  const palavras = React.useMemo(() => texto.split(' '), [texto]);
  const ref = React.useRef<HTMLParagraphElement>(null);

  /**
   * Nasce acesa, apaga-se só quando o JavaScript garante que a volta a
   * acender. O contrário deixaria a frase a 25% de opacidade sempre que
   * o script falhasse, não corresse ou a hidratação partisse. Um efeito
   * que se perde não custa nada; uma frase que não se lê custa a venda.
   */
  const [assumido, setAssumido] = React.useState(false);
  const [acesa, setAcesa] = React.useState(false);

  React.useEffect(() => {
    const no = ref.current;
    if (!no) return;

    const reduzido =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Sem observador, ou com movimento reduzido, fica tudo legível.
    if (typeof IntersectionObserver === 'undefined' || reduzido) return;

    setAssumido(true);

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        setAcesa(true);
        observador.disconnect();
      },
      // Começa quando um quarto da frase já entrou pela base do ecrã.
      { rootMargin: '0px 0px -18% 0px', threshold: 0.25 },
    );

    observador.observe(no);
    return () => observador.disconnect();
  }, []);

  const visivel = !assumido || acesa;

  return (
    <p ref={ref} className={cn('text-balance', className)}>
      {palavras.map((palavra, i) => (
        <React.Fragment key={`${palavra}-${i}`}>
          <span
            // A cascata: cada palavra espera um pouco mais do que a
            // anterior, o que devolve a cadência de quem lê em voz alta.
            style={{ transitionDelay: visivel ? `${i * 55}ms` : '0ms' }}
            className={cn(
              'inline-block transition-opacity duration-[600ms] ease-calmo',
              'text-creme',
              visivel ? 'opacity-100' : 'opacity-25',
            )}
          >
            {palavra}
          </span>
          {i < palavras.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </p>
  );
}
