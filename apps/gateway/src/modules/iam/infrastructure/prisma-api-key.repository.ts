import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type {
  ApiKeyRecord,
  ApiKeyRepository,
  CreateApiKeyInput,
} from '../domain/api-key.repository';

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class PrismaApiKeyRepository implements ApiKeyRepository {
  private readonly logger = new Logger(PrismaApiKeyRepository.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateApiKeyInput): Promise<void> {
    await this.prisma.waApiKey.create({
      data: {
        id: input.id,
        name: input.name,
        prefix: input.prefix,
        hash: input.hash,
        scopes: input.scopes ?? [],
      },
    });
  }

  async findByHash(hash: string): Promise<ApiKeyRecord | null> {
    const row = await this.prisma.waApiKey.findUnique({ where: { hash } });
    return row ? this.toDomain(row) : null;
  }

  async list(): Promise<ApiKeyRecord[]> {
    const rows = await this.prisma.waApiKey.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.waApiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async touch(id: string): Promise<void> {
    await this.prisma.waApiKey
      .update({ where: { id }, data: { lastUsedAt: new Date() } })
      .catch((e) =>
        this.logger.warn(
          `lastUsedAt da api key ${id} não atualizado: ${(e as Error).message}`,
        ),
      );
  }

  private toDomain(row: ApiKeyRow): ApiKeyRecord {
    return {
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      scopes: row.scopes,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
    };
  }
}
