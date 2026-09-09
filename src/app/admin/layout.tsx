import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Marca } from '@/components/marca';
import { FundoVivo } from '@/components/marketing/fundo-vivo';
import { Distintivo } from '@/components/ui/distintivo';
import { eAdministrador, haAdministradoresDefinidos } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'Administração',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Barreira do painel administrativo.
 *
 * Responde 404 e não 403: a quem não é administrador, não interessa
 * sequer saber que esta secção existe.
 */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  if (!haAdministradoresDefinidos()) notFound();
  if (!(await eAdministrador())) notFound();

  return (
    <div className="relative min-h-dvh">
      <FundoVivo />

      <header className="vidro rounded-none border-x-0 border-t-0 shadow-[inset_0_1px_0_0_rgba(250,247,242,0.11)]">
        <div className="mx-auto flex h-[68px] max-w-conteudo items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-3">
            <Marca href="/painel" />
            <Distintivo tom="ouro">Administração</Distintivo>
          </div>
          <Link
            href="/painel"
            className="font-sans text-sm text-tenue transition-colors hover:text-creme"
          >
            Voltar ao painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-conteudo px-5 py-10 md:px-8 md:py-14">{children}</main>
    </div>
  );
}
