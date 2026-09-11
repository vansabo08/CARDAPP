import * as React from 'react';
import Image from 'next/image';
import { formatarKz } from '@/lib/format';
import {
  ESTADOS,
  EXPLICACAO_CLIENTE,
  ROTULO_CLIENTE,
  ROTULO_CURTO,
  ROTULO_PAINEL,
  progresso,
} from '@/lib/pedidos';
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
              <p className="ouro-display mt-2 font-display text-3xl leading-none tracking-[-0.02em]">
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
                'shrink-0 whitespace-nowrap rounded-full px-4 py-2 font-sans text-xs font-semibold',
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

        <p className="px-5 pt-6 font-sans text-lg font-extrabold tracking-[-0.02em]">
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
                <span className="block truncate font-display text-sm leading-tight text-creme">
                  {prato.nome}
                </span>
                <span className="mt-0.5 block truncate font-sans text-xs text-tenue">
                  {prato.desc}
                </span>
                <span className="mt-2 block font-sans text-base font-extrabold tracking-[-0.02em] text-creme">
                  {formatarKz(prato.preco)}
                </span>
              </span>
            </div>
          ))}
        </div>

        <p className="px-5 pt-7 font-sans text-lg font-extrabold tracking-[-0.02em]">
          Grelhados
        </p>

        <div className="mt-4 px-5">
          {LISTA.map((prato) => (
            <div key={prato.nome} className="flex items-center gap-4 border-b border-linha-escura py-3.5">
              <span className="relative block h-[82px] w-[82px] shrink-0 overflow-hidden rounded-[16px]">
                <Image src={prato.foto} alt="" fill sizes="128px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-base leading-snug">
                  {prato.nome}
                </span>
                <span className="mt-1 block truncate font-sans text-xs text-tenue-escuro">
                  {prato.desc}
                </span>
                <span className="mt-1.5 block font-sans text-sm font-extrabold tracking-[-0.02em]">
                  {formatarKz(prato.preco)}
                </span>
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grafite-carta text-lg leading-none text-creme">
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ouro font-sans text-sm font-bold text-grafite">
              6
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-xs uppercase tracking-[0.14em] text-tenue">
                Ver pedido
              </span>
              <span className="block font-sans text-base font-bold text-creme">
                {formatarKz(16300)}
              </span>
            </span>
          </div>
          <span className="flex h-[54px] shrink-0 items-center rounded-full bg-verde px-8 font-sans text-sm font-semibold text-white">
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
      <p className="mt-3 font-display text-xl leading-none">{nome}</p>
      <div className="my-6 flex justify-center">
        <QrDecorativo tamanho={116} seed={numero} />
      </div>
      <p className="etiqueta text-tenue-escuro">Scaneie para ver o cardápio</p>
      <p className="mt-3 font-display text-3xl leading-none">
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

/* ------------------------------------------------------------------ */
/* O painel da casa — os pedidos a chegar dentro do app                 */
/* ------------------------------------------------------------------ */

/**
 * O painel de pedidos, como a cozinha o vê.
 *
 * Os rótulos, os tons e o texto do botão vêm do mesmo sítio que o painel
 * a sério usa. Uma página de vendas que mostra um estado que o produto
 * não tem é uma promessa que se parte no primeiro dia de uso.
 */
const PEDIDOS_DO_PAINEL: {
  mesa: number;
  minutos: number;
  estado: 'novo' | 'preparar' | 'pronto';
  total: number;
  itens: { qtd: number; nome: string; obs?: string }[];
  nota?: string;
}[] = [
  {
    mesa: 7,
    minutos: 1,
    estado: 'novo',
    total: 16300,
    itens: [
      { qtd: 2, nome: 'Muamba de Galinha' },
      { qtd: 1, nome: 'Calulu de Peixe', obs: 'sem piripiri' },
      { qtd: 3, nome: 'Cuca 33cl' },
    ],
    nota: 'Uma das muambas sem quiabo, por favor.',
  },
  {
    mesa: 3,
    minutos: 6,
    estado: 'preparar',
    total: 11100,
    itens: [
      { qtd: 1, nome: 'Mufete' },
      { qtd: 2, nome: 'Kitaba' },
    ],
  },
  {
    mesa: 12,
    minutos: 11,
    estado: 'pronto',
    total: 6800,
    itens: [{ qtd: 1, nome: 'Espetada de Vaca' }],
  },
];

const TOM_DO_PAINEL = {
  novo: 'border-ouro/45 bg-ouro/[0.07]',
  preparar: 'border-linha bg-white/[0.03]',
  pronto: 'border-verde/40 bg-verde/[0.06]',
} as const;

export function EcraPainel() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-grafite px-4 pt-14">
      <div className="flex items-center justify-between">
        <p className="font-display text-3xl leading-none text-creme">Pedidos</p>
        <span className="flex items-center gap-2 font-sans text-xs text-tenue">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verde opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-verde" />
          </span>
          ao vivo
        </span>
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {PEDIDOS_DO_PAINEL.map((p) => (
          <li key={p.mesa} className={cn('rounded-cartao border p-4', TOM_DO_PAINEL[p.estado])}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl leading-tight text-creme">Mesa {p.mesa}</p>
                <p className="mt-1 font-sans text-xs text-tenue">
                  há {p.minutos} min · {ROTULO_PAINEL[p.estado]}
                </p>
              </div>
              <p className="font-display text-xl text-ouro">{formatarKz(p.total)}</p>
            </div>

            <ul className="mt-3 flex flex-col gap-1 border-t border-linha pt-3">
              {p.itens.map((item) => (
                <li key={item.nome} className="font-sans text-sm leading-snug text-creme/90">
                  {item.qtd}x {item.nome}
                  {item.obs ? <span className="text-tenue"> — {item.obs}</span> : null}
                </li>
              ))}
            </ul>

            {p.nota ? (
              <p className="mt-3 rounded-campo border border-ouro/40 bg-ouro/[0.06] px-3 py-2 font-sans text-sm leading-snug text-creme">
                <span className="etiqueta mr-2 text-ouro">Nota</span>
                {p.nota}
              </p>
            ) : null}

            {p.estado === 'novo' ? (
              <div className="mt-4">
                {/*
                  O som não se desenha. Esta linha diz o que se estaria a
                  ouvir, para quem olha para um ecrã mudo numa página.
                */}
                <p className="mb-2 flex items-center gap-2 font-sans text-xs text-ouro">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ouro opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-ouro" />
                  </span>
                  O alarme volta a tocar até alguém carregar
                </p>
                <span className="flex h-12 w-full items-center justify-center rounded-full bg-ouro font-sans text-base font-semibold text-grafite">
                  Recebido — calar o alarme
                </span>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* O cliente a acompanhar o pedido                                     */
/* ------------------------------------------------------------------ */

/**
 * O ecrã que o cliente vê depois de pedir.
 *
 * Mesmos rótulos, mesma barra e mesma frase do ecrã a sério. O estado
 * escolhido é o do meio — "a preparar" —, que é o que responde à pergunta
 * que faz o cliente levantar a mão: "o meu prato já está a ser feito?"
 */
export function EcraAcompanhar() {
  const estado = 'preparar' as const;
  const avanco = progresso(estado);

  return (
    <div className="relative h-full w-full bg-grafite px-6 pt-20">
      <header className="text-center">
        <span className="etiqueta text-ouro-fundo">Tia Bela</span>
        <p className="mt-4 text-balance font-display text-3xl leading-none text-creme">
          {ROTULO_CLIENTE[estado]}
        </p>
        <p className="mt-3 font-sans text-sm text-tenue">{EXPLICACAO_CLIENTE[estado]}</p>
        <p className="mt-2 font-sans text-sm text-tenue">Mesa 07</p>
      </header>

      <div className="mt-10">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full rounded-full bg-ouro" style={{ width: `${Math.round(avanco * 100)}%` }} />
        </div>
        <ol className="mt-3 flex justify-between">
          {ESTADOS.map((e) => (
            <li
              key={e}
              className={cn(
                'font-sans text-xs',
                progresso(e) <= avanco ? 'text-creme' : 'text-creme/30',
              )}
            >
              {ROTULO_CURTO[e]}
            </li>
          ))}
        </ol>
      </div>

      <div className="vidro mt-10 rounded-cartao p-5">
        <p className="etiqueta text-tenue">O seu pedido</p>
        <ul className="mt-4 flex flex-col gap-3">
          {[
            { qtd: 2, nome: 'Muamba de Galinha', preco: 9000 },
            { qtd: 1, nome: 'Calulu de Peixe', preco: 5500, obs: 'sem piripiri' },
            { qtd: 3, nome: 'Cuca 33cl', preco: 1800 },
          ].map((item) => (
            <li key={item.nome} className="flex items-start justify-between gap-4">
              <span className="min-w-0">
                <span className="block font-display text-base leading-snug text-creme">
                  {item.qtd}x {item.nome}
                </span>
                {item.obs ? (
                  <span className="mt-0.5 block font-sans text-xs text-tenue">{item.obs}</span>
                ) : null}
              </span>
              <span className="shrink-0 font-sans text-sm text-tenue">{formatarKz(item.preco)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center justify-between border-t border-linha pt-4">
          <span className="font-sans text-sm text-tenue">Total</span>
          <span className="font-display text-xl text-ouro">{formatarKz(16300)}</span>
        </div>
      </div>
    </div>
  );
}

export function EcraWhatsApp() {
  return (
    <div className="relative h-full w-full bg-[#0b141a]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#111b21] px-4 pb-3 pt-14">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-verde/20 font-display text-sm text-verde">
          TB
        </span>
        <div className="min-w-0">
          <p className="truncate font-sans text-sm font-semibold text-[#e9edef]">Tia Bela</p>
          <p className="font-sans text-xs text-[#8696a0]">online</p>
        </div>
      </div>

      <div className="flex justify-end p-3.5">
        <div className="max-w-[92%] rounded-[14px] rounded-tr-[5px] bg-[#005c4b] px-3 py-2.5">
          <pre className="whitespace-pre font-mono text-xs leading-normal text-[#e9edef]">
            {MENSAGEM_EXEMPLO}
          </pre>
          <p className="mt-1.5 text-right font-sans text-xs text-white/50">19:42 ✓✓</p>
        </div>
      </div>
    </div>
  );
}
