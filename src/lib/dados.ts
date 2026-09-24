import 'server-only';
import { clienteServidor } from './supabase/servidor';
import { SEGUNDOS_DE_CARDAPIO, clientePublico } from './supabase/publico';
import { supabaseConfigurado } from './supabase/config';
import {
  CARDAPIO_DEMO,
  MESAS_DEMO,
  PEDIDOS_DEMO,
  RESTAURANTE_DEMO,
} from '@/data/demo';
import type {
  CategoriaComPratos,
  ItemPedido,
  MenuHorario,
  Prato,
  MesaNoSalao,
  Membro,
  Mesa,
  Pedido,
  PedidoPublico,
  Restaurante,
} from './tipos';
import { ePapel, type Papel } from './papeis';
import {
  montarSalao,
  type LinhaAlerta,
  type LinhaMesa,
  type LinhaPedido,
  type LinhaSessao,
} from './salao';

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
  'id, nome, slug, logo_url, capa_url, whatsapp, cor_marca, plano, activo, modo_pedido, teste_termina_em, pago_ate, acesso_expira_em, esgotado_modo';

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
  return {
    ...r,
    capa_url: r.capa_url ?? null,
    modo_pedido: r.modo_pedido ?? 'whatsapp',
    // Sem data, conta como em teste — nunca como expirado. Trancar uma
    // casa por causa de uma coluna que ainda não existe seria o pior
    // resultado possível de um deploy à frente da migração.
    teste_termina_em: r.teste_termina_em ?? null,
    pago_ate: r.pago_ate ?? null,
    acesso_expira_em: r.acesso_expira_em ?? null,
    esgotado_modo: r.esgotado_modo === 'esconder' ? 'esconder' : 'mostrar',
  };
}

export async function obterRestaurantePorSlug(slug: string): Promise<Restaurante | null> {
  const supabase = clientePublico(SEGUNDOS_DE_CARDAPIO);
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

export async function obterCardapio(
  restaurantId: string,
  opcoes: { doPainel?: boolean } = {},
): Promise<CategoriaComPratos[]> {
  if (eDemonstracao(restaurantId)) return CARDAPIO_DEMO;

  /*
   * O painel lê com a sessão de quem está ligado, e vê as categorias
   * vazias — é lá que se lhes põem pratos. O cardápio público lê sem
   * sessão e esconde-as: uma categoria sem nada é um título a mais.
   *
   * Antes o painel lia pela porta pública, e uma categoria acabada de
   * criar desaparecia ao recarregar a página, por ainda não ter pratos.
   */
  const supabase = opcoes.doPainel ? await clienteServidor() : clientePublico(SEGUNDOS_DE_CARDAPIO);
  if (!supabase) return CARDAPIO_DEMO;

  const completa = await supabase
    .from('categories')
    .select(`id, restaurant_id, nome, nome_en, ordem, menu_id, itens:items (${COLUNAS_PRATO}, grupos:grupos_opcoes (${COLUNAS_GRUPO}))`)
    .eq('restaurant_id', restaurantId)
    .order('ordem', { ascending: true });

  let data: unknown = completa.data;

  // Uma base sem a migração da fase 3 continua a servir o cardápio de sempre.
  if (completa.error && (faltaUmaColunaNova(completa.error) || completa.error.code === 'PGRST200')) {
    const curta = await supabase
      .from('categories')
      .select('id, restaurant_id, nome, ordem, itens:items (id, category_id, nome, descricao, preco, foto_url, disponivel, ordem)')
      .eq('restaurant_id', restaurantId)
      .order('ordem', { ascending: true });
    data = curta.data;
  }

  if (!Array.isArray(data)) return [];

  const categorias = (data as CategoriaComPratos[]).map((categoria) => ({
    ...categoria,
    menu_id: categoria.menu_id ?? null,
    itens: [...(categoria.itens ?? [])]
      .map(limparPrato)
      .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt')),
  }));

  return opcoes.doPainel ? categorias : categorias.filter((categoria) => categoria.itens.length > 0);
}

const COLUNAS_PRATO =
  'id, category_id, nome, descricao, preco, foto_url, disponivel, ordem, preco_promocional, promo_inicio, promo_fim, prato_do_dia, nome_en, descricao_en';
const COLUNAS_GRUPO = 'id, nome, nome_en, tipo, minimo, maximo, ordem, opcoes (id, nome, nome_en, preco, disponivel, ordem)';

/** Números que vêm da base como texto passam a número; as listas vêm por ordem. */
function limparPrato(item: Prato): Prato {
  return {
    ...item,
    preco: numeroSeguro(item.preco),
    preco_promocional: item.preco_promocional == null ? null : numeroSeguro(item.preco_promocional),
    promo_inicio: item.promo_inicio ?? null,
    promo_fim: item.promo_fim ?? null,
    prato_do_dia: Boolean(item.prato_do_dia),
    grupos: [...(item.grupos ?? [])]
      .map((g) => ({
        ...g,
        opcoes: [...(g.opcoes ?? [])]
          .map((o) => ({ ...o, preco: numeroSeguro(o.preco) }))
          .sort((a, b) => a.ordem - b.ordem),
      }))
      .sort((a, b) => a.ordem - b.ordem),
  };
}

/** Os horários de uma casa. Sem a tabela, não há horários — e tudo aparece. */
export async function obterMenus(restaurantId: string): Promise<MenuHorario[]> {
  if (eDemonstracao(restaurantId)) return MENUS_DEMO;
  const supabase = clientePublico(SEGUNDOS_DE_CARDAPIO);
  if (!supabase) return MENUS_DEMO;

  const { data } = await supabase
    .from('menus_horario')
    .select('id, nome, nome_en, hora_inicio, hora_fim, dias, ordem')
    .eq('restaurante_id', restaurantId)
    .order('ordem', { ascending: true });

  return (data as MenuHorario[] | null) ?? [];
}

/**
 * Um almoço de dias úteis, para a demonstração mostrar o que é um horário.
 * Nenhuma categoria de exemplo está presa a ele: o cardápio de exemplo
 * aparece inteiro a toda a hora, que é o que se quer de uma montra.
 */
const MENUS_DEMO: MenuHorario[] = [
  { id: 'demo-almoco', nome: 'Almoço', hora_inicio: '12:00', hora_fim: '15:00', dias: [1, 2, 3, 4, 5], ordem: 0 },
];

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
  /*
   * Em auditoria, a "casa do dono" é a casa em que se entrou.
   *
   * Fica aqui e não em cada ecrã porque o painel inteiro — cardápio,
   * mesas, pedidos, definições — pergunta por esta função e mais nada.
   * Um ecrã que se esquecesse mostraria a casa errada com a barra da
   * casa certa, que é a maneira mais fácil de alguém mexer no sítio
   * errado a pensar que está no seu.
   */
  const { casaEmAuditoria } = await import('./auditoria');
  const auditada = await casaEmAuditoria();

  if (auditada) {
    const { clienteAdministrador } = await import('./supabase/administrador');
    const servico = clienteAdministrador();
    if (servico) {
      const { data } = await servico
        .from('restaurants')
        .select(COLUNAS_RESTAURANTE)
        .eq('id', auditada)
        .maybeSingle();
      return data ? comColunasNovas(data) : null;
    }
  }

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

  /*
   * Não é dono de casa nenhuma: pode ser da equipa de uma.
   *
   * O nome da função ficou o de sempre porque todo o painel a chama.
   * Um gerente ou um empregado precisa de ver a casa onde trabalha pelo
   * mesmo caminho que o dono — e é a base que decide o que ele pode
   * fazer lá dentro, não esta leitura.
   */
  if (!data) {
    const naEquipa = await casaDaEquipa(supabase);
    if (naEquipa) {
      ({ data } = await supabase
        .from('restaurants')
        .select(COLUNAS_RESTAURANTE)
        .eq('id', naEquipa.restauranteId)
        .maybeSingle());
    }
  }

  return data ? comColunasNovas(data) : null;
}

type ClienteDoServidor = NonNullable<Awaited<ReturnType<typeof clienteServidor>>>;

/** A casa e o papel de quem está ligado, segundo a base. */
async function casaDaEquipa(
  supabase: ClienteDoServidor,
): Promise<{ restauranteId: string; papel: Papel } | null> {
  // O construtor do Supabase é um PromiseLike: await sim, .catch não.
  const comRpc = supabase as unknown as {
    rpc: (nome: string) => PromiseLike<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await comRpc.rpc('o_meu_papel');
  if (error || !Array.isArray(data) || data.length === 0) return null;

  const linha = data[0] as { restaurante_id?: unknown; papel?: unknown };
  if (typeof linha.restaurante_id !== 'string' || !ePapel(linha.papel)) return null;
  return { restauranteId: linha.restaurante_id, papel: linha.papel };
}

/**
 * O papel de quem está no painel.
 *
 * Na demonstração e em auditoria é sempre o de dono: quem demonstra
 * mostra tudo, e quem audita entrou para ver a casa como o dono a vê.
 * Quem ainda não tem casa nem equipa também conta como dono — é alguém
 * a caminho de criar a sua.
 */
export async function obterPapelNoPainel(): Promise<Papel> {
  const { casaEmAuditoria } = await import('./auditoria');
  if (await casaEmAuditoria()) return 'dono';

  const supabase = await clienteServidor();
  if (!supabase) return 'dono';

  const naCasa = await casaDaEquipa(supabase);
  return naCasa?.papel ?? 'dono';
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
      'id, restaurant_id, table_id, itens, total, created_at, estado, actualizado_em, observacao, confirmado_em, tables (numero)',
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
 * Pedidos entre duas datas — o que a dashboard lê.
 *
 * Uma consulta só para as duas janelas (a do período e a anterior, com
 * que se compara): pede-se desde o início da mais antiga, e a separação
 * faz-se em memória, onde não custa nada. Duas consultas à base para o
 * mesmo ecrã seriam o dobro da espera para o mesmo resultado.
 */
export async function obterPedidosEntre(
  restaurantId: string,
  inicio: Date,
  fim: Date,
): Promise<Pedido[]> {
  const supabase = await clienteServidor();
  if (!supabase) return PEDIDOS_DEMO;

  const { data } = await supabase
    .from('orders')
    .select('id, restaurant_id, table_id, itens, total, created_at, estado, actualizado_em, tables (numero)')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', inicio.toISOString())
    .lt('created_at', fim.toISOString())
    .order('created_at', { ascending: true });

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

/**
 * A casa já enviou comprovativo e espera confirmação?
 *
 * Serve para o painel não dizer "está a acabar" a quem acabou de pagar.
 * Lê-se com a chave de serviço porque a resposta é sobre a casa de quem
 * pergunta e não precisa de mais nada — e sem chave devolve falso, que é
 * o lado seguro: no pior caso mostra-se o aviso a mais, nunca acesso a
 * mais.
 */
export async function comprovativoAEspera(restauranteId: string): Promise<boolean> {
  const { clienteAdministrador } = await import('./supabase/administrador');
  const supabase = clienteAdministrador();
  if (!supabase) return false;

  const { data } = await supabase
    .from('comprovativos')
    .select('id')
    .eq('restaurant_id', restauranteId)
    .eq('estado', 'a_espera')
    .limit(1);

  return Boolean((data ?? []).length);
}

/** A equipa de uma casa, por ordem de chegada. */
export async function obterMembros(restauranteId: string): Promise<Membro[]> {
  if (eDemonstracao(restauranteId)) return MEMBROS_DEMO;

  const supabase = await clienteServidor();
  if (!supabase) return MEMBROS_DEMO;

  const { data } = await supabase
    .from('membros')
    .select('id, email, nome, papel, convidado_em, aceite_em')
    .eq('restaurante_id', restauranteId)
    .order('convidado_em', { ascending: true });

  return (data as Membro[] | null) ?? [];
}

/** Uma equipa de exemplo, para a demonstração ter o ecrã cheio. */
const MEMBROS_DEMO: Membro[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    email: 'joana.gerente@exemplo.ao',
    nome: 'Joana Manuel',
    papel: 'gerente',
    convidado_em: '2026-09-01T10:00:00Z',
    aceite_em: '2026-09-01T12:30:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    email: 'paulo.sala@exemplo.ao',
    nome: 'Paulo Domingos',
    papel: 'empregado',
    convidado_em: '2026-09-03T09:00:00Z',
    aceite_em: '2026-09-03T18:10:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    email: 'cozinha@exemplo.ao',
    nome: null,
    papel: 'cozinha',
    convidado_em: '2026-09-18T08:00:00Z',
    aceite_em: null,
  },
];

/* ------------------------------------------------------------------ */
/* O salão                                                             */
/* ------------------------------------------------------------------ */

/**
 * O salão agora: cada mesa, a sessão viva, os pedidos dela e as chamadas
 * por atender.
 *
 * Quatro leituras pequenas em vez de uma junção grande: cada tabela tem a
 * sua política, e uma junção falha inteira se uma delas recusar. Assim um
 * empregado sem acesso a alguma coisa vê o resto.
 */
export async function obterSalao(restauranteId: string): Promise<MesaNoSalao[]> {
  if (eDemonstracao(restauranteId)) return salaoDeDemonstracao();

  const supabase = await clienteServidor();
  if (!supabase) return salaoDeDemonstracao();

  const [{ data: mesas }, { data: sessoes }, { data: alertas }] = await Promise.all([
    supabase.from('tables').select('id, numero').eq('restaurant_id', restauranteId),
    supabase
      .from('sessoes_mesa')
      .select('id, mesa_id, estado, aberta_em, conta_pedida_em, fechada_em, total_fecho')
      .eq('restaurante_id', restauranteId)
      .neq('estado', 'fechada'),
    supabase
      .from('alertas')
      .select('id, mesa_id, tipo, criado_em')
      .eq('restaurante_id', restauranteId)
      .is('atendido_em', null)
      // Uma chamada de ontem que ninguém marcou não é urgência de hoje.
      .gte('criado_em', new Date(Date.now() - 12 * 3_600_000).toISOString()),
  ]);

  const idsDasSessoes = (sessoes ?? []).map((s) => s.id as string);
  const { data: pedidos } = idsDasSessoes.length
    ? await supabase
        .from('orders')
        .select('id, sessao_id, itens, total, estado, created_at, observacao')
        .in('sessao_id', idsDasSessoes)
    : { data: [] };

  return montarSalao(
    (mesas as LinhaMesa[] | null) ?? [],
    (sessoes as LinhaSessao[] | null) ?? [],
    (pedidos as LinhaPedido[] | null) ?? [],
    (alertas as LinhaAlerta[] | null) ?? [],
  );
}

/** Um salão a meio de um almoço, para a demonstração. */
function salaoDeDemonstracao(): MesaNoSalao[] {
  const agora = Date.now();
  const ha = (minutos: number) => new Date(agora - minutos * 60_000).toISOString();

  const mesas: LinhaMesa[] = MESAS_DEMO.map((m) => ({ id: m.id, numero: m.numero }));
  const [m1, m2, m3, m4] = mesas;
  const sessoes: LinhaSessao[] = [];
  const pedidos: LinhaPedido[] = [];
  const alertas: LinhaAlerta[] = [];

  const pedido = (sessao: string, minutos: number, itens: ItemPedido[], estado: Pedido['estado'] = 'entregue') => {
    pedidos.push({
      id: `${sessao}-${minutos}`,
      sessao_id: sessao,
      itens,
      total: itens.reduce((s, i) => s + i.preco * i.qtd, 0),
      estado,
      created_at: ha(minutos),
      observacao: null,
    });
  };

  if (m1) {
    sessoes.push({ id: 's1', mesa_id: m1.id, estado: 'aberta', aberta_em: ha(42), conta_pedida_em: null, fechada_em: null, total_fecho: null });
    pedido('s1', 40, [{ nome: 'Cuca 33cl', qtd: 2, preco: 600, obs: null }]);
    pedido('s1', 35, [{ nome: 'Muamba de Galinha', qtd: 2, preco: 4500, obs: null }], 'preparar');
    alertas.push({ id: 'a1', mesa_id: m1.id, tipo: 'empregado', criado_em: ha(1) });
  }
  if (m2) {
    sessoes.push({ id: 's2', mesa_id: m2.id, estado: 'conta_pedida', aberta_em: ha(78), conta_pedida_em: ha(3), fechada_em: null, total_fecho: null });
    pedido('s2', 75, [{ nome: 'Mufete', qtd: 1, preco: 7500, obs: 'bem passado' }, { nome: 'Blue 33cl', qtd: 3, preco: 700, obs: null }]);
    alertas.push({ id: 'a2', mesa_id: m2.id, tipo: 'conta', criado_em: ha(3) });
  }
  if (m4) {
    sessoes.push({ id: 's4', mesa_id: m4.id, estado: 'a_limpar', aberta_em: ha(95), conta_pedida_em: ha(20), fechada_em: ha(8), total_fecho: 12400 });
  }
  void m3;

  return montarSalao(mesas, sessoes, pedidos, alertas);
}
