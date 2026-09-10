/**
 * Para onde o dinheiro vai.
 *
 * Isto não é segredo nenhum — é precisamente o que tem de aparecer no
 * ecrã a quem vai pagar. Está aqui, e não numa variável de ambiente, por
 * uma razão prática: é o único ecrã da aplicação que pede dinheiro, e
 * uma variável em falta deixava-o em branco. Um ecrã de pagamento sem
 * conta para onde pagar é pior do que não existir.
 *
 * O ambiente ainda manda, para o dia em que a conta mudar sem esperar
 * por um deploy.
 */

export const CONTA_PARA_PAGAR = {
  /** Multicaixa Express — o caminho rápido, do telemóvel. */
  express: process.env.NEXT_PUBLIC_EXPRESS ?? '930207076',

  /** Transferência bancária, para quem prefere o banco. */
  iban: process.env.NEXT_PUBLIC_IBAN ?? '0040.0000.8753.8936.1010.2',

  /**
   * O nome que aparece na app do banco de quem transfere.
   *
   * Tem de estar no ecrã. Quem escreve o IBAN e vê aparecer um nome de
   * pessoa onde esperava o da empresa hesita — e com razão. Dizer-lho
   * antes evita a transferência que não chega a ser feita.
   */
  titular: process.env.NEXT_PUBLIC_TITULAR ?? 'Vanderlei Francisco Sabonete',
} as const;

/**
 * Quantos dias o painel reabre só por a casa ter subido o comprovativo.
 *
 * Não é confiança cega nem desconfiança: é a medida do prejuízo. Quem
 * pagou às dez da noite de sábado não pode ficar sem painel até alguém
 * abrir o banco na segunda — e se o comprovativo for falso, custa três
 * dias e não um mês.
 */
export const DIAS_PROVISORIOS = 3;

/** O que se aceita como comprovativo, e até que tamanho. */
export const COMPROVATIVO = {
  tipos: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'],
  tamanhoMaximo: 6 * 1024 * 1024,
  balde: 'comprovativos',
} as const;
