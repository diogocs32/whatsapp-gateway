import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import { GuardrailService } from '../src/modules/guardrail/guardrail.service';
import type { WaEventEnvelope } from '../src/modules/sessions/application/engine.port';
import { WebhookQueue } from '../src/modules/webhooks/infrastructure/webhook-queue';
import { createTestApp, login, removeSession, seedSession } from './setup-app';

// G6 — catálogo de eventos OUT do guard-rail + dead-letter (C4). Captura eventos pelo EventBus
// (mesmo barramento que o WebhookDispatcher consome).
describe('G6 eventos guard-rail + dead-letter (e2e)', () => {
  let app: NestFastifyApplication;
  let guardrail: GuardrailService;
  let eventBus: EventBus;
  let queue: WebhookQueue;
  let prisma: PrismaService;
  const sessionId = 'g6';

  // Resolve com o 1º envelope cujo event === `event` p/ a sessão; null após `ms`.
  const waitEvent = (event: string, ms = 2500) =>
    Promise.race([
      new Promise<WaEventEnvelope>((resolve) => {
        eventBus.subscribe('wa.event', (e) => {
          const env = e.payload as WaEventEnvelope;
          if (env.event === event && env.sessionId === sessionId) resolve(env);
        });
      }),
      new Promise<null>((r) => setTimeout(() => r(null), ms)),
    ]);

  beforeAll(async () => {
    app = await createTestApp();
    guardrail = app.get(GuardrailService);
    eventBus = app.get(EventBus);
    queue = app.get(WebhookQueue);
    prisma = app.get(PrismaService);
    await login(app);
    await removeSession(app, sessionId);
    await seedSession(app, sessionId);
  });
  afterAll(async () => {
    await prisma.webhookDeadLetter.deleteMany({ where: { id: 'g6-dl' } });
    await prisma.webhook.deleteMany({ where: { id: 'g6-wh' } });
    await removeSession(app, sessionId);
    await app.close();
  });

  it('transição p/ quarentena emite session.quarantined com payload', async () => {
    const got = waitEvent('session.quarantined');
    await guardrail.setManualState(sessionId, 'quarantine');
    const env = await got;
    expect(env).not.toBeNull();
    const payload = (env as WaEventEnvelope).payload as Record<string, unknown>;
    expect(String(payload.motivo)).toContain('override');
    expect(payload).toHaveProperty('cooldown_ate');
    expect(payload).toHaveProperty('reply_rate');
    expect(payload).toHaveProperty('amostra');
  });

  it('cold bloqueado emite send.blocked', async () => {
    const got = waitEvent('send.blocked'); // sessão segue em quarentena do teste anterior
    const gate = await guardrail.canSendCold(sessionId);
    expect(gate.allowed).toBe(false);
    const env = await got;
    expect(env).not.toBeNull();
  });

  it('dead-letter: reconciliação reentrega pendentes e marca redeliveredAt', async () => {
    await prisma.webhook.create({
      data: {
        id: 'g6-wh',
        url: 'http://e2e-webhook.test/dl',
        events: ['*'],
        enabled: true,
        maxAttempts: 3,
      },
    });
    await prisma.webhookDeadLetter.create({
      data: {
        id: 'g6-dl',
        webhookId: 'g6-wh',
        url: 'http://e2e-webhook.test/dl',
        body: { hello: 'world' },
      },
    });
    const res = await queue.redeliverDeadLetters();
    expect(res.redelivered).toBeGreaterThanOrEqual(1);
    const dl = await prisma.webhookDeadLetter.findUnique({
      where: { id: 'g6-dl' },
    });
    expect(dl?.redeliveredAt).not.toBeNull();
  });
});
