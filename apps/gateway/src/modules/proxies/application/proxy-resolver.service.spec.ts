import { describe, expect, it, vi } from 'vitest';
import type { Proxy, ProxyAssignment } from '../domain/proxy.entity';
import type { ProxyMode, ProxyStrategy } from '../domain/proxy-types';
import { ProxyResolver } from './proxy-resolver.service';
import { ProxyUnavailableError } from './proxy-unavailable.error';

const proxy = (id: string, patch: Partial<Proxy> = {}): Proxy => ({
  id,
  position: 1,
  label: null,
  protocol: 'HTTP',
  host: 'proxy.invalid',
  port: 8080,
  username: null,
  password: null,
  source: 'MANUAL',
  country: null,
  exitIp: null,
  latencyMs: null,
  status: 'ALIVE',
  enabled: true,
  ...patch,
});

function setup(
  mode: ProxyMode = 'RANGE',
  strategy: ProxyStrategy = 'ROUND_ROBIN',
) {
  let assignment: ProxyAssignment | null = {
    sessionId: 'session',
    mode,
    strategy,
    rangeStart: 1,
    rangeEnd: 10,
    currentProxyId: 'p1',
  };
  let pool = [proxy('p1'), proxy('p2', { position: 2, latencyMs: 1 })];
  const repo = {
    getAssignment: vi.fn(async () => assignment && { ...assignment }),
    findById: vi.fn(
      async (id: string) => pool.find((p) => p.id === id) ?? null,
    ),
    listInRange: vi.fn(async (start: number, end: number) =>
      pool.filter((p) => p.position >= start && p.position <= end),
    ),
    listEnabledAlive: vi.fn(async () => pool),
    setCurrentIfUnchanged: vi.fn(
      async (_expected: ProxyAssignment, id: string) => {
        if (assignment) assignment.currentProxyId = id;
        return true;
      },
    ),
    updateTest: vi.fn(async () => undefined),
  };
  const incr = vi.fn(async () => 1);
  const resolver = new ProxyResolver(
    repo as never,
    { client: { incr } } as never,
  );
  return {
    resolver,
    repo,
    incr,
    pool,
    assign: (value: Partial<ProxyAssignment> | null) => {
      assignment = value === null ? null : { ...assignment!, ...value };
    },
    setPool: (value: Proxy[]) => {
      pool = value;
    },
  };
}

describe('ProxyResolver — afinidade e saída fechada (E15)', () => {
  for (const mode of ['RANGE', 'GLOBAL_ROUND_ROBIN'] as const) {
    it.each(['STICKY', 'ROUND_ROBIN', 'RANDOM', 'LEAST_LATENCY'] as const)(
      `${mode}/%s mantém proxy salvo mesmo com expansão/reordenação do pool`,
      async (strategy) => {
        const s = setup(mode, strategy);
        s.setPool([proxy('new', { position: 3 }), ...s.pool.toReversed()]);
        expect((await s.resolver.resolve('session'))?.id).toBe('p1');
        expect((await s.resolver.resolve('session'))?.id).toBe('p1');
        expect(s.incr).not.toHaveBeenCalled();
        expect(s.repo.setCurrentIfUnchanged).not.toHaveBeenCalled();
      },
    );
    it.each(['DEAD', 'DISABLED', 'REMOVED'] as const)(
      `${mode} substitui pin %s e persiste a escolha`,
      async (reason) => {
        const s = setup(mode);
        s.setPool(
          reason === 'REMOVED'
            ? [s.pool[1]]
            : [
                proxy(
                  'p1',
                  reason === 'DEAD' ? { status: 'DEAD' } : { enabled: false },
                ),
                s.pool[1],
              ],
        );
        expect((await s.resolver.resolve('session'))?.id).toBe('p2');
        expect((await s.resolver.resolve('session'))?.id).toBe('p2');
        expect(s.incr).toHaveBeenCalledOnce();
      },
    );
    it(`${mode} vazio falha nos três adaptadores; nunca produz saída direta`, async () => {
      const s = setup(mode);
      s.setPool([]);
      await expect(s.resolver.resolveAgent('session')).rejects.toBeInstanceOf(
        ProxyUnavailableError,
      );
      await expect(
        s.resolver.resolveBaileysTransport('session'),
      ).rejects.toBeInstanceOf(ProxyUnavailableError);
      await expect(
        s.resolver.resolveProxyConfig('session'),
      ).rejects.toBeInstanceOf(ProxyUnavailableError);
    });
  }

  it.each(['MISSING_ID', 'REMOVED', 'DEAD', 'DISABLED'] as const)(
    'SINGLE %s falha explicitamente',
    async (reason) => {
      const s = setup('SINGLE');
      if (reason === 'MISSING_ID') s.assign({ currentProxyId: null });
      if (reason === 'REMOVED') s.setPool([]);
      if (reason === 'DEAD') s.pool[0].status = 'DEAD';
      if (reason === 'DISABLED') s.pool[0].enabled = false;
      await expect(s.resolver.resolve('session')).rejects.toBeInstanceOf(
        ProxyUnavailableError,
      );
      expect(s.incr).not.toHaveBeenCalled();
    },
  );
  it('UNTESTED continua elegível no SINGLE', async () => {
    const s = setup('SINGLE');
    s.pool[0].status = 'UNTESTED';
    expect((await s.resolver.resolve('session'))?.id).toBe('p1');
  });
  it('RANGE exclui o pin que saiu da faixa', async () => {
    const s = setup();
    s.assign({ rangeStart: 2 });
    expect((await s.resolver.resolve('session'))?.id).toBe('p2');
  });
  it.each([{ rangeEnd: null }, { rangeStart: 20 }, { rangeStart: 0 }])(
    'RANGE malformado %j falha',
    async (value) => {
      const s = setup();
      s.assign(value);
      await expect(s.resolver.resolve('session')).rejects.toThrow(
        'Faixa de proxies inválida',
      );
    },
  );
  it.each([true, false])(
    'NONE explícito=%s é o único retorno direto',
    async (explicit) => {
      const s = setup('NONE');
      if (!explicit) s.assign(null);
      await expect(
        s.resolver.resolveProxyConfig('session'),
      ).resolves.toBeNull();
      await expect(
        s.resolver.resolveBaileysTransport('session'),
      ).resolves.toMatchObject({ agent: null, createMediaDispatcher: null });
    },
  );
  it('falha do Redis não vira conexão direta', async () => {
    const s = setup();
    s.assign({ currentProxyId: null });
    s.incr.mockRejectedValueOnce(new Error('Redis indisponível'));
    await expect(s.resolver.resolve('session')).rejects.toThrow(
      'Redis indisponível',
    );
    expect(s.repo.setCurrentIfUnchanged).not.toHaveBeenCalled();
  });
  it('PUT concorrente vence a seleção antiga', async () => {
    const s = setup();
    s.assign({ currentProxyId: null });
    s.repo.setCurrentIfUnchanged.mockImplementationOnce(async () => {
      s.assign({ mode: 'SINGLE', currentProxyId: 'p2' });
      return false;
    });
    expect((await s.resolver.resolve('session'))?.id).toBe('p2');
    expect(s.repo.setCurrentIfUnchanged).toHaveBeenCalledOnce();
  });
  it('conflitos repetidos param com erro e limite de tentativas', async () => {
    const s = setup();
    s.assign({ currentProxyId: null });
    s.repo.setCurrentIfUnchanged.mockResolvedValue(false);
    await expect(s.resolver.resolve('session')).rejects.toThrow(
      'Atribuição de proxy mudou',
    );
    expect(s.incr).toHaveBeenCalledTimes(3);
  });
  it('falha reportada usa identidade capturada, nunca o pin novo do PUT', async () => {
    const s = setup('SINGLE');
    await expect(
      s.resolver.reportFailure('session', 'CONNECT recusado', 'old'),
    ).resolves.toEqual({ mode: 'SINGLE', marked: false });
    await s.resolver.reportFailure('session', 'sem identidade');
    expect(s.repo.updateTest).not.toHaveBeenCalled();
    await s.resolver.reportFailure('session', 'CONNECT recusado', 'p1');
    expect(s.repo.updateTest).toHaveBeenCalledExactlyOnceWith(
      'p1',
      {
        status: 'DEAD',
        latencyMs: null,
        exitIp: null,
      },
      undefined,
    );
  });
});
