import { Agent } from 'node:http';
import { Boom } from '@hapi/boom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProxyUnavailableError } from '../../../proxies/application/proxy-unavailable.error';
import { LeaseLostError } from '../../application/session-lease.error';
import { BaileysEngine, type BaileysEngineDeps } from './baileys.engine';

const mocks = vi.hoisted(() => ({
  makeSocket: vi.fn(),
  auth: vi.fn(),
  version: vi.fn(),
}));

vi.mock('@whiskeysockets/baileys', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@whiskeysockets/baileys')>()),
  default: mocks.makeSocket,
  fetchLatestBaileysVersion: mocks.version,
  makeCacheableSignalKeyStore: vi.fn((keys: unknown) => keys),
}));
vi.mock('./postgres-auth-state', () => ({
  usePostgresAuthState: mocks.auth,
}));

type StatusEvent = { status: string; error?: string };
const engines: BaileysEngine[] = [];

function harness(extra: Partial<BaileysEngineDeps> = {}) {
  const events: StatusEvent[] = [];
  const engine = new BaileysEngine({
    sessionId: 'e15-proxy',
    deviceName: 'test',
    prisma: {} as never,
    lease: {} as never,
    authEpoch: 1n,
    logger: {
      info() {},
      warn() {},
      error() {},
      debug() {},
      trace() {},
    } as never,
    baileysProtocolCanarySessionId: 'e15-proxy',
    baileysProtocolVersion: '2.3000.999',
    requireProxy: false,
    onEvent: (name, payload) => {
      if (name === 'session.status') events.push(payload as StatusEvent);
    },
    ...extra,
  });
  engines.push(engine);
  const close = (message: string, code = 408) =>
    (
      engine as unknown as {
        onConnectionUpdate: (update: unknown) => Promise<void>;
      }
    ).onConnectionUpdate({
      connection: 'close',
      lastDisconnect: { error: new Boom(message, { statusCode: code }) },
    });
  return { engine, events, close };
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.makeSocket.mockReset().mockImplementation(() => ({
    end: vi.fn(),
    ev: { on: vi.fn(), removeAllListeners: vi.fn() },
  }));
  mocks.auth.mockReset().mockResolvedValue({
    state: { creds: {}, keys: {} },
    saveCreds: vi.fn(async () => undefined),
  });
  mocks.version.mockReset();
});

afterEach(async () => {
  for (const engine of engines.splice(0)) await engine.shutdown();
  vi.useRealTimers();
});

describe('Baileys — proxy obrigatório pela atribuição (E15/P-058)', () => {
  it('SINGLE inválido fica FAILED antes de consultar versão/criar socket, mesmo sem guard global', async () => {
    const { engine, events } = harness({
      baileysProtocolCanarySessionId: undefined,
      resolveBaileysTransport: vi.fn(async () => {
        throw new ProxyUnavailableError('SINGLE sem proxy elegível');
      }),
    });
    await engine.start();
    expect(events).toEqual([
      { status: 'FAILED', error: 'SINGLE sem proxy elegível' },
    ]);
    expect(mocks.version).not.toHaveBeenCalled();
    expect(mocks.makeSocket).not.toHaveBeenCalled();
  });

  it.each([new Error('banco indisponível'), new LeaseLostError()])(
    'preserva o erro de infra/lease para o dono tratar: %s',
    async (error) => {
      const { engine, events } = harness({
        resolveBaileysTransport: vi.fn(async () => {
          throw error;
        }),
      });
      await expect(engine.start()).rejects.toBe(error);
      expect(events).toEqual([]);
      expect(mocks.makeSocket).not.toHaveBeenCalled();
    },
  );

  it('pool esgotado na reconexão não cria outro socket nem cai para saída direta', async () => {
    const resolveBaileysTransport = vi
      .fn<NonNullable<BaileysEngineDeps['resolveBaileysTransport']>>()
      .mockResolvedValueOnce({
        proxyId: 'proxy-original',
        agent: new Agent(),
        createMediaDispatcher: null,
      })
      .mockRejectedValue(new ProxyUnavailableError('RANGE sem candidato'));
    const reportProxyFailure = vi.fn(async () => ({
      mode: 'RANGE',
      marked: true,
    }));
    const { engine, events, close } = harness({
      resolveBaileysTransport,
      reportProxyFailure,
    });
    await engine.start();
    await close('Unexpected server response: 407');
    expect(reportProxyFailure).toHaveBeenCalledWith(
      'baileys close: Unexpected server response: 407',
      'proxy-original',
    );
    await vi.advanceTimersByTimeAsync(3_000);
    expect(engine.getStatus()).toBe('FAILED');
    expect(events.at(-1)?.error).toBe('RANGE sem candidato');
    expect(mocks.makeSocket).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(resolveBaileysTransport).toHaveBeenCalledTimes(2);
  });

  it('falha de proxy no retry quieto 440 não publica FAILED de uma réplica substituída', async () => {
    const resolveBaileysTransport = vi
      .fn<NonNullable<BaileysEngineDeps['resolveBaileysTransport']>>()
      .mockResolvedValueOnce({
        proxyId: 'proxy-original',
        agent: new Agent(),
        createMediaDispatcher: null,
      })
      .mockRejectedValue(
        new ProxyUnavailableError('SINGLE sem proxy elegível'),
      );
    const { engine, events, close } = harness({ resolveBaileysTransport });
    await engine.start();
    await close('connectionReplaced', 440);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(engine.getStatus()).toBe('DEGRADED');
    expect(events.some((event) => event.status === 'FAILED')).toBe(false);
    expect(mocks.makeSocket).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(resolveBaileysTransport).toHaveBeenCalledTimes(2);
  });

  it.each([
    'connect ETIMEDOUT',
    'proxy stream closed',
    'getaddrinfo ENOTFOUND',
  ])('não condena o proxy por %s', async (message) => {
    const reportProxyFailure = vi.fn();
    const { engine, close } = harness({
      resolveBaileysTransport: async () => ({
        proxyId: 'proxy-original',
        agent: new Agent(),
        createMediaDispatcher: null,
      }),
      reportProxyFailure,
    });
    await engine.start();
    await close(message);
    expect(reportProxyFailure).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'NONE respeita WA_REQUIRE_PROXY=%s',
    async (requireProxy) => {
      const { engine } = harness({
        requireProxy,
        resolveBaileysTransport: async () => ({
          agent: null,
          createMediaDispatcher: null,
        }),
      });
      await engine.start();
      expect(engine.getStatus()).toBe(requireProxy ? 'FAILED' : 'STARTING');
      expect(mocks.makeSocket).toHaveBeenCalledTimes(requireProxy ? 0 : 1);
      if (!requireProxy)
        expect(mocks.makeSocket.mock.calls[0][0].agent).toBeUndefined();
    },
  );
});
