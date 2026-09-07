import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    // Caminho absoluto de proposito: se o processo arrancar com outro
    // directorio de trabalho, o Tailwind carregaria a config errada.
    tailwindcss: { config: path.join(raiz, 'tailwind.config.ts') },
    autoprefixer: {},
  },
};
