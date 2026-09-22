import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * O logótipo oficial do CardApp: faca e garfo brancos, cruzados, num
 * disco preto.
 *
 * É a imagem que a casa escolheu, tal como veio — recortada à volta do
 * disco e passada a PNG, sem um pixel mudado. Antes havia aqui um
 * redesenho em vector, dourado e sem disco; saiu, para o logótipo ser um
 * só em todo o lado: no separador do browser, no ecrã inicial do
 * telemóvel e dentro da aplicação.
 *
 * O ficheiro original tem 1778 px. O next/image serve-o reduzido ao
 * tamanho a que aparece, por isso uma marca de 30 px pesa uns poucos
 * quilobytes e não os 374 do original.
 */
export function Logotipo({
  tamanho,
  className,
  alt = '',
}: {
  tamanho: number;
  className?: string;
  /** Vazio quando o nome "CardApp" já vai escrito ao lado. */
  alt?: string;
}) {
  return (
    <Image
      src="/logo.png"
      width={tamanho}
      height={tamanho}
      alt={alt}
      // A marca está no topo de todos os ecrãs. Carregada "à preguiça",
      // como o next/image faz por omissão, aparecia um espaço vazio ao
      // lado de "CardApp" até o browser decidir ir buscá-la.
      loading="eager"
      className={cn('shrink-0 rounded-full', className)}
    />
  );
}
