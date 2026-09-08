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
  openGraph: {
    type: 'website',
    locale: 'pt_AO',
    siteName: 'Cardapp',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f0e0d',
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
