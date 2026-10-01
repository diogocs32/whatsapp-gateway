import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { Env } from '../src/bootstrap/config';
import { Prisma, PrismaService } from '../src/infra/prisma/prisma.service';
import type {
  CreateRefreshTokenInput,
  RotateInput,
} from '../src/modules/iam/domain/refresh-token.repository';
import { PrismaRefreshTokenRepository } from '../src/modules/iam/infrastructure/prisma-refresh-token.repository';
import { hashPassword, sha512 } from '../src/shared-kernel/crypto';
import {
  createTestApp,
  fakeSessionManager,
  inject,
  readSetCookie,
} from './setup-app';

// HTTP/auth e PostgreSQL reais; manager falso, nenhum registro/engine WhatsApp.
// Fixtures pertencem exclusivamente a este spec. O cutoff histórico limita a varredura dos
// cenários de retenção aos expirados artificiais, sem apagar tokens normais de outras suítes.
describe('E21/P-005 — purge seguro de refresh tokens', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let repo: PrismaRefreshTokenRepository;
  let passwordHash: string;
  let userId: string;
  let username: string;
  let sequence = 0;
  const userIds: string[] = [];
  const extraClients: PrismaService[] = [];
  const password = 'fixture-refresh-purge-123';
  const cutoff = new Date('1971-01-01T00:00:00.000Z');
  const expired = new Date('1970-01-01T00:00:00.000Z');
  const future = () => new Date(Date.now() + 30 * 86_400_000);

  function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  }

  async function reached(barrier: Promise<void>, operation: Promise<unknown>) {
    let deadline!: ReturnType<typeof setTimeout>;
    const timedOut = new Promise<never>((_resolve, reject) => {
      deadline = setTimeout(
        () => reject(new Error('a barreira não foi alcançada em 3 segundos')),
        3_000,
      );
    });
    try {
      await Promise.race([
        barrier,
        operation.then(() => {
          throw new Error('a operação terminou antes de alcançar a barreira');
        }),
        timedOut,
      ]);
    } finally {
      clearTimeout(deadline);
    }
  }

  async function newClient() {
    const client = new PrismaService(app.get(ConfigService<Env, true>));
    extraClients.push(client);
    await client.$connect();
    return client;
  }

  interface Hooks {
    beforeCreate?: (args: Prisma.RefreshTokenCreateArgs) => Promise<void>;
    afterRead?: () => Promise<void>;
    afterCandidates?: (
      rows: Array<{ id: string; userId: string }>,
    ) => Promise<void>;
  }

  // A consulta de candidatos mantém o WHERE/NOT EXISTS/ordenação/LIMIT reais e ganha
  // somente um predicado de fixture antes do ORDER BY. O DELETE transacional é real,
  // sem mock/filtro substituto: preserva tanto a seleção quanto a revalidação de família.
  function candidateQuery(
    args: [TemplateStringsArray | Prisma.Sql, ...unknown[]],
  ) {
    const query = Array.isArray(args[0])
      ? Prisma.sql(args[0] as readonly string[], ...args.slice(1))
      : (args[0] as Prisma.Sql);
    if (!/^\s*SELECT r\.id\b/.test(query.strings.join(' '))) return null;
    const split = query.strings.findIndex((part) => part.includes('ORDER BY'));
    if (split < 0) throw new Error('consulta de candidatos sem ORDER BY');
    const [beforeOrder, ...afterOrder] = query.strings[split].split('ORDER BY');
    const prefix = Prisma.sql(
      [...query.strings.slice(0, split), beforeOrder],
      ...query.values.slice(0, split),
    );
    const suffix = Prisma.sql(
      [
        `ORDER BY${afterOrder.join('ORDER BY')}`,
        ...query.strings.slice(split + 1),
      ],
      ...query.values.slice(split),
    );
    return Prisma.sql`${prefix} AND r."userId" IN (${Prisma.join(userIds)}) ${suffix}`;
  }

  function clientWithHooks(client: PrismaService, hooks: Hooks = {}) {
    function transactionWithHooks(tx: Prisma.TransactionClient) {
      return new Proxy(tx, {
        get(target, property, receiver) {
          if (property === 'refreshToken') {
            return new Proxy(target.refreshToken, {
              get(delegate, method, delegateReceiver) {
                if (method === 'create' && hooks.beforeCreate) {
                  return async (args: Prisma.RefreshTokenCreateArgs) => {
                    await hooks.beforeCreate!(args);
                    return delegate.create(args);
                  };
                }
                if (method === 'findUnique' && hooks.afterRead) {
                  return async (args: Prisma.RefreshTokenFindUniqueArgs) => {
                    const found = await delegate.findUnique(args);
                    await hooks.afterRead!();
                    return found;
                  };
                }
                return Reflect.get(delegate, method, delegateReceiver);
              },
            });
          }
          return Reflect.get(target, property, receiver);
        },
      });
    }

    return new Proxy(client, {
      get(target, property, receiver) {
        if (property === '$transaction') {
          return (
            callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
            options?: {
              maxWait?: number;
              timeout?: number;
              isolationLevel?: Prisma.TransactionIsolationLevel;
            },
          ) =>
            target.$transaction((tx) => callback(transactionWithHooks(tx)), {
              timeout: 10_000,
              ...options,
            });
        }
        if (property === '$queryRaw') {
          return async (
            ...args: [TemplateStringsArray | Prisma.Sql, ...unknown[]]
          ) => {
            const scoped = candidateQuery(args);
            if (scoped) {
              const candidates =
                await target.$queryRaw<Array<{ id: string; userId: string }>>(
                  scoped,
                );
              await hooks.afterCandidates?.(candidates);
              return candidates;
            }
            return target.$queryRaw(...args);
          };
        }
        return Reflect.get(target, property, receiver);
      },
    });
  }

  const repository = (client = prisma, hooks: Hooks = {}) =>
    new PrismaRefreshTokenRepository(clientWithHooks(client, hooks));

  function rotation(token: CreateRefreshTokenInput): RotateInput {
    const next = input({ expiresAt: future() });
    return {
      presentedHash: token.tokenHash,
      newId: next.id,
      newTokenHash: next.tokenHash,
      newExpiresAt: next.expiresAt,
    };
  }

  async function waitUntilExpired(id: string) {
    // Condição no relógio real do PostgreSQL; nenhuma duração arbitrária decide a corrida.
    await vi.waitFor(
      async () => {
        const [state] = await prisma.$queryRaw<Array<{ expired: boolean }>>`
          SELECT "expiresAt" < clock_timestamp() - interval '100 milliseconds' AS expired
          FROM refresh_tokens WHERE id = ${id}`;
        expect(state.expired).toBe(true);
      },
      { timeout: 3_000, interval: 20 },
    );
    return new Date(Date.now() - 50);
  }

  async function holdUserLock() {
    const blocker = await newClient();
    const acquired = deferred();
    const release = deferred();
    const identity = `iam-refresh-user:${userId}`;
    const transaction = blocker.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identity}, 0))`;
        acquired.resolve();
        await release.promise;
      },
      { timeout: 10_000 },
    );
    await reached(acquired.promise, transaction);
    return {
      waitForWaiters: waitForUserWaiters,
      async release() {
        release.resolve();
        await transaction;
      },
    };
  }

  async function waitForUserWaiters(expected: number) {
    const identity = `iam-refresh-user:${userId}`;
    await vi.waitFor(
      async () => {
        const [locks] = await prisma.$queryRaw<Array<{ count: number }>>`
          WITH key AS (SELECT hashtextextended(${identity}, 0) AS value)
          SELECT count(*)::int AS count FROM pg_locks, key
          WHERE locktype = 'advisory' AND NOT granted AND objsubid = 1
            AND classid::bigint = ((key.value >> 32) & 4294967295)
            AND objid::bigint = (key.value & 4294967295)`;
        expect(locks.count).toBe(expected);
      },
      { timeout: 3_000, interval: 20 },
    );
  }

  async function createUser() {
    const id = `e21-refresh-purge-${randomUUID()}`;
    userIds.push(id);
    await prisma.user.create({
      data: {
        id,
        username: id,
        name: 'Fixture P-005',
        passwordHash,
        role: 'VIEWER',
      },
    });
    return id;
  }

  function input(
    extra: Partial<CreateRefreshTokenInput> = {},
  ): CreateRefreshTokenInput {
    const id = `${userId}-token-${++sequence}`;
    return {
      id,
      userId,
      tokenHash: sha512(id),
      sessionId: `${id}-family`,
      expiresAt: expired,
      ...extra,
    };
  }

  const row = (tokenHash: string) =>
    prisma.refreshToken.findUnique({ where: { tokenHash } });
  const rows = () => prisma.refreshToken.findMany({ where: { userId } });

  async function loginRaw() {
    const response = await inject(app, {
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: { username, password },
    });
    expect(response.statusCode).toBeLessThan(300);
    const refresh = readSetCookie(response, 'refresh_token');
    const access = readSetCookie(response, 'token');
    expect(refresh).toBeDefined();
    expect(access).toBeDefined();
    return { refresh: refresh!, access: access! };
  }

  const refreshWith = (raw: string) =>
    inject(app, {
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: `refresh_token=${raw}` },
    });

  beforeAll(async () => {
    app = await createTestApp(fakeSessionManager);
    prisma = app.get(PrismaService);
    repo = repository();
    passwordHash = await hashPassword(password);
  });
  beforeEach(async () => {
    userId = await createUser();
    username = userId;
  });
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    userIds.length = 0;
  });
  afterAll(async () => {
    await Promise.all(extraClients.map((client) => client.$disconnect()));
    if (app) await app.close();
  });

  it('reproduz acúmulo e remove expirados ativos/revogados sem remover ainda válidos', async () => {
    const dead = Array.from({ length: 6 }, () => input());
    const valid = input({ expiresAt: future() });
    for (const token of [...dead, valid]) await repo.create(token);
    await prisma.refreshToken.update({
      where: { id: dead[0].id },
      data: { revokedAt: expired },
    });
    expect(await rows()).toHaveLength(7);

    expect(await repo.purgeExpired(cutoff)).toBe(6);
    expect(await rows()).toEqual([expect.objectContaining({ id: valid.id })]);
    expect(await repo.purgeExpired(cutoff)).toBe(0);
  });

  it('limita cada lote e repete até drenar; nova execução é idempotente', async () => {
    for (let i = 0; i < 7; i++) await repo.create(input());
    const deleted: number[] = [];
    for (let i = 0; i < 5; i++)
      deleted.push(await repo.purgeExpired(cutoff, 2));
    expect(deleted).toEqual([2, 2, 2, 1, 0]);
    expect(await rows()).toHaveLength(0);
  });

  it('lote padrão remove no máximo 500 linhas', async () => {
    await prisma.refreshToken.createMany({
      data: Array.from({ length: 501 }, () => input()),
    });
    expect(await repo.purgeExpired(cutoff)).toBe(500);
    expect(await rows()).toHaveLength(1);
    expect(await repo.purgeExpired(cutoff)).toBe(1);
    expect(await repo.purgeExpired(cutoff)).toBe(0);
  });

  it('ancestrais protegidos não ocupam o limite e não impedem coletar outra família', async () => {
    const live = input({ expiresAt: future() });
    await repo.create(live);
    await prisma.refreshToken.createMany({
      data: Array.from({ length: 5 }, () => ({
        ...input({ sessionId: live.sessionId }),
        revokedAt: expired,
      })),
    });
    const collectable = Array.from({ length: 3 }, () =>
      input({ expiresAt: new Date(expired.getTime() + 1) }),
    );
    await prisma.refreshToken.createMany({ data: collectable });

    expect(await repo.purgeExpired(cutoff, 2)).toBe(2);
    expect(await repo.purgeExpired(cutoff, 2)).toBe(1);
    expect(await repo.purgeExpired(cutoff, 2)).toBe(0);
    expect(await rows()).toHaveLength(6);
    expect((await row(live.tokenHash))?.revokedAt).toBeNull();
  });

  it('usa expiresAt estritamente menor que cutoff e conserva família com terminal na margem', async () => {
    const boundary = input({ expiresAt: cutoff });
    const ancestor = input({ sessionId: boundary.sessionId });
    const below = input({ expiresAt: new Date(cutoff.getTime() - 1) });
    const above = input({ expiresAt: new Date(cutoff.getTime() + 1) });
    for (const token of [boundary, ancestor, below, above])
      await repo.create(token);
    await prisma.refreshToken.update({
      where: { id: ancestor.id },
      data: { revokedAt: expired, replacedBy: boundary.id },
    });

    expect(await repo.purgeExpired(cutoff)).toBe(1);
    expect((await rows()).map((token) => token.id).sort()).toEqual(
      [boundary.id, ancestor.id, above.id].sort(),
    );
  });

  it('A rotacionado/expirado sobrevive ao purge e seu reuso revoga B válido por HTTP e SQL', async () => {
    const first = await loginRaw();
    await prisma.refreshToken.update({
      where: { tokenHash: sha512(first.refresh) },
      data: { expiresAt: new Date(Date.now() + 5_000) },
    });
    const rotated = await refreshWith(first.refresh);
    expect(rotated.statusCode).toBeLessThan(300);
    const next = readSetCookie(rotated, 'refresh_token')!;
    const a = (await row(sha512(first.refresh)))!;
    const b = (await row(sha512(next)))!;
    expect(a.revokedAt).not.toBeNull();
    expect(a.replacedBy).toBe(b.id);
    expect(b.sessionId).toBe(a.sessionId);
    expect(b.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(b.expiresAt.getTime()).toBeGreaterThan(a.expiresAt.getTime());
    await prisma.refreshToken.update({
      where: { id: a.id },
      data: { expiresAt: expired },
    });

    expect(await repo.purgeExpired(cutoff)).toBe(0);
    expect(await row(a.tokenHash)).not.toBeNull();
    expect((await row(b.tokenHash))?.revokedAt).toBeNull();
    expect((await refreshWith(first.refresh)).statusCode).toBe(401);
    expect((await row(b.tokenHash))?.revokedAt).not.toBeNull();
    expect((await refreshWith(next)).statusCode).toBe(401);

    expect(await repo.purgeExpired(cutoff)).toBe(1);
    expect(await row(a.tokenHash)).toBeNull();
    // A linha de B já revogada ainda não expirou e continua até seu cutoff.
    expect(await row(b.tokenHash)).not.toBeNull();
  });

  it('reuso após purge e logout afetam somente a família, mesmo com outro login do usuário', async () => {
    const first = await loginRaw();
    const independent = await loginRaw();
    const rotated = await refreshWith(first.refresh);
    const next = readSetCookie(rotated, 'refresh_token')!;
    await prisma.refreshToken.update({
      where: { tokenHash: sha512(first.refresh) },
      data: { expiresAt: expired },
    });
    const unrelated = input();
    await repo.create(unrelated);
    expect(await repo.purgeExpired(cutoff)).toBe(1);
    expect(await row(unrelated.tokenHash)).toBeNull();
    expect((await refreshWith(first.refresh)).statusCode).toBe(401);
    expect((await refreshWith(next)).statusCode).toBe(401);
    expect((await row(sha512(independent.refresh)))?.revokedAt).toBeNull();

    const renewed = await refreshWith(independent.refresh);
    expect(renewed.statusCode).toBeLessThan(300);
    const surviving = readSetCookie(renewed, 'refresh_token')!;
    const logout = await inject(app, {
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: `refresh_token=${surviving}` },
    });
    expect(logout.statusCode).toBeLessThan(300);
    expect((await row(sha512(surviving)))?.revokedAt).not.toBeNull();
    expect((await refreshWith(surviving)).statusCode).toBe(401);
  });

  it('revokeAllForUser após purge revoga todas as famílias e preserva outro usuário', async () => {
    const first = await loginRaw();
    const second = await loginRaw();
    const otherUser = await createUser();
    const other = input({ userId: otherUser, expiresAt: future() });
    const dead = input();
    await repo.create(other);
    await repo.create(dead);
    expect(await repo.purgeExpired(cutoff)).toBe(1);
    expect(await repo.revokeAllForUser(userId)).toBe(2);
    expect(await repo.revokeAllForUser(userId)).toBe(0);
    expect((await refreshWith(first.refresh)).statusCode).toBe(401);
    expect((await refreshWith(second.refresh)).statusCode).toBe(401);
    expect((await row(other.tokenHash))?.revokedAt).toBeNull();
  });

  it('logout com ancestral expirado retido pelo purge revoga o descendente e mantém outro login', async () => {
    const first = await loginRaw();
    const independent = await loginRaw();
    const rotated = await refreshWith(first.refresh);
    const child = readSetCookie(rotated, 'refresh_token')!;
    await prisma.refreshToken.update({
      where: { tokenHash: sha512(first.refresh) },
      data: { expiresAt: expired },
    });
    expect(await repo.purgeExpired(cutoff)).toBe(0);

    const logout = await inject(app, {
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: `refresh_token=${first.refresh}` },
    });
    expect(logout.statusCode).toBeLessThan(300);
    expect((await row(sha512(child)))?.revokedAt).not.toBeNull();
    expect((await refreshWith(child)).statusCode).toBe(401);
    expect((await refreshWith(independent.refresh)).statusCode).toBeLessThan(
      300,
    );
    expect(await repo.purgeExpired(cutoff)).toBe(1);
  });

  it('purge pula usuário com lock ocupado e coleta no retry após liberar', async () => {
    const dead = input();
    await repo.create(dead);
    const lock = await holdUserLock();
    try {
      expect(await repo.purgeExpired(cutoff)).toBe(0);
      expect(await row(dead.tokenHash)).not.toBeNull();
    } finally {
      await lock.release();
    }
    expect(await repo.purgeExpired(cutoff)).toBe(1);
    expect(await row(dead.tokenHash)).toBeNull();
  });

  it.each(['create', 'rotate', 'logout', 'revokeAll'] as const)(
    '%s disputa o mesmo advisory lock PostgreSQL do usuário',
    async (mutation) => {
      const current = input({ expiresAt: future() });
      await repo.create(current);
      const next = input({ expiresAt: future() });
      const lock = await holdUserLock();
      const operation =
        mutation === 'create'
          ? repo.create(next)
          : mutation === 'rotate'
            ? repo.rotate(rotation(current))
            : mutation === 'logout'
              ? repo.revokeFamilyByToken(current.tokenHash)
              : repo.revokeAllForUser(userId);
      try {
        await lock.waitForWaiters(1);
        expect((await row(current.tokenHash))?.revokedAt).toBeNull();
        expect(await row(next.tokenHash)).toBeNull();
      } finally {
        await lock.release();
        await operation;
      }
      if (mutation === 'create') {
        expect(await row(next.tokenHash)).not.toBeNull();
      } else {
        expect((await row(current.tokenHash))?.revokedAt).not.toBeNull();
      }
    },
  );

  it('dois purges com o mesmo snapshot contam cada DELETE uma vez e preservam token válido', async () => {
    const dead = Array.from({ length: 7 }, () => input());
    const live = input({ expiresAt: future() });
    await prisma.refreshToken.createMany({ data: [...dead, live] });
    const bothRead = deferred();
    const proceed = deferred();
    let reads = 0;
    const hooks: Hooks = {
      afterCandidates: async (candidates) => {
        expect(candidates).toHaveLength(7);
        if (++reads === 2) bothRead.resolve();
        await proceed.promise;
      },
    };
    const first = repository(await newClient(), hooks).purgeExpired(cutoff);
    const second = repository(await newClient(), hooks).purgeExpired(cutoff);
    try {
      await reached(bothRead.promise, Promise.all([first, second]));
      expect(await rows()).toHaveLength(8);
    } finally {
      proceed.resolve();
      await Promise.allSettled([first, second]);
    }
    const results = await Promise.all([first, second]);
    expect(results.reduce((sum, deleted) => sum + deleted, 0)).toBe(7);
    expect(await rows()).toEqual([expect.objectContaining({ id: live.id })]);
    expect(await repo.purgeExpired(cutoff)).toBe(0);
  });

  it('purge durante rotação na expiração não perde ancestral nem permite reuso do filho', async () => {
    const original = input({ expiresAt: new Date(Date.now() + 1_000) });
    await repo.create(original);
    const next = rotation(original);
    const beforeInsert = deferred();
    const proceed = deferred();
    const writer = repository(await newClient(), {
      beforeCreate: async () => {
        beforeInsert.resolve();
        await proceed.promise;
      },
    });
    const rotating = writer.rotate(next);
    try {
      await reached(beforeInsert.promise, rotating);
      const boundary = await waitUntilExpired(original.id);
      expect(await repo.purgeExpired(boundary)).toBe(0);
      expect(await row(original.tokenHash)).not.toBeNull();
      expect(await row(next.newTokenHash)).toBeNull(); // INSERT ainda está em voo.
    } finally {
      proceed.resolve();
      await rotating;
    }
    expect(await rotating).toMatchObject({ status: 'ok' });
    expect(await repo.purgeExpired(new Date(Date.now() - 50))).toBe(0);
    expect((await repo.rotate(rotation(original))).status).toBe('reused');
    expect((await row(next.newTokenHash))?.revokedAt).not.toBeNull();
    expect((await refreshWith(next.newId)).statusCode).toBe(401);
  });

  it('candidato anterior ao commit é revalidado sob lock e não apaga ancestral de filho novo', async () => {
    const original = input({ expiresAt: new Date(Date.now() + 1_000) });
    await repo.create(original);
    const next = rotation(original);
    const beforeInsert = deferred();
    const insert = deferred();
    const candidateRead = deferred();
    const deleteCandidate = deferred();
    const writer = repository(await newClient(), {
      beforeCreate: async () => {
        beforeInsert.resolve();
        await insert.promise;
      },
    });
    const rotating = writer.rotate(next);
    let purging: Promise<number> | undefined;
    try {
      await reached(beforeInsert.promise, rotating);
      const boundary = await waitUntilExpired(original.id);
      const collector = repository(await newClient(), {
        afterCandidates: async (candidates) => {
          expect(candidates).toEqual([{ id: original.id, userId }]);
          candidateRead.resolve();
          await deleteCandidate.promise;
        },
      });
      purging = collector.purgeExpired(boundary);
      await reached(candidateRead.promise, purging);
      insert.resolve();
      expect(await rotating).toMatchObject({ status: 'ok' });
      expect((await row(next.newTokenHash))?.revokedAt).toBeNull();
      deleteCandidate.resolve();
      expect(await purging).toBe(0);
      expect(await row(original.tokenHash)).not.toBeNull();
      expect((await repo.rotate(rotation(original))).status).toBe('reused');
      expect((await row(next.newTokenHash))?.revokedAt).not.toBeNull();
    } finally {
      insert.resolve();
      deleteCandidate.resolve();
      await Promise.allSettled([rotating, ...(purging ? [purging] : [])]);
    }
  });

  it('duas abas que leram antes do lock continuam ok+raced; reuso posterior revoga o vencedor', async () => {
    const original = input({ expiresAt: future() });
    await repo.create(original);
    const bothRead = deferred();
    const proceed = deferred();
    let reads = 0;
    const hooks: Hooks = {
      afterRead: async () => {
        if (++reads === 2) bothRead.resolve();
        await proceed.promise;
      },
    };
    const firstInput = rotation(original);
    const secondInput = rotation(original);
    const first = repository(await newClient(), hooks).rotate(firstInput);
    const second = repository(await newClient(), hooks).rotate(secondInput);
    try {
      await reached(bothRead.promise, Promise.all([first, second]));
    } finally {
      proceed.resolve();
      await Promise.allSettled([first, second]);
    }
    const results = await Promise.all([first, second]);
    expect(results.map((result) => result.status).sort()).toEqual([
      'ok',
      'raced',
    ]);
    const winner = results[0].status === 'ok' ? firstInput : secondInput;
    const loser = winner === firstInput ? secondInput : firstInput;
    expect((await row(winner.newTokenHash))?.revokedAt).toBeNull();
    expect(await row(loser.newTokenHash)).toBeNull();
    expect((await repo.rotate(rotation(original))).status).toBe('reused');
    expect((await row(winner.newTokenHash))?.revokedAt).not.toBeNull();
  });

  it.each(['logout', 'revokeAll'] as const)(
    '%s concorrente espera a rotação e revoga também o filho que ainda não foi inserido',
    async (mutation) => {
      const original = input({ expiresAt: future() });
      await repo.create(original);
      const next = rotation(original);
      const beforeInsert = deferred();
      const proceed = deferred();
      const writer = repository(await newClient(), {
        beforeCreate: async () => {
          beforeInsert.resolve();
          await proceed.promise;
        },
      });
      const rotating = writer.rotate(next);
      let revoking: Promise<void | number> | undefined;
      try {
        await reached(beforeInsert.promise, rotating);
        revoking =
          mutation === 'logout'
            ? repo.revokeFamilyByToken(original.tokenHash)
            : repo.revokeAllForUser(userId);
        await waitForUserWaiters(1);
        expect(await row(next.newTokenHash)).toBeNull();
        proceed.resolve();
        expect(await rotating).toMatchObject({ status: 'ok' });
        const count = await revoking;
        if (mutation === 'revokeAll') expect(count).toBe(1);
        expect((await row(next.newTokenHash))?.revokedAt).not.toBeNull();
        expect((await refreshWith(next.newId)).statusCode).toBe(401);
      } finally {
        proceed.resolve();
        await Promise.allSettled([rotating, ...(revoking ? [revoking] : [])]);
      }
    },
  );
});
