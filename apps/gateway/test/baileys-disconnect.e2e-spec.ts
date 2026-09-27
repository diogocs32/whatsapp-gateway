import { Boom } from '@hapi/boom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import { MetricsService } from '../src/modules/observability/metrics.service';
import { SessionManager } from '../src/modules/sessions/application/session-manager.service';
import { PrismaSessionRepository } from '../src/modules/sessions/infrastructure/prisma-session.repository';
import { BaileysEngine } from '../src/modules/sessions/infrastructure/baileys/baileys.engine';
import { WebhookDispatcher } from '../src/modules/webhooks/application/webhook-dispatcher.service';
import { WebhookQueue } from '../src/modules/webhooks/infrastructure/webhook-queue';
import {
  createTestApp,
  inject,
  login,
  removeSession,
  seedSession,
} from './setup-app';

// Postgres + rota HTTP + EventBus + fila reais; socket Baileys falso, sem conta ou rede WhatsApp.
describe('E9 — 405 persiste diagnóstico, alerta integrador e conta métrica', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let webhookId: string;
  const sessionId = 'e9-client-too-old';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
    await removeSession(app, sessionId);
    await seedSession(app, sessionId);
    const webhook = await inject(app, {
      method: 'POST',
      url: '/api/webhooks',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: {
        url: 'https://e9-disconnect.e2e-webhook.test/hook',
        events: ['session.client_too_old', 'session.status'],
      },
    });
    expect(webhook.statusCode).toBe(201);
    webhookId = webhook.json().id as string;
    await app.get(WebhookDispatcher).refresh();
  });

  afterAll(async () => {
    if (webhookId)
      await prisma.webhook.deleteMany({ where: { id: webhookId } });
    await removeSession(app, sessionId);
    await app.close();
  });

  it('GET sessão mantém lastError string e acrescenta lastErrorDetails; webhook e métrica recebem 405', async () => {
    const manager = new SessionManager(
      new PrismaSessionRepository(prisma),
      prisma,
      {} as never,
      app.get(EventBus),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const internals = manager as unknown as {
      lease: {
        acquire: (id: string) => Promise<{ epoch: bigint; until: Date } | null>;
        release: (id: string, epoch: bigint) => Promise<void>;
      };
      owned: Map<string, unknown>;
    };
    const fence = await internals.lease.acquire(sessionId);
    if (!fence) throw new Error('lease de teste indisponível');
    internals.owned.set(sessionId, { ...fence, active: true });
    const pending: Promise<void>[] = [];
    const handle = (
      manager as unknown as {
        handleEngineEvent: (
          id: string,
          name: string,
          payload: unknown,
        ) => Promise<void>;
      }
    ).handleEngineEvent.bind(manager);
    const enqueue = vi.spyOn(app.get(WebhookQueue), 'enqueue');
    const baileys = new BaileysEngine({
      sessionId,
      deviceName: 'e2e',
      prisma,
      logger: { info() {}, warn() {}, error() {}, debug() {}, trace() {} },
      onEvent: (name: string, payload: unknown) => {
        pending.push(handle(sessionId, name, payload));
      },
    } as never);
    (
      baileys as unknown as {
        sock: unknown;
        onConnectionUpdate: (u: Record<string, unknown>) => Promise<void>;
      }
    ).sock = {
      end: vi.fn(),
      ev: { removeAllListeners: vi.fn() },
    };
    await (
      baileys as unknown as {
        onConnectionUpdate: (u: Record<string, unknown>) => Promise<void>;
      }
    ).onConnectionUpdate({
      connection: 'close',
      lastDisconnect: {
        error: new Boom('Connection Failure', { statusCode: 405 }),
      },
    });
    await Promise.all(pending);

    const row = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(row.status).toBe('FAILED');
    expect(row.lastError).toEqual(expect.any(String));
    expect(row.lastErrorDetails).toMatchObject({
      code: 405,
      reason: 'Connection Failure',
    });

    const response = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      lastError: expect.any(String),
      lastErrorDetails: { code: 405, reason: 'Connection Failure' },
    });

    await vi.waitFor(() =>
      expect(
        enqueue.mock.calls.find(
          ([job]) =>
            (job.body as { event?: string }).event === 'session.client_too_old',
        ),
      ).toBeDefined(),
    );
    const alert = enqueue.mock.calls.find(
      ([job]) =>
        (job.body as { event?: string }).event === 'session.client_too_old',
    );
    expect((alert?.[0].body as { payload: unknown }).payload).toMatchObject({
      code: 405,
      reason: 'Connection Failure',
    });

    const scrape = await app.get(MetricsService).collect();
    expect(scrape).toMatch(
      /wa_disconnects_total\{engine="baileys",code="405"\} [1-9]\d*/,
    );
    await internals.lease.release(sessionId, fence.epoch);
  });
});
