'use client';

import * as React from 'react';
import type { ItemPedido, Prato } from '@/lib/tipos';

export type LinhaCarrinho = ItemPedido & { id: string; itemId: string };

type Estado = {
  linhas: LinhaCarrinho[];
  quantidadeTotal: number;
  total: number;
  adicionar: (prato: Prato, qtd: number, obs?: string) => void;
  alterarQuantidade: (id: string, delta: number) => void;
  remover: (id: string) => void;
  limpar: () => void;
  quantidadeDoPrato: (itemId: string) => number;
};

/**
 * Carrinho em memoria. De proposito nao persiste: quem esta a ler o QR
 * de uma mesa quer um pedido agora, nao um rascunho da semana passada.
 */
export function useCarrinho(): Estado {
  const [linhas, setLinhas] = React.useState<LinhaCarrinho[]>([]);

  const adicionar = React.useCallback((prato: Prato, qtd: number, obs?: string) => {
    const observacao = obs?.trim() || undefined;
    setLinhas((actuais) => {
      // Duas linhas do mesmo prato so se juntam quando a observacao e igual.
      const existente = actuais.find(
        (l) => l.itemId === prato.id && (l.obs ?? undefined) === observacao,
      );
      if (existente) {
        return actuais.map((l) => (l === existente ? { ...l, qtd: l.qtd + qtd } : l));
      }
      return [
        ...actuais,
        {
          id: `${prato.id}-${actuais.length}-${Date.now()}`,
          itemId: prato.id,
          nome: prato.nome,
          preco: prato.preco,
          qtd,
          obs: observacao,
        },
      ];
    });
  }, []);

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
  const total = linhas.reduce((s, l) => s + l.qtd * l.preco, 0);

  const quantidadeDoPrato = React.useCallback(
    (itemId: string) => linhas.filter((l) => l.itemId === itemId).reduce((s, l) => s + l.qtd, 0),
    [linhas],
  );

  return { linhas, quantidadeTotal, total, adicionar, alterarQuantidade, remover, limpar, quantidadeDoPrato };
}
