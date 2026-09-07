import { redirect } from 'next/navigation';
import { NavegacaoPainel } from '@/components/painel/navegacao';
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
    <div className="min-h-dvh bg-grafite md:flex">
      <NavegacaoPainel
        nomeRestaurante={restaurante?.nome ?? null}
        slug={restaurante?.slug ?? null}
        plano={restaurante?.plano ?? 'balcao'}
        demonstracao={demonstracao}
      />
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-[880px]">{children}</div>
      </main>
    </div>
  );
}
