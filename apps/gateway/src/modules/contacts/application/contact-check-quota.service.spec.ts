import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../../bootstrap/config';
import type { RedisService } from '../../../infra/redis/redis.service';
import {
  contactCheckCost,
  ContactCheckQuotaService,
} from './contact-check-quota.service';

function service(limit = 3, status = 'ready') {
  const evalCommand = vi.fn().mockResolvedValue([2, 25_000]);
  const redis = { client: { status, eval: evalCommand } };
  const config = new ConfigService({
    CONTACT_CHECK_MAX_PER_WINDOW: limit,
    CONTACT_CHECK_WINDOW_SECONDS: 60,
  }) as ConfigService<Env, true>;
  return {
    quota: new ContactCheckQuotaService(
      config,
      redis as unknown as RedisService,
    ),
    evalCommand,
  };
}

describe('ContactCheckQuotaService — observação compatível E20', () => {
  it('default desligado não depende do Redis nem conta tentativas', async () => {
    const { quota, evalCommand } = service(0, 'reconnecting');
    await quota.observe('session', ['000000001']);
    expect(await quota.snapshot('session')).toMatchObject({
      enabled: false,
      mode: 'observe',
      available: true,
      used: null,
      exceeded: null,
    });
    expect(evalCommand).not.toHaveBeenCalled();
  });

  it('cobra só números distintos normalizados dentro do lote, sem enviar PII ao Redis', async () => {
    const { quota, evalCommand } = service();
    const numbers = ['000000001', '+00 (000) 000-1', '000000002'];
    expect(contactCheckCost(numbers)).toBe(2);
    await quota.observe('session', numbers);
    expect(evalCommand).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'wa:contacts-check:quota:session',
      2,
      60_000,
    );
  });

  it('snapshot só lê e converte TTL/saldo/excesso sem consumir', async () => {
    const { quota, evalCommand } = service();
    expect(await quota.snapshot('session')).toMatchObject({
      enabled: true,
      mode: 'observe',
      available: true,
      used: 2,
      remaining: 1,
      exceeded: false,
      retryAfterSeconds: 25,
    });
    expect(evalCommand.mock.calls[0]?.[3]).toBe(0);
  });

  it('acima do limite ainda permite a consulta e não lança 429', async () => {
    const { quota, evalCommand } = service();
    evalCommand.mockResolvedValue([4, 25_001]);
    await expect(
      quota.observe('session', ['000000001']),
    ).resolves.toBeUndefined();
    expect(await quota.snapshot('session')).toMatchObject({
      used: 4,
      remaining: 0,
      exceeded: true,
      retryAfterSeconds: 26,
    });
  });

  it.each(['reconnecting', 'end'])(
    'Redis %s não impede consulta',
    async (status) => {
      const { quota, evalCommand } = service(3, status);
      await expect(
        quota.observe('session', ['000000001']),
      ).resolves.toBeUndefined();
      expect(await quota.snapshot('session')).toMatchObject({
        available: false,
        used: null,
        remaining: null,
        exceeded: null,
      });
      expect(evalCommand).not.toHaveBeenCalled();
    },
  );

  it('erro de EVAL não interrompe a consulta', async () => {
    const { quota, evalCommand } = service();
    evalCommand.mockRejectedValue(new Error('Redis sintético indisponível'));
    await expect(
      quota.observe('session', ['000000001']),
    ).resolves.toBeUndefined();
    expect((await quota.snapshot('session')).available).toBe(false);
  });

  it('resposta Redis inválida publica indisponível, nunca números fabricados', async () => {
    const { quota, evalCommand } = service();
    evalCommand.mockResolvedValue(['bad', 0]);
    expect((await quota.snapshot('session')).available).toBe(false);
  });

  it('EVAL pendente tem teto local sem close/retry e sem bloquear a consulta', async () => {
    vi.useFakeTimers();
    try {
      const { quota, evalCommand } = service();
      evalCommand.mockReturnValue(new Promise(() => undefined));
      const pending = quota.snapshot('session');
      await vi.advanceTimersByTimeAsync(2_000);
      expect((await pending).available).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
