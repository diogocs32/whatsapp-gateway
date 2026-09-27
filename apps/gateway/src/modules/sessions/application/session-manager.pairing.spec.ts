import { describe, expect, it, vi } from 'vitest';
import { SessionManager } from './session-manager.service';

function harness(status: string, creds: unknown = null) {
  const session = { id: 'sess-e12', engine: 'BAILEYS', status };
  const findById = vi.fn(async () => session);
  const findUnique = vi.fn(async () => ({ creds }));
  const start = vi.fn(async () => undefined);
  const requestPairingCode = vi.fn(async () => '12345678');
  const engine = { getStatus: () => status, start, requestPairingCode };
  const manager = Object.create(SessionManager.prototype) as SessionManager;
  const internals = manager as unknown as {
    repo: unknown;
    prisma: unknown;
    getOrCreateEngine: () => unknown;
    startWithTimeout: (_id: string, promise: Promise<void>) => Promise<void>;
  };
  internals.repo = { findById };
  internals.prisma = { waSession: { findUnique } };
  internals.getOrCreateEngine = () => engine;
  internals.startWithTimeout = async (_id, promise) => promise;
  return { manager, findUnique, start, requestPairingCode };
}

describe('SessionManager.requestPairingCode (E12)', () => {
  it('barra status WORKING antes de consultar creds ou iniciar socket', async () => {
    const h = harness('WORKING');
    await expect(
      h.manager.requestPairingCode('sess-e12', '5511999999999'),
    ).rejects.toThrow('já pareada');
    expect(h.findUnique).not.toHaveBeenCalled();
    expect(h.start).not.toHaveBeenCalled();
    expect(h.requestPairingCode).not.toHaveBeenCalled();
  });

  it('barra creds.me persistido de QR mesmo com registered=false', async () => {
    const h = harness('STOPPED', {
      registered: false,
      me: { id: '5511999999999@s.whatsapp.net' },
    });
    await expect(
      h.manager.requestPairingCode('sess-e12', '5511999999999'),
    ).rejects.toThrow('já pareada');
    expect(h.findUnique).toHaveBeenCalledWith({
      where: { id: 'sess-e12' },
      select: { creds: true },
    });
    expect(h.start).not.toHaveBeenCalled();
  });

  it('inicia sessão sem credenciais e encaminha o pedido sem sleep', async () => {
    const h = harness('STOPPED');
    await expect(
      h.manager.requestPairingCode('sess-e12', '5511999999999'),
    ).resolves.toBe('12345678');
    expect(h.start).toHaveBeenCalledOnce();
    expect(h.requestPairingCode).toHaveBeenCalledWith('5511999999999');
  });
});
