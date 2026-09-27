import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { proto, type WAMessageUpdate } from '@whiskeysockets/baileys';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import { GuardrailService } from '../src/modules/guardrail/guardrail.service';
import { SessionQuarantinedException } from '../src/modules/guardrail/session-quarantined.exception';
import { SessionManager } from '../src/modules/sessions/application/session-manager.service';
import { BaileysEngine } from '../src/modules/sessions/infrastructure/baileys/baileys.engine';
import { WebhookDispatcher } from '../src/modules/webhooks/application/webhook-dispatcher.service';
import { WebhookQueue } from '../src/modules/webhooks/infrastructure/webhook-queue';
import {
  createTestApp,
  fakeSessionManager,
  inject,
  login,
  removeSession,
  seedSession,
} from './setup-app';

// Socket falso + Postgres, HTTP e fila de webhook reais. Nenhuma conta conecta e o método
// sendText da engine falsa só conta chamadas. Isso prova o efeito externo do sinal 463 da rc14.
describe('E8 — restrição Baileys pausa, alerta e retoma sem envio real', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let guardrail: GuardrailService;
  let manager: SessionManager;
  let token: string;
  let webhookId: string;
  const sessionId = 'e8-restriction';
  const end = new Date(Date.now() + 10 * 60_000);
  const sendText = vi.fn(async () => ({
    keyId: `fake-${Math.random()}`,
    jid: '5511999999999@s.whatsapp.net',
  }));
  const sendMedia = vi.fn(async () => ({
    keyId: 'fake-media',
    jid: '5511999999999@s.whatsapp.net',
  }));
  const sendForward = vi.fn(async () => ({
    keyId: 'fake-forward',
    jid: '5511999999999@s.whatsapp.net',
  }));

  const auth = () => ({
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  });
  const postText = (text: string) =>
    inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionId}/messages/text`,
      headers: auth(),
      payload: { to: '5511999999999', text }, // cold=false: a pausa vale também para chat aberto
    });

  beforeAll(async () => {
    const managerOverride = {
      ...fakeSessionManager,
      sendText: (...args: Parameters<SessionManager['sendText']>) =>
        manager.sendText(...args),
    };
    app = await createTestApp(managerOverride);
    prisma = app.get(PrismaService);
    guardrail = app.get(GuardrailService);
    token = await login(app);
    await removeSession(app, sessionId);
    await seedSession(app, sessionId);

    manager = new SessionManager(
      {} as never, // repo: não há boot/reidratação nesta instância
      prisma,
      {} as never,
      app.get(EventBus),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      guardrail,
    );
    const lease = (
      manager as unknown as {
        lease: {
          acquire: (
            id: string,
          ) => Promise<{ epoch: bigint; until: Date } | null>;
        };
      }
    ).lease;
    const fence = await lease.acquire(sessionId);
    if (!fence) throw new Error('lease de teste indisponível');
    (manager as unknown as { owned: Map<string, unknown> }).owned.set(
      sessionId,
      { ...fence, active: true },
    );
    const engine = {
      engineName: 'baileys',
      getStatus: () => 'WORKING',
      sendText,
      sendMedia,
      sendLocation: sendText,
      sendPoll: sendText,
      sendReaction: vi.fn(async () => undefined),
      prepareForward: vi.fn(async () => ({
        forwardingScore: null,
        send: sendForward,
      })),
    };
    (manager as unknown as { engines: Map<string, unknown> }).engines.set(
      sessionId,
      engine,
    );

    const response = await inject(app, {
      method: 'POST',
      url: '/api/webhooks',
      headers: auth(),
      payload: {
        url: 'https://e8-restriction.e2e-webhook.test/hook',
        events: ['session.restricted'],
      },
    });
    expect(response.statusCode).toBe(201);
    webhookId = response.json().id as string;
    await app.get(WebhookDispatcher).refresh();
  });

  afterAll(async () => {
    const internals = manager as unknown as {
      lease: { release: (id: string, epoch: bigint) => Promise<void> };
      owned: Map<string, { epoch: bigint }>;
    };
    const epoch = internals.owned.get(sessionId)?.epoch;
    if (epoch !== undefined) await internals.lease.release(sessionId, epoch);
    await prisma.webhook.deleteMany({ where: { id: webhookId } });
    await removeSession(app, sessionId);
    await app.close();
  });

  it('463 sai da engine, persiste prazo, enfileira alerta e devolve 423 até expirar', async () => {
    const normal = await postText('antes');
    expect(normal.statusCode).toBe(201);
    expect(sendText).toHaveBeenCalledTimes(1);

    await prisma.waMessage.create({
      data: {
        id: 'e8-ack-row',
        sessionId,
        keyId: 'e8-463',
        chatJid: '5511999999999@s.whatsapp.net',
        fromMe: true,
        type: 'text',
        text: 'pode falhar',
        status: 'sent',
        timestamp: new Date(),
      },
    });

    const enqueue = vi.spyOn(app.get(WebhookQueue), 'enqueue');
    const fetch = vi.fn(async () => ({
      isActive: true,
      timeEnforcementEnds: end,
      enforcementType: 'BIZ_QUALITY',
    }));
    const baileys = new BaileysEngine({
      sessionId,
      deviceName: 'e2e',
      prisma,
      logger: { info() {}, warn() {}, error() {}, debug() {}, trace() {} },
      onEvent: (name: string, payload: unknown) =>
        app.get(EventBus).publish({
          name: 'wa.event',
          occurredAt: new Date(),
          payload: {
            id: `e8-${Math.random()}`,
            timestamp: Date.now(),
            event: name,
            sessionId,
            session: sessionId,
            payload,
            engine: 'baileys',
          },
        }),
      onRestrictionSignal: (s: {
        signal: '463' | 'reachoutTimeLock' | 'message-capping';
        until?: Date;
        source?: 'timeEnforcementEnds' | 'cycle_end_timestamp';
        enforcementType?: string;
      }) =>
        guardrail
          .recordReachoutRestriction(sessionId, s.signal, s)
          .then(() => undefined),
    } as never);
    (baileys as unknown as { sock: unknown }).sock = {
      fetchAccountReachoutTimelock: fetch,
    };
    await (
      baileys as unknown as {
        onMessagesUpdate: (u: WAMessageUpdate[]) => Promise<void>;
      }
    ).onMessagesUpdate([
      {
        key: {
          id: 'e8-463',
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: true,
        },
        update: {
          status: proto.WebMessageInfo.Status.ERROR,
          messageStubParameters: ['463'],
        },
      },
    ]);
    expect(fetch).toHaveBeenCalledOnce();
    const row = await prisma.sessionGuardrail.findUnique({
      where: { sessionId },
    });
    expect(row?.restrictionUntil).toEqual(end);
    expect(row?.state).toBe('ativa');
    expect(row?.ultimoSinal).toBe('reachoutTimeLock');
    let failed = await prisma.waMessage.findUnique({
      where: { id: 'e8-ack-row' },
      select: { status: true },
    });
    for (let i = 0; i < 20 && failed?.status !== 'error'; i++) {
      await new Promise((r) => setTimeout(r, 25));
      failed = await prisma.waMessage.findUnique({
        where: { id: 'e8-ack-row' },
        select: { status: true },
      });
    }
    expect(failed?.status).toBe('error');
    const alert = enqueue.mock.calls.find(
      ([job]) =>
        (job.body as { event?: string }).event === 'session.restricted' &&
        (job.body as { payload?: { source?: string } }).payload?.source ===
          'timeEnforcementEnds',
    );
    expect(alert).toBeDefined();
    expect(
      (alert?.[0].body as { payload: { pausedUntil: string } }).payload
        .pausedUntil,
    ).toBe(end.toISOString());

    const blocked = await postText('durante');
    expect(blocked.statusCode).toBe(423);
    expect(blocked.json().code).toBe('SESSION_QUARANTINED');
    expect(sendText).toHaveBeenCalledTimes(1);
    const blockedForward = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionId}/messages/e8-ack-row/forward`,
      headers: auth(),
      payload: { to: ['5511888888888'] },
    });
    expect(blockedForward.statusCode).toBe(423);
    expect(blockedForward.json().code).toBe('SESSION_QUARANTINED');
    expect(blockedForward.json().results[0].status).toBe(423);
    await expect(
      manager.sendMedia(sessionId, '5511999999999', {} as never),
    ).rejects.toBeInstanceOf(SessionQuarantinedException);
    await expect(
      manager.sendReaction(sessionId, 'chat', 'msg', false, '👍'),
    ).rejects.toBeInstanceOf(SessionQuarantinedException);
    const prepared = await manager.prepareForward(sessionId, {} as never);
    await expect(prepared.send('5511999999999', {})).rejects.toBeInstanceOf(
      SessionQuarantinedException,
    );
    expect(sendMedia).not.toHaveBeenCalled();
    expect(sendForward).not.toHaveBeenCalled();

    // O prazo fica gravado como recebido; avançar só o relógio prova a retomada automática.
    const afterDeadline = vi
      .spyOn(Date, 'now')
      .mockReturnValue(end.getTime() + 1);
    try {
      // O relógio sintético avança além do TTL local; o lease real do Postgres continua válido.
      (manager as unknown as { owned: Map<string, { until: Date }> }).owned.get(
        sessionId,
      )!.until = new Date(end.getTime() + 60_000);
      const resumed = await postText('depois');
      expect(resumed.statusCode).toBe(201);
      expect(sendText).toHaveBeenCalledTimes(2);
      const health = await guardrail.health(sessionId);
      expect(health.state).toBe('ativa');
      expect(health.restriction_until).toBeNull();
      const persisted = await prisma.sessionGuardrail.findUnique({
        where: { sessionId },
        select: { restrictionUntil: true },
      });
      expect(persisted?.restrictionUntil).toEqual(end);
    } finally {
      afterDeadline.mockRestore();
    }
  });
});
