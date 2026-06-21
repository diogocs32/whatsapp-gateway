import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
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
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conectado ao PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
