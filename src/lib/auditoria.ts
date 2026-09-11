import 'server-only';
import { cookies } from 'next/headers';
import { eAdministrador } from './admin';

/**
 * Entrar na casa de outra pessoa.
 *
 * Isto é a coisa mais perigosa que esta aplicação faz, e não vale a pena
 * disfarçá-lo: enquanto está a decorrer, quem administra escreve nos
 * dados de um cliente como se fosse ele. Foi pedido com escrita de
 * propósito — para poder arranjar o cardápio de uma casa que ligue a
 * pedir ajuda — e a decisão está tomada. O que resta é fazer com que
 * seja difícil de fazer por engano e impossível de fazer sem deixar
 * rasto.
 *
 * QUATRO TRAVAS.
 *
 * A permissão é verificada do lado do servidor a cada utilização, e não
 * uma vez à entrada. O cookie sozinho não vale nada: quem o forjar sem
 * ser administrador não consegue coisa nenhuma, porque a lista de
 * administradores nunca vem do browser.
 *
 * O cookie morre ao fim de duas horas. Uma sessão de auditoria
 * esquecida em aberto é o caminho mais provável para se estragar uma
 * casa sem querer — abre-se para ver uma coisa, fecha-se o portátil, e
 * três dias depois mexe-se no que se julga ser a conta própria.
 *
 * A entrada e a saída ficam escritas no livro, com a hora.
 *
 * E há uma faixa no topo de todos os ecrãs do painel enquanto durar, com
 * o nome da casa e a porta de saída ao lado. Não se pode dispensar.
 */

const COOKIE = 'cardapp_auditoria';

/** Duas horas. Passado isso, entra-se outra vez de propósito. */
export const DURACAO_DA_AUDITORIA = 2 * 60 * 60;

/**
 * A casa em que se está a entrar agora, ou nulo.
 *
 * Devolve nulo a quem não for administrador, mesmo com o cookie posto —
 * é aqui que a trava vive, e não no sítio que a chama.
 */
export async function casaEmAuditoria(): Promise<string | null> {
  const armazem = await cookies();
  const id = armazem.get(COOKIE)?.value;
  if (!id) return null;

  if (!(await eAdministrador())) return null;

  return id;
}

export async function marcarAuditoria(restauranteId: string) {
  const armazem = await cookies();
  armazem.set(COOKIE, restauranteId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACAO_DA_AUDITORIA,
  });
}

export async function limparAuditoria() {
  const armazem = await cookies();
  armazem.delete(COOKIE);
}
