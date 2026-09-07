import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from './config';

/**
 * Cliente Supabase para Server Components, Route Handlers e Server Actions.
 * Devolve null quando o projecto ainda nao esta ligado ao Supabase.
 */
export async function clienteServidor() {
  if (!supabaseConfigurado()) return null;

  const armazem = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return armazem.getAll();
      },
      setAll(novos: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          for (const { name, value, options } of novos) {
            armazem.set(name, value, options);
          }
        } catch {
          // Server Components nao podem escrever cookies; o middleware
          // trata da renovacao da sessao.
        }
      },
    },
  });
}

/** Utilizador autenticado, ou null. */
export async function utilizadorActual() {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
