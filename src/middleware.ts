import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from '@/lib/supabase/config';
import { areaDoCaminho, ePapel, paginaInicial, podeEntrar } from '@/lib/papeis';

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * A porta de cada página do painel, por papel.
   *
   * Um empregado que escreva /painel/definicoes no endereço não chega
   * a ver o ecrã: volta para a página dele. A base de dados já lhe
   * recusaria os dados; isto poupa-lhe um ecrã meio vazio a fingir que
   * funciona.
   *
   * Se a pergunta à base falhar, a porta fica aberta — é a RLS que
   * guarda os dados, e um painel que não abre por causa de um soluço
   * de rede é pior do que um menu a mais.
   */
  const area = areaDoCaminho(pedido.nextUrl.pathname);
  if (user && area) {
    const comRpc = supabase as unknown as {
      rpc: (nome: string) => PromiseLike<{ data: unknown; error: unknown }>;
    };
    const { data } = await comRpc.rpc('o_meu_papel');
    const linha = Array.isArray(data) ? (data[0] as { papel?: unknown } | undefined) : undefined;
    const papel = linha?.papel;

    if (ePapel(papel) && !podeEntrar(papel, area)) {
      const destino = pedido.nextUrl.clone();
      destino.pathname = paginaInicial(papel);
      destino.search = '';
      const redireccao = NextResponse.redirect(destino);
      // A sessão renovada vai junto, senão o redireccionamento perdia-a.
      for (const cookie of resposta.cookies.getAll()) redireccao.cookies.set(cookie);
      return redireccao;
    }
  }

  return resposta;
}

export const config = {
  matcher: ['/painel/:path*', '/admin/:path*', '/comecar', '/entrar', '/criar-conta'],
};
