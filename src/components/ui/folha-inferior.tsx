'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

/**
 * Folha que sobe do fundo do ecra. E o gesto natural no telemovel:
 * o polegar ja esta em baixo, nao ha nada a atravessar o ecra todo.
 */
export function FolhaInferior({
  aberta,
  aoFechar,
  children,
  titulo,
  className,
  claro = true,
}: {
  aberta: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
  titulo: string;
  className?: string;
  claro?: boolean;
}) {
  return (
    <Dialog.Root open={aberta} onOpenChange={(v) => (v ? null : aoFechar())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 data-[state=open]:animate-aparecer" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[20px] outline-none',
            'data-[state=open]:animate-folha',
            claro ? 'bg-creme text-grafite' : 'bg-grafite-alto text-creme',
            className,
          )}
        >
          <Dialog.Title className="sr-only">{titulo}</Dialog.Title>
          <div className="flex shrink-0 justify-center pb-1 pt-3">
            <span
              className={cn(
                'block h-[4px] w-[38px] rounded-full',
                claro ? 'bg-grafite/15' : 'bg-creme/20',
              )}
            />
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
