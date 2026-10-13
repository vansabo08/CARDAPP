import type { Metadata, Viewport } from 'next';
import { Parisienne, Poppins } from 'next/font/google';
import { SITE_URL } from '@/lib/supabase/config';
import './globals.css';

/**
 * A LETRA É A DO GUIA DE MARCA: POPPINS.
 *
 * O guia diz "Poppins Bold no logótipo; Poppins Regular/Medium/Bold nos
 * textos do app", e é isso. A palavra "CardApp" do logótipo já vai em
 * Poppins dentro do SVG, em curvas; esta é a mesma letra, viva, para
 * tudo o resto — títulos, botões, listas, preços e texto corrido.
 *
 * Esteve aqui a Outfit, que é prima dela: geométrica, do mesmo feitio.
 * Enquanto esteve, o logótipo e o ecrã por baixo dele eram duas letras
 * parecidas mas diferentes — e é disso que se faz o ar de coisa montada
 * de pedaços. Quatro pesos: o normal para ler, o médio para o que se
 * destaca, o semibold dos títulos e o bold dos números grandes.
 *
 * A PARISIENNE FICA, a conta-gotas: a palavra que fecha o título da
 * página inicial e o adeus do rodapé. Não vem no guia — é uma liberdade
 * de quem desenhou os ecrãs, e sai daqui no dia em que o dono disser.
 * Nunca entra em texto que alguém tenha de ler depressa: uma letra
 * manuscrita num preço é bonita um segundo e um estorvo para sempre.
 */
const display = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--fonte-poppins',
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
    /*
     * O `?v=` sobe sempre que o desenho muda: sem ele, quem já visitou o
     * site fica com o ícone velho no separador durante semanas, e quem
     * instalou a app fica com ele no ecrã inicial para sempre.
     *
     * O SVG vem primeiro: o browser que o souber ler fica com a marca
     * nítida em qualquer tamanho, e os outros recuam para o .ico.
     */
    icon: [
      { url: '/favicon.svg?v=4', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=4', sizes: '32x32' },
      { url: '/icon-192.png?v=4', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png?v=4', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: 'CardApp',
    statusBarStyle: 'default',
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
  // O amarelo da marca: é a cor que o telemóvel pinta à volta da app
  // quando ela abre do ecrã inicial.
  themeColor: '#FFC21A',
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
