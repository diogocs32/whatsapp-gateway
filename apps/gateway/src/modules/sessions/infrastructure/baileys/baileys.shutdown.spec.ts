import { describe, expect, it, vi } from 'vitest';

// Mock leve do Baileys: o teste não conecta (não chama makeWASocket), só exercita shutdown()/stop()
// com um socket falso injetado. Evita carregar a lib real e o Chromium/rede.
vi.mock('@whiskeysockets/baileys', () => ({
  default: vi.fn(),
  BufferJSON: { replacer: undefined, reviver: undefined },
  DisconnectReason: {
    loggedOut: 401,
    restartRequired: 515,
    connectionReplaced: 440,
  },
  downloadMediaMessage: vi.fn(),
  extractMessageContent: vi.fn(),
  fetchLatestBaileysVersion: vi.fn(),
  getContentType: vi.fn(),
  jidNormalizedUser: (j: string) => j,
  makeCacheableSignalKeyStore: vi.fn(),
  proto: {},
}));

import { BaileysEngine } from './baileys.engine';

type Ev = { name: string; payload: unknown };

function makeEngine(events: Ev[]): BaileysEngine {
  const deps = {
    sessionId: 'sess-test',
    deviceName: 'test',
    prisma: {} as unknown,
    logger: { info() {}, warn() {}, error() {}, debug() {}, trace() {} },
    onEvent: (name: string, payload: unknown) => events.push({ name, payload }),
    resolveAgent: async () => null,
    resolveProxyConfig: async () => null,
  };
  return new BaileysEngine(deps as never);
}

// Socket falso com o mínimo que shutdown()/doStop() tocam: end() e ev.removeAllListeners().
function fakeSock() {
  return {
    end: vi.fn(),
    ev: { removeAllListeners: vi.fn() },
    user: { id: '5511999@s.whatsapp.net', name: 'Diogo' },
  };
}

describe('BaileysEngine — shutdown() vs stop() (P-042: reidratação no deploy stop-first)', () => {
  it('shutdown() fecha o socket SEM emitir session.status (status persistido fica intacto)', async () => {
    const events: Ev[] = [];
    const engine = makeEngine(events);
    const sock = fakeSock();
    (engine as unknown as { sock: unknown; status: string }).sock = sock;
    (engine as unknown as { status: string }).status = 'WORKING';

    await engine.shutdown();

    // O ponto do fix: nenhum session.status é emitido → persistStatus não grava STOPPED →
    // findAutostart reidrata a sessão (que estava WORKING) no container novo.
    expect(events.filter((e) => e.name === 'session.status')).toHaveLength(0);
    expect(sock.end).toHaveBeenCalledTimes(1);
    expect(sock.ev.removeAllListeners).toHaveBeenCalled(); // listeners fora antes do end()
    expect((engine as unknown as { sock: unknown }).sock).toBeNull();
    // getStatus() em memória não regride para STOPPED (não houve setStatus)
    expect(engine.getStatus()).toBe('WORKING');
  });

  it('stop() (contraste) EMITE session.status STOPPED com erro nulo — o que quebrava a reidratação', async () => {
    const events: Ev[] = [];
    const engine = makeEngine(events);
    (engine as unknown as { sock: unknown }).sock = fakeSock();

    await engine.stop();

    const status = events.filter((e) => e.name === 'session.status');
    expect(status.length).toBeGreaterThanOrEqual(1);
    const last = status[status.length - 1].payload as {
      status: string;
      error: string | null;
    };
    expect(last.status).toBe('STOPPED');
    expect(last.error).toBeNull();
  });

  it('shutdown() sem socket aberto é no-op seguro (não emite status, não lança)', async () => {
    const events: Ev[] = [];
    const engine = makeEngine(events);
    await expect(engine.shutdown()).resolves.toBeUndefined();
    expect(events).toHaveLength(0);
  });
});
