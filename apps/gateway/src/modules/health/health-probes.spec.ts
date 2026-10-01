import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply } from 'fastify';
import type { PrismaService } from '../../infra/prisma/prisma.service';
import type { RedisService } from '../../infra/redis/redis.service';
import type { MediaStorage } from '../../infra/storage/media-storage.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

const memory = vi.hoisted(() => ({ memoryStats: vi.fn() }));

// O parser/limiar real tem cobertura em health-memory.spec; aqui isolamos os probes.
vi.mock('../../shared-kernel/memory', () => ({
  memoryStats: memory.memoryStats,
}));

const NOW = new Date('2026-09-30T23:00:00.000Z');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function setup() {
  const query = vi.fn<(...args: unknown[]) => Promise<unknown[]>>(async () => [
    { '?column?': 1 },
  ]);
  const ping = vi.fn(async () => true);
  const probeWrite = vi.fn(async () => true);
  const service = new HealthService(
    { $queryRaw: query } as unknown as PrismaService,
    { ping } as unknown as RedisService,
    { probeWrite } as unknown as MediaStorage,
  );
  const controller = new HealthController(service);
  const status = vi.fn();
  const reply = { status } as unknown as FastifyReply;
  return { query, ping, probeWrite, controller, reply, status };
}

function expectSqlProbe(query: ReturnType<typeof setup>['query']) {
  expect(query).toHaveBeenCalledTimes(1);
  const args = query.mock.calls[0];
  expect(args).toHaveLength(1);
  expect(args[0]).toEqual(['SELECT 1']);
  expect((args[0] as TemplateStringsArray).raw).toEqual(['SELECT 1']);
}

describe('HealthService/HealthController — probes e prazos reais', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(process, 'uptime').mockReturnValue(12.6);
    vi.stubEnv('npm_package_version', '0.1.0-test');
    memory.memoryStats.mockReset().mockReturnValue({
      rssBytes: 777,
      heapUsedBytes: 200,
      heapLimitBytes: 1_000,
      heapUsedPct: 0.2,
      containerUsedBytes: 400,
      containerLimitBytes: 1_000,
      memoryUsedPct: 0.4,
    });
  });

  afterEach(() => {
    // useRealTimers descarta timers: verificar antes impede mascarar vazamentos.
    try {
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
    }
  });

  it.each([
    { database: true, redis: true, storage: true, health: 'ok', http: 200 },
    { database: true, redis: true, storage: false, health: 'ok', http: 200 },
    {
      database: false,
      redis: true,
      storage: true,
      health: 'degraded',
      http: 200,
    },
    {
      database: false,
      redis: true,
      storage: false,
      health: 'degraded',
      http: 200,
    },
    {
      database: true,
      redis: false,
      storage: true,
      health: 'degraded',
      http: 200,
    },
    {
      database: true,
      redis: false,
      storage: false,
      health: 'degraded',
      http: 200,
    },
    {
      database: false,
      redis: false,
      storage: true,
      health: 'unhealthy',
      http: 503,
    },
    {
      database: false,
      redis: false,
      storage: false,
      health: 'unhealthy',
      http: 503,
    },
  ])(
    'DB=$database Redis=$redis storage=$storage → $health/HTTP $http',
    async ({ database, redis, storage, health, http }) => {
      const ports = setup();
      if (!database)
        ports.query.mockRejectedValue(new Error('DB indisponível'));
      ports.ping.mockResolvedValue(redis);
      ports.probeWrite.mockResolvedValue(storage);

      const report = await ports.controller.check(ports.reply);

      expect(report).toEqual({
        status: health,
        uptimeSeconds: 13,
        checks: {
          database,
          redis,
          storage,
          heapUsedPct: 0.2,
          memoryUsedPct: 0.4,
          rssBytes: 777,
        },
        version: '0.1.0-test',
        timestamp: NOW.toISOString(),
      });
      expect(ports.status).toHaveBeenCalledExactlyOnceWith(http);
      expectSqlProbe(ports.query);
      expect(ports.ping).toHaveBeenCalledExactlyOnceWith();
      expect(ports.probeWrite).toHaveBeenCalledExactlyOnceWith();
      expect(memory.memoryStats).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    { port: 'ping' as const, check: 'redis', health: 'degraded' },
    { port: 'probeWrite' as const, check: 'storage', health: 'ok' },
  ])(
    'converte rejeição de $check em false e mantém $health/200',
    async ({ port, check, health }) => {
      const ports = setup();
      ports[port].mockRejectedValue(new Error('Probe indisponível'));

      const report = await ports.controller.check(ports.reply);

      expect(report.checks[check as 'redis' | 'storage']).toBe(false);
      expect(report.status).toBe(health);
      expect(ports.status).toHaveBeenCalledExactlyOnceWith(200);
    },
  );

  it('considera DB saudável quando SELECT 1 resolve, sem depender das linhas retornadas', async () => {
    const ports = setup();
    ports.query.mockResolvedValue([]);

    const report = await ports.controller.check(ports.reply);

    expect(report.checks.database).toBe(true);
    expect(report.status).toBe('ok');
    expect(ports.status).toHaveBeenCalledExactlyOnceWith(200);
    expectSqlProbe(ports.query);
  });

  it('inicia os três probes juntos e limita DB/Redis a 3000ms e storage a 5000ms', async () => {
    const ports = setup();
    ports.query.mockReturnValue(deferred<unknown[]>().promise);
    ports.ping.mockReturnValue(deferred<boolean>().promise);
    ports.probeWrite.mockReturnValue(deferred<boolean>().promise);
    const complete = vi.fn();

    const response = ports.controller.check(ports.reply);
    void response.then(complete);

    expectSqlProbe(ports.query);
    expect(ports.ping).toHaveBeenCalledTimes(1);
    expect(ports.probeWrite).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(3);
    await vi.advanceTimersByTimeAsync(2_999);
    expect(complete).not.toHaveBeenCalled();
    expect(ports.status).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(complete).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(complete).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(complete).toHaveBeenCalledTimes(1);

    const report = await response;
    expect(report.checks).toMatchObject({
      database: false,
      redis: false,
      storage: false,
    });
    expect(report.status).toBe('unhealthy');
    expect(report.timestamp).toBe(
      new Date(NOW.getTime() + 5_000).toISOString(),
    );
    expect(ports.status).toHaveBeenCalledExactlyOnceWith(503);
  });

  it.each([
    { port: 'query' as const, check: 'database' as const },
    { port: 'ping' as const, check: 'redis' as const },
  ])(
    'um $check pendurado responde degraded/200 exatamente em 3000ms',
    async ({ port, check }) => {
      const ports = setup();
      if (port === 'query')
        ports.query.mockReturnValue(deferred<unknown[]>().promise);
      else ports.ping.mockReturnValue(deferred<boolean>().promise);
      const complete = vi.fn();
      const response = ports.controller.check(ports.reply);
      void response.then(complete);

      await vi.advanceTimersByTimeAsync(2_999);
      expect(complete).not.toHaveBeenCalled();
      expect(ports.status).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(complete).toHaveBeenCalledTimes(1);

      const report = await response;
      expect(report.checks[check]).toBe(false);
      expect(report.checks[check === 'database' ? 'redis' : 'database']).toBe(
        true,
      );
      expect(report.checks.storage).toBe(true);
      expect(report.status).toBe('degraded');
      expect(ports.status).toHaveBeenCalledExactlyOnceWith(200);
    },
  );

  it('storage pendurado responde ok/200 com storage=false exatamente em 5000ms', async () => {
    const ports = setup();
    ports.probeWrite.mockReturnValue(deferred<boolean>().promise);
    const complete = vi.fn();
    const response = ports.controller.check(ports.reply);
    void response.then(complete);

    await vi.advanceTimersByTimeAsync(4_999);
    expect(complete).not.toHaveBeenCalled();
    expect(ports.status).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(complete).toHaveBeenCalledTimes(1);

    const report = await response;
    expect(report.checks).toMatchObject({
      database: true,
      redis: true,
      storage: false,
    });
    expect(report.status).toBe('ok');
    expect(ports.status).toHaveBeenCalledExactlyOnceWith(200);
  });

  it('aceita resoluções um ms antes dos prazos e remove cada timer antecipadamente', async () => {
    const ports = setup();
    const database = deferred<unknown[]>();
    const redis = deferred<boolean>();
    const storage = deferred<boolean>();
    ports.query.mockReturnValue(database.promise);
    ports.ping.mockReturnValue(redis.promise);
    ports.probeWrite.mockReturnValue(storage.promise);
    const complete = vi.fn();
    const response = ports.controller.check(ports.reply);
    void response.then(complete);

    await vi.advanceTimersByTimeAsync(2_999);
    database.resolve([]);
    redis.resolve(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    expect(complete).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    storage.resolve(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    const report = await response;
    expect(report.checks).toMatchObject({
      database: true,
      redis: true,
      storage: true,
    });
    expect(report.status).toBe('ok');
    expect(ports.status).toHaveBeenCalledExactlyOnceWith(200);
  });

  it('mantém falhas já vencidas mesmo quando DB/Redis resolvem enquanto storage ainda aguarda', async () => {
    const ports = setup();
    const database = deferred<unknown[]>();
    const redis = deferred<boolean>();
    const storage = deferred<boolean>();
    ports.query.mockReturnValue(database.promise);
    ports.ping.mockReturnValue(redis.promise);
    ports.probeWrite.mockReturnValue(storage.promise);
    const response = ports.controller.check(ports.reply);

    await vi.advanceTimersByTimeAsync(3_001);
    expect(vi.getTimerCount()).toBe(1);
    database.resolve([]);
    redis.resolve(true);
    storage.resolve(true);
    await vi.advanceTimersByTimeAsync(0);

    const report = await response;
    expect(report.checks).toMatchObject({
      database: false,
      redis: false,
      storage: true,
    });
    expect(report.status).toBe('unhealthy');
    expect(ports.status).toHaveBeenCalledExactlyOnceWith(503);
    expect(vi.getTimerCount()).toBe(0);
  });
});
