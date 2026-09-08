/**
 * Passa as superfícies opacas a vidro.
 *
 * Não é um "backdrop-blur em tudo": o `backdrop-filter` custa caro em
 * telemóveis modestos, por isso o cardápio público — que é onde está o
 * cliente, sentado à mesa e com rede fraca — leva vidro só em duas
 * superfícies pequenas e fixas. O painel e a página inicial, que abrem
 * em computador ou com calma, levam-no à vontade.
 *
 * Onde o vidro entra, sai a borda explícita: a classe já traz a sua,
 * com o brilho no rebordo de cima.
 */

import { readFileSync, writeFileSync } from 'node:fs';

let falhas = 0;

function editar(caminho, regras) {
  let s = readFileSync(caminho, 'utf8').split('\r\n').join('\n');
  const antes = s;

  for (const [de, para] of regras) {
    if (!s.includes(de)) {
      console.log(`  ! ${caminho}: nao encontrei "${de.slice(0, 52)}"`);
      falhas++;
      continue;
    }
    s = s.split(de).join(para);
  }

  if (s !== antes) writeFileSync(caminho, s);
  console.log(s === antes ? `  (sem mudanca) ${caminho}` : `· ${caminho}`);
}

/* ------------------------------ landing ------------------------------ */

editar('src/app/page.tsx', [
  // caixas dos três passos
  [
    'rounded-cartao border border-linha bg-grafite-alto px-6 py-11',
    'vidro rounded-cartao px-6 py-11',
  ],
  // painel da mensagem de WhatsApp
  ['border-y border-linha bg-grafite-alto', 'vidro border-x-0 border-y'],
  ['rounded-cartao border border-linha bg-grafite p-6', 'vidro-leve rounded-cartao p-6'],
]);

/* ------------------------------- preços ------------------------------ */

editar('src/components/marketing/precos.tsx', [
  ['rounded-full border border-linha bg-grafite-alto p-1', 'vidro-leve rounded-full p-1'],
  [
    `                'bg-gradient-to-b from-white/[0.05] to-transparent',
                plano.destaque
                  ? 'border border-creme/25 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.95)] md:-my-3 md:py-11'
                  : 'border border-linha hover:border-creme/18',`,
    `                'vidro',
                plano.destaque
                  ? 'border-creme/25 shadow-[0_34px_80px_-40px_rgba(0,0,0,0.95)] md:-my-3 md:py-11'
                  : 'hover:border-creme/18',`,
  ],
]);

/* ------------------------------- painel ------------------------------ */

editar('src/components/painel/navegacao.tsx', [
  [
    'className="border-b border-linha md:sticky md:top-0 md:h-dvh md:w-[248px] md:shrink-0 md:border-b-0 md:border-r"',
    'className="vidro rounded-none border-x-0 border-t-0 md:sticky md:top-0 md:h-dvh md:w-[248px] md:shrink-0 md:border-b-0 md:border-r"',
  ],
]);

editar('src/app/painel/page.tsx', [
  [
    'mt-10 rounded-cartao border border-linha bg-grafite-alto px-7 py-14 text-center',
    'vidro mt-10 rounded-cartao px-7 py-14 text-center',
  ],
  [
    'mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-cartao border border-linha bg-linha lg:grid-cols-4',
    'mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4',
  ],
  ['<div className="bg-grafite-alto px-5 py-6">', '<div className="vidro-leve rounded-cartao px-5 py-6">'],
  [
    'mt-10 overflow-hidden rounded-cartao border border-linha bg-grafite-alto',
    'vidro mt-10 overflow-hidden rounded-cartao',
  ],
]);

editar('src/components/painel/gestor-cardapio.tsx', [
  [
    "'rounded-cartao border border-linha bg-grafite-alto transition-opacity duration-200',",
    "'vidro rounded-cartao transition-opacity duration-200',",
  ],
  [
    'mt-6 rounded-cartao border border-linha bg-grafite-alto px-4 py-3',
    'vidro-leve mt-6 rounded-cartao px-4 py-3',
  ],
]);

editar('src/components/painel/gestor-mesas.tsx', [
  [
    'group relative flex flex-col items-center rounded-cartao border border-linha bg-grafite-alto p-4',
    'vidro-leve group relative flex flex-col items-center rounded-cartao p-4',
  ],
  [
    'mt-10 rounded-cartao border border-linha bg-grafite-alto px-6 py-12 text-center',
    'vidro mt-10 rounded-cartao px-6 py-12 text-center',
  ],
]);

editar('src/components/painel/onboarding.tsx', [
  ['rounded-cartao border border-linha bg-grafite-alto"', 'vidro rounded-cartao"'],
]);

/* -------------------------------- doca ------------------------------- */

editar('src/components/ui/doca.tsx', [
  [
    `          'pointer-events-auto flex items-end gap-1 rounded-full border border-linha px-2.5 py-2',
          'bg-grafite-alto/85 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl',`,
    `          'vidro pointer-events-auto flex items-end gap-1 rounded-full px-2.5 py-2',`,
  ],
]);

/* ---------------------------- folha inferior -------------------------- */

editar('src/components/ui/folha-inferior.tsx', [
  ["claro ? 'bg-creme text-grafite' : 'bg-grafite-alto text-creme',", "'vidro-claro text-grafite',"],
]);

/* -------------------------- cardápio público -------------------------- */
/* Só a barra fixa e o carrinho: são dois, são pequenos, e não se
   repetem por cada prato. */

editar('src/components/cardapio/cardapio-publico.tsx', [
  [
    'className="sticky top-0 z-30 rounded-t-folha bg-creme-folha/95 backdrop-blur-md"',
    'className="vidro-claro sticky top-0 z-30 rounded-t-folha"',
  ],
  [
    'flex min-w-0 flex-1 items-center gap-3 rounded-full border border-linha bg-grafite-alto py-2.5 pl-2.5 pr-4 text-left transition-colors duration-200 hover:border-creme/22',
    'vidro flex min-w-0 flex-1 items-center gap-3 rounded-full py-2.5 pl-2.5 pr-4 text-left transition-colors duration-200 hover:border-creme/25',
  ],
]);

console.log(falhas ? `\n${falhas} substituicoes falharam.` : '\nTodas as substituicoes aplicadas.');
