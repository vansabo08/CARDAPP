import type { MetadataRoute } from 'next';

/**
 * Serve /manifest.webmanifest. O preto e o mesmo da barra do sistema,
 * para nao haver um salto de cor quando a app abre do ecra inicial.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cardapp',
    short_name: 'Cardapp',
    description:
      'Cardápio digital para restaurantes em Angola. O cliente lê o QR da mesa e o pedido chega ao WhatsApp.',
    lang: 'pt-AO',
    start_url: '/painel',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0B0B',
    theme_color: '#0B0B0B',
    categories: ['food', 'business'],
    icons: [
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
