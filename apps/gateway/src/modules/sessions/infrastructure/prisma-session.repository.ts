import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '../../../infra/prisma/prisma.service';
import type { Engine, SessionStatus } from '../domain/session-status';
import { Session, type SessionErrorDetails } from '../domain/session.entity';
import type {
  CreateSessionInput,
  SessionRepository,
  StatusPatch,
} from '../domain/session.repository';

interface Row {
  id: string;
  name: string;
  engine: string;
  status: string;
  meJid: string | null;
  mePushName: string | null;
  phoneNumber: string | null;
  autostart: boolean;
  lastError: string | null;
  lastErrorDetails: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function parseErrorDetails(value: unknown): SessionErrorDetails | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.code !== null && typeof v.code !== 'number') return null;
  if (v.reason !== null && typeof v.reason !== 'string') return null;
  return { code: v.code, reason: v.reason } as SessionErrorDetails;
}

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(r: Row): Session {
    return new Session(
      r.id,
      r.name,
      r.engine as Engine,
      r.status as SessionStatus,
      r.meJid,
      r.mePushName,
      r.phoneNumber,
      r.autostart,
      r.lastError,
      r.createdAt,
      r.updatedAt,
      parseErrorDetails(r.lastErrorDetails),
    );
  }

  async create(input: CreateSessionInput): Promise<Session> {
    const r = await this.prisma.waSession.create({
      data: {
        id: input.id,
        name: input.name,
        engine: input.engine,
        phoneNumber: input.phoneNumber,
        autostart: input.autostart,
        status: 'STOPPED',
      },
    });
    return this.toDomain(r);
  }

  async findById(id: string): Promise<Session | null> {
    const r = await this.prisma.waSession.findUnique({ where: { id } });
    return r ? this.toDomain(r) : null;
  }

  async findByName(name: string): Promise<Session | null> {
    const r = await this.prisma.waSession.findUnique({ where: { name } });
    return r ? this.toDomain(r) : null;
  }

  async list(): Promise<Session[]> {
    const rs = await this.prisma.waSession.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rs.map((r) => this.toDomain(r));
  }

  async updateStatus(
    id: string,
    status: SessionStatus,
    patch: StatusPatch = {},
  ): Promise<boolean> {
    // updateMany (não update): quando o registro não existe, retorna count 0 em vez de lançar
    // P2025 ("No record was found for an update"). Uma engine órfã (socket/Chromium ainda vivo
    // após a sessão ser removida) emite status tardios — aqui isso vira count 0, não uma exceção
    // em loop. O `id` é unique, então atualiza no máximo 1 linha.
    const { count } = await this.prisma.waSession.updateMany({
      where: { id },
      data: {
        status,
        ...(patch.meJid !== undefined ? { meJid: patch.meJid } : {}),
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
    return count > 0;
  }

  async updateLastErrorDetails(
    id: string,
    details: SessionErrorDetails,
  ): Promise<boolean> {
    const { count } = await this.prisma.waSession.updateMany({
      where: { id },
      data: {
        lastErrorDetails: { code: details.code, reason: details.reason },
      },
    });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.waSession.delete({ where: { id } });
  }

  async findAutostart(): Promise<Session[]> {
    const rs = await this.prisma.waSession.findMany({
      where: {
        autostart: true,
        status: {
          in: [
            'WORKING',
            'STARTING',
            'SCAN_QR_CODE',
            'PAIRING_CODE',
            'DEGRADED',
          ],
        },
      },
    });
    return rs.map((r) => this.toDomain(r));
  }
}
