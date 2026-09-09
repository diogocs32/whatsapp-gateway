import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type {
  CreateRefreshTokenInput,
  RefreshTokenRepository,
  RotateInput,
  RotateResult,
} from '../domain/refresh-token.repository';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRefreshTokenInput): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        id: input.id,
        userId: input.userId,
        tokenHash: input.tokenHash,
        sessionId: input.sessionId,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent ?? null,
        ip: input.ip ?? null,
      },
    });
  }

  // Rotação atômica numa transação: encontra o refresh apresentado, detecta reuso, e (se válido)
  // revoga o atual e cria o próximo com o MESMO sessionId. Todas as leituras/escritas na mesma tx
  // para que a corrida de abas seja resolvida pelo lock de linha do Postgres.
  async rotate(input: RotateInput): Promise<RotateResult> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.refreshToken.findUnique({
        where: { tokenHash: input.presentedHash },
      });
      if (!row) return { status: 'unknown' };

      // REUSO: um refresh já revogado (rotacionado antes) foi reapresentado → provável token roubado.
      // Revoga a família inteira (atacante + vítima caem) — exige novo login (RFC 9700 §4.14 / OWASP).
      if (row.revokedAt) {
        await tx.refreshToken.updateMany({
          where: { sessionId: row.sessionId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return { status: 'reused' };
      }
      if (row.expiresAt < new Date()) return { status: 'expired' };

      // Só UMA request consegue revogar esta linha (WHERE revokedAt IS NULL). Se outra aba venceu a
      // corrida (count 0), NÃO é reuso — a linha já foi rotacionada e o outro request entregou o par.
      const won = await tx.refreshToken.updateMany({
        where: { id: row.id, revokedAt: null },
        data: { revokedAt: new Date(), replacedBy: input.newId },
      });
      if (won.count !== 1) return { status: 'raced' };

      await tx.refreshToken.create({
        data: {
          id: input.newId,
          userId: row.userId,
          sessionId: row.sessionId, // MESMA família
          tokenHash: input.newTokenHash,
          expiresAt: input.newExpiresAt,
          userAgent: input.userAgent ?? null,
          ip: input.ip ?? null,
        },
      });
      return { status: 'ok', userId: row.userId, sessionId: row.sessionId };
    });
  }

  async revokeFamilyByToken(tokenHash: string): Promise<void> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!row) return;
    await this.prisma.refreshToken.updateMany({
      where: { sessionId: row.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const r = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return r.count;
  }
}
