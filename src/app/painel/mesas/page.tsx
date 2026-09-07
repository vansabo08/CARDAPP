import type { Metadata } from 'next';
import Link from 'next/link';
import { Botao } from '@/components/ui/botao';
import { CabecalhoPagina } from '@/components/painel/navegacao';
import { GestorMesas } from '@/components/painel/gestor-mesas';
import { emModoDemonstracao, obterMesas, obterRestauranteDoDono } from '@/lib/dados';
import { SITE_URL } from '@/lib/supabase/config';

export const metadata: Metadata = { title: 'Mesas' };

export const dynamic = 'force-dynamic';

export default async function PaginaMesas() {
  const restaurante = await obterRestauranteDoDono();

  if (!restaurante) {
    return (
      <div>
        <CabecalhoPagina
          titulo="Mesas"
          descricao="Configure primeiro o restaurante — os QR precisam de um endereço para apontar."
        />
        <div className="mt-8">
          <Botao asChild variante="ouro" tamanho="lg">
            <Link href="/comecar">Configurar o restaurante</Link>
          </Botao>
        </div>
      </div>
    );
  }

  const mesas = await obterMesas(restaurante.id);

  return (
    <div>
      <CabecalhoPagina
        titulo="Mesas"
        descricao="Cada mesa tem o seu QR. Imprima a folha, corte e ponha um cartão em cada mesa."
      />

      <GestorMesas
        restaurante={restaurante}
        mesasIniciais={mesas}
        base={SITE_URL}
        demonstracao={emModoDemonstracao()}
      />
    </div>
  );
}
