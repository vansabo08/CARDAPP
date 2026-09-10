import Link from 'next/link';
import type { Metadata } from 'next';
import { Botao } from '@/components/ui/botao';
import { CabecalhoPagina } from '@/components/painel/navegacao';
import { PedidosAoVivo } from '@/components/painel/pedidos-ao-vivo';
import { obterMesas, obterPedidosDeHoje, obterRestauranteDoDono } from '@/lib/dados';

export const metadata: Metadata = { title: 'Pedidos' };

export const dynamic = 'force-dynamic';

/**
 * A fila de pedidos do dia, ao vivo.
 *
 * Não passa pelos limites do plano, ao contrário das estatísticas:
 * receber um pedido é o que a aplicação faz, não é um extra. Uma casa no
 * plano grátis que não visse os pedidos a cair não teria produto nenhum.
 */
export default async function PaginaPedidos() {
  const restaurante = await obterRestauranteDoDono();

  if (!restaurante) {
    return (
      <div>
        <CabecalhoPagina
          titulo="Ainda não há por onde receber."
          descricao="Configure o restaurante e as mesas, e os pedidos começam a cair aqui."
        />
        <div className="mt-8">
          <Botao asChild variante="ouro" tamanho="lg">
            <Link href="/comecar">Configurar o restaurante</Link>
          </Botao>
        </div>
      </div>
    );
  }

  const [pedidos, mesas] = await Promise.all([
    obterPedidosDeHoje(restaurante.id),
    obterMesas(restaurante.id),
  ]);

  // O Realtime entrega a linha de `orders` crua, sem o número da mesa.
  // Vai daqui o dicionário, para o ecrã não ter de perguntar a cada
  // pedido que cai.
  const numeroPorMesa = Object.fromEntries(mesas.map((m) => [m.id, m.numero]));

  const soWhatsApp = restaurante.modo_pedido === 'whatsapp';

  return (
    <div>
      <CabecalhoPagina
        titulo="Pedidos"
        descricao={`O que caiu no ${restaurante.nome} desde a meia-noite.`}
        accao={
          <Botao asChild variante="contorno" tamanho="md">
            <Link href="/painel/definicoes">Como recebo pedidos</Link>
          </Botao>
        }
      />

      {soWhatsApp ? (
        <div className="vidro mt-8 rounded-cartao p-6">
          <p className="font-display text-lg text-creme">
            Esta casa está a receber pedidos pelo WhatsApp.
          </p>
          <p className="mt-2.5 max-w-[62ch] font-sans text-sm leading-normal text-tenue">
            Os pedidos ficam aqui registados e o aparelho toca na mesma — o que falta é o cliente
            poder acompanhar o estado. Para lhe dar isso, mude a forma de receber nas definições.
          </p>
        </div>
      ) : null}

      <PedidosAoVivo
        restauranteId={restaurante.id}
        mesas={numeroPorMesa}
        iniciais={pedidos}
      />
    </div>
  );
}
