export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * A aplicacao arranca sem Supabase: nesse modo os ecras usam os dados
 * ficticios do restaurante de demonstracao. Assim que houver credenciais
 * reais no .env.local, tudo passa a ler e escrever na base de dados.
 */
export function supabaseConfigurado() {
  return (
    SUPABASE_URL.startsWith('http') &&
    !SUPABASE_URL.includes('xxxx') &&
    SUPABASE_ANON_KEY.length > 20
  );
}

export const BUCKET = 'cardapp';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);
