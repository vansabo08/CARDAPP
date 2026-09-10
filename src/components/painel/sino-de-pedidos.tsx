'use client';

import * as React from 'react';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { formatarKz } from '@/lib/format';
import { avisarDoPedido, ligarSomAoPrimeiroGesto, tocarSino } from '@/lib/som';
import type { Pedido } from '@/lib/tipos';

/**
 * O sino, montado no painel inteiro e não só no ecrã dos pedidos.
 *
 * Estava dentro da lista de pedidos, o que queria dizer que a casa só
 * era avisada se estivesse com essa página aberta. Quem estivesse a
 * mexer no cardápio, nas mesas ou no resumo — que é onde se passa metade
 * do tempo — não ouvia nada. Um aviso que só toca quando já se está a
 * olhar para o sítio não é um aviso.
 *
 * Não desenha nada. Só escuta, toca e, se o separador estiver atrás de
 * outro, deixa um aviso do sistema.
 */
export function SinoDePedidos({ restauranteId }: { restauranteId: string }) {
  React.useEffect(() => {
    const supabase = clienteNavegador();
    if (!supabase) return;

    // Nome próprio: a lista de pedidos tem o seu canal, e dois canais com
    // o mesmo nome no mesmo cliente entram em conflito.
    const canal = supabase
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
          void tocarSino();

          if (document.hidden) {
            avisarDoPedido(null, formatarKz(Number(pedido.total) || 0));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [restauranteId]);

  // O primeiro toque em qualquer sítio do painel serve de gesto e
  // desbloqueia o áudio para o resto da sessão.
  React.useEffect(() => ligarSomAoPrimeiroGesto(() => {}), []);

  return null;
}
