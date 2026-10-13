import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * O símbolo do CardApp: o canto de um QR que se abre num C, com o prato
 * ao centro.
 *
 * Vem em SVG, e não em PNG. O símbolo aparece a 16 px no separador do
 * browser e a 512 no ecrã inicial de um telemóvel: em vector é o mesmo
 * ficheiro de um quilobyte nos dois, sempre nítido. Antes eram cinco
 * PNG de tamanhos diferentes, e o de 24 px via-se esborratado nos ecrãs
 * de maior densidade.
 *
 * DUAS VERSÕES, segundo o fundo onde assenta — é a regra do guia de
 * marca. Em fundo claro, o C vai a tinta com o prato amarelo; em fundo
 * escuro, o C vai amarelo com o prato branco. Pôr o de fundo claro sobre
 * escuro dá uma mancha preta onde devia estar a marca.
 *
 * `unoptimized` porque é SVG: não há nada para o Next comprimir, e
 * mandá-lo pelo optimizador obrigaria a abrir a porta a SVG de fora.
 */
export function Logotipo({
  tamanho,
  className,
  alt = '',
  tom = 'claro',
}: {
  tamanho: number;
  className?: string;
  /** Vazio quando o nome "CardApp" já vai escrito ao lado. */
  alt?: string;
  /** O fundo onde assenta: `claro` é o normal; `escuro` inverte. */
  tom?: 'claro' | 'escuro';
}) {
  return (
    <Image
      src={tom === 'escuro' ? '/brand/cardapp-simbolo-ondark.svg' : '/brand/cardapp-simbolo-primary.svg'}
      width={tamanho}
      height={tamanho}
      alt={alt}
      unoptimized
      // A marca está no topo de todos os ecrãs. Carregada "à preguiça",
      // como o next/image faz por omissão, aparecia um espaço vazio ao
      // lado de "CardApp" até o browser decidir ir buscá-la.
      loading="eager"
      className={cn('shrink-0', className)}
    />
  );
}
