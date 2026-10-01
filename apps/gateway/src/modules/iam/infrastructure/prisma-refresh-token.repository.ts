import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../../infra/prisma/prisma.service';
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
    await this.prisma.$transaction(async (tx) => {
      await this.lockUser(tx, input.userId);
      await tx.refreshToken.create({
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
    });
  }

  // Rotação atômica numa transação: encontra o refresh apresentado, detecta reuso, e (se válido)
  // revoga o atual e cria o próximo com o MESMO sessionId. Todas as leituras/escritas na mesma tx
  // O lock do usuário coordena purge/revogação. A leitura inicial continua antes dele:
  // duas abas que leram a linha válida disputam o CAS e a perdedora continua sendo raced.
  async rotate(input: RotateInput): Promise<RotateResult> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.refreshToken.findUnique({
        where: { tokenHash: input.presentedHash },
      });
      if (!row) return { status: 'unknown' };
      await this.lockUser(tx, row.userId);

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
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.refreshToken.findUnique({
        where: { tokenHash },
      });
      if (!row) return;
      await this.lockUser(tx, row.userId);
      await tx.refreshToken.updateMany({
        where: { sessionId: row.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockUser(tx, userId);
      const r = await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return r.count;
    });
  }

  async purgeExpired(cutoff: Date, batchSize = 500): Promise<number> {
    if (!Number.isFinite(cutoff.getTime()) || cutoff > new Date())
      throw new RangeError('cutoff deve ser uma data passada');
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500)
      throw new RangeError('batchSize deve estar entre 1 e 500');

    // Excluir famílias protegidas ANTES do LIMIT evita que ancestrais antigos ocupem
    // todos os lotes para sempre. A margem também conserva terminais recém-expirados.
    const candidates = await this.prisma.$queryRaw<
      { id: string; userId: string }[]
    >`
      SELECT r.id, r."userId" FROM refresh_tokens r
      WHERE r."expiresAt" < ${cutoff}
        AND NOT EXISTS (
          SELECT 1 FROM refresh_tokens live
          WHERE live."sessionId" = r."sessionId"
            AND live."revokedAt" IS NULL AND live."expiresAt" >= ${cutoff}
        )
      ORDER BY r."expiresAt", r.id LIMIT ${batchSize}`;

    const byUser = new Map<string, string[]>();
    for (const row of candidates) {
      const ids = byUser.get(row.userId) ?? [];
      ids.push(row.id);
      byUser.set(row.userId, ids);
    }
    let total = 0;
    // Uma transação/lock por usuário: sem segurar centenas de locks durante o lote.
    for (const [userId, ids] of byUser) {
      total += await this.prisma.$transaction(
        async (tx) => {
          const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(
            hashtextextended(${'iam-refresh-user:' + userId}, 0)) AS locked`;
          if (!lock.locked) return 0; // Login/rotação/revogação em voo; próximo sweep retenta.
          // Comando posterior ao lock: READ COMMITTED vê filhos que ganharam a corrida.
          // Um NOT EXISTS só no snapshot dos candidatos não basta para excluir com segurança.
          return tx.$executeRaw`
          DELETE FROM refresh_tokens r
          WHERE r."userId" = ${userId} AND r.id IN (${Prisma.join(ids)})
            AND r."expiresAt" < ${cutoff}
            AND NOT EXISTS (
              SELECT 1 FROM refresh_tokens live
              WHERE live."sessionId" = r."sessionId"
                AND live."revokedAt" IS NULL AND live."expiresAt" >= ${cutoff}
            )`;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    }
    return total;
  }

  private async lockUser(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(
      hashtextextended(${'iam-refresh-user:' + userId}, 0))`;
  }
}
