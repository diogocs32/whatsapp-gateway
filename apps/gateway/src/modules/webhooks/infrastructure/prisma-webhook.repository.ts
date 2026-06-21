import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '../../../infra/prisma/prisma.service';
import { Webhook } from '../domain/webhook.entity';
import type {
  CreateWebhookInput,
  WebhookRepository,
} from '../domain/webhook.repository';

interface Row {
  id: string;
  sessionId: string | null;
  url: string;
  events: string[];
  secret: string | null;
  headers: unknown;
  enabled: boolean;
  maxAttempts: number;
  createdAt: Date;
}

@Injectable()
export class PrismaWebhookRepository implements WebhookRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(r: Row): Webhook {
    return new Webhook(
      r.id,
      r.sessionId,
      r.url,
      r.events,
      r.secret,
      (r.headers as Record<string, string> | null) ?? null,
      r.enabled,
      r.maxAttempts,
      r.createdAt,
    );
  }

  async create(input: CreateWebhookInput): Promise<Webhook> {
    const r = await this.prisma.webhook.create({
      data: {
        id: input.id,
        sessionId: input.sessionId,
        url: input.url,
        events: input.events,
        secret: input.secret,
        headers: input.headers ?? Prisma.DbNull,
        enabled: input.enabled,
        maxAttempts: input.maxAttempts,
      },
    });
    return this.toDomain(r);
  }

  async list(): Promise<Webhook[]> {
    const rs = await this.prisma.webhook.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rs.map((r) => this.toDomain(r));
  }

  async listEnabled(): Promise<Webhook[]> {
    const rs = await this.prisma.webhook.findMany({ where: { enabled: true } });
    return rs.map((r) => this.toDomain(r));
  }

  async findById(id: string): Promise<Webhook | null> {
    const r = await this.prisma.webhook.findUnique({ where: { id } });
    return r ? this.toDomain(r) : null;
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    await this.prisma.webhook.update({ where: { id }, data: { enabled } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.webhook.delete({ where: { id } });
  }
}
