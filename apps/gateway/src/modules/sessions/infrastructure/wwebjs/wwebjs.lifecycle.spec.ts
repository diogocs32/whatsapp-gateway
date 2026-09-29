import { EventEmitter } from 'node:events';
import { rm } from 'node:fs/promises';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProxyUnavailableError } from '../../../proxies/application/proxy-unavailable.error';
import { LeaseLostError } from '../../application/session-lease.error';

// Teste de EFEITO (R6) do ciclo de vida do wwebjs após a auditoria 09/2026 (WA-08/WA-09/P-025):
// `initialize()` que nunca resolve não pode prender o mutex para sempre, callbacks de um client
// antigo não podem mexer no status da geração nova, e a fase de QR tem watchdog. A lib é
// substituída por um Client FAKE (sem Chromium) — o resto do engine é o real.

type Mode = 'hang' | 'qr-once' | 'ready' | 'proxy-failure';

class FakeClient extends EventEmitter {
  static instances: FakeClient[] = [];
  static mode: Mode = 'hang';
  readonly destroy = vi.fn(async () => undefined);
  readonly pupBrowser = { version: vi.fn(async () => 'Chrome/146.0') };
  readonly pupPage = { reload: vi.fn(async () => undefined) };
  info: { wid: { _serialized: string }; pushname: string } | undefined;
  constructor(readonly opts: unknown) {
    super();
    FakeClient.instances.push(this);
  }
  initialize(): Promise<void> {
    if (FakeClient.mode === 'proxy-failure')
      return Promise.reject(new Error('net::ERR_TUNNEL_CONNECTION_FAILED'));
    if (FakeClient.mode === 'hang') return new Promise(() => undefined);
    if (FakeClient.mode === 'qr-once') {
      setTimeout(() => this.emit('qr', '1@fake-qr-payload'), 5);
      return Promise.resolve();
    }
    this.info = { wid: { _serialized: '5511999@c.us' }, pushname: 'Fake' };
    setTimeout(() => this.emit('ready'), 5);
    return Promise.resolve();
  }
  async getState(): Promise<string> {
    return 'CONNECTED';
  }
  async getWWebVersion(): Promise<string> {
    return '2.3000.1046934385-alpha';
  }
  async logout(): Promise<void> {
    return undefined;
  }
  async requestPairingCode(): Promise<string> {
    return 'ABCD-EFGH';
  }
}

vi.mock('whatsapp-web.js', () => ({
  Client: FakeClient,
  LocalAuth: class {
    clientId?: string;
    constructor(opts: { clientId?: string }) {
      this.clientId = opts.clientId;
    }
  },
  MessageMedia: class {},
  Location: class {},
  Poll: class {},
}));

// Env lida no load do módulo do engine — precisa vir ANTES do import dinâmico.
process.env.WWEBJS_CHROME_PATH = process.execPath; // qualquer binário existente passa no access()
process.env.WWEBJS_WEB_VERSION = 'live'; // não fixa build → sem download de HTML nem catálogo
process.env.WWEBJS_DATA_PATH = `.tmp-wwebjs-lifecycle-${process.pid}`;

type StatusEvent = { status: string; error?: string | null };

async function loadEngine() {
  const mod = await import('./wwebjs.engine.js');
  return mod.WWebJSEngine;
}

function makeDeps(sessionId: string) {
  const events: StatusEvent[] = [];
  const noop = () => undefined;
  const logger = {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    fatal: noop,
    trace: noop,
  };
  const deps = {
    sessionId,
    deviceName: 'test',
    prisma: {},
    lease: {
      fenced: async (
        _id: string,
        _epoch: bigint,
        action: () => Promise<unknown>,
      ) => action(),
    },
    authEpoch: 1n,
    logger,
    onEvent: (name: string, payload: unknown) => {
      if (name === 'session.status') events.push(payload as StatusEvent);
    },
    resolveProxyConfig: async () => null,
    contacts: {
      record: noop,
      recordMany: noop,
      loadLidMap: async () => new Map(),
      resolveNames: async () => new Map(),
    },
  };
  return { deps, events };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Espera uma condição (polling curto) — QR vira data URL de forma assíncrona (QRCode.toDataURL).
async function waitFor(cond: () => boolean, timeoutMs = 1_000): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (!cond()) {
    if (Date.now() > until) throw new Error('waitFor: condição não satisfeita');
    await sleep(10);
  }
}

describe('WWebJSEngine — ciclo de vida com teto (WA-08/WA-09/P-025)', () => {
  beforeEach(() => {
    FakeClient.instances = [];
    FakeClient.mode = 'hang';
  });
  afterAll(async () => {
    await rm(process.env.WWEBJS_DATA_PATH!, { recursive: true, force: true });
  });

  it('proxy inválido fica FAILED antes do Client, mesmo com guard global desligado (E15)', async () => {
    const Engine = await loadEngine();
    const { deps, events } = makeDeps('lc-proxy-blocked');
    const engine = new Engine({
      ...deps,
      requireProxy: false,
      resolveProxyConfig: async () => {
        throw new ProxyUnavailableError('SINGLE sem proxy elegível');
      },
    } as never);
    await engine.start();
    expect(events).toEqual([
      { status: 'FAILED', error: 'SINGLE sem proxy elegível' },
    ]);
    expect(FakeClient.instances).toHaveLength(0);
  });

  it.each([new Error('banco indisponível'), new LeaseLostError()])(
    'propaga erro de infra/lease sem converter em proxy inválido: %s',
    async (error) => {
      const Engine = await loadEngine();
      const { deps, events } = makeDeps('lc-proxy-infra');
      const engine = new Engine({
        ...deps,
        resolveProxyConfig: async () => {
          throw error;
        },
      } as never);
      await expect(engine.start()).rejects.toBe(error);
      expect(events).toEqual([]);
      expect(FakeClient.instances).toHaveLength(0);
    },
  );

  it('RANGE esgotado após túnel falho não relança Client sem proxy (E15)', async () => {
    FakeClient.mode = 'proxy-failure';
    const Engine = await loadEngine();
    const { deps, events } = makeDeps('lc-proxy-exhausted');
    const resolveProxyConfig = vi
      .fn()
      .mockResolvedValueOnce({
        proxyId: 'proxy-original',
        server: 'http://proxy.invalid:8080',
      })
      .mockRejectedValue(new ProxyUnavailableError('RANGE sem candidato'));
    const reportProxyFailure = vi.fn(async () => ({
      mode: 'RANGE',
      marked: true,
    }));
    const engine = new Engine({
      ...deps,
      requireProxy: false,
      resolveProxyConfig,
      reportProxyFailure,
    } as never);
    await engine.start();
    expect(events.at(-1)).toEqual({
      status: 'FAILED',
      error: 'RANGE sem candidato',
    });
    expect(reportProxyFailure).toHaveBeenCalledExactlyOnceWith(
      'PROXY_TUNNEL',
      'proxy-original',
    );
    expect(FakeClient.instances).toHaveLength(1);
    expect(FakeClient.instances[0].opts).toMatchObject({
      puppeteer: {
        args: expect.arrayContaining([
          '--proxy-server=http://proxy.invalid:8080',
        ]),
      },
    });
    expect(FakeClient.instances[0].destroy).toHaveBeenCalled();
  });

  it('initialize pendurado: 1 retentativa, depois FAILED com motivo — e o mutex fica livre', async () => {
    const Engine = await loadEngine();
    const { deps, events } = makeDeps('lc-hang');
    const engine = new Engine(deps as never);
    (engine as unknown as { initTimeoutMs: number }).initTimeoutMs = 60;

    await engine.start();

    expect(engine.getStatus()).toBe('FAILED');
    const failed = events.find((e) => e.status === 'FAILED');
    expect(failed?.error).toMatch(/não completou/);
    // 2 tentativas = 2 clients; ambos destruídos (nada órfão).
    expect(FakeClient.instances).toHaveLength(2);
    for (const c of FakeClient.instances) expect(c.destroy).toHaveBeenCalled();
    expect(events.filter((e) => e.status === 'STARTING')).toHaveLength(2);

    // Mutex livre: um stop() serializado completa imediatamente (antes ficava atrás do hang).
    await expect(
      Promise.race([engine.stop(), sleep(500).then(() => 'timeout')]),
    ).resolves.not.toBe('timeout');
  });

  it('callbacks do client antigo (geração morta) não mexem no status da sessão', async () => {
    const Engine = await loadEngine();
    const { deps, events } = makeDeps('lc-stale');
    const engine = new Engine(deps as never);
    (engine as unknown as { initTimeoutMs: number }).initTimeoutMs = 40;

    await engine.start();
    expect(engine.getStatus()).toBe('FAILED');
    const before = events.length;

    // O initialize órfão "acorda" e emite QR/ready no client velho: deve ser ignorado.
    const stale = FakeClient.instances[0]!;
    stale.emit('qr', '1@late');
    stale.info = { wid: { _serialized: 'x@c.us' }, pushname: 'x' };
    stale.emit('ready');
    await sleep(30);

    expect(engine.getStatus()).toBe('FAILED');
    expect(events.length).toBe(before);
    expect(engine.getQrBase64()).toBeNull();
  });

  it('QR emitido vira SCAN_QR_CODE; QR sem renovação dispara a recuperação (destroy + start)', async () => {
    FakeClient.mode = 'qr-once';
    const Engine = await loadEngine();
    const { deps, events } = makeDeps('lc-qr');
    const engine = new Engine(deps as never);
    const e = engine as unknown as {
      qrWatchdogIntervalMs: number;
      qrStaleMs: number;
    };
    e.qrWatchdogIntervalMs = 20;
    e.qrStaleMs = 40;

    await engine.start();
    await waitFor(() => engine.getStatus() === 'SCAN_QR_CODE'); // QR async (toDataURL)
    expect(engine.getQrBase64()).toMatch(/^data:image\/png;base64,/);
    const first = FakeClient.instances[0]!;

    // Sem novo QR por > qrStaleMs → watchdog: destrói o client e reinicia.
    await waitFor(() => first.destroy.mock.calls.length > 0);
    await waitFor(() => FakeClient.instances.length >= 2);
    expect(first.destroy).toHaveBeenCalled();
    expect(FakeClient.instances.length).toBeGreaterThanOrEqual(2);
    expect(
      events.filter((x) => x.status === 'STARTING').length,
    ).toBeGreaterThanOrEqual(2);

    await engine.stop();
  });

  it('ready → WORKING zera a fase de QR (watchdog de QR parado não dispara)', async () => {
    FakeClient.mode = 'ready';
    const Engine = await loadEngine();
    const { deps } = makeDeps('lc-ready');
    const engine = new Engine(deps as never);
    (
      engine as unknown as { qrWatchdogIntervalMs: number }
    ).qrWatchdogIntervalMs = 20;

    await engine.start();
    await waitFor(() => engine.getStatus() === 'WORKING');
    await sleep(80);
    expect(engine.getStatus()).toBe('WORKING');
    expect(FakeClient.instances[0]!.destroy).not.toHaveBeenCalled();

    await engine.stop();
    expect(engine.getStatus()).toBe('STOPPED');
  });

  it('destroy sem confirmação rejeita stop/shutdown; uma segunda tentativa confirmada libera a engine', async () => {
    FakeClient.mode = 'ready';
    const Engine = await loadEngine();
    const { deps } = makeDeps('lc-unconfirmed-destroy');
    const engine = new Engine(deps as never);
    await engine.start();
    await waitFor(() => engine.getStatus() === 'WORKING');
    const client = FakeClient.instances[0]!;
    client.destroy.mockRejectedValueOnce(new Error('browser travado'));
    await expect(engine.stop()).rejects.toThrow(/não confirmado/);
    expect(engine.getStatus()).not.toBe('STOPPED');
    await engine.stop();
    expect(client.destroy).toHaveBeenCalledTimes(2);
    expect(engine.getStatus()).toBe('STOPPED');

    const second = new Engine(
      makeDeps('lc-unconfirmed-shutdown').deps as never,
    );
    await second.start();
    await waitFor(() => second.getStatus() === 'WORKING');
    FakeClient.instances
      .at(-1)!
      .destroy.mockRejectedValueOnce(new Error('browser travado'));
    await expect(second.shutdown()).rejects.toThrow(/não confirmado/);
    await second.shutdown();
  });

  it('sem requireProxy, inicia com fake sem subir Chromium (P-073)', async () => {
    FakeClient.mode = 'ready';
    const Engine = await loadEngine();
    const { deps, events } = makeDeps('lc-sem-guard');
    const engine = new Engine(deps as never);
    await engine.start();
    await waitFor(() => engine.getStatus() === 'WORKING');
    expect(events.some((e) => /WA_REQUIRE_PROXY/.test(e.error ?? ''))).toBe(
      false,
    );
    await engine.stop();
  });

  it('override da sessão escolhe a build do canário no próximo start', async () => {
    FakeClient.mode = 'ready';
    const Engine = await loadEngine();
    const { deps } = makeDeps('lc-canario');
    const engine = new Engine({
      ...deps,
      resolveWwebjsWebVersion: async () => '2.3000.1046934385-alpha',
    } as never);
    const internals = engine as unknown as {
      ensureWebVersionHtml(version: string): Promise<boolean>;
      checkPinnedBuildAge(version: string): Promise<void>;
      reconnectAttempts: number;
    };
    internals.ensureWebVersionHtml = async () => true;
    internals.checkPinnedBuildAge = async () => undefined;
    internals.reconnectAttempts = 5;
    await engine.start();
    await waitFor(() => engine.getStatus() === 'WORKING');
    expect(internals.reconnectAttempts).toBe(0);
    expect(FakeClient.instances[0]!.opts).toMatchObject({
      webVersion: '2.3000.1046934385-alpha',
      webVersionCache: { type: 'local' },
    });
    await engine.stop();
  });

  it('override inválido não alcança o cache nem cria cliente', async () => {
    const Engine = await loadEngine();
    const { deps, events } = makeDeps('lc-versao-ruim');
    const engine = new Engine({
      ...deps,
      resolveWwebjsWebVersion: async () => '../../outro-diretorio',
    } as never);
    await engine.start();
    expect(engine.getStatus()).toBe('FAILED');
    expect(events.at(-1)?.error).toMatch(/Versão.*inválida/);
    expect(FakeClient.instances).toHaveLength(0);
  });

  it.each([
    'LOGOUT',
    'UNPAIRED',
    'UNPAIRED_IDLE',
    'CONFLICT',
    'TOS_BLOCK',
    'SMB_TOS_BLOCK',
  ])('%s interrompe reconexão sem gerar QR novo', async (reason) => {
    FakeClient.mode = 'ready';
    const Engine = await loadEngine();
    const { deps, events } = makeDeps(`lc-disconnect-${reason}`);
    const engine = new Engine(deps as never);
    await engine.start();
    await waitFor(() => engine.getStatus() === 'WORKING');
    const client = FakeClient.instances.at(-1)!;
    client.emit('disconnected', reason);
    if (reason === 'LOGOUT') {
      // A lib faz isto no listener framenavigated depois de emitir DISCONNECTED.
      await (
        client.opts as { authStrategy: { logout: () => Promise<void> } }
      ).authStrategy.logout();
    }
    await waitFor(() => engine.getStatus() !== 'WORKING');
    expect(engine.getStatus()).toBe(
      reason.includes('TOS_BLOCK') ? 'FAILED' : 'STOPPED',
    );
    expect(events.at(-1)?.error).toContain(reason);
    expect(FakeClient.instances).toHaveLength(1);
    await engine.stop();
  });

  it('limita renovação do código e recargas de página por ciclo', async () => {
    FakeClient.mode = 'qr-once';
    const Engine = await loadEngine();
    const { deps } = makeDeps('lc-caps');
    const engine = new Engine(deps as never);
    await engine.start();
    await engine.requestPairingCode('5511999990000');
    const client = FakeClient.instances[0]!;
    for (let i = 0; i < 5; i++) client.emit('code', `code-${i}`);
    expect(engine.getStatus()).toBe('PAIRING_CODE');
    client.emit('code', 'code-over-limit');
    await waitFor(() => engine.getStatus() === 'FAILED');
    expect(client.destroy).toHaveBeenCalled();

    FakeClient.mode = 'ready';
    await engine.start();
    await waitFor(() => engine.getStatus() === 'WORKING');
    const current = FakeClient.instances.at(-1)!;
    const internals = engine as unknown as {
      lastHealAt: number;
      healWedgedPage(): Promise<void>;
    };
    for (let i = 0; i < 3; i++) {
      internals.lastHealAt = 0;
      await internals.healWedgedPage();
    }
    expect(current.pupPage.reload).toHaveBeenCalledTimes(3);
    internals.lastHealAt = 0;
    await internals.healWedgedPage();
    await waitFor(() => engine.getStatus() === 'FAILED');
    await engine.stop();
  });

  it('pairing code: fica disponível em getPairingCode() e some ao parar (WA-18)', async () => {
    FakeClient.mode = 'qr-once';
    const Engine = await loadEngine();
    const { deps } = makeDeps('lc-pair');
    const engine = new Engine(deps as never);

    await engine.start();
    await sleep(20);
    expect(engine.getPairingCode()).toBeNull(); // só em PAIRING_CODE
    const code = await engine.requestPairingCode('+55 11 99999-0000');
    expect(code).toBe('ABCD-EFGH');
    expect(engine.getStatus()).toBe('PAIRING_CODE');
    expect(engine.getPairingCode()).toBe('ABCD-EFGH');

    FakeClient.instances.at(-1)!.emit('code', 'WXYZ-1234'); // renovação: sem log, com getter
    expect(engine.getPairingCode()).toBe('WXYZ-1234');

    await engine.stop();
    expect(engine.getPairingCode()).toBeNull();
  });
});
