import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { Queue, type Job, type Worker } from 'bullmq';
import { Queue as QueueV5, Worker as WorkerV5 } from 'bullmq-v5';
import type { Env } from '../src/bootstrap/config';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { redisConnection } from '../src/infra/redis/redis-connection';
import { CampaignService } from '../src/modules/campaigns/application/campaign.service';
import {
  CampaignQueue,
  type CampaignJob,
} from '../src/modules/campaigns/infrastructure/campaign-queue';
import { CampaignRepository } from '../src/modules/campaigns/infrastructure/campaign.repository';
import { GuardrailService } from '../src/modules/guardrail/guardrail.service';
import {
  SessionBusyError,
  type SessionManager,
} from '../src/modules/sessions/application/session-manager.service';
import { createTestApp } from './setup-app';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

function fakeDelivery(to: string) {
  return { keyId: `fake-e17-${to}`, jid: `${to}@s.whatsapp.net` };
}

// DB 13 é exclusiva deste arquivo, com o mesmo Postgres dos demais e2e. O nome da fila e os
// intervalos de 8 s são os de produção. A limpeza remove só IDs criados aqui, nunca drena Redis.
// O alias v5 reproduz dados N-1; nenhum manager abre engine, conta, QR ou rede WhatsApp.
describe('E17/P-062 — campanhas BullMQ 6 e dados N-1', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let repo: CampaignRepository;
  let config: ConfigService<Env, true>;
  let inspect: Queue<CampaignJob>;
  let legacy: QueueV5<CampaignJob>;
  const queues: CampaignQueue[] = [];
  const legacyWorkers: WorkerV5<CampaignJob>[] = [];
  const closures = new Map<CampaignQueue, Promise<void>>();
  const ownJobs = new Set<string>();
  const ownSessions = new Set<string>();
  const workerErrors: Error[] = [];
  const jobFailures: Error[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    repo = new CampaignRepository(prisma);
    const source = app.get(ConfigService<Env, true>);
    const redisUrl = source.get('REDIS_URL', { infer: true });
    if (!redisUrl) throw new Error('e2e precisa de REDIS_URL');
    const url = new URL(redisUrl);
    url.pathname = '/13';
    config = {
      get: (key: string, options?: unknown) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'REDIS_URL') return url.toString();
        return source.get(key as never, options as never);
      },
    } as ConfigService<Env, true>;
    inspect = new Queue<CampaignJob>('campaigns', {
      connection: redisConnection(config),
    });
    legacy = new QueueV5<CampaignJob>('campaigns', {
      connection: redisConnection(config),
    });
    await Promise.all([inspect.waitUntilReady(), legacy.waitUntilReady()]);
    // Se alguém usou esta DB fora do teste, falhar antes de ligar qualquer consumidor.
    const counts = await legacy.getJobCounts(
      'wait',
      'delayed',
      'active',
      'paused',
      'prioritized',
      'waiting-children',
    );
    expect(
      Object.values(counts).reduce((sum, count) => sum + count, 0),
      'DB 13 contém jobs alheios ou de uma execução interrompida; não consumir nem drenar',
    ).toBe(0);
    expect(
      await legacy.isPaused(),
      'DB 13 está pausada; não alterar o estado de uma fila preexistente',
    ).toBe(false);
  });

  function close(queue: CampaignQueue): Promise<void> {
    let pending = closures.get(queue);
    if (!pending) {
      pending = queue.onModuleDestroy();
      closures.set(queue, pending);
    }
    return pending;
  }

  afterEach(async () => {
    await Promise.all(legacyWorkers.map((worker) => worker.close()));
    await Promise.all(queues.map(close));
    for (const id of ownJobs) await (await inspect.getJob(id))?.remove();
    for (const id of ownSessions)
      await prisma.waSession.deleteMany({ where: { id } });
    queues.length = 0;
    legacyWorkers.length = 0;
    closures.clear();
    ownJobs.clear();
    ownSessions.clear();
    expect(workerErrors.splice(0)).toEqual([]);
    expect(jobFailures.splice(0)).toEqual([]);
  });

  afterAll(async () => {
    await legacy?.close();
    await inspect?.close();
    await app?.close();
  });

  async function campaign(recipients: string[], mediaUrl?: string) {
    const sessionId = `e17-campaign-${randomUUID()}`;
    ownSessions.add(sessionId);
    await prisma.waSession.create({
      data: { id: sessionId, name: sessionId, autostart: false },
    });
    return repo.create({
      sessionId,
      name: sessionId,
      messageType: mediaUrl ? 'image' : 'text',
      text: 'teste sintético E17',
      mediaUrl: mediaUrl ?? null,
      mediaMime: mediaUrl ? 'image/png' : null,
      fileName: null,
      minDelaySec: 1,
      maxDelaySec: 1,
      dailyCap: null,
      typingPreview: false,
      scheduledAt: null,
      recipients,
      firstContact: false,
    });
  }

  async function consumer(
    send: (to: string) => Promise<ReturnType<typeof fakeDelivery>>,
    readiness = Promise.resolve(),
  ) {
    const manager = {
      whenRehydrated: () => readiness,
      sendText: async (_sessionId: string, to: string) => send(to),
      sendMedia: async (_sessionId: string, to: string) => send(to),
      sendPresence: async () => undefined,
    } as unknown as SessionManager;
    const queue = new CampaignQueue(
      config,
      repo,
      manager,
      app.get(GuardrailService),
    );
    queues.push(queue);
    await queue.onModuleInit();
    const internal = queue as unknown as {
      worker: Worker<CampaignJob>;
      process: (job: Job<CampaignJob>, token?: string) => Promise<void>;
    };
    internal.worker.on('error', (error) => workerErrors.push(error));
    internal.worker.on('failed', (_job, error) => jobFailures.push(error));
    queue.onApplicationBootstrap();
    return { queue, internal, service: new CampaignService(repo, queue) };
  }

  async function legacyJob(
    campaignId: string,
    recipientId: string,
    delay = 0,
    suffix = '',
  ) {
    const id = `campaign-${campaignId}-${recipientId}${suffix ? `-${suffix}` : ''}`;
    ownJobs.add(id);
    await legacy.add(
      'send',
      { campaignId, recipientId }, // sem scheduleEpoch: é a época zero anterior à E14
      { jobId: id, delay, attempts: 1 },
    );
    return id;
  }

  async function completed(id: string) {
    await vi.waitFor(
      async () =>
        expect(await (await inspect.getJob(id))?.getState()).toBe('completed'),
      { timeout: 35_000, interval: 100 },
    );
  }

  it('dois workers aceitam wait/delayed da v5 na época zero e preservam reidratação e 8 s', async () => {
    const oldAllowHosts = process.env.EGRESS_ALLOW_HOSTS;
    process.env.EGRESS_ALLOW_HOSTS = '127.0.0.1';
    const downloads = deferred();
    let requests = 0;
    const server = createServer(async (_request, response) => {
      requests += 1;
      await downloads.promise;
      response.writeHead(200, { 'content-type': 'image/png' });
      response.end(Buffer.from('fake-e17-image'));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const bootA = deferred();
    const bootB = deferred();
    try {
      const mediaUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/image`;
      const c = await campaign(['5511999901701', '5511999901702'], mediaUrl);
      await repo.updateStatus(c.id, 'RUNNING');
      const recipients = await repo.listRecipients(c.id);
      const ids = [
        await legacyJob(c.id, recipients[0].id),
        await legacyJob(c.id, recipients[1].id, 1_000),
      ];
      const starts: Array<{ worker: string; at: number }> = [];
      const sends: Array<{ worker: string; at: number; to: string }> = [];
      const a = await consumer(async (to) => {
        sends.push({ worker: 'a', at: Date.now(), to });
        return fakeDelivery(to);
      }, bootA.promise);
      const b = await consumer(async (to) => {
        sends.push({ worker: 'b', at: Date.now(), to });
        return fakeDelivery(to);
      }, bootB.promise);
      let pauseFirst: Promise<void> | undefined;
      a.internal.worker.once('active', () => {
        starts.push({ worker: 'a', at: Date.now() });
        // Fixa quem recebe o segundo job, sem trocar o limiter nem a concorrência de produção.
        pauseFirst = a.internal.worker.pause(true);
      });
      b.internal.worker.once('active', () =>
        starts.push({ worker: 'b', at: Date.now() }),
      );
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(requests).toBe(0);
      expect(starts).toEqual([]);
      expect(
        (await repo.listRecipients(c.id)).every((r) => r.attempts === 0),
      ).toBe(true);

      bootA.resolve();
      await vi.waitFor(() => expect(requests).toBe(1), { timeout: 12_000 });
      await pauseFirst;
      bootB.resolve();
      await vi.waitFor(() => expect(requests).toBe(2), { timeout: 12_000 });
      expect(starts.map((start) => start.worker)).toEqual(['a', 'b']);
      expect(starts[1].at - starts[0].at).toBeGreaterThanOrEqual(7_900);
      downloads.resolve();
      await Promise.all(ids.map(completed));

      expect(sends).toHaveLength(2);
      expect(new Set(sends.map((send) => send.worker))).toEqual(
        new Set(['a', 'b']),
      );
      expect(new Set(sends.map((send) => send.to)).size).toBe(2);
      expect(sends[1].at - sends[0].at).toBeGreaterThanOrEqual(7_900);
      expect((await repo.findByIdOrThrow(c.id)).scheduleEpoch).toBe(0);
      for (const recipient of await repo.listRecipients(c.id))
        expect(recipient).toMatchObject({
          status: 'SENT',
          attempts: 1,
          reservedAt: null,
        });
      for (const id of ids) {
        expect((await legacy.getJob(id))?.data.scheduleEpoch).toBeUndefined();
        expect(await (await legacy.getJob(id))?.getState()).toBe('completed');
      }
    } finally {
      downloads.resolve();
      bootA.resolve();
      bootB.resolve();
      await Promise.all(queues.map(close));
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (oldAllowHosts === undefined) delete process.env.EGRESS_ALLOW_HOSTS;
      else process.env.EGRESS_ALLOW_HOSTS = oldAllowHosts;
    }
  }, 55_000);

  it('legado PAUSED termina sem requeue e resume invalida época zero sem duplicar', async () => {
    const send = vi.fn(async (to: string) => fakeDelivery(to));
    const c = await campaign(['5511999901703']);
    const [recipient] = await repo.listRecipients(c.id);
    await repo.updateStatus(c.id, 'PAUSED');
    const pausedId = await legacyJob(c.id, recipient.id);
    const { service } = await consumer(send);
    await completed(pausedId);
    expect(send).not.toHaveBeenCalled();
    expect(
      await inspect.getJobCounts('wait', 'delayed', 'active'),
    ).toMatchObject({
      wait: 0,
      delayed: 0,
      active: 0,
    });
    const resumedId = `campaign-${c.id}-e1-${recipient.id}`;
    ownJobs.add(resumedId);
    // Mantém RUNNING enquanto o job obsoleto passa, para exercitar a guarda de época
    // sem depender de ele chegar só depois de a campanha já ter virado DONE.
    await prisma.campaign.update({
      where: { id: c.id },
      data: { minDelaySec: 12, maxDelaySec: 12 },
    });
    await service.resume(c.id);
    const staleId = await legacyJob(c.id, recipient.id, 0, 'stale');
    await completed(staleId);
    expect(send).not.toHaveBeenCalled();
    expect((await repo.findByIdOrThrow(c.id)).status).toBe('RUNNING');
    await completed(resumedId);
    expect((await repo.findByIdOrThrow(c.id)).scheduleEpoch).toBe(1);
    expect(send).toHaveBeenCalledOnce();
    expect(await repo.findRecipient(recipient.id)).toMatchObject({
      status: 'SENT',
      attempts: 1,
      reservedAt: null,
      error: null,
    });
    expect(
      (await inspect.getJob(pausedId))?.data.scheduleEpoch,
    ).toBeUndefined();
  }, 45_000);

  it('shutdown espera o job ativo, libera reserva cercada e deixa o segundo worker retomar', async () => {
    const inFlight = deferred();
    const bootB = deferred();
    const attempted = vi.fn(async () => {
      await inFlight.promise;
      throw new SessionBusyError();
    });
    const sent = vi.fn(async (to: string) => fakeDelivery(to));
    const c = await campaign(['5511999901704']);
    await repo.updateStatus(c.id, 'RUNNING');
    const [recipient] = await repo.listRecipients(c.id);
    const id = await legacyJob(c.id, recipient.id);
    const a = await consumer(attempted);
    await consumer(sent, bootB.promise);
    try {
      await vi.waitFor(() => expect(attempted).toHaveBeenCalledOnce(), {
        timeout: 12_000,
      });
      const reserved = await repo.findRecipient(recipient.id);
      expect(reserved?.reservedAt).toBeInstanceOf(Date);
      let closed = false;
      const shutdown = close(a.queue).then(() => {
        closed = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(closed).toBe(false);
      inFlight.resolve();
      await shutdown;
      const delayed = await inspect.getJob(id);
      expect(await delayed?.getState()).toBe('delayed');
      expect(delayed?.data.notReadyRetries).toBe(1);
      expect(delayed?.attemptsMade).toBe(0);
      expect(await repo.findRecipient(recipient.id)).toMatchObject({
        status: 'PENDING',
        attempts: 0,
        reservedAt: null,
        error: null,
      });

      // Um callback antigo não apaga a reserva de quem retomou entre réplicas.
      const fresh = await repo.reserveRecipient(c.id, recipient.id, {
        dailyCap: null,
        staleMs: 600_000,
      });
      expect(fresh.kind).toBe('reserved');
      if (fresh.kind !== 'reserved')
        throw new Error('fixture sem reserva nova');
      expect(
        await repo.releaseRecipient(recipient.id, reserved!.reservedAt!),
      ).toMatchObject({ count: 0 });
      expect((await repo.findRecipient(recipient.id))?.reservedAt).toEqual(
        fresh.recipient.reservedAt,
      );
      await repo.releaseRecipient(recipient.id, fresh.recipient.reservedAt);
      bootB.resolve();
      await completed(id);
      expect(sent).toHaveBeenCalledOnce();
      expect(attempted).toHaveBeenCalledOnce();
      expect(await repo.findRecipient(recipient.id)).toMatchObject({
        status: 'SENT',
        attempts: 1,
        reservedAt: null,
        error: null,
      });
    } finally {
      inFlight.resolve();
      bootB.resolve();
    }
  }, 40_000);

  it('worker v5 consome job delayed produzido pela v6 e conclui o efeito no Postgres', async () => {
    const boot = deferred();
    const sent = vi.fn(async (to: string) => fakeDelivery(to));
    const c = await campaign(['5511999901705']);
    await repo.updateStatus(c.id, 'RUNNING');
    const [recipient] = await repo.listRecipients(c.id);
    const { queue, internal } = await consumer(sent, boot.promise);
    const id = `campaign-${c.id}-e0-${recipient.id}`;
    ownJobs.add(id);
    await queue.enqueueSend(
      { campaignId: c.id, recipientId: recipient.id, scheduleEpoch: 0 },
      1_000,
      id,
    );
    expect(await (await legacy.getJob(id))?.getState()).toBe('delayed');
    // Só o Worker v5 consome neste caso. O processor da aplicação mantém os mesmos gates;
    // a prova é de dados/Job Redis N-1, sem autorizar versões mistas em produção.
    const rollbackWorker = new WorkerV5<CampaignJob>(
      'campaigns',
      (job, token) =>
        internal.process(job as unknown as Job<CampaignJob>, token),
      {
        connection: redisConnection(config),
        concurrency: 4,
        limiter: { max: 1, duration: 8_000 },
        autorun: false,
      },
    );
    legacyWorkers.push(rollbackWorker);
    rollbackWorker.on('error', (error) => workerErrors.push(error));
    rollbackWorker.on('failed', (_job, error) => jobFailures.push(error));
    void rollbackWorker.run().catch((error: Error) => workerErrors.push(error));
    await completed(id);
    expect(sent).toHaveBeenCalledOnce();
    expect(await (await legacy.getJob(id))?.getState()).toBe('completed');
    expect(await repo.findRecipient(recipient.id)).toMatchObject({
      status: 'SENT',
      attempts: 1,
      reservedAt: null,
      error: null,
    });
  }, 25_000);
});
