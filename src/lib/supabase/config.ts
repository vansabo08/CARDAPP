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

const SITE_URL_BRUTO = process.env.NEXT_PUBLIC_SITE_URL?.trim();

/** O domínio de produção que a própria Vercel injecta no build. */
const DOMINIO_VERCEL = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim();
/** O endereço deste deploy em concreto — o recuo seguinte. */
const DEPLOY_VERCEL = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();

const eLocal = (endereco: string) => /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(endereco);
const valido = (endereco?: string) => Boolean(endereco && /^https?:\/\//.test(endereco));

/**
 * O endereço público da aplicação.
 *
 * ENTRA EM EMAILS QUE SAEM PARA FORA, e é por isso que tem três recuos.
 * O convite da equipa leva-o dentro do link: com ele errado, o
 * empregado recebe um endereço que não abre em lado nenhum — foi o que
 * aconteceu, com convites a apontar para `localhost:3000`.
 *
 * A causa: `NEXT_PUBLIC_SITE_URL` ficou com o valor do primeiro dia, o
 * do computador de quem programa, e uma variável definida cala o recuo.
 * Agora um `localhost` fora de desenvolvimento é ignorado, e o endereço
 * vem do domínio que a Vercel injecta sozinha no build. Não é preciso
 * lembrar-se de configurar nada para os convites funcionarem.
 */
function descobrirEndereco() {
  const emProducao = process.env.NODE_ENV === 'production';

  if (valido(SITE_URL_BRUTO) && !(emProducao && eLocal(SITE_URL_BRUTO!))) return SITE_URL_BRUTO!;
  if (DOMINIO_VERCEL) return `https://${DOMINIO_VERCEL}`;
  if (DEPLOY_VERCEL) return `https://${DEPLOY_VERCEL}`;
  return 'http://localhost:3000';
}

export const SITE_URL = descobrirEndereco().replace(/\/+$/, '');
