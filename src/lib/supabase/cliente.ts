'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from './config';

/** Cliente Supabase do lado do navegador. Devolve null se nao houver credenciais. */
export function clienteNavegador() {
  if (!supabaseConfigurado()) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
