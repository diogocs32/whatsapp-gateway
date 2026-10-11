import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../../infra/prisma/prisma.service';
import { newId } from '../../../shared-kernel/ulid';
import { ProxyUnavailableError } from '../application/proxy-unavailable.error';
import { Proxy, ProxyAssignment } from '../domain/proxy.entity';
import type { ReleasedAssignment } from '../domain/proxy-suggestion';
import { proxyUsageMap, type ProxyUsageSession } from '../domain/proxy-usage';
import type {
  CreateProxyInput,
  DeletedProxy,
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

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Proxy | null> {
    const row = await (tx ?? this.prisma).proxy.findUnique({ where: { id } });
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
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await (tx ?? this.prisma).proxy.update({
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

  // E28 (P-107). Prisma 7.10 não tem deleteMany que devolva as linhas: trava com FOR UPDATE (em
  // ordem de posição — dois lotes concorrentes não se cruzam), lê quem usa os travados (depois do
  // lock: um PUT SINGLE que gravou antes já aparece) e apaga. Um PUT SINGLE concorrente, que também
  // trava a linha do proxy, espera e depois não acha mais o proxy apagado.
  async deleteMany(ids: readonly string[]): Promise<DeletedProxy[]> {
    if (ids.length === 0) return [];
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; position: number }>>`
        SELECT id, position FROM proxies
         WHERE id IN (${Prisma.join([...ids])})
         ORDER BY position
           FOR UPDATE`;
      if (rows.length === 0) return [];
      const lockedIds = rows.map((r) => r.id);
      const usage = await this.usageOf(tx, lockedIds);
      await tx.proxy.deleteMany({ where: { id: { in: lockedIds } } });
      return rows.map((r) => ({ ...r, sessions: usage.get(r.id) ?? [] }));
    });
  }

  async getAssignment(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ProxyAssignment | null> {
    const row = await (tx ?? this.prisma).sessionProxyAssignment.findUnique({
      where: { sessionId },
    });
    return row ? toAssignment(row) : null;
  }

  async resolveSessionId(reference: string): Promise<string> {
    const session =
      (await this.prisma.waSession.findUnique({
        where: { id: reference },
        select: { id: true },
      })) ??
      (await this.prisma.waSession.findUnique({
        where: { name: reference },
        select: { id: true },
      }));
    return session?.id ?? reference;
  }

  async setAssignment(input: SetAssignmentInput): Promise<ProxyAssignment> {
    return this.prisma.$transaction(async (tx) => {
      if (input.mode === 'SINGLE') {
        if (!input.currentProxyId)
          throw new ProxyUnavailableError('mode SINGLE exige proxyId');
        // Serializa atribuições SINGLE concorrentes para a mesma saída, entre réplicas.
        // Revalidar depois do lock também impede usar proxy desabilitado durante o PUT.
        await tx.$queryRaw`SELECT id FROM proxies WHERE id = ${input.currentProxyId} FOR UPDATE`;
        const proxy = await tx.proxy.findUnique({
          where: { id: input.currentProxyId },
        });
        if (!proxy) throw new ProxyUnavailableError('Proxy não encontrado');
        if (!proxy.enabled)
          throw new ProxyUnavailableError('Proxy está desabilitado');
        if (proxy.status === 'DEAD')
          throw new ProxyUnavailableError(
            'Proxy está DEAD — teste-o ou escolha outro',
          );
        // E28 (D-051): compartilhar é escolha explícita; sem ela, exclusividade D-008/D-041. Repetir
        // o próprio SINGLE no mesmo proxy não é compartilhar de novo (pode já estar dividido).
        const keepsOwn =
          (await this.liveSinglePin(input.sessionId, tx)) ===
          input.currentProxyId;
        if (!input.allowShared && !keepsOwn) {
          const owners = await tx.$queryRaw<Array<{ sessionId: string }>>`
            SELECT a."sessionId" FROM session_proxy_assignments a
            JOIN wa_sessions s ON s.id = a."sessionId"
            WHERE a."currentProxyId" = ${input.currentProxyId}
              AND a.mode <> 'NONE' AND a."sessionId" <> ${input.sessionId}
            LIMIT 1`;
          if (owners.length)
            throw new ProxyUnavailableError(
              'Proxy já está em uso por outra sessão',
            );
        }
      }
      const row = await tx.sessionProxyAssignment.upsert({
        where: { sessionId: input.sessionId },
        create: {
          sessionId: input.sessionId,
          mode: input.mode,
          rangeStart: input.rangeStart,
          rangeEnd: input.rangeEnd,
          strategy: input.strategy,
          ...(input.currentProxyId !== undefined
            ? { currentProxyId: input.currentProxyId }
            : {}),
        },
        update: {
          mode: input.mode,
          rangeStart: input.rangeStart,
          rangeEnd: input.rangeEnd,
          strategy: input.strategy,
          ...(input.currentProxyId !== undefined
            ? { currentProxyId: input.currentProxyId }
            : {}),
          // E26: gravar atribuição explicitamente numa linha a desfaz como "memória" — um PUT numa
          // órfã (aba velha, API) diria que a sessão apagada usava um proxy que ela nunca usou.
          releasedSessionName: null,
          releasedAt: null,
        },
      });
      return toAssignment(row);
    });
  }

  async setCurrent(sessionId: string, proxyId: string | null): Promise<void> {
    await this.prisma.sessionProxyAssignment.update({
      where: { sessionId },
      data: { currentProxyId: proxyId },
    });
  }

  async setCurrentIfUnchanged(
    expected: ProxyAssignment,
    proxyId: string,
  ): Promise<boolean> {
    const { count } = await this.prisma.sessionProxyAssignment.updateMany({
      where: {
        sessionId: expected.sessionId,
        mode: expected.mode,
        rangeStart: expected.rangeStart,
        rangeEnd: expected.rangeEnd,
        strategy: expected.strategy,
        currentProxyId: expected.currentProxyId,
      },
      data: { currentProxyId: proxyId },
    });
    return count === 1;
  }

  async usedProxyIds(excludeSessionId?: string): Promise<string[]> {
    const [assignments, sessions] = await Promise.all([
      this.prisma.sessionProxyAssignment.findMany({
        where: { currentProxyId: { not: null }, mode: { not: 'NONE' } },
        select: { sessionId: true, currentProxyId: true },
      }),
      this.prisma.waSession.findMany({ select: { id: true } }),
    ]);
    const alive = new Set(sessions.map((s) => s.id));
    return assignments
      .filter((a) => alive.has(a.sessionId) && a.sessionId !== excludeSessionId)
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

  async proxyUsage(): Promise<Map<string, ProxyUsageSession[]>> {
    return this.usageOf(this.prisma);
  }

  async liveSinglePin(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string | null> {
    const rows = await (tx ?? this.prisma).$queryRaw<
      Array<{ currentProxyId: string | null }>
    >`
      SELECT a."currentProxyId" FROM session_proxy_assignments a
        JOIN wa_sessions s ON s.id = a."sessionId"
       WHERE a."sessionId" = ${sessionId} AND a.mode = 'SINGLE'`;
    return rows[0]?.currentProxyId ?? null;
  }

  // E28: UMA consulta (foto única — sessão criada entre duas leituras não some nem aparece pela
  // metade) com as atribuições de sessões vivas; a régua final e a ordem são as do domínio.
  private async usageOf(
    client: Prisma.TransactionClient,
    proxyIds?: readonly string[],
  ): Promise<Map<string, ProxyUsageSession[]>> {
    const rows = await client.$queryRaw<
      Array<{
        sessionId: string;
        mode: string;
        currentProxyId: string;
        name: string;
      }>
    >`
      SELECT a."sessionId", a.mode::text AS mode, a."currentProxyId", s.name
        FROM session_proxy_assignments a
        JOIN wa_sessions s ON s.id = a."sessionId"
       WHERE a."currentProxyId" IS NOT NULL AND a.mode <> 'NONE'
       ${
         proxyIds
           ? Prisma.sql`AND a."currentProxyId" IN (${Prisma.join([...proxyIds])})`
           : Prisma.empty
       }`;
    return proxyUsageMap(
      rows.map((r) => ({
        sessionId: r.sessionId,
        mode: r.mode as ProxyMode,
        currentProxyId: r.currentProxyId,
      })),
      rows.map((r) => ({ id: r.sessionId, name: r.name })),
    );
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
