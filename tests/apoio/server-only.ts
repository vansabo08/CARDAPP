/**
 * Substituto do `server-only` para os testes.
 *
 * O pacote verdadeiro rebenta de propósito quando é importado fora de um
 * Server Component — é essa a função dele. Nos testes não há React nem
 * pedido nenhum, e sem este substituto qualquer teste que toque numa
 * rota falha a carregar em vez de correr.
 *
 * Não desliga a protecção: em produção continua a ser o pacote real.
 */
export {};
