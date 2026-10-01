import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshTokenPurgeService } from './refresh-token-purge.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-30T15:00:00.000Z');

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function setup() {
  const tokens = {
    purgeExpired: vi
      .fn<(cutoff: Date, limit: number) => Promise<number>>()
      .mockResolvedValue(0),
  };
  return {
    tokens,
    service: new RefreshTokenPurgeService(tokens as never),
  };
}

describe('RefreshTokenPurgeService — P-005', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('RETENTION_SWEEP_HOURS', undefined);
    vi.stubEnv('RETENTION_REFRESH_TOKENS_GRACE_DAYS', undefined);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('não agenda timers nos testes; sweep explícito continua disponível', async () => {
    const { service, tokens } = setup();
    service.onApplicationBootstrap();

    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(24 * 60 * 60_000);
    expect(tokens.purgeExpired).not.toHaveBeenCalled();

    await service.sweep();
    expect(tokens.purgeExpired).toHaveBeenCalledOnce();
  });

  it('agenda a primeira varredura após 2 min e as seguintes a cada 6 h', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { service, tokens } = setup();
    service.onApplicationBootstrap();

    expect(vi.getTimerCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(2 * 60_000 - 1);
    expect(tokens.purgeExpired).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(tokens.purgeExpired).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(6 * 60 * 60_000 - 2 * 60_000 - 1);
    expect(tokens.purgeExpired).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(tokens.purgeExpired).toHaveBeenCalledTimes(2);
    await service.onModuleDestroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['0', '-1', 'inválido', 'Infinity', '1000000'])(
    'não agenda intervalo desabilitado ou inválido: %s',
    (hours) => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('RETENTION_SWEEP_HOURS', hours);
      const { service, tokens } = setup();
      service.onApplicationBootstrap();

      expect(vi.getTimerCount()).toBe(0);
      expect(tokens.purgeExpired).not.toHaveBeenCalled();
    },
  );

  it('usa carência padrão de 7 dias e lote de 500', async () => {
    const { service, tokens } = setup();
    await service.sweep();

    expect(tokens.purgeExpired).toHaveBeenCalledExactlyOnceWith(
      new Date(NOW.getTime() - 7 * DAY_MS),
      500,
    );
  });

  it('usa carência configurada e mantém o mesmo cutoff durante todos os lotes', async () => {
    vi.stubEnv('RETENTION_REFRESH_TOKENS_GRACE_DAYS', '2.5');
    const { service, tokens } = setup();
    tokens.purgeExpired.mockImplementationOnce(async () => {
      vi.setSystemTime(NOW.getTime() + DAY_MS);
      return 500;
    });
    await service.sweep();

    expect(tokens.purgeExpired).toHaveBeenCalledTimes(2);
    for (const [cutoff, limit] of tokens.purgeExpired.mock.calls) {
      expect(cutoff).toEqual(new Date(NOW.getTime() - 2.5 * DAY_MS));
      expect(limit).toBe(500);
    }
  });

  it.each(['0', '-1', 'inválido', 'Infinity', '1e300'])(
    'não acessa o repositório com carência desabilitada ou inválida: %s',
    async (days) => {
      vi.stubEnv('RETENTION_REFRESH_TOKENS_GRACE_DAYS', days);
      const { service, tokens } = setup();
      await service.sweep();

      expect(tokens.purgeExpired).not.toHaveBeenCalled();
    },
  );

  it('limita cada varredura a 20 lotes completos (10 mil linhas)', async () => {
    const { service, tokens } = setup();
    tokens.purgeExpired.mockResolvedValue(500);
    await service.sweep();

    expect(tokens.purgeExpired).toHaveBeenCalledTimes(20);
    expect(Logger.prototype.log).toHaveBeenCalledExactlyOnceWith(
      'retenção: 10000 refresh tokens removidos',
    );
  });

  it('encerra no lote parcial e registra somente o total removido', async () => {
    const { service, tokens } = setup();
    tokens.purgeExpired.mockResolvedValueOnce(500).mockResolvedValueOnce(17);
    await service.sweep();

    expect(tokens.purgeExpired).toHaveBeenCalledTimes(2);
    expect(Logger.prototype.log).toHaveBeenCalledExactlyOnceWith(
      'retenção: 517 refresh tokens removidos',
    );
  });

  it('encerra no lote vazio sem registrar remoções', async () => {
    const { service, tokens } = setup();
    await service.sweep();

    expect(tokens.purgeExpired).toHaveBeenCalledOnce();
    expect(Logger.prototype.log).not.toHaveBeenCalled();
  });

  it('chamadas simultâneas compartilham uma execução e liberam a próxima varredura', async () => {
    const { service, tokens } = setup();
    const gate = deferred<number>();
    tokens.purgeExpired.mockReturnValueOnce(gate.promise);

    const first = service.sweep();
    const second = service.sweep();
    expect(second).toBe(first);
    expect(tokens.purgeExpired).toHaveBeenCalledOnce();

    gate.resolve(0);
    await Promise.all([first, second]);
    await service.sweep();
    expect(tokens.purgeExpired).toHaveBeenCalledTimes(2);
  });

  it('destroy cancela timers pendentes e impede varreduras posteriores', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { service, tokens } = setup();
    service.onApplicationBootstrap();
    expect(vi.getTimerCount()).toBe(2);

    await service.onModuleDestroy();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(24 * 60 * 60_000);
    await service.sweep();
    expect(tokens.purgeExpired).not.toHaveBeenCalled();
  });

  it('destroy aguarda o lote em curso e impede o próximo, mesmo com lote completo', async () => {
    const { service, tokens } = setup();
    const gate = deferred<number>();
    tokens.purgeExpired.mockReturnValueOnce(gate.promise);
    const running = service.sweep();
    let destroyed = false;
    const closing = service.onModuleDestroy().then(() => {
      destroyed = true;
    });

    await Promise.resolve();
    expect(destroyed).toBe(false);
    expect(tokens.purgeExpired).toHaveBeenCalledOnce();
    gate.resolve(500);
    await Promise.all([running, closing]);

    expect(destroyed).toBe(true);
    expect(tokens.purgeExpired).toHaveBeenCalledOnce();
    await service.sweep();
    expect(tokens.purgeExpired).toHaveBeenCalledOnce();
  });

  it('registra erro sem rejeitar a execução e recupera na próxima varredura', async () => {
    const { service, tokens } = setup();
    tokens.purgeExpired
      .mockRejectedValueOnce(new Error('banco indisponível'))
      .mockResolvedValueOnce(3);

    await expect(service.sweep()).resolves.toBeUndefined();
    expect(Logger.prototype.error).toHaveBeenCalledExactlyOnceWith(
      'retenção (refresh_tokens): banco indisponível',
    );
    await expect(service.sweep()).resolves.toBeUndefined();

    expect(tokens.purgeExpired).toHaveBeenCalledTimes(2);
    expect(Logger.prototype.log).toHaveBeenCalledExactlyOnceWith(
      'retenção: 3 refresh tokens removidos',
    );
  });
});
