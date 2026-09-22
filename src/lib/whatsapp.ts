import { formatarKz, horaLuanda, normalizarWhatsApp, numeroMesa } from './format';
import type { ItemPedido, PedidoParaMensagem } from './tipos';

/**
 * Largura da coluna de texto da mensagem, contada a partir do primeiro
 * caracter depois do marcador do item. E o que faz os precos alinharem
 * uns por baixo dos outros quando o WhatsApp usa tipo monoespacado.
 */
export const LARGURA_LINHA = 39;

const MARCADOR = '▪️'; // pequeno quadrado preto
const SETA_OBS = '↳';
const TALHER = '\u{1f37d}';

/**
 * Junta rotulo e valor com um pontilhado a preencher o meio.
 * Nomes muito longos deixam de caber: nesse caso mantemos sempre dois
 * pontos de separacao e a linha cresce, em vez de cortar o nome do prato
 * (o restaurante tem de conseguir ler o que foi pedido).
 */
export function alinhar(rotulo: string, valor: string, largura = LARGURA_LINHA) {
  const espaco = largura - rotulo.length - valor.length - 2;
  const pontos = '.'.repeat(Math.max(espaco, 2));
  return `${rotulo} ${pontos} ${valor}`;
}

/**
 * As opções de uma linha, uma por linha de texto.
 *
 * O tamanho vai sozinho ("· Grande"): o preço dele já está no preço do
 * prato. Um extra leva "+" e o que acrescenta ("+ Queijo (+500 Kz)"),
 * para quem confere a conta perceber de onde vem a diferença.
 *
 * Serve a mensagem de WhatsApp e os ecrãs do painel — é a mesma leitura.
 */
export function descreverOpcoes(item: Pick<ItemPedido, 'opcoes'>): string[] {
  return (item.opcoes ?? []).map((opcao) =>
    opcao.tipo === 'variante'
      ? `· ${opcao.nome}`
      : `+ ${opcao.nome}${opcao.preco > 0 ? ` (+${formatarKz(opcao.preco)})` : ''}`,
  );
}

export function totalDoPedido(itens: ItemPedido[]) {
  return itens.reduce((soma, item) => soma + item.preco * item.qtd, 0);
}

/**
 * Constroi a mensagem de encomenda tal como chega ao WhatsApp do restaurante.
 * Formato fixo — ha testes unitarios a proteger o alinhamento, o separador
 * de milhares e as observacoes opcionais.
 */
export function buildWhatsAppMessage(pedido: PedidoParaMensagem): string {
  const { restaurante, mesa, itens } = pedido;
  const total = pedido.total ?? totalDoPedido(itens);
  const hora = horaLuanda(pedido.data ?? new Date());
  const pagamento = pedido.pagamento ?? 'na mesa';

  const destino = mesa == null ? 'Balcão' : `Mesa ${numeroMesa(mesa)}`;

  const linhas: string[] = [];
  linhas.push(`${TALHER} NOVO PEDIDO — ${destino}`);
  linhas.push(`${restaurante} · ${hora}`);
  linhas.push('');

  for (const item of itens) {
    const rotulo = `${item.qtd}x ${item.nome}`;
    const valor = formatarKz(item.preco * item.qtd);
    linhas.push(`${MARCADOR} ${alinhar(rotulo, valor)}`);

    // As opções vêm antes da observação: primeiro o que é o prato
    // (Grande, com queijo), depois o que se pede à cozinha (sem cebola).
    for (const linha of descreverOpcoes(item)) linhas.push(`   ${linha}`);

    const obs = item.obs?.trim();
    if (obs) linhas.push(`   ${SETA_OBS} ${obs}`);
  }

  /*
   * A observação do pedido vai depois dos itens e antes do total.
   *
   * Não vai no fim: quem lê isto está de pé, numa cozinha, e o que vem
   * depois do total costuma não ser lido. Uma alergia lida tarde de
   * mais vale o mesmo que uma alergia não escrita.
   */
  const observacao = pedido.observacao?.trim();
  if (observacao) {
    linhas.push('');
    linhas.push(`${SETA_OBS} ${observacao}`);
  }

  linhas.push('');
  linhas.push(alinhar('TOTAL', formatarKz(total)));
  linhas.push(`Pagamento: ${pagamento}`);
  linhas.push('');
  linhas.push('— enviado via CardApp');

  return linhas.join('\n');
}

/** Link wa.me pronto a abrir, com a mensagem ja codificada. */
export function buildWhatsAppUrl(whatsapp: string, pedido: PedidoParaMensagem) {
  const numero = normalizarWhatsApp(whatsapp);
  return `https://wa.me/${numero}?text=${encodeURIComponent(buildWhatsAppMessage(pedido))}`;
}
