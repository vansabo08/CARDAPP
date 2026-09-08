/**
 * Empurra as variáveis do .env.local para a Vercel e, se pedires,
 * dispara um novo deploy.
 *
 *   node scripts/vercel-variaveis.mjs            # mostra o que faria
 *   node scripts/vercel-variaveis.mjs --aplicar  # aplica
 *   node scripts/vercel-variaveis.mjs --aplicar --deploy
 *
 * Precisa de VERCEL_TOKEN no ambiente ou no .env.local.
 *
 * Fala com a API em vez de instalar a CLI: são três chamadas, e assim
 * vê-se exactamente o que é enviado. Nunca imprime valores — só nomes e
 * o tamanho, para se poder conferir sem os expor no terminal.
 */

import { readFileSync } from 'node:fs';

const PROJECTO = process.env.VERCEL_PROJECTO ?? 'cardaapp';
const AMBIENTES = ['production', 'preview', 'development'];

/** O que a aplicação precisa, e se pode ou não faltar. */
const VARIAVEIS = [
  { nome: 'NEXT_PUBLIC_SUPABASE_URL', obrigatoria: true },
  { nome: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', obrigatoria: true },
  { nome: 'NEXT_PUBLIC_SITE_URL', obrigatoria: true, valor: 'https://cardaapp.vercel.app' },
  { nome: 'ADMIN_EMAILS', obrigatoria: false },
  { nome: 'SUPABASE_SERVICE_ROLE_KEY', obrigatoria: false, sensivel: true },
  { nome: 'RESEND_API_KEY', obrigatoria: false, sensivel: true },
  { nome: 'RESEND_REMETENTE', obrigatoria: false },
  { nome: 'CRON_SECRET', obrigatoria: false, sensivel: true },
];

const VERDE = '\x1b[32m';
const VERMELHO = '\x1b[31m';
const AMARELO = '\x1b[33m';
const CINZA = '\x1b[90m';
const FIM = '\x1b[0m';

function lerEnvLocal() {
  let texto = '';
  try {
    texto = readFileSync('.env.local', 'utf8');
  } catch {
    return {};
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

const env = lerEnvLocal();
const TOKEN = process.env.VERCEL_TOKEN || env.VERCEL_TOKEN || '';
const aplicar = process.argv.includes('--aplicar');
const comDeploy = process.argv.includes('--deploy');

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(`https://api.vercel.com${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(opcoes.headers ?? {}),
    },
  });

  const corpo = await resposta.text();
  let dados = null;
  try {
    dados = corpo ? JSON.parse(corpo) : null;
  } catch {
    /* algumas respostas vêm vazias */
  }
  return { ok: resposta.ok, estado: resposta.status, dados };
}

async function principal() {
  console.log(`\n${CINZA}Cardapp — variáveis na Vercel${FIM}\n`);

  if (!TOKEN) {
    console.log(`${VERMELHO}✗${FIM} Falta VERCEL_TOKEN.`);
    console.log(`  Cria um em ${CINZA}vercel.com/account/tokens${FIM} e põe no .env.local.`);
    process.exitCode = 1;
    return;
  }

  // 1. Quem sou eu, e o projecto existe?
  const eu = await api('/v2/user');
  if (!eu.ok) {
    console.log(`${VERMELHO}✗${FIM} O token foi recusado (${eu.estado}).`);
    process.exitCode = 1;
    return;
  }
  console.log(`${VERDE}✓${FIM} Token válido — ${eu.dados?.user?.username ?? 'conta desconhecida'}`);

  const projecto = await api(`/v9/projects/${PROJECTO}`);
  if (!projecto.ok) {
    console.log(`${VERMELHO}✗${FIM} Projecto "${PROJECTO}" não encontrado (${projecto.estado}).`);
    console.log(`  Se o nome for outro: ${CINZA}VERCEL_PROJECTO=nome node scripts/...${FIM}`);
    process.exitCode = 1;
    return;
  }
  const idProjecto = projecto.dados.id;
  console.log(`${VERDE}✓${FIM} Projecto "${PROJECTO}"\n`);

  // 2. O que já lá está
  const existentes = await api(`/v9/projects/${idProjecto}/env?decrypt=false`);
  const porNome = new Map(
    (existentes.dados?.envs ?? []).map((e) => [`${e.key}::${(e.target ?? []).join(',')}`, e]),
  );

  // 3. Aplicar
  let escritas = 0;
  let saltadas = 0;

  for (const variavel of VARIAVEIS) {
    const valor = variavel.valor ?? env[variavel.nome] ?? '';

    if (!valor) {
      const marca = variavel.obrigatoria ? `${VERMELHO}✗${FIM}` : `${AMARELO}!${FIM}`;
      console.log(`  ${marca} ${variavel.nome.padEnd(30)} ${CINZA}vazia — saltada${FIM}`);
      saltadas++;
      continue;
    }

    if (!aplicar) {
      console.log(
        `  ${CINZA}·${FIM} ${variavel.nome.padEnd(30)} ${CINZA}${valor.length} chars → ${AMBIENTES.join(', ')}${FIM}`,
      );
      continue;
    }

    // Apaga a anterior antes de escrever: a API não faz upsert.
    for (const antiga of existentes.dados?.envs ?? []) {
      if (antiga.key === variavel.nome) {
        await api(`/v9/projects/${idProjecto}/env/${antiga.id}`, { method: 'DELETE' });
      }
    }

    const criada = await api(`/v10/projects/${idProjecto}/env`, {
      method: 'POST',
      body: JSON.stringify({
        key: variavel.nome,
        value: valor,
        type: variavel.sensivel ? 'encrypted' : 'plain',
        target: AMBIENTES,
      }),
    });

    if (criada.ok) {
      console.log(`  ${VERDE}✓${FIM} ${variavel.nome.padEnd(30)} ${CINZA}${valor.length} chars${FIM}`);
      escritas++;
    } else {
      console.log(
        `  ${VERMELHO}✗${FIM} ${variavel.nome.padEnd(30)} ${CINZA}${criada.dados?.error?.message ?? criada.estado}${FIM}`,
      );
    }
  }

  if (!aplicar) {
    console.log(`\n${AMARELO}Ensaio.${FIM} Para aplicar: ${CINZA}--aplicar${FIM}\n`);
    return;
  }

  console.log(`\n${escritas} escritas, ${saltadas} saltadas.`);

  // 4. Deploy — a Vercel só lê as variáveis quando constrói.
  if (comDeploy) {
    const alvo = await api(`/v13/deployments`, {
      method: 'POST',
      body: JSON.stringify({
        name: PROJECTO,
        project: idProjecto,
        target: 'production',
        gitSource: {
          type: 'github',
          org: 'vansabo08',
          repo: 'CARDAPP',
          ref: 'main',
        },
      }),
    });

    if (alvo.ok) {
      console.log(`${VERDE}✓${FIM} Deploy disparado — https://${alvo.dados?.url}`);
    } else {
      console.log(
        `${VERMELHO}✗${FIM} Deploy falhou: ${alvo.dados?.error?.message ?? alvo.estado}`,
      );
      console.log(`  ${CINZA}Podes disparar à mão em Deployments → Redeploy.${FIM}`);
    }
  } else {
    console.log(
      `${AMARELO}!${FIM} As variáveis só entram no próximo build. Corre com ${CINZA}--deploy${FIM} ou faz Redeploy no painel.`,
    );
  }

  console.log('');
}

principal().catch((e) => {
  console.error(`${VERMELHO}Falhou:${FIM}`, e.message ?? e);
  process.exitCode = 1;
});
