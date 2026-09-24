import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clienteServidor } from '@/lib/supabase/servidor';
import { eDemonstracao, obterRestaurantePorSlug } from '@/lib/dados';

/**
 * O cliente chama o empregado, ou pede a conta, a partir da mesa.
 *
 * Sem sessão: quem está à mesa não tem conta no CardApp. Quem decide se
 * a chamada entra é a função `chamar_da_mesa`, na base — confere o plano,
 * a mesa, e trava a repetição (uma chamada do mesmo tipo por mesa a cada
 * 60 s). Esta rota só valida a forma do pedido e traduz a resposta.
 */

const CHAMADA = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, { error: 'Endereço de cardápio inválido.' }),
  mesa: z.coerce.number().int().min(1).max(999),
  tipo: z.enum(['empregado', 'conta']),
});

export type RespostaChamada = {
  estado: 'avisado' | 'ja_avisado' | 'recusado';
  mensagem: string;
};

/** As respostas em inglês, para o cardápio que o cliente pôs em inglês. */
const MENSAGEM: Record<string, RespostaChamada> = {
  avisado: { estado: 'avisado', mensagem: 'O empregado já foi avisado.' },
  ja_avisado: {
    estado: 'ja_avisado',
    mensagem: 'O empregado já foi avisado há instantes. Está a caminho.',
  },
  fora_do_plano: {
    estado: 'recusado',
    mensagem: 'Este restaurante não recebe chamadas pelo cardápio.',
  },
  mesa_desconhecida: {
    estado: 'recusado',
    mensagem: 'Não encontrámos esta mesa. Chame o empregado com um gesto.',
  },
  casa_desconhecida: {
    estado: 'recusado',
    mensagem: 'Este cardápio não está disponível agora.',
  },
};

export async function POST(pedido: Request) {
  let corpo: unknown;
  try {
    corpo = await pedido.json();
  } catch {
    return NextResponse.json<RespostaChamada>(
      { estado: 'recusado', mensagem: 'Pedido inválido.' },
      { status: 400 },
    );
  }

  const dados = CHAMADA.safeParse(corpo);
  if (!dados.success) {
    return NextResponse.json<RespostaChamada>(
      { estado: 'recusado', mensagem: 'Pedido inválido.' },
      { status: 400 },
    );
  }

  const { slug, mesa, tipo } = dados.data;

  // Na demonstração ninguém é chamado, mas o cliente vê o que veria.
  const restaurante = await obterRestaurantePorSlug(slug);
  const supabase = await clienteServidor();
  if (!supabase || (restaurante && eDemonstracao(restaurante.id))) {
    return NextResponse.json<RespostaChamada>(resposta('avisado', tipo));
  }

  const comRpc = supabase as unknown as {
    rpc: (n: string, a: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await comRpc.rpc('chamar_da_mesa', {
    p_slug: slug,
    p_mesa: mesa,
    p_tipo: tipo,
  });

  if (error || typeof data !== 'string') {
    return NextResponse.json<RespostaChamada>(
      { estado: 'recusado', mensagem: 'Não foi possível chamar agora. Tente outra vez.' },
      { status: 502 },
    );
  }

  return NextResponse.json<RespostaChamada>(resposta(data, tipo));
}

/** A resposta da base, dita ao cliente — a da conta diz que é a conta. */
function resposta(estado: string, tipo: 'empregado' | 'conta'): RespostaChamada {
  const dita = MENSAGEM[estado] ?? MENSAGEM.casa_desconhecida;
  if (tipo === 'conta' && dita.estado === 'avisado') {
    return { estado: 'avisado', mensagem: 'A conta vai a caminho. O empregado já foi avisado.' };
  }
  return dita;
}
