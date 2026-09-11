import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from './config';

/**
 * Cliente Supabase para Server Components, Route Handlers e Server Actions.
 * Devolve null quando o projecto ainda nao esta ligado ao Supabase.
 */
export async function clienteServidor() {
  if (!supabaseConfigurado()) return null;

  const armazem = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return armazem.getAll();
      },
      setAll(novos: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          for (const { name, value, options } of novos) {
            armazem.set(name, value, options);
          }
        } catch {
          // Server Components nao podem escrever cookies; o middleware
          // trata da renovacao da sessao.
        }
      },
    },
  });
}

/** Utilizador autenticado, ou null. */
export async function utilizadorActual() {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * O cliente com que o painel escreve.
 *
 * Fora de auditoria é a sessão de quem está ligado, e a RLS prende-a à
 * casa dele — que é a rede de segurança normal e a que se quer.
 *
 * Em auditoria é a chave de serviço, porque a RLS recusaria de imediato
 * escrever na casa de outra pessoa, que é exactamente o que a auditoria
 * com escrita precisa de fazer. É por isso que este é o ponto perigoso
 * da aplicação inteira, e é por isso que está sozinho numa função: as
 * dezanove acções do painel passam todas por aqui, e nenhuma delas
 * precisa de saber que a auditoria existe.
 *
 * A permissão volta a ser verificada aqui dentro, do lado do servidor —
 * `casaEmAuditoria()` devolve nulo a quem não for administrador, seja o
 * que for que venha no cookie.
 */
export async function clienteDoPainel() {
  const { casaEmAuditoria } = await import('../auditoria');
  const emAuditoria = await casaEmAuditoria();

  if (emAuditoria) {
    const { clienteAdministrador } = await import('./administrador');
    const servico = clienteAdministrador();
    if (servico) return servico as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>;
  }

  return clienteServidor();
}
