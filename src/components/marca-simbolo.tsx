import { cn } from '@/lib/utils';
import {
  ANGULO_FACA,
  ANGULO_GARFO,
  CABO,
  FACA_LAMINA,
  GARFO_CABECA,
  GARFO_DENTES,
} from '@/lib/simbolo';

/**
 * O símbolo do Cardapp: faca e garfo cruzados.
 *
 * A geometria vem de `@/lib/simbolo`, o mesmo ficheiro que o gerador de
 * ícones lê. Foi redesenhada em vector porque a imagem de origem vinha
 * com marcas de água, que ficariam no ícone — e assim fica nítida tanto
 * a 16px na barra de separadores como a 512px no ecrã inicial.
 */

function Cabo() {
  return (
    <rect
      x={CABO.x}
      y={CABO.y}
      width={CABO.largura}
      height={CABO.altura}
      rx={CABO.raio}
    />
  );
}

export function MarcaSimbolo({
  className,
  fundo,
}: {
  className?: string;
  /** Sem fundo o símbolo fica recortado — é assim na interface. */
  fundo?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('block', className)}
      role="img"
      aria-label="Cardapp"
    >
      {fundo ? <rect width="100" height="100" rx="50" fill={fundo} /> : null}

      <g fill="currentColor">
        <g transform={`rotate(${ANGULO_FACA} 50 50)`}>
          <path d={FACA_LAMINA} />
          <Cabo />
        </g>

        <g transform={`rotate(${ANGULO_GARFO} 50 50)`}>
          {GARFO_DENTES.map((dente, i) => (
            <rect
              key={i}
              x={dente.x}
              y={dente.y}
              width={dente.largura}
              height={dente.altura}
              rx={dente.raio}
            />
          ))}
          <path d={GARFO_CABECA} />
          <Cabo />
        </g>
      </g>
    </svg>
  );
}
