import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC é necessário para os decorators + metadata do NestJS funcionarem nos testes.
export default defineConfig({
  // Vitest 4 usa Oxc por padrão; desligamos para o SWC (decorators+metadata do Nest) ser o único transform.
  oxc: false,
  test: {
    globals: false,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false, // testes e2e compartilham o mesmo Postgres/Redis
    env: { NODE_ENV: 'test' }, // não sobe os Workers BullMQ (evita ruído de conexão no teardown)
  },
  plugins: [swc.vite()],
});
