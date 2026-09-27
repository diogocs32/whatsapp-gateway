import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { newId } from '../../../shared-kernel/ulid';
import { Proxy, ProxyAssignment } from '../domain/proxy.entity';
import type { ReleasedAssignment } from '../domain/proxy-suggestion';
import type {
  CreateProxyInput,
  ProxyRepository,
  SetAssignmentInput,
  UpdateConnectionInput,
} from '../domain/proxy.repository';
import type {
  ProxyMode,
  ProxyProtocol,
  ProxySource,
  ProxyStatus,
  ProxyStrategy,
} from '../domain/proxy-types';

type ProxyRow = {
  id: string;
  position: number;
  label: string | null;
  protocol: string;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  source: string;
  country: string | null;
  exitIp: string | null;
  latencyMs: number | null;
  status: string;
  enabled: boolean;
};

type AssignmentRow = {
  sessionId: string;
  mode: string;
  rangeStart: number | null;
  rangeEnd: number | null;
  strategy: string;
  currentProxyId: string | null;
};

function toProxy(r: ProxyRow): Proxy {
  return new Proxy(
    r.id,
    r.position,
    r.label,
    r.protocol as ProxyProtocol,
    r.host,
    r.port,
    r.username,
    r.password,
    r.source as ProxySource,
    r.country,
    r.exitIp,
    r.latencyMs,
    r.status as ProxyStatus,
    r.enabled,
  );
}

function toAssignment(r: AssignmentRow): ProxyAssignment {
  return new ProxyAssignment(
    r.sessionId,
    r.mode as ProxyMode,
    r.rangeStart,
    r.rangeEnd,
    r.strategy as ProxyStrategy,
    r.currentProxyId,
  );
}

@Injectable()
export class PrismaProxyRepository implements ProxyRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Posição estável: max(position) + 1. Nunca reaproveita gaps (a posição é a "âncora" dos ranges, §7.2).
  async nextPosition(): Promise<number> {
    const agg = await this.prisma.proxy.aggregate({ _max: { position: true } });
    return (agg._max.position ?? 0) + 1;
  }

  async create(input: CreateProxyInput): Promise<Proxy> {
    const row = await this.prisma.proxy.create({
      data: {
        id: newId(),
        position: input.position,
        label: input.label,
        protocol: input.protocol,
        host: input.host,
        port: input.port,
        username: input.username,
        password: input.password,
        source: input.source,
        webshareId: input.webshareId,
        country: input.country,
      },
    });
    return toProxy(row);
  }

  async findByWebshareId(webshareId: string): Promise<Proxy | null> {
    const row = await this.prisma.proxy.findUnique({ where: { webshareId } });
    return row ? toProxy(row) : null;
  }

  async updateConnection(
    id: string,
    input: UpdateConnectionInput,
  ): Promise<void> {
    await this.prisma.proxy.update({
      where: { id },
      data: {
        host: input.host,
        port: input.port,
        username: input.username,
        password: input.password,
        country: input.country,
      },
    });
  }

  async list(): Promise<Proxy[]> {
    const rows = await this.prisma.proxy.findMany({
      orderBy: { position: 'asc' },
    });
    return rows.map(toProxy);
  }

  async findById(id: string): Promise<Proxy | null> {
    const row = await this.prisma.proxy.findUnique({ where: { id } });
    return row ? toProxy(row) : null;
  }

  async listInRange(start: number, end: number): Promise<Proxy[]> {
    const rows = await this.prisma.proxy.findMany({
      where: { position: { gte: start, lte: end }, enabled: true },
      orderBy: { position: 'asc' },
    });
    return rows.map(toProxy);
  }

  async listEnabledAlive(): Promise<Proxy[]> {
    const rows = await this.prisma.proxy.findMany({
      where: { enabled: true, status: { not: 'DEAD' } },
      orderBy: { position: 'asc' },
    });
    return rows.map(toProxy);
  }

  async updateTest(
    id: string,
    r: { status: ProxyStatus; latencyMs: number | null; exitIp: string | null },
  ): Promise<void> {
    await this.prisma.proxy.update({
      where: { id },
      data: {
        status: r.status,
        latencyMs: r.latencyMs,
        exitIp: r.exitIp,
        lastTestedAt: new Date(),
      },
    });
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    await this.prisma.proxy.update({ where: { id }, data: { enabled } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.proxy.delete({ where: { id } });
  }

  async getAssignment(sessionId: string): Promise<ProxyAssignment | null> {
    const row = await this.prisma.sessionProxyAssignment.findUnique({
      where: { sessionId },
    });
    return row ? toAssignment(row) : null;
  }

  async setAssignment(input: SetAssignmentInput): Promise<ProxyAssignment> {
    const row = await this.prisma.sessionProxyAssignment.upsert({
      where: { sessionId: input.sessionId },
      create: {
        sessionId: input.sessionId,
        mode: input.mode,
        rangeStart: input.rangeStart,
        rangeEnd: input.rangeEnd,
        strategy: input.strategy,
      },
      update: {
        mode: input.mode,
        rangeStart: input.rangeStart,
        rangeEnd: input.rangeEnd,
        strategy: input.strategy,
        // E26: gravar atribuição explicitamente numa linha a desfaz como "memória" — um PUT numa
        // órfã (aba velha, API) diria que a sessão apagada usava um proxy que ela nunca usou.
        releasedSessionName: null,
        releasedAt: null,
      },
    });
    return toAssignment(row);
  }

  async setCurrent(sessionId: string, proxyId: string | null): Promise<void> {
    await this.prisma.sessionProxyAssignment.update({
      where: { sessionId },
      data: { currentProxyId: proxyId },
    });
  }

  async usedProxyIds(): Promise<string[]> {
    const [assignments, sessions] = await Promise.all([
      this.prisma.sessionProxyAssignment.findMany({
        where: { currentProxyId: { not: null }, mode: { not: 'NONE' } },
        select: { sessionId: true, currentProxyId: true },
      }),
      this.prisma.waSession.findMany({ select: { id: true } }),
    ]);
    const alive = new Set(sessions.map((s) => s.id));
    return assignments
      .filter((a) => alive.has(a.sessionId))
      .map((a) => a.currentProxyId as string);
  }

  async proxyOwnerName(proxyId: string): Promise<string | null> {
    const assignments = await this.prisma.sessionProxyAssignment.findMany({
      where: { currentProxyId: proxyId, mode: { not: 'NONE' } },
      select: { sessionId: true },
    });
    if (assignments.length === 0) return null;
    const owner = await this.prisma.waSession.findFirst({
      where: { id: { in: assignments.map((a) => a.sessionId) } },
      select: { name: true },
      orderBy: { createdAt: 'asc' },
    });
    return owner?.name ?? null;
  }

  async markReleased(
    sessionId: string,
    sessionName: string,
    at: Date,
  ): Promise<number> {
    const { count } = await this.prisma.sessionProxyAssignment.updateMany({
      where: { sessionId, mode: 'SINGLE', currentProxyId: { not: null } },
      data: { releasedSessionName: sessionName, releasedAt: at },
    });
    return count;
  }

  async findReleasedByName(name: string): Promise<ReleasedAssignment[]> {
    // Igualdade em minúsculas (não o `mode: 'insensitive'` do Prisma, que vira ILIKE e faria o `_`
    // do nome casar qualquer caractere). Nomes são ASCII ([a-zA-Z0-9_-]): lower() do Postgres =
    // toLowerCase() do JS. Sessões ainda vivas ficam de fora antes do LIMIT.
    return this.prisma.$queryRaw<ReleasedAssignment[]>`
      SELECT spa."sessionId", spa."releasedSessionName", spa."releasedAt", spa."currentProxyId"
        FROM "session_proxy_assignments" spa
       WHERE lower(spa."releasedSessionName") = lower(${name})
         AND spa."mode" = 'SINGLE'
         AND spa."currentProxyId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "wa_sessions" w WHERE w."id" = spa."sessionId")
       ORDER BY spa."releasedAt" DESC, spa."sessionId" DESC
       LIMIT 20`;
  }
}
