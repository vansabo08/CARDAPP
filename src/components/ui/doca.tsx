'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Doca de navegação, no espírito da do macOS: os ícones crescem à
 * passagem e os vizinhos acompanham com metade da força.
 *
 * Feita sem framer-motion de propósito. A biblioteca traz ~50 kB para
 * fazer o que três transições de CSS fazem — e o painel abre em
 * telemóveis modestos. A ampliação é calculada pela distância ao ícone
 * apontado e aplicada num `transform`, que o compositor trata sozinho.
 *
 * Também não usa @radix-ui/react-tooltip: o rótulo é um `span`
 * posicionado, e o botão leva `aria-label` para quem navega por leitor
 * de ecrã.
 */

export type ItemDoca = {
  icone: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  rotulo: string;
  href: string;
  activo?: boolean;
};

export function Doca({ itens, className }: { itens: ItemDoca[]; className?: string }) {
  const [apontado, setApontado] = React.useState<number | null>(null);

  return (
    <nav
      aria-label="Navegação"
      className={cn('pointer-events-none flex w-full justify-center', className)}
    >
      <div
        onPointerLeave={() => setApontado(null)}
        className={cn(
          'vidro pointer-events-auto flex items-end gap-1 rounded-full px-2.5 py-2',
        )}
      >
        {itens.map((item, i) => {
          // O vizinho imediato cresce metade; o resto fica quieto.
          const distancia = apontado === null ? 9 : Math.abs(apontado - i);
          const escala = distancia === 0 ? 1.28 : distancia === 1 ? 1.12 : 1;
          const subida = distancia === 0 ? -8 : distancia === 1 ? -3 : 0;

          const Icone = item.icone;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.rotulo}
              aria-current={item.activo ? 'page' : undefined}
              onPointerEnter={() => setApontado(i)}
              onFocus={() => setApontado(i)}
              className="group relative flex flex-col items-center outline-none"
            >
              {/* rótulo */}
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute -top-9 whitespace-nowrap rounded-full border border-linha',
                  'bg-grafite px-2.5 py-1 font-sans text-xs font-semibold text-creme',
                  'opacity-0 transition-opacity duration-200 ease-calmo',
                  'group-hover:opacity-100 group-focus-visible:opacity-100',
                )}
              >
                {item.rotulo}
              </span>

              <span
                style={{ transform: `translateY(${subida}px) scale(${escala})` }}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-[15px]',
                  'transition-[transform,background-color,color] duration-[220ms] ease-calmo',
                  'group-active:scale-95',
                  item.activo
                    ? 'bg-ouro/15 text-ouro'
                    : 'text-tenue group-hover:bg-white/[0.06] group-hover:text-creme',
                )}
              >
                <Icone className="h-[21px] w-[21px]" strokeWidth={1.6} />
              </span>

              {/* ponto de página actual */}
              <span
                aria-hidden
                className={cn(
                  'mt-1 block h-[4px] w-[4px] rounded-full transition-colors duration-200',
                  item.activo ? 'bg-ouro' : 'bg-transparent',
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
