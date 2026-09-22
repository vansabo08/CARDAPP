import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';

/**
 * A tradução automática do cardápio, de português para inglês.
 *
 * É um ponto de partida, não a palavra final: preenche os campos em
 * inglês, e o dono corrige o que quiser — o campo fica sempre editável.
 *
 * Usa o Claude, com a chave em `ANTHROPIC_API_KEY`. Sem a chave, a
 * tradução automática não existe e o ecrã diz isso; os campos em inglês
 * continuam a poder ser escritos à mão.
 *
 * O QUE O MODELO TEM DE SABER, E UM TRADUTOR QUALQUER NÃO SABE: os nomes
 * dos pratos angolanos não se traduzem. "Funge" não é "porridge" e
 * "Muamba" não é "stew" — um turista que pede Muamba quer comer Muamba.
 * O nome fica, e acrescenta-se em inglês o que ajuda a perceber o prato
 * ("Chicken Muamba"). As marcas (Cuca, Blue, Coca-Cola) e as medidas
 * (33cl) ficam como estão.
 */

const INSTRUCOES = `You translate restaurant menu text from Angolan Portuguese into natural, appetising English for international guests reading the menu on their phone at the table.

Rules:
- Angolan and Portuguese dish names with no real English equivalent stay in the original (Muamba, Funge, Calulu, Mufete, Kizaca, Kitaba, Moamba, Mukua, Quitaba, Cabidela, Chouriço, Bacalhau). Add plain English around them so the dish is understandable: "Muamba de Galinha" becomes "Chicken Muamba", "Funge de Bombó" becomes "Cassava Funge".
- Brand names and sizes stay exactly as written: Cuca, Blue, Nocal, Coca-Cola, 33cl, 1L.
- Keep it short, like the original. Menu names stay short; descriptions stay one line. Never add information that is not in the original, never add prices.
- Section and option names ("Entradas", "Tamanho", "Meia dose", "Mais funge") become the normal English a restaurant would print ("Starters", "Size", "Half portion", "Extra funge").
- If a text is already English, or is only a brand or a number, return it unchanged.

Every input has an index. Return one translation per index, with the same index.`;

const RESPOSTA = z.object({
  traducoes: z.array(z.object({ i: z.number().int(), en: z.string() })),
});

/** Quantos textos vão de cada vez. Um cardápio grande parte-se em várias. */
const POR_PEDIDO = 80;

export function traducaoConfigurada() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export type ResultadoTraducao = { ok: true; traducoes: string[] } | { ok: false; erro: string };

/**
 * Traduz uma lista de textos, pela mesma ordem.
 *
 * Um texto vazio volta vazio, sem ir ao modelo. Se uma parte falhar, a
 * lista inteira falha: meio cardápio traduzido e meio não, sem se saber
 * qual, era pior do que tentar outra vez.
 */
export async function traduzirParaIngles(textos: string[]): Promise<ResultadoTraducao> {
  if (!traducaoConfigurada()) {
    return {
      ok: false,
      erro: 'A tradução automática não está configurada neste servidor (falta a chave ANTHROPIC_API_KEY). Pode escrever o inglês à mão.',
    };
  }

  const client = new Anthropic();
  const traducoes = textos.map(() => '');
  const porTraduzir = textos
    .map((texto, i) => ({ i, texto: texto.trim() }))
    .filter((t) => t.texto.length > 0);

  for (let inicio = 0; inicio < porTraduzir.length; inicio += POR_PEDIDO) {
    const lote = porTraduzir.slice(inicio, inicio + POR_PEDIDO);

    try {
      const resposta = await client.beta.messages.parse({
        model: 'claude-opus-5',
        max_tokens: 16000,
        // Uma tradução curta não precisa de pensar muito.
        output_config: { effort: 'low', format: betaZodOutputFormat(RESPOSTA) },
        // Se o pedido for recusado, o próprio serviço tenta com outro modelo.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: INSTRUCOES,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(lote.map(({ i, texto }) => ({ i, pt: texto }))),
          },
        ],
      });

      if (resposta.stop_reason === 'refusal' || !resposta.parsed_output) {
        return { ok: false, erro: 'O serviço de tradução não respondeu como devia. Tente outra vez.' };
      }

      const pedidos = new Set(lote.map((t) => t.i));
      for (const { i, en } of resposta.parsed_output.traducoes) {
        if (pedidos.has(i)) traducoes[i] = en.trim();
      }
    } catch (erro) {
      if (erro instanceof Anthropic.RateLimitError) {
        return { ok: false, erro: 'O serviço de tradução está ocupado. Tente daqui a um minuto.' };
      }
      if (erro instanceof Anthropic.AuthenticationError) {
        return { ok: false, erro: 'A chave de tradução do servidor não é válida.' };
      }
      console.error('[traducao]', erro instanceof Anthropic.APIError ? erro.status : '', erro);
      return { ok: false, erro: 'Não foi possível traduzir agora. Tente outra vez.' };
    }
  }

  return { ok: true, traducoes };
}
