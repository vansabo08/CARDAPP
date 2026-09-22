'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, m } from 'motion/react';
import { BellRing, ReceiptText } from 'lucide-react';
import { ProvedorDeMovimento, MOLA } from '@/components/cardapio/movimento';
import { atenderAlerta } from '@/app/painel/salao/accoes';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { haQuantoTempo } from '@/lib/salao';
import { avisarDaChamada, tocarChamada } from '@/lib/som';
import type { AlertaMesa, TipoAlerta } from '@/lib/tipos';
import { cn } from '@/lib/utils';

/**
 * As chamadas das mesas, em qualquer página do painel.
 *
 * Quem anda na sala não está a olhar para o ecrã do salão: está no
 * cardápio a pôr um prato como esgotado, ou nos pedidos. A chamada tem
 * de o apanhar onde estiver — um cartão em cima, a pulsar, com um toque
 * suave — e ficar lá até alguém carregar em "Atendido".
 *
 * Os cartões vêm da base, e não só do Realtime: ao abrir o painel vão-se
 * buscar as chamadas por atender, e de meio em meio minuto outra vez. O
 * Realtime avisa depressa; a leitura garante que nada fica esquecido
 * por um evento que se perdeu ao religar.
 */

type LinhaAlerta = { id: string; mesa_id: string; tipo: TipoAlerta; criado_em: string; atendido_em: string | null };

const VIGIA = 30_000;
const VISIVEIS = 3;

export function AlertasDaSala({ restauranteId }: { restauranteId: string }) {
  const [alertas, setAlertas] = React.useState<AlertaMesa[]>([]);
  const [agora, setAgora] = React.useState(0);
  const numeros = React.useRef<Map<string, number>>(new Map());
  const conhecidos = React.useRef<Set<string>>(new Set());
  const primeiraLeitura = React.useRef(true);

  const juntar = React.useCallback((linhas: LinhaAlerta[], tocar: boolean) => {
    const pendentes = linhas
      .filter((l) => !l.atendido_em)
      .map((l) => ({ ...l, mesa: numeros.current.get(l.mesa_id) ?? 0 }));

    const novos = pendentes.filter((a) => !conhecidos.current.has(a.id));
    for (const a of pendentes) conhecidos.current.add(a.id);

    if (tocar && novos.length) {
      void tocarChamada();
      for (const a of novos) avisarDaChamada(a.mesa, a.tipo);
    }
    return pendentes;
  }, []);

  React.useEffect(() => {
    const supabase = clienteNavegador();
    if (!supabase) return;
    let vivo = true;

    async function ler() {
      if (!supabase) return;
      if (!numeros.current.size) {
        const { data: mesas } = await supabase
          .from('tables')
          .select('id, numero')
          .eq('restaurant_id', restauranteId);
        for (const m of (mesas ?? []) as { id: string; numero: number }[]) numeros.current.set(m.id, m.numero);
      }

      const { data } = await supabase
        .from('alertas')
        .select('id, mesa_id, tipo, criado_em, atendido_em')
        .eq('restaurante_id', restauranteId)
        .is('atendido_em', null)
        .gte('criado_em', new Date(Date.now() - 12 * 3_600_000).toISOString())
        .order('criado_em', { ascending: true });

      if (!vivo) return;
      // Na primeira leitura não se toca: são chamadas que já estavam lá
      // antes de a página abrir, não chamadas novas.
      const pendentes = juntar((data ?? []) as LinhaAlerta[], !primeiraLeitura.current);
      primeiraLeitura.current = false;
      setAlertas(pendentes);
      setAgora(Date.now());
    }

    void ler();

    const canal = supabase
      .channel(`alertas-${restauranteId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alertas', filter: `restaurante_id=eq.${restauranteId}` },
        () => void ler(),
      )
      .subscribe();

    const vigia = window.setInterval(() => void ler(), VIGIA);
    const relogio = window.setInterval(() => setAgora(Date.now()), 30_000);

    return () => {
      vivo = false;
      window.clearInterval(vigia);
      window.clearInterval(relogio);
      void supabase.removeChannel(canal);
    };
  }, [restauranteId, juntar]);

  async function atender(id: string) {
    // Sai já do ecrã; se a base recusar, volta na próxima leitura.
    setAlertas((a) => a.filter((x) => x.id !== id));
    await atenderAlerta({ id });
  }

  const visiveis = alertas.slice(-VISIVEIS).reverse();
  const escondidos = alertas.length - visiveis.length;

  return (
    <ProvedorDeMovimento>
      <div
        className="pointer-events-none fixed inset-x-3 top-3 z-[65] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:w-[340px]"
        aria-live="assertive"
        aria-relevant="additions"
      >
        <AnimatePresence initial={false}>
          {visiveis.map((alerta) => (
            <m.div
              key={alerta.id}
              initial={{ opacity: 0, y: -18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={MOLA}
              className="pointer-events-auto"
            >
              <CartaoAlerta alerta={alerta} agora={agora} aoAtender={() => atender(alerta.id)} />
            </m.div>
          ))}
        </AnimatePresence>
        {escondidos > 0 ? (
          <Link
            href="/painel/salao"
            className="pointer-events-auto self-end rounded-full bg-grafite-carta px-3.5 py-2 font-sans text-xs font-semibold text-creme shadow-elevacao-2-escura"
          >
            + {escondidos} {escondidos === 1 ? 'chamada' : 'chamadas'} no salão
          </Link>
        ) : null}
      </div>
    </ProvedorDeMovimento>
  );
}

function CartaoAlerta({
  alerta,
  agora,
  aoAtender,
}: {
  alerta: AlertaMesa;
  agora: number;
  aoAtender: () => void;
}) {
  const conta = alerta.tipo === 'conta';
  const Icone = conta ? ReceiptText : BellRing;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 rounded-cartao border bg-grafite-alto p-3 shadow-elevacao-3-escura',
        conta ? 'border-[#fab219]/60' : 'border-laranja/60',
      )}
    >
      <span
        className={cn(
          'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
          conta ? 'bg-[#fab219] text-grafite' : 'bg-laranja text-grafite',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 animate-ping rounded-full motion-reduce:hidden',
            conta ? 'bg-[#fab219]/50' : 'bg-laranja/50',
          )}
        />
        <Icone className="relative h-5 w-5" aria-hidden />
      </span>

      <Link href="/painel/salao" className="min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja">
        <span className="block font-sans text-sm font-bold text-creme">Mesa {alerta.mesa || '—'}</span>
        <span className="block truncate font-sans text-xs text-tenue">
          {conta ? 'Pediu a conta' : 'Chama o empregado'}
          {agora ? ` · ${haQuantoTempo(alerta.criado_em, agora)}` : ''}
        </span>
      </Link>

      <button
        type="button"
        onClick={aoAtender}
        className="h-11 shrink-0 rounded-full bg-white/[0.08] px-4 font-sans text-sm font-semibold text-creme transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja"
      >
        Atendido
      </button>
    </div>
  );
}
