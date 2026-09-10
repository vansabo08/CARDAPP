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
          // Com `<alpha-value>` os modificadores (`text-creme/70`) funcionam.
          DEFAULT: 'rgb(var(--creme-canais) / <alpha-value>)',
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

        /* ----------------------------------------------------------
           Escala de elevação
           ----------------------------------------------------------
           Três degraus, sempre em duas camadas: uma sombra curta que
           cola o objecto à superfície e uma longa que lhe dá altura.
           Uma sombra dura sozinha lê-se como autocolante.

           1 — cartão em repouso
           2 — cartão sob o cursor, botão principal
           3 — modal, folha do carrinho
           ---------------------------------------------------------- */
        'elevacao-1': '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)',
        'elevacao-2': '0 2px 4px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.10)',
        'elevacao-3': '0 4px 8px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.14)',

        /* ----------------------------------------------------------
           A mesma escala, para o escuro
           ----------------------------------------------------------
           Sombra preta sobre #0B0B0B não se vê: 4% de preto em cima de
           preto é preto. A geometria mantém-se degrau a degrau (1/2 e
           2/8, 2/4 e 8/20, 4/8 e 16/40), sobem-se as opacidades, e
           acrescenta-se um friso de luz no topo — que é o que separa
           uma superfície da outra quando a sombra já não chega.
           ---------------------------------------------------------- */
        'elevacao-1-escura':
          '0 1px 2px rgba(0,0,0,0.40), 0 2px 8px rgba(0,0,0,0.50), inset 0 1px 0 rgba(250,247,242,0.06)',
        'elevacao-2-escura':
          '0 2px 4px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(250,247,242,0.09)',
        'elevacao-3-escura':
          '0 4px 8px rgba(0,0,0,0.50), 0 16px 40px rgba(0,0,0,0.65), inset 0 1px 0 rgba(250,247,242,0.12)',
      },
      keyframes: {
        /* Um só padrão de entrada em toda a aplicação: 12px a subir. */
        subir: {
          from: { opacity: '0', transform: 'translateY(12px)' },
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
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },

        /* Entrada pelo topo, para o que desce em vez de subir. */
        descer: {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },

        /* Erro: duas oscilações que vão morrendo. Não leva overshoot —
           a curva com ressalto é da família do sucesso, e um erro não
           deve parecer festivo. */
        abanar: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-10px)' },
          '35%': { transform: 'translateX(10px)' },
          '55%': { transform: 'translateX(-7px)' },
          '78%': { transform: 'translateX(5px)' },
        },

        /* Sucesso: o botão dá um salto curto, com ressalto. */
        saltinho: {
          '0%, 100%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.055)' },
        },

        /* O visto desenha-se. O stroke-dashoffset não provoca refluxo —
           é pintura, não geometria — por isso não quebra a regra de só
           animar transform e opacity. */
        'desenhar-visto': {
          from: { strokeDashoffset: '24' },
          to: { strokeDashoffset: '0' },
        },

        /* O brilho do esqueleto. É o único sítio onde `linear` entra:
           uma passagem de luz constante não tem de acelerar nem travar. */
        brilho: {
          from: { backgroundPosition: '-160% 0' },
          to: { backgroundPosition: '260% 0' },
        },
      },
      animation: {
        subir: 'subir 250ms cubic-bezier(0.2,0,0,1) both',
        aparecer: 'aparecer 250ms cubic-bezier(0.2,0,0,1) both',
        folha: 'folha 400ms cubic-bezier(0.2,0,0,1) both',
        marca: 'marca 250ms cubic-bezier(0.175,0.885,0.32,1.275) both',
        descer: 'descer 400ms cubic-bezier(0.2,0,0,1) both',
        abanar: 'abanar 350ms cubic-bezier(0.3,0,1,1) both',
        saltinho: 'saltinho 350ms cubic-bezier(0.175,0.885,0.32,1.275) both',
        'desenhar-visto': 'desenhar-visto 350ms cubic-bezier(0.2,0,0,1) both',
        brilho: 'brilho 1.5s linear infinite',
      },

      /* ------------------------------------------------------------
         Identidade de movimento
         ------------------------------------------------------------
         Três curvas e três durações. Nada fora desta tabela.

         O `calmo` era a curva da casa e está em vinte sítios; fica como
         apelido do `assinatura` para não haver duas assinaturas a
         disputar o mesmo papel, e para os sítios antigos continuarem a
         dizer a verdade sem se lhes tocar.
         ------------------------------------------------------------ */
      transitionTimingFunction: {
        assinatura: 'cubic-bezier(0.2, 0, 0, 1)',
        calmo: 'cubic-bezier(0.2, 0, 0, 1)',
        saida: 'cubic-bezier(0.3, 0, 1, 1)',
        // Passa do alvo e volta. Só em sucesso e no "juntar ao pedido".
        pop: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      transitionDuration: {
        rapida: '150ms',
        normal: '250ms',
        lenta: '400ms',
      },
    },
  },
  plugins: [],
};

export default config;
