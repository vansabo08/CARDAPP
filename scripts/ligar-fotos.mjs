/**
 * Liga cada prato de demonstração à fotografia que lhe corresponde em
 * public/pratos. Os pratos que ficam sem foto usam a ilustração gerada.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const FICHEIRO = 'src/data/demo.ts';

const FOTOS = {
  i1: 'kitaba',
  i2: 'rissois',
  i3: 'feijao-frade',
  i4: 'muamba-galinha',
  i5: 'calulu',
  i6: 'funge',
  i7: 'moamba-ginguba',
  i8: 'mufete',
  i9: 'garoupa',
  i10: 'espetada',
  i11: 'cuca',
  i12: 'blue',
  i13: 'mucua',
  i14: 'agua',
  i15: 'cocada',
  i16: 'doce-mucua',
};

const linhas = readFileSync(FICHEIRO, 'utf8').split('\n');
let idActual = null;
let ligadas = 0;

for (let i = 0; i < linhas.length; i++) {
  const id = linhas[i].match(/^\s*id: '(i\d+)',\s*$/);
  if (id) {
    idActual = id[1];
    continue;
  }

  if (linhas[i].includes('foto_url:') && idActual) {
    const ficheiro = FOTOS[idActual];
    const espacos = linhas[i].match(/^\s*/)[0];
    linhas[i] = ficheiro
      ? `${espacos}foto_url: '/pratos/${ficheiro}.jpg',`
      : `${espacos}foto_url: null,`;
    if (ficheiro) ligadas++;
    idActual = null;
  }
}

writeFileSync(FICHEIRO, linhas.join('\n'));
console.log(`${ligadas} pratos com fotografia, ${Object.keys(FOTOS).length} esperados.`);
