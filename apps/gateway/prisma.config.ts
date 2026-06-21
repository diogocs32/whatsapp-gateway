import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7: a connection URL não fica mais no schema.prisma.
// O CLI (migrate/generate) lê daqui; o PrismaClient em runtime usa o driver adapter
// (@prisma/adapter-pg) montado em src/infra/prisma/prisma.service.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
