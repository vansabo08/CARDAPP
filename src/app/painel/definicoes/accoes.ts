'use server';

import { revalidatePath } from 'next/cache';
import { clienteDoPainel } from '@/lib/supabase/servidor';
import { obterRestauranteDoDono } from '@/lib/dados';
import { normalizarWhatsApp, whatsAppValido } from '@/lib/format';
import { gerarToken, slugify } from '@/lib/utils';
import type { ModoPedido, Plano } from '@/lib/tipos';

export type DadosRestaurante = {
  nome: string;
  slug: string;
  whatsapp: string;
  logo_url: string | null;
  capa_url: string | null;
  cor_marca: string;
  modo_pedido?: ModoPedido;
  plano?: Plano;
};

const MODOS_ACEITES: ModoPedido[] = ['whatsapp', 'app'];

/** O que vier de fora não manda: um modo desconhecido cai no de sempre. */
function modoSeguro(valor: unknown): ModoPedido {
  return MODOS_ACEITES.includes(valor as ModoPedido) ? (valor as ModoPedido) : 'whatsapp';
}

type Resultado = { ok: boolean; demonstracao?: boolean; erro?: string; slug?: string };

/**
 * As colunas novas chegaram depois de o esquema estar em produção — a
 * capa na migração 0002, o modo de pedido na 0003. Enquanto uma delas
 * não existir, escrevê-la faz a gravação falhar inteira, e o dono fica
 * sem conseguir criar nem guardar o restaurante por causa de um campo
 * acessório. Por isso as escritas tentam com tudo e recuam para o que
 * existe desde o primeiro dia: perdem-se os campos, não o formulário.
 */
function faltaUmaColunaNova(erro: { code?: string; message?: string } | null) {
  // 42703 = undefined_column, no PostgreSQL.
  return erro?.code === '42703';
}

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

  /*
   * Criar uma casa é a única coisa que a auditoria não pode fazer.
   *
   * As outras acções mexem numa casa que já existe e que se sabe qual é.
   * Esta cria uma nova e prende-a a um dono — e em auditoria o dono da
   * sessão é quem administra, não a casa em que se entrou. O resultado
   * seria uma casa órfã presa à conta errada, e ninguém daria por ela.
   */
  const { casaEmAuditoria } = await import('@/lib/auditoria');
  if (await casaEmAuditoria()) {
    return { ok: false, erro: 'Saia da auditoria antes de criar uma casa nova.' };
  }

  const supabase = await clienteDoPainel();
  if (!supabase) return { ok: true, demonstracao: true, slug: slugify(dados.slug || dados.nome) };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: 'Sessão terminada. Entre outra vez.' };

  const slug = await slugLivre(supabase, slugify(dados.slug || dados.nome));

  /*
   * O plano vai escrito, e não deixado à omissão da coluna.
   *
   * Foi assim que se partiu a criação de contas: os planos passaram a
   * ser dois, o CHECK passou a aceitar só 'mesa' e 'sala', e a coluna
   * ficou com 'balcao' por omissão. Como isto nunca escrevia o plano,
   * cada inscrição nova ia buscar o valor velho e batia no CHECK.
   *
   * Ninguém deu por ela durante dias porque a única casa que existia
   * tinha sido criada antes da mudança — e uma conta que não se cria não
   * se queixa a ninguém.
   *
   * A omissão da base foi corrigida. Escrever aqui é o que garante que
   * uma mudança de esquema não volta a fechar a porta da entrada.
   */
  const base = {
    owner_id: user.id,
    nome: dados.nome.trim().slice(0, 80),
    slug,
    whatsapp: normalizarWhatsApp(dados.whatsapp),
    logo_url: dados.logo_url,
    cor_marca: dados.cor_marca || '#D9B36B',
    plano: 'mesa' as const,
  };

  const novas = { capa_url: dados.capa_url, modo_pedido: modoSeguro(dados.modo_pedido) };

  let { data: restaurante, error } = await supabase
    .from('restaurants')
    .insert({ ...base, ...novas })
    .select('id, slug')
    .single();

  if (error && faltaUmaColunaNova(error)) {
    ({ data: restaurante, error } = await supabase
      .from('restaurants')
      .insert(base)
      .select('id, slug')
      .single());
  }

  if (error || !restaurante) {
    // A mensagem crua diz o que corrigir; a genérica não dizia nada.
    return { ok: false, erro: error?.message ?? 'Não foi possível criar o restaurante.' };
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

  const supabase = await clienteDoPainel();
  const actual = await obterRestauranteDoDono();
  if (!supabase || !actual) return { ok: true, demonstracao: true };

  const novoSlug = slugify(dados.slug || dados.nome);
  const slug =
    novoSlug === actual.slug ? actual.slug : await slugLivre(supabase, novoSlug, actual.id);

  const base = {
    nome: dados.nome.trim().slice(0, 80),
    slug,
    whatsapp: normalizarWhatsApp(dados.whatsapp),
    logo_url: dados.logo_url,
    cor_marca: dados.cor_marca || '#D9B36B',
  };

  const novas = { capa_url: dados.capa_url, modo_pedido: modoSeguro(dados.modo_pedido) };

  let { error } = await supabase
    .from('restaurants')
    .update({ ...base, ...novas })
    .eq('id', actual.id);

  if (error && faltaUmaColunaNova(error)) {
    ({ error } = await supabase.from('restaurants').update(base).eq('id', actual.id));
  }

  if (error) return { ok: false, erro: error.message };

  revalidatePath('/painel/definicoes');
  revalidatePath(`/${slug}`);
  if (slug !== actual.slug) revalidatePath(`/${actual.slug}`);

  return { ok: true, slug };
}

/**
 * Grava só a via por onde os pedidos entram.
 *
 * Tem acção própria, e não vai a reboque do `guardarRestaurante`, por
 * duas razões que deram problema:
 *
 * O selector estava numa secção acima do botão "Guardar alterações", e
 * quem o mudava e saía do ecrã perdia a escolha — voltava a WhatsApp na
 * visita seguinte. Um controlo com duas opções que se lê como um
 * interruptor tem de se comportar como um interruptor.
 *
 * E `guardarRestaurante` valida o formulário inteiro: bastava o número
 * de WhatsApp estar a meio de ser escrito para a gravação sair logo com
 * erro e a via nunca chegar à base. Aqui não há mais nada para validar
 * do que a própria via.
 */
export async function guardarModoPedido(modo: ModoPedido): Promise<Resultado> {
  const supabase = await clienteDoPainel();
  const actual = await obterRestauranteDoDono();
  if (!supabase || !actual) return { ok: true, demonstracao: true };

  const { data, error } = await supabase
    .from('restaurants')
    .update({ modo_pedido: modoSeguro(modo) })
    .eq('id', actual.id)
    .select('id')
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };
  if (!data) return { ok: false, erro: 'Não foi possível guardar. Entre outra vez.' };

  revalidatePath('/painel/definicoes');
  revalidatePath('/painel/pedidos');
  revalidatePath(`/${actual.slug}`);

  return { ok: true };
}

/** Acrescenta um sufixo se o endereço já estiver ocupado por outra casa. */
async function slugLivre(
  supabase: NonNullable<Awaited<ReturnType<typeof clienteDoPainel>>>,
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
