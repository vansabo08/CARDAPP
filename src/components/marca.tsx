import Link from 'next/link';
import { MarcaSimbolo } from '@/components/marca-simbolo';
import { cn } from '@/lib/utils';

/**
 * A marca: símbolo + palavra.
 *
 * O ponto dourado que estava a seguir a "Cardapp" saiu — o símbolo já
 * faz esse trabalho, e dois acentos ao lado um do outro só se roubavam
 * atenção.
 */
export function Marca({
  className,
  href = '/',
  tamanho = 'md',
  soSimbolo = false,
}: {
  className?: string;
  href?: string | null;
  tamanho?: 'sm' | 'md';
  soSimbolo?: boolean;
}) {
  const ladoSimbolo = tamanho === 'sm' ? 'h-[22px] w-[22px]' : 'h-[26px] w-[26px]';

  const conteudo = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <MarcaSimbolo className={cn(ladoSimbolo, 'text-ouro')} />
      {!soSimbolo ? (
        <span
          className={cn(
            'font-display tracking-[-0.02em]',
            tamanho === 'sm' ? 'text-base' : 'text-xl',
          )}
        >
          Cardapp
        </span>
      ) : null}
    </span>
  );

  if (!href) return conteudo;
  return (
    <Link href={href} className="inline-flex transition-opacity duration-200 hover:opacity-80">
      {conteudo}
    </Link>
  );
}

/** Assinatura discreta que o plano Balcão mostra no cardápio público. */
export function AssinaturaCardapp({ claro = false }: { claro?: boolean }) {
  return (
    <a
      href="/"
      className={cn(
        'etiqueta inline-flex items-center gap-2 transition-opacity duration-200 hover:opacity-70',
        claro ? 'text-tenue-escuro' : 'text-tenue',
      )}
    >
      feito com
      <MarcaSimbolo className="h-[13px] w-[13px]" />
      <span className="font-display text-xs normal-case tracking-normal">Cardapp</span>
    </a>
  );
}
