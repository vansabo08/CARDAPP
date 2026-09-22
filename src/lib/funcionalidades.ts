import {
  FUNCIONALIDADES_DO_PLANO,
  PLANOS,
  type Funcionalidade,
  type Plano,
} from '@/config/planos';

export type { Funcionalidade };

/**
 * A pergunta única: esta casa tem esta funcionalidade?
 *
 * Todas as funcionalidades do Plano Sala passam por aqui — no servidor,
 * nas rotas e no ecrã. Espalhar `plano === 'sala'` pelo código é a
 * maneira certa de, no dia em que houver um terceiro plano, esquecer um
 * sítio e dar de graça o que se vende.
 *
 * A base de dados faz a mesma pergunta por conta própria, nas políticas
 * e nas funções. Esta não a substitui: poupa ao ecrã mostrar um botão
 * que a base ia recusar.
 */
export function temFuncionalidade(
  restaurante: { plano: Plano } | null | undefined,
  funcionalidade: Funcionalidade,
): boolean {
  if (!restaurante) return false;
  return FUNCIONALIDADES_DO_PLANO[restaurante.plano]?.includes(funcionalidade) ?? false;
}

/** O plano mais barato que abre uma funcionalidade. */
export function planoQueAbre(funcionalidade: Funcionalidade): Plano {
  return FUNCIONALIDADES_DO_PLANO.mesa.includes(funcionalidade) ? 'mesa' : 'sala';
}

/** Onde se compra o plano que abre uma funcionalidade. */
export function ligacaoParaAbrir(funcionalidade: Funcionalidade): string {
  return PLANOS[planoQueAbre(funcionalidade)].link;
}

/** O que se diz a quem ainda não tem — no cartão de upgrade. */
export const APRESENTACAO: Record<Funcionalidade, { nome: string; frase: string }> = {
  estatisticas: {
    nome: 'Números do dia',
    frase: 'O que entrou hoje, os pratos que mais saem e a hora de mais movimento.',
  },
  sem_marca: {
    nome: 'Cardápio só com a sua marca',
    frase: 'Sem a assinatura do CardApp no fundo do cardápio.',
  },
  chamar_empregado: {
    nome: 'Chamar o empregado',
    frase: 'O cliente chama da mesa ou pede a conta, e o painel toca na hora.',
  },
  salao: {
    nome: 'O salão ao vivo',
    frase: 'Cada mesa com o seu estado, o que já consumiu e há quanto tempo está sentada.',
  },
  equipa: {
    nome: 'Equipa com permissões',
    frase: 'Gerente, empregados e cozinha, cada um só com o que precisa de ver.',
  },
  relatorios: {
    nome: 'Relatórios de vendas',
    frase: 'Faturação por dia, os dez pratos que mais saem, horas de pico e CSV.',
  },
  esgotado_ao_vivo: {
    nome: 'Esgotado em tempo real',
    frase: 'Um toque e o prato sai do cardápio do cliente, sem ele recarregar.',
  },
  opcoes: {
    nome: 'Adicionais e variantes',
    frase: 'Tamanhos, extras com preço e notas — tudo escrito no pedido.',
  },
  menus_horario: {
    nome: 'Cardápios por horário',
    frase: 'Pequeno-almoço de manhã, almoço ao meio-dia — o cliente vê o que está a servir.',
  },
  promocoes: {
    nome: 'Promoções e prato do dia',
    frase: 'Preço riscado, selo de desconto e fim marcado. Acabam sozinhas.',
  },
  avaliacoes: {
    nome: 'Avaliações',
    frase: 'Estrelas e comentários de quem acabou de comer, e aviso quando alguém sai insatisfeito.',
  },
  multi_idioma: {
    nome: 'Cardápio em inglês',
    frase: 'O cliente escolhe português ou inglês, com tradução automática para começar.',
  },
};
