'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Marca } from '@/components/marca';
import { Botao } from '@/components/ui/botao';
import { Campo, Erro, Rotulo } from '@/components/ui/campo';
import { clienteNavegador } from '@/lib/supabase/cliente';

/**
 * Quem foi convidado para a equipa chega aqui pelo link do email e
 * escolhe a palavra-passe.
 *
 * A sessão pode chegar de três maneiras, conforme o modelo de email que
 * está no Supabase:
 *
 *   - já em cookies, se o link passou por /auth/confirmar (o nosso
 *     modelo, o recomendado);
 *   - no fragmento do endereço (#access_token=…), que é o que o modelo
 *     por omissão do Supabase faz;
 *   - num `?code=`, no fluxo PKCE.
 *
 * Aceitam-se as três. Assim o convite funciona já, antes de alguém trocar
 * o modelo no painel do Supabase, e continua a funcionar depois.
 */

type Estado = 'a_ler' | 'pronto' | 'sem_sessao';

const MINIMO = 8;

const MENSAGEM_DE_ERRO: Record<'expirado' | 'link', string> = {
  expirado: 'Este link de convite já foi usado ou expirou. Peça ao dono da casa para o enviar outra vez.',
  link: 'Este link de convite está incompleto. Abra-o outra vez a partir do email.',
};

export function AceitarConvite({ erroInicial }: { erroInicial: 'expirado' | 'link' | null }) {
  const router = useRouter();
  const [estado, setEstado] = React.useState<Estado>('a_ler');
  const [email, setEmail] = React.useState<string | null>(null);
  const [senha, setSenha] = React.useState('');
  const [repetida, setRepetida] = React.useState('');
  const [ver, setVer] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(erroInicial ? MENSAGEM_DE_ERRO[erroInicial] : null);
  const [aGuardar, setAGuardar] = React.useState(false);

  React.useEffect(() => {
    let vivo = true;

    async function lerSessao() {
      const supabase = clienteNavegador();
      if (!supabase) {
        if (vivo) setEstado('sem_sessao');
        return;
      }

      const fragmento = new URLSearchParams(window.location.hash.slice(1));
      const pesquisa = new URLSearchParams(window.location.search);

      try {
        if (fragmento.get('error_description')) {
          setErro(MENSAGEM_DE_ERRO.expirado);
        } else if (fragmento.get('access_token') && fragmento.get('refresh_token')) {
          await supabase.auth.setSession({
            access_token: fragmento.get('access_token')!,
            refresh_token: fragmento.get('refresh_token')!,
          });
        } else if (pesquisa.get('code')) {
          await supabase.auth.exchangeCodeForSession(pesquisa.get('code')!);
        }
      } catch {
        setErro(MENSAGEM_DE_ERRO.expirado);
      }

      // O token não fica à vista na barra de endereço nem no histórico.
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!vivo) return;
      setEmail(user?.email ?? null);
      setEstado(user ? 'pronto' : 'sem_sessao');
    }

    void lerSessao();
    return () => {
      vivo = false;
    };
  }, []);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (senha.length < MINIMO) {
      setErro(`A palavra-passe precisa de pelo menos ${MINIMO} caracteres.`);
      return;
    }
    if (senha !== repetida) {
      setErro('As duas palavras-passe não são iguais.');
      return;
    }

    const supabase = clienteNavegador();
    if (!supabase) return;

    setAGuardar(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setAGuardar(false);
      setErro(
        /weak|pwned|leaked/i.test(error.message)
          ? 'Essa palavra-passe é demasiado fácil de adivinhar. Escolha outra.'
          : 'Não foi possível guardar a palavra-passe. Tente outra vez.',
      );
      return;
    }

    // Marca o convite como aceite. Se falhar, não impede ninguém de entrar.
    const comRpc = supabase as unknown as { rpc: (n: string) => PromiseLike<unknown> };
    try {
      await comRpc.rpc('aceitar_convites');
    } catch {
      /* só serve para a lista do dono */
    }

    // O middleware manda cada papel para a página dele.
    router.replace('/painel');
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-grafite px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center">
          <Marca href="/" />
        </div>

        <div className="superficie mt-8 rounded-cartao p-6 sm:p-8">
          <p className="font-sans text-sm font-semibold text-laranja">Convite para a equipa</p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-creme">
            Escolha a sua palavra-passe
          </h1>

          {estado === 'a_ler' ? (
            <div className="mt-6 flex flex-col gap-3" aria-busy="true" aria-label="A preparar">
              <span className="h-12 animate-pulse rounded-campo bg-black/[0.05]" />
              <span className="h-12 animate-pulse rounded-campo bg-black/[0.05]" />
              <span className="h-14 animate-pulse rounded-full bg-black/[0.05]" />
            </div>
          ) : estado === 'sem_sessao' ? (
            <div className="mt-4">
              <p className="font-sans text-sm leading-relaxed text-tenue">
                {erro ??
                  'Não encontrámos o convite. Abra o link que chegou por email — é ele que prova que o convite é seu.'}
              </p>
              <Botao asChild variante="contorno" tamanho="md" className="mt-6">
                <a href="/entrar">Já tenho palavra-passe</a>
              </Botao>
            </div>
          ) : (
            <form onSubmit={guardar} className="mt-6 flex flex-col gap-5" noValidate>
              {email ? (
                <p className="-mt-2 font-sans text-sm text-tenue">
                  Vai entrar como <span className="font-semibold text-creme">{email}</span>.
                </p>
              ) : null}

              <div>
                <Rotulo htmlFor="senha-nova">Palavra-passe</Rotulo>
                <div className="relative">
                  <Campo
                    id="senha-nova"
                    type={ver ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pr-12"
                    aria-describedby="senha-regra"
                  />
                  <button
                    type="button"
                    onClick={() => setVer((v) => !v)}
                    aria-label={ver ? 'Esconder a palavra-passe' : 'Mostrar a palavra-passe'}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-tenue hover:text-creme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja"
                  >
                    {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p id="senha-regra" className="mt-2 font-sans text-xs text-tenue">
                  Pelo menos {MINIMO} caracteres.
                </p>
              </div>

              <div>
                <Rotulo htmlFor="senha-repetida">Repita a palavra-passe</Rotulo>
                <Campo
                  id="senha-repetida"
                  type={ver ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={repetida}
                  onChange={(e) => setRepetida(e.target.value)}
                />
              </div>

              {erro ? <Erro role="alert">{erro}</Erro> : null}

              <Botao type="submit" variante="laranja" tamanho="lg" largo aCarregar={aGuardar}>
                Entrar na equipa
              </Botao>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
