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
 * E não toca uma vez: insiste enquanto houver pedidos por confirmar.
 * Um toque único perde-se — se ninguém estava perto naquele segundo, o
 * pedido fica esquecido e o cliente fica à espera sem saber de quê. O
 * barulho só pára quando alguém pega no pedido e o põe a preparar, que
 * é a prova de que foi visto por uma pessoa.
 *
 * Não desenha nada.
 */

/** De quanto em quanto tempo volta a tocar enquanto houver por confirmar. */
const INSISTENCIA = 4000;

export function SinoDePedidos({ restauranteId }: { restauranteId: string }) {
  /**
   * Os pedidos que ainda ninguém confirmou.
   *
   * Guardados por id, e não contados: o Realtime pode repetir o mesmo
   * evento, e um contador subiria duas vezes pelo mesmo pedido e ficava
   * a tocar para sempre.
   */
  const porConfirmar = React.useRef<Set<string>>(new Set());
  const [aToar, setAToar] = React.useState(false);

  function actualizar() {
    setAToar(porConfirmar.current.size > 0);
  }

  /* ---------------------------------------------------------------- */
  /* Quem está por confirmar, agora                                    */
  /* ---------------------------------------------------------------- */
  React.useEffect(() => {
    const supabase = clienteNavegador();
    if (!supabase) return;

    let vivo = true;

    // Quem entra no painel a meio do serviço tem de ouvir os pedidos que
    // já lá estavam à espera, não só os que caírem daqui para a frente.
    void supabase
      .from('orders')
      .select('id')
      .eq('restaurant_id', restauranteId)
      .eq('estado', 'novo')
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
          // Sair de "novo" é a prova de que uma pessoa o viu.
          if (pedido.estado === 'novo') porConfirmar.current.add(pedido.id);
          else porConfirmar.current.delete(pedido.id);
          actualizar();
        },
      )
      .subscribe();

    return () => {
      vivo = false;
      supabase.removeChannel(canal);
    };
  }, [restauranteId]);

  /* ---------------------------------------------------------------- */
  /* A insistência                                                     */
  /* ---------------------------------------------------------------- */
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
