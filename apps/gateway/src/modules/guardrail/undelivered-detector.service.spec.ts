import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UndeliveredDetectorService } from './undelivered-detector.service';

const candidate = {
  sessionId: 'S1',
  name: 'teste-wwebjs',
  stuckMsgs: 5,
  stuckChats: 3,
};

function makeService(
  rows: unknown[] = [candidate],
  error?: Error,
  sweepMin = 0,
) {
  const prisma = {
    $queryRaw: vi.fn(async () => {
      if (error) throw error;
      return rows;
    }),
  };
  const values: Record<string, number> = {
    UNDELIVERED_SWEEP_MIN: sweepMin,
    UNDELIVERED_STUCK_MIN: 15,
    UNDELIVERED_MIN_MSGS: 5,
    UNDELIVERED_MIN_CHATS: 3,
  };
  const config = { get: (key: string) => values[key] };
  return {
    service: new UndeliveredDetectorService(prisma as never, config as never),
    prisma,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('observador de não-entrega', () => {
  it('desligado não agenda consultas no boot', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { service, prisma } = makeService();
    const schedule = vi.spyOn(globalThis, 'setTimeout');
    service.onApplicationBootstrap();
    expect(schedule).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('opt-in agenda sem sobrepor ciclos e cancela no shutdown', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.useFakeTimers();
    const { service, prisma } = makeService([], undefined, 1);
    service.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(3 * 60_000);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    service.onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('registra candidatos sem aplicar sinal ou mutar estado', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { service, prisma } = makeService();

    expect(await service.sweep()).toEqual([candidate]);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('indício inconclusivo'),
    );
  });

  it('erro na consulta não derruba o job', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { service } = makeService([], new Error('banco indisponível'));
    expect(await service.sweep()).toEqual([]);
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('banco indisponível'),
    );
  });
});
