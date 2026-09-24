'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Marca } from '@/components/marca';
import { Botao, useSinalDeBotao } from '@/components/ui/botao';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { cn } from '@/lib/utils';
import { FOTO_MESA_QR } from '@/lib/fotos';

type Modo = 'entrar' | 'criar';

const TEXTOS: Record<
  Modo,
  {
    acima: string;
    titulo: React.ReactNode;
    sub: string;
    accao: string;
    alternativa: React.ReactNode;
  }
> = {
  entrar: {
    acima: 'Área da casa',
    titulo: (
      <>
        Bem-vindo ao <span className="text-laranja">CardApp</span>
      </>
    ),
    sub: 'Entre para gerir o cardápio, as mesas e os pedidos do dia.',
    accao: 'Entrar',
    alternativa: (
      <>
        Ainda não tem conta?{' '}
        <Link href="/criar-conta" className="font-semibold text-laranja hover:text-laranja-claro">
          Experimentar 7 dias
        </Link>
      </>
    ),
  },
  criar: {
    acima: 'Sete dias com tudo aberto',
    titulo: (
      <>
        O seu cardápio <span className="text-laranja">começa aqui</span>
      </>
    ),
    sub: 'Crie a conta e em quatro passos tem as mesas prontas a receber pedidos.',
    accao: 'Criar conta',
    alternativa: (
      <>
        Já tem conta?{' '}
        <Link href="/entrar" className="font-semibold text-laranja hover:text-laranja-claro">
          Entrar
        </Link>
      </>
    ),
  },
};


/**
 * O ecrã de entrada: um cartão de vidro sobre a sala cheia.
 *
 * É a referência que o dono escolheu. O vidro só existe aqui, e não no
 * resto da aplicação: neste ecrã há uma fotografia por baixo para ele
 * filtrar, que é o que faz o efeito. Num painel de trabalho, sobre um
 * fundo liso, o mesmo vidro é só ruído — por isso ficou fora de lá.
 *
 * TRÊS CUIDADOS, para o vidro não comer o texto:
 *  - um véu escuro entre a fotografia e o cartão, senão o branco do céu
 *    passa e o texto perde-se;
 *  - o desfoque tem alternativa: nos browsers sem `backdrop-filter` o
 *    cartão fica com fundo sólido, e lê-se na mesma;
 *  - os campos têm fundo próprio, mais escuro do que o cartão, para se
 *    perceber onde se escreve.
 *
 * O que a referência tem e aqui não entra: "remember me", que o Supabase
 * já faz sozinho ao guardar a sessão, e "esqueci-me da palavra-passe",
 * que ainda não tem ecrã para onde ir. Um botão que não faz nada é pior
 * do que botão nenhum.
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
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      {/* ------------------------------------------------------------ */}
      {/* A sala, por trás de tudo                                      */}
      {/* ------------------------------------------------------------ */}
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-grafite">
        <Image
          src={FOTO_MESA_QR}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={75}
          className="scale-105 object-cover object-center"
        />
        {/* O véu: a fotografia é ambiente, o cartão é que é o assunto.
            Claro, agora — a app é clara, e um véu preto por baixo de um
            cartão branco fazia uma mancha no meio do ecrã. */}
        <div className="absolute inset-0 bg-grafite/25" />
        <div className="absolute inset-0 bg-gradient-to-b from-grafite/60 via-grafite/15 to-grafite/70" />
      </div>

      <form
        onSubmit={submeter}
        className={cn(
          'w-full max-w-[420px] animate-subir rounded-[28px] p-7 sm:p-9',
          'border border-white/60 bg-grafite/85 supports-[backdrop-filter]:bg-white/60',
          'backdrop-blur-2xl backdrop-saturate-150',
          'shadow-[0_30px_70px_-28px_rgba(23,22,27,0.35),inset_0_1px_0_0_rgba(255,255,255,0.9)]',
        )}
      >
        <Marca />

        <p className="mt-7 font-sans text-sm font-semibold text-laranja">{texto.acima}</p>

        <h1 className="mt-1.5 text-balance font-display text-3xl leading-tight text-creme">
          {texto.titulo}
        </h1>

        <p className="mt-2.5 text-pretty font-sans text-sm leading-relaxed text-creme/75">
          {texto.sub}
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <label htmlFor="email" className="sr-only">
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
            placeholder="Email"
            className={campo}
          />

          <label htmlFor="palavra" className="sr-only">
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
              placeholder={modo === 'criar' ? 'Palavra-passe (8 ou mais)' : 'Palavra-passe'}
              className={cn(campo, 'pr-12')}
            />
            <button
              type="button"
              onClick={() => setVerPalavra((v) => !v)}
              aria-label={verPalavra ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-creme/60 transition-colors hover:bg-black/10 hover:text-creme"
            >
              {verPalavra ? <OlhoFechado /> : <Olho />}
            </button>
          </div>
        </div>

        {erro ? (
          <p role="alert" className="mt-4 font-sans text-sm text-[#ff8a78]">
            {erro}
          </p>
        ) : null}
        {aviso ? <p className="mt-4 font-sans text-sm text-laranja">{aviso}</p> : null}

        <Botao
          type="submit"
          variante="laranja"
          tamanho="lg"
          largo
          aCarregar={ocupado}
          estado={sinal}
          className="mt-6 h-[54px] rounded-full"
        >
          {texto.accao}
        </Botao>

        {modo === 'criar' ? (
          <p className="mt-4 text-center font-sans text-xs text-creme/60">
            Sem cartão de crédito. Paga só se decidir ficar.
          </p>
        ) : null}

        <p className="mt-5 text-center font-sans text-sm text-creme/80">{texto.alternativa}</p>
      </form>
    </div>
  );
}


/**
 * Campo de vidro: um rectângulo arredondado, mais escuro do que o
 * cartão, com o nome lá dentro — como na referência.
 *
 * O fundo é preto a 25 %, e não transparente: por cima de uma fotografia,
 * um campo sem fundo próprio desaparece assim que o céu por trás ficar
 * claro. O nome dentro do campo (`placeholder`) é o que a referência
 * mostra; para quem usa leitor de ecrã há uma etiqueta escondida, porque
 * um `placeholder` desaparece mal se começa a escrever.
 */
const campo = cn(
  'h-[52px] w-full rounded-2xl border border-creme/15 bg-white/75 px-4',
  'font-sans text-base text-creme placeholder:text-creme/50',
  'outline-none transition-[border-color,background-color] duration-200',
  'hover:border-creme/25 focus:border-laranja-claro focus:bg-white',
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
