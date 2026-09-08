/**
 * Alinha os raios antigos (12px/10px, do primeiro desenho) com a escala
 * nova: superfícies e cartões a 20px, campos e controlos a 14px.
 *
 * Correu-se uma vez na passagem para a paleta da referência; fica aqui
 * porque é a documentação de onde veio a mudança.
 */

import { globSync, readFileSync, writeFileSync } from 'node:fs';

const ficheiros = globSync('src/**/*.tsx');
let total = 0;

for (const ficheiro of ficheiros) {
  const original = readFileSync(ficheiro, 'utf8');
  let s = original;

  // Miniaturas quadradas pequenas ficam com raio de campo.
  s = s.replaceAll('overflow-hidden rounded-[10px]', 'overflow-hidden rounded-campo');
  s = s.replaceAll('rounded-[10px]', 'rounded-campo');

  // Tudo o resto que era 12px passa a cartão, excepto os controlos de
  // navegação, que são pastilhas.
  s = s.replaceAll(
    "'shrink-0 rounded-[12px] px-3.5 py-2 font-sans text-[14px] font-semibold",
    "'shrink-0 rounded-full px-3.5 py-2 font-sans text-[14px] font-semibold",
  );
  s = s.replaceAll('rounded-[12px] px-3.5 py-2.5', 'rounded-full px-3.5 py-2.5');
  s = s.replaceAll('rounded-[12px]', 'rounded-cartao');

  if (s !== original) {
    writeFileSync(ficheiro, s);
    total++;
    console.log('·', ficheiro);
  }
}

console.log(`${total} ficheiros alinhados.`);
