import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { newId } from '../../../shared-kernel/ulid';
import type {
  AuditEntry,
  AuditLogRecord,
  AuditRepository,
} from '../domain/audit.repository';

@Injectable()
export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(e: AuditEntry): Promise<void> {
    await this.prisma.waAuditLog.create({
      data: {
        id: newId(),
        actor: e.actor,
        method: e.method,
        path: e.path,
        statusCode: e.statusCode,
        ip: e.ip,
      },
    });
  }

  async list(limit: number, offset: number): Promise<AuditLogRecord[]> {
    const rows = await this.prisma.waAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => ({
      id: r.id,
      actor: r.actor,
      method: r.method,
      path: r.path,
      statusCode: r.statusCode,
      ip: r.ip,
      createdAt: r.createdAt,
    }));
  }
}
