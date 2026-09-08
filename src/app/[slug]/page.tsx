import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CardapioPublico } from '@/components/cardapio/cardapio-publico';
import { obterCardapio, obterMesaPorNumero, obterRestaurantePorSlug } from '@/lib/dados';
import { LIMITES_PLANO } from '@/lib/tipos';

/**
 * Cardápio público. Sem autenticação e renderizado no servidor: quem lê
 * o QR está sentado à mesa, com uma barra de rede e pressa.
 */

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mesa?: string }>;
};

// Uma hora de cache no limite: mudar um preço aparece rápido, mas o
// scan típico não paga o custo de uma leitura à base de dados.
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const restaurante = await obterRestaurantePorSlug(slug);
  if (!restaurante) return { title: 'Cardápio não encontrado' };

  const titulo = `${restaurante.nome} — Cardápio`;
  const descricao = `Veja o cardápio de ${restaurante.nome} e faça o seu pedido pelo WhatsApp. Sem instalar nada, sem criar conta.`;

  // A partilha vai ser quase toda por WhatsApp: e este cartao que a
  // pessoa ve antes de decidir se toca no link.
  return {
    title: titulo,
    description: descricao,
    robots: { index: true, follow: true },
    alternates: { canonical: `/${restaurante.slug}` },
    openGraph: {
      type: 'website',
      locale: 'pt_AO',
      siteName: 'Cardapp',
      title: titulo,
      description: descricao,
      url: `/${restaurante.slug}`,
    },
    twitter: { card: 'summary_large_image', title: titulo, description: descricao },
  };
}

function lerNumeroDaMesa(valor: string | undefined) {
  if (!valor) return null;
  const n = Number.parseInt(valor, 10);
  if (!Number.isFinite(n) || n < 1 || n > 999) return null;
  return n;
}

export default async function PaginaCardapio({ params, searchParams }: Props) {
  const { slug } = await params;
  const { mesa: mesaBruta } = await searchParams;

  const restaurante = await obterRestaurantePorSlug(slug);
  if (!restaurante) notFound();

  const numero = lerNumeroDaMesa(mesaBruta);

  const [categorias, mesa] = await Promise.all([
    obterCardapio(restaurante.id),
    numero != null ? obterMesaPorNumero(restaurante.id, numero) : Promise.resolve(null),
  ]);

  return (
    <CardapioPublico
      restaurante={restaurante}
      categorias={categorias}
      mesa={mesa?.numero ?? numero}
      tableId={mesa?.id ?? null}
      marcaVisivel={LIMITES_PLANO[restaurante.plano]?.marca ?? true}
    />
  );
}
