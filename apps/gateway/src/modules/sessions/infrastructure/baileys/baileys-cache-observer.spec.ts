import { describe, expect, it, vi } from 'vitest';
import { BaileysCacheObserver } from './baileys-cache-observer';

describe('BaileysCacheObserver (E12)', () => {
  it('mede caches e conta apenas pre-keys da sessão no banco sintético', async () => {
    const count = vi.fn(async () => 12);
    const info = vi.fn();
    const observer = new BaileysCacheObserver(
      'sess-e12',
      { waAuthKey: { count } } as never,
      { info, warn: vi.fn() } as never,
    );
    observer.msgRetryCounterCache.set('retry-sintetico', 1);
    observer.msgRetryCounterCache.get('retry-sintetico');
    observer.userDevicesCache.set('dispositivo-sintetico', [
      { user: '123', device: 0 },
    ]);
    observer.userDevicesCache.get('ausente');

    await observer.snapshot('open');
    expect(count).toHaveBeenCalledWith({
      where: { sessionId: 'sess-e12', type: 'pre-key' },
    });
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess-e12',
        preKeys: 12,
        msgRetry: expect.objectContaining({ keys: 1, hits: 1 }),
        userDevices: expect.objectContaining({ keys: 1, misses: 1 }),
      }),
      'Baileys: caches e pre-keys da sessão',
    );
    observer.close('close');
  });
});
