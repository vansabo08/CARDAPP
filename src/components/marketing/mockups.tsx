import * as React from 'react';
import { PratoVisual } from '@/components/prato-visual';
import { formatarKz } from '@/lib/format';
import { buildWhatsAppMessage } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

/**
 * Mockups dos ecras reais usados na pagina inicial.
 * Sao os componentes verdadeiros em ponto pequeno, nao icones genericos:
 * o que se ve aqui e o que o cliente ve no telemovel.
 */

export function MolduraTelemovel({
  children,
  className,
  legenda,
}: {
  children: React.ReactNode;
  className?: string;
  legenda?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      <div className="relative mx-auto w-full max-w-[268px]">
        <div className="rounded-[34px] border border-linha bg-grafite-alto p-[7px] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
          <div className="relative aspect-[9/18.5] overflow-hidden rounded-[28px] bg-grafite">
            {/* barra de estado */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-3">
              <span className="font-sans text-[10px] font-semibold text-creme/80">19:42</span>
              <div className="flex items-center gap-[3px]">
                <span className="block h-[7px] w-[3px] rounded-sm bg-creme/45" />
                <span className="block h-[9px] w-[3px] rounded-sm bg-creme/55" />
                <span className="block h-[11px] w-[3px] rounded-sm bg-creme/70" />
                <span className="ml-1 block h-[7px] w-[13px] rounded-[2px] border border-creme/50" />
              </div>
            </div>
            <div className="absolute left-1/2 top-2 z-20 h-[18px] w-[74px] -translate-x-1/2 rounded-full bg-grafite-alto" />
            {children}
          </div>
        </div>
      </div>
      {legenda ? (
        <p className="mt-5 text-center font-sans text-[13px] text-tenue">{legenda}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Passo 1 — o cartao de mesa com o QR                                  */
/* ------------------------------------------------------------------ */

export function QrDecorativo({ tamanho = 84, seed = 7 }: { tamanho?: number; seed?: number }) {
  // Padrao estavel que evoca um QR sem fingir ser um codigo legivel.
  const modulos = 21;
  const celulas: React.ReactNode[] = [];
  let s = seed * 2654435761;
  const proximo = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  const cantos = (x: number, y: number) =>
    (x < 7 && y < 7) || (x > modulos - 8 && y < 7) || (x < 7 && y > modulos - 8);

  for (let y = 0; y < modulos; y++) {
    for (let x = 0; x < modulos; x++) {
      if (cantos(x, y)) continue;
      if (proximo() > 0.52) {
        celulas.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />);
      }
    }
  }

  const olho = (dx: number, dy: number) => (
    <g key={`olho-${dx}-${dy}`} transform={`translate(${dx} ${dy})`}>
      <rect width="7" height="7" fill="currentColor" />
      <rect x="1" y="1" width="5" height="5" fill="var(--creme)" />
      <rect x="2" y="2" width="3" height="3" fill="currentColor" />
    </g>
  );

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox={`0 0 ${modulos} ${modulos}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
      className="text-grafite"
    >
      {celulas}
      {olho(0, 0)}
      {olho(modulos - 7, 0)}
      {olho(0, modulos - 7)}
    </svg>
  );
}

export function CartaoMesa({ numero = 7, nome = 'Tia Bela' }: { numero?: number; nome?: string }) {
  return (
    <div className="flex w-full max-w-[230px] flex-col items-center rounded-[12px] bg-creme px-6 py-7 text-grafite shadow-[0_20px_50px_-28px_rgba(0,0,0,0.8)]">
      <span className="font-display text-[19px]">{nome}</span>
      <div className="my-5">
        <QrDecorativo tamanho={104} seed={numero} />
      </div>
      <span className="etiqueta text-tenue-escuro">Scaneie para ver o cardápio</span>
      <span className="mt-3 font-display text-[26px] leading-none">
        Mesa {String(numero).padStart(2, '0')}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Passo 2 — o cardapio publico                                         */
/* ------------------------------------------------------------------ */

const PRATOS_MOCKUP = [
  { nome: 'Muamba de Galinha', desc: 'Óleo de palma, quiabo e funge', preco: 4500 },
  { nome: 'Calulu de Peixe', desc: 'Folhas de batata-doce', preco: 5500 },
  { nome: 'Mufete', desc: 'Carapau grelhado, banana pão', preco: 7500 },
];

export function MockupCardapio() {
  return (
    <div className="absolute inset-0 flex flex-col bg-grafite">
      {/* cabecalho escuro */}
      <div className="shrink-0 px-5 pb-7 pt-11">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-linha font-display text-[12px] text-ouro">
            TB
          </span>
          <span className="font-display text-[15px] text-creme">Tia Bela</span>
          <span className="etiqueta ml-auto rounded-full bg-ouro px-2 py-[3px] text-[9px] text-grafite">
            Mesa 07
          </span>
        </div>
        <p className="mt-4 font-display text-[27px] leading-[1.08] text-creme">
          Cozinha de
          <br />
          <span className="text-ouro">Luanda</span>
        </p>
      </div>

      {/* folha creme */}
      <div className="flex min-h-0 flex-1 flex-col rounded-t-[22px] bg-creme text-grafite">
        <div className="flex gap-1.5 overflow-hidden px-4 pb-3 pt-4">
          {['Entradas', 'Principais', 'Grelhados', 'Bebidas'].map((c, i) => (
            <span
              key={c}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 font-sans text-[9px] font-semibold',
                i === 1 ? 'bg-grafite text-creme' : 'border border-linha-escura text-tenue-escuro',
              )}
            >
              {c}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3 px-4">
          {PRATOS_MOCKUP.map((p) => (
            <div key={p.nome} className="flex items-center gap-3">
              <div className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded-[10px]">
                <PratoVisual nome={p.nome} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[12.5px] leading-tight">{p.nome}</p>
                <p className="truncate font-sans text-[9.5px] text-tenue-escuro">{p.desc}</p>
                <p className="mt-0.5 font-sans text-[11px] font-bold">{formatarKz(p.preco)}</p>
              </div>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grafite font-sans text-[13px] leading-none text-creme">
                +
              </span>
            </div>
          ))}
        </div>

        {/* carrinho flutuante */}
        <div className="mt-auto p-3.5">
          <div className="flex items-center justify-between rounded-[12px] bg-verde px-3.5 py-2.5 text-white">
            <span className="font-sans text-[10px] font-semibold opacity-90">3 itens</span>
            <span className="font-sans text-[12px] font-bold">{formatarKz(16300)}</span>
            <span className="font-sans text-[10px] font-bold">Enviar pedido</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Passo 3 — a mensagem no WhatsApp                                     */
/* ------------------------------------------------------------------ */

export const MENSAGEM_EXEMPLO = buildWhatsAppMessage({
  restaurante: 'Tia Bela',
  mesa: 7,
  data: new Date('2026-09-07T18:42:00Z'),
  itens: [
    { nome: 'Muamba de Galinha', qtd: 2, preco: 4500 },
    { nome: 'Calulu de Peixe', qtd: 1, preco: 5500, obs: 'sem piripiri' },
    { nome: 'Cuca 33cl', qtd: 3, preco: 600 },
  ],
});

export function MockupWhatsApp() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#0b141a]">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-4 pb-3 pt-11">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-verde/20 font-display text-[11px] text-verde">
          TB
        </span>
        <div className="min-w-0">
          <p className="truncate font-sans text-[12px] font-semibold text-creme">Tia Bela</p>
          <p className="font-sans text-[9px] text-tenue">online</p>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-end p-3">
        <div className="max-w-full rounded-[12px] rounded-tr-[4px] bg-[#005c4b] px-2.5 py-2">
          <pre className="whitespace-pre font-mono text-[6.4px] leading-[1.5] text-[#e9edef]">
            {MENSAGEM_EXEMPLO}
          </pre>
          <p className="mt-1 text-right font-sans text-[7px] text-white/50">19:42</p>
        </div>
      </div>
    </div>
  );
}
