'use server';

import { revalidatePath } from 'next/cache';
import { clienteDoPainel } from '@/lib/supabase/servidor';
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
/**
 * Marca que alguém da casa viu o pedido. É isto que cala o alarme.
 *
 * Existe à parte do `mudarEstado` de propósito. Antes, o alarme só
 * parava quando o pedido saía de 'novo' — o que obrigava a decidir o que
 * fazer com ele antes de o poder calar. Numa cozinha, ver e decidir são
 * dois momentos: primeiro alguém confirma que o pedido chegou, depois é
 * que se vê se dá para começar já.
 *
 * Não mexe no estado. Um pedido confirmado continua 'novo' até alguém o
 * pôr a preparar, e é assim que deve ser — o cliente não deve ver "a
 * preparar" só porque alguém calou um alarme.
 */
export async function confirmarPedido(id: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await clienteDoPainel();
  if (!supabase) return { ok: true };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: 'Sessão terminada. Entre outra vez.' };

  const { data, error } = await supabase
    .from('orders')
    .update({ confirmado_em: new Date().toISOString() })
    .eq('id', id)
    .is('confirmado_em', null)
    .select('id')
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };
  // Sem linha: ou já estava confirmado, ou não é desta casa. Nos dois
  // casos não há nada a fazer, e nos dois o alarme deve parar.
  void data;

  revalidatePath('/painel/pedidos');
  return { ok: true };
}

export async function mudarEstado(
  id: string,
  estado: EstadoPedido,
): Promise<{ ok: boolean; erro?: string }> {
  if (!estadoValido(estado)) return { ok: false, erro: 'Estado desconhecido.' };

  const supabase = await clienteDoPainel();
  if (!supabase) return { ok: true };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: 'Sessão terminada. Entre outra vez.' };

  const { data, error } = await supabase
    .from('orders')
    .update({
      estado,
      actualizado_em: new Date().toISOString(),
      // Quem move um pedido viu-o. Sem isto, avançar o estado deixava o
      // alarme a tocar por um pedido que já estava a ser feito.
      confirmado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };
  if (!data) return { ok: false, erro: 'Este pedido não é desta casa.' };

  revalidatePath('/painel/pedidos');
  revalidatePath('/painel');

  return { ok: true };
}
