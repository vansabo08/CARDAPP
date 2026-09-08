import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { clienteAdministrador, servicoConfigurado } from '@/lib/supabase/administrador';
import { SITE_URL } from '@/lib/supabase/config';
import { enviarEmail, resendConfigurado } from '@/lib/email/resend';
import { assuntoResumo, htmlResumo, textoResumo } from '@/lib/email/molde-resumo';
import { janelaDoDiaEmLuanda, resumoDoDia } from '@/lib/resumo';
import { LIMITES_PLANO, type Pedido, type Plano } from '@/lib/tipos';

/**
 * O email da manhã: o resumo de ontem para cada restaurante no plano Sala.
 *
 * Chama-se de fora, por um agendador, com o segredo no cabeçalho:
 *   Authorization: Bearer $CRON_SECRET
 *
 * Corre com a chave de serviço porque tem de ler os pedidos de todos os
 * donos — coisa que a RLS, e ainda bem, não deixa ninguém fazer.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RestauranteLinha = {
  id: string;
  nome: string;
  slug: string;
  plano: Plano;
  owner_id: string;
  activo: boolean;
};

function segredoConfere(pedido: Request) {
  const esperado = process.env.CRON_SECRET ?? '';
  if (!esperado) return false;

  const cabecalho = pedido.headers.get('authorization') ?? '';
  const doUrl = new URL(pedido.url).searchParams.get('segredo') ?? '';
  const recebido = cabecalho.replace(/^Bearer\s+/i, '') || doUrl;
  if (!recebido) return false;

  // Comparação de tempo constante: uma comparação normal deixa adivinhar
  // o segredo pelo tempo que demora a falhar.
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(pedido: Request) {
  return correr(pedido);
}

// Há agendadores que só sabem fazer GET.
export async function GET(pedido: Request) {
  return correr(pedido);
}

async function correr(pedido: Request) {
  if (!segredoConfere(pedido)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  if (!servicoConfigurado()) {
    return NextResponse.json({ erro: 'SUPABASE_SERVICE_ROLE_KEY em falta' }, { status: 500 });
  }
  if (!resendConfigurado()) {
    return NextResponse.json({ erro: 'RESEND_API_KEY em falta' }, { status: 500 });
  }

  const supabase = clienteAdministrador()!;
  const { inicio, fim } = janelaDoDiaEmLuanda(1);

  const { data: restaurantes, error } = await supabase
    .from('restaurants')
    .select('id, nome, slug, plano, owner_id, activo')
    .eq('activo', true);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const elegiveis = ((restaurantes ?? []) as RestauranteLinha[]).filter(
    (r) => LIMITES_PLANO[r.plano]?.estatisticas,
  );

  const relatorio: { restaurante: string; estado: string; detalhe?: string }[] = [];

  for (const restaurante of elegiveis) {
    const { data: pedidos } = await supabase
      .from('orders')
      .select('id, restaurant_id, table_id, itens, total, created_at')
      .eq('restaurant_id', restaurante.id)
      .gte('created_at', inicio.toISOString())
      .lt('created_at', fim.toISOString())
      .order('created_at', { ascending: false });

    const linhas = ((pedidos ?? []) as Pedido[]).map((p) => ({
      ...p,
      total: Number(p.total) || 0,
    }));

    const resumo = resumoDoDia(linhas);

    const { data: dono } = await supabase.auth.admin.getUserById(restaurante.owner_id);
    const email = dono?.user?.email;

    if (!email) {
      relatorio.push({ restaurante: restaurante.nome, estado: 'sem email' });
      continue;
    }

    const dados = {
      nomeRestaurante: restaurante.nome,
      data: inicio,
      resumo,
      ligacaoPainel: `${SITE_URL}/painel`,
    };

    const envio = await enviarEmail({
      para: email,
      assunto: assuntoResumo(dados),
      html: htmlResumo(dados),
      texto: textoResumo(dados),
    });

    relatorio.push({
      restaurante: restaurante.nome,
      estado: envio.ok ? 'enviado' : 'falhou',
      detalhe: envio.ok ? undefined : envio.erro,
    });
  }

  return NextResponse.json({
    ok: true,
    dia: inicio.toISOString().slice(0, 10),
    restaurantes: elegiveis.length,
    relatorio,
  });
}
