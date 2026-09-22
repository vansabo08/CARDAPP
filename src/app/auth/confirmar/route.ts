import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { clienteServidor } from '@/lib/supabase/servidor';

/**
 * O link dos emails do Supabase, confirmado do lado do servidor.
 *
 * O modelo de email de convite (em `supabase/emails/convite.html`) aponta
 * para aqui com `token_hash` e `type`. Confirmar no servidor deixa a
 * sessão em cookies, que é onde o painel a procura; o link por omissão do
 * Supabase põe-na no fragmento do endereço, que o servidor nunca vê.
 *
 * O `next` só aceita caminhos desta aplicação. Um `next` para outro site
 * faria deste link uma porta para mandar gente, já com sessão, para onde
 * quem escreveu o link quisesse.
 */

const TIPOS: readonly EmailOtpType[] = ['invite', 'signup', 'recovery', 'email', 'magiclink', 'email_change'];

function destinoSeguro(bruto: string | null) {
  if (!bruto || !bruto.startsWith('/') || bruto.startsWith('//')) return '/painel';
  return bruto;
}

export async function GET(pedido: NextRequest) {
  const url = pedido.nextUrl;
  const tokenHash = url.searchParams.get('token_hash');
  const tipo = url.searchParams.get('type') as EmailOtpType | null;
  const proximo = destinoSeguro(url.searchParams.get('next'));

  const erro = new URL('/convite', url.origin);

  if (!tokenHash || !tipo || !TIPOS.includes(tipo)) {
    erro.searchParams.set('erro', 'link');
    return NextResponse.redirect(erro);
  }

  const supabase = await clienteServidor();
  if (!supabase) return NextResponse.redirect(new URL('/', url.origin));

  const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
  if (error) {
    erro.searchParams.set('erro', 'expirado');
    return NextResponse.redirect(erro);
  }

  return NextResponse.redirect(new URL(proximo, url.origin));
}
