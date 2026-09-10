'use client';

import * as React from 'react';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { formatarKz } from '@/lib/format';
import { avisarDoPedido, ligarSomAoPrimeiroGesto, tocarSino } from '@/lib/som';
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
  const [aToar, setAToar] = React.useState(false);

  const actualizar = React.useCallback(() => {
    setAToar(porConfirmar.current.size > 0);
  }, []);

  React.useEffect(() => {
    const supabase = clienteNavegador();
    if (!supabase) return;

    let vivo = true;

    // Quem entra no painel a meio do serviço tem de ouvir os pedidos que
    // já lá estavam à espera — mas só os de hoje.
    void supabase
      .from('orders')
      .select('id, created_at, confirmado_em, estado')
      .eq('restaurant_id', restauranteId)
      .eq('estado', 'novo')
      .is('confirmado_em', null)
      .gte('created_at', inicioDoDia().toISOString())
      .then(({ data }) => {
        if (!vivo || !data) return;
        for (const linha of data as { id: string }[]) porConfirmar.current.add(linha.id);
        actualizar();
      });

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
          if (porAtender(pedido)) porConfirmar.current.add(pedido.id);
          else porConfirmar.current.delete(pedido.id);
          actualizar();
        },
      )
      .subscribe();

    return () => {
      vivo = false;
      supabase.removeChannel(canal);
    };
  }, [restauranteId, actualizar]);

  /* A insistência. */
  React.useEffect(() => {
    if (!aToar) return;

    const relogio = setInterval(() => {
      void tocarSino();
    }, INSISTENCIA);

    return () => clearInterval(relogio);
  }, [aToar]);

  // O primeiro toque em qualquer sítio do painel serve de gesto e
  // desbloqueia o áudio para o resto da sessão.
  React.useEffect(() => ligarSomAoPrimeiroGesto(() => {}), []);

  return null;
}
