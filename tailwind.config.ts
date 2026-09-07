import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from 'tailwindcss';

// O Tailwind pode carregar este ficheiro como CJS (jiti) ou como ESM.
const raiz =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const config: Config = {
  content: [path.join(raiz, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        grafite: {
          DEFAULT: 'var(--grafite)',
          alto: 'var(--grafite-alto)',
          suave: 'var(--grafite-suave)',
        },
        creme: {
          DEFAULT: 'var(--creme)',
          fundo: 'var(--creme-fundo)',
        },
        ouro: 'var(--ouro)',
        verde: 'var(--verde)',
        linha: 'var(--linha)',
        'linha-escura': 'var(--linha-escura)',
        tenue: 'var(--tenue)',
        'tenue-escuro': 'var(--tenue-escuro)',
      },
      fontFamily: {
        display: ['var(--fonte-display)', 'Georgia', 'serif'],
        sans: ['var(--fonte-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      maxWidth: {
        conteudo: '1120px',
        leitura: '68ch',
      },
      letterSpacing: {
        etiqueta: '0.14em',
      },
      keyframes: {
        subir: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        aparecer: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        folha: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        subir: 'subir 240ms ease-out both',
        aparecer: 'aparecer 240ms ease-out both',
        folha: 'folha 240ms ease-out both',
      },
      transitionTimingFunction: {
        calmo: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
