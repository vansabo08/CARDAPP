import type { Metadata, Viewport } from 'next';
import { Outfit, Parisienne } from 'next/font/google';
import { SITE_URL } from '@/lib/supabase/config';
import './globals.css';

/**
 * DUAS TIPOGRAFIAS, E SÓ DUAS.
 *
 * A referência que o dono escolheu tem duas colunas: à esquerda letras
 * geométricas e pesadas, à direita assinaturas à mão. É essa a divisão
 * que a app passa a ter.
 *
 * 1. OUTFIT faz tudo o que é estrutura — títulos, botões, listas, preços
 *    e texto corrido. Uma família só, com vários pesos, é o que dá a uma
 *    app o ar de coisa desenhada de uma vez; duas famílias a fazer o
 *    mesmo trabalho lêem-se como dois sítios colados.
 *
 * 2. PARISIENNE é a assinatura. Entra a conta-gotas — a palavra que
 *    fecha o título, o adeus do rodapé — e nunca em texto que alguém
 *    tenha de ler depressa. Uma letra manuscrita num preço ou num botão
 *    é bonita durante um segundo e um estorvo para sempre.
 *
 * Saíram a Poppins e a Manrope, que faziam o mesmo trabalho uma ao lado
 * da outra sem que se notasse a diferença.
 */
const display = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--fonte-outfit',
});

const assinatura = Parisienne({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--fonte-assinatura',
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
    <html lang="pt-AO" className={`${display.variable} ${assinatura.variable}`}>
      <body className={display.className}>{children}</body>
    </html>
  );
}
