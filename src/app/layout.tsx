import type { Metadata, Viewport } from 'next';
import { Familjen_Grotesk, Instrument_Serif } from 'next/font/google';
import { SITE_URL } from '@/lib/supabase/config';
import './globals.css';

const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--fonte-display',
});

const sans = Familjen_Grotesk({
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
    <html lang="pt-AO" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
