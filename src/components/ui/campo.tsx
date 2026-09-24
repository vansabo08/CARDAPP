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
  'border border-transparent bg-black/[0.05] text-creme placeholder:text-creme/35 hover:bg-black/[0.07] focus:border-laranja focus:bg-black/[0.07]';
/*
 * No fundo claro — o cardapio do cliente —, o campo tem de se ver.
 *
 * Era branco, com uma aresta a 8% de preto, numa folha branca: um
 * rectangulo que so se encontrava sabendo que estava la. O cliente nao
 * dava com o sitio da observacao. Agora tem um fundo quente que o
 * separa da folha e uma aresta a 45%, que e o que chega aos 3:1 que um
 * limite de campo precisa para se distinguir.
 */
const BASE_CLARA =
  'border border-grafite/45 bg-grafite/[0.04] text-grafite placeholder:text-creme/55 hover:border-grafite/65 focus:border-laranja focus:bg-white focus:ring-2 focus:ring-laranja/20';

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

/**
 * Escolher um ficheiro, sem o botão que o browser dá.
 *
 * O `input type=file` cru desenha um botão do sistema e, ao lado, a
 * frase "Nenhum ficheiro selecionado" — no idioma do browser, e não no
 * nosso. Num painel em português de Angola aparecia texto em português
 * do Brasil, ou em inglês, conforme o telefone. Era a coisa mais
 * amadora do ecrã das definições.
 *
 * O input continua lá, escondido mas focável: é ele que abre a galeria,
 * que valida o tipo e que o teclado alcança. O que muda é que quem
 * desenha o botão somos nós, e quem escreve o estado também.
 */
export function EscolherFicheiro({
  id,
  accept,
  onChange,
  rotulo,
  className,
  disabled,
}: {
  id?: string;
  accept?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  /** O que o botão diz. "Escolher fotografia", "Trocar capa". */
  rotulo: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'inline-flex h-10 cursor-pointer items-center gap-2 rounded-campo border border-linha px-4 font-sans text-sm font-semibold text-creme transition-colors',
        'hover:border-laranja hover:text-laranja',
        'focus-within:border-laranja focus-within:text-laranja',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {rotulo}
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
    </label>
  );
}
