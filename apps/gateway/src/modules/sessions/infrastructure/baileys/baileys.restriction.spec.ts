import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NewChatMessageCappingStatusType,
  proto,
  type NewChatMessageCapInfo,
  type WAMessageUpdate,
} from '@whiskeysockets/baileys';
import { processErrorTotals } from '../../../../shared-kernel/process-errors';
import type { ReachoutRestrictionSignal } from '../../application/engine.port';
import { BaileysEngine } from './baileys.engine';

function harness(
  fetch: () => Promise<{
    isActive?: boolean;
    timeEnforcementEnds?: Date;
    enforcementType?: string;
  }>,
) {
  const signals: ReachoutRestrictionSignal[] = [];
  const events: string[] = [];
  const warn = vi.fn();
  const engine = new BaileysEngine({
    sessionId: 'restriction-test',
    deviceName: 'test',
    prisma: {} as never,
    logger: { info() {}, warn, error() {}, debug() {}, trace() {} } as never,
    onEvent: (name: string) => events.push(name),
    onRestrictionSignal: async (signal: ReachoutRestrictionSignal) => {
      signals.push(signal);
    },
  } as never);
  (engine as unknown as { sock: unknown }).sock = {
    fetchAccountReachoutTimelock: fetch,
  };
  const update = (code: string, status = proto.WebMessageInfo.Status.ERROR) =>
    (
      engine as unknown as {
        onMessagesUpdate: (updates: WAMessageUpdate[]) => Promise<void>;
      }
    ).onMessagesUpdate([
      {
        key: {
          id: 'out-1',
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: true,
        },
        update: { status, messageStubParameters: [code] },
      },
    ]);
  const capping = (info: NewChatMessageCapInfo) =>
    (
      engine as unknown as {
        onMessageCapping: (i: NewChatMessageCapInfo) => Promise<void>;
      }
    ).onMessageCapping(info);
  const connection = (lock: {
    isActive: boolean;
    timeEnforcementEnds?: Date;
    enforcementType?: string;
  }) =>
    (
      engine as unknown as {
        onConnectionUpdate: (u: {
          reachoutTimeLock: typeof lock;
        }) => Promise<void>;
      }
    ).onConnectionUpdate({ reachoutTimeLock: lock });
  return { signals, events, warn, update, capping, connection };
}

afterEach(() => vi.useRealTimers());

describe('Baileys rc14 — sinais nativos de restrição (E8)', () => {
  it('ERROR 463 pausa antes da consulta e usa o timeEnforcementEnds retornado', async () => {
    const end = new Date(Date.now() + 10 * 60_000);
    const fetch = vi.fn(async () => ({
      isActive: true,
      timeEnforcementEnds: end,
      enforcementType: 'BIZ_QUALITY',
    }));
    const h = harness(fetch);
    await h.update('463');
    expect(fetch).toHaveBeenCalledOnce();
    expect(h.signals).toEqual([
      { signal: '463' },
      {
        signal: 'reachoutTimeLock',
        until: end,
        source: 'timeEnforcementEnds',
        enforcementType: 'BIZ_QUALITY',
      },
    ]);
    expect(h.events).toEqual(['message.ack']); // ERROR é persistido sem virar sent/delivered/read
  });

  it('connection.update ativo e capping CAPPED são sinais; warning não pausa', async () => {
    const end = new Date(Date.now() + 120_000);
    const fetch = vi.fn(async () => ({ isActive: false }));
    const h = harness(fetch);
    await h.connection({
      isActive: true,
      timeEnforcementEnds: end,
      enforcementType: 'WEB_COMPANION_ONLY',
    });
    await h.capping({
      capping_status: NewChatMessageCappingStatusType.FIRST_WARNING,
    });
    expect(h.signals).toHaveLength(1);
    await h.capping({
      capping_status: NewChatMessageCappingStatusType.CAPPED,
      cycle_end_timestamp: String(Math.floor(end.getTime() / 1000)),
    });
    expect(h.signals[1]).toMatchObject({
      signal: 'message-capping',
      source: 'cycle_end_timestamp',
    });
    expect(h.signals[1].until?.getTime()).toBe(
      Math.floor(end.getTime() / 1000) * 1000,
    );
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('consulta pendurada vence em 3 s; 479 só é contado e ACK normal preservado', async () => {
    vi.useFakeTimers();
    const h = harness(() => new Promise(() => undefined));
    const pending = h.update('463');
    await vi.advanceTimersByTimeAsync(3_001);
    await pending;
    expect(h.signals).toEqual([{ signal: '463' }]);
    expect(h.warn).toHaveBeenCalled();
    const before = processErrorTotals().baileys_ack_479 ?? 0;
    await h.update('479');
    expect(processErrorTotals().baileys_ack_479).toBe(before + 1);
    await h.update('', proto.WebMessageInfo.Status.SERVER_ACK);
    expect(h.events).toEqual(['message.ack', 'message.ack', 'message.ack']);
  });
});
