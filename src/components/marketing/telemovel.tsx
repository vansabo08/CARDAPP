import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Aparelho desenhado com as proporções a sério de um telemóvel moderno:
 * ecrã 393×852, raio do ecrã a 14% da largura, ilha dinâmica de 125×36 e
 * banda lateral em titânio com os botões nos sítios certos.
 *
 * Tudo escala a partir de uma única medida — `largura` é a largura do
 * aparelho, não a do ecrã.
 */

const RACIO_ECRA = 393 / 852;

const TITANIO =
  'linear-gradient(146deg,#5d5a55 0%,#b8b2a8 6%,#6e6a64 14%,#413e3a 26%,#8b867e 42%,#4c4945 58%,#9a948b 72%,#3f3d39 84%,#7d7871 94%,#4a4743 100%)';

const TITANIO_BOTAO =
  'linear-gradient(180deg,#8a857d 0%,#5b5853 30%,#403d3a 70%,#726d66 100%)';

export function Telemovel({
  children,
  largura = 268,
  className,
  hora = '19:42',
  sombra = true,
}: {
  children: React.ReactNode;
  largura?: number;
  className?: string;
  hora?: string;
  sombra?: boolean;
}) {
  const banda = Math.round(largura * 0.026 * 10) / 10;
  const larguraEcra = largura - banda * 2;
  const raioEcra = larguraEcra * 0.142;
  const raioAparelho = raioEcra + banda;
  const escala = larguraEcra / 393;

  return (
    <div className={cn('relative', className)} style={{ width: largura }}>
      {/* botões laterais, por baixo da moldura */}
      <BotaoLateral lado="esquerda" topo={0.176} altura={0.037} escala={largura} />
      <BotaoLateral lado="esquerda" topo={0.248} altura={0.072} escala={largura} />
      <BotaoLateral lado="esquerda" topo={0.338} altura={0.072} escala={largura} />
      <BotaoLateral lado="direita" topo={0.268} altura={0.115} escala={largura} />

      <div
        className="relative"
        style={{
          padding: banda,
          borderRadius: raioAparelho,
          background: TITANIO,
          boxShadow: sombra
            ? '0 50px 90px -40px rgba(0,0,0,.95), 0 18px 40px -22px rgba(0,0,0,.8)'
            : undefined,
        }}
      >
        {/* fresta preta entre a banda e o vidro */}
        <div
          className="relative overflow-hidden bg-black"
          style={{
            borderRadius: raioEcra,
            aspectRatio: String(RACIO_ECRA),
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.9)',
          }}
        >
          {/* O conteúdo é escrito à resolução real do aparelho (393×852)
              e só depois encolhido. É o que faz o mockup ser o ecrã a
              sério e não uma miniatura aproximada. */}
          <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: raioEcra }}>
            <div
              style={{
                width: 393,
                height: 852,
                transform: `scale(${escala})`,
                transformOrigin: 'top left',
              }}
            >
              {children}
            </div>
          </div>

          <BarraDeEstado hora={hora} escala={escala} />
          <IlhaDinamica escala={escala} />

          {/* barra de gestos */}
          <div
            className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/85"
            style={{
              bottom: 8 * escala,
              width: 134 * escala,
              height: Math.max(3, 5 * escala),
            }}
          />

          {/* reflexo do vidro */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-40"
            style={{
              borderRadius: raioEcra,
              background:
                'linear-gradient(118deg,rgba(255,255,255,.11) 0%,rgba(255,255,255,.035) 15%,rgba(255,255,255,0) 34%,rgba(255,255,255,0) 64%,rgba(255,255,255,.04) 87%,rgba(255,255,255,.1) 100%)',
            }}
          />
          {/* bisel interior */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-40"
            style={{
              borderRadius: raioEcra,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function BotaoLateral({
  lado,
  topo,
  altura,
  escala,
}: {
  lado: 'esquerda' | 'direita';
  topo: number;
  altura: number;
  escala: number;
}) {
  const espessura = Math.max(2, escala * 0.011);
  return (
    <span
      aria-hidden
      className="absolute"
      style={{
        [lado === 'esquerda' ? 'left' : 'right']: -espessura + 1,
        top: `${topo * 100}%`,
        width: espessura,
        height: `${altura * 100}%`,
        background: TITANIO_BOTAO,
        borderRadius: espessura,
      }}
    />
  );
}

function IlhaDinamica({ escala }: { escala: number }) {
  const largura = 125 * escala;
  const altura = 36 * escala;
  return (
    <div
      aria-hidden
      className="absolute left-1/2 z-30 -translate-x-1/2"
      style={{ top: 11 * escala, width: largura, height: altura }}
    >
      <div className="relative h-full w-full rounded-full bg-black">
        {/* lente da câmara, com o brilho azulado do vidro */}
        <span
          className="absolute rounded-full"
          style={{
            right: altura * 0.24,
            top: '50%',
            transform: 'translateY(-50%)',
            width: altura * 0.42,
            height: altura * 0.42,
            background:
              'radial-gradient(circle at 34% 30%, #2b3a55 0%, #111820 55%, #05070a 100%)',
            boxShadow: 'inset 0 0 0 .5px rgba(120,150,200,.28)',
          }}
        />
      </div>
    </div>
  );
}

function BarraDeEstado({ hora, escala }: { hora: string; escala: number }) {
  const alturaTexto = Math.max(9, 15 * escala);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-30 flex items-center justify-between text-white"
      style={{
        top: 15 * escala,
        height: 24 * escala,
        paddingLeft: 28 * escala,
        paddingRight: 26 * escala,
      }}
    >
      <span
        className="font-sans font-semibold tabular-nums"
        style={{ fontSize: alturaTexto, letterSpacing: '-0.02em' }}
      >
        {hora}
      </span>

      <span className="flex items-center" style={{ gap: 5 * escala }}>
        {/* rede */}
        <svg width={17 * escala} height={11 * escala} viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="7.5" width="3" height="3.5" rx="1" />
          <rect x="4.6" y="5" width="3" height="6" rx="1" />
          <rect x="9.2" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="13.8" y="0" width="3" height="11" rx="1" />
        </svg>
        {/* wi-fi */}
        <svg width={15 * escala} height={11 * escala} viewBox="0 0 15 11" fill="currentColor">
          <path d="M7.5 10.6 5.6 8.4a2.9 2.9 0 0 1 3.8 0z" />
          <path
            d="M2.9 5.3a6.9 6.9 0 0 1 9.2 0"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M4.9 7.6a4.1 4.1 0 0 1 5.2 0"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        {/* bateria */}
        <svg width={25 * escala} height={12 * escala} viewBox="0 0 25 12" fill="none">
          <rect
            x="0.6"
            y="0.6"
            width="21"
            height="10.8"
            rx="3.2"
            stroke="currentColor"
            strokeOpacity="0.4"
            strokeWidth="1"
          />
          <rect x="2.2" y="2.2" width="15" height="7.6" rx="2" fill="currentColor" />
          <path
            d="M23 4.2c1 .5 1 2.6 0 3.1z"
            fill="currentColor"
            fillOpacity="0.4"
          />
        </svg>
      </span>
    </div>
  );
}
