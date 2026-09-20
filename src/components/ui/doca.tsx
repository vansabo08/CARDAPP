'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * A barra de separadores do painel, no telemóvel.
 *
 * Era uma doca à moda do macOS: ícones soltos numa pastilha a flutuar,
 * que cresciam à passagem do dedo, com o nome escondido num balão que só
 * aparecia a pairar — e num ecrã de toque não se paira. Quem estava ao
 * balcão tinha de adivinhar o que era cada ícone.
 *
 * Passa a barra de separadores, como as das aplicações que as pessoas já
 * usam: presa ao fundo, de lado a lado, com o nome escrito debaixo de
 * cada ícone. O separador actual vai a laranja, ícone e nome, com uma
 * pastilha por trás do ícone — não se confunde de relance, nem com a
 * mão a tremer.
 */

export type ItemDoca = {
  icone: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  rotulo: string;
  href: string;
  activo?: boolean;
};

export function Doca({ itens, className }: { itens: ItemDoca[]; className?: string }) {
  return (
    <nav aria-label="Navegação" className={cn('w-full', className)}>
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {itens.map((item) => {
          const Icone = item.icone;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={item.activo ? 'page' : undefined}
                className={cn(
                  'group flex flex-col items-center gap-1 rounded-campo py-2 outline-none',
                  'transition-colors duration-200',
                  'focus-visible:ring-2 focus-visible:ring-laranja',
                  item.activo ? 'text-laranja' : 'text-creme/50 hover:text-creme',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200',
                    'group-active:scale-95',
                    item.activo ? 'bg-laranja/15' : 'group-hover:bg-white/[0.05]',
                  )}
                >
                  <Icone className="h-5 w-5" strokeWidth={item.activo ? 2.2 : 1.8} />
                </span>
                <span className="font-sans text-xs font-semibold">{item.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
