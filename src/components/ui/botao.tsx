'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Controlos em pastilha, como na referência. O dourado é o único
 * destaque de marca; o verde pertence exclusivamente ao WhatsApp.
 *
 * O botão é físico: sobe um pixel debaixo do cursor e a sombra cresce
 * com ele, afunda-se quando é premido e a sombra encolhe. É a sombra a
 * acompanhar o movimento que faz a peça parecer que tem peso — sem ela,
 * o `translateY` lê-se como um salto sem causa.
 */
const botaoVariantes = cva(
  cn(
    'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full',
    'font-sans font-semibold whitespace-nowrap',
    // Transform e opacity movem-se; a sombra e a cor acompanham. Nenhuma
    // destas provoca refluxo.
    'transition-[background-color,color,border-color,opacity,transform,box-shadow]',
    'duration-rapida ease-assinatura',
    'hover:-translate-y-px active:translate-y-0 active:scale-[0.97] active:duration-[120ms]',
    // Acessibilidade, não enfeite: quem navega por teclado tem de ver
    // onde está.
    'outline-none focus-visible:ring-2 focus-visible:ring-ouro focus-visible:ring-offset-2 focus-visible:ring-offset-grafite',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    'disabled:hover:translate-y-0 disabled:shadow-none',
  ),
  {
    variants: {
      variante: {
        ouro: 'bg-ouro text-grafite shadow-elevacao-1 hover:bg-ouro-claro hover:shadow-elevacao-2 active:shadow-elevacao-1',
        creme:
          'bg-creme text-grafite shadow-elevacao-1 hover:bg-white hover:shadow-elevacao-2 active:shadow-elevacao-1',
        grafite:
          'bg-grafite-carta text-creme shadow-elevacao-1-escura hover:bg-grafite-suave hover:shadow-elevacao-2-escura active:shadow-elevacao-1-escura',
        contorno:
          'border border-linha bg-transparent text-creme hover:border-creme/30 hover:bg-creme/[0.05] hover:shadow-elevacao-1-escura',
        'contorno-escuro':
          'border border-linha-escura bg-transparent text-grafite hover:border-grafite/22 hover:bg-grafite/[0.04] hover:shadow-elevacao-1',
        verde:
          'bg-verde text-white shadow-elevacao-1 hover:bg-[#12ad61] hover:shadow-elevacao-2 active:shadow-elevacao-1',
        // Os discretos não têm corpo, por isso não têm sombra nem sobem:
        // uma sombra debaixo de texto solto lê-se como sujidade.
        discreto: 'bg-transparent text-tenue hover:translate-y-0 hover:text-creme',
        'discreto-escuro':
          'bg-transparent text-tenue-escuro hover:translate-y-0 hover:text-grafite',
      },
      tamanho: {
        sm: 'h-9 px-4 text-xs',
        md: 'h-11 px-5 text-sm',
        lg: 'h-[54px] px-8 text-sm',
        icone: 'h-11 w-11 p-0',
        'icone-sm': 'h-8 w-8 p-0',
      },
      largo: { true: 'w-full', false: '' },
    },
    defaultVariants: { variante: 'ouro', tamanho: 'md', largo: false },
  },
);

/** Onde o rodopio se senta, e quanto o texto se afasta para lhe dar lugar. */
const FOLGA: Record<string, { esquerda: string; desvio: string }> = {
  sm: { esquerda: 'left-3', desvio: 'translate-x-2' },
  md: { esquerda: 'left-4', desvio: 'translate-x-2.5' },
  lg: { esquerda: 'left-5', desvio: 'translate-x-3' },
  icone: { esquerda: 'left-0 right-0', desvio: 'translate-x-0' },
  'icone-sm': { esquerda: 'left-0 right-0', desvio: 'translate-x-0' },
};

export type EstadoBotao = 'sucesso' | 'erro';

export interface BotaoProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof botaoVariantes> {
  asChild?: boolean;
  /** Mostra o rodopio e trava o botão, sem lhe tirar o texto. */
  aCarregar?: boolean;
  /** Um sinal de uma vez: o visto a desenhar-se, ou o abanão do erro. */
  estado?: EstadoBotao | null;
}

export const Botao = React.forwardRef<HTMLButtonElement, BotaoProps>(
  (
    {
      className,
      variante,
      tamanho,
      largo,
      asChild = false,
      aCarregar = false,
      estado = null,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    // Um `asChild` embrulha um link, e um link não carrega nem tem
    // sucesso: injectar-lhe filhos partia o Slot, que só aceita um.
    if (asChild) {
      return (
        <Comp
          ref={ref}
          className={cn(botaoVariantes({ variante, tamanho, largo }), className)}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    const folga = FOLGA[tamanho ?? 'md'] ?? FOLGA.md;
    const aMostrarVisto = estado === 'sucesso';

    return (
      <button
        ref={ref}
        disabled={disabled || aCarregar}
        aria-busy={aCarregar || undefined}
        className={cn(
          botaoVariantes({ variante, tamanho, largo }),
          // O erro abana; o sucesso salta. A chave muda com o estado
          // para a animação voltar a correr do princípio.
          estado === 'erro' && 'animate-abanar',
          aMostrarVisto && 'animate-saltinho',
          className,
        )}
        {...props}
      >
        {/*
          O rodopio entra em posição absoluta, e o texto desvia-se com um
          `translate-x`. Nada entra no fluxo, por isso a largura do botão
          é literalmente a mesma antes e durante — não encolhe, não salta,
          e não se anima nenhuma propriedade que provoque refluxo.
        */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2',
            folga.esquerda,
            'transition-[opacity,transform] duration-rapida ease-assinatura',
            aCarregar ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        >
          <Rodopio />
        </span>

        <span
          className={cn(
            'inline-flex items-center gap-2',
            'transition-[opacity,transform] duration-rapida ease-assinatura',
            aCarregar ? cn('opacity-60', folga.desvio) : 'translate-x-0 opacity-100',
            // Enquanto o visto está no ar, o texto sai da frente.
            aMostrarVisto && 'opacity-0',
          )}
        >
          {children}
        </span>

        {aMostrarVisto ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <Visto />
          </span>
        ) : null}
      </button>
    );
  },
);
Botao.displayName = 'Botao';

/**
 * Um sinal que se apaga sozinho.
 *
 * O visto e o abanão são acontecimentos, não estados: se ficassem
 * presos ao "guardado" do formulário, o visto ficava no botão até a
 * página mudar, e ao fim de meio minuto já não diz nada a ninguém.
 * Aparece, cumpre, sai.
 */
export function useSinalDeBotao(duracao = 1400) {
  const [sinal, setSinal] = React.useState<EstadoBotao | null>(null);

  React.useEffect(() => {
    if (!sinal) return;
    const relogio = setTimeout(() => setSinal(null), duracao);
    return () => clearTimeout(relogio);
  }, [sinal, duracao]);

  return [sinal, setSinal] as const;
}

/**
 * O rodopio.
 *
 * `linear` de propósito: é uma das duas excepções da casa. Uma roda que
 * acelera e trava não parece que está a trabalhar, parece que está a
 * falhar.
 */
function Rodopio() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 animate-spin" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** O visto que se desenha a si próprio. */
function Visto() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="m20 6-11 11-5-5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        // 24 é o comprimento aproximado do traço; começa todo escondido.
        strokeDasharray="24"
        className="animate-desenhar-visto"
      />
    </svg>
  );
}

export { botaoVariantes };
