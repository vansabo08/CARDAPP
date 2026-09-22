'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Logotipo } from '@/components/logotipo';
import { abertoComoApp, eIphone } from '@/lib/aparelho';
import { cn } from '@/lib/utils';

/**
 * O ícone mudou, e quem já tinha a app no ecrã inicial não sabe.
 *
 * O ficheiro novo está no ar e o manifest aponta para ele — isso
 * resolve-se sozinho no browser. O ecrã inicial é outra história, e as
 * duas lojas não se portam da mesma maneira:
 *
 * O CHROME TROCA SOZINHO, MAS DEMORA. Compara o manifest cerca de uma
 * vez por dia, quando a app abre; se mudou, encomenda um pacote novo e
 * substitui em silêncio. Costuma levar de um a três dias, e precisa que
 * a pessoa abra a app nesse período. Não há forma de o apressar.
 *
 * O IPHONE NUNCA TROCA. O iOS tira uma fotografia ao ícone no momento
 * de "Adicionar ao ecrã principal" e fica com ela para sempre. Não há
 * API nenhuma para isto: a única saída é remover e voltar a adicionar.
 *
 * Por isso o aviso existe. Aparece só a quem abriu do ecrã inicial —
 * quem anda no browser vê o ícone certo na altura em que instalar. É o
 * avesso exacto do convite para instalar, e os dois nunca se cruzam.
 *
 * Fecha-se uma vez e não volta. E tem prazo: passada a data, ninguém o
 * vê, porque quem instalar a partir daí já leva o ícone novo e seria um
 * aviso sobre coisa nenhuma.
 */

const CHAVE = 'cardapp:aviso-do-icone';

/**
 * O ícone mudou a 20 de Setembro de 2026. Dois meses chegam para toda a
 * gente abrir o painel pelo menos uma vez; a partir daí o aviso cala-se
 * sozinho, e este ficheiro pode sair do projecto.
 */
const ATE = Date.UTC(2026, 10, 20);

/** Deixa a pessoa chegar ao que veio fazer antes de lhe dizer isto. */
const ESPERA = 6000;

function jaFechou() {
  try {
    return localStorage.getItem(CHAVE) === 'sim';
  } catch {
    // Sem armazenamento, volta a aparecer. Chato, mas não parte nada.
    return false;
  }
}

export function AvisoDoIcone() {
  const [visivel, setVisivel] = React.useState(false);
  const [aSair, setASair] = React.useState(false);
  const [noIphone, setNoIphone] = React.useState(false);

  React.useEffect(() => {
    if (Date.now() > ATE) return;
    if (!abertoComoApp() || jaFechou()) return;

    setNoIphone(eIphone());
    const relogio = window.setTimeout(() => setVisivel(true), ESPERA);
    return () => window.clearTimeout(relogio);
  }, []);

  function fechar() {
    setASair(true);
    window.setTimeout(() => setVisivel(false), 250);
    try {
      localStorage.setItem(CHAVE, 'sim');
    } catch {
      /* sem armazenamento: aparece outra vez, e fecha-se outra vez */
    }
  }

  if (!visivel) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-3 top-3 z-[70] mx-auto max-w-[440px]',
        aSair
          ? '-translate-y-3 opacity-0 transition-[opacity,transform] duration-normal ease-saida'
          : 'animate-descer',
      )}
      role="dialog"
      aria-label="O ícone do CardApp mudou"
    >
      <div className="superficie flex items-start gap-3 rounded-cartao p-3.5 shadow-elevacao-3-escura">
        {/* O ícone novo, ao lado do texto que fala dele. */}
        <Logotipo tamanho={40} className="mt-0.5" />

        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-creme">O ícone do CardApp mudou</p>

          {noIphone ? (
            <p className="mt-1 text-pretty font-sans text-xs leading-normal text-tenue">
              No iPhone o ícone antigo fica no ecrã inicial para sempre. Mantenha o dedo em cima
              dele, escolha <span className="text-creme">Remover</span>, e volte a adicionar pelo
              menu de <span className="text-creme">Partilhar</span>.
            </p>
          ) : (
            <p className="mt-1 text-pretty font-sans text-xs leading-normal text-tenue">
              O telefone troca-o sozinho nos próximos dias. Se tiver pressa, remova o atalho do ecrã
              inicial e volte a adicioná-lo.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={fechar}
          aria-label="Já percebi"
          className={cn(
            'shrink-0 rounded-full p-1.5 text-tenue',
            'transition-colors duration-rapida ease-assinatura hover:text-creme',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja',
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
