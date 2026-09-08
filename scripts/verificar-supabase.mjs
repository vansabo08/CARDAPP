/**
 * Confere se a ligação ao Supabase está de pé e se o esquema foi criado.
 *
 *   node scripts/verificar-supabase.mjs
 *
 * Só faz leituras. Usa a chave anónima — a mesma que o browser usa — por
 * isso o que passa aqui é exactamente o que o cardápio público consegue
 * fazer, e o que falha por política de RLS falha por bom motivo.
 */

import { readFileSync } from 'node:fs';

const VERDE = '\x1b[32m';
const VERMELHO = '\x1b[31m';
const AMARELO = '\x1b[33m';
const CINZA = '\x1b[90m';
const FIM = '\x1b[0m';

function lerEnv() {
  let texto = '';
  for (const ficheiro of ['.env.local', '.env']) {
    try {
      texto += readFileSync(ficheiro, 'utf8') + '\n';
    } catch {
      /* pode não existir */
    }
  }

  const env = {};
  for (const linha of texto.split('\n')) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const igual = limpa.indexOf('=');
    if (igual < 0) continue;
    env[limpa.slice(0, igual).trim()] = limpa
      .slice(igual + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = lerEnv();
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const CHAVE = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const resultados = [];
const anotar = (estado, titulo, detalhe = '') => resultados.push({ estado, titulo, detalhe });

function mostrar() {
  console.log('');
  for (const { estado, titulo, detalhe } of resultados) {
    const marca =
      estado === 'ok' ? `${VERDE}✓${FIM}` : estado === 'aviso' ? `${AMARELO}!${FIM}` : `${VERMELHO}✗${FIM}`;
    console.log(`  ${marca} ${titulo}${detalhe ? `\n      ${CINZA}${detalhe}${FIM}` : ''}`);
  }

  const falhas = resultados.filter((r) => r.estado === 'erro').length;
  const avisos = resultados.filter((r) => r.estado === 'aviso').length;
  console.log('');
  if (falhas) {
    console.log(`  ${VERMELHO}${falhas} problema(s).${FIM} Veja acima o que falta.\n`);
    process.exitCode = 1;
  } else {
    console.log(`  ${VERDE}Ligação boa.${FIM}${avisos ? ` ${AMARELO}${avisos} aviso(s).${FIM}` : ''}\n`);
  }
}

async function pedir(caminho, opcoes = {}) {
  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    ...opcoes,
    headers: {
      apikey: CHAVE,
      Authorization: `Bearer ${CHAVE}`,
      ...(opcoes.headers ?? {}),
    },
  });
  return resposta;
}

async function principal() {
  console.log(`\n${CINZA}Cardapp — verificação do Supabase${FIM}`);

  /* ----------------------------- ambiente ---------------------------- */

  if (!URL_BASE || URL_BASE.includes('xxxx')) {
    anotar('erro', 'NEXT_PUBLIC_SUPABASE_URL em falta', 'Copie .env.example para .env.local e preencha.');
    return mostrar();
  }
  if (!CHAVE || CHAVE.length < 30) {
    anotar('erro', 'NEXT_PUBLIC_SUPABASE_ANON_KEY em falta', 'É a chave "anon public", não a service_role.');
    return mostrar();
  }
  if (/service_role/.test(CHAVE)) {
    anotar('erro', 'A chave parece ser a service_role', 'Use a anon public — a service_role nunca vai para o browser.');
    return mostrar();
  }

  anotar('ok', `Projecto ${new global.URL(URL_BASE).hostname}`);

  const site = env.NEXT_PUBLIC_SITE_URL ?? '';
  if (!site) {
    anotar('aviso', 'NEXT_PUBLIC_SITE_URL não definido', 'Os QR das mesas vão apontar para localhost:3000.');
  } else if (site.includes('localhost')) {
    anotar('aviso', `QR das mesas apontam para ${site}`, 'Mude antes de imprimir os cartões.');
  } else {
    anotar('ok', `QR das mesas apontam para ${site}`);
  }

  /* ------------------------------- rede ------------------------------ */

  // Sonda contra uma tabela real: o endpoint raiz /rest/v1/ exige chave
  // secreta e devolvia 401 mesmo com a chave certa.
  try {
    const resposta = await pedir('/rest/v1/restaurants?select=id&limit=1');
    const corpo = await resposta.text();

    if (resposta.status === 401) {
      anotar('erro', 'A chave foi recusada (401)', corpo.slice(0, 160));
      return mostrar();
    }

    if (resposta.status === 404 && corpo.includes('PGRST205')) {
      anotar('ok', 'A chave é aceite pela API');
      anotar(
        'erro',
        'O esquema ainda não existe',
        'Corra supabase/migrations/0001_esquema.sql no SQL Editor do Supabase.',
      );
      return mostrar();
    }

    if (!resposta.ok) {
      anotar('erro', `A API respondeu ${resposta.status}`, corpo.slice(0, 160));
      return mostrar();
    }

    anotar('ok', 'A API REST responde e aceita a chave');
  } catch (e) {
    anotar('erro', 'Não foi possível chegar ao projecto', String(e.message ?? e));
    return mostrar();
  }

  /* ------------------------------ tabelas ---------------------------- */

  const TABELAS = ['restaurants', 'tables', 'categories', 'items', 'orders'];

  for (const tabela of TABELAS) {
    const resposta = await pedir(`/rest/v1/${tabela}?select=*&limit=1`, {
      headers: { Prefer: 'count=exact', Range: '0-0' },
    });

    if (resposta.status === 404) {
      anotar('erro', `Tabela "${tabela}" não existe`, 'Corra supabase/migrations/0001_esquema.sql no SQL Editor.');
      continue;
    }
    if (!resposta.ok) {
      const corpo = await resposta.text();
      anotar('erro', `Tabela "${tabela}" devolveu ${resposta.status}`, corpo.slice(0, 140));
      continue;
    }

    const intervalo = resposta.headers.get('content-range') ?? '';
    const total = intervalo.split('/')[1] ?? '?';
    anotar('ok', `Tabela "${tabela}" existe`, `${total} linha(s) visíveis para o público`);
  }

  /* -------------------------------- RLS ------------------------------ */

  // O anónimo não pode escrever num restaurante que não existe.
  const inventado = '00000000-0000-0000-0000-000000000000';
  const tentativa = await pedir('/rest/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ restaurant_id: inventado, itens: [], total: 0 }),
  });

  if (tentativa.status === 401 || tentativa.status === 403) {
    anotar('ok', 'RLS activa em "orders"', 'Insert anónimo recusado num restaurante inexistente.');
  } else if (tentativa.ok) {
    anotar('erro', 'Um anónimo conseguiu gravar um pedido órfão', 'A política orders_insercao_publica não está a ser aplicada.');
  } else {
    const corpo = await tentativa.text();
    anotar('ok', 'RLS activa em "orders"', `Insert recusado (${tentativa.status}).`);
    if (process.env.DEBUG) console.log(CINZA + corpo.slice(0, 200) + FIM);
  }

  /* ------------------------------ storage ---------------------------- */

  const balde = await pedir('/storage/v1/object/list/cardapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 1 }),
  });

  if (balde.status === 404) {
    anotar('erro', 'Bucket "cardapp" não existe', 'Crie-o em Storage, público, ou volte a correr a migração.');
  } else if (balde.ok || balde.status === 400) {
    anotar('ok', 'Bucket "cardapp" encontrado');
  } else {
    anotar('aviso', `Bucket "cardapp" devolveu ${balde.status}`, 'Confirme em Storage > Policies que a leitura é pública.');
  }

  mostrar();
}

principal().catch((e) => {
  console.error(`${VERMELHO}Falhou:${FIM}`, e);
  process.exitCode = 1;
});
