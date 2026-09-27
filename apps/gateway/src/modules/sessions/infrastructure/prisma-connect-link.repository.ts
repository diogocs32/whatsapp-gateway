import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import {
  CONNECT_LINK_RETENTION_MS,
  type ConnectLinkRecord,
  type ConnectLinkRevokedReason,
} from '../domain/connect-link';
import type {
  ConnectLinkRepository,
  CreateConnectLinkInput,
} from '../domain/connect-link.repository';

const SELECT = {
  id: true,
  sessionId: true,
  tokenHash: true,
  createdBy: true,
  expectedPhone: true,
  expiresAt: true,
  revokedAt: true,
  revokedReason: true,
  consumedAt: true,
  newQrCount: true,
  lastNewQrAt: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

// Não revogado, não consumido, dentro da validade.
function active(now: Date) {
  return { revokedAt: null, consumedAt: null, expiresAt: { gt: now } };
}

@Injectable()
export class PrismaConnectLinkRepository implements ConnectLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createReplacing(
    input: CreateConnectLinkInput,
  ): Promise<ConnectLinkRecord> {
    return this.prisma.$transaction(async (tx) => {
      // Trava a linha da sessão: dois "gerar link" simultâneos não deixam dois links ativos
      // (em READ COMMITTED, sem a trava, cada um revogaria 0 linhas e os dois inseririam).
      await tx.$queryRaw`SELECT 1 FROM "wa_sessions" WHERE "id" = ${input.sessionId} FOR UPDATE`;
      await tx.connectLink.updateMany({
        where: { sessionId: input.sessionId, ...active(input.now) },
        data: { revokedAt: input.now, revokedReason: 'REPLACED' },
      });
      const cutoff = new Date(input.now.getTime() - CONNECT_LINK_RETENTION_MS);
      await tx.connectLink.deleteMany({
        where: {
          sessionId: input.sessionId,
          createdAt: { lt: cutoff },
          OR: [
            { revokedAt: { not: null } },
            { consumedAt: { not: null } },
            { expiresAt: { lte: input.now } },
          ],
        },
      });
      return tx.connectLink.create({
        data: {
          // Hora DEPOIS da trava: o DEFAULT CURRENT_TIMESTAMP é o início da transação — com dois
          // "gerar link" simultâneos, o que esperou a trava sairia "mais antigo" que o que revogou.
          createdAt: new Date(),
          id: input.id,
          sessionId: input.sessionId,
          tokenHash: input.tokenHash,
          createdBy: input.createdBy,
          expectedPhone: input.expectedPhone,
          expiresAt: input.expiresAt,
        },
        select: SELECT,
      });
    });
  }

  findByHash(tokenHash: string): Promise<ConnectLinkRecord | null> {
    return this.prisma.connectLink.findUnique({
      where: { tokenHash },
      select: SELECT,
    });
  }

  findLatestBySession(sessionId: string): Promise<ConnectLinkRecord | null> {
    return this.prisma.connectLink.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    });
  }

  findActiveBySession(
    sessionId: string,
    now: Date,
  ): Promise<ConnectLinkRecord | null> {
    return this.prisma.connectLink.findFirst({
      where: { sessionId, ...active(now) },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    });
  }

  async revokeActive(
    sessionId: string,
    now: Date,
    reason: ConnectLinkRevokedReason,
  ): Promise<number> {
    const { count } = await this.prisma.connectLink.updateMany({
      where: { sessionId, ...active(now) },
      data: { revokedAt: now, revokedReason: reason },
    });
    return count;
  }

  async revoke(
    id: string,
    now: Date,
    reason: ConnectLinkRevokedReason,
  ): Promise<boolean> {
    const { count } = await this.prisma.connectLink.updateMany({
      where: { id, revokedAt: null, consumedAt: null },
      data: { revokedAt: now, revokedReason: reason },
    });
    return count > 0;
  }

  async consume(id: string, now: Date): Promise<boolean> {
    const { count } = await this.prisma.connectLink.updateMany({
      where: { id, ...active(now) },
      data: { consumedAt: now },
    });
    return count > 0;
  }

  async reserveNewQr(
    id: string,
    now: Date,
    max: number,
    cooldownMs: number,
  ): Promise<boolean> {
    // Um UPDATE … WHERE: o Postgres reavalia o WHERE na linha travada em READ COMMITTED, então dois
    // pedidos simultâneos não passam os dois.
    const { count } = await this.prisma.connectLink.updateMany({
      where: {
        id,
        ...active(now),
        newQrCount: { lt: max },
        OR: [
          { lastNewQrAt: null },
          { lastNewQrAt: { lte: new Date(now.getTime() - cooldownMs) } },
        ],
      },
      data: { newQrCount: { increment: 1 }, lastNewQrAt: now },
    });
    return count > 0;
  }

  async touchSeen(id: string, now: Date): Promise<void> {
    await this.prisma.connectLink.updateMany({
      where: { id },
      data: { lastSeenAt: now },
    });
  }

  async hasWorkingSince(sessionId: string, since: Date): Promise<boolean> {
    const row = await this.prisma.waSessionEvent.findFirst({
      where: { sessionId, status: 'WORKING', createdAt: { gte: since } },
      select: { id: true },
    });
    return row !== null;
  }
}
