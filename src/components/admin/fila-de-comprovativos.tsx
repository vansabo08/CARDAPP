'use client';

import * as React from 'react';
import { decidirComprovativo } from '@/app/admin/accoes';
import { COR_ESTADO } from '@/lib/cores';
import { formatarKz } from '@/lib/format';
import { NOME_PLANO } from '@/lib/tipos';
import type { LinhaDeComprovativo } from '@/lib/admin';

/**
 * A fila dos comprovativos.
 *
 * Cada linha destas é uma casa que já transferiu, já tem o painel aberto
 * a título provisório, e está à espera que alguém confirme no banco. O
 * comprovativo mostra-se em grande — é isto que se vai comparar com o
 * extracto, e uma miniatura de 80px não serve para ler um valor.
 *
 * O ficheiro chega por link assinado que morre ao fim de uma hora. Um
 * comprovativo tem o IBAN de duas pessoas, e um URL público disso era
 * um extracto bancário à solta na internet para sempre.
 */
export function FilaDeComprovativos({ linhas }: { linhas: LinhaDeComprovativo[] }) {
  const [lista, setLista] = React.useState(linhas);
  const [ocupado, setOcupado] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => setLista(linhas), [linhas]);

  const aEsperar = lista.filter((l) => l.estado === 'a_espera');
  const decididos = lista.filter((l) => l.estado !== 'a_espera');

  async function decidir(linha: LinhaDeComprovativo, aprovado: boolean) {
    setOcupado(linha.id);
    setErro(null);

    const r = await decidirComprovativo(linha.id, aprovado);

    setOcupado(null);
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível decidir.');
      return;
    }

    setLista((ls) =>
      ls.map((l) =>
        l.id === linha.id ? { ...l, estado: aprovado ? 'aprovado' : 'recusado' } : l,
      ),
    );
  }

  return (
    <section className="vidro rounded-cartao p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-xl text-creme">Comprovativos</h2>
        {aEsperar.length ? (
          <span className="font-sans text-xs" style={{ color: COR_ESTADO.aviso }}>
            {aEsperar.length} à espera de si
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-pretty font-sans text-xs leading-normal text-tenue">
        Quem transferiu e está com o painel aberto a título provisório. Confirme no banco antes de
        aprovar — o comprovativo mostra o que a casa diz, não o que o banco recebeu.
      </p>

      {erro ? (
        <p className="mt-4 font-sans text-xs" style={{ color: COR_ESTADO.critico }}>
          {erro}
        </p>
      ) : null}

      {aEsperar.length ? (
        <div className="mt-5 flex flex-col gap-4">
          {aEsperar.map((l) => (
            <Cartao
              key={l.id}
              linha={l}
              ocupado={ocupado === l.id}
              aoDecidir={(sim) => decidir(l, sim)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-cartao border border-linha px-5 py-8 text-center font-sans text-sm text-tenue">
          Ninguém à espera. Os comprovativos que entrarem aparecem aqui.
        </p>
      )}

      {decididos.length ? (
        <ol className="mt-6 flex flex-col divide-y divide-linha border-t border-linha pt-2">
          {decididos.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
            >
              <div className="min-w-0">
                <p className="font-sans text-sm text-creme">
                  {formatarKz(l.valor)}
                  <span className="text-tenue"> · {NOME_PLANO[l.plano]}</span>
                  {l.restauranteNome ? (
                    <span className="text-tenue"> · {l.restauranteNome}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 font-sans text-xs text-tenue">
                  <span
                    style={{
                      color: l.estado === 'aprovado' ? COR_ESTADO.bom : COR_ESTADO.critico,
                    }}
                  >
                    {l.estado === 'aprovado' ? 'aprovado' : 'recusado'}
                  </span>
                  {l.decididoPor ? ` · ${l.decididoPor}` : ''}
                </p>
              </div>
              {l.ficheiro ? (
                <a
                  href={l.ficheiro}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 font-sans text-xs text-tenue underline underline-offset-4 hover:text-creme"
                >
                  ver o comprovativo ↗
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function Cartao({
  linha,
  ocupado,
  aoDecidir,
}: {
  linha: LinhaDeComprovativo;
  ocupado: boolean;
  aoDecidir: (aprovado: boolean) => void;
}) {
  return (
    <article
      className="rounded-cartao border p-5 transition-opacity duration-200"
      style={{ borderColor: COR_ESTADO.aviso, opacity: ocupado ? 0.6 : 1 }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-lg text-creme">
          {formatarKz(linha.valor)}
          <span className="font-sans text-sm text-tenue"> · {NOME_PLANO[linha.plano]}</span>
        </p>
        <p className="font-sans text-xs text-tenue">{quando(linha.enviadoEm)}</p>
      </div>

      <p className="mt-1 font-sans text-sm text-creme">{linha.restauranteNome ?? 'casa apagada'}</p>

      {/* ------------------------------------------------------------ */}
      {/* O comprovativo, em tamanho que se leia                        */}
      {/* ------------------------------------------------------------ */}
      {linha.ficheiro ? (
        linha.pdf ? (
          <a
            href={linha.ficheiro}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center rounded-cartao border border-linha px-5 py-8 font-sans text-sm text-creme transition-colors hover:border-ouro"
          >
            Abrir o PDF do comprovativo ↗
          </a>
        ) : (
          <a href={linha.ficheiro} target="_blank" rel="noreferrer" className="mt-4 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={linha.ficheiro}
              alt={`Comprovativo de ${linha.restauranteNome ?? 'uma casa'}`}
              className="max-h-[420px] w-full rounded-cartao border border-linha object-contain"
            />
          </a>
        )
      ) : (
        <p className="mt-4 rounded-cartao border border-linha px-5 py-6 text-center font-sans text-sm text-tenue">
          O ficheiro não abriu. Recarregue a página para pedir outro link.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => aoDecidir(true)}
          className="rounded-suave px-4 py-2 font-sans text-sm text-grafite transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: COR_ESTADO.bom }}
        >
          {ocupado ? 'A guardar…' : 'Confirmei no banco — aprovar'}
        </button>

        <button
          type="button"
          disabled={ocupado}
          onClick={() => aoDecidir(false)}
          className="rounded-suave border px-4 py-2 font-sans text-sm transition-colors disabled:opacity-40"
          style={{ borderColor: COR_ESTADO.critico, color: COR_ESTADO.critico }}
        >
          Não entrou — recusar
        </button>
      </div>

      <p className="mt-2 font-sans text-xs text-tenue">
        Aprovar dá os 30 dias do plano. Recusar fecha o painel na hora.
      </p>
    </article>
  );
}

function quando(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Luanda',
  }).format(new Date(iso));
}
