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
    <aside className="superficie rounded-none border-x-0 border-t-0 shadow-[inset_0_1px_0_0_rgba(250,247,242,0.11)] md:sticky md:top-0 md:h-dvh md:w-[248px] md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-5 md:px-6">
          <Marca tamanho="sm" href="/painel" />

          <div className="flex items-center gap-2.5">
            {demonstracao ? <Distintivo tom="laranja">Demonstração</Distintivo> : null}

            {/*
              No telemóvel, tudo o que não é navegação estava escondido
              atrás de `md:` — o nome da casa, o cardápio e o Sair. Quem
              entrasse pelo telefone ficava sem forma de sair da conta.
              Este botão devolve-lhes isso.

              É a inicial da casa num círculo, e não uma pastilha a dizer
              "Conta": ocupa metade do espaço, e a inicial diz de quem é a
              conta — num telemóvel de balcão, onde se entra e sai de
              contas diferentes, isso vale mais do que a palavra.
            */}
            <button
              type="button"
              onClick={() => setMenuAberto((aberto) => !aberto)}
              aria-expanded={menuAberto}
              aria-controls="menu-da-conta"
              aria-label={nomeRestaurante ? `Conta de ${nomeRestaurante}` : 'A sua conta'}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full',
                'font-display text-base text-grafite transition-transform duration-200 md:hidden',
                'bg-laranja active:scale-95',
              )}
            >
              {(nomeRestaurante ?? 'C').trim().charAt(0).toUpperCase()}
              <ChevronDown
                aria-hidden
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-grafite-alto p-0.5 text-creme/70',
                  'transition-transform duration-300 ease-calmo',
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
                className="rounded-full px-3.5 py-2.5 font-sans text-sm text-laranja transition-colors duration-200 hover:text-laranja-claro"
              >
                Administração
              </Link>
            ) : null}

            <button
              type="button"
              onClick={sair}
              className="rounded-full px-3.5 py-2.5 text-left font-sans text-sm font-semibold text-creme transition-colors duration-200 hover:text-laranja"
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
              className="rounded-full px-3.5 py-2.5 font-sans text-sm text-laranja transition-colors duration-200 hover:text-laranja-claro"
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
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-grafite-alto pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5 md:hidden">
      <Doca itens={itens} />
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
    // Sem a linha por baixo: o título forte já separa, e uma régua em
    // cada página era mais uma coisa a desenhar o ecrã em fatias.
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl leading-tight text-creme md:text-4xl">{titulo}</h1>
        {descricao ? (
          <p className="mt-1.5 max-w-[52ch] font-sans text-sm leading-normal text-tenue">
            {descricao}
          </p>
        ) : null}
      </div>
      {accao}
    </div>
  );
}
