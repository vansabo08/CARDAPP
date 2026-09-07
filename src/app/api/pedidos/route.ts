import { NextResponse } from 'next/server';
import { clienteServidor } from '@/lib/supabase/servidor';
import { obterRestaurantePorSlug } from '@/lib/dados';
import type { ItemPedido } from '@/lib/tipos';

/**
 * Grava um pedido feito no cardápio público.
 * O cliente não tem sessão — a política de RLS permite apenas o insert,
 * e só em restaurantes activos.
 */

const MAX_LINHAS = 60;
const MAX_QTD = 99;

function limparItens(bruto: unknown): ItemPedido[] {
  if (!Array.isArray(bruto)) return [];

  const limpos: (ItemPedido | null)[] = bruto
    .slice(0, MAX_LINHAS)
    .map((linha): ItemPedido | null => {
      if (!linha || typeof linha !== 'object') return null;
      const item = linha as Record<string, unknown>;

      const nome = String(item.nome ?? '').trim().slice(0, 120);
      const qtd = Math.floor(Number(item.qtd));
      const preco = Number(item.preco);
      const obs = item.obs == null ? null : String(item.obs).trim().slice(0, 140) || null;

      if (!nome) return null;
      if (!Number.isFinite(qtd) || qtd < 1 || qtd > MAX_QTD) return null;
      if (!Number.isFinite(preco) || preco < 0) return null;

      return { nome, qtd, preco: Math.round(preco * 100) / 100, obs };
    });

  return limpos.filter((i): i is ItemPedido => i !== null);
}

export async function POST(pedido: Request) {
  let corpo: Record<string, unknown>;
  try {
    corpo = (await pedido.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido' }, { status: 400 });
  }

  const slug = String(corpo.slug ?? '').trim();
  const itens = limparItens(corpo.itens);

  if (!slug || itens.length === 0) {
    return NextResponse.json({ erro: 'Pedido vazio' }, { status: 400 });
  }

  const restaurante = await obterRestaurantePorSlug(slug);
  if (!restaurante) {
    return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 });
  }

  // O total é recalculado no servidor; o que vem do cliente é indicativo.
  const total = itens.reduce((soma, i) => soma + i.preco * i.qtd, 0);

  const supabase = await clienteServidor();
  if (!supabase) {
    // Modo demonstração: não há onde gravar, mas o fluxo continua.
    return NextResponse.json({ ok: true, demonstracao: true, total });
  }

  const tableId = typeof corpo.table_id === 'string' && corpo.table_id ? corpo.table_id : null;

  const { error } = await supabase.from('orders').insert({
    restaurant_id: restaurante.id,
    table_id: tableId,
    itens,
    total,
  });

  if (error) {
    return NextResponse.json({ erro: 'Não foi possível gravar o pedido' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, total });
}
