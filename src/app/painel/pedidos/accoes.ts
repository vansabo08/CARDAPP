'use server';

import { revalidatePath } from 'next/cache';
import { clienteServidor } from '@/lib/supabase/servidor';
import { estadoValido } from '@/lib/pedidos';
import type { EstadoPedido } from '@/lib/tipos';

/**
 * Muda o estado de um pedido.
 *
 * Uma Server Action é um ponto de entrada como outro qualquer: quem
 * souber o nome pode chamá-la com o que quiser. Por isso o estado é
 * validado aqui e não se confia no botão que o enviou.
 *
 * A posse não se verifica em código: o `update` corre com a sessão do
 * dono e a política `orders_alteracao_dono` só deixa passar as linhas
 * dos restaurantes dele. Uma tentativa contra o pedido de outra casa não
 * dá erro — não encontra linha nenhuma para mudar, que é o que se quer.
 */
export async function mudarEstado(
  id: string,
  estado: EstadoPedido,
): Promise<{ ok: boolean; erro?: string }> {
  if (!estadoValido(estado)) return { ok: false, erro: 'Estado desconhecido.' };

  const supabase = await clienteServidor();
  if (!supabase) return { ok: true };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: 'Sessão terminada. Entre outra vez.' };

  const { data, error } = await supabase
    .from('orders')
    .update({ estado, actualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };
  if (!data) return { ok: false, erro: 'Este pedido não é desta casa.' };

  revalidatePath('/painel/pedidos');
  revalidatePath('/painel');

  return { ok: true };
}
