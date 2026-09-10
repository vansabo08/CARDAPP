'use client';

import * as React from 'react';
import { clienteNavegador } from '@/lib/supabase/cliente';

/**
 * Diz à base que esta casa está a usar o Cardapp agora.
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
      // Sem tipos gerados, o `rpc` não conhece a função. A chamada fica
      // presa ao objecto: tirá-la para uma variável desliga-a do `this`.
      const comRpc = supabase as unknown as {
        rpc: (nome: string) => Promise<unknown>;
      };
      await comRpc.rpc('marcar_visto').catch(() => {});
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
