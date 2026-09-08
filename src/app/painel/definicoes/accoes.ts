'use server';

import { revalidatePath } from 'next/cache';
import { clienteServidor } from '@/lib/supabase/servidor';
import { obterRestauranteDoDono } from '@/lib/dados';
import { normalizarWhatsApp, whatsAppValido } from '@/lib/format';
import { gerarToken, slugify } from '@/lib/utils';
import type { Plano } from '@/lib/tipos';

export type DadosRestaurante = {
  nome: string;
  slug: string;
  whatsapp: string;
  logo_url: string | null;
  cor_marca: string;
  plano?: Plano;
};

type Resultado = { ok: boolean; demonstracao?: boolean; erro?: string; slug?: string };

function validar(dados: DadosRestaurante): string | null {
  if (dados.nome.trim().length < 2) return 'Escreva o nome do restaurante.';
  if (!slugify(dados.slug || dados.nome)) return 'O endereço do cardápio não pode ficar vazio.';
  if (!whatsAppValido(dados.whatsapp)) {
    return 'O número tem de ser angolano, no formato 244 seguido de nove dígitos.';
  }
  return null;
}

export type CategoriaInicial = {
  nome: string;
  itens: { nome: string; preco: number; descricao?: string | null }[];
};

/** Cria o restaurante do dono, as mesas e um cardápio de arranque. */
export async function criarRestaurante(
  dados: DadosRestaurante,
  numeroDeMesas: number,
  cardapio: CategoriaInicial[] = [],
): Promise<Resultado> {
  const problema = validar(dados);
  if (problema) return { ok: false, erro: problema };

  const supabase = await clienteServidor();
  if (!supabase) return { ok: true, demonstracao: true, slug: slugify(dados.slug || dados.nome) };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: 'Sessão terminada. Entre outra vez.' };

  const slug = await slugLivre(supabase, slugify(dados.slug || dados.nome));

  const { data: restaurante, error } = await supabase
    .from('restaurants')
    .insert({
      owner_id: user.id,
      nome: dados.nome.trim().slice(0, 80),
      slug,
      whatsapp: normalizarWhatsApp(dados.whatsapp),
      logo_url: dados.logo_url,
      cor_marca: dados.cor_marca || '#D9B36B',
    })
    .select('id, slug')
    .single();

  if (error || !restaurante) {
    return { ok: false, erro: 'Não foi possível criar o restaurante.' };
  }

  const quantas = Math.max(1, Math.min(80, Math.floor(numeroDeMesas)));
  await supabase.from('tables').insert(
    Array.from({ length: quantas }, (_, i) => ({
      restaurant_id: restaurante.id,
      numero: i + 1,
      qr_token: gerarToken(),
    })),
  );

  const categoriasComPratos = cardapio.filter((c) => c.nome.trim() && c.itens.length);

  if (categoriasComPratos.length) {
    const { data: criadas } = await supabase
      .from('categories')
      .insert(
        categoriasComPratos.map((categoria, ordem) => ({
          restaurant_id: restaurante.id,
          nome: categoria.nome.trim().slice(0, 60),
          ordem,
        })),
      )
      .select('id');

    if (criadas?.length) {
      const pratos = categoriasComPratos.flatMap((categoria, indice) =>
        categoria.itens
          .filter((item) => item.nome.trim())
          .map((item, ordem) => ({
            category_id: criadas[indice].id,
            nome: item.nome.trim().slice(0, 80),
            descricao: item.descricao?.trim().slice(0, 160) || null,
            preco: Math.max(0, Number(item.preco) || 0),
            ordem,
          })),
      );
      if (pratos.length) await supabase.from('items').insert(pratos);
    }
  }

  revalidatePath('/painel');
  return { ok: true, slug: restaurante.slug };
}

export async function guardarRestaurante(dados: DadosRestaurante): Promise<Resultado> {
  const problema = validar(dados);
  if (problema) return { ok: false, erro: problema };

  const supabase = await clienteServidor();
  const actual = await obterRestauranteDoDono();
  if (!supabase || !actual) return { ok: true, demonstracao: true };

  const novoSlug = slugify(dados.slug || dados.nome);
  const slug =
    novoSlug === actual.slug ? actual.slug : await slugLivre(supabase, novoSlug, actual.id);

  const { error } = await supabase
    .from('restaurants')
    .update({
      nome: dados.nome.trim().slice(0, 80),
      slug,
      whatsapp: normalizarWhatsApp(dados.whatsapp),
      logo_url: dados.logo_url,
      cor_marca: dados.cor_marca || '#D9B36B',
    })
    .eq('id', actual.id);

  if (error) return { ok: false, erro: 'Não foi possível guardar.' };

  revalidatePath('/painel/definicoes');
  revalidatePath(`/${slug}`);
  if (slug !== actual.slug) revalidatePath(`/${actual.slug}`);

  return { ok: true, slug };
}

/** Acrescenta um sufixo se o endereço já estiver ocupado por outra casa. */
async function slugLivre(
  supabase: NonNullable<Awaited<ReturnType<typeof clienteServidor>>>,
  base: string,
  ignorarId?: string,
) {
  let candidato = base;

  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const consulta = supabase.from('restaurants').select('id').eq('slug', candidato).limit(1);
    const { data } = ignorarId ? await consulta.neq('id', ignorarId) : await consulta;
    if (!data?.length) return candidato;
    candidato = `${base}-${tentativa + 2}`;
  }

  return `${base}-${Date.now().toString(36).slice(-4)}`;
}
