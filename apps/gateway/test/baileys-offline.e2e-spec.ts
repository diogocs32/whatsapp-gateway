import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { proto, type WAMessage } from '@whiskeysockets/baileys';
import { BaileysEngine } from '../src/modules/sessions/infrastructure/baileys/baileys.engine';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import { WebhookDispatcher } from '../src/modules/webhooks/application/webhook-dispatcher.service';
import { WebhookQueue } from '../src/modules/webhooks/infrastructure/webhook-queue';
import { createTestApp, inject, login, removeSession } from './setup-app';

describe('E7 — fila offline Baileys atravessa banco, webhook, Inbox e reply-rate', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let webhookId: string;
  const sessionId = 'e7-offline';
  const peer = '5511987659090@s.whatsapp.net';
  const now = () => Math.floor(Date.now() / 1000);
  const auth = () => ({ authorization: `Bearer ${token}` });

  async function until<T>(
    read: () => Promise<T>,
    ok: (value: T) => boolean,
  ): Promise<T> {
    let value = await read();
    for (let i = 0; i < 40 && !ok(value); i++) {
      await new Promise((r) => setTimeout(r, 50));
      value = await read();
    }
    return value;
  }

  function engine() {
    const e = new BaileysEngine({
      sessionId,
      deviceName: 'e2e',
      prisma,
      logger: { info() {}, warn() {}, error() {}, debug() {}, trace() {} },
      onEvent: (name: string, payload: unknown) =>
        app.get(EventBus).publish({
          name: 'wa.event',
          occurredAt: new Date(),
          payload: {
            id: `e7-${Math.random().toString(36).slice(2)}`,
            timestamp: Date.now(),
            event: name,
            sessionId,
            session: sessionId,
            payload,
            engine: 'baileys',
          },
        }),
      resolveAgent: async () => null,
      resolveProxyConfig: async () => null,
    } as never);
    (e as unknown as { sock: unknown }).sock = {
      user: { id: '5511000000000@s.whatsapp.net' },
    };
    return (messages: WAMessage[], type: string) =>
      (
        e as unknown as {
          onMessagesUpsert: (u: {
            messages: WAMessage[];
            type: string;
          }) => Promise<void>;
        }
      ).onMessagesUpsert({ messages, type });
  }

  const message = (
    id: string,
    text: string,
    timestamp: number,
    fromMe = false,
  ): WAMessage =>
    ({
      key: { id, remoteJid: peer, fromMe },
      message: proto.Message.fromObject({ conversation: text }),
      messageTimestamp: timestamp,
    }) as WAMessage;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
    await removeSession(app, sessionId);
    await prisma.waSession.create({ data: { id: sessionId, name: sessionId } });
    const response = await inject(app, {
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: {
        url: 'https://e7-offline.e2e-webhook.test/hook',
        events: ['message'],
      },
    });
    expect(response.statusCode).toBe(201);
    webhookId = response.json().id as string;
    await app.get(WebhookDispatcher).refresh();
  });

  afterAll(async () => {
    await prisma.webhook.deleteMany({ where: { id: webhookId } });
    await removeSession(app, sessionId);
    await app.close();
  });

  it('lote misto e replay após restart geram uma resposta persistida e um webhook', async () => {
    const coldAt = new Date(Date.now() - 96 * 3_600_000);
    await prisma.waMessage.create({
      data: {
        id: 'e7-cold',
        sessionId,
        keyId: 'E7-COLD',
        chatJid: peer,
        fromMe: true,
        source: 'api',
        isCold: true,
        type: 'text',
        text: 'olá',
        timestamp: coldAt,
      },
    });
    const enqueue = vi.spyOn(app.get(WebhookQueue), 'enqueue');
    const received = message(
      'E7-IN',
      'resposta durante queda',
      now() - 47 * 3600,
    );
    const first = engine();
    await first(
      [
        received,
        message('E7-ECO', 'nosso eco', now(), true),
        {
          ...message('E7-NEWS', 'canal', now()),
          key: { id: 'E7-NEWS', remoteJid: '123@newsletter' },
        },
        {
          ...message('E7-STATUS', 'status', now()),
          key: { id: 'E7-STATUS', remoteJid: 'status@broadcast' },
        },
        message('E7-OLD', 'antiga', now() - 49 * 3600),
        {
          ...message('E7-REA', 'x', now()),
          message: proto.Message.fromObject({
            reactionMessage: {
              key: { id: 'E7-COLD', remoteJid: peer },
              text: '👍',
            },
          }),
        },
        received,
      ],
      'append',
    );
    await first([received], 'notify');
    await first(
      [
        {
          ...message('E7-LIVE', 'ao vivo', now()),
          key: {
            id: 'E7-LIVE',
            remoteJid: '5511987659091@s.whatsapp.net',
            fromMe: false,
          },
        },
      ],
      'notify',
    );

    const rows = await until(
      () => prisma.waMessage.findMany({ where: { sessionId, keyId: 'E7-IN' } }),
      (r) => r.length === 1,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      fromMe: false,
      text: 'resposta durante queda',
      raw: { conversation: 'resposta durante queda' },
    });
    await until(
      async () =>
        enqueue.mock.calls.filter(
          ([job]) =>
            (job.body as { sessionId?: string; payload?: { keyId?: string } })
              .sessionId === sessionId &&
            (job.body as { payload?: { keyId?: string } }).payload?.keyId ===
              'E7-IN',
        ).length,
      (n) => n === 1,
    );
    // Instância nova = cache vazio; o banco segura o replay antes de webhook/SSE.
    await engine()([received], 'append');
    expect(
      await prisma.waMessage.count({ where: { sessionId, keyId: 'E7-IN' } }),
    ).toBe(1);
    expect(
      await until(
        () =>
          prisma.waMessage.count({ where: { sessionId, keyId: 'E7-LIVE' } }),
        (n) => n === 1,
      ),
    ).toBe(1);
    expect(
      enqueue.mock.calls.filter(
        ([job]) =>
          (job.body as { payload?: { keyId?: string } }).payload?.keyId ===
          'E7-IN',
      ),
    ).toHaveLength(1);
    expect(
      await prisma.waMessage.count({
        where: {
          sessionId,
          keyId: { in: ['E7-ECO', 'E7-NEWS', 'E7-STATUS', 'E7-OLD', 'E7-REA'] },
        },
      }),
    ).toBe(0);

    const inbox = await inject(app, {
      method: 'GET',
      url: `/api/inbox/conversations?sessions=${sessionId}`,
      headers: auth(),
    });
    expect(inbox.statusCode).toBe(200);
    expect(inbox.json().conversations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chatJid: peer,
          status: 'pending',
          lastInboundKeyId: 'E7-IN',
        }),
      ]),
    );
    const rate = await inject(app, {
      method: 'GET',
      url: `/api/observability/reply-rate/${sessionId}?window=7`,
      headers: auth(),
    });
    expect(rate.statusCode).toBe(200);
    expect(rate.json()).toMatchObject({
      coldMature: 1,
      responded: 1,
      replyRate: 1,
    });
    enqueue.mockRestore();
  });
});
