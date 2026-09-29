import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { Queue, type Worker } from 'bullmq';
import { Queue as LegacyQueue } from 'bullmq-v5';
import { createHmac, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import {
  createServer,
  type IncomingHttpHeaders,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { validateEnv, type Env } from '../src/bootstrap/config';
import { PrismaService, type Prisma } from '../src/infra/prisma/prisma.service';
import { redisConnection } from '../src/infra/redis/redis-connection';
import { WebhookDispatcher } from '../src/modules/webhooks/application/webhook-dispatcher.service';
import { Webhook } from '../src/modules/webhooks/domain/webhook.entity';
import type { WebhookRepository } from '../src/modules/webhooks/domain/webhook.repository';
import {
  WebhookQueue,
  type WebhookJob,
} from '../src/modules/webhooks/infrastructure/webhook-queue';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';

interface Delivery {
  body: string;
  headers: IncomingHttpHeaders;
  path: string;
  at: number;
}

interface Fixture {
  id: string;
  webhookId: string;
  replies: number[];
  received: Delivery[];
  hold: boolean;
  pending: ServerResponse[];
  data: WebhookJob;
}

// O app de e2e desliga os Workers. Aqui só Prisma/config + WebhookQueue real são
// instanciados: HTTP é loopback, Redis DB 12 é reservado, nenhuma engine é criada.
// Não há flush/drain/obliterate: removemos somente os IDs desta execução.
describe('E17 — Worker real de webhooks com BullMQ 6', () => {
  const prefix = `e17-webhook-${randomUUID()}`;
  const fixtures = new Map<string, Fixture>();
  const jobIds = new Set<string>();
  const queues: WebhookQueue[] = [];
  const workerErrors: Error[] = [];
  let context: TestingModule;
  let prisma: PrismaService;
  let fixturePrisma: PrismaService;
  let config: ConfigService<Env, true>;
  let inspect: Queue<WebhookJob>;
  let server: Server;
  let origin: string;
  let nextFixture = 0;
  let afterDeadLetterRead: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    context = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ validate: validateEnv })],
      providers: [PrismaService],
    }).compile();
    await context.init();
    prisma = context.get(PrismaService);
    const source = context.get(ConfigService<Env, true>);
    const redisUrl = source.get('REDIS_URL', { infer: true });
    const url = redisUrl ? new URL(redisUrl) : undefined;
    if (url) url.pathname = '/12';
    config = {
      get: (key: string, options?: unknown) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'REDIS_URL') return url?.toString();
        if (key === 'REDIS_DB') return 12;
        if (key === 'WEBHOOK_CONCURRENCY') return 2;
        return source.get(key as never, options as never);
      },
    } as ConfigService<Env, true>;

    // A reconciliação pública busca todas as DLQs pendentes. Restringir somente
    // a leitura às fixtures evita reenfileirar dados alheios do Postgres local;
    // create/update/updateMany continuam usando o Prisma/SQL real, inclusive CAS.
    fixturePrisma = {
      webhook: prisma.webhook,
      webhookDeadLetter: {
        create: (args: Prisma.WebhookDeadLetterCreateArgs) =>
          prisma.webhookDeadLetter.create(args),
        findMany: async (args: Prisma.WebhookDeadLetterFindManyArgs) => {
          const items = await prisma.webhookDeadLetter.findMany({
            ...args,
            where: {
              AND: [args.where ?? {}, { webhookId: { startsWith: prefix } }],
            },
          });
          await afterDeadLetterRead?.();
          return items;
        },
        updateMany: (args: Prisma.WebhookDeadLetterUpdateManyArgs) =>
          prisma.webhookDeadLetter.updateMany(args),
        update: (args: Prisma.WebhookDeadLetterUpdateArgs) =>
          prisma.webhookDeadLetter.update(args),
      },
    } as unknown as PrismaService;

    inspect = new Queue<WebhookJob>('webhooks', {
      connection: redisConnection(config),
    });
    inspect.on('error', (error) => workerErrors.push(error));
    await inspect.waitUntilReady();
    const existing = await inspect.getJobCounts(
      'wait',
      'active',
      'delayed',
      'prioritized',
      'waiting-children',
    );
    expect(
      Object.values(existing).every((count) => count === 0),
      'Redis DB 12 precisa estar sem jobs pendentes; não limpar fila alheia',
    ).toBe(true);
    // BullMQ 6 removeu 'paused' de JobType; a lista Redis e a pausa global
    // continuam existindo e também impedem reaproveitar este DB de teste.
    const redis = await inspect.getBackend().client;
    expect(await redis.llen(inspect.toKey('paused'))).toBe(0);
    expect(await inspect.isPaused()).toBe(false);

    vi.stubEnv('EGRESS_ALLOW_PRIVATE', 'false');
    vi.stubEnv('EGRESS_ALLOW_HOSTS', '127.0.0.1');
    server = createServer((req, res) => {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => (body += chunk));
      req.on('end', () => {
        const id = (JSON.parse(body) as { id: string }).id;
        const fixture = fixtures.get(id);
        if (!fixture) {
          res.writeHead(404).end();
          return;
        }
        fixture.received.push({
          body,
          headers: req.headers,
          path: req.url ?? '',
          at: Date.now(),
        });
        if (fixture.hold) {
          fixture.pending.push(res);
          return;
        }
        const index = Math.min(
          fixture.received.length - 1,
          fixture.replies.length - 1,
        );
        res.writeHead(fixture.replies[index]).end();
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    for (const fixture of fixtures.values()) {
      for (const response of fixture.pending) response.end();
    }
    for (const queue of queues.splice(0)) await queue.onModuleDestroy();
    for (const id of jobIds) await (await inspect?.getJob(id))?.remove();
    jobIds.clear();
    if (prisma) {
      await prisma.webhookDeadLetter.deleteMany({
        where: { webhookId: { startsWith: prefix } },
      });
      await prisma.webhook.deleteMany({
        where: { id: { startsWith: prefix } },
      });
    }
    fixtures.clear();
    afterDeadLetterRead = undefined;
    vi.restoreAllMocks();
    expect(workerErrors.splice(0)).toEqual([]);
  });

  afterAll(async () => {
    await inspect?.close();
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await context?.close();
    vi.unstubAllEnvs();
  });

  function fixture(replies = [200]): Fixture {
    const id = `${prefix}-${++nextFixture}`;
    const result: Fixture = {
      id,
      webhookId: `${id}-wh`,
      replies,
      received: [],
      hold: false,
      pending: [],
      data: {
        webhookId: `${id}-wh`,
        url: `${origin}/original`,
        secret: 'segredo-sintetico-original',
        headers: { 'x-fixture': id },
        body: { id, event: 'message', payload: { text: 'fixture local' } },
      },
    };
    fixtures.set(id, result);
    return result;
  }

  async function startQueue(): Promise<WebhookQueue> {
    const queue = new WebhookQueue(config, fixturePrisma);
    queues.push(queue);
    await queue.onModuleInit();
    const worker = (queue as unknown as { worker: Worker }).worker;
    worker.on('error', (error) => workerErrors.push(error));
    await worker.waitUntilReady();
    return queue;
  }

  function ownJob(id: string): string {
    expect(id).not.toContain(':');
    jobIds.add(id);
    return id;
  }

  async function finished(id: string, state = 'completed') {
    await expect
      .poll(async () => (await inspect.getJob(id))?.getState(), {
        timeout: 10_000,
      })
      .toBe(state);
    return (await inspect.getJob(id))!;
  }

  async function deadLetter(webhookId: string) {
    await expect
      .poll(() => prisma.webhookDeadLetter.count({ where: { webhookId } }))
      .toBe(1);
    return (await prisma.webhookDeadLetter.findFirstOrThrow({
      where: { webhookId },
    }))!;
  }

  it('duas réplicas + eventos local/remoto entregam uma vez, com HMAC e headers protegidos', async () => {
    const test = fixture();
    const queue1 = await startQueue();
    const queue2 = await startQueue();
    const bus = new EventBus();
    const headers = {
      'Content-Type': 'text/plain',
      'Content-Length': '1',
      Host: 'nao-usar.invalid',
      'X-Webhook-Signature': 'forjada',
      'x-fixture': test.id,
    };
    const repo = {
      listEnabled: async () => [
        new Webhook(
          test.webhookId,
          null,
          test.data.url,
          ['message'],
          test.data.secret,
          headers,
          true,
          2,
          new Date(),
        ),
      ],
    } as WebhookRepository;
    const enqueue1 = vi.spyOn(queue1, 'enqueue');
    const enqueue2 = vi.spyOn(queue2, 'enqueue');
    await new WebhookDispatcher(repo, bus, queue1).onModuleInit();
    await new WebhookDispatcher(repo, bus, queue2).onModuleInit();
    const payload = {
      id: test.id,
      event: 'message',
      sessionId: `${prefix}-session-falsa`,
      session: 'fixture-sem-engine',
      timestamp: Date.now(),
      engine: 'baileys',
      payload: { text: 'fixture local', raw: { interno: true } },
    };
    const id = ownJob(`${test.id}-${test.webhookId}`);
    for (const name of ['wa.event', 'wa.event.remote']) {
      bus.publish({ name, occurredAt: new Date(), payload });
    }
    await Promise.all(
      [...enqueue1.mock.results, ...enqueue2.mock.results].map(
        (result) => result.value,
      ),
    );
    await finished(id);
    expect(enqueue1).toHaveBeenCalledTimes(2);
    expect(enqueue2).toHaveBeenCalledTimes(2);
    expect(test.received).toHaveLength(1);
    const delivery = test.received[0];
    expect(JSON.parse(delivery.body).payload).toEqual({
      text: 'fixture local',
    });
    expect(delivery.headers['content-type']).toBe('application/json');
    expect(delivery.headers['content-length']).toBe(
      String(Buffer.byteLength(delivery.body)),
    );
    expect(delivery.headers.host).toBe(new URL(origin).host);
    expect(delivery.headers['x-fixture']).toBe(test.id);
    expect(delivery.headers['x-webhook-signature']).toBe(
      `sha512=${createHmac('sha512', test.data.secret!).update(delivery.body).digest('hex')}`,
    );
  });

  it('HTTP 500 usa o backoff de produção e a segunda tentativa conclui sem DLQ', async () => {
    const test = fixture([500, 200]);
    const queue = await startQueue();
    const id = ownJob(`${test.id}-retry`);
    await queue.enqueue(test.data, 2, id);
    const job = await finished(id);
    expect(job.attemptsMade).toBe(2);
    expect(test.received).toHaveLength(2);
    expect(test.received[1].at - test.received[0].at).toBeGreaterThanOrEqual(
      1900,
    );
    expect(
      await prisma.webhookDeadLetter.count({
        where: { webhookId: test.webhookId },
      }),
    ).toBe(0);
  });

  it('HTTP 400 esgota tentativas em DLQ; reentrega concorrente usa a config atual uma vez', async () => {
    const test = fixture([400, 400, 200]);
    await prisma.webhook.create({
      data: {
        id: test.webhookId,
        url: test.data.url,
        events: ['*'],
        secret: test.data.secret,
        maxAttempts: 2,
      },
    });
    const queue1 = await startQueue();
    const id = ownJob(`${test.id}-exhaust`);
    await queue1.enqueue(test.data, 2, id);
    const failed = await finished(id, 'failed');
    const dlq = await deadLetter(test.webhookId);
    expect(failed.attemptsMade).toBe(2);
    expect(test.received).toHaveLength(2);
    expect(dlq).toMatchObject({
      webhookId: test.webhookId,
      body: test.data.body,
      attempts: 2,
      error: 'destino respondeu HTTP 400',
      redeliveredAt: null,
    });
    expect(JSON.stringify(dlq)).not.toContain(test.data.secret!);
    const currentSecret = 'segredo-sintetico-atual';
    await prisma.webhook.update({
      where: { id: test.webhookId },
      data: {
        url: `${origin}/atual`,
        secret: currentSecret,
        headers: { 'x-current': 'config-atual' },
        maxAttempts: 3,
      },
    });
    const queue2 = await startQueue();
    const redeliveryId = ownJob(`dlq-redeliver-${dlq.id}`);
    // As duas consultas SQL precisam enxergar a mesma linha pendente ANTES do
    // updateMany. Assim o teste exige o CAS, sem depender da sorte do scheduler.
    let readers = 0;
    let releaseReaders!: () => void;
    const bothRead = new Promise<void>((resolve) => (releaseReaders = resolve));
    afterDeadLetterRead = async () => {
      if (++readers === 2) releaseReaders();
      await bothRead;
    };
    const results = await Promise.all([
      queue1.redeliverDeadLetters(),
      queue2.redeliverDeadLetters(),
    ]);
    afterDeadLetterRead = undefined;
    expect(readers).toBe(2);
    expect(results.reduce((sum, result) => sum + result.redelivered, 0)).toBe(
      1,
    );
    expect(results.reduce((sum, result) => sum + result.skipped, 0)).toBe(1);
    const redelivered = await finished(redeliveryId);
    expect(redelivered.opts.attempts).toBe(3);
    expect(test.received).toHaveLength(3);
    const delivery = test.received[2];
    expect(delivery.path).toBe('/atual');
    expect(delivery.headers['x-current']).toBe('config-atual');
    expect(delivery.headers['x-webhook-signature']).toBe(
      `sha512=${createHmac('sha512', currentSecret).update(delivery.body).digest('hex')}`,
    );
    expect(await queue1.listDeadLetters()).toEqual([]);
    expect(await queue1.listDeadLetters(true)).toEqual([
      expect.objectContaining({ id: dlq.id, redeliveredAt: expect.any(Date) }),
    ]);
  });

  it('egress bloqueado é irrecuperável: uma tentativa, nenhuma conexão HTTP e DLQ', async () => {
    const test = fixture();
    test.data.url = 'http://127.0.0.2/nao-conectar';
    const queue = await startQueue();
    const id = ownJob(`${test.id}-egress`);
    await queue.enqueue(test.data, 5, id);
    const failed = await finished(id, 'failed');
    const dlq = await deadLetter(test.webhookId);
    expect(failed.attemptsMade).toBe(1);
    expect(dlq.attempts).toBe(1);
    expect(dlq.error).toContain('bloqueado pela política de egress');
    expect(test.received).toHaveLength(0);
  });

  it('consome jobs waiting/delayed serializados pelo BullMQ 5.81.5 sem drenar a fila', async () => {
    const waiting = fixture();
    const delayed = fixture();
    const legacy = new LegacyQueue<WebhookJob>('webhooks', {
      connection: redisConnection(config),
    });
    legacy.on('error', (error) => workerErrors.push(error));
    try {
      await legacy.waitUntilReady();
      const waitingId = ownJob(`${waiting.id}-v5-waiting`);
      const delayedId = ownJob(`${delayed.id}-v5-delayed`);
      await legacy.add('deliver', waiting.data, {
        jobId: waitingId,
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
      });
      await legacy.add('deliver', delayed.data, {
        jobId: delayedId,
        delay: 500,
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
      });
      expect(await (await legacy.getJob(waitingId))?.getState()).toBe(
        'waiting',
      );
      expect(await (await legacy.getJob(delayedId))?.getState()).toBe(
        'delayed',
      );
      await startQueue();
      await Promise.all([finished(waitingId), finished(delayedId)]);
      expect(waiting.received).toHaveLength(1);
      expect(delayed.received).toHaveLength(1);
    } finally {
      await legacy.close();
    }
  });

  it('shutdown drena os dois slots ocupados e conserva o próximo job para outro worker', async () => {
    const active = [fixture(), fixture()];
    for (const delivery of active) delivery.hold = true;
    const pending = fixture();
    const queue = await startQueue();
    const worker = (queue as unknown as { worker: Worker }).worker;
    expect(worker.opts.concurrency).toBe(2);
    const activeIds = active.map((delivery) => ownJob(`${delivery.id}-active`));
    await Promise.all(
      active.map((delivery, index) =>
        queue.enqueue(delivery.data, 1, activeIds[index]),
      ),
    );
    // O mainLoop inclui fetches pendentes no limite de concurrency. Segurar só
    // um HTTP deixava outro slot com moveToActive já admitido antes de close:
    // esse fetch também é drenado e pode receber o job seguinte. Dois HTTPs
    // realmente em voo ocupam ambos os slots antes da barreira de shutdown.
    await expect
      .poll(() => active.map((delivery) => delivery.received.length))
      .toEqual([1, 1]);
    expect(
      await Promise.all(
        activeIds.map(async (id) => (await inspect.getJob(id))?.getState()),
      ),
    ).toEqual(['active', 'active']);
    const nextFetch = vi.spyOn(worker.getBackend(), 'moveToActive');
    const closeStarted = once(worker, 'closing');
    let closed = false;
    const closing = queue.onModuleDestroy().then(() => {
      closed = true;
      queues.splice(queues.indexOf(queue), 1);
    });
    await closeStarted;
    expect(worker.closing).toBeTruthy();
    const pendingId = ownJob(`${pending.id}-pending`);
    await inspect.add('deliver', pending.data, { jobId: pendingId });
    expect(await (await inspect.getJob(pendingId))?.getState()).toBe('waiting');
    expect(closed).toBe(false);
    active[0].pending[0].end();
    await finished(activeIds[0]);
    expect(closed).toBe(false); // o segundo HTTP continua retido.
    expect(await (await inspect.getJob(pendingId))?.getState()).toBe('waiting');
    expect(pending.received).toHaveLength(0);
    active[1].pending[0].end();
    await closing;
    await Promise.all(activeIds.map((id) => finished(id)));
    expect(nextFetch).not.toHaveBeenCalled();
    expect(await (await inspect.getJob(pendingId))?.getState()).toBe('waiting');
    expect(pending.received).toHaveLength(0);
    await startQueue();
    await finished(pendingId);
    expect(pending.received).toHaveLength(1);
  });
});
