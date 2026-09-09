import 'server-only';
import { clienteServidor } from './supabase/servidor';
import { clientePublico } from './supabase/publico';
import { supabaseConfigurado } from './supabase/config';
import {
  CARDAPIO_DEMO,
  MESAS_DEMO,
  PEDIDOS_DEMO,
  RESTAURANTE_DEMO,
} from '@/data/demo';
import type {
  CategoriaComPratos,
  Mesa,
  Pedido,
  PedidoPublico,
  Restaurante,
} from './tipos';

/**
 * Camada de leitura do lado do servidor.
 *
 * Enquanto o Supabase nao estiver ligado, tudo responde com o restaurante
 * de demonstracao — assim os ecras sao navegaveis desde o primeiro minuto.
 * Com credenciais no ambiente, as mesmas funcoes passam a ler da base de
 * dados sem que as paginas mudem uma linha.
 */

export function emModoDemonstracao() {
  return !supabaseConfigurado();
}

function numeroSeguro(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------ */
/* Cardapio publico                                                     */
/* ------------------------------------------------------------------ */

/** O restaurante de exemplo tem um id que nunca é um uuid da base. */
export function eDemonstracao(restaurantId: string) {
  return restaurantId === RESTAURANTE_DEMO.id;
}

/**
 * Colunas do restaurante, na versão completa e na de recurso.
 *
 * Código e migrações não chegam ao mesmo tempo: houve um deploy que
 * lia `capa_url` antes de a coluna existir, e o painel inteiro deixou
 * de ver o restaurante — porque a consulta falhava toda, não só aquele
 * campo. As leituras recuam para a lista curta quando alguma das
 * colunas novas ainda não lá está, e cada uma aparece assim que a sua
 * migração correr. Um deploy à frente da base de dados degrada uma
 * funcionalidade, não a aplicação.
 */
const COLUNAS_RESTAURANTE =
  'id, nome, slug, logo_url, capa_url, whatsapp, cor_marca, plano, activo, modo_pedido';

/** As que existem desde o primeiro dia, e por isso nunca faltam. */
const COLUNAS_RESTAURANTE_BASE = 'id, nome, slug, logo_url, whatsapp, cor_marca, plano, activo';

function faltaUmaColunaNova(erro: { code?: string; message?: string } | null) {
  // 42703 = undefined_column, no PostgreSQL.
  return erro?.code === '42703';
}

/**
 * Preenche as colunas novas quando a linha veio sem elas.
 *
 * O `modo_pedido` recua para 'whatsapp', que é como a aplicação sempre
 * funcionou: uma casa que fique a ler de uma base antiga continua a
 * mandar os pedidos para onde já os mandava, em vez de os prender num
 * ecrã que ainda não existe do lado dela.
 */
function comColunasNovas(linha: unknown): Restaurante {
  const r = linha as Restaurante;
  return { ...r, capa_url: r.capa_url ?? null, modo_pedido: r.modo_pedido ?? 'whatsapp' };
}

export async function obterRestaurantePorSlug(slug: string): Promise<Restaurante | null> {
  const supabase = clientePublico();
  if (!supabase) {
    return slug === RESTAURANTE_DEMO.slug ? RESTAURANTE_DEMO : null;
  }

  let { data, error } = await supabase
    .from('restaurants')
    .select(COLUNAS_RESTAURANTE)
    .eq('slug', slug)
    .eq('activo', true)
    .maybeSingle();

  if (error && faltaUmaColunaNova(error)) {
    ({ data } = await supabase
      .from('restaurants')
      .select(COLUNAS_RESTAURANTE_BASE)
      .eq('slug', slug)
      .eq('activo', true)
      .maybeSingle());
  }

  if (data) return comColunasNovas(data);

  // A página inicial mostra este cardápio como exemplo vivo. Continua a
  // responder mesmo com o Supabase ligado — mas só enquanto ninguém
  // registar de facto este endereço, e aí manda a base de dados.
  return slug === RESTAURANTE_DEMO.slug ? RESTAURANTE_DEMO : null;
}

export async function obterCardapio(restaurantId: string): Promise<CategoriaComPratos[]> {
  if (eDemonstracao(restaurantId)) return CARDAPIO_DEMO;

  const supabase = clientePublico();
  if (!supabase) return CARDAPIO_DEMO;

  const { data } = await supabase
    .from('categories')
    .select(
      'id, restaurant_id, nome, ordem, itens:items (id, category_id, nome, descricao, preco, foto_url, disponivel, ordem)',
    )
    .eq('restaurant_id', restaurantId)
    .order('ordem', { ascending: true });

  if (!data) return [];

  return (data as CategoriaComPratos[])
    .map((categoria) => ({
      ...categoria,
      itens: [...(categoria.itens ?? [])]
        .map((item) => ({ ...item, preco: numeroSeguro(item.preco) }))
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt')),
    }))
    .filter((categoria) => categoria.itens.length > 0);
}

export async function obterMesaPorNumero(
  restaurantId: string,
  numero: number,
): Promise<Mesa | null> {
  if (eDemonstracao(restaurantId)) {
    return MESAS_DEMO.find((m) => m.numero === numero) ?? null;
  }

  const supabase = clientePublico();
  if (!supabase) return MESAS_DEMO.find((m) => m.numero === numero) ?? null;

  const { data } = await supabase
    .from('tables')
    .select('id, restaurant_id, numero, qr_token')
    .eq('restaurant_id', restaurantId)
    .eq('numero', numero)
    .maybeSingle();

  return (data as Mesa | null) ?? null;
}

/**
 * O pedido de um cliente que não tem sessão nenhuma.
 *
 * Passa pela função `pedido_publico` em vez de ler a tabela: uma
 * política de leitura pública sobre `orders` deixaria qualquer pessoa
 * listar os pedidos todos da casa, e o que se quer é dar uma linha a
 * quem tem o id dela.
 */
export async function obterPedidoPublico(id: string): Promise<PedidoPublico | null> {
  const supabase = clientePublico();
  if (!supabase) return null;

  // O cliente é criado sem tipos gerados do esquema, por isso o `rpc`
  // não conhece esta função. A assinatura declara-se aqui, à vista, em
  // vez de se calar o compilador com um `any`.
  //
  // O molde vai no cliente inteiro e não no método: tirar `supabase.rpc`
  // para uma variável desliga-o do `this` e rebenta lá dentro, num
  // `Cannot read properties of undefined`. A chamada tem de ficar presa
  // ao objecto.
  const comRpc = supabase as unknown as {
    rpc: (nome: string, argumentos: Record<string, unknown>) => Promise<{ data: unknown }>;
  };

  const { data } = await comRpc.rpc('pedido_publico', { pid: id });
  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha) return null;

  return { ...(linha as PedidoPublico), total: numeroSeguro((linha as PedidoPublico).total) };
}

/* ------------------------------------------------------------------ */
/* Painel                                                              */
/* ------------------------------------------------------------------ */

export async function obterRestauranteDoDono(): Promise<Restaurante | null> {
  const supabase = await clienteServidor();
  if (!supabase) return RESTAURANTE_DEMO;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let { data, error } = await supabase
    .from('restaurants')
    .select(COLUNAS_RESTAURANTE)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && faltaUmaColunaNova(error)) {
    ({ data } = await supabase
      .from('restaurants')
      .select(COLUNAS_RESTAURANTE_BASE)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle());
  }

  return data ? comColunasNovas(data) : null;
}

export async function obterMesas(restaurantId: string): Promise<Mesa[]> {
  const supabase = await clienteServidor();
  if (!supabase) return MESAS_DEMO;

  const { data } = await supabase
    .from('tables')
    .select('id, restaurant_id, numero, qr_token')
    .eq('restaurant_id', restaurantId)
    .order('numero', { ascending: true });

  return (data as Mesa[] | null) ?? [];
}

/** Pedidos desde a meia-noite de Luanda. */
export async function obterPedidosDeHoje(restaurantId: string): Promise<Pedido[]> {
  const supabase = await clienteServidor();
  if (!supabase) return PEDIDOS_DEMO;

  const inicio = inicioDoDiaEmLuanda();

  const { data } = await supabase
    .from('orders')
    .select(
      'id, restaurant_id, table_id, itens, total, created_at, estado, actualizado_em, tables (numero)',
    )
    .eq('restaurant_id', restaurantId)
    .gte('created_at', inicio.toISOString())
    .order('created_at', { ascending: false });

  if (!data) return [];

  return (data as unknown as (Pedido & { tables?: { numero: number } | null })[]).map((p) => ({
    ...p,
    total: numeroSeguro(p.total),
    mesa: p.tables?.numero ?? null,
  }));
}

/**
 * Meia-noite de hoje em Luanda (UTC+1), devolvida em UTC.
 * Angola nao muda a hora, por isso o desvio e sempre de uma hora.
 */
export function inicioDoDiaEmLuanda(agora: Date = new Date()) {
  const luanda = new Date(agora.getTime() + 60 * 60 * 1000);
  const meiaNoiteLuanda = Date.UTC(
    luanda.getUTCFullYear(),
    luanda.getUTCMonth(),
    luanda.getUTCDate(),
  );
  return new Date(meiaNoiteLuanda - 60 * 60 * 1000);
}
