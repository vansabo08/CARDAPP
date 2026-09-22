'use client';

import * as React from 'react';
import { clienteNavegador } from '@/lib/supabase/cliente';

/**
 * Diz à base que esta casa está a usar o CardApp agora.
 *
 * Serve duas perguntas do painel de administração: quem está a usar isto
 * neste momento, e há quanto tempo uma casa deixou de aparecer. A
 * segunda é a que importa — uma casa que não abre o painel há duas
 * semanas está a caminho de se ir embora, e esse é o único sinal que
 * chega a tempo de se fazer alguma coisa.
 *
 * Bate de cinco em cinco minutos, e só com o separador à frente. Uma
 * aba esquecida aberta a noite toda não é uma casa a trabalhar, e
 * contá-la como tal daria uma leitura falsa a quem olha para os números.
 */

const INTERVALO = 5 * 60 * 1000;

export function BatidaDePresenca() {
  React.useEffect(() => {
    const supabase = clienteNavegador();
    if (!supabase) return;

    let vivo = true;

    async function bater() {
      if (!vivo || document.hidden) return;
      /*
       * Sem tipos gerados, o `rpc` não conhece a função. A chamada fica
       * presa ao objecto: tirá-la para uma variável desliga-a do `this`.
       *
       * E o que vem de lá é um `PromiseLike`, não uma `Promise`: tem
       * `then` e não tem `catch`. Isto já esteve escrito com um
       * `.catch(() => {})` ao fundo, que rebentava antes de o pedido
       * sair — e como rebentava dentro de uma função assíncrona, não
       * havia erro nenhum no ecrã, só uma batida que nunca chegou. O
       * painel de administração dava todas as casas como nunca tendo
       * aberto o painel, que é precisamente o aviso que ele existe
       * para dar. O molde mentia ao TypeScript, e por isso o `.catch`
       * compilava.
       */
      const comRpc = supabase as unknown as {
        rpc: (nome: string) => PromiseLike<{ error: unknown }>;
      };
      try {
        await comRpc.rpc('marcar_visto');
      } catch {
        // A batida é um extra. Se falhar, ninguém no painel tem de saber.
      }
    }

    void bater();
    const relogio = setInterval(bater, INTERVALO);
    document.addEventListener('visibilitychange', bater);

    return () => {
      vivo = false;
      clearInterval(relogio);
      document.removeEventListener('visibilitychange', bater);
    };
  }, []);

  return null;
}
