'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Marca } from '@/components/marca';
import { MarcaSimbolo } from '@/components/marca-simbolo';
import { FundoVivo } from '@/components/marketing/fundo-vivo';
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
        <Link href="/criar-conta" className="text-creme underline underline-offset-4">
          Criar cardápio grátis
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
        <Link href="/entrar" className="text-creme underline underline-offset-4">
          Entrar
        </Link>
      </>
    ),
  },
};

/**
 * Cartão de vidro sobre o preto da marca.
 *
 * A referência trazia um botão de Google e uma prova social com caras —
 * ficaram de fora: não há OAuth de Google ligado neste projecto, e um
 * botão que não faz nada é pior do que botão nenhum. Os números de
 * utilizadores também não se inventam.
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
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <FundoVivo />

      <header className="px-5 py-6 md:px-8">
        <Marca />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-24">
        <div className="w-full max-w-[400px] animate-subir">
          <div
            className={cn(
              'rounded-[26px] border border-linha p-8 sm:p-9',
              // O vidro: um degradé quase invisível do canto superior
              // esquerdo, e desfoque por trás.
              'bg-gradient-to-br from-white/[0.07] via-white/[0.02] to-transparent',
              'shadow-[0_28px_70px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl',
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-linha bg-white/[0.05]">
              <MarcaSimbolo className="h-6 w-6 text-ouro" />
            </span>

            <h1 className="mt-7 font-display text-[30px] leading-[1.12] text-creme">
              {texto.titulo}
            </h1>
            <p className="mt-2.5 font-sans text-[14.5px] leading-[1.6] text-tenue">{texto.sub}</p>

            <form onSubmit={submeter} className="mt-8 flex flex-col gap-3">
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
                  className={cn(campo, 'pr-16')}
                />
                <button
                  type="button"
                  onClick={() => setVerPalavra((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-[12px] font-semibold text-tenue transition-colors hover:text-creme"
                >
                  {verPalavra ? 'Ocultar' : 'Ver'}
                </button>
              </div>

              {erro ? <p className="font-sans text-[13px] text-[#e0655a]">{erro}</p> : null}
              {aviso ? <p className="font-sans text-[13px] text-ouro">{aviso}</p> : null}

              <hr className="my-2 border-linha" />

              <button
                type="submit"
                disabled={ocupado}
                className={cn(
                  'h-[52px] w-full rounded-full bg-ouro font-sans text-[15px] font-semibold text-grafite',
                  'transition-[background-color,transform] duration-200 ease-calmo',
                  'hover:bg-ouro-claro active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40',
                )}
              >
                {ocupado ? 'Um momento…' : texto.accao}
              </button>

              {modo === 'criar' ? (
                <p className="mt-1 text-center font-sans text-[12.5px] text-tenue">
                  Grátis para uma mesa e quinze pratos. Sem cartão de crédito.
                </p>
              ) : null}
            </form>
          </div>

          <p className="mt-7 text-center font-sans text-[14px] text-tenue">{texto.alternativa}</p>
        </div>
      </main>
    </div>
  );
}

const campo = cn(
  'h-[52px] w-full rounded-full border border-linha bg-white/[0.05] px-5',
  'font-sans text-[15px] text-creme placeholder:text-tenue',
  'outline-none transition-colors duration-200 focus:border-ouro/60 focus:bg-white/[0.07]',
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
