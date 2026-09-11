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

/**
 * A casa em que se está, e as categorias que são dela.
 *
 * TODAS AS ESCRITAS DAQUI PARA BAIXO DIZEM DE QUE CASA SÃO.
 *
 * Durante muito tempo não precisavam: iam com a sessão do dono, e a RLS
 * não deixava tocar em nada que não fosse dele. Dizer a casa por extenso
 * seria repetir o que a base já garantia.
 *
 * Com a auditoria isso deixou de ser verdade. Em auditoria o cliente é a
 * chave de serviço, que passa por cima da RLS — e "apagar a categoria com
 * este id" passava a apagar a categoria com esse id em qualquer casa da
 * plataforma. Um id de uma página velha, um separador aberto noutra casa,
 * e mexia-se no cardápio de um cliente que não era o que estava no ecrã.
 *
 * Os pratos não têm casa, têm categoria. Por isso vêm aqui as categorias
 * desta casa, e um prato só se toca se a categoria dele estiver na lista.
 */
async function contexto() {
  const supabase = await clienteDoPainel();
  if (!supabase) return null;
  const restaurante = await obterRestauranteDoDono();
  if (!restaurante) return null;

  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('restaurant_id', restaurante.id);

  const categorias = ((data ?? []) as { id: string }[]).map((c) => c.id);
  return { supabase, restaurante, categorias };
}

/**
 * A lista das categorias desta casa, pronta para um `in`.
 *
 * Nunca vazia: um `in` com lista vazia é um erro de sintaxe no PostgREST,
 * e uma casa sem categorias não tem pratos em que se possa tocar — um
 * valor que não existe garante que o filtro não apanha nada.
 */
function categoriasParaFiltro(categorias: string[]) {
  return categorias.length ? categorias : ['00000000-0000-0000-0000-000000000000'];
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
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurante.id);

  if (error) return { ok: false, erro: error.message };
  return actualizado(ctx.restaurante.slug);
}

export async function apagarCategoria(id: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const { error } = await ctx.supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurante.id);
  if (error) return { ok: false, erro: error.message };
  return actualizado(ctx.restaurante.slug);
}

export async function reordenarCategorias(ids: string[]): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const erros = await Promise.all(
    ids.map((id, ordem) =>
      ctx.supabase
        .from('categories')
        .update({ ordem })
        .eq('id', id)
        .eq('restaurant_id', ctx.restaurante.id),
    ),
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

  if (!ctx.categorias.includes(categoryId)) {
    return { ok: false, erro: 'Essa categoria não é desta casa.' };
  }

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

  const { error } = await ctx.supabase
    .from('items')
    .update(limpar(dados))
    .eq('id', id)
    .in('category_id', categoriasParaFiltro(ctx.categorias));
  if (error) return { ok: false, erro: error.message };
  return actualizado(ctx.restaurante.slug);
}

export async function alternarDisponivel(id: string, disponivel: boolean): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const { error } = await ctx.supabase
    .from('items')
    .update({ disponivel })
    .eq('id', id)
    .in('category_id', categoriasParaFiltro(ctx.categorias));
  if (error) return { ok: false, erro: error.message };
  return actualizado(ctx.restaurante.slug);
}

export async function apagarPrato(id: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const { error } = await ctx.supabase
    .from('items')
    .delete()
    .eq('id', id)
    .in('category_id', categoriasParaFiltro(ctx.categorias));
  if (error) return { ok: false, erro: error.message };
  return actualizado(ctx.restaurante.slug);
}

export async function reordenarPratos(ids: string[]): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return { ok: true, demonstracao: true };

  const erros = await Promise.all(
    ids.map((id, ordem) =>
      ctx.supabase
        .from('items')
        .update({ ordem })
        .eq('id', id)
        .in('category_id', categoriasParaFiltro(ctx.categorias)),
    ),
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
