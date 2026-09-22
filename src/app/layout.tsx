import type { Metadata, Viewport } from 'next';
import { Manrope, Poppins } from 'next/font/google';
import { SITE_URL } from '@/lib/supabase/config';
import './globals.css';

/**
 * Regra da casa: Poppins nos títulos, Manrope no resto.
 *
 * Os títulos eram Playfair Display, uma serifa de contraste alto — ar de
 * carta de restaurante, mas dentro de um painel de trabalho lia-se como
 * enfeite. A referência escolhida pede uma letra forte e directa, e é
 * isso que a Poppins é: geométrica, pesada o suficiente para mandar num
 * ecrã escuro sem precisar de tamanho.
 *
 * Só 600 e 700. Tudo o que é título é semibold, e o 700 fica para números
 * grandes. Sem itálico em lado nenhum, o que poupa um ficheiro por peso.
 */
const display = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
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
    default: 'CardApp — o cardápio que cabe numa mesa',
    template: '%s · CardApp',
  },
  description:
    'Cardápio digital para restaurantes em Angola. O cliente lê o QR da mesa, escolhe e o pedido chega ao WhatsApp já formatado.',
  applicationName: 'CardApp',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: '32x32' },
      { url: '/favicon-32.png?v=2', type: 'image/png', sizes: '32x32' },
      { url: '/icone-192.png?v=2', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png?v=2', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: 'CardApp',
    statusBarStyle: 'black-translucent',
  },
  // A distribuição vai ser quase toda por WhatsApp: o cartão de partilha
  // é o que decide se alguém toca no link.
  openGraph: {
    type: 'website',
    locale: 'pt_AO',
    siteName: 'CardApp',
    title: 'CardApp — o cardápio que cabe numa mesa',
    description:
      'O cliente lê o QR da mesa, escolhe, e o pedido chega ao WhatsApp do restaurante já escrito.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CardApp — o cardápio que cabe numa mesa',
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
