import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const botaoVariantes = cva(
  'inline-flex items-center justify-center gap-2 rounded-[12px] font-sans text-[14px] font-semibold transition-[background-color,color,border-color,opacity] duration-200 ease-calmo disabled:pointer-events-none disabled:opacity-40 whitespace-nowrap',
  {
    variants: {
      variante: {
        ouro: 'bg-ouro text-grafite hover:bg-[#d8b23a]',
        creme: 'bg-creme text-grafite hover:bg-white',
        grafite: 'bg-grafite text-creme hover:bg-grafite-suave',
        contorno: 'border border-linha bg-transparent text-creme hover:border-creme/35 hover:bg-white/[0.04]',
        'contorno-escuro':
          'border border-linha-escura bg-transparent text-grafite hover:border-grafite/25 hover:bg-grafite/[0.04]',
        verde: 'bg-verde text-white hover:bg-[#12ad61]',
        discreto: 'bg-transparent text-tenue hover:text-creme',
        'discreto-escuro': 'bg-transparent text-tenue-escuro hover:text-grafite',
      },
      tamanho: {
        sm: 'h-9 px-3.5 text-[13px]',
        md: 'h-11 px-5',
        lg: 'h-[52px] px-7 text-[15px]',
        icone: 'h-10 w-10 p-0',
        'icone-sm': 'h-8 w-8 p-0',
      },
      largo: { true: 'w-full', false: '' },
    },
    defaultVariants: { variante: 'ouro', tamanho: 'md', largo: false },
  },
);

export interface BotaoProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof botaoVariantes> {
  asChild?: boolean;
}

export const Botao = React.forwardRef<HTMLButtonElement, BotaoProps>(
  ({ className, variante, tamanho, largo, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(botaoVariantes({ variante, tamanho, largo }), className)} {...props} />
    );
  },
);
Botao.displayName = 'Botao';

export { botaoVariantes };
