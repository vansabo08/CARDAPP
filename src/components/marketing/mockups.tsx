import * as React from 'react';
import Image from 'next/image';
import { formatarKz } from '@/lib/format';
import { buildWhatsAppMessage } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { MarcaSimbolo } from '@/components/marca-simbolo';

/**
 * Os ecrãs que vão dentro dos telemóveis da página inicial.
 * São escritos à resolução real (393×852) — o componente Telemovel
 * trata de os encolher — por isso os tamanhos aqui são os mesmos que
 * o cliente vê no cardápio a sério.
 */

const DESTAQUES = [
  { nome: 'Muamba de Galinha', desc: 'Óleo de palma e quiabo', preco: 4500, foto: '/pratos/muamba-galinha.webp' },
  { nome: 'Calulu de Peixe', desc: 'Folhas de batata-doce', preco: 5500, foto: '/pratos/calulu.webp' },
  { nome: 'Mufete', desc: 'Carapau grelhado', preco: 7500, foto: '/pratos/mufete.webp' },
];

const LISTA = [
  { nome: 'Espetada de Vaca', desc: 'Lombo marinado, cebola e pimento', preco: 6800, foto: '/pratos/espetada.webp' },
  { nome: 'Garoupa Grelhada', desc: 'Peixe do dia com batata-doce', preco: 9500, foto: '/pratos/garoupa.webp' },
];

/* ------------------------------------------------------------------ */
/* Passo 2 — o cardápio público                                        */
/* ------------------------------------------------------------------ */

export function EcraCardapio() {
  return (
    <div className="relative h-full w-full bg-grafite">
      {/* herói */}
      <div className="relative h-[260px] w-full overflow-hidden">
        <Image
          src="/pratos/kitaba.webp"
          alt=""
          fill
          sizes="400px"
          className="object-cover"
          aria-hidden
        />
        <div className="veu-foto absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-8">
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <p className="etiqueta text-ouro">Cardápio</p>
              <p className="ouro-display mt-2 font-display text-[34px] leading-[1.04] tracking-[-0.02em]">
                Tia Bela
              </p>
            </div>
            <span className="etiqueta shrink-0 rounded-full bg-ouro px-3.5 py-2 text-grafite">
              Mesa 07
            </span>
          </div>
        </div>
      </div>

      {/* folha */}
      <div className="relative z-10 -mt-5 rounded-t-folha bg-creme-folha pb-6 text-grafite">
        <div className="flex justify-center pt-3">
          <span className="block h-[4px] w-[38px] rounded-full bg-grafite/10" />
        </div>

        <div className="flex gap-2 overflow-hidden px-5 py-3">
          {['Entradas', 'Pratos Principais', 'Grelhados'].map((c, i) => (
            <span
              key={c}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full px-4 py-2 font-sans text-[13px] font-semibold',
                i === 1
                  ? 'bg-grafite-carta text-creme'
                  : 'border border-linha-escura text-tenue-escuro',
              )}
            >
              {c}
            </span>
          ))}
        </div>
        <div className="h-px bg-linha-escura" />

        <p className="px-5 pt-6 font-sans text-[19px] font-extrabold tracking-[-0.02em]">
          Mais pedidos
        </p>

        <div className="mt-4 flex gap-3 overflow-hidden px-5">
          {DESTAQUES.map((prato) => (
            <div
              key={prato.nome}
              className="w-[168px] shrink-0 overflow-hidden rounded-cartao bg-grafite-carta"
            >
              <span className="relative block aspect-[4/3] w-full">
                <Image src={prato.foto} alt="" fill sizes="256px" className="object-cover" />
              </span>
              <span className="block px-3.5 pb-3.5 pt-3">
                <span className="block truncate font-display text-[15px] leading-tight text-creme">
                  {prato.nome}
                </span>
                <span className="mt-0.5 block truncate font-sans text-[11.5px] text-tenue">
                  {prato.desc}
                </span>
                <span className="mt-2 block font-sans text-[16px] font-extrabold tracking-[-0.02em] text-creme">
                  {formatarKz(prato.preco)}
                </span>
              </span>
            </div>
          ))}
        </div>

        <p className="px-5 pt-7 font-sans text-[19px] font-extrabold tracking-[-0.02em]">
          Grelhados
        </p>

        <div className="mt-4 px-5">
          {LISTA.map((prato) => (
            <div key={prato.nome} className="flex items-center gap-4 border-b border-linha-escura py-3.5">
              <span className="relative block h-[82px] w-[82px] shrink-0 overflow-hidden rounded-[16px]">
                <Image src={prato.foto} alt="" fill sizes="128px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[17px] leading-snug">
                  {prato.nome}
                </span>
                <span className="mt-1 block truncate font-sans text-[13px] text-tenue-escuro">
                  {prato.desc}
                </span>
                <span className="mt-1.5 block font-sans text-[15.5px] font-extrabold tracking-[-0.02em]">
                  {formatarKz(prato.preco)}
                </span>
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grafite-carta text-[19px] leading-none text-creme">
                +
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* carrinho */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-grafite via-grafite/92 to-transparent px-4 pb-6 pt-8">
        <div className="flex items-center gap-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-linha bg-grafite-alto py-2.5 pl-2.5 pr-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ouro font-sans text-[14px] font-bold text-grafite">
              6
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-[10.5px] uppercase tracking-[0.14em] text-tenue">
                Ver pedido
              </span>
              <span className="block font-sans text-[16px] font-bold text-creme">
                {formatarKz(16300)}
              </span>
            </span>
          </div>
          <span className="flex h-[54px] shrink-0 items-center rounded-full bg-verde px-8 font-sans text-[15px] font-semibold text-white">
            Enviar pedido
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Passo 1 — o cartão de mesa                                          */
/* ------------------------------------------------------------------ */

export function QrDecorativo({ tamanho = 84, seed = 7 }: { tamanho?: number; seed?: number }) {
  // Padrão estável que evoca um QR sem fingir ser um código legível.
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
      <rect x="1" y="1" width="5" height="5" fill="#fdfcfa" />
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
    <div className="relative w-full max-w-[248px] overflow-hidden rounded-cartao bg-creme-folha px-7 py-8 text-center text-grafite shadow-cartao">
      <MarcaSimbolo className="mx-auto h-5 w-5 text-grafite/70" />
      <p className="mt-3 font-display text-[21px] leading-none">{nome}</p>
      <div className="my-6 flex justify-center">
        <QrDecorativo tamanho={116} seed={numero} />
      </div>
      <p className="etiqueta text-tenue-escuro">Scaneie para ver o cardápio</p>
      <p className="mt-3 font-display text-[30px] leading-none">
        Mesa {String(numero).padStart(2, '0')}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Passo 3 — a mensagem no WhatsApp                                    */
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

export function EcraWhatsApp() {
  return (
    <div className="relative h-full w-full bg-[#0b141a]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#111b21] px-4 pb-3 pt-14">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-verde/20 font-display text-[15px] text-verde">
          TB
        </span>
        <div className="min-w-0">
          <p className="truncate font-sans text-[15px] font-semibold text-[#e9edef]">Tia Bela</p>
          <p className="font-sans text-[12px] text-[#8696a0]">online</p>
        </div>
      </div>

      <div className="flex justify-end p-3.5">
        <div className="max-w-[92%] rounded-[14px] rounded-tr-[5px] bg-[#005c4b] px-3 py-2.5">
          <pre className="whitespace-pre font-mono text-[9.5px] leading-[1.55] text-[#e9edef]">
            {MENSAGEM_EXEMPLO}
          </pre>
          <p className="mt-1.5 text-right font-sans text-[10px] text-white/50">19:42 ✓✓</p>
        </div>
      </div>
    </div>
  );
}
