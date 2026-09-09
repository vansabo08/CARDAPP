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
import {
  BookOpen,
  ChevronDown,
  LayoutGrid,
  QrCode,
  ReceiptText,
  SlidersHorizontal,
} from 'lucide-react';

const LIGACOES = [
  { href: '/painel', rotulo: 'Resumo', icone: LayoutGrid },
  { href: '/painel/pedidos', rotulo: 'Pedidos', icone: ReceiptText },
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
  const [menuAberto, setMenuAberto] = React.useState(false);

  // Fecha ao mudar de página, senão fica aberto por cima do ecrã novo.
  React.useEffect(() => setMenuAberto(false), [caminho]);

  async function sair() {
    const supabase = clienteNavegador();
    await supabase?.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <aside className="vidro rounded-none border-x-0 border-t-0 shadow-[inset_0_1px_0_0_rgba(250,247,242,0.11)] md:sticky md:top-0 md:h-dvh md:w-[248px] md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-5 md:px-6">
          <Marca tamanho="sm" href="/painel" />

          <div className="flex items-center gap-3">
            {demonstracao ? <Distintivo tom="ouro">Demonstração</Distintivo> : null}

            {/*
              No telemóvel, tudo o que não é navegação estava escondido
              atrás de `md:` — o nome da casa, o cardápio e o Sair. Quem
              entrasse pelo telefone ficava sem forma de sair da conta.
              Este botão devolve-lhes isso.
            */}
            <button
              type="button"
              onClick={() => setMenuAberto((aberto) => !aberto)}
              aria-expanded={menuAberto}
              aria-controls="menu-da-conta"
              className="flex items-center gap-2 rounded-full border border-linha px-3 py-1.5 font-sans text-xs text-tenue transition-colors duration-200 hover:text-creme md:hidden"
            >
              Conta
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-300 ease-calmo',
                  menuAberto && 'rotate-180',
                )}
              />
            </button>
          </div>
        </div>

        {menuAberto ? (
          <div
            id="menu-da-conta"
            className="flex flex-col gap-1 border-t border-linha px-4 py-3 md:hidden"
          >
            {nomeRestaurante ? (
              <p className="truncate px-3.5 pb-2 font-display text-base text-creme">
                {nomeRestaurante}
                <span className="mt-0.5 block font-sans text-xs text-tenue">
                  Plano {NOME_PLANO[plano]}
                </span>
              </p>
            ) : null}

            {slug ? (
              <a
                href={`/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full px-3.5 py-2.5 font-sans text-sm text-tenue transition-colors duration-200 hover:text-creme"
              >
                Ver o cardápio ↗
              </a>
            ) : null}

            <Link
              href="/"
              className="rounded-full px-3.5 py-2.5 font-sans text-sm text-tenue transition-colors duration-200 hover:text-creme"
            >
              Página inicial
            </Link>

            {administrador ? (
              <Link
                href="/admin"
                className="rounded-full px-3.5 py-2.5 font-sans text-sm text-ouro transition-colors duration-200 hover:text-ouro-claro"
              >
                Administração
              </Link>
            ) : null}

            <button
              type="button"
              onClick={sair}
              className="rounded-full px-3.5 py-2.5 text-left font-sans text-sm font-semibold text-creme transition-colors duration-200 hover:text-ouro"
            >
              Sair da conta
            </button>
          </div>
        ) : null}

        {nomeRestaurante ? (
          <div className="hidden px-6 pb-6 md:block">
            <p className="truncate font-display text-lg text-creme">{nomeRestaurante}</p>
            <p className="mt-1 font-sans text-xs text-tenue">Plano {NOME_PLANO[plano]}</p>
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
                  'shrink-0 rounded-full px-3.5 py-2 font-sans text-sm font-semibold transition-colors duration-200 md:py-2.5',
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
              className="rounded-full px-3.5 py-2.5 font-sans text-sm text-tenue transition-colors duration-200 hover:text-creme"
            >
              Ver o cardápio ↗
            </a>
          ) : null}
          <Link
            href="/"
            className="rounded-full px-3.5 py-2.5 font-sans text-sm text-tenue transition-colors duration-200 hover:text-creme"
          >
            Página inicial
          </Link>
          {administrador ? (
            <Link
              href="/admin"
              className="rounded-full px-3.5 py-2.5 font-sans text-sm text-ouro transition-colors duration-200 hover:text-ouro-claro"
            >
              Administração
            </Link>
          ) : null}
          <button
            type="button"
            onClick={sair}
            className="rounded-full px-3.5 py-2.5 text-left font-sans text-sm text-tenue transition-colors duration-200 hover:text-creme"
          >
            Sair da conta
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
        <h1 className="font-display text-3xl leading-tight text-creme md:text-4xl">{titulo}</h1>
        {descricao ? (
          <p className="mt-2 max-w-[52ch] font-sans text-sm leading-normal text-tenue">
            {descricao}
          </p>
        ) : null}
      </div>
      {accao}
    </div>
  );
}
