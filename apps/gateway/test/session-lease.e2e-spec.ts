import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import {
  SessionManager,
  SessionBusyError,
} from '../src/modules/sessions/application/session-manager.service';
import { PrismaSessionRepository } from '../src/modules/sessions/infrastructure/prisma-session.repository';
import {
  LeaseLostError,
  PostgresSessionLease,
} from '../src/modules/sessions/infrastructure/postgres-session-lease';
import { usePostgresAuthState } from '../src/modules/sessions/infrastructure/baileys/postgres-auth-state';
import {
  FencedLocalAuth,
  WWebJSEngine,
} from '../src/modules/sessions/infrastructure/wwebjs/wwebjs.engine';
import { createTestApp, removeSession, seedSession } from './setup-app';

// Duas instâncias reais do SessionManager, mesmo Postgres e Redis do e2e; engine falsa para não
// abrir socket, QR, Chromium ou conta. Verifica o efeito no banco, não só a decisão em memória.
describe('E13/P-056 — posse e fencing entre processos', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const sessionId = 'e13-lease-managers';
  const ttlId = 'e13-lease-ttl';
  const raceId = 'e13-lease-race';
  const bootId = 'e13-lease-boot';
  const stoppedId = 'e13-lease-stopped';
  const quotaId = 'e13-lease-quota';
  const removeId = 'e13-lease-remove';
  const logoutId = 'e13-lease-logout';
  const restartId = 'e13-lease-restart';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await removeSession(app, sessionId);
    await removeSession(app, ttlId);
    await removeSession(app, raceId);
    await removeSession(app, bootId);
    await removeSession(app, stoppedId);
    await removeSession(app, quotaId);
    await removeSession(app, removeId);
    await removeSession(app, logoutId);
    await removeSession(app, restartId);
    await seedSession(app, sessionId);
    await seedSession(app, ttlId);
    await seedSession(app, raceId);
    await seedSession(app, bootId);
    await seedSession(app, stoppedId);
    await seedSession(app, quotaId);
    await seedSession(app, removeId);
    await seedSession(app, logoutId);
    await seedSession(app, restartId);
  });

  afterAll(async () => {
    await removeSession(app, sessionId);
    await removeSession(app, ttlId);
    await removeSession(app, raceId);
    await removeSession(app, bootId);
    await removeSession(app, stoppedId);
    await removeSession(app, quotaId);
    await removeSession(app, removeId);
    await removeSession(app, logoutId);
    await removeSession(app, restartId);
    await app.close();
  });

  function manager() {
    const starts = vi.fn();
    const presence = vi.fn(async () => undefined);
    const factory = {
      create: vi.fn(
        (
          _type: string,
          deps: {
            sessionId: string;
            lease: PostgresSessionLease;
            authEpoch: bigint;
            onEvent: (name: string, payload: unknown) => void;
          },
        ) => {
          let status = 'STOPPED';
          return {
            engineName: _type === 'WWEBJS' ? 'wwebjs' : 'baileys',
            getStatus: () => status,
            getQrBase64: () => null,
            start: async () => {
              starts();
              status = 'WORKING';
              deps.onEvent('session.status', {
                status: 'WORKING',
                error: null,
              });
            },
            stop: async () => {
              status = 'STOPPED';
              deps.onEvent('session.status', {
                status: 'STOPPED',
                error: null,
              });
            },
            shutdown: async () => {
              status = 'STOPPED';
            },
            logout: async () => {
              if (_type === 'WWEBJS')
                await new FencedLocalAuth(
                  deps.sessionId,
                  deps.lease,
                  deps.authEpoch,
                  () => true,
                  () => false,
                  () => undefined,
                ).logout();
              status = 'STOPPED';
              deps.onEvent('session.status', {
                status: 'STOPPED',
                error: null,
              });
            },
            sendPresence: presence,
          };
        },
      ),
    };
    const instance = new SessionManager(
      new PrismaSessionRepository(prisma),
      prisma,
      { get: () => 'silent' } as never,
      { publish: () => undefined } as never,
      {} as never,
      {} as never,
      {} as never,
      factory as never,
      {} as never,
    );
    const lease = (instance as unknown as { lease: PostgresSessionLease })
      .lease;
    return { instance, starts, presence, lease };
  }

  it('só um manager inicia; após soltar, o outro assume e auth/status do epoch velho não escrevem', async () => {
    const a = manager();
    const b = manager();
    await a.instance.start(sessionId);
    await vi.waitFor(async () => {
      expect(
        (await prisma.waSession.findUniqueOrThrow({ where: { id: sessionId } }))
          .status,
      ).toBe('WORKING');
    });
    const first = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    const oldAuth = await usePostgresAuthState(
      prisma,
      sessionId,
      a.lease,
      first.authEpoch,
    );
    await expect(b.instance.start(sessionId)).rejects.toBeInstanceOf(
      SessionBusyError,
    );
    expect(a.starts).toHaveBeenCalledOnce();
    expect(b.starts).not.toHaveBeenCalled();

    await a.instance.stop(sessionId);
    await b.instance.start(sessionId);
    await vi.waitFor(async () => {
      expect(
        (await prisma.waSession.findUniqueOrThrow({ where: { id: sessionId } }))
          .status,
      ).toBe('WORKING');
    });
    const second = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(second.authEpoch).toBeGreaterThan(first.authEpoch);
    expect(b.starts).toHaveBeenCalledOnce();
    await expect(
      a.lease.updateStatus(sessionId, first.authEpoch, 'FAILED'),
    ).rejects.toBeInstanceOf(LeaseLostError);
    await expect(
      oldAuth.state.keys.set({ session: { stale: { value: 'old' } } } as never),
    ).rejects.toBeInstanceOf(LeaseLostError);
    await expect(
      oldAuth.state.keys.get('session', ['fresh']),
    ).rejects.toBeInstanceOf(LeaseLostError);
    await expect(oldAuth.saveCreds()).rejects.toBeInstanceOf(LeaseLostError);
    expect(
      (await prisma.waSession.findUniqueOrThrow({ where: { id: sessionId } }))
        .status,
    ).toBe('WORKING');
    expect(
      await prisma.waAuthKey.count({ where: { sessionId, keyId: 'stale' } }),
    ).toBe(0);

    const auth = await usePostgresAuthState(
      prisma,
      sessionId,
      b.lease,
      second.authEpoch,
    );
    await expect(
      auth.state.keys.set({
        session: { atomicA: { value: 1 }, atomicB: 1n },
      } as never),
    ).rejects.toThrow();
    expect(
      await prisma.waAuthKey.count({ where: { sessionId, keyId: 'atomicA' } }),
    ).toBe(0);
    await auth.state.keys.set({
      session: { fresh: { value: 'new' } },
    } as never);
    expect(
      await prisma.waAuthKey.count({ where: { sessionId, keyId: 'fresh' } }),
    ).toBe(1);
    const creds = auth.state.creds as unknown as Record<string, unknown>;
    creds.testSeq = 1;
    const save1 = auth.saveCreds();
    creds.testSeq = 2;
    const save2 = auth.saveCreds();
    await Promise.all([save1, save2]);
    const saved = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: { creds: true },
    });
    expect((saved.creds as Record<string, unknown>).testSeq).toBe(2);
    await b.instance.newQr(sessionId);
    const rotated = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(rotated.authEpoch).toBe(second.authEpoch + 1n);
    await expect(
      auth.state.keys.set({
        session: { afterClear: { value: 'stale' } },
      } as never),
    ).rejects.toBeInstanceOf(LeaseLostError);
    expect(await prisma.waAuthKey.count({ where: { sessionId } })).toBe(0);
    await b.instance.stop(sessionId);
    // Logout sem engine também gira o epoch antes de gravar STOPPED; uma referência antiga ao
    // store não pode ressuscitar creds depois da limpeza.
    await b.instance.logout(sessionId);
    const loggedOut = await prisma.waSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(loggedOut.status).toBe('STOPPED');
    expect(loggedOut.creds).toBeNull();
    expect(loggedOut.leaseOwner).toBeNull();
  });

  it('dois starts simultâneos elegem um único dono e uma única engine', async () => {
    const a = manager();
    const b = manager();
    const results = await Promise.allSettled([
      a.instance.start(raceId),
      b.instance.start(raceId),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      results.filter(
        (r) => r.status === 'rejected' && r.reason instanceof SessionBusyError,
      ),
    ).toHaveLength(1);
    expect(a.starts.mock.calls.length + b.starts.mock.calls.length).toBe(1);
    const row = await prisma.waSession.findUniqueOrThrow({
      where: { id: raceId },
    });
    expect(row.leaseOwner).toBe(
      a.starts.mock.calls.length ? a.lease.owner : b.lease.owner,
    );
    await (a.starts.mock.calls.length ? a : b).instance.stop(raceId);
  });

  it('standby assume no boot após shutdown do dono e ignora uma sessão que virou STOPPED', async () => {
    const owner = manager();
    const standby = manager();
    const shortenRetry = (target: ReturnType<typeof manager>) => {
      const internal = target.instance as unknown as {
        scheduleBootRetry: (id: string, ms: number) => void;
        bootRetries: Map<string, unknown>;
      };
      const original = internal.scheduleBootRetry.bind(target.instance);
      vi.spyOn(internal, 'scheduleBootRetry').mockImplementation((id, ms) =>
        original(id, Math.min(ms, 100)),
      );
      return internal;
    };
    const bootRetry = shortenRetry(standby);
    await owner.instance.start(bootId);
    await vi.waitFor(async () =>
      expect(
        (await prisma.waSession.findUniqueOrThrow({ where: { id: bootId } }))
          .status,
      ).toBe('WORKING'),
    );
    await standby.instance.onApplicationBootstrap();
    await vi.waitFor(() =>
      expect(bootRetry.bootRetries.has(bootId)).toBe(true),
    );
    await owner.instance.onModuleDestroy();
    await vi.waitFor(() => expect(standby.starts).toHaveBeenCalledOnce(), {
      timeout: 2_000,
    });
    await standby.instance.stop(bootId);

    const owner2 = manager();
    const standby2 = manager();
    const stoppedRetry = shortenRetry(standby2);
    await owner2.instance.start(stoppedId);
    await vi.waitFor(async () =>
      expect(
        (await prisma.waSession.findUniqueOrThrow({ where: { id: stoppedId } }))
          .status,
      ).toBe('WORKING'),
    );
    await standby2.instance.onApplicationBootstrap();
    await vi.waitFor(() =>
      expect(stoppedRetry.bootRetries.has(stoppedId)).toBe(true),
    );
    await owner2.instance.stop(stoppedId);
    await vi.waitFor(
      () => expect(stoppedRetry.bootRetries.has(stoppedId)).toBe(false),
      { timeout: 2_000 },
    );
    expect(standby2.starts).not.toHaveBeenCalled();
    expect(
      (await prisma.waSession.findUniqueOrThrow({ where: { id: stoppedId } }))
        .status,
    ).toBe('STOPPED');
  });

  it('réplica sem lease não consome a reserva de QR do link', async () => {
    const a = manager();
    const b = manager();
    const reserve = vi.fn(async () => undefined);
    await a.instance.start(quotaId);
    await expect(
      b.instance.newQrForConnectLink(quotaId, reserve),
    ).rejects.toBeInstanceOf(SessionBusyError);
    expect(reserve).not.toHaveBeenCalled();
    await a.instance.stop(quotaId);
  });

  it('logout wwebjs permite que LocalAuth use seu próprio fence sem deadlock', async () => {
    await prisma.waSession.update({
      where: { id: logoutId },
      data: { engine: 'WWEBJS' },
    });
    const a = manager();
    await a.instance.start(logoutId);
    await a.instance.logout(logoutId);
    const row = await prisma.waSession.findUniqueOrThrow({
      where: { id: logoutId },
    });
    expect(row.leaseOwner).toBeNull();
    expect(row.status).toBe('STOPPED');
  });

  it('restart após crash assume sessão FAILED sem engine; concorrente recebe 409', async () => {
    await prisma.waSession.update({
      where: { id: restartId },
      data: { status: 'FAILED' },
    });
    const a = manager();
    const b = manager();
    await a.instance.restart(restartId);
    await expect(b.instance.restart(restartId)).rejects.toBeInstanceOf(
      SessionBusyError,
    );
    expect(a.starts).toHaveBeenCalledOnce();
    expect(b.starts).not.toHaveBeenCalled();
    await a.instance.stop(restartId);
  });

  it('réplica antiga não emite RPC após o epoch mudar no banco', async () => {
    const a = manager();
    const b = manager();
    await a.instance.start(raceId);
    await prisma.$executeRaw`UPDATE "wa_sessions" SET "leaseUntil" = clock_timestamp() - interval '1 second' WHERE "id" = ${raceId}`;
    await b.instance.start(raceId);
    await expect(
      a.instance.sendPresence(
        raceId,
        '5511999999999@s.whatsapp.net',
        'composing',
      ),
    ).rejects.toBeInstanceOf(LeaseLostError);
    expect(a.presence).not.toHaveBeenCalled();
    await b.instance.stop(raceId);
  });

  it('LocalAuth atrasado não apaga o perfil do novo dono; limpeza tardia só atinge o descartado', async () => {
    const a = new PostgresSessionLease(prisma);
    const b = new PostgresSessionLease(prisma);
    const first = await a.acquire(removeId);
    expect(first).not.toBeNull();
    const dir = resolve(
      process.env.WWEBJS_DATA_PATH || 'auth/wwebjs',
      `session-${removeId}`,
    );
    const old = new FencedLocalAuth(
      removeId,
      a,
      first!.epoch,
      () => true,
      () => true,
      () => undefined,
    );
    let detached: string | null = null;
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(resolve(dir, 'old'), 'old');
      const onStaleLogout = vi.fn();
      const staleClient = new FencedLocalAuth(
        removeId,
        a,
        first!.epoch,
        () => false,
        () => true,
        onStaleLogout,
      );
      await staleClient.logout();
      expect(onStaleLogout).not.toHaveBeenCalled();
      expect(await readFile(resolve(dir, 'old'), 'utf8')).toBe('old');
      await a.release(removeId, first!.epoch);
      const next = await b.acquire(removeId);
      expect(next?.epoch).toBe(first!.epoch + 1n);
      await expect(old.logout()).resolves.toBeUndefined();
      expect(await readFile(resolve(dir, 'old'), 'utf8')).toBe('old');

      detached = await b.fenced(removeId, next!.epoch, async () =>
        WWebJSEngine.detachAuthDir(removeId),
      );
      await mkdir(dir, { recursive: true });
      await writeFile(resolve(dir, 'fresh'), 'fresh');
      await WWebJSEngine.purgeDetachedAuthDir(detached);
      expect(await readFile(resolve(dir, 'fresh'), 'utf8')).toBe('fresh');
      await b.release(removeId, next!.epoch);
    } finally {
      await rm(dir, { recursive: true, force: true });
      if (detached) await rm(detached, { recursive: true, force: true });
    }
  });

  it('renovação impede outro dono; expiração incrementa epoch e release velho não apaga a nova posse', async () => {
    const a = new PostgresSessionLease(prisma);
    const b = new PostgresSessionLease(prisma);
    const first = await a.acquire(ttlId);
    expect(first).not.toBeNull();
    expect(await a.renew(ttlId, first!.epoch)).toBeInstanceOf(Date);
    expect(await b.acquire(ttlId)).toBeNull();
    await prisma.$executeRaw`UPDATE "wa_sessions" SET "leaseUntil" = clock_timestamp() - interval '1 second' WHERE "id" = ${ttlId}`;
    const second = await b.acquire(ttlId);
    expect(second?.epoch).toBe(first!.epoch + 1n);
    expect(await a.renew(ttlId, first!.epoch)).toBeNull();
    await a.release(ttlId, first!.epoch);
    expect(await b.isCurrent(ttlId, second!.epoch)).toBe(true);
    await b.release(ttlId, second!.epoch);
  });
});
