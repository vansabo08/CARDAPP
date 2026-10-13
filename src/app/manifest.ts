import type { MetadataRoute } from 'next';

/**
 * Serve /manifest.webmanifest — é este o manifesto da app, gerado pelo
 * Next a partir daqui. Não há um `site.webmanifest` no `public/`: dois
 * manifestos é a receita para o telemóvel instalar a app com o ícone de
 * um e o nome do outro.
 *
 * As cores são as do guia de marca: o amarelo pinta a barra do sistema
 * e o creme é o fundo do arranque, para não haver um salto de cor
 * quando a app abre do ecrã inicial.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CardApp',
    short_name: 'CardApp',
    description:
      'Cardápio digital para restaurantes em Angola. O cliente lê o QR da mesa e o pedido chega ao WhatsApp.',
    lang: 'pt-AO',
    start_url: '/painel',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFF6DC',
    theme_color: '#FFC21A',
    categories: ['food', 'business'],
    icons: [
      { src: '/icon-192.png?v=4', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png?v=4', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png?v=4', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
