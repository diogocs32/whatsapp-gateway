import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { Engine, SessionStatus } from '../domain/session-status';
import { Session } from '../domain/session.entity';
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
  createdAt: Date;
  updatedAt: Date;
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
  ): Promise<void> {
    await this.prisma.waSession.update({
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
      },
    });
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
