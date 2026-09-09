import type { Metadata, Viewport } from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import { SITE_URL } from '@/lib/supabase/config';
import './globals.css';

/**
 * Regra fixa da casa: Playfair Display nos títulos, Manrope no resto.
 *
 * Só 400 e 600 — nada de 700 para cima. Uma serifa de contraste alto
 * como esta engrossa muito depressa, e a partir do semibold as hastes
 * finas fecham e o título passa a ler-se como um aviso. E sem itálico em
 * lado nenhum, o que também poupa um ficheiro por família.
 */
const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: 'normal',
  display: 'swap',
  variable: '--fonte-display',
});

const sans = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fonte-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Cardapp — o cardápio que cabe numa mesa',
    template: '%s · Cardapp',
  },
  description:
    'Cardápio digital para restaurantes em Angola. O cliente lê o QR da mesa, escolhe e o pedido chega ao WhatsApp já formatado.',
  applicationName: 'Cardapp',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icone-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Cardapp',
    statusBarStyle: 'black-translucent',
  },
  // A distribuição vai ser quase toda por WhatsApp: o cartão de partilha
  // é o que decide se alguém toca no link.
  openGraph: {
    type: 'website',
    locale: 'pt_AO',
    siteName: 'Cardapp',
    title: 'Cardapp — o cardápio que cabe numa mesa',
    description:
      'O cliente lê o QR da mesa, escolhe, e o pedido chega ao WhatsApp do restaurante já escrito.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cardapp — o cardápio que cabe numa mesa',
    description:
      'O cliente lê o QR da mesa, escolhe, e o pedido chega ao WhatsApp do restaurante já escrito.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // A classe do `sans` vai também no body, e não só a variável CSS: é
    // o que faz o Next associar a fonte à rota e emitir o <link
    // rel="preload">. Só com a variável, o browser só descobre o ficheiro
    // depois de ler o CSS — e o texto espera por ele.
    <html lang="pt-AO" className={`${display.variable} ${sans.variable}`}>
      <body className={sans.className}>{children}</body>
    </html>
  );
}
