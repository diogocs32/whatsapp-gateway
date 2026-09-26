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
    // A notificação da rc14 fabrica now+60 s quando o servidor omite o prazo.
    // Mesmo com Date, só o RPC pode confirmar timeEnforcementEnds.
    expect(h.signals[0]).toMatchObject({
      signal: 'reachoutTimeLock',
      source: 'temporary',
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

  it('notificação provisória é substituída pelo prazo confirmado no RPC', async () => {
    const notificationEnd = new Date(Date.now() + 60_000);
    const confirmedEnd = new Date(Date.now() + 10 * 60_000);
    const fetch = vi.fn(async () => ({
      isActive: true,
      timeEnforcementEnds: confirmedEnd,
    }));
    const h = harness(fetch);
    await h.connection({
      isActive: true,
      timeEnforcementEnds: notificationEnd,
    });
    expect(h.signals[0]).toMatchObject({
      signal: 'reachoutTimeLock',
      source: 'temporary',
    });
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce();
      expect(h.signals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            signal: 'reachoutTimeLock',
            until: confirmedEnd,
            source: 'timeEnforcementEnds',
          }),
        ]),
      );
    });
  });

  it('RPC ativo sem prazo remoto não confirma a data fabricada pela notificação', async () => {
    const h = harness(async () => ({ isActive: true }));
    await h.connection({
      isActive: true,
      timeEnforcementEnds: new Date(Date.now() + 60_000),
    });
    await vi.waitFor(() => expect(h.signals).toHaveLength(2));
    expect(h.signals.some((s) => s.source === 'timeEnforcementEnds')).toBe(
      false,
    );
    expect(h.signals.filter((s) => s.signal === 'reachoutTimeLock')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'temporary' }),
      ]),
    );
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

  it('RPC que responde depois do timeout ainda confirma o prazo sem segurar o ACK', async () => {
    vi.useFakeTimers();
    let resolveFetch!: (state: {
      isActive: boolean;
      timeEnforcementEnds: Date;
    }) => void;
    const fetch = vi.fn(
      () =>
        new Promise<{
          isActive: boolean;
          timeEnforcementEnds: Date;
        }>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const h = harness(fetch);
    const pending = h.update('463');
    await vi.advanceTimersByTimeAsync(3_001);
    await pending;
    expect(fetch).toHaveBeenCalledOnce();
    expect(h.signals).toEqual([{ signal: '463' }]);
    expect(h.events).toEqual(['message.ack']);

    const confirmedEnd = new Date(Date.now() + 10 * 60_000);
    resolveFetch({ isActive: true, timeEnforcementEnds: confirmedEnd });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.signals).toEqual([
      { signal: '463' },
      {
        signal: 'reachoutTimeLock',
        until: confirmedEnd,
        source: 'timeEnforcementEnds',
        enforcementType: undefined,
      },
    ]);
  });
});
