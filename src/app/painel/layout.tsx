import { redirect } from 'next/navigation';
import { DocaPainel, NavegacaoPainel } from '@/components/painel/navegacao';
import { FundoVivo } from '@/components/marketing/fundo-vivo';
import { emModoDemonstracao, obterRestauranteDoDono } from '@/lib/dados';
import { utilizadorActual } from '@/lib/supabase/servidor';

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const demonstracao = emModoDemonstracao();

  if (!demonstracao) {
    const utilizador = await utilizadorActual();
    if (!utilizador) redirect('/entrar');
  }

  const restaurante = await obterRestauranteDoDono();

  return (
    <div className="relative min-h-dvh md:flex">
      <FundoVivo />
      <NavegacaoPainel
        nomeRestaurante={restaurante?.nome ?? null}
        slug={restaurante?.slug ?? null}
        plano={restaurante?.plano ?? 'balcao'}
        demonstracao={demonstracao}
      />
      <main className="min-w-0 flex-1 px-5 pb-32 pt-8 md:px-10 md:py-12 md:pb-12">
        <div className="mx-auto max-w-[880px]">{children}</div>
      </main>

      <DocaPainel />
    </div>
  );
}
