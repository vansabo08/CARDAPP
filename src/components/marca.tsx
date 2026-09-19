import Link from 'next/link';
import { Logotipo } from '@/components/logotipo';
import { cn } from '@/lib/utils';

/**
 * A marca: o logótipo e a palavra.
 *
 * O logótipo é a imagem oficial — o disco preto com a faca e o garfo. A
 * palavra fica ao lado porque o logótipo não tem nome escrito, e uma
 * barra de navegação só com talheres não diz de quem é.
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
  /*
   * Um pouco maior do que o símbolo antigo. Esse eram só os talheres, a
   * ocupar o quadrado todo; aqui vão dentro de um disco e ocupam três
   * quartos dele — ao mesmo tamanho, liam-se mais pequenos.
   */
  const lado = tamanho === 'sm' ? 24 : 30;

  const conteudo = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Logotipo tamanho={lado} alt={soSimbolo ? 'Cardapp' : ''} />
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
      <Logotipo tamanho={14} />
      <span className="font-display text-xs normal-case tracking-normal">Cardapp</span>
    </a>
  );
}
