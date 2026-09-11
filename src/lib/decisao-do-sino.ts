/**
 * A decisão do sino, sem sino.
 *
 * Tirada do componente para se poder testar sem React, sem temporizadores
 * e sem rede. O componente trata do som e dos canais; o que decide se há
 * alguém à espera é isto, e isto é só uma conta.
 *
 * O defeito que trouxe isto cá para fora era uma conta errada escondida
 * dentro de um componente: "Recebido" escondia o botão, mas o sino
 * continuava a contar o pedido como por confirmar. Numa função pura, esse
 * erro não tem onde se esconder.
 */

/** Quanto tempo um clique em "Recebido" manda sobre o que a base diz. */
export const CARENCIA_DO_CLIQUE = 12_000;

export type Decisao = {
  /** Os pedidos que continuam por confirmar. */
  porConfirmar: Set<string>;
  /** Havia algum que o sino ainda não conhecia? Se sim, toca por ele. */
  apareceuNovo: boolean;
  /** Os cliques que ainda estão dentro da carência. */
  vistosAgora: Map<string, number>;
};

/**
 * @param naBase      ids que a base diz estarem por confirmar, agora
 * @param antes       ids que o sino tinha como por confirmar
 * @param vistosAgora id → instante em que alguém carregou em "Recebido"
 * @param agora       o instante desta decisão
 */
export function decidirPorConfirmar(
  naBase: string[],
  antes: Set<string>,
  vistosAgora: Map<string, number>,
  agora: number,
): Decisao {
  /*
   * Os cliques antigos saem primeiro.
   *
   * Um clique dentro da carência manda sobre a base: entre carregar e a
   * gravação lá chegar há um instante em que a base ainda diz "por
   * confirmar", e acreditar nela nesse instante punha o alarme a tocar
   * outra vez — que é o defeito todo.
   *
   * Passada a carência, a base volta a mandar. Se continua a dizer que
   * ninguém confirmou, a gravação falhou, e o alarme tem de voltar.
   */
  const aindaValem = new Map<string, number>();
  for (const [id, quando] of vistosAgora) {
    if (agora - quando <= CARENCIA_DO_CLIQUE) aindaValem.set(id, quando);
  }

  const porConfirmar = new Set(naBase.filter((id) => !aindaValem.has(id)));
  const apareceuNovo = [...porConfirmar].some((id) => !antes.has(id));

  return { porConfirmar, apareceuNovo, vistosAgora: aindaValem };
}
