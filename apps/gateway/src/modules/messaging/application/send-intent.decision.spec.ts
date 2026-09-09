import { describe, expect, it } from 'vitest';
import {
  decideOnExistingIntent,
  PENDING_INTENT_TTL_MS,
  sendFingerprint,
} from './send-intent.decision';

const now = Date.parse('2026-09-09T12:00:00Z');
const fp = sendFingerprint({ kind: 'text', to: '5511', text: 'oi' });

function row(over: Partial<Parameters<typeof decideOnExistingIntent>[0]>) {
  return {
    status: 'pending',
    fingerprint: fp,
    updatedAt: new Date(now - 1_000),
    keyId: null,
    chatJid: null,
    ...over,
  };
}

describe('decideOnExistingIntent', () => {
  it('mesma key com payload diferente → conflict (antes de qualquer outra regra)', () => {
    const other = sendFingerprint({ kind: 'text', to: '5522', text: 'oi' });
    expect(
      decideOnExistingIntent(row({ status: 'sent', keyId: 'k' }), other, now),
    ).toEqual({
      kind: 'conflict',
    });
  });

  it('já enviada → replay com keyId/chatJid gravados', () => {
    expect(
      decideOnExistingIntent(
        row({ status: 'sent', keyId: 'ABC', chatJid: '5511@s.whatsapp.net' }),
        fp,
        now,
      ),
    ).toEqual({ kind: 'replay', keyId: 'ABC', chatJid: '5511@s.whatsapp.net' });
  });

  it('pending recente → in-flight; pending antiga (processo caiu) → takeover', () => {
    expect(decideOnExistingIntent(row({}), fp, now)).toEqual({
      kind: 'in-flight',
    });
    expect(
      decideOnExistingIntent(
        row({ updatedAt: new Date(now - PENDING_INTENT_TTL_MS - 1) }),
        fp,
        now,
      ),
    ).toEqual({ kind: 'takeover' });
  });

  it('failed → takeover (retry com a mesma key é permitido)', () => {
    expect(decideOnExistingIntent(row({ status: 'failed' }), fp, now)).toEqual({
      kind: 'takeover',
    });
  });
});

describe('sendFingerprint', () => {
  it('é estável à ordem das chaves e sensível ao conteúdo', () => {
    expect(sendFingerprint({ a: 1, b: 'x' })).toBe(
      sendFingerprint({ b: 'x', a: 1 }),
    );
    expect(sendFingerprint({ a: 1 })).not.toBe(sendFingerprint({ a: 2 }));
    expect(sendFingerprint({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});
