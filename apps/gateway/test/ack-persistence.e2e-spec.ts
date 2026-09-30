import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../src/bootstrap/config';
import { Prisma, PrismaService } from '../src/infra/prisma/prisma.service';
import { MessagePersister } from '../src/modules/messaging/application/message-persister.service';
import type { SaveMessageInput } from '../src/modules/messaging/domain/message.repository';
import { PrismaMessageRepository } from '../src/modules/messaging/infrastructure/prisma-message.repository';
import { ReplyRateService } from '../src/modules/observability/reply-rate.service';
import { RetentionService } from '../src/modules/observability/retention.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import type { WaEventEnvelope } from '../src/modules/sessions/application/engine.port';
import { createTestApp, fakeSessionManager, inject, login } from './setup-app';

// Persistência, Postgres, GET e Inbox reais. EventBus/MessagePersister separados por réplica,
// sessões somente por SQL (STOPPED/autostart=false) e manager falso: nenhum transporte WhatsApp.
describe('E21/P-078 — ACK durável antes da persistência', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let metric: ReplyRateService;
  let token: string;
  const extraClients: PrismaService[] = [];
  let seq = 0;
  const sessionId = 'e21-ack-persistence';
  const otherSession = 'e21-ack-persistence-other';
  const ids = [sessionId, otherSession];
  const chatJid = '1001@s.whatsapp.net';
  const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000);
  const auth = () => ({ authorization: `Bearer ${token}` });

  async function newClient() {
    const client = new PrismaService(app.get(ConfigService<Env, true>));
    extraClients.push(client);
    await client.$connect();
    return client;
  }

  const pending = (keyId: string, sid = sessionId) =>
    prisma.pendingMessageAck.findUnique({
      where: { sessionId_keyId: { sessionId: sid, keyId } },
    });

  // O banco de teste pode conter outras suítes/sessões. Somente o DELETE de ACKs é real e
  // limitado aos IDs deste spec; os demais purges da mesma varredura não fazem efeitos.
  async function sweepPending() {
    const scoped = new Proxy(prisma, {
      get(target, prop) {
        if (prop === 'pendingMessageAck') {
          return {
            deleteMany: (args: Prisma.PendingMessageAckDeleteManyArgs) =>
              target.pendingMessageAck.deleteMany({
                where: {
                  AND: [args.where ?? {}, { sessionId: { in: ids } }],
                },
              }),
          };
        }
        if (prop === '$executeRaw') return async () => 0;
        return { deleteMany: async () => ({ count: 0 }) };
      },
    });
    await new RetentionService(scoped).sweep();
  }

  function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  }

  // Barreira SQL: ambas as réplicas precisam demonstrar espera no MESMO advisory lock antes
  // de liberar o titular. Não depende de atraso arbitrário nem da velocidade do PostgreSQL.
  async function holdMessageLock(keyId: string) {
    const blocker = await newClient();
    const acquired = deferred();
    const release = deferred();
    const identity = JSON.stringify(['message-ack', sessionId, keyId]);
    const transaction = blocker.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtextextended(${identity}, 0))`;
        acquired.resolve();
        await release.promise;
      },
      { timeout: 15_000 },
    );
    await Promise.race([
      acquired.promise,
      transaction.then(() => {
        throw new Error('a transação terminou antes da barreira');
      }),
    ]);
    return {
      async waitForWaiters(expected: number) {
        await vi.waitFor(
          async () => {
            const rows = await prisma.$queryRaw<Array<{ count: number }>>`
              WITH key AS (SELECT hashtextextended(${identity}, 0) AS value)
              SELECT count(*)::int AS count FROM pg_locks, key
              WHERE locktype = 'advisory' AND NOT granted AND objsubid = 1
                AND classid::bigint = ((key.value >> 32) & 4294967295)
                AND objid::bigint = (key.value & 4294967295)`;
            expect(rows[0].count).toBe(expected);
          },
          { timeout: 3_000, interval: 20 },
        );
      },
      async release() {
        release.resolve();
        await transaction;
      },
    };
  }

  function publisher(client = prisma) {
    const repo = new PrismaMessageRepository(client);
    const bus = new EventBus();
    let lastOperation: Promise<void> | undefined;
    const originalSave = repo.save.bind(repo);
    const originalAck = repo.updateStatusByKey.bind(repo);
    vi.spyOn(repo, 'save').mockImplementation((input) => {
      lastOperation = originalSave(input);
      return lastOperation;
    });
    vi.spyOn(repo, 'updateStatusByKey').mockImplementation((...args) => {
      lastOperation = originalAck(...args);
      return lastOperation;
    });
    new MessagePersister(repo, bus).onModuleInit();

    async function publish(
      event: 'message' | 'message.ack',
      payload: unknown,
      sid = sessionId,
    ) {
      lastOperation = undefined;
      const envelope: WaEventEnvelope = {
        id: `e21-ack-event-${++seq}`,
        timestamp: Math.floor(Date.now() / 1000),
        event,
        sessionId: sid,
        session: sid,
        payload,
        engine: 'baileys',
      };
      bus.publish({
        name: 'wa.event',
        occurredAt: new Date(),
        payload: envelope,
      });
      expect(lastOperation).toBeDefined();
      await lastOperation;
    }

    return {
      repo,
      ack: (keyId: string, status: string, sid = sessionId) =>
        publish('message.ack', { keyId, status }, sid),
      message: (input: SaveMessageInput) =>
        publish(
          'message',
          { ...input, timestamp: Math.floor(input.timestamp.getTime() / 1000) },
          input.sessionId,
        ),
    };
  }

  const messageInput = (
    keyId: string,
    extra: Partial<SaveMessageInput> = {},
  ): SaveMessageInput => ({
    sessionId,
    keyId,
    chatJid,
    senderJid: null,
    fromMe: true,
    source: 'api',
    isCold: true,
    type: 'text',
    text: 'fixture ACK',
    timestamp: ago(96),
    ...extra,
  });

  const status = async (keyId: string, sid = sessionId) =>
    (
      await prisma.waMessage.findFirst({
        where: { sessionId: sid, keyId },
        orderBy: { timestamp: 'desc' },
      })
    )?.status;

  beforeAll(async () => {
    app = await createTestApp(fakeSessionManager);
    prisma = app.get(PrismaService);
    metric = app.get(ReplyRateService);
    token = await login(app);
  });
  beforeEach(async () => {
    await prisma.waSession.deleteMany({ where: { id: { in: ids } } });
    await prisma.waSession.createMany({
      data: ids.map((id) => ({
        id,
        name: id,
        status: 'STOPPED',
        autostart: false,
      })),
    });
  });
  afterAll(async () => {
    await Promise.all(extraClients.map((client) => client.$disconnect()));
    if (prisma)
      await prisma.waSession.deleteMany({ where: { id: { in: ids } } });
    if (app) await app.close();
  });

  it('ACK antes do INSERT aparece no banco, GET, Inbox e taxas G4', async () => {
    const p = publisher();
    await p.ack('pre-insert', 'read');
    await p.message(messageInput('pre-insert'));
    expect(await status('pre-insert')).toBe('read');

    const messages = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}/messages?chatId=${encodeURIComponent(chatJid)}`,
      headers: auth(),
    });
    expect(messages.statusCode).toBe(200);
    expect(messages.json()).toEqual([
      expect.objectContaining({ keyId: 'pre-insert', status: 'read' }),
    ]);
    const inbox = await inject(app, {
      method: 'GET',
      url: `/api/inbox/messages?sessions=${sessionId}`,
      headers: auth(),
    });
    expect(inbox.statusCode).toBe(200);
    expect(inbox.json()).toEqual([
      expect.objectContaining({ keyId: 'pre-insert', status: 'read' }),
    ]);
    expect(await metric.compute(sessionId, 7)).toMatchObject({
      coldTotal: 1,
      deliveryRate: 1,
      readRate: 1,
    });
    expect(await pending('pre-insert')).toBeNull();
  });

  it.each(['sent', 'delivered', 'read', 'error'])(
    'reconcilia ACK %s anterior ao INSERT e consome o recibo',
    async (ackStatus) => {
      const p = publisher();
      await p.ack('each-status', ackStatus);
      expect(await pending('each-status')).toMatchObject({ status: ackStatus });
      await p.message(messageInput('each-status'));
      expect(await status('each-status')).toBe(ackStatus);
      expect(await pending('each-status')).toBeNull();
    },
  );

  it('duplicados e fora de ordem conservam read antes e depois do INSERT', async () => {
    const p = publisher();
    for (const ackStatus of ['read', 'delivered', 'read', 'sent', 'delivered'])
      await p.ack('out-of-order', ackStatus);
    expect(await prisma.pendingMessageAck.count({ where: { sessionId } })).toBe(
      1,
    );
    await p.message(messageInput('out-of-order'));
    for (const ackStatus of ['sent', 'read', 'delivered', 'read'])
      await p.ack('out-of-order', ackStatus);
    expect(await status('out-of-order')).toBe('read');
    expect(await pending('out-of-order')).toBeNull();
  });

  it('error permanece terminal e não conta entrega/leitura no G4', async () => {
    const p = publisher();
    await p.ack('error', 'error');
    await p.ack('error', 'read');
    await p.message(messageInput('error'));
    await p.ack('error', 'delivered');
    expect(await status('error')).toBe('error');
    expect(await metric.compute(sessionId, 7)).toMatchObject({
      coldTotal: 1,
      deliveryRate: 0,
      readRate: 0,
    });
    expect(await pending('error')).toBeNull();
  });

  it.each(['not-an-ack', 'toString', 'constructor', '__proto__'])(
    'status desconhecido %s não grava pendência nem altera a mensagem',
    async (unknownStatus) => {
      const p = publisher();
      await p.ack('unknown', unknownStatus);
      expect(await pending('unknown')).toBeNull();
      await p.message(messageInput('unknown'));
      await p.ack('unknown', unknownStatus);
      expect(await status('unknown')).toBeNull();
    },
  );

  it('inbound continua aceitando read-self sem integrar cold outbound no G4', async () => {
    const p = publisher();
    await p.ack('inbound', 'read');
    await p.message(
      messageInput('inbound', {
        fromMe: false,
        source: null,
        senderJid: chatJid,
      }),
    );
    await p.ack('inbound', 'delivered');
    expect(await status('inbound')).toBe('read');
    expect(await metric.compute(sessionId, 7)).toMatchObject({
      coldTotal: 0,
      deliveryRate: 0,
      readRate: 0,
    });
  });

  it('a mesma key em outra sessão mantém recibos e estados independentes', async () => {
    const p = publisher();
    await p.ack('shared-key', 'read');
    await p.message(messageInput('shared-key', { sessionId: otherSession }));
    expect(await status('shared-key', otherSession)).toBeNull();
    expect(await pending('shared-key')).toMatchObject({ status: 'read' });
    await p.ack('shared-key', 'delivered', otherSession);
    await p.message(messageInput('shared-key'));
    expect(await status('shared-key')).toBe('read');
    expect(await status('shared-key', otherSession)).toBe('delivered');
    expect(await pending('shared-key')).toBeNull();
  });

  it('ACK consumido e ACK inferior com UPDATE=0 não contaminam INSERT futuro da mesma key', async () => {
    const p = publisher();
    await p.ack('reused', 'read');
    await p.message(messageInput('reused', { timestamp: ago(97) }));
    await p.ack('reused', 'delivered');
    await p.ack('reused', 'read');
    expect(await pending('reused')).toBeNull();
    await p.message(messageInput('reused', { timestamp: ago(96) }));
    expect(await status('reused')).toBeNull();
    expect(
      await prisma.waMessage.findMany({
        where: { sessionId, keyId: 'reused' },
        orderBy: { timestamp: 'asc' },
        select: { status: true },
      }),
    ).toEqual([{ status: 'read' }, { status: null }]);
  });

  it('ACK de key duplicada existente segue atingindo somente timestamp mais recente', async () => {
    const p = publisher();
    await p.message(messageInput('latest', { timestamp: ago(97) }));
    await p.message(messageInput('latest', { timestamp: ago(96) }));
    await p.ack('latest', 'delivered');
    const rows = await prisma.waMessage.findMany({
      where: { sessionId, keyId: 'latest' },
      orderBy: { timestamp: 'asc' },
      select: { status: true },
    });
    expect(rows).toEqual([{ status: null }, { status: 'delivered' }]);
  });

  it('restart perde clientes/barramento/persister anteriores e recupera ACK somente do banco', async () => {
    const previousClient = await newClient();
    await publisher(previousClient).ack('restart', 'read');
    await previousClient.$disconnect();
    const nextClient = await newClient();
    await publisher(nextClient).message(messageInput('restart'));
    expect(await status('restart')).toBe('read');
    expect(await pending('restart')).toBeNull();
  });

  it.each(['ack-first', 'insert-first'] as const)(
    'duas instâncias, %s: barreira SQL prova ambos aguardando e reconcilia após lock',
    async (order) => {
      const p1 = publisher(await newClient());
      const p2 = publisher(await newClient());
      const barrier = await holdMessageLock('concurrent');
      const operations: Promise<void>[] = [];
      try {
        operations.push(
          order === 'ack-first'
            ? p1.ack('concurrent', 'read')
            : p1.message(messageInput('concurrent')),
        );
        await barrier.waitForWaiters(1);
        operations.push(
          order === 'ack-first'
            ? p2.message(messageInput('concurrent'))
            : p2.ack('concurrent', 'read'),
        );
        await barrier.waitForWaiters(2);
      } finally {
        await barrier.release();
        await Promise.all(operations);
      }
      expect(await status('concurrent')).toBe('read');
      expect(await pending('concurrent')).toBeNull();
    },
  );

  it('saveHistorical reconcilia ACK, deduplica lote e não revive ACK consumido', async () => {
    const p = publisher();
    await p.ack('history', 'read');
    const input = messageInput('history');
    expect(await p.repo.saveHistorical([input, input])).toBe(1);
    expect(await status('history')).toBe('read');
    expect(await pending('history')).toBeNull();
    expect(await p.repo.saveHistorical([input])).toBe(0);
    expect(await prisma.waMessage.count({ where: { sessionId } })).toBe(1);
    expect(await status('history')).toBe('read');
  });

  it('histórico >50: falha no segundo chunk preserva ACKs e retry insere somente faltantes', async () => {
    const inputs = Array.from({ length: 55 }, (_, n) =>
      messageInput(`chunk-${n}`, { isCold: false }),
    );
    await prisma.pendingMessageAck.createMany({
      data: inputs.map((input) => ({
        sessionId,
        keyId: input.keyId,
        status: 'read',
      })),
    });
    let transactions = 0;
    const failSecondChunk = new Proxy(prisma, {
      get(target, prop, receiver) {
        if (prop === '$transaction') {
          return (
            callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
          ) =>
            target.$transaction(async (tx) => {
              const count = await callback(tx);
              if (++transactions === 2)
                throw new Error('rollback intencional do chunk 2');
              return count;
            });
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    await expect(
      new PrismaMessageRepository(failSecondChunk).saveHistorical(inputs),
    ).rejects.toThrow('rollback intencional do chunk 2');
    expect(await prisma.waMessage.count({ where: { sessionId } })).toBe(50);
    expect(await prisma.pendingMessageAck.count({ where: { sessionId } })).toBe(
      5,
    );
    expect(await status('chunk-0')).toBe('read');
    expect(await status('chunk-50')).toBeUndefined();
    expect(await pending('chunk-50')).toMatchObject({ status: 'read' });

    expect(await publisher().repo.saveHistorical(inputs)).toBe(5);
    expect(await prisma.waMessage.count({ where: { sessionId } })).toBe(55);
    expect(await prisma.pendingMessageAck.count({ where: { sessionId } })).toBe(
      0,
    );
    expect(
      await prisma.waMessage.count({ where: { sessionId, status: 'read' } }),
    ).toBe(55);
  });

  it('idempotência duplica zero linhas e preserva pending de outra key até INSERT válido', async () => {
    const p = publisher();
    await p.message(
      messageInput('original', { idempotencyKey: 'same-intent' }),
    );
    await p.ack('original', 'read');
    await p.ack('different-key', 'delivered');
    await p.message(
      messageInput('different-key', { idempotencyKey: 'same-intent' }),
    );
    expect(await prisma.waMessage.count({ where: { sessionId } })).toBe(1);
    expect(await status('different-key')).toBeUndefined();
    expect(await pending('different-key')).toMatchObject({
      status: 'delivered',
    });
    await p.message(
      messageInput('different-key', { idempotencyKey: 'new-intent' }),
    );
    expect(await status('different-key')).toBe('delivered');
    expect(await pending('different-key')).toBeNull();
    expect(await p.repo.findByIdempotencyKey(sessionId, 'same-intent')).toEqual(
      {
        keyId: 'original',
        chatJid,
      },
    );
  });

  it('rollback de INSERT/status/delete mantém ACK pendente para a tentativa seguinte', async () => {
    const p = publisher();
    await p.ack('rollback', 'read');
    const rolledBack = new Proxy(prisma, {
      get(target, prop, receiver) {
        if (prop === '$transaction') {
          return (
            callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
          ) =>
            target.$transaction(async (tx) => {
              await callback(tx);
              throw new Error('rollback intencional P-078');
            });
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    await expect(
      new PrismaMessageRepository(rolledBack).save(messageInput('rollback')),
    ).rejects.toThrow('rollback intencional P-078');
    expect(await status('rollback')).toBeUndefined();
    expect(await pending('rollback')).toMatchObject({ status: 'read' });
    await p.message(messageInput('rollback'));
    expect(await status('rollback')).toBe('read');
    expect(await pending('rollback')).toBeNull();
  });

  it('retenção padrão remove só ACK pendente além de 90 dias', async () => {
    vi.stubEnv('RETENTION_MESSAGES_DAYS', undefined);
    try {
      await prisma.pendingMessageAck.createMany({
        data: [
          {
            sessionId,
            keyId: 'retention-old',
            status: 'read',
            lastSeenAt: ago(91 * 24),
          },
          {
            sessionId,
            keyId: 'retention-recent',
            status: 'read',
            lastSeenAt: ago(89 * 24),
          },
        ],
      });
      await sweepPending();
      expect(await pending('retention-old')).toBeNull();
      expect(await pending('retention-recent')).not.toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('RETENTION_MESSAGES_DAYS=0 preserva ACK antigo', async () => {
    vi.stubEnv('RETENTION_MESSAGES_DAYS', '0');
    try {
      await prisma.pendingMessageAck.create({
        data: {
          sessionId,
          keyId: 'retention-off',
          status: 'read',
          lastSeenAt: ago(120 * 24),
        },
      });
      await sweepPending();
      expect(await pending('retention-off')).not.toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('ACK válido inferior renova lastSeenAt sem regredir; desconhecido não renova', async () => {
    const p = publisher();
    const old = ago(91 * 24);
    await prisma.pendingMessageAck.create({
      data: { sessionId, keyId: 'renewed', status: 'read', lastSeenAt: old },
    });
    await p.ack('renewed', 'not-an-ack');
    expect((await pending('renewed'))?.lastSeenAt).toEqual(old);
    await p.ack('renewed', 'sent');
    const row = await pending('renewed');
    expect(row?.status).toBe('read');
    expect(row!.lastSeenAt.getTime()).toBeGreaterThan(Date.now() - 5_000);
    vi.stubEnv('RETENTION_MESSAGES_DAYS', '90');
    try {
      await sweepPending();
      expect(await pending('renewed')).not.toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('purge concorrente depois da leitura de pending não faz o INSERT/status rollback', async () => {
    const p = publisher();
    await p.ack('purge-race', 'read');
    await prisma.pendingMessageAck.update({
      where: { sessionId_keyId: { sessionId, keyId: 'purge-race' } },
      data: { lastSeenAt: ago(91 * 24) },
    });
    const readPending = deferred();
    const proceed = deferred();
    const writer = await newClient();
    const pausedAfterRead = new Proxy(writer, {
      get(target, prop, receiver) {
        if (prop === '$transaction') {
          return (
            callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
          ) =>
            target.$transaction(async (tx) => {
              const originalFind = tx.pendingMessageAck.findUnique.bind(
                tx.pendingMessageAck,
              );
              const pausedTx = new Proxy(tx, {
                get(transaction, model, transactionReceiver) {
                  if (model === 'pendingMessageAck') {
                    return new Proxy(transaction.pendingMessageAck, {
                      get(delegate, method, delegateReceiver) {
                        if (method === 'findUnique') {
                          return async (
                            args: Prisma.PendingMessageAckFindUniqueArgs,
                          ) => {
                            const row = await originalFind(args);
                            readPending.resolve();
                            await proceed.promise;
                            return row;
                          };
                        }
                        return Reflect.get(delegate, method, delegateReceiver);
                      },
                    });
                  }
                  return Reflect.get(transaction, model, transactionReceiver);
                },
              });
              return callback(pausedTx);
            });
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    const save = new PrismaMessageRepository(pausedAfterRead).save(
      messageInput('purge-race'),
    );
    try {
      await Promise.race([
        readPending.promise,
        save.then(() => {
          throw new Error('save terminou antes da barreira de pending');
        }),
      ]);
      vi.stubEnv('RETENTION_MESSAGES_DAYS', '90');
      await sweepPending();
      expect(await pending('purge-race')).toBeNull();
    } finally {
      proceed.resolve();
      vi.unstubAllEnvs();
      await expect(save).resolves.toBeUndefined();
    }
    expect(await status('purge-race')).toBe('read');
    expect(await pending('purge-race')).toBeNull();
  });

  it('exclusão da sessão remove somente seus ACKs por FK cascade', async () => {
    const p = publisher();
    await p.ack('cascade', 'read');
    await p.ack('cascade', 'delivered', otherSession);
    await prisma.waSession.delete({ where: { id: sessionId } });
    expect(await pending('cascade')).toBeNull();
    expect(await pending('cascade', otherSession)).toMatchObject({
      status: 'delivered',
    });
  });

  it('ACK read durável não transforma reação de alvo ambíguo em resposta confiável D-047', async () => {
    const p = publisher();
    await p.ack('ambiguous-key', 'read');
    await p.message(messageInput('ambiguous-key', { timestamp: ago(97) }));
    await p.message(
      messageInput('ambiguous-key', {
        chatJid: '1002@s.whatsapp.net',
        timestamp: ago(96),
      }),
    );
    await prisma.messageReaction.create({
      data: {
        id: `e21-ack-reaction-${++seq}`,
        sessionId,
        targetKeyId: 'ambiguous-key',
        chatJid: '8001@lid',
        senderKey: 'peer',
        senderJid: '8001@lid',
        fromMe: false,
        emoji: '👍',
        timestamp: ago(95),
        createdAt: ago(95),
      },
    });
    expect(await metric.compute(sessionId, 7)).toMatchObject({
      coldTotal: 2,
      coldMature: 2,
      responded: 0,
      ambiguousMature: 2,
      reliable: false,
      replyRate: 0,
      deliveryRate: 0.5,
      readRate: 0.5,
    });
  });
});
