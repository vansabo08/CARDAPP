import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CabecalhoPagina } from '@/components/painel/navegacao';
import { CartaoUpgrade } from '@/components/painel/cartao-upgrade';
import { SalaoAoVivo } from '@/components/painel/salao-ao-vivo';
import { eDemonstracao, obterRestauranteDoDono, obterSalao } from '@/lib/dados';
import { temFuncionalidade } from '@/lib/funcionalidades';

export const metadata: Metadata = { title: 'Salão' };
export const dynamic = 'force-dynamic';

export default async function PaginaSalao() {
  const restaurante = await obterRestauranteDoDono();
  if (!restaurante) redirect('/painel');

  const cabecalho = (
    <CabecalhoPagina
      titulo="Salão"
      descricao="Cada mesa como está agora: quem chama, quem pediu a conta, e o que cada uma já consumiu."
    />
  );

  if (!temFuncionalidade(restaurante, 'salao')) {
    return (
      <>
        {cabecalho}
        <CartaoUpgrade funcionalidade="salao" className="mt-8" />
      </>
    );
  }

  const mesas = await obterSalao(restaurante.id);

  return (
    <>
      {cabecalho}
      <SalaoAoVivo
        mesas={mesas}
        restauranteId={restaurante.id}
        demonstracao={eDemonstracao(restaurante.id)}
        agoraDoServidor={Date.now()}
      />
    </>
  );
}
