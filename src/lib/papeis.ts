/**
 * Quem entra onde, no painel.
 *
 * O dono é quem criou a casa e paga. Os outros três são convidados por
 * ele, e só existem no Plano Sala:
 *
 *   gerente   → gere a casa no dia-a-dia: cardápio, mesas, relatórios,
 *               e a equipa (menos o dono). Não mexe no plano nem nas
 *               definições da conta.
 *   empregado → anda pela sala: pedidos, salão e alertas.
 *   cozinha   → só os pedidos a preparar.
 *
 * Esta tabela manda no menu e na porta de cada página (o middleware
 * lê-a). A base de dados tem as suas próprias regras, em
 * `0017_plano_sala_equipa_sessoes_alertas.sql`, e é essa a que decide se
 * os dados saem. Esta existe para ninguém ver um ecrã que depois lhe
 * responde vazio.
 */

export type Papel = 'dono' | 'gerente' | 'empregado' | 'cozinha';

/** Os papéis que se podem dar num convite. O de dono não se dá. */
export type PapelDeMembro = Exclude<Papel, 'dono'>;

export const PAPEIS_DE_MEMBRO: readonly PapelDeMembro[] = ['gerente', 'empregado', 'cozinha'];

export type Area =
  | 'resumo'
  | 'pedidos'
  | 'salao'
  | 'mesas'
  | 'cardapio'
  | 'estatisticas'
  | 'relatorios'
  | 'avaliacoes'
  | 'equipa'
  | 'definicoes'
  | 'pagar';

const AREAS_DO_PAPEL: Record<Papel, readonly Area[]> = {
  dono: [
    'resumo',
    'pedidos',
    'salao',
    'mesas',
    'cardapio',
    'estatisticas',
    'relatorios',
    'avaliacoes',
    'equipa',
    'definicoes',
    'pagar',
  ],
  gerente: [
    'resumo',
    'pedidos',
    'salao',
    'mesas',
    'cardapio',
    'estatisticas',
    'relatorios',
    'avaliacoes',
    'equipa',
  ],
  empregado: ['pedidos', 'salao'],
  cozinha: ['pedidos'],
};

export const NOME_PAPEL: Record<Papel, string> = {
  dono: 'Dono',
  gerente: 'Gerente',
  empregado: 'Empregado',
  cozinha: 'Cozinha',
};

export const DESCRICAO_PAPEL: Record<PapelDeMembro, string> = {
  gerente: 'Cardápio, mesas, relatórios e equipa. Não mexe no plano nem na conta.',
  empregado: 'Pedidos, salão e chamadas das mesas.',
  cozinha: 'Só os pedidos a preparar.',
};

export function podeEntrar(papel: Papel, area: Area): boolean {
  return AREAS_DO_PAPEL[papel].includes(area);
}

/** As rotas do painel e a área a que cada uma pertence. */
const ROTAS: readonly [prefixo: string, area: Area][] = [
  ['/painel/pedidos', 'pedidos'],
  ['/painel/salao', 'salao'],
  ['/painel/mesas', 'mesas'],
  ['/painel/cardapio', 'cardapio'],
  ['/painel/estatisticas', 'estatisticas'],
  ['/painel/relatorios', 'relatorios'],
  ['/painel/avaliacoes', 'avaliacoes'],
  ['/painel/equipa', 'equipa'],
  ['/painel/definicoes', 'definicoes'],
  ['/painel/pagar', 'pagar'],
];

/**
 * A área de um caminho do painel, ou nulo se não for do painel.
 *
 * Um caminho do painel que não esteja na lista conta como "resumo" — o
 * mais restrito dos que o dono e o gerente têm. Uma página nova que
 * alguém se esqueça de registar fica fechada a empregado e cozinha, e
 * não aberta a toda a gente.
 */
export function areaDoCaminho(caminho: string): Area | null {
  if (caminho !== '/painel' && !caminho.startsWith('/painel/')) return null;
  for (const [prefixo, area] of ROTAS) {
    if (caminho === prefixo || caminho.startsWith(`${prefixo}/`)) return area;
  }
  return 'resumo';
}

/** Para onde vai cada papel quando entra, ou quando bate numa porta fechada. */
export function paginaInicial(papel: Papel): string {
  if (papel === 'cozinha') return '/painel/pedidos';
  if (papel === 'empregado') return '/painel/salao';
  return '/painel';
}

/**
 * Quem pode convidar, mudar ou tirar quem.
 *
 * O dono gere toda a equipa. O gerente gere a equipa também, mas não
 * pode fazer-se passar por dono: não há papel de dono para dar, e isso
 * fica garantido por `PapelDeMembro` não o incluir.
 */
export function podeGerirEquipa(papel: Papel): boolean {
  return papel === 'dono' || papel === 'gerente';
}

export function ePapel(valor: unknown): valor is Papel {
  return valor === 'dono' || valor === 'gerente' || valor === 'empregado' || valor === 'cozinha';
}

export function ePapelDeMembro(valor: unknown): valor is PapelDeMembro {
  return valor === 'gerente' || valor === 'empregado' || valor === 'cozinha';
}
