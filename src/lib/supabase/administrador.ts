import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './config';

/**
 * Cliente com a chave de servico. Passa por cima de toda a RLS, por isso
 * so pode ser usado em rotinas do servidor — nunca num componente que o
 * browser veja. A chave nao leva prefixo NEXT_PUBLIC_ de proposito: se
 * levasse, o Next punha-a no pacote que qualquer cliente descarrega.
 */

const CHAVE_SERVICO = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export function servicoConfigurado() {
  return SUPABASE_URL.startsWith('http') && CHAVE_SERVICO.length > 20;
}

export function clienteAdministrador() {
  if (!servicoConfigurado()) return null;
  return createClient(SUPABASE_URL, CHAVE_SERVICO, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
