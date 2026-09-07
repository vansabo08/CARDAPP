'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Marca } from '@/components/marca';
import { Distintivo } from '@/components/ui/distintivo';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { NOME_PLANO, type Plano } from '@/lib/tipos';
import { cn } from '@/lib/utils';

const LIGACOES = [
  { href: '/painel', rotulo: 'Resumo' },
  { href: '/painel/cardapio', rotulo: 'Cardápio' },
  { href: '/painel/mesas', rotulo: 'Mesas' },
  { href: '/painel/definicoes', rotulo: 'Definições' },
];

export function NavegacaoPainel({
  nomeRestaurante,
  slug,
  plano,
  demonstracao,
}: {
  nomeRestaurante: string | null;
  slug: string | null;
  plano: Plano;
  demonstracao: boolean;
}) {
  const caminho = usePathname();
  const router = useRouter();

  async function sair() {
    const supabase = clienteNavegador();
    await supabase?.auth.signOut();
    router.push('/entrar');
    router.refresh();
  }

  return (
    <aside className="border-b border-linha md:sticky md:top-0 md:h-dvh md:w-[248px] md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-5 md:px-6">
          <Marca tamanho="sm" href="/painel" />
          {demonstracao ? <Distintivo tom="ouro">Demonstração</Distintivo> : null}
        </div>

        {nomeRestaurante ? (
          <div className="hidden px-6 pb-6 md:block">
            <p className="truncate font-display text-[19px] text-creme">{nomeRestaurante}</p>
            <p className="mt-1 font-sans text-[12.5px] text-tenue">Plano {NOME_PLANO[plano]}</p>
          </div>
        ) : null}

        <nav className="barra-esconde flex gap-1 overflow-x-auto px-4 pb-3 md:flex-col md:px-3 md:pb-0">
          {LIGACOES.map((ligacao) => {
            const activa =
              ligacao.href === '/painel'
                ? caminho === '/painel'
                : caminho.startsWith(ligacao.href);
            return (
              <Link
                key={ligacao.href}
                href={ligacao.href}
                className={cn(
                  'shrink-0 rounded-[12px] px-3.5 py-2 font-sans text-[14px] font-semibold transition-colors duration-200 md:py-2.5',
                  activa ? 'bg-white/[0.07] text-creme' : 'text-tenue hover:text-creme',
                )}
              >
                {ligacao.rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden flex-col gap-1 border-t border-linha p-3 md:flex">
          {slug ? (
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-[12px] px-3.5 py-2.5 font-sans text-[14px] text-tenue transition-colors duration-200 hover:text-creme"
            >
              Ver o cardápio ↗
            </a>
          ) : null}
          <button
            type="button"
            onClick={sair}
            className="rounded-[12px] px-3.5 py-2.5 text-left font-sans text-[14px] text-tenue transition-colors duration-200 hover:text-creme"
          >
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}

export function CabecalhoPagina({
  titulo,
  descricao,
  accao,
}: {
  titulo: string;
  descricao?: string;
  accao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-linha pb-7">
      <div>
        <h1 className="font-display text-[30px] leading-tight text-creme md:text-[36px]">{titulo}</h1>
        {descricao ? (
          <p className="mt-2 max-w-[52ch] font-sans text-[15px] leading-[1.6] text-tenue">
            {descricao}
          </p>
        ) : null}
      </div>
      {accao}
    </div>
  );
}
