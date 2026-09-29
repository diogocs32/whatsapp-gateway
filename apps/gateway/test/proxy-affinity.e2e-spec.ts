import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { RedisService } from '../src/infra/redis/redis.service';
import { ProxyResolver } from '../src/modules/proxies/application/proxy-resolver.service';
import { ProxyUnavailableError } from '../src/modules/proxies/application/proxy-unavailable.error';
import {
  SessionBusyError,
  SessionManager,
} from '../src/modules/sessions/application/session-manager.service';
import type { BaileysEngineDeps } from '../src/modules/sessions/infrastructure/baileys/baileys.engine';
import {
  LeaseLostError,
  PostgresSessionLease,
} from '../src/modules/sessions/infrastructure/postgres-session-lease';
import { PrismaSessionRepository } from '../src/modules/sessions/infrastructure/prisma-session.repository';
import { createTestApp, inject, login } from './setup-app';

// Resolver, persistência, cursor Redis e lease são reais. A fábrica falsa só resolve o
// transporte e publica status: não abre socket, Chromium, QR, conta nem envia mensagens.
describe('E15/P-058 — afinidade de proxy no Postgres e Redis', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let resolver: ProxyResolver;
  let token: string;
  let caseNo = 0;
  const sessionIds: string[] = [];
  const proxyIds: string[] = [];
  const cursorKeys: string[] = [];
  const managers: SessionManager[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
    resolver = app.get(ProxyResolver);
    token = await login(app);
    expect(await redis.ping()).toBe(true);
  });

  afterEach(async () => {
    for (const manager of managers.splice(0)) await manager.onModuleDestroy();
    await prisma.sessionProxyAssignment.deleteMany({
      where: { sessionId: { in: sessionIds } },
    });
    await prisma.waSession.deleteMany({ where: { id: { in: sessionIds } } });
    await prisma.proxy.deleteMany({ where: { id: { in: proxyIds } } });
    for (const key of cursorKeys.splice(0)) await redis.client.del(key);
    sessionIds.length = 0;
    proxyIds.length = 0;
  });

  afterAll(async () => {
    await app?.close();
  });

  async function session(engine: 'BAILEYS' | 'WWEBJS' = 'BAILEYS') {
    caseNo += 1;
    const id = `e15-proxy-${caseNo}`;
    sessionIds.push(id);
    await prisma.waSession.create({
      data: { id, name: `${id}-nome`, engine, autostart: false },
    });
    return id;
  }

  async function proxy() {
    const max = await prisma.proxy.aggregate({ _max: { position: true } });
    const position = (max._max.position ?? 0) + 1;
    const id = `e15-proxy-${caseNo}-${position}`;
    proxyIds.push(id);
    return prisma.proxy.create({
      data: {
        id,
        position,
        host: 'e15-affinity.test',
        port: 18080 + proxyIds.length,
        protocol: 'HTTP',
      },
    });
  }

  function assignment(id: string) {
    return prisma.sessionProxyAssignment.findUniqueOrThrow({
      where: { sessionId: id },
    });
  }

  function manager() {
    const connections: Array<{ proxyId: string | null; direct: boolean }> = [];
    const factory = {
      create: vi.fn((engine: string, deps: BaileysEngineDeps) => {
        let status = 'STOPPED';
        return {
          engineName: engine === 'WWEBJS' ? 'wwebjs' : 'baileys',
          getStatus: () => status,
          getQrBase64: () => null,
          start: async () => {
            let direct: boolean;
            if (engine === 'WWEBJS') {
              direct = (await deps.resolveProxyConfig!()) === null;
            } else {
              const transport = await deps.resolveBaileysTransport!();
              direct = transport.agent === null;
              transport.agent?.destroy();
            }
            const row = await assignment(deps.sessionId);
            connections.push({ proxyId: row.currentProxyId, direct });
            status = 'WORKING';
            deps.onEvent('session.status', { status: 'WORKING', error: null });
          },
          stop: async () => {
            status = 'STOPPED';
            deps.onEvent('session.status', { status: 'STOPPED', error: null });
          },
          shutdown: async () => {
            status = 'STOPPED';
          },
        };
      }),
    };
    const instance = new SessionManager(
      new PrismaSessionRepository(prisma),
      prisma,
      { get: () => 'silent' } as never,
      { publish: () => undefined } as never,
      resolver,
      {} as never,
      {} as never,
      factory as never,
      {} as never,
    );
    managers.push(instance);
    const lease = (instance as unknown as { lease: PostgresSessionLease })
      .lease;
    return { instance, factory, connections, lease };
  }

  it.each([
    ['RANGE', 'BAILEYS'],
    ['GLOBAL_ROUND_ROBIN', 'WWEBJS'],
  ] as const)(
    '%s mantém proxy no restart e no takeover com engine %s',
    async (mode, engine) => {
      const id = await session(engine);
      const first = await proxy();
      const second = await proxy();
      const cursor =
        mode === 'RANGE'
          ? `proxy:rr:range:${first.position}-${second.position + 1}`
          : 'proxy:rr:global';
      if (mode === 'RANGE') cursorKeys.push(cursor);
      await prisma.sessionProxyAssignment.create({
        data: {
          sessionId: id,
          mode,
          rangeStart: mode === 'RANGE' ? first.position : null,
          rangeEnd: mode === 'RANGE' ? second.position + 1 : null,
          strategy: 'ROUND_ROBIN',
          currentProxyId: first.id,
        },
      });
      const initialCursor = await redis.client.get(cursor);
      const a = manager();
      const b = manager();
      await a.instance.start(id);
      const initial = await prisma.waSession.findUniqueOrThrow({
        where: { id },
      });
      await expect(b.instance.start(id)).rejects.toBeInstanceOf(
        SessionBusyError,
      );
      expect(b.factory.create).not.toHaveBeenCalled();

      await proxy(); // mudança do pool não pode trocar o proxy desta conta.
      await a.instance.restart(id);
      await a.instance.stop(id);
      await b.instance.start(id);
      await vi.waitFor(async () => {
        expect(
          (await prisma.waSession.findUniqueOrThrow({ where: { id } })).status,
        ).toBe('WORKING');
      });
      const current = await prisma.waSession.findUniqueOrThrow({
        where: { id },
      });
      expect(current.authEpoch).toBeGreaterThan(initial.authEpoch);
      await expect(
        a.lease.updateStatus(id, initial.authEpoch, 'FAILED'),
      ).rejects.toBeInstanceOf(LeaseLostError);
      expect(a.connections).toEqual([
        { proxyId: first.id, direct: false },
        { proxyId: first.id, direct: false },
      ]);
      expect(b.connections).toEqual([{ proxyId: first.id, direct: false }]);
      expect((await assignment(id)).currentProxyId).toBe(first.id);
      expect(await redis.client.get(cursor)).toBe(initialCursor);
    },
  );

  it('RANGE troca o proxy DEAD uma vez e persiste a nova afinidade no Redis/Postgres', async () => {
    const id = await session();
    const first = await proxy();
    const second = await proxy();
    const cursor = `proxy:rr:range:${first.position}-${second.position}`;
    cursorKeys.push(cursor);
    await prisma.sessionProxyAssignment.create({
      data: {
        sessionId: id,
        mode: 'RANGE',
        rangeStart: first.position,
        rangeEnd: second.position,
        strategy: 'ROUND_ROBIN',
        currentProxyId: first.id,
      },
    });
    const a = manager();
    await a.instance.start(id);
    await prisma.proxy.update({
      where: { id: first.id },
      data: { status: 'DEAD' },
    });
    await a.instance.restart(id);
    const cursorAfterReplacement = await redis.client.get(cursor);
    expect(cursorAfterReplacement).toBe('1');
    await a.instance.restart(id);
    expect(a.connections.map((c) => c.proxyId)).toEqual([
      first.id,
      second.id,
      second.id,
    ]);
    expect(a.connections.every((c) => !c.direct)).toBe(true);
    expect((await assignment(id)).currentProxyId).toBe(second.id);
    expect(await redis.client.get(cursor)).toBe(cursorAfterReplacement);
  });

  it('marcação DEAD participa do rollback da lease e callback antigo não marca após takeover', async () => {
    const id = await session();
    const p = await proxy();
    expect((await put(id, p.id)).statusCode).toBe(200);
    const a = manager();
    const b = manager();
    await a.instance.start(id);
    const owned = await prisma.waSession.findUniqueOrThrow({ where: { id } });
    await expect(
      a.lease.fenced(id, owned.authEpoch, async (tx) => {
        expect(await resolver.reportFailure(id, '407', p.id, tx)).toEqual({
          mode: 'SINGLE',
          marked: true,
        });
        throw new Error('abortar transação cercada');
      }),
    ).rejects.toThrow('abortar transação cercada');
    expect(
      (await prisma.proxy.findUniqueOrThrow({ where: { id: p.id } })).status,
    ).toBe('UNTESTED');
    const deps = a.factory.create.mock.calls[0][1];
    await prisma.waSession.update({
      where: { id },
      data: { leaseUntil: new Date(0) },
    });
    await b.instance.start(id);
    await expect(deps.reportProxyFailure!('407', p.id)).rejects.toBeInstanceOf(
      LeaseLostError,
    );
    expect(
      (await prisma.proxy.findUniqueOrThrow({ where: { id: p.id } })).status,
    ).toBe('UNTESTED');
  });

  it.each(['missing-pin', 'missing-proxy', 'disabled', 'dead'] as const)(
    'SINGLE %s falha explicitamente em todos os transportes, sem saída direta',
    async (invalid) => {
      const id = await session();
      const p = await proxy();
      if (invalid === 'disabled')
        await prisma.proxy.update({
          where: { id: p.id },
          data: { enabled: false },
        });
      if (invalid === 'dead')
        await prisma.proxy.update({
          where: { id: p.id },
          data: { status: 'DEAD' },
        });
      await prisma.sessionProxyAssignment.create({
        data: {
          sessionId: id,
          mode: 'SINGLE',
          strategy: 'STICKY',
          currentProxyId:
            invalid === 'missing-pin'
              ? null
              : invalid === 'missing-proxy'
                ? 'e15-does-not-exist'
                : p.id,
        },
      });
      for (const resolve of [
        () => resolver.resolve(id),
        () => resolver.resolveAgent(id),
        () => resolver.resolveProxyConfig(id),
        () => resolver.resolveBaileysTransport(id),
      ])
        await expect(resolve()).rejects.toBeInstanceOf(ProxyUnavailableError);
      const a = manager();
      await expect(a.instance.start(id)).rejects.toBeInstanceOf(
        ProxyUnavailableError,
      );
      expect(a.connections).toEqual([]);
    },
  );

  it('RANGE sem candidato falha e NONE permite transporte direto', async () => {
    const id = await session();
    const p = await proxy();
    await prisma.proxy.update({
      where: { id: p.id },
      data: { status: 'DEAD' },
    });
    await prisma.sessionProxyAssignment.create({
      data: {
        sessionId: id,
        mode: 'RANGE',
        strategy: 'STICKY',
        rangeStart: p.position,
        rangeEnd: p.position,
        currentProxyId: p.id,
      },
    });
    await expect(resolver.resolveProxyConfig(id)).rejects.toBeInstanceOf(
      ProxyUnavailableError,
    );
    await expect(resolver.resolveBaileysTransport(id)).rejects.toBeInstanceOf(
      ProxyUnavailableError,
    );
    await prisma.sessionProxyAssignment.update({
      where: { sessionId: id },
      data: { mode: 'NONE', currentProxyId: null },
    });
    expect(await resolver.resolveProxyConfig(id)).toBeNull();
    expect(await resolver.resolveBaileysTransport(id)).toEqual({
      agent: null,
      createMediaDispatcher: null,
    });
    const a = manager();
    await a.instance.start(id);
    expect(a.connections).toEqual([{ proxyId: null, direct: true }]);
  });

  function put(id: string, proxyId: string) {
    return inject(app, {
      method: 'PUT',
      url: `/api/sessions/${id}/proxy`,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: { mode: 'SINGLE', strategy: 'STICKY', proxyId },
    });
  }

  it('GET/PUT pelo nome usa a sessão viva sem criar atribuição com o nome', async () => {
    const id = await session();
    const p = await proxy();
    const { name } = await prisma.waSession.findUniqueOrThrow({
      where: { id },
    });
    const res = await put(name, p.id);
    expect(res.statusCode).toBe(200);
    expect(res.json().sessionId).toBe(id);
    expect((await assignment(id)).currentProxyId).toBe(p.id);
    expect(
      await prisma.sessionProxyAssignment.findUnique({
        where: { sessionId: name },
      }),
    ).toBeNull();
    const get = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${name}/proxy`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(get.statusCode).toBe(200);
    expect(get.json().currentProxyId).toBe(p.id);
  });

  it('dois PUT SINGLE concorrentes não atribuem o mesmo proxy a duas sessões vivas', async () => {
    const first = await session();
    const second = await session();
    const p = await proxy();
    const results = await Promise.all([put(first, p.id), put(second, p.id)]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 400]);
    expect(
      await prisma.sessionProxyAssignment.count({
        where: { sessionId: { in: [first, second] }, currentProxyId: p.id },
      }),
    ).toBe(1);
  });

  it('PUT SINGLE permite manter o próprio proxy e recusa proxy de outra sessão sem mutar', async () => {
    const firstId = await session();
    const secondId = await session();
    const firstProxy = await proxy();
    const secondProxy = await proxy();
    expect((await put(firstId, firstProxy.id)).statusCode).toBe(200);
    expect((await put(secondId, secondProxy.id)).statusCode).toBe(200);
    expect((await put(firstId, firstProxy.id)).statusCode).toBe(200);
    const refused = await put(secondId, firstProxy.id);
    expect(refused.statusCode).toBe(400);
    expect(refused.json().message).toContain('em uso');
    expect((await assignment(firstId)).currentProxyId).toBe(firstProxy.id);
    expect((await assignment(secondId)).currentProxyId).toBe(secondProxy.id);
  });

  it.each(['missing', 'disabled', 'dead'] as const)(
    'PUT SINGLE %s retorna 400 e preserva a atribuição anterior',
    async (invalid) => {
      const id = await session();
      const previous = await proxy();
      const next = await proxy();
      expect((await put(id, previous.id)).statusCode).toBe(200);
      if (invalid === 'disabled')
        await prisma.proxy.update({
          where: { id: next.id },
          data: { enabled: false },
        });
      if (invalid === 'dead')
        await prisma.proxy.update({
          where: { id: next.id },
          data: { status: 'DEAD' },
        });
      const before = await assignment(id);
      const rejected = await put(
        id,
        invalid === 'missing' ? 'e15-does-not-exist' : next.id,
      );
      expect(rejected.statusCode).toBe(400);
      expect(await assignment(id)).toEqual(before);
    },
  );
});
