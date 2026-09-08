import { obterCardapio, obterRestaurantePorSlug } from '@/lib/dados';
import { imagemDePartilha, TAMANHO_OG, TIPO_OG } from '@/lib/og';

export const alt = 'Cardápio';
export const size = TAMANHO_OG;
export const contentType = TIPO_OG;

/**
 * O que aparece quando alguem partilha o cardapio no WhatsApp: o nome do
 * restaurante e, se houver, uma fotografia dos pratos dele.
 */
export default async function Imagem({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurante = await obterRestaurantePorSlug(slug);

  if (!restaurante) {
    return imagemDePartilha({
      titulo: 'Cardápio não encontrado',
      subtitulo: 'O endereço pode ter mudado. Confirme o QR da mesa.',
    });
  }

  const categorias = await obterCardapio(restaurante.id);
  const foto = categorias.flatMap((c) => c.itens).find((i) => i.foto_url)?.foto_url ?? null;

  return imagemDePartilha({
    etiqueta: 'Cardápio',
    titulo: restaurante.nome,
    subtitulo: 'Veja o cardápio e faça o pedido pelo WhatsApp. Sem instalar nada.',
    foto,
  });
}
