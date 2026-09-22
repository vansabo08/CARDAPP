'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { emModoDemonstracao, obterPapelNoPainel, obterRestauranteDoDono } from '@/lib/dados';
import { temFuncionalidade, type Funcionalidade } from '@/lib/funcionalidades';
import { clienteDoPainel } from '@/lib/supabase/servidor';
import { traduzirParaIngles } from '@/lib/traducao';

/**
 * As escritas do cardápio que só existem no Plano Sala: opções dos
 * pratos, horários e o modo do esgotado.
 *
 * Cada uma confere três coisas antes de escrever — o plano, o papel
 * (dono ou gerente) e a casa — e a base volta a conferir as duas
 * primeiras nas políticas. As mensagens de erro são para o dono ler: dizem
 * o que fazer, e não o código do PostgreSQL.
 */

export type Resultado = { ok: true; id?: string; demonstracao?: boolean } | { ok: false; erro: string };

const ID = z.uuid({ error: 'Não encontrámos o que quer mudar. Recarregue a página.' });

async function autorizar(funcionalidade: Funcionalidade, soDono = false) {
  if (emModoDemonstracao()) return { tipo: 'demonstracao' as const };

  const [restaurante, papel, supabase] = await Promise.all([
    obterRestauranteDoDono(),
    obterPapelNoPainel(),
    clienteDoPainel(),
  ]);

  if (!restaurante || !supabase) return { tipo: 'erro' as const, erro: 'A sessão terminou. Volte a entrar.' };
  if (!temFuncionalidade(restaurante, funcionalidade)) {
    return { tipo: 'erro' as const, erro: 'Isto faz parte do Plano Sala.' };
  }
  if (soDono ? papel !== 'dono' : papel !== 'dono' && papel !== 'gerente') {
    return {
      tipo: 'erro' as const,
      erro: soDono ? 'Só o dono muda isto.' : 'Só o dono e o gerente mexem no cardápio.',
    };
  }
  return { tipo: 'ok' as const, restaurante, supabase };
}

function feito(slug: string, id?: string): Resultado {
  revalidatePath('/painel/cardapio');
  revalidatePath(`/${slug}`);
  return { ok: true, id };
}

function primeiroErro(e: z.ZodError) {
  return e.issues[0]?.message ?? 'Os dados não estão certos.';
}

/* ------------------------------------------------------------------ */
/* Opções dos pratos                                                   */
/* ------------------------------------------------------------------ */

const EM_INGLES = z
  .string()
  .trim()
  .max(40)
  .nullish()
  .transform((v) => v || null);

const OPCAO = z.object({
  id: z.uuid().optional(),
  nome: z.string().trim().min(1, { error: 'Dê um nome a cada opção.' }).max(40),
  nome_en: EM_INGLES,
  preco: z.coerce.number().min(0, { error: 'O preço não pode ser negativo.' }).max(10_000_000),
  disponivel: z.boolean().default(true),
});

const GRUPO = z
  .object({
    itemId: ID,
    id: z.uuid().optional(),
    nome: z.string().trim().min(1, { error: 'Dê um nome ao grupo — "Tamanho", "Extras".' }).max(40),
    nome_en: EM_INGLES,
    tipo: z.enum(['variante', 'extra']),
    minimo: z.coerce.number().int().min(0).max(20),
    maximo: z.coerce.number().int().min(1).max(20),
    opcoes: z
      .array(OPCAO)
      .min(1, { error: 'Um grupo precisa de pelo menos uma opção.' })
      .max(20, { error: 'No máximo 20 opções por grupo.' }),
  })
  .transform((g) =>
    // O tamanho é sempre um, e é obrigatório: é o que faz dele um tamanho.
    g.tipo === 'variante' ? { ...g, minimo: 1, maximo: 1 } : g,
  )
  .refine((g) => g.minimo <= g.maximo, { error: 'O mínimo não pode passar do máximo.' })
  .refine((g) => g.tipo === 'variante' || g.maximo <= g.opcoes.length, {
    error: 'O máximo não pode ser maior do que o número de opções.',
  });

export async function guardarGrupo(entrada: unknown): Promise<Resultado> {
  const dados = GRUPO.safeParse(entrada);
  if (!dados.success) return { ok: false, erro: primeiroErro(dados.error) };

  const acesso = await autorizar('opcoes');
  if (acesso.tipo === 'demonstracao') return { ok: true, demonstracao: true };
  if (acesso.tipo === 'erro') return { ok: false, erro: acesso.erro };
  const { supabase, restaurante } = acesso;
  const g = dados.data;

  // O prato tem de ser desta casa.
  const { data: prato } = await supabase
    .from('items')
    .select('id, categories!inner(restaurant_id)')
    .eq('id', g.itemId)
    .eq('categories.restaurant_id', restaurante.id)
    .maybeSingle();
  if (!prato) return { ok: false, erro: 'Esse prato não é desta casa.' };

  const linha = { item_id: g.itemId, nome: g.nome, nome_en: g.nome_en, tipo: g.tipo, minimo: g.minimo, maximo: g.maximo };

  let grupoId = g.id;
  if (grupoId) {
    const { error } = await supabase
      .from('grupos_opcoes')
      .update(linha)
      .eq('id', grupoId)
      .eq('restaurante_id', restaurante.id);
    if (error) return { ok: false, erro: traduzir(error) };
  } else {
    // A casa escreve-a o gatilho, a partir do prato; esta é só a forma.
    const { data, error } = await supabase
      .from('grupos_opcoes')
      .insert({ ...linha, restaurante_id: restaurante.id, ordem: 99 })
      .select('id')
      .single();
    if (error || !data) return { ok: false, erro: traduzir(error) };
    grupoId = data.id as string;
  }

  // As opções: as que saíram apagam-se, as que ficaram actualizam-se, as
  // novas entram — pela ordem em que estão no ecrã.
  const { data: existentes } = await supabase.from('opcoes').select('id').eq('grupo_id', grupoId);
  const ficam = new Set(g.opcoes.map((o) => o.id).filter(Boolean));
  const saem = (existentes ?? []).map((o) => o.id as string).filter((id) => !ficam.has(id));
  if (saem.length) {
    const { error } = await supabase.from('opcoes').delete().in('id', saem).eq('grupo_id', grupoId);
    if (error) return { ok: false, erro: traduzir(error) };
  }

  for (const [ordem, opcao] of g.opcoes.entries()) {
    const campos = {
      nome: opcao.nome,
      nome_en: opcao.nome_en,
      preco: Math.round(opcao.preco * 100) / 100,
      disponivel: opcao.disponivel,
      ordem,
    };
    const { error } = opcao.id
      ? await supabase.from('opcoes').update(campos).eq('id', opcao.id).eq('grupo_id', grupoId)
      : await supabase.from('opcoes').insert({ ...campos, grupo_id: grupoId, restaurante_id: restaurante.id });
    if (error) return { ok: false, erro: traduzir(error) };
  }

  return feito(restaurante.slug, grupoId);
}

export async function apagarGrupo(entrada: unknown): Promise<Resultado> {
  const dados = z.object({ id: ID }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: primeiroErro(dados.error) };

  const acesso = await autorizar('opcoes');
  if (acesso.tipo === 'demonstracao') return { ok: true, demonstracao: true };
  if (acesso.tipo === 'erro') return { ok: false, erro: acesso.erro };

  const { error } = await acesso.supabase
    .from('grupos_opcoes')
    .delete()
    .eq('id', dados.data.id)
    .eq('restaurante_id', acesso.restaurante.id);
  if (error) return { ok: false, erro: traduzir(error) };
  return feito(acesso.restaurante.slug);
}

/* ------------------------------------------------------------------ */
/* Horários                                                            */
/* ------------------------------------------------------------------ */

const HORA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Escreva as horas como 12:00.' });

const MENU = z
  .object({
    id: z.uuid().optional(),
    nome: z.string().trim().min(1, { error: 'Dê um nome ao horário — "Almoço", "Jantar".' }).max(40),
    nome_en: EM_INGLES,
    hora_inicio: HORA,
    hora_fim: HORA,
    dias: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, { error: 'Escolha pelo menos um dia.' })
      .max(7),
  })
  .refine((m) => m.hora_inicio !== m.hora_fim, { error: 'O início e o fim não podem ser à mesma hora.' });

export async function guardarMenu(entrada: unknown): Promise<Resultado> {
  const dados = MENU.safeParse(entrada);
  if (!dados.success) return { ok: false, erro: primeiroErro(dados.error) };

  const acesso = await autorizar('menus_horario');
  if (acesso.tipo === 'demonstracao') return { ok: true, demonstracao: true };
  if (acesso.tipo === 'erro') return { ok: false, erro: acesso.erro };

  const { id, ...campos } = dados.data;
  const linha = { ...campos, dias: [...new Set(campos.dias)].sort() };

  if (id) {
    const { error } = await acesso.supabase
      .from('menus_horario')
      .update(linha)
      .eq('id', id)
      .eq('restaurante_id', acesso.restaurante.id);
    if (error) return { ok: false, erro: traduzir(error) };
    return feito(acesso.restaurante.slug, id);
  }

  const { data, error } = await acesso.supabase
    .from('menus_horario')
    .insert({ ...linha, restaurante_id: acesso.restaurante.id })
    .select('id')
    .single();
  if (error || !data) return { ok: false, erro: traduzir(error) };
  return feito(acesso.restaurante.slug, data.id as string);
}

export async function apagarMenu(entrada: unknown): Promise<Resultado> {
  const dados = z.object({ id: ID }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: primeiroErro(dados.error) };

  const acesso = await autorizar('menus_horario');
  if (acesso.tipo === 'demonstracao') return { ok: true, demonstracao: true };
  if (acesso.tipo === 'erro') return { ok: false, erro: acesso.erro };

  // As categorias deste horário ficam "sempre" — a base põe-nas a nulo.
  const { error } = await acesso.supabase
    .from('menus_horario')
    .delete()
    .eq('id', dados.data.id)
    .eq('restaurante_id', acesso.restaurante.id);
  if (error) return { ok: false, erro: traduzir(error) };
  return feito(acesso.restaurante.slug);
}

export async function atribuirMenu(entrada: unknown): Promise<Resultado> {
  const dados = z.object({ categoriaId: ID, menuId: z.uuid().nullable() }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: primeiroErro(dados.error) };

  const acesso = await autorizar('menus_horario');
  if (acesso.tipo === 'demonstracao') return { ok: true, demonstracao: true };
  if (acesso.tipo === 'erro') return { ok: false, erro: acesso.erro };

  const { error } = await acesso.supabase
    .from('categories')
    .update({ menu_id: dados.data.menuId })
    .eq('id', dados.data.categoriaId)
    .eq('restaurant_id', acesso.restaurante.id);
  if (error) return { ok: false, erro: traduzir(error) };
  return feito(acesso.restaurante.slug);
}

/* ------------------------------------------------------------------ */
/* O esgotado                                                          */
/* ------------------------------------------------------------------ */

export async function mudarModoEsgotado(entrada: unknown): Promise<Resultado> {
  const dados = z.object({ modo: z.enum(['mostrar', 'esconder']) }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: primeiroErro(dados.error) };

  // É uma definição da casa, e a casa só o dono a muda.
  const acesso = await autorizar('esgotado_ao_vivo', true);
  if (acesso.tipo === 'demonstracao') return { ok: true, demonstracao: true };
  if (acesso.tipo === 'erro') return { ok: false, erro: acesso.erro };

  const { error } = await acesso.supabase
    .from('restaurants')
    .update({ esgotado_modo: dados.data.modo })
    .eq('id', acesso.restaurante.id);
  if (error) return { ok: false, erro: traduzir(error) };
  return feito(acesso.restaurante.slug);
}

/* ------------------------------------------------------------------ */
/* O inglês                                                            */
/* ------------------------------------------------------------------ */

export async function nomeDaCategoriaEmIngles(entrada: unknown): Promise<Resultado> {
  const dados = z.object({ categoriaId: ID, nome_en: z.string().trim().max(60) }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: primeiroErro(dados.error) };

  const acesso = await autorizar('multi_idioma');
  if (acesso.tipo === 'demonstracao') return { ok: true, demonstracao: true };
  if (acesso.tipo === 'erro') return { ok: false, erro: acesso.erro };

  const { error } = await acesso.supabase
    .from('categories')
    .update({ nome_en: dados.data.nome_en || null })
    .eq('id', dados.data.categoriaId)
    .eq('restaurant_id', acesso.restaurante.id);
  if (error) return { ok: false, erro: traduzir(error) };
  return feito(acesso.restaurante.slug);
}

export type ResultadoTraducao = { ok: true; traducoes: string[] } | { ok: false; erro: string };

/** Traduz textos soltos, para o editor preencher — não grava nada. */
export async function traduzirTextos(entrada: unknown): Promise<ResultadoTraducao> {
  const dados = z.object({ textos: z.array(z.string().max(300)).min(1).max(40) }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: 'Não há nada para traduzir.' };

  const acesso = await autorizar('multi_idioma');
  if (acesso.tipo === 'demonstracao') return { ok: false, erro: 'Na demonstração não se traduz — nada é gravado.' };
  if (acesso.tipo === 'erro') return { ok: false, erro: acesso.erro };

  return traduzirParaIngles(dados.data.textos);
}

type Tarefa = { tabela: 'categories' | 'items' | 'grupos_opcoes' | 'opcoes' | 'menus_horario'; id: string; coluna: 'nome_en' | 'descricao_en'; texto: string };

type LinhaCategoria = {
  id: string;
  nome: string;
  nome_en: string | null;
  itens: { id: string; nome: string; nome_en: string | null; descricao: string | null; descricao_en: string | null }[] | null;
};

const LIMITE: Record<Tarefa['tabela'], number> = {
  categories: 60,
  items: 80,
  grupos_opcoes: 40,
  opcoes: 40,
  menus_horario: 40,
};

/**
 * Traduz tudo o que ainda não tem inglês, e grava.
 *
 * Só toca no que está vazio: o que o dono já escreveu ou corrigiu à mão
 * fica como está. Carregar duas vezes não estraga nada — da segunda já
 * não há nada por traduzir.
 */
export async function traduzirCardapioTodo(): Promise<
  { ok: true; traduzidos: number } | { ok: false; erro: string }
> {
  const acesso = await autorizar('multi_idioma');
  if (acesso.tipo === 'demonstracao') return { ok: false, erro: 'Na demonstração não se traduz — nada é gravado.' };
  if (acesso.tipo === 'erro') return { ok: false, erro: acesso.erro };
  const { supabase, restaurante } = acesso;

  const [{ data: categorias }, { data: grupos }, { data: opcoes }, { data: menus }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, nome, nome_en, itens:items (id, nome, nome_en, descricao, descricao_en)')
      .eq('restaurant_id', restaurante.id),
    supabase.from('grupos_opcoes').select('id, nome, nome_en').eq('restaurante_id', restaurante.id),
    supabase.from('opcoes').select('id, nome, nome_en').eq('restaurante_id', restaurante.id),
    supabase.from('menus_horario').select('id, nome, nome_en').eq('restaurante_id', restaurante.id),
  ]);

  const tarefas: Tarefa[] = [];
  const falta = (v: unknown) => typeof v !== 'string' || !v.trim();

  for (const c of (categorias ?? []) as unknown as LinhaCategoria[]) {
    if (falta(c.nome_en)) tarefas.push({ tabela: 'categories', id: c.id, coluna: 'nome_en', texto: c.nome });
    for (const i of c.itens ?? []) {
      if (falta(i.nome_en)) tarefas.push({ tabela: 'items', id: i.id, coluna: 'nome_en', texto: i.nome });
      if (i.descricao && falta(i.descricao_en)) {
        tarefas.push({ tabela: 'items', id: i.id, coluna: 'descricao_en', texto: i.descricao });
      }
    }
  }
  const soltas: [Tarefa['tabela'], unknown][] = [
    ['grupos_opcoes', grupos],
    ['opcoes', opcoes],
    ['menus_horario', menus],
  ];
  for (const [tabela, linhas] of soltas) {
    for (const l of (linhas ?? []) as { id: string; nome: string; nome_en: string | null }[]) {
      if (falta(l.nome_en)) tarefas.push({ tabela, id: l.id, coluna: 'nome_en', texto: l.nome });
    }
  }

  if (!tarefas.length) return { ok: true, traduzidos: 0 };

  const resultado = await traduzirParaIngles(tarefas.map((t) => t.texto));
  if (!resultado.ok) return { ok: false, erro: resultado.erro };

  // Grava uma a uma; a casa entra no filtro das tabelas que a têm.
  let traduzidos = 0;
  for (const [n, tarefa] of tarefas.entries()) {
    const limite = tarefa.coluna === 'descricao_en' ? 200 : LIMITE[tarefa.tabela];
    const en = resultado.traducoes[n]?.slice(0, limite);
    if (!en) continue;

    let consulta = supabase.from(tarefa.tabela).update({ [tarefa.coluna]: en }).eq('id', tarefa.id);
    if (tarefa.tabela === 'categories') consulta = consulta.eq('restaurant_id', restaurante.id);
    else if (tarefa.tabela !== 'items') consulta = consulta.eq('restaurante_id', restaurante.id);
    const { error } = await consulta;
    if (!error) traduzidos += 1;
  }

  feito(restaurante.slug);
  return { ok: true, traduzidos };
}

/* ------------------------------------------------------------------ */

/** O erro da base, dito em português de quem gere uma casa. */
function traduzir(erro: { code?: string; message?: string } | null) {
  if (!erro) return 'Não foi possível guardar. Tente outra vez.';
  if (erro.code === '23505') return 'Este prato já tem um grupo de tamanhos. Um prato só tem um.';
  if (erro.code === '42501') return 'Não tem permissão para isto nesta casa.';
  if (erro.code === '23514') return 'Há um valor que não faz sentido. Confira os números e as horas.';
  console.error('[cardapio-sala]', erro.code, erro.message);
  return 'Não foi possível guardar. Tente outra vez.';
}
