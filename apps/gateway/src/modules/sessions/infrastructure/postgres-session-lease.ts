import { randomUUID } from 'node:crypto';
import { Prisma, PrismaService } from '../../../infra/prisma/prisma.service';
import type { SessionErrorDetails } from '../domain/session.entity';
import type { StatusPatch } from '../domain/session.repository';
import type { SessionStatus } from '../domain/session-status';
import { LeaseLostError } from '../application/session-lease.error';

export { LeaseLostError } from '../application/session-lease.error';

export interface SessionFence {
  epoch: bigint;
  until: Date;
}

// O Postgres é o árbitro único. UPDATE serializa por linha; cada novo dono incrementa o epoch.
// Qualquer escrita crítica bloqueia a MESMA linha na transação e confere dono, epoch e validade
// pelo relógio do banco. Uma transação antiga termina antes de um novo dono poder adquirir.
export class PostgresSessionLease {
  readonly owner = randomUUID();
  static readonly TTL_MS = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async acquire(sessionId: string): Promise<SessionFence | null> {
    const rows = await this.prisma.$queryRaw<
      { authEpoch: bigint; leaseUntil: Date }[]
    >`UPDATE "wa_sessions"
      SET "leaseOwner" = ${this.owner},
          "leaseUntil" = clock_timestamp() + interval '30 seconds',
          "authEpoch" = "authEpoch" + 1
      WHERE "id" = ${sessionId}
        AND ("leaseUntil" IS NULL OR "leaseUntil" <= clock_timestamp())
      RETURNING "authEpoch", "leaseUntil"`;
    return rows[0]
      ? { epoch: rows[0].authEpoch, until: rows[0].leaseUntil }
      : null;
  }

  async renew(sessionId: string, epoch: bigint): Promise<Date | null> {
    const rows = await this.prisma.$queryRaw<{ leaseUntil: Date }[]>`
      UPDATE "wa_sessions" SET "leaseUntil" = clock_timestamp() + interval '30 seconds'
      WHERE "id" = ${sessionId} AND "leaseOwner" = ${this.owner}
        AND "authEpoch" = ${epoch} AND "leaseUntil" > clock_timestamp()
      RETURNING "leaseUntil"`;
    return rows[0]?.leaseUntil ?? null;
  }

  async release(sessionId: string, epoch: bigint): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "wa_sessions" SET "leaseOwner" = NULL, "leaseUntil" = NULL
      WHERE "id" = ${sessionId} AND "leaseOwner" = ${this.owner}
        AND "authEpoch" = ${epoch}`;
  }

  async isCurrent(sessionId: string, epoch: bigint): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ valid: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM "wa_sessions"
        WHERE "id" = ${sessionId} AND "leaseOwner" = ${this.owner}
          AND "authEpoch" = ${epoch} AND "leaseUntil" > clock_timestamp()) AS valid`;
    return rows[0]?.valid === true;
  }

  async fenced<T>(
    sessionId: string,
    epoch: bigint,
    action: (tx: Prisma.TransactionClient) => Promise<T>,
    timeoutMs = 15_000,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "wa_sessions"
        WHERE "id" = ${sessionId} AND "leaseOwner" = ${this.owner}
          AND "authEpoch" = ${epoch} AND "leaseUntil" > clock_timestamp()
        FOR UPDATE`;
        if (!rows[0]) throw new LeaseLostError();
        return action(tx);
      },
      { maxWait: 5_000, timeout: timeoutMs },
    );
  }

  async updateStatus(
    sessionId: string,
    epoch: bigint,
    status: SessionStatus,
    patch: StatusPatch = {},
  ): Promise<void> {
    await this.fenced(sessionId, epoch, async (tx) => {
      await tx.waSession.update({
        where: { id: sessionId },
        data: {
          status,
          ...(patch.meJid !== undefined ? { meJid: patch.meJid } : {}),
          ...(patch.meJid ? { lastMeJid: patch.meJid } : {}),
          ...(patch.mePushName !== undefined
            ? { mePushName: patch.mePushName }
            : {}),
          ...(patch.lastError !== undefined
            ? { lastError: patch.lastError }
            : {}),
          ...(patch.lastErrorDetails !== undefined
            ? {
                lastErrorDetails:
                  patch.lastErrorDetails === null
                    ? Prisma.DbNull
                    : {
                        code: patch.lastErrorDetails.code,
                        reason: patch.lastErrorDetails.reason,
                      },
              }
            : {}),
        },
      });
    });
  }

  async updateLastErrorDetails(
    sessionId: string,
    epoch: bigint,
    details: SessionErrorDetails,
  ): Promise<void> {
    await this.fenced(sessionId, epoch, async (tx) => {
      await tx.waSession.update({
        where: { id: sessionId },
        data: {
          lastErrorDetails: { code: details.code, reason: details.reason },
        },
      });
    });
  }

  async clearAuth(sessionId: string, epoch: bigint): Promise<bigint> {
    return this.fenced(sessionId, epoch, async (tx) => {
      await tx.waAuthKey.deleteMany({ where: { sessionId } });
      const row = await tx.waSession.update({
        where: { id: sessionId },
        data: { creds: Prisma.DbNull, authEpoch: { increment: 1 } },
        select: { authEpoch: true },
      });
      return row.authEpoch;
    });
  }

  async setLastMeJid(
    sessionId: string,
    epoch: bigint,
    jid: string | null,
  ): Promise<void> {
    await this.fenced(sessionId, epoch, async (tx) => {
      await tx.waSession.update({
        where: { id: sessionId },
        data: { lastMeJid: jid },
      });
    });
  }
}
