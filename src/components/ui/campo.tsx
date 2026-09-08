import * as React from 'react';
import { cn } from '@/lib/utils';

export type CampoProps = React.InputHTMLAttributes<HTMLInputElement> & { claro?: boolean };

export const Campo = React.forwardRef<HTMLInputElement, CampoProps>(
  ({ className, claro = false, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-campo border bg-transparent px-3.5 font-sans text-[15px] outline-none transition-colors duration-200',
        'placeholder:text-tenue focus:border-ouro',
        claro
          ? 'border-linha-escura text-grafite placeholder:text-tenue-escuro'
          : 'border-linha text-creme',
        className,
      )}
      {...props}
    />
  ),
);
Campo.displayName = 'Campo';

export type AreaTextoProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { claro?: boolean };

export const AreaTexto = React.forwardRef<HTMLTextAreaElement, AreaTextoProps>(
  ({ className, claro = false, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full resize-none rounded-campo border bg-transparent px-3.5 py-3 font-sans text-[15px] outline-none transition-colors duration-200',
        'placeholder:text-tenue focus:border-ouro',
        claro
          ? 'border-linha-escura text-grafite placeholder:text-tenue-escuro'
          : 'border-linha text-creme',
        className,
      )}
      {...props}
    />
  ),
);
AreaTexto.displayName = 'AreaTexto';

export function Rotulo({
  className,
  claro = false,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { claro?: boolean }) {
  return (
    <label
      className={cn('etiqueta mb-2 block', claro ? 'text-tenue-escuro' : 'text-tenue', className)}
      {...props}
    />
  );
}

export function Ajuda({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-2 font-sans text-[13px] text-tenue', className)} {...props} />;
}

export function Erro({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-2 font-sans text-[13px] text-[#e0655a]', className)} {...props} />;
}
