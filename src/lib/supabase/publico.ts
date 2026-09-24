import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from './config';

/**
 * Cliente anónimo, sem cookies nem sessão.
 *
 * O cardápio público não tem utilizador: ler a sessão obrigaria o Next a
 * renderizar a página a cada pedido e perderíamos a revalidação. As
 * políticas de RLS já deixam o `anon` ler restaurantes activos.
 *
 * COM SEGUNDOS, A LEITURA PODE FICAR GUARDADA — e é isso que devolve o
 * cardápio à borda.
 *
 * O `supabase-js` manda cada pedido com `cache: 'no-store'`. Basta uma
 * leitura assim para o Next marcar a página inteira como dinâmica: o
 * cardápio de uma casa, igual para toda a gente, estava a ser desenhado
 * de raiz — com três idas à base de dados — em cada leitura de QR. Eram
 * três segundos até ao primeiro byte, com o cliente sentado à mesa.
 *
 * Passando `revalidar`, o pedido leva `next: { revalidate }` e a página
 * volta a poder ser servida já feita. Quem NÃO leva segundos continua a
 * ler sempre fresco — é o caso do acompanhamento de um pedido, onde uma
 * resposta de há cinco minutos seria mentira.
 */
type Cliente = ReturnType<typeof criar>;

const instancias = new Map<number, Cliente>();

function criar(revalidar?: number) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: revalidar
      ? {
          fetch: (entrada: RequestInfo | URL, inicio?: RequestInit) =>
            fetch(entrada, { ...inicio, cache: undefined, next: { revalidate: revalidar } }),
        }
      : undefined,
  });
}

export function clientePublico(revalidar?: number) {
  if (!supabaseConfigurado()) return null;

  const chave = revalidar ?? 0;
  const existente = instancias.get(chave);
  if (existente) return existente;

  const nova = criar(revalidar);
  instancias.set(chave, nova);
  return nova;
}

/**
 * Quanto tempo uma leitura do cardápio pode ficar guardada.
 *
 * Cinco minutos: mudar um preço no painel aparece na mesa antes de
 * alguém dar por isso, e o esgotado — que é o que muda a meio do serviço
 * — não espera por isto, vai por Realtime.
 */
export const SEGUNDOS_DE_CARDAPIO = 300;
