'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Marca } from '@/components/marca';
import { Distintivo } from '@/components/ui/distintivo';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { NOME_PLANO, type Plano } from '@/lib/tipos';
import { cn } from '@/lib/utils';
import {
  Armchair,
  BookOpen,
  ChartNoAxesColumn,
  ExternalLink,
  House,
  LayoutGrid,
  Lock,
  LogOut,
  Menu,
  QrCode,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { podeEntrar, NOME_PAPEL, type Area, type Papel } from '@/lib/papeis';
import { temFuncionalidade, type Funcionalidade } from '@/lib/funcionalidades';

/**
 * A navegação do painel: um menu ao lado, sempre.
 *
 * NO TELEMÓVEL ERA UMA BARRA PRESA AO FUNDO. Levava cinco separadores e
 * mais nada; tudo o resto — as mesas, a equipa, a administração — vivia
 * escondido atrás da inicial da casa, num canto. Quem trabalha no
 * telefone tinha meio painel por descobrir, e o polegar tapava a barra
 * sempre que havia um botão no fundo do ecrã.
 *
 * Agora é o mesmo menu nos dois sítios: fixo à esquerda no computador, e
 * no telemóvel uma gaveta que entra pelo lado, aberta pelo botão da
 * barra de cima. O que o dono vê no telefone é o que vê no computador,
 * pela mesma ordem e com os mesmos nomes.
 *
 * AS ENTRADAS ESTÃO EM GRUPOS porque são dez: o serviço do dia, o
 * cardápio, e a casa. Dez linhas seguidas lêem-se uma a uma; três grupos
 * de três lêem-se de relance, e o olho aprende onde cada coisa mora.
 */

type Ligacao = {
  href: string;
  rotulo: string;
  icone: typeof LayoutGrid;
  area: Area;
  /** Do Plano Sala: no Mesa aparece com cadeado e abre o cartão de upgrade. */
  sala?: Funcionalidade;
};

type Grupo = { titulo: string; ligacoes: readonly Ligacao[] };

const GRUPOS: readonly Grupo[] = [
  {
    titulo: 'O dia',
    ligacoes: [
      { href: '/painel', rotulo: 'Resumo', icone: LayoutGrid, area: 'resumo' },
      { href: '/painel/pedidos', rotulo: 'Pedidos', icone: ReceiptText, area: 'pedidos' },
      { href: '/painel/salao', rotulo: 'Salão', icone: Armchair, area: 'salao', sala: 'salao' },
    ],
  },
  {
    titulo: 'A casa',
    ligacoes: [
      { href: '/painel/cardapio', rotulo: 'Cardápio', icone: BookOpen, area: 'cardapio' },
      { href: '/painel/mesas', rotulo: 'Mesas e QR', icone: QrCode, area: 'mesas' },
      {
        href: '/painel/equipa',
        rotulo: 'Equipa',
        icone: UsersRound,
        area: 'equipa',
        sala: 'equipa',
      },
    ],
  },
  {
    titulo: 'As contas',
    ligacoes: [
      {
        href: '/painel/estatisticas',
        rotulo: 'Estatísticas',
        icone: ChartNoAxesColumn,
        area: 'estatisticas',
        sala: 'estatisticas',
      },
      {
        href: '/painel/definicoes',
        rotulo: 'Definições',
        icone: SlidersHorizontal,
        area: 'definicoes',
      },
    ],
  },
];

/** Os grupos deste papel, já sem as entradas que ele não pode abrir. */
function gruposDe(papel: Papel): Grupo[] {
  return GRUPOS.map((g) => ({
    ...g,
    ligacoes: g.ligacoes.filter((l) => podeEntrar(papel, l.area)),
  })).filter((g) => g.ligacoes.length > 0);
}

/**
 * O selo das casas do Plano Sala.
 *
 * Pequeno e quente: é para quem paga o plano de cima sentir que o tem,
 * não para gritar.
 */
export function SeloSala({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-laranja/40 bg-laranja/10 px-2 py-0.5',
        'font-sans text-xs font-semibold text-laranja',
        className,
      )}
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      Sala
    </span>
  );
}

function PlanoEPapel({ plano, papel }: { plano: Plano; papel: Papel }) {
  return (
    <>
      {plano === 'sala' ? <SeloSala /> : <span>Plano {NOME_PLANO[plano]}</span>}
      {papel !== 'dono' ? <span>· {NOME_PAPEL[papel]}</span> : null}
    </>
  );
}

function estaActiva(href: string, caminho: string) {
  return href === '/painel' ? caminho === '/painel' : caminho.startsWith(href);
}

type Props = {
  nomeRestaurante: string | null;
  slug: string | null;
  plano: Plano;
  demonstracao: boolean;
  administrador?: boolean;
  papel?: Papel;
};

export function NavegacaoPainel(props: Props) {
  const caminho = usePathname();
  const [aberta, setAberta] = React.useState(false);

  // Muda de página, fecha a gaveta — senão fica por cima do ecrã novo.
  React.useEffect(() => setAberta(false), [caminho]);

  // Com a gaveta aberta, a página por baixo não rola.
  React.useEffect(() => {
    if (!aberta) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setAberta(false);
    window.addEventListener('keydown', aoTeclar);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [aberta]);

  return (
    <>
      {/* ---------------------------------------------------------- */}
      {/* Barra de cima, só no telemóvel                              */}
      {/* ---------------------------------------------------------- */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-linha bg-grafite-alto px-4 md:hidden">
        <button
          type="button"
          onClick={() => setAberta(true)}
          aria-label="Abrir o menu"
          aria-expanded={aberta}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-creme transition-colors duration-200 hover:bg-black/[0.07] active:scale-95"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <Marca tamanho="sm" href="/painel" />

        <div className="ml-auto flex items-center gap-2">
          {props.demonstracao ? <Distintivo tom="laranja">Demonstração</Distintivo> : null}
        </div>
      </header>

      {/* O escurecido por trás da gaveta. */}
      {aberta ? (
        <button
          type="button"
          aria-label="Fechar o menu"
          onClick={() => setAberta(false)}
          className="fixed inset-0 z-50 bg-creme/40 md:hidden"
        />
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* O menu                                                      */}
      {/* ---------------------------------------------------------- */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[55] w-[270px] border-r border-linha bg-grafite-alto',
          'transition-transform duration-300 ease-calmo',
          aberta ? 'translate-x-0 shadow-elevacao-3' : '-translate-x-full',
          // No computador está sempre lá, e faz parte da página.
          'md:sticky md:top-0 md:z-auto md:h-dvh md:w-[252px] md:shrink-0 md:translate-x-0 md:shadow-none',
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-5">
            <Marca tamanho="sm" href="/painel" />
            <div className="flex items-center gap-2">
              <span className="hidden md:inline">
                {props.demonstracao ? <Distintivo tom="laranja">Demonstração</Distintivo> : null}
              </span>
              <button
                type="button"
                onClick={() => setAberta(false)}
                aria-label="Fechar o menu"
                className="flex h-10 w-10 items-center justify-center rounded-full text-tenue transition-colors hover:bg-black/[0.07] hover:text-creme md:hidden"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>

          {props.nomeRestaurante ? (
            <div className="px-5 pb-5">
              <p className="truncate font-display text-lg text-creme">{props.nomeRestaurante}</p>
              <p className="mt-1.5 flex items-center gap-2 font-sans text-xs text-tenue">
                <PlanoEPapel plano={props.plano} papel={props.papel ?? 'dono'} />
              </p>
            </div>
          ) : null}

          <nav aria-label="Secções do painel" className="flex flex-col gap-5 px-3">
            {gruposDe(props.papel ?? 'dono').map((grupo) => (
              <div key={grupo.titulo}>
                <p className="etiqueta px-3.5 pb-1.5 text-[11px] text-creme/35">{grupo.titulo}</p>
                <ul className="flex flex-col gap-0.5">
                  {grupo.ligacoes.map((ligacao) => {
                    const activa = estaActiva(ligacao.href, caminho);
                    const fechada = ligacao.sala
                      ? !temFuncionalidade({ plano: props.plano }, ligacao.sala)
                      : false;
                    return (
                      <li key={ligacao.href}>
                        <Link
                          href={ligacao.href}
                          aria-current={activa ? 'page' : undefined}
                          className={cn(
                            'flex items-center gap-3 rounded-full px-3.5 py-2.5 font-sans text-sm font-semibold transition-colors duration-200',
                            activa
                              ? 'bg-laranja text-creme shadow-brilho-laranja'
                              : 'text-creme/70 hover:bg-black/[0.06] hover:text-creme',
                          )}
                        >
                          <ligacao.icone className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="flex-1 truncate">{ligacao.rotulo}</span>
                          {fechada ? (
                            <Lock
                              className={cn('h-3.5 w-3.5', activa ? 'text-grafite/70' : 'text-tenue')}
                              aria-label="Plano Sala"
                            />
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* ------------------------------------------------------ */}
          {/* O pé: a casa lá fora, e a saída                         */}
          {/* ------------------------------------------------------ */}
          <div className="mt-auto flex flex-col gap-0.5 border-t border-linha p-3">
            {props.slug ? (
              <a
                href={`/${props.slug}`}
                target="_blank"
                rel="noreferrer"
                className={pe}
              >
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                Ver o cardápio
              </a>
            ) : null}

            <Link href="/" className={pe}>
              <House className="h-4 w-4 shrink-0" aria-hidden />
              Página inicial
            </Link>

            {props.administrador ? (
              <Link href="/admin" className={cn(pe, 'text-laranja hover:text-laranja-claro')}>
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                Administração
              </Link>
            ) : null}

            <Sair />
          </div>
        </div>
      </aside>
    </>
  );
}

const pe = cn(
  'flex items-center gap-3 rounded-full px-3.5 py-2.5 text-left font-sans text-sm text-tenue',
  'transition-colors duration-200 hover:bg-black/[0.05] hover:text-creme',
);

function Sair() {
  const router = useRouter();

  async function sair() {
    const supabase = clienteNavegador();
    await supabase?.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button type="button" onClick={sair} className={pe}>
      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
      Sair da conta
    </button>
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
