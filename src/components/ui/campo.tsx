import * as React from 'react';
import { cn } from '@/lib/utils';

/*
 * Os campos são cheios, e não só contorno.
 *
 * Um campo de contorno fino num fundo escuro lê-se como um rectângulo
 * desenhado — é preciso procurar onde se escreve. Com um fundo um pouco
 * mais claro do que o cartão, o campo é um sítio: vê-se de relance, e o
 * foco pinta-lhe a aresta de laranja.
 *
 * Mais altos também: 48 px, que é o que o polegar acerta sem apontar.
 */
const BASE_ESCURA =
  'border border-transparent bg-white/[0.05] text-creme placeholder:text-creme/35 hover:bg-white/[0.07] focus:border-laranja focus:bg-white/[0.07]';
const BASE_CLARA =
  'border border-linha-escura bg-white text-grafite placeholder:text-tenue-escuro focus:border-laranja';

export type CampoProps = React.InputHTMLAttributes<HTMLInputElement> & { claro?: boolean };

export const Campo = React.forwardRef<HTMLInputElement, CampoProps>(
  ({ className, claro = false, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-campo px-4 font-sans text-base outline-none transition-colors duration-200',
        claro ? BASE_CLARA : BASE_ESCURA,
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
        'w-full resize-none rounded-campo px-4 py-3 font-sans text-base outline-none transition-colors duration-200',
        claro ? BASE_CLARA : BASE_ESCURA,
        className,
      )}
      {...props}
    />
  ),
);
AreaTexto.displayName = 'AreaTexto';

/**
 * O nome do campo, em letra normal.
 *
 * Era uma etiqueta em maiúsculas espaçadas. Repetida campo a campo, num
 * formulário inteiro, lia-se como um formulário de repartição; em letra
 * normal e semibold lê-se como uma pergunta.
 */
export function Rotulo({
  className,
  claro = false,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { claro?: boolean }) {
  return (
    <label
      className={cn(
        'mb-2 block font-sans text-sm font-semibold',
        claro ? 'text-grafite' : 'text-creme/85',
        className,
      )}
      {...props}
    />
  );
}

export function Ajuda({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-2 font-sans text-xs text-tenue', className)} {...props} />;
}

export function Erro({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-2 font-sans text-xs text-[#ff8a78]', className)} {...props} />;
}
