import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import { WebhookDispatcher } from '../src/modules/webhooks/application/webhook-dispatcher.service';
import { WebhookQueue } from '../src/modules/webhooks/infrastructure/webhook-queue';
import { createTestApp, inject, login } from './setup-app';

describe('Webhooks (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
  });
  afterAll(async () => {
    await prisma.webhook.deleteMany({
      where: { url: { contains: 'e2e-webhook.test' } },
    });
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });

  it('GET /api/webhooks sem auth → 401', async () => {
    const res = await inject(app, { method: 'GET', url: '/api/webhooks' });
    expect(res.statusCode).toBe(401);
  });

  it('url inválida → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { url: 'nao-eh-url', events: ['*'] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('cria webhook → 201, não vaza o secret e aparece na listagem', async () => {
    const url = 'https://e2e-webhook.test/hook';
    const create = await inject(app, {
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: {
        url,
        events: ['message'],
        secret: 'segredo-super-secreto-123',
      },
    });
    expect(create.statusCode).toBe(201);
    const dto = create.json();
    expect(dto.hasSecret).toBe(true);
    expect(JSON.stringify(dto)).not.toContain('segredo-super-secreto-123');

    const list = await inject(app, {
      method: 'GET',
      url: '/api/webhooks',
      headers: auth(),
    });
    expect(list.json().some((w: { url: string }) => w.url === url)).toBe(true);

    await inject(app, {
      method: 'DELETE',
      url: `/api/webhooks/${dto.id}`,
      headers: auth(),
    });
  });

  // Regressão do item 25: o jobId de dedup do fan-out usava ':' e o BullMQ REJEITA
  // ("Custom Id cannot contain :") — todo enqueue lançava e NENHUM webhook saía (n8n mudo).
  // Este teste exercita o caminho real EventBus → dispatcher → fila e falha se o job não entrar.
  it('evento no EventBus vira job na fila de webhooks (jobId de dedup válido)', async () => {
    const create = await inject(app, {
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: {
        url: 'https://e2e-webhook.test/regressao',
        events: ['message'],
      },
    });
    expect(create.statusCode).toBe(201);
    const webhookId = create.json().id as string;
    await app.get(WebhookDispatcher).refresh();

    const envelopeId = `e2e-env-${Math.random().toString(36).slice(2, 10)}`;
    app.get(EventBus).publish({
      name: 'wa.event',
      occurredAt: new Date(),
      payload: {
        id: envelopeId,
        timestamp: Date.now(),
        event: 'message',
        sessionId: 'e2e-webhook-session',
        session: 'e2e-webhook-session',
        payload: { text: 'oi' },
        engine: 'baileys',
      },
    });

    // O enqueue é fire-and-forget — polling curto até o job aparecer na fila.
    const queue = (
      app.get(WebhookQueue) as unknown as {
        queue: {
          getJob: (
            id: string,
          ) => Promise<{ remove: () => Promise<void> } | undefined>;
        };
      }
    ).queue;
    let job: { remove: () => Promise<void> } | undefined;
    for (let i = 0; i < 20 && !job; i++) {
      await new Promise((r) => setTimeout(r, 100));
      job = await queue.getJob(`${envelopeId}-${webhookId}`);
    }
    expect(job).toBeTruthy();
    await job?.remove();

    await inject(app, {
      method: 'DELETE',
      url: `/api/webhooks/${webhookId}`,
      headers: auth(),
    });
  });
});
