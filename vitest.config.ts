import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const raiz = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // O `@/` que o Next resolve por si tem de ser dito aqui também, senão
  // um teste que importe uma rota rebenta a carregar as dependências
  // dela em vez de correr.
  resolve: {
    alias: {
      '@': path.join(raiz, 'src'),
      // O 'server-only' rebenta de propósito fora de um Server
      // Component. Nos testes troca-se por um módulo vazio.
      'server-only': path.join(raiz, 'tests/apoio/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
