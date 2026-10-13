import Image from 'next/image';
import Link from 'next/link';
import { Logotipo } from '@/components/logotipo';
import { cn } from '@/lib/utils';

/**
 * A marca: o símbolo e a palavra, no logótipo oficial.
 *
 * A PALAVRA VEM DENTRO DO FICHEIRO, em curvas, e não escrita com a letra
 * da aplicação. São coisas diferentes: a letra da app muda quando se
 * muda o desenho dos ecrãs; um logótipo não muda. Enquanto a palavra era
 * texto normal ao lado do símbolo, bastou trocar a fonte do projecto
 * para o logótipo aparecer noutra letra sem ninguém decidir isso.
 *
 * TRÊS REGRAS, do guia de marca:
 *
 *  1. ALTURA MÍNIMA DE 32 px no horizontal. Abaixo disso o guia manda
 *     usar só o símbolo — e é o que `soSimbolo` faz.
 *  2. DUAS VERSÕES, uma para fundo claro e outra para escuro. A escura
 *     é de uma cor só, com o prato vazado: assenta em cima de uma
 *     fotografia sem perder a forma.
 *  3. NÃO SE DEFORMA. A altura manda; a largura vem da proporção do
 *     ficheiro, que é 4,717 para 1.
 */

/** A proporção do logótipo horizontal: largura a dividir pela altura. */
const RACIO = 4.717;

const ALTURA = { sm: 32, md: 40 } as const;

export function Marca({
  className,
  href = '/',
  tamanho = 'md',
  soSimbolo = false,
  tom = 'claro',
}: {
  className?: string;
  href?: string | null;
  tamanho?: 'sm' | 'md';
  soSimbolo?: boolean;
  /** O fundo onde assenta: `claro` é o normal; `escuro` inverte. */
  tom?: 'claro' | 'escuro';
}) {
  const altura = ALTURA[tamanho];

  const conteudo = soSimbolo ? (
    <Logotipo tamanho={altura} alt="CardApp" tom={tom} className={className} />
  ) : (
    <Image
      src={
        tom === 'escuro'
          ? '/brand/cardapp-horizontal-white.svg'
          : '/brand/cardapp-horizontal-primary.svg'
      }
      width={Math.round(altura * RACIO)}
      height={altura}
      alt="CardApp"
      unoptimized
      loading="eager"
      className={cn('shrink-0', className)}
    />
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
      <span className="font-display text-xs normal-case tracking-normal">CardApp</span>
    </a>
  );
}
