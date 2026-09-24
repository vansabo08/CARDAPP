import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clienteServidor } from '@/lib/supabase/servidor';
import { clientePublico } from '@/lib/supabase/publico';
import { eDemonstracao, obterCardapio, obterRestaurantePorSlug } from '@/lib/dados';
import { contarLinha } from '@/lib/precos';
import type { ItemPedido, Prato } from '@/lib/tipos';

/**
 * Grava um pedido feito no cardápio público.
 *
 * O cliente não tem sessão — a política de RLS permite apenas o insert,
 * e só em restaurantes activos.
 *
 * O PREÇO É DA BASE, NÃO DO TELEMÓVEL. Até à fase 3 do Plano Sala, cada
 * linha trazia o preço que o cardápio mostrava, e o servidor somava-o
 * como vinha. Bastava mudar um número no pedido para jantar a zero
 * kwanzas. Agora a linha diz qual é o prato e que opções levou, e o
 * servidor vai buscar os preços à base e faz a conta — com a mesma
 * função (`contarLinha`) que o cardápio usa para mostrar o preço, para os
 * dois números nunca se desencontrarem.
 *
 * Os telemóveis com o cardápio antigo aberto ainda mandam só o nome.
 * Esses são procurados pelo nome, na mesma casa, e levam o preço da base
 * também — nunca o que vem de fora.
 */

const LINHA = z.object({
  item_id: z.string().trim().max(64).optional(),
  nome: z.string().trim().max(120).optional(),
  qtd: z.coerce.number().int().min(1).max(99),
  obs: z.string().trim().max(140).nullish(),
  opcao_ids: z.array(z.string().trim().max(64)).max(20).optional(),
  // Só se lê na demonstração, que não tem base para ir buscar preços.
  preco: z.coerce.number().min(0).optional(),
});

const PEDIDO = z.object({
  slug: z.string().trim().min(1).max(80),
  table_id: z.string().trim().max(64).nullish(),
  /* O número da mesa, lido do endereço pelo browser. É por aqui que a
     mesa chega desde que a página deixou de ler o endereço. */
  mesa: z.coerce.number().int().min(1).max(999).nullish(),
  itens: z.array(LINHA).min(1, { error: 'O pedido está vazio.' }).max(60),
  // Uma observação estragada não deita o pedido abaixo: ignora-se, e a
  // comida chega na mesma.
  observacao: z.unknown().optional(),
  // A língua das mensagens de erro. O pedido grava-se sempre em português.
});

function erro(mensagem: string, estado: number) {
  return NextResponse.json({ erro: mensagem }, { status: estado });
}

export async function POST(pedido: Request) {
  let corpo: unknown;
  try {
    corpo = await pedido.json();
  } catch {
    return erro('Pedido inválido.', 400);
  }

  const dados = PEDIDO.safeParse(corpo);
  if (!dados.success) return erro(dados.error.issues[0]?.message ?? 'Pedido inválido.', 400);

  const { slug, itens: linhas } = dados.data;

  const restaurante = await obterRestaurantePorSlug(slug);
  if (!restaurante) return erro('Restaurante não encontrado.', 404);

  const supabase = await clienteServidor();

  // O cardápio de exemplo da página inicial não tem linha na base de
  // dados: o pedido segue para o WhatsApp, mas não se grava nada.
  if (!supabase || eDemonstracao(restaurante.id)) {
    const total = linhas.reduce((s, l) => s + (l.preco ?? 0) * l.qtd, 0);
    return NextResponse.json({ ok: true, demonstracao: true, total });
  }

  /* ---------------------------------------------------------------- */
  /* A conta, feita aqui                                               */
  /* ---------------------------------------------------------------- */

  const cardapio = await obterCardapio(restaurante.id);
  const pratos = cardapio.flatMap((c) => c.itens);
  const porId = new Map(pratos.map((p) => [p.id, p]));
  const porNome = new Map(pratos.map((p) => [p.nome.trim().toLowerCase(), p]));
  const agora = Date.now();

  const itens: ItemPedido[] = [];
  for (const linha of linhas) {
    const prato: Prato | undefined =
      (linha.item_id && porId.get(linha.item_id)) ||
      (linha.nome ? porNome.get(linha.nome.trim().toLowerCase()) : undefined);

    if (!prato) {
      return erro(
        `${linha.nome ?? 'Um prato'} já não está no cardápio. Atualize a página.`,
        409,
      );
    }
    if (!prato.disponivel) {
      return erro(
        `${prato.nome} esgotou entretanto. Tire-o do pedido para continuar.`,
        409,
      );
    }

    const conta = contarLinha(prato, linha.opcao_ids ?? [], agora);
    if (!conta.ok) {
      return erro(
        `${prato.nome}: ${conta.erro}`,
        409,
      );
    }

    itens.push({
      item_id: prato.id,
      nome: prato.nome,
      qtd: linha.qtd,
      preco: conta.unitario,
      obs: linha.obs || null,
      ...(conta.opcoes.length ? { opcoes: conta.opcoes } : {}),
    });
  }

  const total = Math.round(itens.reduce((s, i) => s + i.preco * i.qtd, 0) * 100) / 100;

  /*
   * A mesa tem de ser desta casa. Um id de mesa de outro restaurante
   * gravava o pedido com a mesa errada — e, no Plano Sala, somava-o à
   * conta de outra casa.
   */
  let tableId: string | null = dados.data.table_id || null;
  const publico = clientePublico();

  if (tableId && publico) {
    const { data: mesa } = await publico
      .from('tables')
      .select('id')
      .eq('id', tableId)
      .eq('restaurant_id', restaurante.id)
      .maybeSingle();
    if (!mesa) tableId = null;
  }

  // Sem id, mas com número: a mesa procura-se aqui, e não na página.
  if (!tableId && dados.data.mesa != null && publico) {
    const { data: mesa } = await publico
      .from('tables')
      .select('id')
      .eq('restaurant_id', restaurante.id)
      .eq('numero', dados.data.mesa)
      .maybeSingle();
    tableId = (mesa as { id?: string } | null)?.id ?? null;
  }

  // A observação do pedido inteiro. Cortada, porque vem de fora e vai
  // parar a um ecrã de cozinha que não tem espaço para um romance.
  const bruta = dados.data.observacao;
  const observacao = typeof bruta === 'string' ? bruta.trim().slice(0, 200) || null : null;

  /**
   * O id gera-se aqui em vez de se ler de volta.
   *
   * O caminho óbvio era `insert(...).select('id')`, mas devolver a linha
   * inserida exige permissão de **leitura** sobre `orders` — e o cliente
   * anónimo não a tem, de propósito: quem pudesse ler a tabela lia os
   * pedidos todos da casa. Um uuid v4 gerado no servidor entra na
   * gravação e volta para o cliente sem precisar de a reler.
   */
  const id = crypto.randomUUID();

  const { error } = await supabase.from('orders').insert({
    id,
    restaurant_id: restaurante.id,
    table_id: tableId,
    itens,
    total,
    observacao,
  });

  if (error) return erro('Não foi possível gravar o pedido. Tente outra vez.', 500);

  return NextResponse.json({ ok: true, total, id });
}
