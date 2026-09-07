import type { Metadata } from 'next';
import Link from 'next/link';
import { Botao } from '@/components/ui/botao';
import { CabecalhoPagina } from '@/components/painel/navegacao';
import { EditorDefinicoes } from '@/components/painel/editor-definicoes';
import { emModoDemonstracao, obterRestauranteDoDono } from '@/lib/dados';

export const metadata: Metadata = { title: 'Definições' };

export const dynamic = 'force-dynamic';

export default async function PaginaDefinicoes() {
  const restaurante = await obterRestauranteDoDono();

  if (!restaurante) {
    return (
      <div>
        <CabecalhoPagina
          titulo="Definições"
          descricao="Ainda não há restaurante nesta conta."
        />
        <div className="mt-8">
          <Botao asChild variante="ouro" tamanho="lg">
            <Link href="/comecar">Configurar o restaurante</Link>
          </Botao>
        </div>
      </div>
    );
  }

  return (
    <div>
      <CabecalhoPagina
        titulo="Definições"
        descricao="O nome, o endereço do cardápio e o número para onde os pedidos são enviados."
      />
      <EditorDefinicoes restaurante={restaurante} demonstracao={emModoDemonstracao()} />
    </div>
  );
}
