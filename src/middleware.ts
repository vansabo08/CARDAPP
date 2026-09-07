import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from '@/lib/supabase/config';

/**
 * Renova a sessao do Supabase em cada pedido ao painel.
 * O cardapio publico nao passa por aqui — nao ha sessao para renovar e
 * cada milissegundo conta no telemovel do cliente.
 */
export async function middleware(pedido: NextRequest) {
  if (!supabaseConfigurado()) return NextResponse.next();

  let resposta = NextResponse.next({ request: pedido });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return pedido.cookies.getAll();
      },
      setAll(novos: { name: string; value: string; options?: Record<string, unknown> }[]) {
        for (const { name, value } of novos) pedido.cookies.set(name, value);
        resposta = NextResponse.next({ request: pedido });
        for (const { name, value, options } of novos) resposta.cookies.set(name, value, options);
      },
    },
  });

  await supabase.auth.getUser();
  return resposta;
}

export const config = {
  matcher: ['/painel/:path*', '/comecar', '/entrar', '/criar-conta'],
};
