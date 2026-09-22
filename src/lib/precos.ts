import type { GrupoOpcoes, OpcaoEscolhida, Prato } from './tipos';

/**
 * O preço de um prato, com promoção, tamanho e extras.
 *
 * É a mesma função no telemóvel do cliente e no servidor. O telemóvel
 * usa-a para mostrar o preço a mudar enquanto se escolhe; o servidor usa-a
 * para NÃO acreditar no que o telemóvel mandou e fazer a conta outra vez,
 * a partir da base. Se as duas contas fossem escritas duas vezes, um dia
 * davam números diferentes — e o cliente pagava um preço que não viu.
 *
 * AS REGRAS:
 *
 *   - Sem tamanho, o preço é o do prato. Com tamanho, é o do tamanho.
 *   - Os extras somam-se por cima.
 *   - A promoção desconta o prato (ou o tamanho) na mesma proporção:
 *     "-20%" no prato é "-20%" no Grande também. Os extras não descontam
 *     — o queijo custa o que custa.
 *   - A promoção só conta dentro das datas.
 */

/** Kwanzas redondos: a promoção de 20% sobre 4 750 dá 3 800, e não 3 800,00000001. */
const aoKwanza = (valor: number) => Math.round(valor);

export function promocaoActiva(
  prato: Pick<Prato, 'preco' | 'preco_promocional' | 'promo_inicio' | 'promo_fim'>,
  agora: number = Date.now(),
): boolean {
  const promo = prato.preco_promocional;
  if (promo == null || !(prato.preco > 0) || promo < 0 || promo >= prato.preco) return false;
  if (prato.promo_inicio && new Date(prato.promo_inicio).getTime() > agora) return false;
  if (prato.promo_fim && new Date(prato.promo_fim).getTime() <= agora) return false;
  return true;
}

/** "-20%": o desconto arredondado à unidade, para o selo. */
export function descontoEmPercentagem(prato: Pick<Prato, 'preco' | 'preco_promocional'>): number {
  if (prato.preco_promocional == null || !(prato.preco > 0)) return 0;
  return Math.round((1 - prato.preco_promocional / prato.preco) * 100);
}

/** O preço do prato ou de um tamanho, com a promoção aplicada se estiver activa. */
function comPromocao(prato: Prato, precoCheio: number, agora: number) {
  if (!promocaoActiva(prato, agora)) return precoCheio;
  // Sem tamanho, o preço de promoção é o que o dono escreveu, tal e qual.
  if (precoCheio === prato.preco) return prato.preco_promocional!;
  return aoKwanza(precoCheio * (prato.preco_promocional! / prato.preco));
}

function grupos(prato: Prato): GrupoOpcoes[] {
  return [...(prato.grupos ?? [])].sort((a, b) => a.ordem - b.ordem);
}

/** O que se mostra na lista: o preço de hoje, e o de antes se houver promoção. */
export function precoDeMontra(prato: Prato, agora: number = Date.now()) {
  const variante = grupos(prato).find((g) => g.tipo === 'variante');
  const tamanhos = variante?.opcoes.filter((o) => o.disponivel) ?? [];

  if (tamanhos.length) {
    const cheio = Math.min(...tamanhos.map((o) => o.preco));
    return { desde: true, agora: comPromocao(prato, cheio, agora), antes: promocaoActiva(prato, agora) ? cheio : null };
  }
  return {
    desde: false,
    agora: comPromocao(prato, prato.preco, agora),
    antes: promocaoActiva(prato, agora) ? prato.preco : null,
  };
}

/**
 * Porque é que uma escolha não serve. O `erro` vem em português, para o
 * servidor e para o painel; o `codigo` deixa o cardápio dizê-lo na língua
 * de quem está a escolher.
 */
export type ErroDeEscolha = {
  ok: false;
  erro: string;
  codigo: 'opcao' | 'opcao_esgotada' | 'escolha' | 'minimo' | 'maximo';
  grupo?: GrupoOpcoes;
  n?: number;
};

export type ContaDaLinha = { ok: true; unitario: number; opcoes: OpcaoEscolhida[] } | ErroDeEscolha;

/**
 * O preço unitário de um prato com as opções escolhidas — ou a razão por
 * que a escolha não serve.
 *
 * Recusa o que o ecrã nunca devia deixar mandar: uma opção que não é
 * deste prato, uma esgotada, um tamanho em falta, extras a mais. No
 * servidor isto é a defesa; no telemóvel é o que desliga o botão.
 */
export function contarLinha(
  prato: Prato,
  opcaoIds: readonly string[],
  agora: number = Date.now(),
): ContaDaLinha {
  const escolhidas = new Set(opcaoIds);
  const lista = grupos(prato);
  const conhecidas = new Set(lista.flatMap((g) => g.opcoes.map((o) => o.id)));

  for (const id of escolhidas) {
    if (!conhecidas.has(id)) {
      return { ok: false, codigo: 'opcao', erro: 'Uma das opções já não existe. Volte a escolher.' };
    }
  }

  let base = prato.preco;
  let extras = 0;
  const opcoes: OpcaoEscolhida[] = [];

  for (const grupo of lista) {
    const doGrupo = [...grupo.opcoes]
      .sort((a, b) => a.ordem - b.ordem)
      .filter((o) => escolhidas.has(o.id));

    if (doGrupo.some((o) => !o.disponivel)) {
      return { ok: false, codigo: 'opcao_esgotada', grupo, erro: `Uma opção de ${grupo.nome} esgotou. Escolha outra.` };
    }
    if (doGrupo.length < grupo.minimo) {
      const uma = grupo.tipo === 'variante' || grupo.minimo === 1;
      return {
        ok: false,
        codigo: uma ? 'escolha' : 'minimo',
        grupo,
        n: grupo.minimo,
        erro: uma
          ? `Escolha ${grupo.nome.toLowerCase()}.`
          : `Escolha pelo menos ${grupo.minimo} em ${grupo.nome.toLowerCase()}.`,
      };
    }
    if (doGrupo.length > grupo.maximo) {
      return {
        ok: false,
        codigo: 'maximo',
        grupo,
        n: grupo.maximo,
        erro: `No máximo ${grupo.maximo} em ${grupo.nome.toLowerCase()}.`,
      };
    }

    for (const opcao of doGrupo) {
      if (grupo.tipo === 'variante') base = opcao.preco;
      else extras += opcao.preco;
      opcoes.push({ grupo: grupo.nome, nome: opcao.nome, preco: opcao.preco, tipo: grupo.tipo });
    }
  }

  const unitario = Math.round((comPromocao(prato, base, agora) + extras) * 100) / 100;
  return { ok: true, unitario, opcoes };
}

/** Se o prato pede escolhas antes de ir para o carrinho. */
export function temEscolhasObrigatorias(prato: Prato) {
  return grupos(prato).some((g) => g.minimo > 0 && g.opcoes.some((o) => o.disponivel));
}
