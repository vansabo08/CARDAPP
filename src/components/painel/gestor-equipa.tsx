'use client';

import * as React from 'react';
import { ChefHat, Clock3, ConciergeBell, Crown, MailPlus, ShieldCheck, Trash2, UsersRound } from 'lucide-react';
import { Botao } from '@/components/ui/botao';
import { Campo, Erro, Rotulo } from '@/components/ui/campo';
import {
  convidarMembro,
  mudarPapel,
  tirarDaEquipa,
  type Resultado,
} from '@/app/painel/equipa/accoes';
import {
  DESCRICAO_PAPEL,
  NOME_PAPEL,
  PAPEIS_DE_MEMBRO,
  type PapelDeMembro,
} from '@/lib/papeis';
import type { Membro } from '@/lib/tipos';
import { cn } from '@/lib/utils';

/**
 * A equipa de uma casa: quem está, com que papel, e o convite.
 *
 * O convite vem primeiro no telemóvel porque é a razão por que se abre
 * este ecrã; a lista vem primeiro no computador, onde há espaço para as
 * duas coisas lado a lado.
 */

const ICONE_DO_PAPEL = {
  gerente: ShieldCheck,
  empregado: ConciergeBell,
  cozinha: ChefHat,
} as const;

const DATA = new Intl.DateTimeFormat('pt-AO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Luanda',
});

export function GestorEquipa({
  membros,
  limite,
  nomeCasa,
}: {
  membros: Membro[];
  limite: number;
  nomeCasa: string;
}) {
  const [mensagem, setMensagem] = React.useState<Resultado | null>(null);
  const ocupados = membros.length;
  const cheia = ocupados >= limite;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
      <section aria-labelledby="quem-esta" className="order-2 lg:order-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="quem-esta" className="font-display text-xl text-creme">
            Quem está
          </h2>
          <p className="font-sans text-sm text-tenue">
            <span className="font-semibold tabular-nums text-creme">{ocupados}</span> de {limite}{' '}
            lugares
          </p>
        </div>

        {/* A barra de lugares: diz de relance quanto falta. */}
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={limite}
          aria-valuenow={ocupados}
          aria-label="Lugares ocupados na equipa"
        >
          <div
            className="h-full rounded-full bg-laranja transition-[width] duration-500 ease-assinatura"
            style={{ width: `${limite ? Math.min(100, (ocupados / limite) * 100) : 0}%` }}
          />
        </div>

        <ul className="mt-5 flex flex-col gap-2.5">
          <li className="superficie flex items-center gap-4 rounded-cartao px-4 py-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-laranja font-display text-base text-creme">
              <Crown className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm font-semibold text-creme">Dono de {nomeCasa}</p>
              <p className="font-sans text-xs text-tenue">Acesso a tudo, incluindo o plano.</p>
            </div>
          </li>

          {membros.map((membro) => (
            <LinhaMembro key={membro.id} membro={membro} aoResponder={setMensagem} />
          ))}
        </ul>

        {membros.length === 0 ? (
          <div className="mt-2.5 rounded-cartao border border-dashed border-black/10 px-6 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.05] text-tenue">
              <UsersRound className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-4 font-sans text-sm font-semibold text-creme">
              Ainda é só o dono.
            </p>
            <p className="mx-auto mt-1 max-w-[36ch] font-sans text-sm leading-normal text-tenue">
              Convide o gerente, quem anda na sala e a cozinha — cada um vê só o que lhe toca.
            </p>
          </div>
        ) : null}
      </section>

      <FormularioConvite cheia={cheia} limite={limite} aoResponder={setMensagem} />

      {mensagem ? (
        <p
          role={mensagem.ok ? 'status' : 'alert'}
          className={cn(
            'order-3 rounded-cartao px-4 py-3 font-sans text-sm lg:col-span-2',
            mensagem.ok ? 'bg-verde/15 text-creme' : 'bg-[#ff8a78]/10 text-[#ff8a78]',
          )}
        >
          {mensagem.ok ? mensagem.aviso : mensagem.erro}
        </p>
      ) : null}
    </div>
  );
}

function FormularioConvite({
  cheia,
  limite,
  aoResponder,
}: {
  cheia: boolean;
  limite: number;
  aoResponder: (r: Resultado) => void;
}) {
  const [email, setEmail] = React.useState('');
  const [nome, setNome] = React.useState('');
  const [papel, setPapel] = React.useState<PapelDeMembro>('empregado');
  const [erro, setErro] = React.useState<string | null>(null);
  const [aEnviar, iniciar] = React.useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    iniciar(async () => {
      const resposta = await convidarMembro({ email, nome, papel });
      if (resposta.ok) {
        setEmail('');
        setNome('');
        aoResponder(resposta);
      } else {
        setErro(resposta.erro);
      }
    });
  }

  return (
    <section
      aria-labelledby="convidar"
      className="superficie order-1 rounded-cartao p-5 sm:p-6 lg:order-2 lg:sticky lg:top-8"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-laranja/15 text-laranja">
          <MailPlus className="h-5 w-5" aria-hidden />
        </span>
        <h2 id="convidar" className="font-display text-xl text-creme">
          Convidar
        </h2>
      </div>

      {cheia ? (
        <p className="mt-4 font-sans text-sm leading-normal text-tenue">
          Os {limite} lugares da equipa estão ocupados. Tire alguém da lista para convidar outra
          pessoa.
        </p>
      ) : (
        <form onSubmit={enviar} className="mt-5 flex flex-col gap-5" noValidate>
          <div>
            <Rotulo htmlFor="convite-email">Email</Rotulo>
            <Campo
              id="convite-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@exemplo.ao"
              aria-invalid={Boolean(erro)}
              aria-describedby={erro ? 'convite-erro' : undefined}
            />
          </div>

          <div>
            <Rotulo htmlFor="convite-nome">
              Nome <span className="font-normal text-tenue">· opcional</span>
            </Rotulo>
            <Campo
              id="convite-nome"
              value={nome}
              maxLength={60}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como aparece na lista"
            />
          </div>

          <fieldset>
            <legend className="mb-2 block font-sans text-sm font-semibold text-creme/85">
              Papel
            </legend>
            <div className="flex flex-col gap-2">
              {PAPEIS_DE_MEMBRO.map((p) => {
                const Icone = ICONE_DO_PAPEL[p];
                const escolhido = papel === p;
                return (
                  <label
                    key={p}
                    className={cn(
                      'flex min-h-[56px] cursor-pointer items-start gap-3 rounded-campo border px-3.5 py-3 transition-colors duration-200',
                      escolhido
                        ? 'border-laranja bg-laranja/10'
                        : 'border-black/10 hover:border-black/25',
                      'focus-within:ring-2 focus-within:ring-laranja/40',
                    )}
                  >
                    <input
                      type="radio"
                      name="papel"
                      value={p}
                      checked={escolhido}
                      onChange={() => setPapel(p)}
                      className="sr-only"
                    />
                    <Icone
                      className={cn('mt-0.5 h-4 w-4 shrink-0', escolhido ? 'text-laranja' : 'text-tenue')}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block font-sans text-sm font-semibold text-creme">
                        {NOME_PAPEL[p]}
                      </span>
                      <span className="block font-sans text-xs leading-snug text-tenue">
                        {DESCRICAO_PAPEL[p]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {erro ? <Erro id="convite-erro">{erro}</Erro> : null}

          <Botao type="submit" variante="laranja" tamanho="lg" largo aCarregar={aEnviar}>
            Enviar convite
          </Botao>
          <p className="-mt-2 font-sans text-xs leading-normal text-tenue">
            A pessoa recebe um email e escolhe a palavra-passe. Se já tiver conta no CardApp, entra
            logo.
          </p>
        </form>
      )}
    </section>
  );
}

function LinhaMembro({
  membro,
  aoResponder,
}: {
  membro: Membro;
  aoResponder: (r: Resultado) => void;
}) {
  const [aConfirmar, setAConfirmar] = React.useState(false);
  const [ocupado, iniciar] = React.useTransition();
  const Icone = ICONE_DO_PAPEL[membro.papel];
  const nome = membro.nome || membro.email.split('@')[0];

  function trocarPapel(papel: PapelDeMembro) {
    iniciar(async () => aoResponder(await mudarPapel({ id: membro.id, papel })));
  }

  function tirar() {
    if (!aConfirmar) {
      setAConfirmar(true);
      return;
    }
    iniciar(async () => aoResponder(await tirarDaEquipa({ id: membro.id })));
  }

  return (
    <li
      className={cn(
        'superficie flex flex-wrap items-center gap-x-4 gap-y-3 rounded-cartao px-4 py-3.5 transition-opacity',
        ocupado && 'opacity-60',
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/[0.06] font-display text-base text-creme">
        {nome.charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1 basis-[180px]">
        <p className="truncate font-sans text-sm font-semibold text-creme">{nome}</p>
        <p className="truncate font-sans text-xs text-tenue">{membro.email}</p>
        <p className="mt-1 flex items-center gap-1.5 font-sans text-xs">
          {membro.aceite_em ? (
            <span className="text-tenue">Entrou a {DATA.format(new Date(membro.aceite_em))}</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-laranja">
              <Clock3 className="h-3 w-3" aria-hidden />
              Convite pendente
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <label className="relative">
          <span className="sr-only">Papel de {nome}</span>
          <Icone
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue"
            aria-hidden
          />
          <select
            value={membro.papel}
            disabled={ocupado}
            onChange={(e) => trocarPapel(e.target.value as PapelDeMembro)}
            className="h-11 appearance-none rounded-full border border-black/10 bg-black/[0.04] pl-9 pr-4 font-sans text-sm font-semibold text-creme outline-none transition-colors hover:border-black/25 focus-visible:border-laranja"
          >
            {PAPEIS_DE_MEMBRO.map((p) => (
              <option key={p} value={p} className="bg-grafite-alto">
                {NOME_PAPEL[p]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={tirar}
          onBlur={() => setAConfirmar(false)}
          disabled={ocupado}
          aria-label={aConfirmar ? `Confirmar: tirar ${nome} da equipa` : `Tirar ${nome} da equipa`}
          className={cn(
            'flex h-11 items-center justify-center gap-2 rounded-full px-3.5 font-sans text-sm font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja',
            aConfirmar
              ? 'bg-[#ff8a78]/15 text-[#ff8a78]'
              : 'w-11 px-0 text-tenue hover:bg-black/[0.06] hover:text-creme',
          )}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {aConfirmar ? 'Tirar?' : null}
        </button>
      </div>
    </li>
  );
}
