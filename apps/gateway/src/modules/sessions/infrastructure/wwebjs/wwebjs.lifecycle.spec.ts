import { EventEmitter } from 'node:events';
import { rm } from 'node:fs/promises';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Teste de EFEITO (R6) do ciclo de vida do wwebjs após a auditoria 09/2026 (WA-08/WA-09/P-025):
// `initialize()` que nunca resolve não pode prender o mutex para sempre, callbacks de um client
// antigo não podem mexer no status da geração nova, e a fase de QR tem watchdog. A lib é
// substituída por um Client FAKE (sem Chromium) — o resto do engine é o real.

type Mode = 'hang' | 'qr-once' | 'ready';

class FakeClient extends EventEmitter {
  static instances: FakeClient[] = [];
  static mode: Mode = 'hang';
  readonly destroy = vi.fn(async () => undefined);
  info: { wid: { _serialized: string }; pushname: string } | undefined;
  constructor(readonly opts: unknown) {
    super();
    FakeClient.instances.push(this);
  }
  initialize(): Promise<void> {
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
    constructor(_: unknown) {}
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
  const mod = await import('./wwebjs.engine');
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
