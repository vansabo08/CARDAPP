'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Botao } from '@/components/ui/botao';
import { Ajuda, Campo, Erro, Rotulo } from '@/components/ui/campo';
import { Marca } from '@/components/marca';
import { clienteNavegador } from '@/lib/supabase/cliente';

type Modo = 'entrar' | 'criar';

const TEXTOS: Record<Modo, { titulo: string; sub: string; accao: string; alternativa: React.ReactNode }> = {
  entrar: {
    titulo: 'Bem-vindo de volta.',
    sub: 'Entre para gerir o cardápio, as mesas e ver os pedidos do dia.',
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
    titulo: 'O seu cardápio começa aqui.',
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

export function FormularioAuth({ modo }: { modo: Modo }) {
  const router = useRouter();
  const texto = TEXTOS[modo];

  const [email, setEmail] = React.useState('');
  const [palavra, setPalavra] = React.useState('');
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
    <div className="flex min-h-dvh flex-col bg-grafite">
      <header className="px-5 py-6 md:px-8">
        <Marca />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-20">
        <div className="w-full max-w-[404px] animate-subir">
          <h1 className="font-display text-[34px] leading-[1.1] text-creme">{texto.titulo}</h1>
          <p className="mt-3 font-sans text-[15px] leading-[1.6] text-tenue">{texto.sub}</p>

          <form onSubmit={submeter} className="mt-9 flex flex-col gap-5">
            <div>
              <Rotulo htmlFor="email">Email</Rotulo>
              <Campo
                id="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@restaurante.ao"
              />
            </div>

            <div>
              <Rotulo htmlFor="palavra">Palavra-passe</Rotulo>
              <Campo
                id="palavra"
                type="password"
                required
                minLength={8}
                autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
                value={palavra}
                onChange={(e) => setPalavra(e.target.value)}
                placeholder="pelo menos 8 caracteres"
              />
              {modo === 'criar' ? <Ajuda>Guarde-a bem — é com ela que entra no painel.</Ajuda> : null}
            </div>

            {erro ? <Erro>{erro}</Erro> : null}
            {aviso ? <Ajuda className="text-ouro">{aviso}</Ajuda> : null}

            <Botao type="submit" variante="ouro" tamanho="lg" largo disabled={ocupado}>
              {ocupado ? 'Um momento…' : texto.accao}
            </Botao>
          </form>

          <p className="mt-7 font-sans text-[14px] text-tenue">{texto.alternativa}</p>
        </div>
      </main>
    </div>
  );
}

function traduzirErro(e: unknown) {
  const mensagem = e instanceof Error ? e.message : String(e);
  if (/invalid login credentials/i.test(mensagem)) return 'Email ou palavra-passe errados.';
  if (/already registered/i.test(mensagem)) return 'Já existe uma conta com este email.';
  if (/rate limit/i.test(mensagem)) return 'Demasiadas tentativas. Tente daqui a pouco.';
  return 'Não foi possível concluir. Tente outra vez.';
}
