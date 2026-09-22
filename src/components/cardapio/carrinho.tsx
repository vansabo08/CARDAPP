'use client';

import * as React from 'react';
import { contarLinha } from '@/lib/precos';
import type { ItemPedido, OpcaoEscolhida, Prato } from '@/lib/tipos';

export type LinhaCarrinho = ItemPedido & {
  id: string;
  itemId: string;
  /** As opções escolhidas, por id — é isto que vai para o servidor. */
  opcaoIds: string[];
};

export type Escolha = {
  opcaoIds: string[];
  /** O preço unitário com as opções, já contado pela mesma função do servidor. */
  unitario: number;
  opcoes: OpcaoEscolhida[];
};

type Estado = {
  linhas: LinhaCarrinho[];
  quantidadeTotal: number;
  total: number;
  adicionar: (prato: Prato, qtd: number, obs?: string, escolha?: Escolha) => void;
  alterarQuantidade: (id: string, delta: number) => void;
  remover: (id: string) => void;
  limpar: () => void;
  quantidadeDoPrato: (itemId: string) => number;
};

/** A mesma escolha escrita da mesma maneira, seja qual for a ordem dos toques. */
function chaveDasOpcoes(ids: readonly string[]) {
  return [...ids].sort().join('|');
}

/**
 * Carrinho em memoria. De proposito nao persiste: quem esta a ler o QR
 * de uma mesa quer um pedido agora, nao um rascunho da semana passada.
 */
export function useCarrinho(): Estado {
  const [linhas, setLinhas] = React.useState<LinhaCarrinho[]>([]);

  const adicionar = React.useCallback(
    (prato: Prato, qtd: number, obs?: string, escolha?: Escolha) => {
      const observacao = obs?.trim() || undefined;

      // Sem escolha, conta-se aqui — com a promoção, se houver. O "+" da
      // lista não pode juntar o prato ao preço de antes da promoção.
      let conta = escolha;
      if (!conta) {
        const r = contarLinha(prato, []);
        if (!r.ok) return;
        conta = { opcaoIds: [], unitario: r.unitario, opcoes: r.opcoes };
      }
      const chave = chaveDasOpcoes(conta.opcaoIds);

      setLinhas((actuais) => {
        // Duas linhas do mesmo prato só se juntam quando as escolhas e a
        // observação são iguais: um Grande com queijo não é um Pequeno.
        const existente = actuais.find(
          (l) =>
            l.itemId === prato.id &&
            (l.obs ?? undefined) === observacao &&
            chaveDasOpcoes(l.opcaoIds) === chave,
        );
        if (existente) {
          return actuais.map((l) => (l === existente ? { ...l, qtd: l.qtd + qtd } : l));
        }
        return [
          ...actuais,
          {
            id: `${prato.id}-${actuais.length}-${Date.now()}`,
            itemId: prato.id,
            item_id: prato.id,
            nome: prato.nome,
            preco: conta!.unitario,
            qtd,
            obs: observacao,
            opcaoIds: conta!.opcaoIds,
            opcoes: conta!.opcoes.length ? conta!.opcoes : undefined,
          },
        ];
      });
    },
    [],
  );

  const alterarQuantidade = React.useCallback((id: string, delta: number) => {
    setLinhas((actuais) =>
      actuais
        .map((l) => (l.id === id ? { ...l, qtd: l.qtd + delta } : l))
        .filter((l) => l.qtd > 0),
    );
  }, []);

  const remover = React.useCallback((id: string) => {
    setLinhas((actuais) => actuais.filter((l) => l.id !== id));
  }, []);

  const limpar = React.useCallback(() => setLinhas([]), []);

  const quantidadeTotal = linhas.reduce((s, l) => s + l.qtd, 0);
  const total = Math.round(linhas.reduce((s, l) => s + l.qtd * l.preco, 0) * 100) / 100;

  const quantidadeDoPrato = React.useCallback(
    (itemId: string) => linhas.filter((l) => l.itemId === itemId).reduce((s, l) => s + l.qtd, 0),
    [linhas],
  );

  return { linhas, quantidadeTotal, total, adicionar, alterarQuantidade, remover, limpar, quantidadeDoPrato };
}
