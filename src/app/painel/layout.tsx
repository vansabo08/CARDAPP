import { redirect } from 'next/navigation';
import { DocaPainel, NavegacaoPainel } from '@/components/painel/navegacao';
import { AvisoDemonstracao } from '@/components/aviso-demonstracao';
import { FundoVivo } from '@/components/marketing/fundo-vivo';
import { ConviteInstalar } from '@/components/convite-instalar';
import { emModoDemonstracao, obterRestauranteDoDono } from '@/lib/dados';
import { eAdministrador } from '@/lib/admin';
import { utilizadorActual } from '@/lib/supabase/servidor';

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const demonstracao = emModoDemonstracao();

  if (!demonstracao) {
    const utilizador = await utilizadorActual();
    if (!utilizador) redirect('/entrar');
  }

  const [restaurante, administrador] = await Promise.all([
    obterRestauranteDoDono(),
    eAdministrador(),
  ]);

  return (
    <div className="relative min-h-dvh">
      <FundoVivo />
      <AvisoDemonstracao />

      <div className="md:flex">
        <NavegacaoPainel
          nomeRestaurante={restaurante?.nome ?? null}
          slug={restaurante?.slug ?? null}
          plano={restaurante?.plano ?? 'balcao'}
          demonstracao={demonstracao}
          administrador={administrador}
        />
        <main className="min-w-0 flex-1 px-5 pb-32 pt-8 md:px-10 md:py-12 md:pb-12">
          <div className="mx-auto max-w-[880px]">{children}</div>
        </main>
      </div>

      <DocaPainel />
      <ConviteInstalar />
    </div>
  );
}
