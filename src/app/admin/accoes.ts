'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdministrador } from '@/lib/admin';
import { clienteAdministrador } from '@/lib/supabase/administrador';
import type { Plano } from '@/lib/tipos';

/**
 * Acções do painel administrativo.
 *
 * Cada uma volta a verificar quem chama. Uma barreira só no layout não
 * chega: as Server Actions são endpoints, e quem souber o identificador
 * pode chamá-las directamente sem passar pela página.
 */

type Resultado = { ok: boolean; erro?: string };

const PLANOS_VALIDOS: Plano[] = ['mesa', 'sala'];

function actualizou(slug?: string): Resultado {
  revalidatePath('/admin');
  if (slug) revalidatePath(`/${slug}`);
  return { ok: true };
}

/**
 * Desligar um restaurante tira-o do ar: a RLS deixa de o servir ao
 * público e o cardápio passa a dar 404. É reversível — ao contrário de
 * apagar, que aqui não existe de propósito.
 */
export async function alternarActivo(id: string, activo: boolean): Promise<Resultado> {
  await exigirAdministrador();

  const supabase = clienteAdministrador();
  if (!supabase) return { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY em falta.' };

  const { data, error } = await supabase
    .from('restaurants')
    .update({ activo })
    .eq('id', id)
    .select('slug')
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };
  return actualizou((data as { slug?: string } | null)?.slug);
}

export async function mudarPlano(id: string, plano: Plano): Promise<Resultado> {
  await exigirAdministrador();

  if (!PLANOS_VALIDOS.includes(plano)) {
    return { ok: false, erro: 'Plano desconhecido.' };
  }

  const supabase = clienteAdministrador();
  if (!supabase) return { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY em falta.' };

  const { data, error } = await supabase
    .from('restaurants')
    .update({ plano })
    .eq('id', id)
    .select('slug')
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };
  return actualizou((data as { slug?: string } | null)?.slug);
}

/**
 * Marca mais um mes pago.
 *
 * Enquanto o Multicaixa Express e o AppyPay nao estiverem ligados, o
 * pagamento acontece fora da aplicacao — por transferencia, em mao, como
 * for. Alguem tem de o registar, e e aqui. Sem isto o periodo de
 * experiencia acabava e nao havia forma de o desbloquear sem ir a base
 * de dados a mao.
 *
 * Soma a partir da data que ja la esta, e nao a partir de hoje: quem
 * paga com cinco dias de sobra nao pode perder esses cinco dias.
 */
export async function marcarPago(id: string, meses = 1): Promise<Resultado> {
  await exigirAdministrador();

  const quantos = Math.max(1, Math.min(24, Math.floor(meses)));

  const supabase = clienteAdministrador();
  if (!supabase) return { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY em falta.' };

  const { data: actual } = await supabase
    .from('restaurants')
    .select('pago_ate')
    .eq('id', id)
    .maybeSingle();

  const agora = Date.now();
  const inicio = Math.max(agora, new Date((actual as { pago_ate?: string } | null)?.pago_ate ?? 0).getTime() || agora);
  const ate = new Date(inicio + quantos * 30 * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from('restaurants')
    .update({ pago_ate: ate })
    .eq('id', id)
    .select('slug')
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };
  return actualizou((data as { slug?: string } | null)?.slug);
}
