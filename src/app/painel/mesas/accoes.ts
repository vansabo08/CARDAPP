'use server';

import { revalidatePath } from 'next/cache';
import { clienteServidor } from '@/lib/supabase/servidor';
import { obterMesas, obterRestauranteDoDono } from '@/lib/dados';
import { gerarToken } from '@/lib/utils';
import { LIMITES_PLANO, type Mesa } from '@/lib/tipos';

type Resultado = { ok: boolean; demonstracao?: boolean; erro?: string; mesas?: Mesa[] };

/** Acrescenta mesas, continuando a numeração onde ela ficou. */
export async function acrescentarMesas(quantidade: number): Promise<Resultado> {
  const quantas = Math.max(1, Math.min(50, Math.floor(quantidade)));

  const supabase = await clienteServidor();
  const restaurante = await obterRestauranteDoDono();
  if (!supabase || !restaurante) return { ok: true, demonstracao: true };

  const existentes = await obterMesas(restaurante.id);
  const limite = LIMITES_PLANO[restaurante.plano].mesas;
  if (existentes.length + quantas > limite) {
    return {
      ok: false,
      erro: `O plano actual permite ${limite} ${limite === 1 ? 'mesa' : 'mesas'}.`,
    };
  }

  const maior = existentes.reduce((m, mesa) => Math.max(m, mesa.numero), 0);
  const novas = Array.from({ length: quantas }, (_, i) => ({
    restaurant_id: restaurante.id,
    numero: maior + i + 1,
    qr_token: gerarToken(),
  }));

  const { data, error } = await supabase
    .from('tables')
    .insert(novas)
    .select('id, restaurant_id, numero, qr_token');

  if (error) return { ok: false, erro: error.message };

  revalidatePath('/painel/mesas');
  return { ok: true, mesas: (data as Mesa[]) ?? [] };
}

export async function apagarMesa(id: string): Promise<Resultado> {
  const supabase = await clienteServidor();
  if (!supabase) return { ok: true, demonstracao: true };

  const { error } = await supabase.from('tables').delete().eq('id', id);
  if (error) return { ok: false, erro: error.message };

  revalidatePath('/painel/mesas');
  return { ok: true };
}
