'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Marca } from '@/components/marca';
import { Botao, useSinalDeBotao } from '@/components/ui/botao';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { cn } from '@/lib/utils';

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
        Bem-vindo ao <span className="text-laranja">Cardapp</span>
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
 * As fotografias do lado da comida.
 *
 * São do Unsplash (licença comercial, atribuição não exigida) e já
 * estavam no projecto, no cardápio de exemplo. Quatro, em mosaico, como
 * na referência: comida a entrar pelo canto do ecrã diz, sem uma
 * palavra, de que negócio é isto.
 *
 * Saiu a fotografia que aqui estava, desfocada por trás de tudo: era do
 * Wikimedia, com licença que obriga a creditar, e o crédito ocupava um
 * rodapé no ecrã de entrada. O ficheiro foi apagado com ela.
 */
const FOTOS = [
  '/pratos/muamba-galinha.webp',
  '/pratos/mufete.webp',
  '/pratos/kitaba.webp',
  '/pratos/espetada.webp',
];

/**
 * O ecrã de entrada.
 *
 * Era um cartão de vidro a flutuar sobre uma fotografia desfocada, com o
 * título numa serifa. Lia-se como a página de um hotel, e não como a
 * ferramenta de trabalho de uma cozinha.
 *
 * Segue agora a referência escolhida: a comida de um lado, o formulário
 * do outro, o nome da casa em laranja. No telemóvel a comida fica em
 * cima, como uma faixa, e o formulário em baixo, onde o polegar chega.
 *
 * O que a referência tem e aqui não faz sentido: entrar com Facebook ou
 * Instagram, que este projecto não liga a lado nenhum, e "esqueci-me da
 * palavra-passe", que ainda não tem ecrã para onde ir. Um botão que não
 * faz nada é pior do que botão nenhum.
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
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* ------------------------------------------------------------ */}
      {/* A comida                                                      */}
      {/* ------------------------------------------------------------ */}
      <aside className="relative h-[32vh] min-h-[210px] shrink-0 overflow-hidden lg:h-auto lg:min-h-dvh lg:w-[44%]">
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
          {FOTOS.map((foto) => (
            <span key={foto} className="relative block overflow-hidden">
              <Image
                src={foto}
                alt=""
                fill
                sizes="(max-width: 1024px) 50vw, 22vw"
                className="object-cover"
                priority
              />
            </span>
          ))}
        </div>

        {/*
          O véu derrete a fotografia na página: em baixo no telemóvel, à
          direita no computador. Sem ele fica uma costura entre a imagem e
          o formulário, e é isso que faz um ecrã parecer montado à pressa.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-grafite/40 via-grafite/25 to-grafite lg:bg-gradient-to-r lg:from-grafite/50 lg:via-grafite/20 lg:to-grafite"
        />

        {/*
          Um segundo véu, só no topo. A marca ficava por cima de qualquer
          fotografia que calhasse ali, e numa clara — um prato de peixe
          com luz — deixava de se ler. Este escurece a faixa onde ela
          assenta, e não a imagem toda.
        */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-grafite/85 to-transparent"
        />

        {/*
          No computador, a fotografia acabava a direito contra o preto do
          formulário — um corte de tesoura a meio do ecrã. Estes 160 px
          derretem-na, e as duas metades passam a ser a mesma página.
        */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 hidden w-40 bg-gradient-to-r from-transparent to-grafite lg:block"
        />

        <div className="absolute left-5 top-5 md:left-8 md:top-8">
          <Marca />
        </div>
      </aside>

      {/* ------------------------------------------------------------ */}
      {/* O formulário                                                  */}
      {/* ------------------------------------------------------------ */}
      <main className="flex flex-1 items-center justify-center px-5 pb-10 pt-8 md:px-8 lg:py-16">
        <form onSubmit={submeter} className="w-full max-w-[400px] animate-subir">
          <p className="font-sans text-sm font-semibold text-tenue">{texto.acima}</p>

          <h1 className="mt-2 text-balance font-display text-3xl leading-tight text-creme md:text-4xl">
            {texto.titulo}
          </h1>

          <p className="mt-3 text-pretty font-sans text-base leading-relaxed text-tenue">
            {texto.sub}
          </p>

          <div className="mt-9 flex flex-col gap-6">
            <div>
              <label htmlFor="email" className="block font-sans text-sm font-semibold text-creme/85">
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
            </div>

            <div>
              <label
                htmlFor="palavra"
                className="block font-sans text-sm font-semibold text-creme/85"
              >
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
                  placeholder={modo === 'criar' ? 'Pelo menos 8 caracteres' : '••••••••'}
                  className={cn(campo, 'pr-10')}
                />
                <button
                  type="button"
                  onClick={() => setVerPalavra((v) => !v)}
                  aria-label={verPalavra ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  className="absolute bottom-3 right-0 text-creme/50 transition-colors hover:text-creme"
                >
                  {verPalavra ? <OlhoFechado /> : <Olho />}
                </button>
              </div>
            </div>
          </div>

          {erro ? (
            <p role="alert" className="mt-5 font-sans text-sm text-[#ff8a78]">
              {erro}
            </p>
          ) : null}
          {aviso ? <p className="mt-5 font-sans text-sm text-laranja">{aviso}</p> : null}

          <Botao
            type="submit"
            variante="laranja"
            tamanho="lg"
            largo
            aCarregar={ocupado}
            estado={sinal}
            className="mt-8 h-[56px]"
          >
            {texto.accao}
          </Botao>

          {modo === 'criar' ? (
            <p className="mt-4 text-center font-sans text-sm text-tenue">
              Sem cartão de crédito. Paga só se decidir ficar.
            </p>
          ) : null}

          <p className="mt-6 text-center font-sans text-sm text-creme/85">{texto.alternativa}</p>
        </form>
      </main>
    </div>
  );
}

/**
 * Campo de linha, como na referência: o nome por cima e uma linha por
 * baixo, que acende a laranja quando se escreve nela.
 *
 * Aqui, e não nos campos do painel: este ecrã tem dois campos e espaço de
 * sobra à volta. Uma página de definições com dez campos precisa do
 * rectângulo cheio, para se ver onde acaba um e começa o outro.
 */
const campo = cn(
  'h-12 w-full border-0 border-b border-creme/20 bg-transparent px-0',
  'font-sans text-base text-creme placeholder:text-creme/35',
  'outline-none transition-colors duration-200 focus:border-laranja',
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
