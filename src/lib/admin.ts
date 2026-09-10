import 'server-only';
import { clienteAdministrador, servicoConfigurado } from './supabase/administrador';
import { utilizadorActual } from './supabase/servidor';
import type { Plano } from './tipos';

/**
 * Painel administrativo — quem entra e o que vê.
 *
 * Quem é administrador vem de uma variável de ambiente, não da base de
 * dados, e de propósito: se a lista vivesse numa tabela, precisaria de
 * um ecrã para a editar, e esse ecrã seria a forma mais fácil de alguém
 * se promover a si próprio. Para acrescentar um administrador é preciso
 * mexer no ambiente e voltar a fazer deploy — devagar, e com rasto.
 */

function listaDeAdministradores() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function haAdministradoresDefinidos() {
  return listaDeAdministradores().length > 0;
}

/**
 * O email vem da sessão validada pelo Supabase, nunca do cliente.
 * Sem lista definida ninguém é administrador — um painel destes com a
 * porta aberta por omissão seria pior do que não existir.
 */
export async function eAdministrador() {
  const admins = listaDeAdministradores();
  if (!admins.length) return false;

  const utilizador = await utilizadorActual();
  const email = utilizador?.email?.toLowerCase();
  return Boolean(email && admins.includes(email));
}

/** Barreira para usar no início de cada acção do servidor. */
export async function exigirAdministrador() {
  if (!(await eAdministrador())) throw new Error('Sem autorização.');
}

/* ------------------------------------------------------------------ */

export type ContaAdmin = {
  id: string;
  nome: string;
  slug: string;
  plano: Plano;
  activo: boolean;
  criadoEm: string;
  email: string | null;
  ultimaEntrada: string | null;
  mesas: number;
  pratos: number;
  pedidos30Dias: number;
  testeTerminaEm: string | null;
  pagoAte: string | null;
  acessoExpiraEm: string | null;
  whatsapp: string;
  /** Última batida do painel. É por aqui que se sabe quem sumiu. */
  vistoEm: string | null;
};

export type ResumoAdmin = {
  contas: ContaAdmin[];
  totalPedidos30Dias: number;
  semServico: boolean;
};

/**
 * Lê tudo com a chave de serviço, porque tem de atravessar a RLS de
 * todos os donos. Só é chamada depois de `eAdministrador()` passar.
 */
export async function resumoAdministrativo(): Promise<ResumoAdmin> {
  if (!servicoConfigurado()) {
    return { contas: [], totalPedidos30Dias: 0, semServico: true };
  }

  const supabase = clienteAdministrador()!;
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [restaurantes, utilizadores] = await Promise.all([
    supabase
      .from('restaurants')
      .select(
        'id, nome, slug, plano, activo, owner_id, created_at, whatsapp, teste_termina_em, pago_ate, acesso_expira_em, visto_em',
      )
      .order('created_at', { ascending: false }),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const linhas = (restaurantes.data ?? []) as {
    id: string;
    nome: string;
    slug: string;
    plano: Plano;
    activo: boolean;
    owner_id: string;
    created_at: string;
    whatsapp: string;
    teste_termina_em: string | null;
    pago_ate: string | null;
    acesso_expira_em: string | null;
    visto_em: string | null;
  }[];

  const porDono = new Map(
    (utilizadores.data?.users ?? []).map((u) => [
      u.id,
      { email: u.email ?? null, ultimaEntrada: u.last_sign_in_at ?? null },
    ]),
  );

  // Uma consulta por restaurante seria N+1; contamos tudo de uma vez e
  // agrupamos em memória.
  const ids = linhas.map((l) => l.id);
  const [mesas, categorias, pedidos] = await Promise.all([
    supabase.from('tables').select('restaurant_id').in('restaurant_id', ids),
    supabase.from('categories').select('id, restaurant_id').in('restaurant_id', ids),
    supabase
      .from('orders')
      .select('restaurant_id')
      .in('restaurant_id', ids)
      .gte('created_at', desde),
  ]);

  const categoriasPorRestaurante = new Map<string, string[]>();
  for (const c of (categorias.data ?? []) as { id: string; restaurant_id: string }[]) {
    const lista = categoriasPorRestaurante.get(c.restaurant_id) ?? [];
    lista.push(c.id);
    categoriasPorRestaurante.set(c.restaurant_id, lista);
  }

  const idsCategorias = [...categoriasPorRestaurante.values()].flat();
  const { data: itens } = idsCategorias.length
    ? await supabase.from('items').select('category_id').in('category_id', idsCategorias)
    : { data: [] };

  const pratosPorCategoria = contar((itens ?? []).map((i) => (i as { category_id: string }).category_id));
  const mesasPorRestaurante = contar(
    ((mesas.data ?? []) as { restaurant_id: string }[]).map((m) => m.restaurant_id),
  );
  const pedidosPorRestaurante = contar(
    ((pedidos.data ?? []) as { restaurant_id: string }[]).map((p) => p.restaurant_id),
  );

  const contas: ContaAdmin[] = linhas.map((linha) => {
    const dono = porDono.get(linha.owner_id);
    const suasCategorias = categoriasPorRestaurante.get(linha.id) ?? [];

    return {
      id: linha.id,
      nome: linha.nome,
      slug: linha.slug,
      plano: linha.plano,
      activo: linha.activo,
      criadoEm: linha.created_at,
      email: dono?.email ?? null,
      ultimaEntrada: dono?.ultimaEntrada ?? null,
      mesas: mesasPorRestaurante.get(linha.id) ?? 0,
      pratos: suasCategorias.reduce((s, id) => s + (pratosPorCategoria.get(id) ?? 0), 0),
      pedidos30Dias: pedidosPorRestaurante.get(linha.id) ?? 0,
      testeTerminaEm: linha.teste_termina_em ?? null,
      pagoAte: linha.pago_ate ?? null,
      acessoExpiraEm: linha.acesso_expira_em ?? null,
      whatsapp: linha.whatsapp,
      vistoEm: linha.visto_em ?? null,
    };
  });

  return {
    contas,
    totalPedidos30Dias: contas.reduce((s, c) => s + c.pedidos30Dias, 0),
    semServico: false,
  };
}

function contar(chaves: string[]) {
  const mapa = new Map<string, number>();
  for (const chave of chaves) mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  return mapa;
}

/* ------------------------------------------------------------------ */
/* Os números do painel                                                */
/* ------------------------------------------------------------------ */

export type DiaDePedidos = { dia: string; total: number; valor: number };

export type LinhaDeAuditoria = {
  id: string;
  quem: string;
  accao: string;
  restauranteNome: string | null;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  quando: string;
};

export type MetricasAdmin = {
  serie: DiaDePedidos[];
  auditoria: LinhaDeAuditoria[];
};

/**
 * A série e o livro, numa ida só.
 *
 * A série vem contada pela base. Trazer os pedidos todos para memória
 * só para os agrupar por dia funcionava com doze pedidos e deixava de
 * funcionar muito antes de valer a pena arranjar.
 */
export async function metricasAdmin(dias = 30): Promise<MetricasAdmin> {
  const supabase = clienteAdministrador();
  if (!supabase) return { serie: [], auditoria: [] };

  const comRpc = supabase as unknown as {
    rpc: (nome: string, argumentos?: Record<string, unknown>) => Promise<{ data: unknown }>;
  };

  const [serieBruta, livro] = await Promise.all([
    comRpc.rpc('pedidos_por_dia', { dias }),
    supabase.from('auditoria').select('*').order('quando', { ascending: false }).limit(40),
  ]);

  const serie = ((serieBruta.data ?? []) as {
    dia: string;
    total: number | string;
    valor: number | string;
  }[]).map((d) => ({
    dia: d.dia,
    total: Number(d.total) || 0,
    valor: Number(d.valor) || 0,
  }));

  const auditoria = ((livro.data ?? []) as {
    id: string;
    quem: string;
    accao: string;
    restaurante_nome: string | null;
    antes: Record<string, unknown> | null;
    depois: Record<string, unknown> | null;
    quando: string;
  }[]).map((l) => ({
    id: l.id,
    quem: l.quem,
    accao: l.accao,
    restauranteNome: l.restaurante_nome,
    antes: l.antes,
    depois: l.depois,
    quando: l.quando,
  }));

  return { serie, auditoria };
}

/* ------------------------------------------------------------------ */
/* O livro dos pagamentos                                              */
/* ------------------------------------------------------------------ */

export type LinhaDePagamento = {
  id: string;
  restauranteId: string | null;
  restauranteNome: string | null;
  tipo: string;
  email: string | null;
  plano: Plano | null;
  valor: number | null;
  nota: string | null;
  quando: string;
  /** Entrou dinheiro e não abriu conta nenhuma. É o que precisa de mão. */
  orfao: boolean;
};

/**
 * Todos os avisos de pagamento que entraram, e o que cada um fez.
 *
 * Existe por causa de uma avaria que é a mais provável de todas, porque
 * é a mais humana: pagar na Kursinha com um email e ter a conta do
 * Cardapp noutro. O webhook faz o que deve — grava, não abre nada a
 * ninguém, e escreve porquê — mas até aqui isso ficava só na base de
 * dados, e ninguém vai à base de dados ver se alguém pagou.
 *
 * Um pagamento que entrou e não abriu a porta é dinheiro recebido com o
 * serviço por entregar. Tem de estar à vista.
 */
export async function pagamentosRecentes(limite = 40): Promise<LinhaDePagamento[]> {
  const supabase = clienteAdministrador();
  if (!supabase) return [];

  const { data } = await supabase
    .from('pagamentos')
    .select('id, restaurant_id, tipo, email, plano, valor, nota, criado_em')
    .order('criado_em', { ascending: false })
    .limit(limite);

  const linhas = (data ?? []) as {
    id: string;
    restaurant_id: string | null;
    tipo: string;
    email: string | null;
    plano: Plano | null;
    valor: number | string | null;
    nota: string | null;
    criado_em: string;
  }[];

  if (!linhas.length) return [];

  // Os nomes numa ida só. Uma consulta por linha seria N+1 num sítio
  // onde N cresce com as vendas, que é justamente o que se quer que
  // cresça.
  const ids = [...new Set(linhas.map((l) => l.restaurant_id).filter(Boolean))] as string[];
  const { data: casas } = ids.length
    ? await supabase.from('restaurants').select('id, nome').in('id', ids)
    : { data: [] };

  const nomes = new Map(
    ((casas ?? []) as { id: string; nome: string }[]).map((c) => [c.id, c.nome]),
  );

  return linhas.map((l) => ({
    id: l.id,
    restauranteId: l.restaurant_id,
    restauranteNome: l.restaurant_id ? nomes.get(l.restaurant_id) ?? null : null,
    tipo: l.tipo,
    email: l.email,
    plano: l.plano,
    valor: l.valor == null ? null : Number(l.valor),
    nota: l.nota,
    quando: l.criado_em,
    orfao: !l.restaurant_id && l.tipo !== 'reembolsado',
  }));
}
