import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from './config';

/**
 * Cliente anónimo, sem cookies nem sessão.
 *
 * O cardápio público não tem utilizador: ler a sessão obrigaria o Next a
 * renderizar a página a cada pedido e perderíamos a revalidação. As
 * políticas de RLS já deixam o `anon` ler restaurantes activos.
 */
let instancia: ReturnType<typeof createClient> | null = null;

export function clientePublico() {
  if (!supabaseConfigurado()) return null;
  if (!instancia) {
    instancia = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return instancia;
}
