import type { Metadata } from 'next';
import Link from 'next/link';
import { Botao } from '@/components/ui/botao';
import { CabecalhoPagina } from '@/components/painel/navegacao';
import { GestorCardapio, ResumoCardapio } from '@/components/painel/gestor-cardapio';
import {
  emModoDemonstracao,
  obterCardapio,
  obterMenus,
  obterPapelNoPainel,
  obterRestauranteDoDono,
} from '@/lib/dados';
import { temFuncionalidade } from '@/lib/funcionalidades';

export const metadata: Metadata = { title: 'Cardápio' };

export const dynamic = 'force-dynamic';

export default async function PaginaCardapio() {
  const restaurante = await obterRestauranteDoDono();

  if (!restaurante) {
    return (
      <div>
        <CabecalhoPagina
          titulo="Cardápio"
          descricao="Primeiro configure o restaurante — depois voltamos aqui para os pratos."
        />
        <div className="mt-8">
          <Botao asChild variante="laranja" tamanho="lg">
            <Link href="/comecar">Configurar o restaurante</Link>
          </Botao>
        </div>
      </div>
    );
  }

  const [categorias, menus, papel] = await Promise.all([
    obterCardapio(restaurante.id, { doPainel: true }),
    temFuncionalidade(restaurante, 'menus_horario') ? obterMenus(restaurante.id) : Promise.resolve([]),
    obterPapelNoPainel(),
  ]);

  return (
    <div>
      <CabecalhoPagina
        titulo="Cardápio"
        descricao="Arraste as categorias para mudar a ordem em que aparecem. O interruptor à direita marca o que já esgotou hoje."
        accao={<ResumoCardapio categorias={categorias} plano={restaurante.plano} />}
      />

      <GestorCardapio
        categoriasIniciais={categorias}
        plano={restaurante.plano}
        demonstracao={emModoDemonstracao()}
        menusIniciais={menus}
        esgotadoModo={restaurante.esgotado_modo ?? 'mostrar'}
        eDono={papel === 'dono'}
      />
    </div>
  );
}
