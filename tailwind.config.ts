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
          carta: 'var(--grafite-carta)',
        },
        creme: {
          DEFAULT: 'var(--creme)',
          folha: 'var(--creme-folha)',
        },
        ouro: {
          DEFAULT: 'var(--ouro)',
          claro: 'var(--ouro-claro)',
          fundo: 'var(--ouro-fundo)',
        },
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
        // Escala da referência: folhas e cartões com raio generoso,
        // controlos em pastilha.
        campo: '14px',
        cartao: '20px',
        folha: '28px',
        DEFAULT: '14px',
      },
      maxWidth: {
        conteudo: '1140px',
        leitura: '68ch',
      },
      boxShadow: {
        // Sombra de um objecto pousado, não de uma caixa a flutuar.
        aparelho: '0 50px 90px -40px rgba(0,0,0,0.95), 0 18px 40px -22px rgba(0,0,0,0.8)',
        cartao: '0 24px 50px -30px rgba(0,0,0,0.85)',
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
        marca: {
          from: { opacity: '0', transform: 'scale(0.6)' },
          to: { opacity: '1', transform: 'scale(1)' },
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
        marca: 'marca 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      transitionTimingFunction: {
        calmo: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
