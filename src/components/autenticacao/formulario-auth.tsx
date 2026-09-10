'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Marca } from '@/components/marca';
import { Botao, useSinalDeBotao } from '@/components/ui/botao';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { cn } from '@/lib/utils';

type Modo = 'entrar' | 'criar';

const TEXTOS: Record<
  Modo,
  { titulo: string; sub: string; accao: string; alternativa: React.ReactNode }
> = {
  entrar: {
    titulo: 'Bem-vindo de volta',
    sub: 'Entre para gerir o cardápio, as mesas e os pedidos do dia.',
    accao: 'Entrar',
    alternativa: (
      <>
        Ainda não tem conta?{' '}
        <Link href="/criar-conta" className="font-semibold text-ouro hover:text-ouro-claro">
          Experimentar 7 dias
        </Link>
      </>
    ),
  },
  criar: {
    titulo: 'O seu cardápio começa aqui',
    sub: 'Crie a conta e em quatro passos tem as mesas prontas a receber pedidos.',
    accao: 'Criar conta',
    alternativa: (
      <>
        Já tem conta?{' '}
        <Link href="/entrar" className="font-semibold text-ouro hover:text-ouro-claro">
          Entrar
        </Link>
      </>
    ),
  },
};

/**
 * Cartão de vidro sobre uma fotografia desfocada.
 *
 * O fundo é uma fotografia de mufete do Wikimedia Commons (Jrobal0,
 * CC BY-SA 4.0), redimensionada e convertida para WebP. A licença obriga
 * a creditar, e o crédito está no rodapé do ecrã — discreto, mas lá.
 * Escolhi comida angolana em vez de uma fotografia de banco de imagens
 * porque é o nicho da aplicação, e desfocada dá os âmbares que combinam
 * com o ouro da marca.
 *
 * A referência trazia um botão de Google e um "remember me". Ficaram de
 * fora: não há OAuth de Google ligado neste projecto, e um botão que não
 * faz nada é pior do que botão nenhum; a sessão do Supabase já persiste
 * sozinha, por isso a caixa seria decorativa.
 */
export function FormularioAuth({ modo }: { modo: Modo }) {
  const router = useRouter();
  const texto = TEXTOS[modo];

  const [email, setEmail] = React.useState('');
  const [palavra, setPalavra] = React.useState('');
  const [verPalavra, setVerPalavra] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [aviso, setAviso] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState(false);
  const [sinal, sinalizar] = useSinalDeBotao();

  async function submeter(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);

    const supabase = clienteNavegador();

    // Sem Supabase ligado a aplicacao continua navegavel em demonstracao.
    if (!supabase) {
      router.push(modo === 'criar' ? '/comecar' : '/painel');
      return;
    }

    if (palavra.length < 8) {
      setErro('A palavra-passe precisa de pelo menos 8 caracteres.');
      return;
    }

    setOcupado(true);

    try {
      if (modo === 'criar') {
        const { data, error } = await supabase.auth.signUp({ email, password: palavra });
        if (error) throw error;
        if (!data.session) {
          setAviso('Confirme o endereço no email que acabámos de enviar e depois entre.');
          return;
        }
        router.push('/comecar');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: palavra });
        if (error) throw error;
        router.push('/painel');
      }
      router.refresh();
    } catch (e) {
      setErro(traduzirErro(e));
      sinalizar('erro');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden">
      {/* ------------------------------------------------------------ */}
      {/* Fundo                                                         */}
      {/* ------------------------------------------------------------ */}
      {/*
        A imagem vai em <div> com background-image e não em <Image>: está
        desfocada a 8px e escurecida, por isso a nitidez não conta para
        nada e não vale a pena o custo do optimizador. O `scale-110` evita
        que o desfoque deixe as margens transparentes.
      */}
      <div
        aria-hidden
        className="absolute inset-0 scale-110 bg-cover bg-center"
        style={{ backgroundImage: "url('/pratos/entrada.webp')", filter: 'blur(8px)' }}
      />
      <div aria-hidden className="absolute inset-0 bg-grafite/55" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-grafite/70 via-grafite/30 to-grafite"
      />

      <div className="relative flex min-h-dvh flex-col">
        <header className="px-5 py-6 md:px-8">
          <Marca />
        </header>

        <main className="flex flex-1 items-center justify-center px-5 pb-10">
          <form
            onSubmit={submeter}
            className={cn(
              'w-full max-w-[420px] animate-subir rounded-folha px-6 pb-8 pt-9 sm:px-8 sm:pb-9 sm:pt-10',
              'border border-creme/25 bg-creme/[0.08]',
              'shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150',
            )}
          >
            <h1 className="font-display text-4xl leading-none tracking-tight text-creme">
              {texto.titulo}
            </h1>
            <p className="mt-4 font-sans text-base leading-snug text-creme/70">{texto.sub}</p>

            <div className="mt-8 space-y-4">
              <label className="sr-only" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@restaurante.ao"
                className={campo}
              />

              <label className="sr-only" htmlFor="palavra">
                Palavra-passe
              </label>
              <div className="relative">
                <input
                  id="palavra"
                  type={verPalavra ? 'text' : 'password'}
                  required
                  autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
                  value={palavra}
                  onChange={(e) => setPalavra(e.target.value)}
                  placeholder={modo === 'criar' ? 'Palavra-passe (8+ caracteres)' : 'Palavra-passe'}
                  className={cn(campo, 'pr-14')}
                />
                <button
                  type="button"
                  onClick={() => setVerPalavra((v) => !v)}
                  aria-label={verPalavra ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-creme/70 transition-colors hover:text-creme"
                >
                  {verPalavra ? <OlhoFechado /> : <Olho />}
                </button>
              </div>
            </div>

            {erro ? (
              <p role="alert" className="mt-4 font-sans text-sm text-[#ff9b8f]">
                {erro}
              </p>
            ) : null}
            {aviso ? <p className="mt-4 font-sans text-sm text-ouro">{aviso}</p> : null}

            {/*
              Passa a usar o Botao da casa em vez de um <button> à parte:
              é o único sítio que tinha estados próprios, e ficava de fora
              do sistema — sem rodopio, sem visto, sem abanão.
            */}
            <Botao
              type="submit"
              variante="ouro"
              tamanho="lg"
              largo
              aCarregar={ocupado}
              estado={sinal}
              className="mt-6 h-[60px] text-base"
            >
              {texto.accao}
            </Botao>

            {modo === 'criar' ? (
              <p className="mt-4 text-center font-sans text-sm text-creme/70">
                Sete dias com tudo aberto. Sem cartão de crédito.
              </p>
            ) : null}

            <p className="mt-5 text-center font-sans text-sm text-creme/85">{texto.alternativa}</p>
          </form>
        </main>

        {/* A licenca da fotografia obriga a creditar. Fica discreto, mas fica. */}
        <footer className="px-5 pb-6 text-center md:px-8">
          <p className="font-sans text-xs text-creme/40">
            Fotografia:{' '}
            <a
              href="https://commons.wikimedia.org/wiki/File:Mufete_completo.JPG"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-creme/70"
            >
              Mufete completo
            </a>
            , Jrobal0,{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-creme/70"
            >
              CC BY-SA 4.0
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

const campo = cn(
  'h-[58px] w-full rounded-cartao border border-creme/35 bg-transparent px-5',
  'font-sans text-base text-creme placeholder:text-creme/60',
  'outline-none transition-colors duration-200 focus:border-creme/80',
);

/* ------------------------------------------------------------------ */
/* Ícones                                                              */
/* ------------------------------------------------------------------ */

const Olho = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const OlhoFechado = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden
  >
    <path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
    <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
    <path d="m3 3 18 18" />
  </svg>
);

/**
 * Traduz o erro do Supabase — e, quando não o conhece, mostra o
 * original em vez de o esconder.
 *
 * A versão anterior colapsava tudo o que não previa num "Não foi
 * possível concluir. Tente outra vez.". Ficava bonito e não dizia nada:
 * nem o utilizador percebia o que corrigir, nem quem dá apoio percebia
 * o que perguntar. Uma mensagem crua é feia; uma mensagem vazia é pior.
 */
function traduzirErro(e: unknown) {
  const erro = e as { code?: string; message?: string } | null;
  const codigo = erro?.code ?? '';
  const mensagem = erro?.message ?? String(e);

  const conhecidos: Record<string, string> = {
    invalid_credentials: 'Email ou palavra-passe errados.',
    user_already_exists: 'Já existe uma conta com este email. Experimente entrar.',
    email_exists: 'Já existe uma conta com este email. Experimente entrar.',
    weak_password: 'A palavra-passe é demasiado fraca. Use pelo menos 8 caracteres.',
    validation_failed: 'Confira o endereço de email — o formato não parece válido.',
    over_request_rate_limit: 'Demasiadas tentativas. Espere um minuto e tente outra vez.',
    over_email_send_rate_limit: 'Demasiados emails enviados. Espere um pouco.',
    signup_disabled: 'Os registos estão fechados neste momento.',
    email_not_confirmed: 'Confirme o email antes de entrar.',
    email_address_invalid: 'Este endereço de email não é aceite.',
  };

  if (conhecidos[codigo]) return conhecidos[codigo];

  // Casos antigos, que vinham só no texto.
  if (/invalid login credentials/i.test(mensagem)) return 'Email ou palavra-passe errados.';
  if (/already registered/i.test(mensagem)) return 'Já existe uma conta com este email.';
  if (/rate limit/i.test(mensagem)) return 'Demasiadas tentativas. Tente daqui a pouco.';

  return mensagem || 'Não foi possível concluir. Tente outra vez.';
}
