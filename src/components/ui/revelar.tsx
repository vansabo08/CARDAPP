'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Entrada discreta: fade + 8px de subida, 240ms. Nada mais.
 * Respeita prefers-reduced-motion atraves do CSS global.
 */
export function Revelar({
  children,
  atraso = 0,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  atraso?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = React.useRef<HTMLElement>(null);
  const [visivel, setVisivel] = React.useState(false);

  React.useEffect(() => {
    const no = ref.current;
    if (!no) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisivel(true);
      return;
    }
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          observador.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    observador.observe(no);
    return () => observador.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${atraso}ms` }}
      className={cn(
        'transition-[opacity,transform] duration-[240ms] ease-out',
        visivel ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
