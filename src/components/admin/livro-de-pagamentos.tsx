'use client';

import * as React from 'react';
import { COR_ESTADO } from '@/lib/cores';
import { formatarKz } from '@/lib/format';
import { NOME_PLANO } from '@/lib/tipos';
import type { ContaAdmin, LinhaDePagamento } from '@/lib/admin';
import { aplicarPagamento } from '@/app/admin/accoes';

/**
 * O livro dos pagamentos.
 *
 * Existe por uma avaria que é a mais provável de todas porque é a mais
 * humana: pagar na Kursinha com um email e ter a conta do Cardapp
 * noutro. O webhook faz o que deve — grava, não abre nada a ninguém, e
 * escreve porquê. Mas isso ficava só na base de dados, e ninguém vai à
 * base de dados ver se alguém pagou.
 *
 * Um pagamento que entrou e não abriu porta nenhuma é dinheiro recebido
 * com o serviço por entregar. Por isso os órfãos vêm primeiro, em cima,
 * com o remédio ao lado — e não enterrados por ordem de data no meio
 * dos que correram bem.
 */
export function LivroDePagamentos({
  pagamentos,
  contas,
}: {
  pagamentos: LinhaDePagamento[];
  contas: ContaAdmin[];
}) {
  const [linhas, setLinhas] = React.useState(pagamentos);
  const [ocupado, setOcupado] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const agora = useAgora();

  React.useEffect(() => setLinhas(pagamentos), [pagamentos]);

  const orfaos = linhas.filter((l) => l.orfao);
  const resto = linhas.filter((l) => !l.orfao);

  async function aplicar(pagamento: LinhaDePagamento, restauranteId: string) {
    if (!restauranteId) return;

    setOcupado(pagamento.id);
    setErro(null);

    const r = await aplicarPagamento(pagamento.id, restauranteId);

    setOcupado(null);
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível aplicar.');
      return;
    }

    const nome = contas.find((c) => c.id === restauranteId)?.nome ?? null;
    setLinhas((ls) =>
      ls.map((l) =>
        l.id === pagamento.id
          ? { ...l, orfao: false, tipo: 'pago', restauranteId, restauranteNome: nome }
          : l,
      ),
    );
  }

  return (
    <section className="vidro rounded-cartao p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-xl text-creme">Pagamentos</h2>
        {orfaos.length ? (
          <span className="font-sans text-xs" style={{ color: COR_ESTADO.critico }}>
            {orfaos.length} por resolver
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-pretty font-sans text-xs leading-normal text-tenue">
        O que a Kursinha mandou, e o que cada aviso fez à conta.
      </p>

      {erro ? (
        <p className="mt-4 font-sans text-xs" style={{ color: COR_ESTADO.critico }}>
          {erro}
        </p>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* Os que precisam de mão                                        */}
      {/* ------------------------------------------------------------ */}
      {orfaos.length ? (
        <div className="mt-5 flex flex-col gap-3">
          {orfaos.map((p) => (
            <Orfao
              key={p.id}
              pagamento={p}
              contas={contas}
              ocupado={ocupado === p.id}
              aoAplicar={(id) => aplicar(p, id)}
              agora={agora}
            />
          ))}
        </div>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* Os que correram bem                                           */}
      {/* ------------------------------------------------------------ */}
      {resto.length ? (
        <ol className="mt-5 flex flex-col divide-y divide-linha">
          {resto.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
            >
              <div className="min-w-0">
                <p className="font-sans text-sm text-creme">
                  {p.valor != null ? formatarKz(p.valor) : 'sem valor'}
                  {p.plano ? <span className="text-tenue"> · {NOME_PLANO[p.plano]}</span> : null}
                  {p.restauranteNome ? (
                    <span className="text-tenue"> · {p.restauranteNome}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 font-sans text-xs text-tenue">
                  {p.email ?? 'sem email'} · {rotuloDoTipo(p.tipo)}
                </p>
              </div>
              <time
                dateTime={p.quando}
                className="shrink-0 font-sans text-xs tabular-nums text-tenue"
              >
                {quando(p.quando, agora)}
              </time>
            </li>
          ))}
        </ol>
      ) : null}

      {!linhas.length ? (
        <p className="mt-5 rounded-cartao border border-linha px-5 py-8 text-center font-sans text-sm text-tenue">
          Ainda não entrou nenhum aviso de pagamento.
        </p>
      ) : null}
    </section>
  );
}

/**
 * Um pagamento sem dono, e a forma de lhe dar um.
 *
 * Leva cor de alarme e o dinheiro em grande porque é isso que está em
 * causa: entrou, e a casa continua fechada.
 */
function Orfao({
  pagamento,
  contas,
  ocupado,
  aoAplicar,
  agora,
}: {
  pagamento: LinhaDePagamento;
  contas: ContaAdmin[];
  ocupado: boolean;
  aoAplicar: (restauranteId: string) => void;
  agora: number | null;
}) {
  const [escolhida, setEscolhida] = React.useState('');

  return (
    <article
      className="rounded-cartao border p-5 transition-opacity duration-200"
      style={{ borderColor: COR_ESTADO.critico, opacity: ocupado ? 0.6 : 1 }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-lg text-creme">
          {pagamento.valor != null ? formatarKz(pagamento.valor) : 'Pagamento'}
          {pagamento.plano ? (
            <span className="font-sans text-sm text-tenue"> · {NOME_PLANO[pagamento.plano]}</span>
          ) : null}
        </p>
        <time dateTime={pagamento.quando} className="font-sans text-xs tabular-nums text-tenue">
          {quando(pagamento.quando, agora)}
        </time>
      </div>

      <p className="mt-1.5 font-sans text-sm text-creme">{pagamento.email ?? 'sem email'}</p>
      <p className="mt-1 text-pretty font-sans text-xs leading-normal text-tenue">
        {pagamento.nota ?? 'Entrou, e não abriu conta nenhuma.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={'casa-' + pagamento.id}>
          Conta a que este pagamento pertence
        </label>
        <select
          id={'casa-' + pagamento.id}
          value={escolhida}
          onChange={(e) => setEscolhida(e.target.value)}
          disabled={ocupado}
          className="min-w-0 flex-1 rounded-suave border border-linha bg-transparent px-3 py-2 font-sans text-sm text-creme outline-none transition-colors focus:border-ouro disabled:opacity-50"
        >
          <option value="">A que casa pertence?</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id} className="bg-grafite">
              {c.nome}
              {c.email ? ' — ' + c.email : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!escolhida || ocupado}
          onClick={() => aoAplicar(escolhida)}
          className="rounded-suave bg-ouro px-4 py-2 font-sans text-sm text-grafite transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {ocupado ? 'A aplicar…' : 'Aplicar'}
        </button>
      </div>

      <p className="mt-2 font-sans text-xs text-tenue">
        Acrescenta os dias do plano à conta escolhida, a contar do que ela já tem.
      </p>
    </article>
  );
}

/**
 * O relógio só arranca depois de a página montar.
 *
 * "Há 22 minutos" calculado no servidor e outra vez no cliente dá dois
 * textos diferentes, e o React recusa a página inteira por causa disso.
 * Enquanto não montou mostra-se a data absoluta, que é igual dos dois
 * lados; depois de montar, sobe a relativa, que é a que se lê de
 * relance.
 */
function useAgora() {
  const [agora, setAgora] = React.useState<number | null>(null);
  React.useEffect(() => setAgora(Date.now()), []);
  return agora;
}

function rotuloDoTipo(tipo: string) {
  if (tipo === 'pago') return 'abriu a conta';
  if (tipo === 'reembolsado') return 'reembolsado — fechou a conta';
  if (tipo === 'ignorado') return 'não aplicado';
  return tipo;
}

function quando(iso: string, agora: number | null) {
  const absoluta = new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Luanda',
  }).format(new Date(iso));

  if (agora == null) return absoluta;

  const minutos = Math.floor((agora - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return 'há ' + minutos + ' min';

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? 'há 1 hora' : 'há ' + horas + ' horas';

  return absoluta;
}
