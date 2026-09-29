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
import { fork } from 'node:child_process';
import { once } from 'node:events';
import {
  createConnection,
  createServer,
  type AddressInfo,
  type Socket,
} from 'node:net';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { ConfigService } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import Redis, { type Command } from 'ioredis';
import { Worker } from 'bullmq';
import { Worker as WorkerV5 } from 'bullmq-v5';
import type { Env } from '../src/bootstrap/config';
import { redisConnection } from '../src/infra/redis/redis-connection';
import { createTestApp } from './setup-app';

// P-100: close() não tem timeout por contrato. A prova observa a Promise real de
// moveToActive em voo, corta só o TCP de fixture e restaura a rede para o close
// normal terminar. Não altera retries, não desconecta o cliente principal e não
// usa close(true). Fontes: docs.bullmq.io/guide/workers/graceful-shutdown e
// github.com/redis/ioredis#auto-reconnect (maxRetriesPerRequest:null).
describe('E18/P-100 — shutdown diferencial BullMQ 5/6 com ioredis 5', () => {
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
    // Restaurar a rede vem primeiro, inclusive quando a asserção falha. Nunca
    // fazemos FLUSHDB, reiniciamos Redis ou apagamos um prefixo de outra sessão.
    for (const close of closers.splice(0).reverse()) await close();
    vi.restoreAllMocks();
    if (!prefix) return;
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
  });

  afterAll(async () => {
    await redis?.quit();
    await app?.close();
  });

  async function proxy() {
    const sockets = new Set<Socket>();
    const upstreams = new Map<Socket, Socket>();
    let online = true;
    let refusedConnections = 0;
    const server = createServer((downstream) => {
      if (!online) {
        refusedConnections++;
        downstream.destroy();
        return;
      }
      const upstream = createConnection({
        host: connection.host,
        port: connection.port,
      });
      sockets.add(downstream).add(upstream);
      upstreams.set(downstream, upstream);
      downstream.on('error', () => undefined);
      upstream.on('error', () => downstream.destroy());
      downstream.on('close', () => {
        sockets.delete(downstream);
        upstreams.delete(downstream);
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
    return {
      connection: {
        ...connection,
        host: '127.0.0.1',
        port: (server.address() as AddressInfo).port,
      },
      refusedConnections: () => refusedConnections,
      cutMain: (localPort: number) => {
        online = false;
        for (const [downstream, upstream] of upstreams) {
          if (downstream.remotePort === localPort) {
            downstream.destroy();
            upstream.destroy();
          }
        }
      },
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

  function observe(promise: Promise<unknown>) {
    const result: {
      status: 'pending' | 'fulfilled' | 'rejected';
      error?: unknown;
    } = { status: 'pending' };
    void promise.then(
      () => {
        result.status = 'fulfilled';
      },
      (error: unknown) => {
        result.status = 'rejected';
        result.error = error;
      },
    );
    return result;
  }

  async function mainClient(worker: Worker | WorkerV5): Promise<Redis> {
    return (worker instanceof Worker
      ? await worker.getBackend().client
      : await worker.client) as unknown as Redis;
  }

  // Leitura restrita da Promise interna que o próprio close() aguarda, sem
  // substituir sua implementação. As duas versões foram conferidas na fonte.
  function mainLoop(worker: Worker | WorkerV5): Promise<unknown> {
    const promise = (
      worker as unknown as { mainLoopRunning: Promise<unknown> | null }
    ).mainLoopRunning;
    expect(promise).toBeInstanceOf(Promise);
    return promise!;
  }

  for (const implementation of [
    {
      version: '5.81.5',
      create: (
        opts: {
          prefix: string;
          connection: ReturnType<typeof redisConnection>;
          autorun: false;
        },
        processor: () => Promise<void>,
      ) => new WorkerV5('shutdown', processor, opts),
    },
    {
      version: '6.3.10',
      create: (
        opts: {
          prefix: string;
          connection: ReturnType<typeof redisConnection>;
          autorun: false;
        },
        processor: () => Promise<void>,
      ) => new Worker('shutdown', processor, opts),
    },
  ]) {
    describe(`BullMQ ${implementation.version}`, () => {
      async function fixture() {
        prefix = `e18-p100-${randomUUID()}`;
        const network = await proxy();
        const processor = vi.fn(async () => undefined);
        const worker = implementation.create(
          {
            prefix,
            connection: network.connection,
            autorun: false,
          },
          processor,
        );
        const errors: Error[] = [];
        worker.on('error', (error) => errors.push(error));
        closers.push(
          () => network.close(),
          () => worker.close(),
          async () => network.restore(),
        );
        await worker.waitUntilReady();
        const client = await mainClient(worker);
        expect(client.options.maxRetriesPerRequest).toBeNull();
        expect(client.options.autoResendUnfulfilledCommands).toBe(true);
        return { network, worker, client, processor, errors };
      }

      it('close aguarda a Promise EVAL de moveToActive em voo até Redis voltar', async () => {
        const { network, worker, client, processor } = await fixture();
        let pending: Command | undefined;
        let submittedBeforeCut = false;
        let unresolvedBeforeCut = false;
        const sendCommand = client.sendCommand.bind(client);
        vi.spyOn(client, 'sendCommand').mockImplementation(
          (command, stream) => {
            // Os 11 KEYS e os dois primeiros nomes identificam moveToActive nas
            // duas versões. O ioredis transforma EVALSHA em EVAL no primeiro uso.
            if (
              !pending &&
              command.name === 'evalsha' &&
              Number(command.args[1]) === 11 &&
              command.args[2] === `${prefix}:shutdown:wait` &&
              command.args[3] === `${prefix}:shutdown:active`
            ) {
              pending = command;
              // Envia de verdade, observa a commandQueue e corta o proxy no mesmo
              // turno JS, antes que uma resposta possa resolver a Promise.
              const result = sendCommand(command, stream);
              submittedBeforeCut = client.commandQueue
                .toArray()
                .some((item) => item.command === command);
              unresolvedBeforeCut = !command.isResolved;
              // Manter o socket bloqueante vivo isola a Promise da conexão
              // principal: close() consegue desconectá-lo normalmente.
              network.cutMain(
                (client as unknown as { stream: Socket }).stream.localPort!,
              );
              return result;
            }
            return sendCommand(command, stream);
          },
        );
        const running = worker.run();
        const runningState = observe(running);
        await vi.waitFor(() => {
          expect(pending).toBeDefined();
        });
        const command = pending!;
        expect(command.name).toBe('eval');
        expect(submittedBeforeCut).toBe(true);
        expect(unresolvedBeforeCut).toBe(true);
        const commandState = observe(command.promise);
        const loopState = observe(mainLoop(worker));
        const quit = vi.spyOn(client, 'quit');
        await vi.waitFor(
          () => expect(network.refusedConnections()).toBeGreaterThan(0),
          { timeout: 5_000 },
        );
        const closing = worker.close();
        const closeState = observe(closing);
        // Janela finita de observação, não promessa de timeout: sem resposta
        // Redis o contrato upstream não oferece limite para esse close().
        await delay(750);
        expect(commandState.status).toBe('pending');
        expect(loopState.status).toBe('pending');
        expect(runningState.status).toBe('pending');
        expect(closeState.status).toBe('pending');
        expect(quit).not.toHaveBeenCalled();
        expect(processor).not.toHaveBeenCalled();

        network.restore();
        await vi.waitFor(() => expect(closeState.status).toBe('fulfilled'), {
          timeout: 10_000,
        });
        await Promise.all([command.promise, running, closing]);
        expect(commandState.status).toBe('fulfilled');
        expect(loopState.status).toBe('fulfilled');
        expect(quit).toHaveBeenCalledOnce();
        expect(worker.isRunning()).toBe(false);
        expect(processor).not.toHaveBeenCalled();
      }, 20_000);

      it('close ocioso encerra offline quando a conexão principal não tem comandos', async () => {
        const { network, worker, client, processor } = await fixture();
        const drained = once(worker, 'drained');
        const running = worker.run();
        await drained;
        await vi.waitFor(() => {
          expect(client.commandQueue.length).toBe(0);
          expect(
            (client as unknown as { offlineQueue: { length: number } })
              .offlineQueue.length,
          ).toBe(0);
        });
        network.cut();
        await worker.close();
        await running;
        expect(worker.isRunning()).toBe(false);
        expect(processor).not.toHaveBeenCalled();
      }, 10_000);

      it('perda das duas conexões em reconnecting deixa disconnectBlocking pendente após a rede voltar', async () => {
        prefix = `e18-p100-${randomUUID()}`;
        const child = fork(
          join(__dirname, 'fixtures/bullmq-shutdown-socketless.mjs'),
          {
            execArgv: [],
            stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
          },
        );
        const records: Record<string, unknown>[] = [];
        child.on('message', (message) =>
          records.push(message as Record<string, unknown>),
        );
        child.on('error', (error) =>
          records.push({ phase: 'error', message: error.message }),
        );
        child.on('exit', (code, signal) => {
          if (!records.some((record) => record.phase === 'restored')) {
            records.push({
              phase: 'error',
              message: `probe encerrou antes da evidência: ${code}/${signal}`,
            });
          }
        });
        child.send({ version: implementation.version, connection, prefix });
        try {
          await vi.waitFor(
            () => {
              expect(
                records.find((record) => record.phase === 'error'),
              ).toBeUndefined();
              expect(
                records.find((record) => record.phase === 'restored'),
              ).toBeDefined();
            },
            { timeout: 25_000 },
          );
          expect(records).toEqual([
            expect.objectContaining({
              phase: 'offline',
              submittedBeforeCut: true,
              command: 'eval',
              commandState: 'pending',
              loopState: 'pending',
              runningState: 'pending',
              closingState: 'pending',
              disconnectState: 'pending',
              blockingEndEvents: 0,
              processed: 0,
            }),
            expect.objectContaining({
              phase: 'restored',
              commandState: 'fulfilled',
              loopState: 'fulfilled',
              runningState: 'fulfilled',
              closingState: 'pending',
              disconnectState: 'pending',
              mainStatus: 'ready',
              blockingStatus: 'reconnecting',
              blockingEndEvents: 0,
              processed: 0,
            }),
          ]);
        } finally {
          // Limpeza do subprocesso que reproduz a falha. A asserção acima exige
          // close PENDENTE; SIGTERM nunca é contado como graceful shutdown.
          if (
            child.pid &&
            child.exitCode === null &&
            child.signalCode === null
          ) {
            const exited = once(child, 'exit');
            child.kill('SIGTERM');
            await exited;
          }
        }
      }, 30_000);
    });
  }
});
