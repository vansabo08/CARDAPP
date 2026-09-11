'use client';

import * as React from 'react';
import { sairDaCasa } from '@/app/admin/accoes';
import { COR_ESTADO } from '@/lib/cores';

/**
 * A faixa que diz em casa de quem se está.
 *
 * Enquanto a auditoria durar, tudo o que se escrever no painel escreve-se
 * nos dados de outra pessoa. O erro que isto tem de evitar não é o
 * malicioso — é o distraído: abrir a auditoria para ver uma coisa,
 * atender o telefone, e voltar meia hora depois a mexer no cardápio a
 * pensar que se está na conta própria.
 *
 * Por isso não é um aviso discreto. Fica no topo de todos os ecrãs do
 * painel, com o nome da casa em grande, cor de alarme, e a porta de
 * saída ao lado. Não se pode fechar: uma faixa que se dispensa é uma
 * faixa que não está lá quando faz falta.
 */
export function FaixaDeAuditoria({ nome }: { nome: string }) {
  const [aSair, setASair] = React.useState(false);

  async function sair() {
    setASair(true);
    await sairDaCasa();
    // Recarrega para o painel voltar a ser o de quem administra. Sem
    // isto ficavam os dados da outra casa no ecrã depois de já se ter
    // saído, que é o pior estado possível deste ecrã.
    window.location.href = '/admin';
  }

  return (
    <div
      className="sticky top-0 z-50 border-b"
      style={{
        borderColor: COR_ESTADO.critico,
        backgroundColor: 'rgba(208,59,59,0.12)',
      }}
    >
      <div className="mx-auto flex max-w-[880px] flex-wrap items-center justify-between gap-3 px-5 py-2.5 md:px-10">
        <p className="min-w-0 font-sans text-sm">
          <span className="font-semibold" style={{ color: COR_ESTADO.critico }}>
            Está em auditoria.
          </span>{' '}
          <span className="text-creme">
            Este painel é do <span className="font-semibold">{nome}</span>, e o que mudar aqui muda
            na casa dele.
          </span>
        </p>

        <button
          type="button"
          onClick={sair}
          disabled={aSair}
          className="shrink-0 rounded-full border px-3.5 py-1.5 font-sans text-xs font-semibold transition-colors disabled:opacity-50"
          style={{ borderColor: COR_ESTADO.critico, color: COR_ESTADO.critico }}
        >
          {aSair ? 'A sair…' : 'Sair da auditoria'}
        </button>
      </div>
    </div>
  );
}
