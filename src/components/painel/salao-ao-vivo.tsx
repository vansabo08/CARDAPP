'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BellRing,
  Check,
  CircleDashed,
  Clock3,
  ReceiptText,
  SprayCan,
  UtensilsCrossed,
} from 'lucide-react';
import { Botao } from '@/components/ui/botao';
import { FolhaInferior } from '@/components/ui/folha-inferior';
import {
  abrirMesa,
  atenderAlerta,
  fecharConta,
  mesaLimpa,
  mudarEstadoDaMesa,
  type ContaFechada,
} from '@/app/painel/salao/accoes';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { formatarKz } from '@/lib/format';
import { haQuantoTempo } from '@/lib/salao';
import type { EstadoMesa, MesaNoSalao } from '@/lib/tipos';
import { descreverOpcoes } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

/**
 * O salão, mesa a mesa, ao vivo.
 *
 * Cada estado tem cor E ícone E nome. A cor é o que se lê do outro lado
 * da sala; o nome é para quem não distingue as cores — e há sempre
 * alguém na equipa que não distingue.
 */

export const ESTADOS: Record<
  EstadoMesa,
  { nome: string; Icone: typeof Check; cartao: string; texto: string; ponto: string }
> = {
  livre: {
    nome: 'Livre',
    Icone: CircleDashed,
    cartao: 'border-black/[0.06] bg-black/[0.02]',
    texto: 'text-tenue',
    ponto: 'bg-black/30',
  },
  aberta: {
    nome: 'Ocupada',
    Icone: UtensilsCrossed,
    cartao: 'border-laranja/35 bg-laranja/5',
    texto: 'text-laranja',
    ponto: 'bg-laranja',
  },
  conta_pedida: {
    nome: 'Conta pedida',
    Icone: ReceiptText,
    cartao: 'border-[#fab219]/50 bg-[#fab219]/[0.07]',
    texto: 'text-[#fab219]',
    ponto: 'bg-[#fab219]',
  },
  a_limpar: {
    nome: 'A limpar',
    Icone: SprayCan,
    cartao: 'border-[#7fb2ff]/40 bg-[#7fb2ff]/[0.06]',
    texto: 'text-[#9cc3ff]',
    ponto: 'bg-[#7fb2ff]',
  },
};

const ORDEM: EstadoMesa[] = ['aberta', 'conta_pedida', 'a_limpar', 'livre'];

/**
 * Um relógio que avança de meio em meio minuto, para o "há X min".
 *
 * Começa na hora do servidor, e não na do browser: se começasse no
 * `Date.now()` daqui, um minuto a virar entre o desenho no servidor e o
 * arranque no browser dava "há 4 min" num e "há 5 min" no outro — e o
 * React deitava o ecrã abaixo por não baterem certo.
 */
function useAgora(inicial: number, intervalo = 30_000) {
  const [agora, setAgora] = React.useState(inicial);
  React.useEffect(() => {
    const relogio = window.setInterval(() => setAgora(Date.now()), intervalo);
    return () => window.clearInterval(relogio);
  }, [intervalo]);
  return agora;
}

/**
 * Ouve as três tabelas do salão e manda o servidor redesenhar.
 *
 * Redesenha em vez de remendar o estado aqui: a conta de uma mesa depende
 * de pedidos, sessões e alertas ao mesmo tempo, e remendar três fontes à
 * mão é como se acaba com uma mesa a mostrar um total que já não é.
 * Junta os eventos de 400 ms num só — um pedido com a sessão a abrir são
 * dois eventos seguidos, e não é preciso desenhar duas vezes.
 */
function useSalaoAoVivo(restauranteId: string, ligado: boolean) {
  const router = useRouter();

  React.useEffect(() => {
    if (!ligado) return;
    const supabase = clienteNavegador();
    if (!supabase) return;

    let pendente: number | undefined;
    const redesenhar = () => {
      window.clearTimeout(pendente);
      pendente = window.setTimeout(() => router.refresh(), 400);
    };

    const filtro = { schema: 'public', filter: `restaurante_id=eq.${restauranteId}` };
    const canal = supabase
      .channel(`salao-${restauranteId}`)
      .on('postgres_changes', { event: '*', table: 'sessoes_mesa', ...filtro }, redesenhar)
      .on('postgres_changes', { event: '*', table: 'alertas', ...filtro }, redesenhar)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restauranteId}` },
        redesenhar,
      )
      .subscribe();

    // O Realtime às vezes perde eventos ao religar. De minuto a minuto
    // vai-se buscar o estado de qualquer maneira.
    const vigia = window.setInterval(() => router.refresh(), 60_000);

    return () => {
      window.clearTimeout(pendente);
      window.clearInterval(vigia);
      void supabase.removeChannel(canal);
    };
  }, [restauranteId, ligado, router]);
}

export function SalaoAoVivo({
  mesas,
  restauranteId,
  demonstracao,
  agoraDoServidor,
}: {
  mesas: MesaNoSalao[];
  restauranteId: string;
  demonstracao: boolean;
  agoraDoServidor: number;
}) {
  const agora = useAgora(agoraDoServidor);
  useSalaoAoVivo(restauranteId, !demonstracao);
  const [abertaId, setAbertaId] = React.useState<string | null>(null);
  const aberta = mesas.find((m) => m.id === abertaId) ?? null;

  const contagem = React.useMemo(() => {
    const c: Record<EstadoMesa, number> = { livre: 0, aberta: 0, conta_pedida: 0, a_limpar: 0 };
    for (const m of mesas) c[m.estado] += 1;
    return c;
  }, [mesas]);

  // O que ainda está por cobrar: mesas ocupadas ou à espera da conta.
  // As que estão a limpar já pagaram.
  const emCurso = mesas
    .filter((m) => m.estado === 'aberta' || m.estado === 'conta_pedida')
    .reduce((s, m) => s + m.total, 0);

  if (mesas.length === 0) {
    return (
      <div className="mt-8 rounded-cartao border border-dashed border-black/10 px-6 py-14 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.05] text-tenue">
          <UtensilsCrossed className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-5 font-display text-xl text-creme">Ainda não há mesas.</p>
        <p className="mx-auto mt-2 max-w-[40ch] font-sans text-sm leading-normal text-tenue">
          Crie as mesas e imprima os QR. Assim que chegar o primeiro pedido, a mesa acende aqui.
        </p>
        <Botao asChild variante="laranja" tamanho="md" className="mt-6">
          <Link href="/painel/mesas">Criar as mesas</Link>
        </Botao>
      </div>
    );
  }

  return (
    <>
      {/* O salão num relance: quantas em cada estado, e o que está a correr. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {ORDEM.map((estado) => {
          const { nome, Icone, texto } = ESTADOS[estado];
          return (
            <span
              key={estado}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.07] bg-black/[0.03] px-3.5 font-sans text-sm"
            >
              <Icone className={cn('h-4 w-4', texto)} aria-hidden />
              <span className="font-semibold tabular-nums text-creme">{contagem[estado]}</span>
              <span className="text-tenue">{nome.toLowerCase()}</span>
            </span>
          );
        })}
        <span className="ml-auto font-sans text-sm text-tenue">
          Em curso <span className="font-semibold text-creme">{formatarKz(emCurso)}</span>
        </span>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {mesas.map((mesa) => (
          <li key={mesa.id}>
            <CartaoMesa mesa={mesa} agora={agora} aoAbrir={() => setAbertaId(mesa.id)} />
          </li>
        ))}
      </ul>

      <DetalheMesa
        mesa={aberta}
        agora={agora}
        demonstracao={demonstracao}
        aoFechar={() => setAbertaId(null)}
      />
    </>
  );
}

function CartaoMesa({
  mesa,
  agora,
  aoAbrir,
}: {
  mesa: MesaNoSalao;
  agora: number;
  aoAbrir: () => void;
}) {
  const estilo = ESTADOS[mesa.estado];
  const chama = mesa.alertas.find((a) => a.tipo === 'empregado');
  const conta = mesa.alertas.find((a) => a.tipo === 'conta');
  const chamada = conta ?? chama;

  return (
    <button
      type="button"
      onClick={aoAbrir}
      aria-label={`Mesa ${mesa.numero}, ${estilo.nome}${chamada ? ', a chamar' : ''}`}
      className={cn(
        'relative flex min-h-[132px] w-full flex-col rounded-cartao border p-4 text-left transition-[transform,border-color] duration-200 ease-assinatura',
        'hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja',
        estilo.cartao,
        chamada && 'border-laranja ring-2 ring-laranja/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-3xl leading-none text-creme">{mesa.numero}</span>
        {chamada ? (
          <span className="relative inline-flex items-center gap-1 rounded-full bg-laranja px-2 py-1 font-sans text-xs font-bold text-creme">
            {/* A pulsação diz "agora" sem ninguém ter de ler a hora. */}
            <span className="absolute inset-0 animate-ping rounded-full bg-laranja/60 motion-reduce:hidden" aria-hidden />
            <BellRing className="relative h-3 w-3" aria-hidden />
            <span className="relative">{conta ? 'Conta' : 'Chama'}</span>
          </span>
        ) : null}
      </div>

      <span className={cn('mt-2 inline-flex items-center gap-1.5 font-sans text-xs font-semibold', estilo.texto)}>
        <estilo.Icone className="h-3.5 w-3.5" aria-hidden />
        {estilo.nome}
      </span>

      {mesa.sessao ? (
        <span className="mt-auto pt-3">
          <span className="block font-sans text-base font-bold tabular-nums text-creme">
            {formatarKz(mesa.estado === 'a_limpar' ? (mesa.sessao.total_fecho ?? mesa.total) : mesa.total)}
          </span>
          <span className="mt-0.5 flex items-center gap-1 font-sans text-xs text-tenue">
            <Clock3 className="h-3 w-3" aria-hidden />
            {haQuantoTempo(mesa.sessao.aberta_em, agora)}
            {mesa.pedidos.length ? ` · ${mesa.pedidos.length} ${mesa.pedidos.length === 1 ? 'pedido' : 'pedidos'}` : ''}
          </span>
        </span>
      ) : null}
    </button>
  );
}

function DetalheMesa({
  mesa,
  agora,
  demonstracao,
  aoFechar,
}: {
  mesa: MesaNoSalao | null;
  agora: number;
  demonstracao: boolean;
  aoFechar: () => void;
}) {
  const [ocupado, iniciar] = React.useTransition();
  const [erro, setErro] = React.useState<string | null>(null);
  const [conta, setConta] = React.useState<ContaFechada | null>(null);

  // Mesa diferente, folha limpa.
  React.useEffect(() => {
    setErro(null);
    setConta(null);
  }, [mesa?.id]);

  if (!mesa) return null;
  const estilo = ESTADOS[mesa.estado];
  const sessao = mesa.sessao;

  function correr(accao: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await accao();
      if (!r.ok) setErro(r.erro ?? 'Não foi possível.');
    });
  }

  function fechar() {
    if (!sessao) return;
    setErro(null);
    iniciar(async () => {
      const r = await fecharConta({ sessaoId: sessao.id });
      if (r.ok) setConta(r.dados);
      else setErro(r.erro);
    });
  }

  return (
    <FolhaInferior aberta aoFechar={aoFechar} titulo={`Mesa ${mesa.numero}`} claro={false}>
      <div className="flex min-h-0 flex-col overflow-y-auto px-5 pb-7 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl text-creme">Mesa {mesa.numero}</h2>
            <p className={cn('mt-1 inline-flex items-center gap-1.5 font-sans text-sm font-semibold', estilo.texto)}>
              <estilo.Icone className="h-4 w-4" aria-hidden />
              {estilo.nome}
              {sessao ? (
                <span className="font-normal text-tenue">· aberta {haQuantoTempo(sessao.aberta_em, agora)}</span>
              ) : null}
            </p>
          </div>
          {sessao ? (
            <p className="text-right">
              <span className="block font-sans text-xs text-tenue">Total</span>
              <span className="font-display text-2xl tabular-nums text-creme">
                {formatarKz(conta?.total ?? sessao.total_fecho ?? mesa.total)}
              </span>
            </p>
          ) : null}
        </div>

        {mesa.alertas.length ? (
          <ul className="mt-5 flex flex-col gap-2">
            {mesa.alertas.map((alerta) => (
              <li
                key={alerta.id}
                className="flex items-center gap-3 rounded-campo border border-laranja/40 bg-laranja/10 px-3.5 py-2.5"
              >
                <BellRing className="h-4 w-4 shrink-0 text-laranja" aria-hidden />
                <span className="min-w-0 flex-1 font-sans text-sm text-creme">
                  {alerta.tipo === 'conta' ? 'Pediu a conta' : 'Chama o empregado'}
                  <span className="text-tenue"> · {haQuantoTempo(alerta.criado_em, agora)}</span>
                </span>
                <Botao
                  variante="laranja"
                  tamanho="md"
                  disabled={ocupado || demonstracao}
                  onClick={() => correr(() => atenderAlerta({ id: alerta.id }))}
                >
                  Atendido
                </Botao>
              </li>
            ))}
          </ul>
        ) : null}

        {conta ? (
          <ContaDaMesa conta={conta} />
        ) : mesa.pedidos.length ? (
          <section className="mt-6">
            <h3 className="font-sans text-sm font-semibold text-creme/85">Pedidos desta mesa</h3>
            <ul className="mt-3 flex flex-col divide-y divide-black/[0.06] rounded-cartao border border-black/[0.06]">
              {mesa.pedidos.map((pedido) => (
                <li key={pedido.id} className={cn('px-4 py-3', pedido.estado === 'cancelado' && 'opacity-45')}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-sans text-xs text-tenue">
                      {haQuantoTempo(pedido.created_at, agora)}
                      {pedido.estado === 'cancelado' ? ' · cancelado' : ''}
                    </span>
                    <span className="font-sans text-sm font-semibold tabular-nums text-creme">
                      {formatarKz(pedido.total)}
                    </span>
                  </div>
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {pedido.itens.map((item, i) => (
                      <li key={i} className="font-sans text-sm text-creme/90">
                        <span className="tabular-nums text-tenue">{item.qtd} ×</span> {item.nome}
                        {descreverOpcoes(item).map((texto) => (
                          <span key={texto} className="block pl-5 text-xs text-creme/70">
                            {texto}
                          </span>
                        ))}
                        {item.obs ? <span className="block pl-5 text-xs text-tenue">↳ {item.obs}</span> : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ) : sessao ? (
          <p className="mt-6 font-sans text-sm text-tenue">Ainda não há pedidos nesta mesa.</p>
        ) : (
          <p className="mt-6 font-sans text-sm text-tenue">
            A mesa abre sozinha com o primeiro pedido pelo cardápio. Se o cliente pediu de viva voz,
            abra-a aqui.
          </p>
        )}

        {erro ? (
          <p role="alert" className="mt-4 font-sans text-sm text-[#ff8a78]">
            {erro}
          </p>
        ) : null}
        {demonstracao ? (
          <p className="mt-4 font-sans text-xs text-tenue">Na demonstração as mesas não mudam.</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2.5">
          {mesa.estado === 'livre' ? (
            <Botao
              variante="laranja"
              tamanho="lg"
              largo
              aCarregar={ocupado}
              disabled={demonstracao}
              onClick={() => correr(() => abrirMesa({ mesaId: mesa.id }))}
            >
              Abrir mesa
            </Botao>
          ) : null}

          {sessao && (mesa.estado === 'aberta' || mesa.estado === 'conta_pedida') && !conta ? (
            <>
              <Botao variante="laranja" tamanho="lg" largo aCarregar={ocupado} disabled={demonstracao} onClick={fechar}>
                Fechar conta · {formatarKz(mesa.total)}
              </Botao>
              {mesa.estado === 'aberta' ? (
                <Botao
                  variante="contorno"
                  tamanho="md"
                  largo
                  disabled={ocupado || demonstracao}
                  onClick={() => correr(() => mudarEstadoDaMesa({ sessaoId: sessao.id, estado: 'conta_pedida' }))}
                >
                  Marcar conta pedida
                </Botao>
              ) : (
                <Botao
                  variante="contorno"
                  tamanho="md"
                  largo
                  disabled={ocupado || demonstracao}
                  onClick={() => correr(() => mudarEstadoDaMesa({ sessaoId: sessao.id, estado: 'aberta' }))}
                >
                  Voltar a ocupada
                </Botao>
              )}
            </>
          ) : null}

          {sessao && (mesa.estado === 'a_limpar' || conta) ? (
            <Botao
              variante="laranja"
              tamanho="lg"
              largo
              aCarregar={ocupado}
              disabled={demonstracao}
              onClick={() =>
                correr(async () => {
                  const r = await mesaLimpa({ sessaoId: sessao.id });
                  if (r.ok) aoFechar();
                  return r;
                })
              }
            >
              Mesa limpa — fica livre
            </Botao>
          ) : null}
        </div>
      </div>
    </FolhaInferior>
  );
}

/** A conta, pronta a mostrar ao cliente ou a ditar ao caixa. */
function ContaDaMesa({ conta }: { conta: ContaFechada }) {
  return (
    <section className="mt-6 rounded-cartao border border-verde/30 bg-verde/[0.06] p-4">
      <p className="flex items-center gap-2 font-sans text-sm font-semibold text-creme">
        <Check className="h-4 w-4 text-verde" aria-hidden />
        Conta fechada · {conta.pedidos} {conta.pedidos === 1 ? 'pedido' : 'pedidos'}
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {conta.linhas.map((linha, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 font-sans text-sm">
            <span className="min-w-0 text-creme/90">
              <span className="tabular-nums text-tenue">{linha.qtd} ×</span> {linha.nome}
              {linha.obs ? <span className="text-xs text-tenue"> ({linha.obs})</span> : null}
            </span>
            <span className="shrink-0 tabular-nums text-creme">{formatarKz(linha.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-baseline justify-between border-t border-black/10 pt-3">
        <span className="font-sans text-sm font-semibold text-creme">Total</span>
        <span className="font-display text-2xl tabular-nums text-creme">{formatarKz(conta.total)}</span>
      </div>
    </section>
  );
}
