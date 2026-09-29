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
import {
  createConnection,
  createServer,
  type AddressInfo,
  type Socket,
} from 'node:net';
import { once } from 'node:events';
import { ConfigService } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import Redis from 'ioredis';
import { DelayedError, Queue, Worker } from 'bullmq';
import { Queue as QueueV5, Worker as WorkerV5 } from 'bullmq-v5';
import type { Env } from '../src/bootstrap/config';
import { redisConnection } from '../src/infra/redis/redis-connection';
import { createTestApp } from './setup-app';

// Somente Redis local, DB11 e prefixo único por caso. A falha de rede corta apenas o
// proxy TCP deste teste; nunca reinicia o Redis compartilhado nem apaga filas alheias.
describe('E17 — compatibilidade Redis N-1 e recuperação BullMQ 6', () => {
  let app: NestFastifyApplication;
  let redis: Redis;
  let connection: ReturnType<typeof redisConnection>;
  let prefix: string;
  const closers: (() => Promise<unknown>)[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    connection = {
      ...redisConnection(app.get(ConfigService<Env, true>)),
      db: 11,
    };
    expect(['localhost', '127.0.0.1', '::1']).toContain(connection.host);
    expect(connection.tls).toBeUndefined();
    redis = new Redis(connection);
    await redis.ping();
  });

  afterEach(async () => {
    // O proxy é restaurado antes dos closes mesmo quando uma asserção falha.
    for (const close of closers.splice(0).reverse()) await close();
    if (prefix) {
      let cursor = '0';
      do {
        const page = await redis.scan(
          cursor,
          'MATCH',
          `${prefix}:*`,
          'COUNT',
          100,
        );
        cursor = page[0];
        if (page[1].length) await redis.del(...page[1]);
      } while (cursor !== '0');
    }
  });

  afterAll(async () => {
    await redis?.quit();
    await app?.close();
  });

  function options() {
    prefix = `e17-${randomUUID()}`;
    return { connection, prefix };
  }

  it('v6 retoma fila pausada pela v5 e rollback v5 consome job atrasado pela v6', async () => {
    const opts = options();
    const old = new QueueV5('compat', opts);
    const current = new Queue('compat', opts);
    closers.push(
      () => old.close(),
      () => current.close(),
    );
    await old.pause();
    const jobId = `legacy-${randomUUID()}`;
    await old.add('send', { synthetic: true }, { jobId, attempts: 2 });
    expect(await old.isPaused()).toBe(true);

    let delayEntered = false;
    const worker = new Worker(
      'compat',
      async (job, token) => {
        await job.updateData({ ...job.data, migrated: true });
        await job.moveToDelayed(Date.now() + 3_000, token);
        delayEntered = true;
        throw new DelayedError();
      },
      opts,
    );
    const errors: Error[] = [];
    worker.on('error', (error) => errors.push(error));
    closers.push(() => worker.close());
    await current.resume();
    await vi.waitFor(async () => {
      expect(delayEntered).toBe(true);
      expect(await current.getJobState(jobId)).toBe('delayed');
    });
    await worker.close();

    const sent = vi.fn();
    const previousWorker = new WorkerV5(
      'compat',
      async (job) => {
        expect(job.data).toEqual({ synthetic: true, migrated: true });
        expect(job.attemptsMade).toBe(0); // DelayedError nunca consumiu tentativa.
        sent(job.id);
      },
      opts,
    );
    previousWorker.on('error', (error) => errors.push(error));
    closers.push(() => previousWorker.close());
    await vi.waitFor(
      async () => {
        expect(await old.getJobState(jobId)).toBe('completed');
      },
      { timeout: 10_000 },
    );
    expect(sent).toHaveBeenCalledExactlyOnceWith(jobId);
    expect(errors).toEqual([]);
  });

  async function proxy() {
    const sockets = new Set<Socket>();
    let online = true;
    let accepted = 0;
    const server = createServer((downstream) => {
      if (!online) return downstream.destroy();
      accepted++;
      const upstream = createConnection({
        host: connection.host,
        port: connection.port,
      });
      sockets.add(downstream).add(upstream);
      downstream.on('error', () => undefined);
      upstream.on('error', () => downstream.destroy());
      downstream.on('close', () => {
        sockets.delete(downstream);
        upstream.destroy();
      });
      upstream.on('close', () => {
        sockets.delete(upstream);
        downstream.destroy();
      });
      downstream.pipe(upstream).pipe(downstream);
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = (server.address() as AddressInfo).port;
    return {
      connection: { ...connection, host: '127.0.0.1', port },
      accepted: () => accepted,
      cut: () => {
        online = false;
        for (const socket of sockets) socket.destroy();
      },
      restore: () => {
        online = true;
      },
      close: async () => {
        for (const socket of sockets) socket.destroy();
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      },
    };
  }

  it('worker volta a consumir após perda das duas conexões, sem perder ou duplicar jobs', async () => {
    const opts = options();
    const network = await proxy();
    // Registro primeiro: o proxy permanece vivo até os clientes fecharem.
    closers.push(() => network.close());
    const producer = new Queue('reconnect', opts);
    const seen: string[] = [];
    const worker = new Worker(
      'reconnect',
      async (job) => {
        seen.push(job.id!);
      },
      {
        ...opts,
        connection: network.connection,
      },
    );
    const errors: Error[] = [];
    worker.on('error', (error) => errors.push(error));
    closers.push(
      () => producer.close(),
      () => worker.close(),
    );
    closers.push(async () => network.restore());
    await producer.add('probe', {}, { jobId: 'before' });
    await vi.waitFor(async () =>
      expect(await producer.getJobState('before')).toBe('completed'),
    );
    expect(network.accepted()).toBeGreaterThanOrEqual(2);
    const beforeReconnect = network.accepted();
    network.cut();
    await vi.waitFor(() => expect(errors.length).toBeGreaterThan(0), {
      timeout: 5_000,
    });
    await producer.add('probe', {}, { jobId: 'during' });
    expect(seen).toEqual(['before']);
    network.restore();
    await vi.waitFor(
      async () => {
        expect(await producer.getJobState('during')).toBe('completed');
      },
      { timeout: 10_000 },
    );
    await producer.add('probe', {}, { jobId: 'after' });
    await vi.waitFor(async () =>
      expect(await producer.getJobState('after')).toBe('completed'),
    );
    expect(network.accepted()).toBeGreaterThan(beforeReconnect);
    expect(seen).toEqual(['before', 'during', 'after']);
    expect((await producer.getJobCounts('failed')).failed).toBe(0);
  }, 20_000);

  it('shutdown encerra o worker ocioso mesmo com Redis indisponível', async () => {
    const opts = options();
    const network = await proxy();
    closers.push(() => network.close());
    const worker = new Worker('shutdown', async () => undefined, {
      ...opts,
      connection: network.connection,
      autorun: false,
    });
    worker.on('error', () => undefined); // erro de rede deliberado, sem unhandled.
    closers.push(() => worker.close());
    closers.push(async () => network.restore());
    await worker.waitUntilReady();
    const drained = once(worker, 'drained');
    const running = worker.run();
    await drained;
    const client = (await worker.getBackend().client) as unknown as {
      commandQueue: { length: number };
      offlineQueue: { length: number };
    };
    await vi.waitFor(() => {
      expect(client.commandQueue.length).toBe(0);
      expect(client.offlineQueue.length).toBe(0);
    });
    network.cut();
    await worker.close(); // v6.3.10: retries de conexão não mantêm shutdown em loop.
    await running;
    expect(worker.isRunning()).toBe(false);
  }, 10_000);
});
