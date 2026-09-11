'use client';

import * as React from 'react';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { formatarKz } from '@/lib/format';
import { avisarDoPedido, ligarSomAoPrimeiroGesto, tocarSino } from '@/lib/som';
import { aoVerPedido } from '@/lib/sinal-do-pedido';
import { decidirPorConfirmar } from '@/lib/decisao-do-sino';
import type { Pedido } from '@/lib/tipos';

/**
 * O sino, montado no painel inteiro e não só no ecrã dos pedidos.
 *
 * Toca em qualquer página do painel: quem está a mexer no cardápio ou
 * nas mesas — que é onde se passa metade do tempo — também tem de ouvir.
 *
 * E insiste enquanto houver pedidos por confirmar. Um toque único
 * perde-se: se ninguém estava perto naquele segundo, o pedido fica
 * esquecido e o cliente à espera sem saber de quê.
 *
 * DUAS COISAS QUE O CALAM, E SÓ ESSAS:
 *
 * Alguém carregar em "Recebido" — que é a confirmação de que uma pessoa
 * viu — ou o pedido avançar de estado, o que implica que alguém o viu.
 *
 * E UMA QUE JÁ O FEZ TOCAR A MAIS:
 *
 * Contava todos os pedidos por confirmar, sem limite de data. Havia
 * pedidos de dias antes que nunca chegaram a ser mexidos, e o alarme
 * tocava por eles todas as manhãs — por serviço que já tinha acabado há
 * muito. Agora só conta os de hoje: um pedido de anteontem não é uma
 * urgência, é histórico.
 */

/** De quanto em quanto tempo volta a tocar enquanto houver por confirmar. */
const INSISTENCIA = 4000;


/**
 * De quanto em quanto tempo se vai à base mesmo com o sino calado.
 *
 * O Realtime também perde pedidos novos, não só confirmações. Um pedido
 * que entra enquanto o canal está a religar-se não faz tocar nada — e um
 * pedido que ninguém ouviu é o pior que este ecrã pode deixar acontecer.
 */
const VIGIA = 30_000;

/**
 * Meia-noite de hoje em Luanda, devolvida em UTC.
 * Angola não muda a hora, por isso o desvio é sempre de uma hora.
 */
function inicioDoDia() {
  const luanda = new Date(Date.now() + 3_600_000);
  const meiaNoite = Date.UTC(luanda.getUTCFullYear(), luanda.getUTCMonth(), luanda.getUTCDate());
  return new Date(meiaNoite - 3_600_000);
}

/** Um pedido só faz o alarme tocar se for de hoje e ninguém o tiver visto. */
function porAtender(pedido: Pick<Pedido, 'created_at' | 'confirmado_em' | 'estado'>) {
  if (pedido.confirmado_em) return false;
  if (pedido.estado !== 'novo') return false;
  return new Date(pedido.created_at) >= inicioDoDia();
}

export function SinoDePedidos({ restauranteId }: { restauranteId: string }) {
  /**
   * Guardados por id, e não contados: o Realtime pode repetir o mesmo
   * evento, e um contador subiria duas vezes pelo mesmo pedido — ficando
   * a tocar para sempre por causa de um pedido só.
   */
  const porConfirmar = React.useRef<Set<string>>(new Set());

  /** Pedidos em que alguém carregou há pouco, e quando. */
  const vistosAgora = React.useRef<Map<string, number>>(new Map());

  const [aToar, setAToar] = React.useState(false);
  const supabase = React.useMemo(() => clienteNavegador(), []);

  const actualizar = React.useCallback(() => {
    setAToar(porConfirmar.current.size > 0);
  }, []);

  /**
   * Ir à base ver o que está mesmo por confirmar.
   *
   * O sino deixou de confiar só no que o Realtime lhe conta. Antes de
   * cada toque pergunta à base, e a base é a verdade: se o pedido foi
   * confirmado noutro telemóvel, se o evento se perdeu com o ecrã
   * apagado, se a confirmação falhou — a resposta é a mesma e é certa.
   *
   * Devolve verdadeiro quando apareceu um pedido que o sino não conhecia,
   * para quem chama poder tocar por ele.
   */
  const ressincronizar = React.useCallback(async () => {
    if (!supabase) return false;

    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('restaurant_id', restauranteId)
      .eq('estado', 'novo')
      .is('confirmado_em', null)
      .gte('created_at', inicioDoDia().toISOString());

    if (!data) return false;

    // A conta vive numa função pura, testada à parte, porque foi numa conta
    // escondida aqui dentro que o defeito do "Recebido" se escondeu.
    const decisao = decidirPorConfirmar(
      (data as { id: string }[]).map((linha) => linha.id),
      porConfirmar.current,
      vistosAgora.current,
      Date.now(),
    );

    porConfirmar.current = decisao.porConfirmar;
    vistosAgora.current = decisao.vistosAgora;
    actualizar();
    return decisao.apareceuNovo;
  }, [supabase, restauranteId, actualizar]);

  /* ---------------------------------------------------------------- */
  /* Caminho 1 — o clique, no mesmo instante                           */
  /* ---------------------------------------------------------------- */
  React.useEffect(
    () =>
      aoVerPedido((id) => {
        vistosAgora.current.set(id, Date.now());
        porConfirmar.current.delete(id);
        actualizar();
      }),
    [actualizar],
  );

  /* ---------------------------------------------------------------- */
  /* Caminho 2 — o Realtime, quando chega                              */
  /* ---------------------------------------------------------------- */
  React.useEffect(() => {
    if (!supabase) return;

    // Quem entra no painel a meio do serviço tem de ouvir os pedidos que
    // já lá estavam à espera — mas só os de hoje.
    void ressincronizar();

    const canal = supabase
      // Nome próprio: a lista de pedidos tem o seu canal, e dois canais
      // com o mesmo nome no mesmo cliente entram em conflito.
      .channel(`sino-${restauranteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restauranteId}`,
        },
        (evento) => {
          const pedido = evento.new as Pedido;
          if (!porAtender(pedido)) return;

          porConfirmar.current.add(pedido.id);
          actualizar();

          void tocarSino();
          if (document.hidden) {
            avisarDoPedido(null, formatarKz(Number(pedido.total) || 0));
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restauranteId}`,
        },
        (evento) => {
          const pedido = evento.new as Pedido;
          // Um pedido em que alguém acabou de carregar não volta a entrar
          // por um evento atrasado que ainda o traz por confirmar.
          if (porAtender(pedido) && !vistosAgora.current.has(pedido.id)) {
            porConfirmar.current.add(pedido.id);
          } else {
            porConfirmar.current.delete(pedido.id);
          }
          actualizar();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, restauranteId, actualizar, ressincronizar]);

  /* ---------------------------------------------------------------- */
  /* Caminho 3 — a base, antes de cada toque                           */
  /* ---------------------------------------------------------------- */
  React.useEffect(() => {
    if (!aToar) return;

    const relogio = setInterval(async () => {
      await ressincronizar();
      // Só toca se, depois de perguntar à base, ainda houver alguém à
      // espera. É isto que impede o toque "a mais" depois do Recebido.
      if (porConfirmar.current.size) void tocarSino();
    }, INSISTENCIA);

    return () => clearInterval(relogio);
  }, [aToar, ressincronizar]);

  /* A vigia: com o sino calado, apanha pedidos que o Realtime perdeu. */
  React.useEffect(() => {
    if (!supabase) return;

    const vigia = setInterval(async () => {
      if (document.hidden) return;
      if (await ressincronizar()) void tocarSino();
    }, VIGIA);

    // Ao voltar ao ecrã vai-se logo à base: foi com o ecrã apagado que os
    // eventos se perderam, e é agora que se descobre.
    const aoVoltar = async () => {
      if (document.hidden) return;
      if (await ressincronizar()) void tocarSino();
    };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      clearInterval(vigia);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [supabase, ressincronizar]);

  // O primeiro toque em qualquer sítio do painel serve de gesto e
  // desbloqueia o áudio para o resto da sessão.
  React.useEffect(() => ligarSomAoPrimeiroGesto(() => {}), []);

  return null;
}
