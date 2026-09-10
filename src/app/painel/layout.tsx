import { redirect } from 'next/navigation';
import { DocaPainel, NavegacaoPainel } from '@/components/painel/navegacao';
import { AvisoDemonstracao } from '@/components/aviso-demonstracao';
import { AvisoDoPlano } from '@/components/painel/aviso-do-plano';
import { PortaFechada } from '@/components/painel/porta-fechada';
import { estadoDaConta, painelAberto } from '@/lib/planos';
import { FundoVivo } from '@/components/marketing/fundo-vivo';
import { ConviteInstalar } from '@/components/convite-instalar';
import { SinoDePedidos } from '@/components/painel/sino-de-pedidos';
import { BatidaDePresenca } from '@/components/painel/batida-de-presenca';
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

  const fechado =
    Boolean(restaurante) && !painelAberto(estadoDaConta(restaurante!.acesso_expira_em));

  return (
    <div className="relative min-h-dvh">
      <FundoVivo />
      <AvisoDemonstracao />
      {restaurante ? <AvisoDoPlano restaurante={restaurante} /> : null}

      <div className="md:flex">
        <NavegacaoPainel
          nomeRestaurante={restaurante?.nome ?? null}
          slug={restaurante?.slug ?? null}
          plano={restaurante?.plano ?? 'mesa'}
          demonstracao={demonstracao}
          administrador={administrador}
        />
        <main className="min-w-0 flex-1 px-5 pb-32 pt-8 md:px-10 md:py-12 md:pb-12">
          <div className="mx-auto max-w-[880px]">
            {/*
              Prazo passado: a porta fecha-se aqui, no layout, e não em
              cada página. Uma tranca posta ecrã a ecrã esquece-se de um
              deles mais tarde ou mais cedo, e o esquecido é sempre o que
              importa.
            */}
            {fechado ? <PortaFechada restaurante={restaurante!} /> : children}
          </div>
        </main>
      </div>

      <DocaPainel />
      <ConviteInstalar />
      {restaurante ? <SinoDePedidos restauranteId={restaurante.id} /> : null}
      {restaurante ? <BatidaDePresenca /> : null}
    </div>
  );
}
