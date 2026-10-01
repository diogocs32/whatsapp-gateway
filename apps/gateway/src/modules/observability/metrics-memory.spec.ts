import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../infra/prisma/prisma.service';
import type { RedisService } from '../../infra/redis/redis.service';
import { MetricsService } from './metrics.service';

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

// Summary executa memoryStats real; nenhum client ou coletor é inicializado.
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

const COUNTERS = {
  sessions: { STOPPED: 2 },
  out: 17,
  inbound: 9,
};

function service() {
  const redis = {
    client: { get: vi.fn(async () => JSON.stringify(COUNTERS)) },
  };
  return new MetricsService(
    {} as PrismaService,
    redis as unknown as RedisService,
  );
}

describe('MetricsService.summary — memória cgroup com memoryStats real', () => {
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
    cgroup('1000', 'inactive_file 800\n');
  });

  it('expõe working set arredondado e métricas V8/RSS nas unidades originais', async () => {
    cgroup('1000\n', 'anon 200\ninactive_file 254\n');

    const summary = await service().summary();

    expect(summary).toMatchObject({
      rssBytes: 777,
      heapUsedBytes: 200,
      heapUsedPct: 0.2,
      heapLimitBytes: 1_000,
      memoryUsedPct: 0.75,
      containerLimitBytes: 1_000,
      sessions: { STOPPED: 2 },
      messages: { out: 17, in: 9 },
    });
  });

  it('prioriza pressão do container mesmo com heap acima dela', async () => {
    runtime.getHeapStatistics.mockReturnValue({
      used_heap_size: 970,
      heap_size_limit: 1_000,
    });

    const summary = await service().summary();

    expect(summary.heapUsedPct).toBe(0.97);
    expect(summary.memoryUsedPct).toBe(0.2);
  });

  it('publica consumo acima do limite sem truncar o ratio', async () => {
    cgroup('1300', 'inactive_file 50\n');

    const summary = await service().summary();

    expect(summary.heapUsedPct).toBe(0.2);
    expect(summary.memoryUsedPct).toBe(1.25);
    expect(summary.containerLimitBytes).toBe(1_000);
  });

  it.each([
    {
      reason: 'current indisponível',
      current: new Error('ENOENT sintético'),
      stat: 'inactive_file 800\n',
    },
    {
      reason: 'current inválido',
      current: 'Infinity',
      stat: 'inactive_file 800\n',
    },
    {
      reason: 'stat indisponível',
      current: '1000',
      stat: new Error('EACCES sintético'),
    },
  ])(
    'publica fallback heap e preserva limite quando $reason',
    async ({ current, stat }) => {
      cgroup(current, stat);

      const summary = await service().summary();

      expect(summary).toMatchObject({
        heapUsedBytes: 200,
        heapLimitBytes: 1_000,
        heapUsedPct: 0.2,
        memoryUsedPct: 0.2,
        containerLimitBytes: 1_000,
      });
    },
  );

  it('stat sem inactive_file reconhecido mantém consumo current no summary', async () => {
    cgroup('950', 'active_file 940\ninactive_file -900\n');

    const summary = await service().summary();

    expect(summary.memoryUsedPct).toBe(0.95);
    expect(summary.heapUsedPct).toBe(0.2);
    expect(summary.containerLimitBytes).toBe(1_000);
  });

  it('sem limite publica null e usa teto V8 em vez de heapTotal, sem ler arquivos', async () => {
    runtime.constrainedMemory.mockReturnValue(0);

    const summary = await service().summary();

    expect(summary).toMatchObject({
      rssBytes: 777,
      heapUsedBytes: 200,
      heapLimitBytes: 1_000,
      heapUsedPct: 0.2,
      memoryUsedPct: 0.2,
      containerLimitBytes: null,
    });
    expect(runtime.readFileSync).not.toHaveBeenCalled();
  });
});
