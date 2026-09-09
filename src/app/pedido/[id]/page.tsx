import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Marca } from '@/components/marca';
import { FundoVivo } from '@/components/marketing/fundo-vivo';
import { Acompanhar } from '@/components/pedido/acompanhar';
import { obterPedidoPublico } from '@/lib/dados';

/**
 * O ecrã que o cliente recebe depois de enviar o pedido pelo Cardapp.
 *
 * O endereço traz o id do pedido, que é um uuid v4 — quem não fez o
 * pedido não chega aqui por tentativa. Fica fora dos motores de busca na
 * mesma: não há nada a indexar e há o hábito de não deixar rasto de
 * páginas que falam de uma pessoa em concreto.
 */
export const metadata: Metadata = {
  title: 'O seu pedido',
  robots: { index: false, follow: false },
};

/** O estado muda do lado do restaurante; não há nada para guardar. */
export const dynamic = 'force-dynamic';

export default async function PaginaDoPedido({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pedido = await obterPedidoPublico(id);
  if (!pedido) notFound();

  return (
    <div className="relative flex min-h-dvh flex-col">
      <FundoVivo />

      <header className="px-5 py-6 md:px-8">
        <Marca />
      </header>

      <main className="flex flex-1 items-start justify-center">
        <Acompanhar inicial={pedido} />
      </main>
    </div>
  );
}
