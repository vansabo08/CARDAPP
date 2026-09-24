import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CardapioPublico } from '@/components/cardapio/cardapio-publico';
import { AvisoDemonstracao } from '@/components/aviso-demonstracao';
import { obterCardapio, obterMenus, obterRestaurantePorSlug } from '@/lib/dados';
import { clientePublico } from '@/lib/supabase/publico';
import { temFuncionalidade } from '@/lib/funcionalidades';
import { cardapioNoAr, estadoDaConta } from '@/lib/planos';
import { ForaDoAr } from '@/components/cardapio/fora-do-ar';

/**
 * Cardápio público. Sem autenticação e renderizado no servidor: quem lê
 * o QR está sentado à mesa, com uma barra de rede e pressa.
 */

type Props = {
  params: Promise<{ slug: string }>;
};

/*
 * Uma hora de cache na borda.
 *
 * ISTO SÓ FUNCIONA PORQUE A PÁGINA NÃO OLHA PARA O ENDEREÇO. Enquanto
 * lia `?mesa=` aqui, o Next marcava a rota como dinâmica e desenhava-a
 * de raiz em cada leitura de QR: três segundos até ao primeiro byte,
 * com o cliente sentado à mesa à espera. O número da mesa é lido no
 * browser (ver `CardapioPublico`), e o cardápio — que é igual para toda
 * a gente — volta a ser uma página feita à espera de quem chega.
 *
 * O que muda dentro da hora continua a aparecer na hora: o esgotado vai
 * por Realtime, e gravar o cardápio no painel revalida esta página.
 */
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
      siteName: 'CardApp',
      title: titulo,
      description: descricao,
      url: `/${restaurante.slug}`,
    },
    twitter: { card: 'summary_large_image', title: titulo, description: descricao },
  };
}

export default async function PaginaCardapio({ params }: Props) {
  const { slug } = await params;

  const restaurante = await obterRestaurantePorSlug(slug);
  if (!restaurante) notFound();

  /*
   * Passada a cortesia, o cardápio sai do ar. Antes disso serve na
   * mesma: um QR morto numa mesa castiga quem está a jantar, e não quem
   * se esqueceu de pagar.
   */
  if (!cardapioNoAr(estadoDaConta(restaurante.acesso_expira_em))) return <ForaDoAr />;

  const [categorias, menus] = await Promise.all([
    obterCardapio(restaurante.id),
    temFuncionalidade(restaurante, 'menus_horario') ? obterMenus(restaurante.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <AvisoDemonstracao />
      <CardapioPublico
        restaurante={restaurante}
        categorias={categorias}
        menus={menus}
        mesa={null}
        tableId={null}
        marcaVisivel={!temFuncionalidade(restaurante, 'sem_marca')}
      />
    </>
  );
}

/**
 * As casas que existem hoje, desenhadas no build.
 *
 * Sem esta lista, o Next não sabe que slugs existem e desenha cada
 * cardápio à chegada do primeiro cliente — que paga a espera inteira, à
 * mesa, com o telemóvel na mão. Com ela, os cardápios das casas activas
 * saem prontos do build e são servidos da borda.
 *
 * Uma casa criada depois do build continua a funcionar: `dynamicParams`
 * fica ligado por omissão, e o primeiro pedido desenha-a e guarda-a.
 *
 * Se a base não responder durante o build, devolve-se a lista vazia em
 * vez de rebentar: fica tudo como estava antes, desenhado à chegada.
 */
export async function generateStaticParams() {
  try {
    const supabase = clientePublico();
    if (!supabase) return [];

    const { data } = await supabase.from('restaurants').select('slug').limit(200);
    return ((data ?? []) as { slug?: string }[])
      .map((r) => r.slug)
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}
