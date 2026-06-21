import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7: a connection URL não fica mais no schema.prisma. O CLI (migrate/generate) lê daqui;
// o PrismaClient em runtime usa o driver adapter (src/infra/prisma/prisma.service.ts).
// Aceita DATABASE_URL OU as partes (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SSL);
// a senha é URL-encoded ao montar a URL (suporta caracteres especiais).
function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '5432';
  const name = process.env.DB_NAME ?? '';
  const user = process.env.DB_USER ?? '';
  const password = process.env.DB_PASSWORD ?? '';
  const auth = user
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
    : '';
  const ssl = process.env.DB_SSL === 'true' ? '?sslmode=require' : '';
  return `postgresql://${auth}${host}:${port}/${name}${ssl}`;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl(),
  },
});
