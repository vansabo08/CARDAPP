/**
 * O recado entre quem carrega em "Recebido" e o sino.
 *
 * São dois componentes que não se conhecem: a lista de pedidos, que tem o
 * botão, e o sino, que vive no layout do painel inteiro. Até aqui a única
 * forma de o sino saber que alguém tinha visto um pedido era esperar que
 * o Realtime lhe trouxesse a alteração da base de dados.
 *
 * E isso falhava da pior maneira. O botão escondia-se na hora — a lista
 * actualizava-se — e o alarme continuava a tocar até o evento chegar. Se
 * não chegasse (telemóvel adormecido, rede da casa a falhar, canal a
 * religar-se), não chegava nunca: o Realtime não repõe o que perdeu.
 * Quem acabou de carregar em "Recebido" ouvia o alarme a insistir, e
 * concluía, com razão, que o botão não funcionava.
 *
 * Um evento do próprio browser não passa pela rede. Chega no mesmo
 * instante, e chega sempre.
 */

const NOME = 'cardapp:pedido-visto';

/** Diz ao sino que este pedido já foi visto por alguém. */
export function avisarQueFoiVisto(pedidoId: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOME, { detail: pedidoId }));
}

/** Escuta os pedidos que foram vistos. Devolve a função que deixa de escutar. */
export function aoVerPedido(fazer: (pedidoId: string) => void) {
  if (typeof window === 'undefined') return () => {};

  const ouvinte = (evento: Event) => {
    const id = (evento as CustomEvent<string>).detail;
    if (typeof id === 'string' && id) fazer(id);
  };

  window.addEventListener(NOME, ouvinte);
  return () => window.removeEventListener(NOME, ouvinte);
}
