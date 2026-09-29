import { describe, expect, it, vi } from 'vitest';

// Socket substituído, sem start/conta/rede WhatsApp; a biblioteca real só fornece tipos/utilitários.
import { BaileysEngine } from './baileys.engine';

function engine(onWhatsApp: ReturnType<typeof vi.fn>) {
  const instance = new BaileysEngine({
    sessionId: 'e20-check-fixture',
    deviceName: 'fixture',
    prisma: {},
    logger: { info() {}, warn() {}, error() {}, debug() {}, trace() {} },
    onEvent() {},
  } as never);
  (instance as unknown as { sock: unknown }).sock = { onWhatsApp };
  return instance;
}

describe('E20 — contacts/check Baileys preserva correlação sem consultas repetidas', () => {
  it('expande ordem/máscara/duplicados preservando número e JID canônico do resultado', async () => {
    const onWhatsApp = vi.fn(async (digits: string) =>
      digits === '1000001'
        ? [{ jid: '10000019@s.whatsapp.net', exists: true }]
        : [],
    );
    expect(
      await engine(onWhatsApp).checkNumbers([
        '1000001',
        '1000002',
        '+1 000-001',
        '1000002',
      ]),
    ).toEqual([
      { number: '1000001', exists: true, jid: '10000019@s.whatsapp.net' },
      { number: '1000002', exists: false, jid: null },
      { number: '+1 000-001', exists: true, jid: '10000019@s.whatsapp.net' },
      { number: '1000002', exists: false, jid: null },
    ]);
    expect(onWhatsApp.mock.calls).toEqual([['1000001'], ['1000002']]);
  });

  it('mantém ausente/false/sem JID e propaga falha da consulta', async () => {
    const onWhatsApp = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ exists: false, jid: 'other' }])
      .mockResolvedValueOnce([{ exists: true }]);
    expect(
      await engine(onWhatsApp).checkNumbers(['1000001', '1000002', '1000003']),
    ).toEqual([
      { number: '1000001', exists: false, jid: null },
      { number: '1000002', exists: false, jid: null },
      { number: '1000003', exists: true, jid: null },
    ]);
    await expect(
      engine(
        vi.fn().mockRejectedValue(new Error('consulta fixture falhou')),
      ).checkNumbers(['1000001']),
    ).rejects.toThrow('consulta fixture falhou');
  });
});
