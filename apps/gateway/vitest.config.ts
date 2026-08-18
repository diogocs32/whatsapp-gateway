import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC é necessário para os decorators + metadata do NestJS funcionarem nos testes.
export default defineConfig({
  // Vitest 4 usa Oxc por padrão; desligamos para o SWC (decorators+metadata do Nest) ser o único transform.
  oxc: false,
  plugins: [swc.vite()],
  test: {
    globals: false,
    root: './',
    // NODE_ENV=test não sobe os Workers BullMQ. MAX_SESSIONS/SEATS altos: o modo comunidade limita
    // a 1 sessão e os testes (e o DB de dev, que pode ter sessões reais) precisam criar várias.
    env: { NODE_ENV: 'test', MAX_SESSIONS: '50', MAX_SEATS: '50' },
    // Cobertura (M3): agregada sobre a RUN inteira (unit e/ou e2e — os dois contam).
    // Sem thresholds por ora: primeiro estabelecer a baseline, depois decidir piso (nunca
    // quebrar CI com número arbitrário).
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/generated/**', 'src/**/*.spec.ts'],
      reporter: ['text-summary', 'html'],
    },
    // M3: dois projetos — `unit` roda SEM infra (docker); `e2e` exige Postgres/Redis/MinIO
    // (`npm run infra:up`). Em Vitest 4 o extends:true precisa ser EXPLÍCITO para o projeto
    // herdar plugins (SWC) e env da raiz — só vira default no Vitest 5 (guia de migração).
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
          testTimeout: 10_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/**/*.e2e-spec.ts'],
          testTimeout: 30_000,
          hookTimeout: 30_000,
          fileParallelism: false, // testes e2e compartilham o mesmo Postgres/Redis
        },
      },
    ],
  },
});
