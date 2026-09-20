import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * O que o Supabase devolve não é uma Promise.
 *
 * `supabase.from(...)` e `supabase.rpc(...)` devolvem um construtor de
 * consulta que implementa `PromiseLike`: tem `then` e mais nada. Um
 * `await` funciona, um `Promise.all` funciona — e `.catch(...)` rebenta,
 * porque o método não existe.
 *
 * O pior é como rebenta. O `.catch` é lido antes de o pedido sair, por
 * isso o pedido nunca sai; e como isto acontece dentro de uma função
 * assíncrona, a promessa fica rejeitada em silêncio e não há erro
 * nenhum no ecrã. Fica só uma chamada que nunca aconteceu.
 *
 * Aconteceu à batida de presença. Durante semanas, nenhuma casa marcou
 * que tinha aberto o painel: o painel de administração dava toda a
 * gente como "nunca abriu o painel", que é exactamente o aviso que
 * aquela secção existe para dar. E o TypeScript deixou passar, porque
 * o molde que tapa a falta de tipos gerados prometia uma `Promise`.
 *
 * A regra é escrever `try { await ... } catch {}`.
 */

const RAIZ = process.cwd();

/** Os métodos que devolvem um construtor de consulta, e não uma Promise. */
const CONSTRUTORES = [
  'rpc',
  'from',
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'single',
  'maybeSingle',
];

/** Ex.: `.rpc('marcar_visto').catch(...)`, `.single().finally(...)`. */
const CHAMADA = new RegExp(
  String.raw`\.(${CONSTRUTORES.join('|')})\((?:[^()]|\([^()]*\))*\)\s*\.(catch|finally)\b`,
  'g',
);

function* ficheiros(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* ficheiros(p);
    else if (/\.tsx?$/.test(e.name)) yield p;
  }
}

describe('o construtor de consulta do Supabase', () => {
  it('nunca leva .catch nem .finally agarrado', () => {
    const falhas: string[] = [];

    for (const f of ficheiros(path.join(RAIZ, 'src'))) {
      const texto = readFileSync(f, 'utf8');
      const linhas = texto.split(/\r?\n/);

      linhas.forEach((linha, i) => {
        for (const achado of linha.matchAll(CHAMADA)) {
          falhas.push(`${path.relative(RAIZ, f)}:${i + 1}: ${achado[0].trim()}`);
        }
      });
    }

    expect(falhas).toEqual([]);
  });

  it('a expressão apanha mesmo o erro que já aconteceu', () => {
    // Sem isto, uma expressão partida deixava o teste a passar sempre.
    const partido = "await comRpc.rpc('marcar_visto').catch(() => {});";
    expect([...partido.matchAll(CHAMADA)]).toHaveLength(1);

    const certo = 'await comRpc.rpc(\'marcar_visto\');';
    expect([...certo.matchAll(CHAMADA)]).toHaveLength(0);
  });
});
