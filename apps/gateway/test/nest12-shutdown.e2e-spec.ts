import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { Queue, type Worker } from 'bullmq';
import { AppModule } from '../src/app.module';
import type { Env } from '../src/bootstrap/config';
import { buildFastifyAdapter } from '../src/bootstrap/fastify-adapter';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { EventFanout } from '../src/infra/redis/event-fanout';
import { redisConnection } from '../src/infra/redis/redis-connection';
import { RedisService } from '../src/infra/redis/redis.service';
import {
  CampaignQueue,
  type CampaignJob,
} from '../src/modules/campaigns/infrastructure/campaign-queue';
import { CampaignRepository } from '../src/modules/campaigns/infrastructure/campaign.repository';
import { GuardrailService } from '../src/modules/guardrail/guardrail.service';
import type { IEngine } from '../src/modules/sessions/application/engine.port';
import {
  SessionBusyError,
  SessionManager,
} from '../src/modules/sessions/application/session-manager.service';
import { SESSION_REPOSITORY } from '../src/modules/sessions/domain/session.repository';
import type { BaileysEngineDeps } from '../src/modules/sessions/infrastructure/baileys/baileys.engine';
import { EngineFactory } from '../src/modules/sessions/infrastructure/engine.factory';
import {
  LeaseLostError,
  type PostgresSessionLease,
} from '../src/modules/sessions/infrastructure/postgres-session-lease';
import { PrismaSessionRepository } from '../src/modules/sessions/infrastructure/prisma-session.repository';
import {
  WebhookQueue,
  type WebhookJob,
} from '../src/modules/webhooks/infrastructure/webhook-queue';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

// AppModule e hooks reais, com Postgres e Workers reais. Só a engine é falsa; a leitura
// de autostart fica restrita à fixture. Redis DB 10 é exclusivo deste spec. Não faz
// flush/drain/obliterate, não conecta WhatsApp e não reduz retries nem força close.
describe('E18 — Nest 12 encerra o AppModule na ordem das dependências', () => {
  const sessionId = `e18-shutdown-${randomUUID()}`;
  const campaignJobId = `${sessionId}-campaign`;
  const pendingJobId = `${sessionId}-pending`;
  const webhookJobId = `${sessionId}-webhook`;
  const trace: string[] = [];
  const workerErrors: Error[] = [];
  const boot = deferred();
  const delivery = deferred();
  const engineClose = deferred();
  const diagnostic = deferred();
  const send = vi.fn(async (to: string) => {
    trace.push('send:begin');
    await delivery.promise;
    trace.push('send:end');
    return { keyId: 'fake-e18-shutdown-key', jid: `${to}@s.whatsapp.net` };
  });
  let app: NestFastifyApplication;
  let fixturePrisma: PrismaService;
  let campaignInspect: Queue<CampaignJob>;
  let webhookInspect: Queue<WebhookJob>;
  let manager: SessionManager;
  let campaign: CampaignQueue;
  let webhooks: WebhookQueue;
  let deps: BaileysEngineDeps;
  let server: Server;
  let response: ServerResponse | undefined;
  let origin: string;
  let close: Promise<void> | undefined;
  let duplicateClose: Promise<void> | undefined;
  let campaignId: string;
  let recipientId: string;
  let pendingRecipientId: string;

  function isolatedConfig(source: ConfigService<Env, true>, workers = false) {
    const raw = source.get('REDIS_URL', { infer: true });
    const url = raw ? new URL(raw) : undefined;
    if (url) url.pathname = '/10';
    const config = {
      get: (key: string, options?: unknown) => {
        if (key === 'REDIS_URL') return url?.toString();
        if (key === 'REDIS_DB') return 10;
        if (workers && key === 'NODE_ENV') return 'development';
        return source.get(key as never, options as never);
      },
    } as ConfigService<Env, true>;
    // Conferir antes dos construtores (inclusive RedisService), não apenas antes
    // de consumir uma fila vazia: um Redis remoto vazio continua fora desta prova.
    const connection = redisConnection(config);
    expect(['localhost', '127.0.0.1', '::1']).toContain(connection.host);
    expect(connection.tls).toBeUndefined();
    return config;
  }

  function recordHook(
    name: string,
    provider: { onModuleDestroy(): Promise<void> | void },
  ) {
    const destroy = provider.onModuleDestroy.bind(provider);
    vi.spyOn(provider, 'onModuleDestroy').mockImplementation(async () => {
      trace.push(`${name}:begin`);
      await destroy();
      trace.push(`${name}:end`);
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EngineFactory)
      .useValue({
        create: (_type: string, engineDeps: BaileysEngineDeps): IEngine => {
          expect(engineDeps.sessionId).toBe(sessionId);
          deps = engineDeps;
          let status = 'STARTING';
          return {
            engineName: 'baileys',
            getStatus: () => status,
            getQrBase64: () => null,
            start: async () => {
              trace.push('engine:start');
              await boot.promise;
              status = 'WORKING';
              deps.onEvent('session.status', { status, error: null });
            },
            sendText: send,
            shutdown: async () => {
              trace.push('engine:shutdown:begin');
              await engineClose.promise;
              // Encerramento do processo não emite STOPPED (P-043/E13).
              status = 'STOPPED';
              trace.push('engine:shutdown:end');
            },
          } as unknown as IEngine;
        },
      })
      .overrideProvider(SESSION_REPOSITORY)
      .useFactory({
        inject: [PrismaService],
        factory: (prisma: PrismaService) => {
          const repo = new PrismaSessionRepository(prisma);
          const find = repo.findAutostart.bind(repo);
          vi.spyOn(repo, 'findAutostart').mockImplementation(async () =>
            (await find()).filter((session) => session.id === sessionId),
          );
          return repo;
        },
      })
      .overrideProvider(RedisService)
      .useFactory({
        inject: [ConfigService],
        factory: (config: ConfigService<Env, true>) =>
          new RedisService(isolatedConfig(config)),
      })
      .overrideProvider(CampaignQueue)
      .useFactory({
        inject: [
          ConfigService,
          CampaignRepository,
          SessionManager,
          GuardrailService,
        ],
        factory: (
          config: ConfigService<Env, true>,
          repo: CampaignRepository,
          sessions: SessionManager,
          guardrail: GuardrailService,
        ) =>
          new CampaignQueue(
            isolatedConfig(config, true),
            repo,
            sessions,
            guardrail,
          ),
      })
      .overrideProvider(WebhookQueue)
      .useFactory({
        inject: [ConfigService, PrismaService],
        factory: (config: ConfigService<Env, true>, prisma: PrismaService) =>
          new WebhookQueue(isolatedConfig(config, true), prisma),
      })
      .compile();

    const config = moduleRef.get(ConfigService<Env, true>);
    fixturePrisma = new PrismaService(config);
    await fixturePrisma.onModuleInit();
    await fixturePrisma.waSession.create({
      data: {
        id: sessionId,
        name: sessionId,
        status: 'WORKING',
        autostart: true,
      },
    });
    const connection = redisConnection(isolatedConfig(config));
    campaignInspect = new Queue<CampaignJob>('campaigns', { connection });
    webhookInspect = new Queue<WebhookJob>('webhooks', { connection });
    for (const queue of [campaignInspect, webhookInspect]) {
      await queue.waitUntilReady();
      const counts = await queue.getJobCounts(
        'wait',
        'active',
        'delayed',
        'prioritized',
        'waiting-children',
      );
      expect(
        Object.values(counts).every((count) => count === 0),
        'Redis DB 10 contém jobs pendentes: não consumir nem apagar dados alheios',
      ).toBe(true);
      const redis = await queue.getBackend().client;
      expect(await redis.llen(queue.toKey('paused'))).toBe(0);
      expect(await queue.isPaused()).toBe(false);
    }

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      buildFastifyAdapter(),
      { bodyParser: false, logger: false },
    );
    app.setGlobalPrefix('api');
    await app.init();
    await app.listen(0, '127.0.0.1');
    origin = await app.getUrl();
    manager = app.get(SessionManager);
    campaign = app.get(CampaignQueue);
    webhooks = app.get(WebhookQueue);
    for (const queue of [campaign, webhooks]) {
      (queue as unknown as { worker: Worker }).worker.on('error', (error) =>
        workerErrors.push(error),
      );
    }

    // NODE_ENV=test desliga o fanout global. Este subscriber real usa canal único,
    // não publica wa:events no Redis compartilhado nem alcança apps de desenvolvimento.
    const fanout = app.get(EventFanout);
    const sub = app.get(RedisService).client.duplicate();
    await sub.subscribe(sessionId);
    (fanout as unknown as { sub: typeof sub }).sub = sub;
    for (const [name, provider] of [
      ['campaign', campaign],
      ['webhook', webhooks],
      ['sessions', manager],
      ['fanout', fanout],
      ['redis', app.get(RedisService)],
      ['prisma', app.get(PrismaService)],
    ] as const)
      recordHook(name, provider);
    const adapter = app.getHttpAdapter();
    const adapterClose = adapter.close.bind(adapter);
    vi.spyOn(adapter, 'close').mockImplementation(async () => {
      trace.push('http:begin');
      await adapterClose();
      trace.push('http:end');
    });

    server = createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        response = res;
        trace.push('webhook:received');
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    vi.stubEnv('EGRESS_ALLOW_HOSTS', '127.0.0.1');
  });

  afterAll(async () => {
    boot.resolve();
    delivery.resolve();
    engineClose.resolve();
    diagnostic.resolve();
    if (response && !response.writableEnded) response.writeHead(200).end();
    if (app) await (close ?? app.close());
    await duplicateClose;
    for (const id of [campaignJobId, pendingJobId])
      await (await campaignInspect?.getJob(id))?.remove();
    await (await webhookInspect?.getJob(webhookJobId))?.remove();
    await campaignInspect?.close();
    await webhookInspect?.close();
    await fixturePrisma?.waSession.deleteMany({ where: { id: sessionId } });
    await fixturePrisma?.onModuleDestroy();
    if (server)
      await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('aguarda reidratação, drena efeitos e escritas cercadas, solta lease e só então fecha infra/HTTP uma vez', async () => {
    const repo = app.get(CampaignRepository);
    const row = await repo.create({
      sessionId,
      name: sessionId,
      messageType: 'text',
      text: 'prova sintética E18',
      mediaUrl: null,
      mediaMime: null,
      fileName: null,
      minDelaySec: 1,
      maxDelaySec: 1,
      dailyCap: null,
      typingPreview: false,
      scheduledAt: null,
      firstContact: false,
      recipients: ['5511000000001', '5511000000002'],
    });
    campaignId = row.id;
    const epoch = await repo.transitionToRunning(campaignId, new Date());
    expect(epoch).toBe(1);
    const recipients = await repo.listRecipients(campaignId);
    [recipientId, pendingRecipientId] = recipients.map(
      (recipient) => recipient.id,
    );
    await campaign.enqueueSend(
      { campaignId, recipientId, scheduleEpoch: epoch! },
      0,
      campaignJobId,
    );
    await campaign.enqueueSend(
      { campaignId, recipientId: pendingRecipientId, scheduleEpoch: epoch! },
      60_000,
      pendingJobId,
    );
    expect(manager.isRehydrated()).toBe(false);
    expect(
      await (await campaignInspect.getJob(campaignJobId))!.getState(),
    ).toBe('waiting');
    expect(send).not.toHaveBeenCalled();
    boot.resolve();
    await manager.whenRehydrated();
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce(), {
      timeout: 15_000,
    });
    const before = await fixturePrisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(before.status).toBe('WORKING');
    expect(before.leaseOwner).not.toBeNull();
    expect((await repo.findRecipient(recipientId))!.reservedAt).not.toBeNull();

    await webhooks.enqueue(
      {
        webhookId: sessionId,
        url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/fixture`,
        secret: null,
        headers: null,
        body: { id: sessionId, event: 'fixture.shutdown' },
      },
      1,
      webhookJobId,
    );
    await vi.waitFor(() => expect(response).toBeDefined());
    close = app.close();
    duplicateClose = app.close(); // Nest 12 compartilha o mesmo teardown em andamento.
    await vi.waitFor(() => expect(trace).toContain('campaign:begin'));
    expect(trace).not.toContain('campaign:end');
    expect(trace).not.toContain('sessions:begin');
    expect(trace).not.toContain('prisma:begin');
    delivery.resolve();
    await vi.waitFor(() => expect(trace).toContain('webhook:begin'));
    expect(trace).toContain('send:end');
    expect(trace).toContain('campaign:end');
    expect(trace).not.toContain('webhook:end');
    expect((await repo.findRecipient(recipientId))!.status).toBe('SENT');

    // Uma escrita de diagnóstico já recebida deve terminar com o fence e o banco
    // ainda válidos. A engine não grava STOPPED no shutdown e a lease não sai cedo.
    const lease = (manager as unknown as { lease: PostgresSessionLease }).lease;
    const write = lease.updateLastErrorDetails.bind(lease);
    vi.spyOn(lease, 'updateLastErrorDetails').mockImplementation(
      async (...args) => {
        trace.push('diagnostic:begin');
        await diagnostic.promise;
        expect(trace).not.toContain('prisma:begin');
        await write(...args);
        trace.push('diagnostic:end');
      },
    );
    const release = lease.release.bind(lease);
    vi.spyOn(lease, 'release').mockImplementation(async (...args) => {
      expect(trace).toContain('diagnostic:end');
      expect(trace).not.toContain('prisma:begin');
      await release(...args);
      trace.push('lease:released');
    });
    const diagnosticWrite = deps.onDisconnect!({
      code: 408,
      reason: 'fixture-e18',
    });
    await vi.waitFor(() => expect(trace).toContain('diagnostic:begin'));
    response!.writeHead(200).end();
    await vi.waitFor(() => expect(trace).toContain('engine:shutdown:begin'));
    expect(trace).toContain('webhook:end');
    expect(trace).not.toContain('fanout:begin');
    await expect(
      manager.sendText(sessionId, '5511000000003', 'bloqueado'),
    ).rejects.toBeInstanceOf(LeaseLostError);
    await expect(manager.start(sessionId)).rejects.toBeInstanceOf(
      SessionBusyError,
    );
    expect(send).toHaveBeenCalledOnce();
    // Fastify mantém HTTP até dispose (como Nest 11). O manager bloqueia novos efeitos.
    expect((await fetch(`${origin}/api/auth/me`)).status).toBe(401);
    engineClose.resolve();
    await vi.waitFor(() => expect(trace).toContain('engine:shutdown:end'));
    expect(trace).not.toContain('sessions:end');
    expect(
      (
        await fixturePrisma.waSession.findUniqueOrThrow({
          where: { id: sessionId },
        })
      ).leaseOwner,
    ).toBe(before.leaseOwner);
    diagnostic.resolve();
    await diagnosticWrite;
    await Promise.all([close, duplicateClose]);

    const after = await fixturePrisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(after).toMatchObject({
      status: 'WORKING',
      authEpoch: before.authEpoch,
      leaseOwner: null,
      leaseUntil: null,
      lastErrorDetails: { code: 408, reason: 'fixture-e18' },
    });
    expect(
      (
        await fixturePrisma.campaign.findUniqueOrThrow({
          where: { id: campaignId },
        })
      ).scheduleEpoch,
    ).toBe(epoch);
    expect(
      await fixturePrisma.campaignRecipient.findUniqueOrThrow({
        where: { id: pendingRecipientId },
      }),
    ).toMatchObject({ status: 'PENDING', reservedAt: null, attempts: 0 });
    expect(await (await campaignInspect.getJob(pendingJobId))!.getState()).toBe(
      'delayed',
    );
    expect(await (await webhookInspect.getJob(webhookJobId))!.getState()).toBe(
      'completed',
    );
    const ordered = [
      'campaign:begin',
      'campaign:end',
      'webhook:begin',
      'webhook:end',
      'sessions:begin',
      'lease:released',
      'sessions:end',
      'fanout:begin',
      'fanout:end',
      'redis:begin',
      'redis:end',
      'prisma:begin',
      'prisma:end',
      'http:begin',
      'http:end',
    ];
    for (let index = 0; index < ordered.length; index++) {
      expect(trace.filter((entry) => entry === ordered[index])).toHaveLength(1);
      if (index > 0)
        expect(trace.indexOf(ordered[index])).toBeGreaterThan(
          trace.indexOf(ordered[index - 1]),
        );
    }
    expect(workerErrors).toEqual([]);
  });
});
