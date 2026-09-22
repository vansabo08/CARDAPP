import type { Metadata } from 'next';
import { AceitarConvite } from '@/components/autenticacao/aceitar-convite';

export const metadata: Metadata = {
  title: 'Aceitar o convite',
  robots: { index: false, follow: false },
};

export default async function PaginaConvite({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return <AceitarConvite erroInicial={erro === 'expirado' || erro === 'link' ? erro : null} />;
}
