import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Ilustracao gerada para pratos sem fotografia.
 * Nada de "imagem em falta": desenhamos um prato visto de cima, sempre
 * igual para o mesmo nome, em SVG inline — zero pedidos de rede, o que
 * conta quando o cliente esta em 3G.
 */

const PALETAS = [
  { fundo: '#1d1a16', molho: '#8a5a2b', peca: '#c9a227', verde: '#4f6b3a' },
  { fundo: '#1a1c19', molho: '#6b6f3a', peca: '#c8b47a', verde: '#3f5d34' },
  { fundo: '#201a17', molho: '#9c4a2a', peca: '#d9b877', verde: '#5b6b3a' },
  { fundo: '#181b1d', molho: '#4a6470', peca: '#cbb98d', verde: '#47695a' },
  { fundo: '#1f1b1a', molho: '#7a3f2e', peca: '#dcc38b', verde: '#556b39' },
  { fundo: '#1b1917', molho: '#a8791f', peca: '#e2cd9a', verde: '#4a6437' },
];

function semente(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Duas casas decimais chegam e evitam divergencias servidor/cliente. */
function arred(n: number) {
  return Math.round(n * 100) / 100;
}

/** Gerador pseudo-aleatorio deterministico a partir da semente. */
function aleatorio(estado: { s: number }) {
  estado.s = (estado.s * 1664525 + 1013904223) % 4294967296;
  return estado.s / 4294967296;
}

export function PratoVisual({ nome, className }: { nome: string; className?: string }) {
  const base = semente(nome);
  const paleta = PALETAS[base % PALETAS.length];
  const estado = { s: base };

  const pecas = 3 + Math.floor(aleatorio(estado) * 3);
  const formas: React.ReactNode[] = [];

  for (let i = 0; i < pecas; i++) {
    const angulo = (i / pecas) * Math.PI * 2 + aleatorio(estado) * 0.8;
    const raio = 12 + aleatorio(estado) * 14;
    const cx = arred(50 + Math.cos(angulo) * raio);
    const cy = arred(50 + Math.sin(angulo) * raio);
    const tamanho = arred(7 + aleatorio(estado) * 9);
    const cor = i % 3 === 0 ? paleta.verde : paleta.peca;

    formas.push(
      <ellipse
        key={`p${i}`}
        cx={cx}
        cy={cy}
        rx={tamanho}
        ry={arred(tamanho * (0.68 + aleatorio(estado) * 0.3))}
        fill={cor}
        opacity={0.9}
        transform={`rotate(${arred(aleatorio(estado) * 180)} ${cx} ${cy})`}
      />,
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Ilustração de ${nome}`}
      className={cn('h-full w-full', className)}
      style={{ backgroundColor: paleta.fundo }}
    >
      <circle cx="50" cy="50" r="38" fill="#faf8f5" opacity="0.94" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#141414" strokeOpacity="0.06" />
      <circle cx="50" cy="50" r="30" fill={paleta.molho} opacity="0.22" />
      {formas}
      <circle cx="50" cy="50" r="38" fill="none" stroke="#141414" strokeOpacity="0.08" strokeWidth="0.6" />
    </svg>
  );
}

/**
 * Mostra a fotografia do prato quando existe e cai para a ilustracao
 * gerada quando nao existe. `preencher` usa position:absolute para
 * encaixar num contentor com aspect-ratio.
 */
export function FotoPrato({
  nome,
  url,
  className,
  tamanhos = '(max-width: 768px) 30vw, 160px',
  prioridade = false,
}: {
  nome: string;
  url?: string | null;
  className?: string;
  tamanhos?: string;
  prioridade?: boolean;
}) {
  if (!url) {
    return (
      <div className={cn('h-full w-full overflow-hidden', className)}>
        <PratoVisual nome={nome} />
      </div>
    );
  }

  return (
    <Image
      src={url}
      alt={nome}
      fill
      sizes={tamanhos}
      priority={prioridade}
      loading={prioridade ? undefined : 'lazy'}
      className={cn('object-cover', className)}
    />
  );
}
