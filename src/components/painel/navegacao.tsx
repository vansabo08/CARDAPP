'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Marca } from '@/components/marca';
import { Distintivo } from '@/components/ui/distintivo';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { NOME_PLANO, type Plano } from '@/lib/tipos';
import { cn } from '@/lib/utils';
import { Doca, type ItemDoca } from '@/components/ui/doca';
import { BookOpen, LayoutGrid, QrCode, SlidersHorizontal } from 'lucide-react';

const LIGACOES = [
  { href: '/painel', rotulo: 'Resumo', icone: LayoutGrid },
  { href: '/painel/cardapio', rotulo: 'Cardápio', icone: BookOpen },
  { href: '/painel/mesas', rotulo: 'Mesas', icone: QrCode },
  { href: '/painel/definicoes', rotulo: 'Definições', icone: SlidersHorizontal },
];

function estaActiva(href: string, caminho: string) {
  return href === '/painel' ? caminho === '/painel' : caminho.startsWith(href);
}

export function NavegacaoPainel({
  nomeRestaurante,
  slug,
  plano,
  demonstracao,
  administrador = false,
}: {
  nomeRestaurante: string | null;
  slug: string | null;
  plano: Plano;
  demonstracao: boolean;
  administrador?: boolean;
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
    <aside className="vidro rounded-none border-x-0 border-t-0 shadow-[inset_0_1px_0_0_rgba(250,247,242,0.11)] md:sticky md:top-0 md:h-dvh md:w-[248px] md:shrink-0 md:border-b-0 md:border-r">
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

        <nav className="barra-esconde hidden gap-1 overflow-x-auto px-4 pb-3 md:flex md:flex-col md:px-3 md:pb-0">
          {LIGACOES.map((ligacao) => {
            const activa = estaActiva(ligacao.href, caminho);
            return (
              <Link
                key={ligacao.href}
                href={ligacao.href}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-2 font-sans text-[14px] font-semibold transition-colors duration-200 md:py-2.5',
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
              className="rounded-full px-3.5 py-2.5 font-sans text-[14px] text-tenue transition-colors duration-200 hover:text-creme"
            >
              Ver o cardápio ↗
            </a>
          ) : null}
          {administrador ? (
            <Link
              href="/admin"
              className="rounded-full px-3.5 py-2.5 font-sans text-[14px] text-ouro transition-colors duration-200 hover:text-ouro-claro"
            >
              Administração
            </Link>
          ) : null}
          <button
            type="button"
            onClick={sair}
            className="rounded-full px-3.5 py-2.5 text-left font-sans text-[14px] text-tenue transition-colors duration-200 hover:text-creme"
          >
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * No telemóvel a navegação do painel era uma tira de texto apertada com
 * scroll horizontal. Passa a doca, fixa no fundo, onde o polegar chega.
 * No computador continua a barra lateral, que carrega o contexto todo
 * (nome da casa, plano, sair).
 */
export function DocaPainel() {
  const caminho = usePathname();

  const itens: ItemDoca[] = LIGACOES.map((ligacao) => ({
    href: ligacao.href,
    rotulo: ligacao.rotulo,
    icone: ligacao.icone,
    activo: estaActiva(ligacao.href, caminho),
  }));

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pb-[max(12px,env(safe-area-inset-bottom))] pt-6 md:hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-grafite via-grafite/85 to-transparent" />
      <Doca itens={itens} className="relative" />
    </div>
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
