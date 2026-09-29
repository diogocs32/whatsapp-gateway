import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Testes do painel (E23): funções puras de src/lib em ambiente node — sem DOM e sem os plugins
// React/Tailwind do vite.config.ts (o vitest.config.* tem prioridade sobre o vite.config.*).
export default defineConfig({
  resolve: {
    alias: {
      // Mesmo alias do vite.config.ts: o pacote do workspace é consumido como TS-source.
      '@contracts': fileURLToPath(
        new URL('../../packages/contracts/src', import.meta.url),
      ),
    },
  },
  test: {
    // Preservar a semântica v4; Vitest 5 usa clearMocks:true por padrão.
    clearMocks: false,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
