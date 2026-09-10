'use client';

import * as React from 'react';
import Link from 'next/link';
import { Revelar } from '@/components/ui/revelar';
import { formatarKz } from '@/lib/format';
import { DIAS_DE_TESTE, INCLUI, PRECO_PLANO } from '@/lib/planos';
import { cn } from '@/lib/utils';

/**
 * Tabela de preços.
 *
 * O selector Mensal/Anual está no desenho mas o preço anual não existe:
 * inventar um desconto é inventar um compromisso comercial. Fica visível
 * e desligado, à espera do número real.
 */

type Plano = {
  nome: string;
  preco: string;
  periodo: string;
  descricao: string;
  inclui: string[];
  destaque: boolean;
  cta: string;
};

/**
 * Dois planos, ambos pagos, ambos com sete dias livres.
 *
 * O Balcão — gratuito para sempre, uma mesa, quinze pratos — saiu. Uma
 * casa que cabia nele nunca chegava a precisar de pagar, e uma que não
 * cabia via o produto pela versão mais pequena que ele tem. Sete dias
 * com tudo aberto mostram melhor o que isto faz.
 */
const PLANOS: Plano[] = [
  {
    nome: 'Mesa',
    preco: formatarKz(PRECO_PLANO.mesa),
    periodo: 'por mês, depois dos 7 dias',
    descricao: 'Tudo o que uma casa precisa para pôr as mesas a pedir.',
    inclui: INCLUI.mesa,
    destaque: true,
    cta: 'Experimentar 7 dias',
  },
  {
    nome: 'Sala',
    preco: formatarKz(PRECO_PLANO.sala),
    periodo: 'por mês, depois dos 7 dias',
    descricao: 'Para quem quer o cardápio só com a cara da casa.',
    inclui: INCLUI.sala,
    destaque: false,
    cta: 'Experimentar 7 dias',
  },
];

function Visto() {
  return (
    <span
      aria-hidden
      className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border border-linha"
    >
      <svg viewBox="0 0 12 12" className="h-[9px] w-[9px]" fill="none">
        <path
          d="M2 6.2 4.6 8.8 10 3.4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Precos() {
  const [periodo, setPeriodo] = React.useState<'mensal' | 'anual'>('mensal');

  return (
    <section id="precos" className="mx-auto max-w-conteudo px-5 py-24 md:px-8 md:py-32">
      <Revelar>
        <div className="flex flex-col items-center text-center">
          <span className="etiqueta rounded-full border border-linha px-4 py-1.5 text-tenue">
            Preços
          </span>

          <h2 className="mt-7 font-sans text-4xl font-extrabold leading-none tracking-[-0.035em] text-creme md:text-5xl">
            Escolha o seu plano
          </h2>

          {/* selector de período */}
          <div className="mt-9 inline-flex vidro-leve rounded-full p-1">
            <button
              type="button"
              onClick={() => setPeriodo('mensal')}
              className={cn(
                'rounded-full px-6 py-2.5 font-sans text-sm font-semibold transition-colors duration-200',
                periodo === 'mensal' ? 'bg-creme text-grafite' : 'text-tenue hover:text-creme',
              )}
            >
              Mensal
            </button>
            <button
              type="button"
              disabled
              title="Preço anual por definir"
              className="cursor-not-allowed rounded-full px-6 py-2.5 font-sans text-sm font-semibold text-creme/30"
            >
              Anual
              <span className="ml-2 font-sans text-xs font-medium">em breve</span>
            </button>
          </div>
        </div>
      </Revelar>

      <div className="mt-14 grid items-stretch gap-5 md:grid-cols-2 md:gap-5">
        {PLANOS.map((plano, i) => (
          <Revelar key={plano.nome} atraso={i * 70} className="flex">
            <article
              className={cn(
                'flex w-full flex-col rounded-[28px] p-7 transition-[transform,border-color] duration-300 ease-calmo md:p-8',
                'vidro',
                plano.destaque
                  ? 'border-creme/25 shadow-[0_34px_80px_-40px_rgba(0,0,0,0.95)] md:-my-3 md:py-11'
                  : 'hover:border-creme/18',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'block h-[7px] w-[7px] rounded-full',
                    plano.destaque ? 'bg-ouro' : 'bg-creme/60',
                  )}
                />
                <h3 className="font-sans text-xl font-bold tracking-[-0.02em] text-creme">
                  {plano.nome}
                </h3>
              </div>

              <p className="mt-2 font-sans text-sm text-tenue">{plano.descricao}</p>

              <hr className="mt-5 border-linha" />

              <p className="mt-6 font-sans text-4xl font-extrabold leading-none tracking-[-0.04em] text-creme">
                {plano.preco}
              </p>
              <p className="mt-2.5 font-sans text-xs text-tenue">{plano.periodo}</p>

              <ul className="mt-7 flex flex-col gap-3.5">
                {plano.inclui.map((linha) => (
                  <li
                    key={linha}
                    className={cn(
                      'flex items-start gap-3 font-sans text-sm',
                      plano.destaque ? 'text-creme/90' : 'text-creme/75',
                    )}
                  >
                    <span className={plano.destaque ? 'text-ouro' : 'text-tenue'}>
                      <Visto />
                    </span>
                    {linha}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-10">
                <Link
                  href="/criar-conta"
                  className={cn(
                    'flex h-[54px] w-full items-center justify-center rounded-full font-sans text-sm font-semibold',
                    'transition-[background-color,transform] duration-200 ease-calmo active:scale-[0.985]',
                    plano.destaque
                      ? 'bg-ouro text-grafite hover:bg-ouro-claro'
                      : 'bg-creme/85 text-grafite hover:bg-creme',
                  )}
                >
                  {plano.cta}
                </Link>
              </div>
            </article>
          </Revelar>
        ))}
      </div>

      <Revelar atraso={220}>
        <p className="mt-10 text-center font-sans text-xs text-tenue">
          Activação assistida por um consultor Cardapp — Multicaixa Express em breve.
        </p>
      </Revelar>
    </section>
  );
}
