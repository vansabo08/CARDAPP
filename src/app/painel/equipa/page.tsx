import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CabecalhoPagina } from '@/components/painel/navegacao';
import { CartaoUpgrade } from '@/components/painel/cartao-upgrade';
import { GestorEquipa } from '@/components/painel/gestor-equipa';
import { limiteDeMembros } from '@/config/planos';
import { obterMembros, obterRestauranteDoDono } from '@/lib/dados';
import { temFuncionalidade } from '@/lib/funcionalidades';

export const metadata: Metadata = { title: 'Equipa' };

export default async function PaginaEquipa() {
  const restaurante = await obterRestauranteDoDono();
  if (!restaurante) redirect('/painel');

  const cabecalho = (
    <CabecalhoPagina
      titulo="Equipa"
      descricao="Quem trabalha na casa, e o que cada um pode ver. O gerente, a sala e a cozinha entram com a sua própria conta."
    />
  );

  if (!temFuncionalidade(restaurante, 'equipa')) {
    return (
      <>
        {cabecalho}
        <CartaoUpgrade funcionalidade="equipa" className="mt-8" />
      </>
    );
  }

  const membros = await obterMembros(restaurante.id);

  return (
    <>
      {cabecalho}
      <GestorEquipa
        membros={membros}
        limite={limiteDeMembros(restaurante.plano)}
        nomeCasa={restaurante.nome}
      />
    </>
  );
}
