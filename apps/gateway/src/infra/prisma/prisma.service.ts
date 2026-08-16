import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { PoolConfig } from 'pg';
import type { Env } from '../../bootstrap/config';
// Client gerado pelo Prisma 7 (generator `prisma-client`, output em src/generated/prisma).
// Rode `npm run prisma:generate` antes do primeiro build (senão este import não existe).
import { PrismaClient } from '../../generated/prisma/client';

// Reexporta o namespace Prisma (Prisma.DbNull, tipos de input, etc.) a partir de um único lugar.
export { Prisma } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<Env, true>) {
    // Prisma 7 usa driver adapter (@prisma/adapter-pg sobre node-postgres).
    // Aceita DATABASE_URL OU as partes (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SSL).
    // Tuning do pool: sem isto o pg fica com connect timeout 0 (espera infinita na aquisição
    // com o pool saturado — o Prisma 6 usava 5s) e idle infinito. Ver bootstrap/config.ts.
    const url = config.get('DATABASE_URL', { infer: true });
    const tuning: Pick<
      PoolConfig,
      'max' | 'connectionTimeoutMillis' | 'idleTimeoutMillis'
    > = {
      max: config.get('DB_POOL_MAX', { infer: true }),
      connectionTimeoutMillis: config.get('DB_POOL_CONNECT_TIMEOUT_MS', {
        infer: true,
      }),
      idleTimeoutMillis: config.get('DB_POOL_IDLE_TIMEOUT_MS', { infer: true }),
    };
    const pool: PoolConfig = url
      ? { connectionString: url, ...tuning }
      : {
          host: config.get('DB_HOST', { infer: true }),
          port: config.get('DB_PORT', { infer: true }),
          user: config.get('DB_USER', { infer: true }),
          password: config.get('DB_PASSWORD', { infer: true }),
          database: config.get('DB_NAME', { infer: true }),
          ssl: config.get('DB_SSL', { infer: true })
            ? { rejectUnauthorized: false }
            : undefined,
          ...tuning,
        };
    super({ adapter: new PrismaPg(pool) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conectado ao PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
