import { Boom } from '@hapi/boom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { disconnectTotals } from '../../../../shared-kernel/disconnect-stats';
import { BaileysEngine } from './baileys.engine';
import { classifyDisconnect, disconnectDetails } from './disconnect-policy';

const versionMocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  makeSocket: vi.fn(),
  auth: vi.fn(),
}));

vi.mock('@whiskeysockets/baileys', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@whiskeysockets/baileys')>();
  return {
    ...original,
    default: versionMocks.makeSocket,
    fetchLatestBaileysVersion: versionMocks.fetch,
    makeCacheableSignalKeyStore: vi.fn((keys: unknown) => keys),
  };
});

vi.mock('./postgres-auth-state', () => ({
  usePostgresAuthState: versionMocks.auth,
}));

type Event = { name: string; payload: Record<string, unknown> };
type Restriction = {
  signal: string;
  until?: Date;
  source?: string;
};
type EngineInternals = {
  sock: unknown;
  status: string;
  qrBase64: string | null;
  stopped: boolean;
  reconnectAttempts: number;
  connectGeneration: number;
  connect: () => Promise<void>;
  clearCredentials: () => Promise<void>;
  onConnectionUpdate: (
    update: Record<string, unknown>,
    eventSock?: unknown,
  ) => Promise<void>;
};

function harness() {
  const events: Event[] = [];
  const restrictions: Restriction[] = [];
  const warn = vi.fn();
  const onDisconnect = vi.fn(async (): Promise<void> => undefined);
  const engine = new BaileysEngine({
    sessionId: 'e9-disconnect',
    deviceName: 'test',
    prisma: {} as never,
    lease: {} as never,
    authEpoch: 1n,
    logger: { info() {}, warn, error() {}, debug() {}, trace() {} } as never,
    onEvent: (name: string, payload: unknown) =>
      events.push({ name, payload: payload as Record<string, unknown> }),
    onRestrictionSignal: async (signal: Restriction) => {
      restrictions.push(signal);
    },
    onDisconnect,
  } as never);
  const internals = engine as unknown as EngineInternals;
  const end = vi.fn();
  const removeAllListeners = vi.fn();
  internals.sock = {
    end,
    ev: { removeAllListeners },
    fetchAccountReachoutTimelock: vi.fn(async () => ({ isActive: false })),
  };
  const connect = vi.fn(async () => undefined);
  const clearCredentials = vi.fn(async () => undefined);
  internals.connect = connect;
  internals.clearCredentials = clearCredentials;
  const close = (code: number, reason = `reason-${code}`) =>
    internals.onConnectionUpdate({
      connection: 'close',
      lastDisconnect: { error: new Boom(reason, { statusCode: code }) },
    });
  return {
    engine,
    internals,
    events,
    restrictions,
    warn,
    onDisconnect,
    end,
    removeAllListeners,
    connect,
    clearCredentials,
    close,
  };
}

const QR_EXHAUSTED_REASON = 'QR refs attempts ended';

function freshQrHarness() {
  const h = harness();
  const creds: Record<string, unknown> = { registered: false };
  const keys = { initial: 'auth-preservada' };
  const sock = h.internals.sock as {
    authState?: { creds: Record<string, unknown>; keys: unknown };
    user?: unknown;
  };
  sock.authState = { creds, keys };
  h.internals.status = 'SCAN_QR_CODE';
  h.internals.qrBase64 = 'data:image/png;base64,qr-inicial';
  return { ...h, sock, creds, keys };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('matriz pura DisconnectReason da rc14', () => {
  it.each([
    [401, 'logged_out'],
    [403, 'terminal'],
    [405, 'client_too_old'],
    [408, 'retry'],
    [411, 'terminal'],
    [428, 'retry'],
    [440, 'replaced'],
    [500, 'retry'],
    [503, 'retry'],
    [515, 'restart'],
  ] as const)('%i → %s', (code, action) => {
    expect(classifyDisconnect(code, `reason-${code}`).action).toBe(action);
  });

  it('preserva código e razão brutos sem mudar o texto estável para dedup', () => {
    const a = classifyDisconnect(500, 'stream errored (a)');
    const b = classifyDisconnect(500, 'stream errored (b)');
    expect(a.error).toBe(b.error);
    expect(
      disconnectDetails(
        new Boom('Connection Failure', {
          statusCode: 405,
          data: { reason: 'client_too_old' },
        }),
      ),
    ).toEqual({ code: 405, reason: 'client_too_old' });
  });
});

describe('Baileys — desconexão por código (E9/P-049)', () => {
  it('401 limpa credenciais, para e não reconecta', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.close(401, 'logged out');
    expect(h.clearCredentials).toHaveBeenCalledOnce();
    expect(h.end).toHaveBeenCalledOnce();
    expect(h.internals.stopped).toBe(true);
    expect(h.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'session.status',
          payload: expect.objectContaining({ status: 'STOPPED' }),
        }),
      ]),
    );
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.connect).not.toHaveBeenCalled();
  });

  it.each([403, 411])(
    '%i fica FAILED com código bruto, sem nova tentativa',
    async (code) => {
      vi.useFakeTimers();
      const h = harness();
      await h.close(code);
      const statuses = h.events.filter((e) => e.name === 'session.status');
      expect(statuses.at(-1)?.payload).toMatchObject({
        status: 'FAILED',
        lastErrorDetails: { code, reason: `reason-${code}` },
      });
      await vi.advanceTimersByTimeAsync(120_000);
      expect(h.connect).not.toHaveBeenCalled();
    },
  );

  it('405 publica alerta client_too_old e evita novas tentativas', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.close(405, 'Connection Failure');
    const alert = h.events.find((e) => e.name === 'session.client_too_old');
    expect(alert).toBeDefined();
    const statuses = h.events.filter((e) => e.name === 'session.status');
    expect(statuses.at(-1)?.payload).toMatchObject({
      status: 'FAILED',
      lastErrorDetails: { code: 405, reason: 'Connection Failure' },
    });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.connect).not.toHaveBeenCalled();
  });

  it.each([408, 428, 500, 503])(
    '%i mantém backoff e razão bruta',
    async (code) => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const h = harness();
      await h.close(code);
      expect(h.internals.reconnectAttempts).toBe(1);
      expect(h.warn).toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1_999);
      expect(h.connect).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(h.connect).toHaveBeenCalledOnce();
    },
  );

  it('515 reinicia sem gastar o orçamento de tentativas', async () => {
    vi.useFakeTimers();
    const h = harness();
    h.internals.reconnectAttempts = 4;
    await h.close(515, 'restart required');
    expect(h.internals.reconnectAttempts).toBe(4);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.connect).toHaveBeenCalledOnce();
  });

  it('515 repetido mais de três vezes corta o loop sem consumir tentativas comuns', async () => {
    vi.useFakeTimers();
    const h = harness();
    h.internals.reconnectAttempts = 2;
    for (let i = 1; i <= 3; i++) {
      await h.close(515, 'restart required');
      expect(h.internals.reconnectAttempts).toBe(2);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(h.connect).toHaveBeenCalledTimes(i);
    }
    await h.close(515, 'restart required');
    expect(h.internals.reconnectAttempts).toBe(2);
    expect(h.internals.stopped).toBe(true);
    expect(h.events.at(-1)).toMatchObject({
      name: 'session.status',
      payload: { status: 'DEGRADED', lastErrorDetails: { code: 515 } },
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.connect).toHaveBeenCalledTimes(3);
  });

  it('440 admite no máximo uma retentativa tardia e não persiste terminal', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.close(440, 'conflict');
    expect(
      h.events.some(
        (e) =>
          e.name === 'session.status' &&
          ['FAILED', 'STOPPED'].includes(String(e.payload.status)),
      ),
    ).toBe(false);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(h.connect).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(h.connect).toHaveBeenCalledOnce();
    await h.close(440, 'conflict');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.connect).toHaveBeenCalledOnce();
    expect(
      h.events.some(
        (e) =>
          e.name === 'session.status' &&
          ['FAILED', 'STOPPED'].includes(String(e.payload.status)),
      ),
    ).toBe(false);
  });

  it.each([401, 403, 405, 500, 503, 515])(
    'close %i depois da retentativa quieta 440 não altera status compartilhado',
    async (code) => {
      vi.useFakeTimers();
      const h = harness();
      (h.internals as unknown as { status: string }).status = 'WORKING';
      await h.close(440, 'conflict');
      expect(h.engine.getStatus()).toBe('DEGRADED');
      expect(h.onDisconnect).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(h.connect).toHaveBeenCalledOnce();
      h.events.length = 0;

      await h.close(code, `after-440-${code}`);
      expect(h.clearCredentials).not.toHaveBeenCalled();
      expect(h.onDisconnect).toHaveBeenCalledOnce();
      expect(h.events.some((e) => e.name === 'session.client_too_old')).toBe(
        false,
      );
      expect(
        h.events.some(
          (e) =>
            e.name === 'session.status' &&
            ['FAILED', 'STOPPED'].includes(String(e.payload.status)),
        ),
      ).toBe(false);
      expect(h.engine.getStatus()).not.toBe('WORKING');
      await vi.advanceTimersByTimeAsync(120_000);
      expect(h.connect).toHaveBeenCalledOnce();
    },
  );

  it('QR durante a retentativa quieta 440 não publica SCAN_QR_CODE', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.close(440, 'conflict');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.connect).toHaveBeenCalledOnce();
    await h.internals.onConnectionUpdate({ qr: 'qr-da-replica-substituida' });
    expect(h.engine.getQrBase64()).toBeNull();
    expect(
      h.events.some(
        (e) =>
          e.name === 'session.status' && e.payload.status === 'SCAN_QR_CODE',
      ),
    ).toBe(false);
  });

  it('440 duplicado antes do timer mantém uma única tentativa agendada', async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.close(440, 'conflict');
    await vi.advanceTimersByTimeAsync(30_000);
    await h.close(440, 'conflict duplicate');
    expect(h.onDisconnect).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(29_999);
    expect(h.connect).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(h.connect).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.connect).toHaveBeenCalledOnce();
  });

  it('500 esgota cinco tentativas antes de DEGRADED', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const h = harness();
    for (let attempt = 1; attempt <= 5; attempt++) {
      await h.close(500, 'stream errored');
      expect(h.internals.reconnectAttempts).toBe(attempt);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(h.connect).toHaveBeenCalledTimes(attempt);
    }
    await h.close(500, 'stream errored');
    expect(h.events.at(-1)).toMatchObject({
      name: 'session.status',
      payload: { status: 'DEGRADED' },
    });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.connect).toHaveBeenCalledTimes(5);
  });

  it('conta o código bruto uma vez por close, inclusive quando o status não muda', async () => {
    vi.useFakeTimers();
    const before =
      disconnectTotals().find((x) => x.engine === 'baileys' && x.code === '440')
        ?.total ?? 0;
    const h = harness();
    await h.close(440, 'conflict');
    await h.close(440, 'conflict');
    const after =
      disconnectTotals().find((x) => x.engine === 'baileys' && x.code === '440')
        ?.total ?? 0;
    expect(after).toBe(before + 2);
  });

  it('stop cancela o timer; novo start invalida a geração antiga', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const h = harness();
    await h.close(500);
    await h.engine.stop();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.connect).not.toHaveBeenCalled();

    await h.engine.start();
    expect(h.connect).toHaveBeenCalledOnce();
    await h.close(503);
    const generation = h.internals.connectGeneration;
    await h.engine.start();
    expect(h.internals.connectGeneration).toBeGreaterThan(generation);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.connect).toHaveBeenCalledTimes(2);
  });

  it('connection.update continua provisório; só o resultado direto do RPC confirma prazo', async () => {
    const h = harness();
    const temporary = new Date(Date.now() + 60_000);
    const confirmed = new Date(Date.now() + 10 * 60_000);
    const sock = h.internals.sock as {
      fetchAccountReachoutTimelock: ReturnType<typeof vi.fn>;
    };
    sock.fetchAccountReachoutTimelock.mockResolvedValue({
      isActive: true,
      timeEnforcementEnds: confirmed,
    });
    await h.internals.onConnectionUpdate({
      reachoutTimeLock: { isActive: true, timeEnforcementEnds: temporary },
    });
    expect(h.restrictions[0]).toMatchObject({
      source: 'temporary',
      until: temporary,
    });
    await vi.waitFor(() =>
      expect(h.restrictions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'timeEnforcementEnds',
            until: confirmed,
          }),
        ]),
      ),
    );
  });
});

describe('Baileys — QR esgotado sem pareamento (P-018/P-091)', () => {
  it('para, limpa QR/socket/listeners, preserva auth e ignora close duplicado', async () => {
    vi.useFakeTimers();
    const h = freshQrHarness();
    const auth = h.sock.authState;
    const authBefore = structuredClone(auth);

    await h.close(408, QR_EXHAUSTED_REASON);

    expect(h.engine.getStatus()).toBe('STOPPED');
    expect(h.engine.getQrBase64()).toBeNull();
    expect(h.internals.stopped).toBe(true);
    expect(h.internals.sock).toBeNull();
    expect(h.end).toHaveBeenCalledOnce();
    expect(h.removeAllListeners).toHaveBeenCalledWith('connection.update');
    expect(h.removeAllListeners).toHaveBeenCalledWith('creds.update');
    expect(h.clearCredentials).not.toHaveBeenCalled();
    expect(h.sock.authState).toBe(auth);
    expect(h.sock.authState).toEqual(authBefore);
    expect(h.onDisconnect).toHaveBeenCalledOnce();
    expect(h.events).toEqual([
      {
        name: 'session.status',
        payload: {
          status: 'STOPPED',
          error:
            'QRs esgotados sem pareamento — conecte novamente para gerar um novo QR',
          lastErrorDetails: { code: 408, reason: QR_EXHAUSTED_REASON },
        },
      },
    ]);

    await h.close(408, QR_EXHAUSTED_REASON);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.onDisconnect).toHaveBeenCalledOnce();
    expect(h.end).toHaveBeenCalledOnce();
    expect(h.events).toHaveLength(1);
    expect(h.internals.reconnectAttempts).toBe(0);
  });

  it('cancela retry anterior e permite novo start explícito depois da parada', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const h = freshQrHarness();
    await h.close(408, 'Connection lost');
    expect(h.internals.reconnectAttempts).toBe(1);
    await h.close(408, QR_EXHAUSTED_REASON);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.engine.getStatus()).toBe('STOPPED');

    await h.engine.start();
    expect(h.connect).toHaveBeenCalledOnce();
    expect(h.internals.stopped).toBe(false);
    expect(h.internals.reconnectAttempts).toBe(0);
    expect(h.clearCredentials).not.toHaveBeenCalled();
  });

  it.each([
    [408, 'Connection lost'],
    [408, `${QR_EXHAUSTED_REASON} `],
    [408, 'qr refs attempts ended'],
    [428, QR_EXHAUSTED_REASON],
  ])('preserva retry para código %i com motivo %s', async (code, reason) => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const h = freshQrHarness();
    await h.close(code as number, reason as string);
    expect(h.internals.stopped).toBe(false);
    expect(h.engine.getStatus()).toBe('DEGRADED');
    expect(h.end).not.toHaveBeenCalled();
    expect(h.clearCredentials).not.toHaveBeenCalled();
    expect(h.events.some((e) => e.payload.status === 'STOPPED')).toBe(false);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(h.connect).toHaveBeenCalledOnce();
  });

  it.each([
    'account com registered=false',
    'me de código sem account',
    'registered=true sem account',
    'sock.user',
    'auth ausente',
    'registered ausente',
    'WORKING contraditório',
  ])('preserva retry diante de %s', async (evidence) => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const h = freshQrHarness();
    switch (evidence) {
      case 'account com registered=false':
        h.creds.account = { accountSignature: 'assinatura-sintética' };
        break;
      case 'me de código sem account':
        h.creds.me = { id: '5511999990001@s.whatsapp.net', name: '~' };
        h.creds.pairingCode = 'TESTCODE';
        break;
      case 'registered=true sem account':
        h.creds.registered = true;
        break;
      case 'sock.user':
        h.sock.user = { id: '5511999990001@s.whatsapp.net' };
        break;
      case 'auth ausente':
        delete h.sock.authState;
        break;
      case 'registered ausente':
        delete h.creds.registered;
        break;
      case 'WORKING contraditório':
        h.internals.status = 'WORKING';
        break;
    }
    const authBefore = structuredClone(h.sock.authState);
    await h.close(408, QR_EXHAUSTED_REASON);
    expect(h.internals.stopped).toBe(false);
    expect(h.engine.getStatus()).toBe('DEGRADED');
    expect(h.end).not.toHaveBeenCalled();
    expect(h.clearCredentials).not.toHaveBeenCalled();
    expect(h.sock.authState).toEqual(authBefore);
    expect(h.events.some((e) => e.payload.status === 'STOPPED')).toBe(false);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(h.connect).toHaveBeenCalledOnce();
  });

  it.each(['account', 'me'])(
    'relê %s que muda durante onDisconnect',
    async (key) => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const h = freshQrHarness();
      let release!: () => void;
      h.onDisconnect.mockImplementationOnce(
        () => new Promise<void>((resolve) => (release = resolve)),
      );
      const closing = h.close(408, QR_EXHAUSTED_REASON);
      expect(h.onDisconnect).toHaveBeenCalledOnce();
      h.creds[key] = { id: 'credencial-atualizada-durante-await' };
      release();
      await closing;
      expect(h.engine.getStatus()).toBe('DEGRADED');
      expect(h.end).not.toHaveBeenCalled();
      expect(h.clearCredentials).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(2_000);
      expect(h.connect).toHaveBeenCalledOnce();
    },
  );

  it('ignora close do socket anterior sem tocar o QR/socket atuais', async () => {
    vi.useFakeTimers();
    const h = freshQrHarness();
    await h.internals.onConnectionUpdate(
      {
        connection: 'close',
        lastDisconnect: {
          error: new Boom(QR_EXHAUSTED_REASON, { statusCode: 408 }),
        },
      },
      { authState: { creds: { registered: false } } },
    );
    expect(h.engine.getStatus()).toBe('SCAN_QR_CODE');
    expect(h.engine.getQrBase64()).not.toBeNull();
    expect(h.internals.sock).toBe(h.sock);
    expect(h.events).toHaveLength(0);
    expect(h.onDisconnect).not.toHaveBeenCalled();
    expect(h.end).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(h.connect).not.toHaveBeenCalled();
  });

  it.each(['geração', 'socket'])(
    'ignora %s substituído durante onDisconnect',
    async (changed) => {
      vi.useFakeTimers();
      const h = freshQrHarness();
      let release!: () => void;
      h.onDisconnect.mockImplementationOnce(
        () => new Promise<void>((resolve) => (release = resolve)),
      );
      const closing = h.internals.onConnectionUpdate(
        {
          connection: 'close',
          lastDisconnect: {
            error: new Boom(QR_EXHAUSTED_REASON, { statusCode: 408 }),
          },
        },
        h.sock,
      );
      expect(h.onDisconnect).toHaveBeenCalledOnce();
      const currentSock =
        changed === 'socket'
          ? { authState: { creds: { registered: false } } }
          : h.sock;
      h.internals.sock = currentSock;
      if (changed === 'geração') h.internals.connectGeneration += 1;
      h.internals.status = 'SCAN_QR_CODE';
      release();
      await closing;
      expect(h.engine.getStatus()).toBe('SCAN_QR_CODE');
      expect(h.internals.sock).toBe(currentSock);
      expect(h.engine.getQrBase64()).not.toBeNull();
      expect(h.events).toHaveLength(0);
      expect(h.end).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(600_000);
      expect(h.connect).not.toHaveBeenCalled();
    },
  );

  it('listener real serializado encerra o ciclo sem esperar o próprio stop', async () => {
    vi.useFakeTimers();
    versionMocks.makeSocket.mockReset();
    versionMocks.auth.mockReset();
    const creds = { registered: false };
    const keys = {};
    const state = { creds, keys };
    const saveCreds = vi.fn(async () => undefined);
    versionMocks.auth.mockResolvedValue({ state, saveCreds });
    const handlers = new Map<
      string,
      (update: Record<string, unknown>) => void
    >();
    const end = vi.fn();
    const removeAllListeners = vi.fn((name: string) => handlers.delete(name));
    versionMocks.makeSocket.mockImplementation(() => ({
      authState: state,
      end,
      ev: {
        on: (
          name: string,
          listener: (update: Record<string, unknown>) => void,
        ) => handlers.set(name, listener),
        removeAllListeners,
      },
    }));
    const events: Event[] = [];
    const engine = new BaileysEngine({
      sessionId: 'qr-exhausted-serial-listener',
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
      onEvent: (name: string, payload: unknown) =>
        events.push({ name, payload: payload as Record<string, unknown> }),
      onDisconnect: async () => undefined,
      baileysProtocolCanarySessionId: 'qr-exhausted-serial-listener',
      baileysProtocolVersion: '2.3000.999',
    } as never);
    await engine.start();
    const listener = handlers.get('connection.update');
    expect(listener).toBeDefined();
    listener!({
      connection: 'close',
      lastDisconnect: {
        error: new Boom(QR_EXHAUSTED_REASON, { statusCode: 408 }),
      },
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(engine.getStatus()).toBe('STOPPED');
    expect(engine.getQrBase64()).toBeNull();
    expect(end).toHaveBeenCalledOnce();
    expect(handlers.has('connection.update')).toBe(false);
    expect(handlers.has('creds.update')).toBe(false);
    expect(events.filter((e) => e.payload.status === 'STOPPED')).toHaveLength(
      1,
    );
    expect(state).toEqual({ creds: { registered: false }, keys: {} });
    expect(saveCreds).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(versionMocks.makeSocket).toHaveBeenCalledOnce();
    await engine.stop();
  });
});

describe('Baileys — versão por conexão (E9/P-049)', () => {
  it('stop durante resolveAgent pendente não cria socket após o retorno tardio', async () => {
    versionMocks.makeSocket.mockReset();
    versionMocks.auth.mockReset();
    versionMocks.auth.mockResolvedValue({
      state: { creds: {}, keys: {} },
      saveCreds: vi.fn(async () => undefined),
    });
    let releaseAgent!: (agent: null) => void;
    const resolveAgent = vi.fn(
      () =>
        new Promise<null>((resolve) => {
          releaseAgent = resolve;
        }),
    );
    const events: Event[] = [];
    const engine = new BaileysEngine({
      sessionId: 'version-stop-during-proxy',
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
      onEvent: (name: string, payload: unknown) =>
        events.push({ name, payload: payload as Record<string, unknown> }),
      baileysProtocolCanarySessionId: 'version-stop-during-proxy',
      baileysProtocolVersion: '2.3000.999',
      resolveAgent,
    } as never);

    const starting = engine.start();
    await vi.waitFor(() => expect(resolveAgent).toHaveBeenCalledOnce());
    const stopping = engine.stop(); // `stopped` muda antes de esperar o mutex de start.
    releaseAgent(null);
    await Promise.all([starting, stopping]);
    expect(versionMocks.makeSocket).not.toHaveBeenCalled();
    expect(engine.getStatus()).toBe('STOPPED');
    expect(events.some((e) => e.payload.status === 'STARTING')).toBe(false);
  });

  it('retry 440 não publica STARTING nem deixa o estado local WORKING com socket fechado', async () => {
    vi.useFakeTimers();
    versionMocks.makeSocket.mockReset();
    versionMocks.auth.mockReset();
    versionMocks.auth.mockResolvedValue({
      state: { creds: {}, keys: {} },
      saveCreds: vi.fn(async () => undefined),
    });
    versionMocks.makeSocket.mockImplementation(() => ({
      end: vi.fn(),
      ev: { on: vi.fn(), removeAllListeners: vi.fn() },
    }));
    const events: Event[] = [];
    const engine = new BaileysEngine({
      sessionId: 'version-quiet-440',
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
      onEvent: (name: string, payload: unknown) =>
        events.push({ name, payload: payload as Record<string, unknown> }),
      baileysProtocolCanarySessionId: 'version-quiet-440',
      baileysProtocolVersion: '2.3000.999',
    } as never);
    const onConnectionUpdate = (
      engine as unknown as {
        onConnectionUpdate: (update: Record<string, unknown>) => Promise<void>;
      }
    ).onConnectionUpdate.bind(engine);

    await engine.start();
    expect(versionMocks.makeSocket).toHaveBeenCalledOnce();
    expect(versionMocks.makeSocket).toHaveBeenCalledWith(
      expect.objectContaining({
        countryCode: 'BR',
        msgRetryCounterCache: expect.objectContaining({
          getStats: expect.any(Function),
        }),
        userDevicesCache: expect.objectContaining({
          getStats: expect.any(Function),
        }),
      }),
    );
    await onConnectionUpdate({ connection: 'open' });
    expect(engine.getStatus()).toBe('WORKING');
    events.length = 0;
    await onConnectionUpdate({
      connection: 'close',
      lastDisconnect: {
        error: new Boom('conflict', { statusCode: 440 }),
      },
    });
    expect(engine.getStatus()).toBe('DEGRADED');
    expect(events.filter((e) => e.name === 'session.status')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(versionMocks.makeSocket).toHaveBeenCalledTimes(2);
    expect(engine.getStatus()).toBe('STARTING');
    expect(events.filter((e) => e.name === 'session.status')).toHaveLength(0);
    await onConnectionUpdate({ connection: 'open' });
    expect(engine.getStatus()).toBe('WORKING');
    expect(events.filter((e) => e.name === 'session.status')).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({ status: 'WORKING' }),
      }),
    ]);
  });

  it('não cacheia fallback, limita consulta, compartilha flight e isola override no canário', async () => {
    vi.useFakeTimers();
    versionMocks.fetch.mockReset();
    versionMocks.makeSocket.mockReset();
    versionMocks.auth.mockReset();
    versionMocks.auth.mockResolvedValue({
      state: { creds: {}, keys: {} },
      saveCreds: vi.fn(async () => undefined),
    });
    versionMocks.makeSocket.mockImplementation(() => ({
      end: vi.fn(),
      ev: { on: vi.fn(), removeAllListeners: vi.fn() },
    }));

    const makeEngine = (
      sessionId: string,
      canarySessionId?: string,
      protocolVersion?: string,
    ) => {
      const info = vi.fn();
      const warn = vi.fn();
      const engine = new BaileysEngine({
        sessionId,
        deviceName: 'test',
        prisma: {} as never,
        lease: {} as never,
        authEpoch: 1n,
        logger: { info, warn, error() {}, debug() {}, trace() {} } as never,
        onEvent: () => undefined,
        baileysProtocolCanarySessionId: canarySessionId,
        baileysProtocolVersion: protocolVersion,
      } as never);
      return { engine, info, warn };
    };
    const lastSocketOptions = () =>
      versionMocks.makeSocket.mock.calls.at(-1)?.[0] as
        { version?: number[] } | undefined;
    const logOf = (info: ReturnType<typeof vi.fn>) =>
      info.mock.calls.find(
        ([, message]) =>
          message === 'versão do protocolo Baileys nesta conexão',
      )?.[0] as { version: string; source: string } | undefined;

    versionMocks.fetch.mockResolvedValueOnce({
      version: [2, 3000, 111],
      isLatest: false,
      error: new Error('offline'),
    });
    const fallback = makeEngine('version-fallback');
    await fallback.engine.start();
    expect(lastSocketOptions()?.version).toBeUndefined();
    expect(logOf(fallback.info)).toMatchObject({
      version: '2.3000.1043857760',
      source: 'bundled',
    });

    vi.setSystemTime(Date.now() + 30_001);
    versionMocks.fetch.mockResolvedValueOnce({
      version: [2, 3000, 222],
      isLatest: true,
    });
    const fresh = makeEngine('version-fresh');
    await fresh.engine.start();
    expect(versionMocks.fetch).toHaveBeenCalledTimes(2);
    expect(lastSocketOptions()?.version).toEqual([2, 3000, 222]);
    expect(logOf(fresh.info)).toMatchObject({
      version: '2.3000.222',
      source: 'latest',
    });

    const cached = makeEngine('version-cached');
    await cached.engine.start();
    expect(versionMocks.fetch).toHaveBeenCalledTimes(2);
    expect(lastSocketOptions()?.version).toEqual([2, 3000, 222]);
    expect(logOf(cached.info)?.source).toBe('cache');

    const canary = makeEngine('version-canary', 'version-canary', '2.3000.999');
    await canary.engine.start();
    expect(lastSocketOptions()?.version).toEqual([2, 3000, 999]);
    expect(logOf(canary.info)?.source).toBe('canary-override');
    const other = makeEngine('version-other', 'version-canary', '2.3000.999');
    await other.engine.start();
    expect(lastSocketOptions()?.version).toEqual([2, 3000, 222]);
    expect(versionMocks.fetch).toHaveBeenCalledTimes(2);

    vi.setSystemTime(Date.now() + 12 * 60 * 60 * 1000 + 1);
    let resolveLate!: (value: { version: number[]; isLatest: boolean }) => void;
    versionMocks.fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLate = resolve;
        }),
    );
    const waitingA = makeEngine('version-wait-a');
    const waitingB = makeEngine('version-wait-b');
    const pendingA = waitingA.engine.start();
    const pendingB = waitingB.engine.start();
    await vi.advanceTimersByTimeAsync(1);
    expect(versionMocks.fetch).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(3_000);
    await Promise.all([pendingA, pendingB]);
    expect(versionMocks.fetch).toHaveBeenCalledTimes(3);
    expect(lastSocketOptions()?.version).toEqual([2, 3000, 222]);
    expect(logOf(waitingA.info)?.source).toBe('stale-cache');
    expect(logOf(waitingB.info)?.source).toBe('stale-cache');

    resolveLate({ version: [2, 3000, 888], isLatest: true });
    await Promise.resolve();
    vi.setSystemTime(Date.now() + 30_001);
    versionMocks.fetch.mockResolvedValueOnce({
      version: [2, 3000, 333],
      isLatest: true,
    });
    const afterTimeout = makeEngine('version-after-timeout');
    await afterTimeout.engine.start();
    expect(versionMocks.fetch).toHaveBeenCalledTimes(4);
    expect(lastSocketOptions()?.version).toEqual([2, 3000, 333]);
  });
});
