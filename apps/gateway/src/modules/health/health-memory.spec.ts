import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../infra/prisma/prisma.service';
import type { RedisService } from '../../infra/redis/redis.service';
import type { MediaStorage } from '../../infra/storage/media-storage.service';
import { HealthService } from './health.service';

const runtime = vi.hoisted(() => ({
  readFileSync: vi.fn<(path: unknown, encoding: unknown) => string>(() => {
    throw new Error('Leitura sem fixture: não acessar arquivos do host');
  }),
  constrainedMemory: vi.fn(() => 1_000),
  memoryUsage: vi.fn(() => ({
    rss: 777,
    heapTotal: 205,
    heapUsed: 200,
    external: 10,
    arrayBuffers: 5,
  })),
  getHeapStatistics: vi.fn(() => ({
    used_heap_size: 200,
    heap_size_limit: 1_000,
  })),
}));

// memoryStats é real; só as fontes do processo/cgroup recebem fixtures isoladas.
vi.mock('node:fs', async () => ({
  ...(await vi.importActual<typeof import('node:fs')>('node:fs')),
  readFileSync: runtime.readFileSync,
}));
vi.mock('node:process', async () => ({
  ...(await vi.importActual<typeof import('node:process')>('node:process')),
  constrainedMemory: runtime.constrainedMemory,
  memoryUsage: runtime.memoryUsage,
}));
vi.mock('node:v8', async () => ({
  ...(await vi.importActual<typeof import('node:v8')>('node:v8')),
  getHeapStatistics: runtime.getHeapStatistics,
}));

function cgroup(current: string | Error, stat: string | Error) {
  const files = new Map<string, string | Error>([
    ['/sys/fs/cgroup/memory.current', current],
    ['/sys/fs/cgroup/memory.stat', stat],
  ]);
  runtime.readFileSync.mockImplementation((path, encoding) => {
    if (encoding !== 'utf8' || typeof path !== 'string' || !files.has(path)) {
      throw new Error(`Leitura sem fixture: ${String(path)}`);
    }
    const value = files.get(path)!;
    if (value instanceof Error) throw value;
    return value;
  });
}

function service() {
  return new HealthService(
    {
      $queryRaw: vi.fn(async () => [{ '?column?': 1 }]),
    } as unknown as PrismaService,
    { ping: vi.fn(async () => true) } as unknown as RedisService,
    { probeWrite: vi.fn(async () => true) } as unknown as MediaStorage,
  );
}

describe('HealthService — pressão cgroup com memoryStats real', () => {
  beforeEach(() => {
    runtime.readFileSync.mockReset();
    runtime.constrainedMemory.mockReset().mockReturnValue(1_000);
    runtime.memoryUsage.mockReset().mockReturnValue({
      rss: 777,
      heapTotal: 205,
      heapUsed: 200,
      external: 10,
      arrayBuffers: 5,
    });
    runtime.getHeapStatistics.mockReset().mockReturnValue({
      used_heap_size: 200,
      heap_size_limit: 1_000,
    });
    cgroup('1000', 'anon 100\ninactive_file 800\n');
  });

  it('mantém saúde pelo working set do container mesmo com heap acima de 90%', async () => {
    runtime.getHeapStatistics.mockReturnValue({
      used_heap_size: 970,
      heap_size_limit: 1_000,
    });
    cgroup('1000\n', 'inactive_file 300\n');

    const report = await service().check();

    expect(report.status).toBe('ok');
    expect(report.checks).toMatchObject({
      heapUsedPct: 0.97,
      memoryUsedPct: 0.7,
      rssBytes: 777,
    });
  });

  it('degrada pelo container mesmo com heap abaixo de 90%', async () => {
    cgroup('1000\n', 'inactive_file 50\n');

    const report = await service().check();

    expect(report.status).toBe('degraded');
    expect(report.checks).toMatchObject({
      heapUsedPct: 0.2,
      memoryUsedPct: 0.95,
    });
  });

  it.each([
    { used: 890, ratio: 0.89, status: 'ok' },
    { used: 900, ratio: 0.9, status: 'degraded' },
    { used: 896, ratio: 0.9, status: 'degraded' },
  ])(
    'decide pelo ratio arredondado: working set $used → $ratio → $status',
    async ({ used, ratio, status }) => {
      cgroup(String(used), 'inactive_file 0\n');

      const report = await service().check();

      expect(report.status).toBe(status);
      expect(report.checks.memoryUsedPct).toBe(ratio);
    },
  );

  it.each([
    {
      reason: 'memory.current indisponível',
      current: new Error('ENOENT sintético'),
      stat: 'inactive_file 800\n',
    },
    {
      reason: 'memory.current não numérico',
      current: 'inválido',
      stat: 'inactive_file 800\n',
    },
    {
      reason: 'memory.current zero',
      current: '0',
      stat: 'inactive_file 800\n',
    },
    {
      reason: 'memory.stat indisponível',
      current: '1000',
      stat: new Error('EACCES sintético'),
    },
  ])('usa pressão heap quando $reason', async ({ current, stat }) => {
    runtime.getHeapStatistics.mockReturnValue({
      used_heap_size: 930,
      heap_size_limit: 1_000,
    });
    cgroup(current, stat);

    const report = await service().check();

    expect(report.status).toBe('degraded');
    expect(report.checks).toMatchObject({
      heapUsedPct: 0.93,
      memoryUsedPct: 0.93,
    });
  });

  it('mantém pressão current quando stat não fornece desconto reconhecido', async () => {
    cgroup('950', 'active_file 940\ninactive_file inválido\n');

    const report = await service().check();

    expect(report.status).toBe('degraded');
    expect(report.checks.memoryUsedPct).toBe(0.95);
    expect(report.checks.heapUsedPct).toBe(0.2);
  });

  it('sem limite de container compara heap ao teto V8, sem usar heapTotal ou ler arquivos', async () => {
    runtime.constrainedMemory.mockReturnValue(0);

    const report = await service().check();

    expect(report.status).toBe('ok');
    expect(report.checks).toMatchObject({
      heapUsedPct: 0.2,
      memoryUsedPct: 0.2,
      rssBytes: 777,
    });
    expect(runtime.readFileSync).not.toHaveBeenCalled();
  });
});
