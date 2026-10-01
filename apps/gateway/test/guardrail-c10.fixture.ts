import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';

// Migrations versionadas em schema exclusivo na infra LOCAL. Nenhuma linha real é lida
// ou copiada; tabelas, enums, FKs e defaults são os da aplicação, removidos ao final.
export async function createGuardrailFixture() {
  const url = process.env.DATABASE_URL;
  const parsed = url ? new URL(url) : null;
  const host = parsed?.hostname ?? process.env.DB_HOST ?? 'localhost';
  if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(host)) {
    throw new Error('C10 exige PostgreSQL local, nunca produção');
  }
  // Campos explícitos: query params host/options da URL não podem sobrepor host local,
  // TimeZone ou search_path da fixture pelo parser do node-postgres.
  const connection: PoolConfig = parsed
    ? {
        host: host.replace(/^\[|\]$/g, ''),
        port: Number(parsed.port || 5432),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: decodeURIComponent(parsed.pathname.slice(1)),
      }
    : {
        host,
        port: Number(process.env.DB_PORT ?? 5436),
        user: process.env.DB_USER ?? 'gateway',
        password: process.env.DB_PASSWORD ?? 'gateway',
        database: process.env.DB_NAME ?? 'gateway',
      };
  const schema = `c10_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({
    ...connection,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  const clients: PrismaClient[] = [];
  const queries: Prisma.QueryEvent[] = [];

  async function dispose() {
    const disconnected = await Promise.allSettled(
      clients.map((client) => client.$disconnect()),
    );
    try {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await admin.end();
    }
    const failed = disconnected.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  }

  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const migrationClient = await admin.connect();
    try {
      await migrationClient.query(`SET search_path TO "${schema}"`);
      const migrations = join(process.cwd(), 'prisma/migrations');
      const directories = readdirSync(migrations, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
      if (!directories.length) throw new Error('fixture C10 sem migrations');
      for (const directory of directories) {
        await migrationClient.query(
          readFileSync(join(migrations, directory, 'migration.sql'), 'utf8'),
        );
      }
    } finally {
      try {
        await migrationClient.query('RESET search_path');
      } finally {
        migrationClient.release();
      }
    }
  } catch (error) {
    await dispose();
    throw error;
  }

  async function client(timeZone = 'UTC') {
    if (!['UTC', 'America/Sao_Paulo', 'Asia/Tokyo'].includes(timeZone)) {
      throw new Error('TimeZone da fixture deve ser explícita e conhecida');
    }
    const prisma = new PrismaClient({
      adapter: new PrismaPg(
        {
          ...connection,
          max: 5,
          connectionTimeoutMillis: 5000,
          options: `-c TimeZone=${timeZone} -c search_path=${schema},public`,
        },
        { schema },
      ),
      log: [{ emit: 'event', level: 'query' }],
    });
    prisma.$on('query', (query) => queries.push(query));
    clients.push(prisma);
    await prisma.$connect();
    return prisma;
  }

  let prisma: PrismaClient;
  try {
    prisma = await client();
  } catch (error) {
    await dispose();
    throw error;
  }
  return {
    prisma,
    schema,
    queries,
    client,
    dispose,
    async seedSession(id: string, engine: 'BAILEYS' | 'WWEBJS' = 'BAILEYS') {
      return prisma.waSession.create({
        data: { id, name: id, engine, status: 'STOPPED', autostart: false },
      });
    },
  };
}
