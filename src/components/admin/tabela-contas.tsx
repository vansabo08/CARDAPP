'use client';

import * as React from 'react';
import { Distintivo } from '@/components/ui/distintivo';
import { Interruptor } from '@/components/ui/interruptor';
import { Campo } from '@/components/ui/campo';
import { cn } from '@/lib/utils';
import { NOME_PLANO, type Plano } from '@/lib/tipos';
import { PLANOS as CONFIG_PLANOS, estadoDaConta, linkDePagamento, type EstadoConta } from '@/lib/planos';
import { formatarKz } from '@/lib/format';
import type { ContaAdmin } from '@/lib/admin';
import { alternarActivo, mudarPlano } from '@/app/admin/accoes';

const PLANOS: Plano[] = ['mesa', 'sala'];

const ROTULO_ESTADO: Record<EstadoConta, string> = {
  activa: '',
  a_expirar: 'a acabar',
  cortesia: 'em cortesia',
  expirada: 'fora do ar',
};

const COR_ESTADO: Record<EstadoConta, string> = {
  activa: 'text-creme',
  a_expirar: 'text-ouro',
  cortesia: 'text-ouro',
  expirada: 'text-[#e0655a]',
};

function rotuloDoEstado(e: EstadoConta) {
  return ROTULO_ESTADO[e];
}

function corDoEstado(e: EstadoConta) {
  return COR_ESTADO[e];
}

/**
 * O recado pronto a enviar à casa que está a chegar ao fim.
 *
 * Vai com o nome, o prazo, o preço e o endereço de pagamento — tudo o
 * que a pessoa do outro lado precisa para decidir sem responder a
 * perguntar.
 */
function avisoPorWhatsApp(conta: ContaAdmin) {
  const plano = CONFIG_PLANOS[conta.plano];
  const estado = estadoDaConta(conta.acessoExpiraEm);

  const abertura =
    estado === 'expirada'
      ? `O cardápio do ${conta.nome} saiu do ar.`
      : estado === 'cortesia'
        ? `O prazo do Cardapp do ${conta.nome} acabou — o cardápio ainda serve, mas por pouco tempo.`
        : `O Cardapp do ${conta.nome} está a chegar ao fim.`;

  const recado = [
    abertura,
    `O plano ${plano.nome} custa ${formatarKz(plano.preco)} e dá mais ${plano.dias} dias.`,
    `Renovar aqui: ${linkDePagamento(conta.plano)}`,
  ].join('\n\n');

  return `https://wa.me/${conta.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(recado)}`;
}

function dataCurta(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    timeZone: 'Africa/Luanda',
  }).format(d);
}

/** "há 3 dias" diz mais do que uma data quando se procura quem sumiu. */
function haQuantoTempo(iso: string | null) {
  if (!iso) return 'nunca entrou';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';

  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`;
}

export function TabelaContas({ contas }: { contas: ContaAdmin[] }) {
  const [procura, setProcura] = React.useState('');
  const [estado, setEstado] = React.useState<Record<string, ContaAdmin>>(
    () => Object.fromEntries(contas.map((c) => [c.id, c])),
  );
  const [ocupado, setOcupado] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEstado(Object.fromEntries(contas.map((c) => [c.id, c])));
  }, [contas]);

  const lista = Object.values(estado);
  const termo = procura.trim().toLowerCase();
  const filtradas = termo
    ? lista.filter((c) =>
        [c.nome, c.slug, c.email ?? ''].some((campo) => campo.toLowerCase().includes(termo)),
      )
    : lista;

  async function comEstado(id: string, accao: () => Promise<{ ok: boolean; erro?: string }>) {
    setOcupado(id);
    setErro(null);
    const r = await accao();
    setOcupado(null);
    if (!r.ok) setErro(r.erro ?? 'Não foi possível guardar.');
    return r.ok;
  }

  async function trocarActivo(conta: ContaAdmin, activo: boolean) {
    // Optimista, com recuo se o servidor recusar.
    setEstado((e) => ({ ...e, [conta.id]: { ...e[conta.id], activo } }));
    const ok = await comEstado(conta.id, () => alternarActivo(conta.id, activo));
    if (!ok) setEstado((e) => ({ ...e, [conta.id]: { ...e[conta.id], activo: !activo } }));
  }

  async function trocarPlano(conta: ContaAdmin, plano: Plano) {
    const anterior = conta.plano;
    setEstado((e) => ({ ...e, [conta.id]: { ...e[conta.id], plano } }));
    const ok = await comEstado(conta.id, () => mudarPlano(conta.id, plano));
    if (!ok) setEstado((e) => ({ ...e, [conta.id]: { ...e[conta.id], plano: anterior } }));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Campo
          value={procura}
          onChange={(e) => setProcura(e.target.value)}
          placeholder="Procurar por nome, endereço ou email"
          aria-label="Procurar conta"
          className="w-full sm:w-[340px]"
        />
        <span className="font-sans text-xs text-tenue">
          {filtradas.length} de {lista.length}
        </span>
      </div>

      {erro ? <p className="mt-4 font-sans text-xs text-[#e0655a]">{erro}</p> : null}

      <div className="mt-6 flex flex-col gap-3">
        {filtradas.map((conta) => (
          <article
            key={conta.id}
            className={cn(
              'vidro rounded-cartao p-5 transition-opacity duration-200',
              ocupado === conta.id && 'opacity-60',
              !conta.activo && 'opacity-70',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-display text-xl text-creme">{conta.nome}</h3>
                  {!conta.activo ? <Distintivo tom="linha">Desligado</Distintivo> : null}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs text-tenue">
                  <a
                    href={`/${conta.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4 transition-colors hover:text-creme"
                  >
                    /{conta.slug}
                  </a>
                  <span aria-hidden>·</span>
                  <span className="truncate">{conta.email ?? 'email desconhecido'}</span>
                </div>
              </div>

              <label className="flex shrink-0 items-center gap-2.5">
                <span className="font-sans text-xs text-tenue">
                  {conta.activo ? 'No ar' : 'Fora do ar'}
                </span>
                <Interruptor
                  checked={conta.activo}
                  disabled={ocupado === conta.id}
                  onCheckedChange={(v) => trocarActivo(conta, v)}
                  aria-label={`${conta.nome} no ar`}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-5 border-t border-linha pt-5">
              <dl className="flex flex-wrap gap-x-8 gap-y-3">
                <Numero rotulo="Mesas" valor={conta.mesas} />
                <Numero rotulo="Pratos" valor={conta.pratos} />
                <Numero rotulo="Pedidos (30 d)" valor={conta.pedidos30Dias} />
                <div>
                  <dt className="etiqueta text-tenue">Última entrada</dt>
                  <dd className="mt-1 font-sans text-sm text-creme">
                    {haQuantoTempo(conta.ultimaEntrada)}
                  </dd>
                </div>
                <div>
                  <dt className="etiqueta text-tenue">Desde</dt>
                  <dd className="mt-1 font-sans text-sm text-creme">
                    {dataCurta(conta.criadoEm)}
                  </dd>
                </div>
                <div>
                  <dt className="etiqueta text-tenue">Acesso até</dt>
                  <dd className="mt-1 font-sans text-sm">
                    <span className={corDoEstado(estadoDaConta(conta.acessoExpiraEm))}>
                      {conta.acessoExpiraEm ? dataCurta(conta.acessoExpiraEm) : '—'}
                    </span>
                    {conta.acessoExpiraEm ? (
                      <span className="ml-2 text-tenue">
                        {rotuloDoEstado(estadoDaConta(conta.acessoExpiraEm))}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>

              {/*
                Enquanto a Resend não estiver ligada, os avisos saem daqui
                à mão. O recado vai pronto — quem tem de avisar dez casas
                não vai escrever dez vezes a mesma coisa, e acaba por não
                avisar nenhuma.
              */}
              {estadoDaConta(conta.acessoExpiraEm) !== 'activa' ? (
                <a
                  href={avisoPorWhatsApp(conta)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-verde/40 px-3.5 py-1.5 font-sans text-xs font-semibold text-verde transition-colors duration-rapida ease-assinatura hover:bg-verde/[0.08]"
                >
                  Avisar por WhatsApp
                </a>
              ) : null}

              <div className="flex items-center gap-1 rounded-full border border-linha p-1">
                {PLANOS.map((plano) => (
                  <button
                    key={plano}
                    type="button"
                    disabled={ocupado === conta.id}
                    onClick={() => trocarPlano(conta, plano)}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 font-sans text-xs font-semibold transition-colors duration-200',
                      conta.plano === plano
                        ? 'bg-ouro text-grafite'
                        : 'text-tenue hover:text-creme disabled:pointer-events-none',
                    )}
                  >
                    {NOME_PLANO[plano]}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      {!filtradas.length ? (
        <p className="vidro mt-6 rounded-cartao px-6 py-14 text-center font-sans text-sm text-tenue">
          {lista.length ? 'Nada corresponde a essa procura.' : 'Ainda não há contas registadas.'}
        </p>
      ) : null}
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div>
      <dt className="etiqueta text-tenue">{rotulo}</dt>
      <dd className="mt-1 font-sans text-lg font-bold tabular-nums text-creme">{valor}</dd>
    </div>
  );
}
