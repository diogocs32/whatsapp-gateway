import { Boom } from '@hapi/boom';
import { ConfigService } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type {
  AuthenticationState,
  ConnectionState,
  WASocket,
} from '@whiskeysockets/baileys';
import type { Job, Queue } from 'bullmq';
import { EventEmitter } from 'node:events';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ContactDirectory } from '../src/infra/directory/contact-directory.service';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import type { DomainEvent } from '../src/shared-kernel/domain-event';
import type {
  SessionStatePayload,
  WaEventEnvelope,
} from '../src/modules/sessions/application/engine.port';
import { SessionManager } from '../src/modules/sessions/application/session-manager.service';
import type { SessionRepository } from '../src/modules/sessions/domain/session.repository';
import {
  BaileysEngine,
  type BaileysEngineDeps,
} from '../src/modules/sessions/infrastructure/baileys/baileys.engine';
import { usePostgresAuthState } from '../src/modules/sessions/infrastructure/baileys/postgres-auth-state';
import { PrismaSessionRepository } from '../src/modules/sessions/infrastructure/prisma-session.repository';
import { WebhookDispatcher } from '../src/modules/webhooks/application/webhook-dispatcher.service';
import {
  WebhookQueue,
  type WebhookJob,
} from '../src/modules/webhooks/infrastructure/webhook-queue';
import {
  createTestApp,
  fakeSessionManager,
  inject,
  login,
  removeSession,
} from './setup-app';

const reason = 'QR refs attempts ended';
const diagnostic = { code: 408, reason };
const sessionIds = [
  'e21-qr-exhaustion-effects',
  'e21-qr-exhaustion-lease-lost',
  'e21-qr-exhaustion-pairing-in-progress',
];

type FakeSocket = {
  authState: AuthenticationState;
  user?: { id: string; name?: string };
  end: ReturnType<typeof vi.fn>;
  ev: EventEmitter;
};

type EngineInternals = {
  sock: FakeSocket | null;
  pairingReadySock: FakeSocket | null;
  reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  stopped: boolean;
  connect: () => Promise<void>;
  setStatus: (
    status: SessionStatePayload['status'],
    extra?: Partial<SessionStatePayload>,
  ) => void;
  serialize: <T>(fn: () => Promise<T>) => Promise<T>;
  onConnectionUpdate: (
    update: Partial<ConnectionState>,
    socket?: WASocket,
  ) => Promise<void>;
};

// PostgreSQL/lease, manager, engine, EventBus, timeline, HTTP e fila Redis reais.
// Só connect() é substituído: nenhum makeWASocket, QR de conta ou transporte WhatsApp.
describe('E21/P-018/P-091 — QR inicial esgotado para sem reidratar', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let webhookId: string;
  let manualManager: SessionManager;
  const managers: SessionManager[] = [];
  const events: WaEventEnvelope[] = [];
  const collect = (event: DomainEvent): void => {
    const envelope = event.payload as WaEventEnvelope;
    if (sessionIds.includes(envelope.sessionId)) events.push(envelope);
  };

  function manager(
    repo: SessionRepository = new PrismaSessionRepository(prisma),
  ) {
    const engines = new Map<string, BaileysEngine>();
    const sockets = new Map<string, FakeSocket>();
    const authStores = new Map<
      string,
      Awaited<ReturnType<typeof usePostgresAuthState>>
    >();
    const callbacks = new Map<string, BaileysEngineDeps>();
    const starts = vi.fn();
    const factory = {
      create: vi.fn((_type: string, deps: BaileysEngineDeps) => {
        const engine = new BaileysEngine(deps);
        const internal = engine as unknown as EngineInternals;
        callbacks.set(deps.sessionId, deps);
        vi.spyOn(internal, 'connect').mockImplementation(async () => {
          starts(deps.sessionId);
          const store = await usePostgresAuthState(
            prisma,
            deps.sessionId,
            deps.lease!,
            deps.authEpoch!,
          );
          await store.saveCreds();
          const socket: FakeSocket = {
            authState: store.state,
            end: vi.fn(),
            ev: new EventEmitter(),
          };
          vi.spyOn(socket.ev, 'removeAllListeners');
          socket.ev.on('connection.update', () => undefined);
          internal.sock = socket;
          internal.pairingReadySock = socket;
          internal.setStatus('STARTING');
          sockets.set(deps.sessionId, socket);
          authStores.set(deps.sessionId, store);
          await internal.onConnectionUpdate(
            { qr: `synthetic-${deps.sessionId}` },
            socket as unknown as WASocket,
          );
        });
        engines.set(deps.sessionId, engine);
        return engine;
      }),
    };
    const instance = new SessionManager(
      repo,
      prisma,
      app.get(ConfigService),
      app.get(EventBus),
      {} as never,
      {} as never,
      app.get(ContactDirectory),
      factory as never,
      {} as never,
    );
    managers.push(instance);
    return {
      instance,
      engines,
      sockets,
      authStores,
      callbacks,
      starts,
      factory,
    };
  }

  async function flushStatus(instance: SessionManager, sessionId: string) {
    await (
      instance as unknown as { statusWrites: Map<string, Promise<void>> }
    ).statusWrites.get(sessionId);
  }

  async function close(
    owner: ReturnType<typeof manager>,
    sessionId: string,
    socket = owner.sockets.get(sessionId)!,
  ) {
    const internal = owner.engines.get(
      sessionId,
    )! as unknown as EngineInternals;
    // Mesmo mutex do callback real: chamar stop() de dentro dele causaria deadlock.
    await internal.serialize(() =>
      internal.onConnectionUpdate(
        {
          connection: 'close',
          lastDisconnect: {
            error: new Boom(reason, { statusCode: 408 }),
            date: new Date(),
          },
        },
        socket as unknown as WASocket,
      ),
    );
    await flushStatus(owner.instance, sessionId);
  }

  beforeAll(async () => {
    // O app HTTP não reidrata. A ação manual só chega ao manager real escolhido pelo teste.
    app = await createTestApp({
      ...fakeSessionManager,
      start: (id: string) => manualManager.start(id),
    });
    prisma = app.get(PrismaService);
    token = await login(app);
    for (const id of sessionIds) {
      await removeSession(app, id);
      await prisma.waSession.create({
        data: { id, name: id, status: 'STOPPED', autostart: false },
      });
    }
    app.get(EventBus).subscribe('wa.event', collect);
    const webhook = await inject(app, {
      method: 'POST',
      url: '/api/webhooks',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: {
        sessionId: sessionIds[0],
        url: 'https://e21-qr-exhaustion.e2e-webhook.test/hook',
        events: ['session.status'],
      },
    });
    expect(webhook.statusCode).toBe(201);
    webhookId = webhook.json().id as string;
    await app.get(WebhookDispatcher).refresh();
  });

  afterAll(async () => {
    for (const instance of managers) await instance.onModuleDestroy();
    app.get(EventBus).unsubscribe('wa.event', collect);
    const queue = (app.get(WebhookQueue) as unknown as { queue: Queue }).queue;
    // Limpa só jobs/fixtures deste spec; nunca drena a fila nem lê sessões para operá-las.
    for (const event of events) {
      const job = await queue.getJob(`${event.id}-${webhookId}`);
      await job?.remove();
    }
    if (webhookId)
      await prisma.webhook.deleteMany({ where: { id: webhookId } });
    for (const id of sessionIds) await removeSession(app, id);
    await app.close();
  });

  it('persiste STOPPED/diagnóstico, conserva auth, enfileira webhook e só volta a SCAN por start manual', async () => {
    const sessionId = sessionIds[0];
    const owner = manager();
    await owner.instance.start(sessionId);
    await flushStatus(owner.instance, sessionId);
    await owner.authStores.get(sessionId)!.state.keys.set({
      session: { 'synthetic-key': { value: 'preserve-on-exhaustion' } },
    } as never);
    await prisma.waSession.update({
      where: { id: sessionId },
      data: { autostart: true },
    });
    const before = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    const keysBefore = await prisma.waAuthKey.findMany({
      where: { sessionId },
    });
    const socket = owner.sockets.get(sessionId)!;
    const internal = owner.engines.get(
      sessionId,
    )! as unknown as EngineInternals;
    expect(owner.instance.liveView(sessionId)).toMatchObject({
      status: 'SCAN_QR_CODE',
      qr: expect.any(String),
    });
    internal.reconnectTimer = setTimeout(() => undefined, 300_000);
    await close(owner, sessionId);

    const stopped = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(stopped.status).toBe('STOPPED');
    expect(stopped.lastError).toContain('QRs esgotados');
    expect(stopped.lastErrorDetails).toEqual(diagnostic);
    expect(stopped.autostart).toBe(true);
    expect(stopped.creds).toEqual(before.creds);
    expect(stopped.authEpoch).toBe(before.authEpoch);
    expect(await prisma.waAuthKey.findMany({ where: { sessionId } })).toEqual(
      keysBefore,
    );
    expect(internal.stopped).toBe(true);
    expect(internal.sock).toBeNull();
    expect(internal.pairingReadySock).toBeNull();
    expect(internal.reconnectTimer).toBeUndefined();
    expect(socket.end).toHaveBeenCalledOnce();
    expect(socket.ev.removeAllListeners).toHaveBeenCalledWith(
      'connection.update',
    );
    expect(socket.ev.listenerCount('connection.update')).toBe(0);
    expect(owner.instance.liveView(sessionId)).toEqual({
      status: 'STOPPED',
      qr: null,
    });

    const response = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'STOPPED',
      lastError: stopped.lastError,
      lastErrorDetails: diagnostic,
      autostart: true,
    });
    await vi.waitFor(async () => {
      expect(
        await prisma.waSessionEvent.findFirst({
          where: { sessionId, status: 'STOPPED', detail: stopped.lastError },
        }),
      ).not.toBeNull();
    });
    const event = events.find(
      (envelope) =>
        envelope.sessionId === sessionId &&
        (envelope.payload as SessionStatePayload).status === 'STOPPED',
    );
    expect(event).toMatchObject({
      event: 'session.status',
      engine: 'baileys',
      payload: {
        status: 'STOPPED',
        error: stopped.lastError,
        lastErrorDetails: diagnostic,
      },
    });
    const queue = (
      app.get(WebhookQueue) as unknown as { queue: Queue<WebhookJob> }
    ).queue;
    let job: Job<WebhookJob> | undefined;
    await vi.waitFor(async () => {
      job = await queue.getJob(`${event!.id}-${webhookId}`);
      expect(job).toBeDefined();
    });
    expect(job!.data.body).toMatchObject({
      event: 'session.status',
      sessionId,
      payload: { status: 'STOPPED', lastErrorDetails: diagnostic },
    });

    await owner.instance.onModuleDestroy();
    const repo = new PrismaSessionRepository(prisma);
    expect((await repo.findAutostart()).some((s) => s.id === sessionId)).toBe(
      false,
    );
    const findAutostart = repo.findAutostart.bind(repo);
    vi.spyOn(repo, 'findAutostart').mockImplementation(async () =>
      (await findAutostart()).filter((s) => s.id === sessionId),
    );
    const boot = manager(repo);
    await boot.instance.onApplicationBootstrap();
    await boot.instance.whenRehydrated();
    expect(boot.factory.create).not.toHaveBeenCalled();
    expect(boot.starts).not.toHaveBeenCalled();
    expect(boot.instance.hasEngine(sessionId)).toBe(false);
    expect(
      (await prisma.waSession.findUniqueOrThrow({ where: { id: sessionId } }))
        .status,
    ).toBe('STOPPED');

    manualManager = boot.instance;
    const start = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionId}/start`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(start.statusCode).toBe(201);
    await flushStatus(boot.instance, sessionId);
    expect(boot.instance.liveView(sessionId)).toMatchObject({
      status: 'SCAN_QR_CODE',
      qr: expect.any(String),
    });
    expect(
      (await prisma.waSession.findUniqueOrThrow({ where: { id: sessionId } }))
        .status,
    ).toBe('SCAN_QR_CODE');
    expect(boot.starts).toHaveBeenCalledOnce();
    // Um callback já capturado do socket descartado não derruba a engine recém-iniciada.
    await close(boot, sessionId, socket);
    expect(boot.instance.liveView(sessionId)?.status).toBe('SCAN_QR_CODE');
  });

  it('close do dono que perdeu a lease não sobrescreve WORKING/diagnóstico do dono novo', async () => {
    const sessionId = sessionIds[1];
    const old = manager();
    const next = manager();
    await old.instance.start(sessionId);
    await flushStatus(old.instance, sessionId);
    const first = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    // Expira apenas a fixture, simulando um processo que não renovou a lease.
    await prisma.waSession.update({
      where: { id: sessionId },
      data: { leaseUntil: new Date(Date.now() - 1_000) },
    });
    await next.instance.start(sessionId);
    const socket = next.sockets.get(sessionId)!;
    socket.user = { id: 'synthetic-e21-owner@s.whatsapp.net' };
    await (
      next.engines.get(sessionId)! as unknown as EngineInternals
    ).onConnectionUpdate({ connection: 'open' }, socket as unknown as WASocket);
    await flushStatus(next.instance, sessionId);
    const working = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(working.status).toBe('WORKING');
    expect(working.authEpoch).toBeGreaterThan(first.authEpoch);
    expect(working.leaseOwner).not.toBe(first.leaseOwner);

    await close(old, sessionId);
    old.callbacks.get(sessionId)!.onEvent('session.status', {
      status: 'STOPPED',
      error: 'callback tardio sintético',
      lastErrorDetails: diagnostic,
    });
    await flushStatus(old.instance, sessionId);
    const after = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(after).toMatchObject({
      status: 'WORKING',
      lastError: null,
      lastErrorDetails: null,
      leaseOwner: working.leaseOwner,
      authEpoch: working.authEpoch,
      creds: working.creds,
    });
    expect(
      events.filter(
        (e) =>
          e.sessionId === sessionId &&
          (e.payload as SessionStatePayload).status === 'STOPPED',
      ),
    ).toHaveLength(0);
  });

  it('me antecipado de pairing mantém retry e auth, sem persistir STOPPED por inferência', async () => {
    const sessionId = sessionIds[2];
    const owner = manager();
    await owner.instance.start(sessionId);
    await flushStatus(owner.instance, sessionId);
    const store = owner.authStores.get(sessionId)!;
    store.state.creds.me = {
      id: 'synthetic-e21-pairing@s.whatsapp.net',
      name: 'fixture',
    };
    await store.saveCreds();
    const before = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    await close(owner, sessionId);
    const internal = owner.engines.get(
      sessionId,
    )! as unknown as EngineInternals;
    expect(internal.stopped).toBe(false);
    expect(internal.reconnectTimer).toBeDefined();
    expect(owner.instance.liveView(sessionId)?.status).toBe('DEGRADED');
    const after = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(after.status).not.toBe('STOPPED');
    expect(after.lastErrorDetails).toEqual(diagnostic);
    expect(after.authEpoch).toBe(before.authEpoch);
    expect(after.creds).toEqual(before.creds);
    expect(
      events.filter(
        (e) =>
          e.sessionId === sessionId &&
          (e.payload as SessionStatePayload).status === 'STOPPED',
      ),
    ).toHaveLength(0);
    await owner.instance.onModuleDestroy();
  });
});
