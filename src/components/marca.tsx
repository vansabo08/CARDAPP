import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Marca({
  className,
  href = '/',
  tamanho = 'md',
}: {
  className?: string;
  href?: string | null;
  tamanho?: 'sm' | 'md';
}) {
  const conteudo = (
    <span
      className={cn(
        'inline-flex items-baseline font-display tracking-[-0.02em]',
        tamanho === 'sm' ? 'text-[17px]' : 'text-[20px]',
        className,
      )}
    >
      Cardapp
      <span className="ml-[3px] inline-block h-[5px] w-[5px] translate-y-[-1px] rounded-full bg-ouro" />
    </span>
  );

  if (!href) return conteudo;
  return (
    <Link href={href} className="transition-opacity duration-200 hover:opacity-80">
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
        'etiqueta inline-flex items-center gap-1.5 transition-opacity duration-200 hover:opacity-70',
        claro ? 'text-tenue-escuro' : 'text-tenue',
      )}
    >
      feito com
      <span className="font-display text-[13px] normal-case tracking-normal">Cardapp</span>
    </a>
  );
}
