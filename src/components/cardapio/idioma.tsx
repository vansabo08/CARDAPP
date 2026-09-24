/**
 * Os textos fixos do cardápio do cliente.
 *
 * "Ver pedido", "Juntar", "Obrigatório" — as frases que são da app e
 * não da casa. Ficam todas aqui, numa tabela, e os ecrãs pedem-nas por
 * nome: `t('verPedido')`. Ter as frases num sítio só é o que permite
 * corrigir uma palavra sem a andar a caçar por dez ficheiros.
 *
 * ISTO JÁ FOI UM CARDÁPIO EM DUAS LÍNGUAS, com um botão PT|EN no canto,
 * os nomes dos pratos em inglês na base de dados e tradução automática
 * no painel. O dono mandou tirar, e saiu: o cardápio é em português, que
 * é a língua de quem se senta à mesa em Angola. As colunas `_en` ficaram
 * na base de dados, vazias e sem ninguém a lê-las — apagá-las era
 * destrutivo e não devolvia nada em troca.
 */



const TEXTOS = {
  pt: {
    cardapio: 'Cardápio',
    mesa: 'Mesa {n}',
    categorias: 'Categorias',
    maisPedidos: 'Mais pedidos',
    aServir: 'A servir:',
    ateAs: '{menu} até às {hora}',
    pratoDoDia: 'Prato do dia',
    foraDeHorasTitulo: 'A cozinha está a descansar.',
    foraDeHorasTexto: 'Neste momento não há nada a servir. Os horários da casa:',
    desde: 'desde',
    antes: 'antes',
    esgotado: 'esgotado',
    adicionar: 'Adicionar {nome}',
    verPedido: 'Ver pedido',
    enviarPedido: 'Enviar pedido',
    enviarWhatsApp: 'Enviar pedido pelo WhatsApp',
    noPedido: '{n} no pedido',
    oSeuPedido: 'O seu pedido',
    resumo: 'Resumo do pedido',
    cada: '{preco} cada',
    obsCozinha: 'Observação para a cozinha',
    opcional: 'opcional',
    obsCozinhaAjuda: 'Alergias, pontos da carne, talheres a mais — o que for do pedido todo.',
    obsCozinhaExemplo: 'Ex.: sem cebola, pouco sal, somos alérgicos a marisco…',
    caracteres: '{n} caracteres',
    total: 'Total',
    segueApp: 'O pedido segue para o restaurante e pode acompanhá-lo aqui. O pagamento é feito na mesa.',
    segueWhatsApp: 'O pedido segue para o WhatsApp do restaurante. O pagamento é feito na mesa.',
    continuar: 'Continuar a escolher',
    obsPrato: 'Observação para este prato',
    obsPratoExemplo: 'sem cebola, bem passado, para partilhar…',
    obrigatorio: 'Obrigatório',
    opcionalTitulo: 'Opcional',
    escolhaN: 'Escolha {min}',
    escolhaNaM: 'Escolha {min} a {max}',
    ateN: 'Até {max}',
    gratis: 'grátis',
    juntar: 'Juntar',
    esgotadoBotao: 'Esgotado',
    menosUm: 'Menos um {nome}',
    maisUm: 'Mais um {nome}',
    exemplo: 'Este é o cardápio de exemplo — o pedido não chega a nenhuma cozinha.',
    falhouEnvio: 'Não conseguimos enviar o pedido. Verifique a ligação e tente outra vez.',
    erroEscolha: 'Escolha {grupo}.',
    erroMinimo: 'Escolha pelo menos {n} em {grupo}.',
    erroMaximo: 'No máximo {n} em {grupo}.',
    erroOpcao: 'Uma das opções já não existe. Volte a escolher.',
    erroOpcaoEsgotada: 'Uma opção de {grupo} esgotou. Escolha outra.',
    chamar: 'Chamar empregado',
    pedirConta: 'Pedir a conta',
    avisado: 'avisado',
    fechar: 'Fechar',
    chamarOuConta: 'Chamar o empregado ou pedir a conta',
    semLigacao: 'Sem ligação. Chame o empregado com um gesto.',
    idioma: 'Idioma do cardápio',
  },
} as const;

export type Chave = keyof (typeof TEXTOS)['pt'];

/** O texto fixo, com as variáveis `{assim}` preenchidas. */
export function traduzir(chave: Chave, variaveis: Record<string, string | number> = {}) {
  let texto: string = TEXTOS.pt[chave];
  for (const [nome, valor] of Object.entries(variaveis)) {
    texto = texto.split(`{${nome}}`).join(String(valor));
  }
  return texto;
}

/** Para os testes: as frases todas, para se verem de uma vez. */
export const CHAVES = Object.keys(TEXTOS.pt);

/**
 * O que os ecrãs usam: `t('chave')`.
 *
 * Já foi um contexto de React, com provedor e tudo, porque o cardápio
 * tinha duas línguas e a escolhida vivia no estado. Agora a tabela é uma
 * só e não muda — não há nada para guardar, e um hook sem estado é mais
 * barato do que um contexto que nunca muda de valor.
 */
export function useIdioma() {
  return { t: traduzir };
}
