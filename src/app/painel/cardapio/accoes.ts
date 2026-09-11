'use server';

import { revalidatePath } from 'next/cache';
import { clienteDoPainel } from '@/lib/supabase/servidor';
import { obterRestauranteDoDono } from '@/lib/dados';

/**
 * Escritas do gestor de cardápio.
 * Em modo de demonstração devolvem { demonstracao: true } e o ecrã
 * continua a funcionar com o estado local — nada é gravado.
 */

type Resultado = { ok: boolean; demonstracao?: boolean; erro?: string; id?: string };

async function contexto() {
  const supabase = await clienteDoPainel();
  if (!supabase) return null;
  const restaurante = await obterRestauranteDoDono();
  if (!restaurante) return null;
  return { supabase, restaurante };
}

function actualizado(slug?: string): Resultado {
  revalidatePath('/painel/cardapio');
  if (slug) revalidatePath(`/${slug}`);
  return { ok: true };
}

/* ------------------------------- categorias ------------------------------ */

export async function criarCategoria(nome: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const { data, error } = await ctx.supabase
    .from('categories')
    .insert({ restaurant_id: ctx.restaurante.id, nome: nome.trim().slice(0, 60), ordem: 999 })
    .select('id')
    .single();

  if (error) return { ok: false, erro: error.message };
  return { ...actualizado(ctx.restaurante.slug), id: data.id };
}

export async function renomearCategoria(id: string, nome: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const { error } = await ctx.supabase
    .from('categories')
    .update({ nome: nome.trim().slice(0, 60) })
    .eq('id', id);

  if (error) return { ok: false, erro: error.message };
  return actualizado(ctx.restaurante.slug);
}

export async function apagarCategoria(id: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const { error } = await ctx.supabase.from('categories').delete().eq('id', id);
  if (error) return { ok: false, erro: error.message };
  return actualizado(ctx.restaurante.slug);
}

export async function reordenarCategorias(ids: string[]): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const erros = await Promise.all(
    ids.map((id, ordem) => ctx.supabase.from('categories').update({ ordem }).eq('id', id)),
  );
  const falha = erros.find((r) => r.error);
  if (falha?.error) return { ok: false, erro: falha.error.message };
  return actualizado(ctx.restaurante.slug);
}

/* --------------------------------- pratos -------------------------------- */

export type DadosPrato = {
  nome: string;
  descricao: string | null;
  preco: number;
  foto_url: string | null;
  disponivel: boolean;
};

export async function criarPrato(categoryId: string, dados: DadosPrato): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const { data, error } = await ctx.supabase
    .from('items')
    .insert({ category_id: categoryId, ...limpar(dados), ordem: 999 })
    .select('id')
    .single();

  if (error) return { ok: false, erro: error.message };
  return { ...actualizado(ctx.restaurante.slug), id: data.id };
}

export async function actualizarPrato(id: string, dados: DadosPrato): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const { error } = await ctx.supabase.from('items').update(limpar(dados)).eq('id', id);
  if (error) return { ok: false, erro: error.message };
  return actualizado(ctx.restaurante.slug);
}

export async function alternarDisponivel(id: string, disponivel: boolean): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const { error } = await ctx.supabase.from('items').update({ disponivel }).eq('id', id);
  if (error) return { ok: false, erro: error.message };
  return actualizado(ctx.restaurante.slug);
}

export async function apagarPrato(id: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const { error } = await ctx.supabase.from('items').delete().eq('id', id);
  if (error) return { ok: false, erro: error.message };
  return actualizado(ctx.restaurante.slug);
}

export async function reordenarPratos(ids: string[]): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const erros = await Promise.all(
    ids.map((id, ordem) => ctx.supabase.from('items').update({ ordem }).eq('id', id)),
  );
  const falha = erros.find((r) => r.error);
  if (falha?.error) return { ok: false, erro: falha.error.message };
  return actualizado(ctx.restaurante.slug);
}

function limpar(dados: DadosPrato) {
  return {
    nome: dados.nome.trim().slice(0, 80),
    descricao: dados.descricao?.trim().slice(0, 160) || null,
    preco: Math.max(0, Math.round(Number(dados.preco) * 100) / 100),
    foto_url: dados.foto_url || null,
    disponivel: Boolean(dados.disponivel),
  };
}
