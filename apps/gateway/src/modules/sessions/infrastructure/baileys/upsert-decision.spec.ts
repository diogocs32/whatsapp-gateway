import { describe, expect, it } from 'vitest';
import type { WAMessage } from '@whiskeysockets/baileys';
import {
  OFFLINE_UPSERT_MAX_AGE_SECONDS,
  shouldAcceptUpsert,
} from './upsert-decision';

const NOW = 1_800_000_000;
const inbound = (overrides: Partial<WAMessage> = {}) =>
  ({
    key: { id: 'A', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
    messageTimestamp: NOW - 60,
    ...overrides,
  }) as WAMessage;

describe('decisão de messages.upsert (Baileys rc14)', () => {
  it('aceita notify e append recente por mensagem, inclusive limite de 48 h', () => {
    expect(shouldAcceptUpsert(inbound(), 'notify', NOW)).toBe(true);
    expect(shouldAcceptUpsert(inbound(), 'append', NOW)).toBe(true);
    expect(
      shouldAcceptUpsert(
        inbound({ messageTimestamp: NOW - OFFLINE_UPSERT_MAX_AGE_SECONDS }),
        'append',
        NOW,
      ),
    ).toBe(true);
    expect(
      shouldAcceptUpsert(
        inbound({ messageTimestamp: NOW - OFFLINE_UPSERT_MAX_AGE_SECONDS - 1 }),
        'append',
        NOW,
      ),
    ).toBe(false);
  });

  it('recusa eco próprio, canais, status e timestamp inválido em append', () => {
    for (const m of [
      inbound({
        key: {
          id: 'A',
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: true,
        },
      }),
      inbound({ key: { id: 'B', remoteJid: '123@newsletter' } }),
      inbound({ key: { id: 'C', remoteJid: 'status@broadcast' } }),
      inbound({ key: { id: '' } }),
      inbound({ messageTimestamp: 0 }),
      inbound({ messageTimestamp: NOW + 301 }),
    ]) {
      expect(shouldAcceptUpsert(m, 'append', NOW)).toBe(false);
    }
    expect(
      shouldAcceptUpsert(inbound({ messageTimestamp: 0 }), 'notify', NOW),
    ).toBe(true);
  });
});
