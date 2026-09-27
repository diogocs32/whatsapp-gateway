import { describe, expect, it, vi } from 'vitest';
import type { EventBus } from '../../../shared-kernel/event-bus/event-bus';
import type { SessionRepository } from '../domain/session.repository';
import type { SessionErrorDetails } from '../domain/session.entity';
import type { SessionStatus } from '../domain/session-status';
import { SessionManager } from './session-manager.service';

function own(manager: SessionManager, repo: SessionRepository): void {
  const internals = manager as unknown as {
    lease: unknown;
    owned: Map<string, unknown>;
  };
  internals.owned.set('s1', {
    epoch: 1n,
    until: new Date(Date.now() + 60_000),
    active: true,
  });
  internals.lease = {
    updateStatus: (
      _id: string,
      _epoch: bigint,
      status: SessionStatus,
      patch: unknown,
    ) => repo.updateStatus(_id, status, patch as never),
    updateLastErrorDetails: (
      _id: string,
      _epoch: bigint,
      details: SessionErrorDetails,
    ) => repo.updateLastErrorDetails(_id, details),
  };
}

describe('SessionManager — ordem das escritas de status da mesma sessão', () => {
  it('espera o FAILED pendente antes de gravar WORKING do novo open', async () => {
    const writes: SessionStatus[] = [];
    const published: SessionStatus[] = [];
    let persisted: SessionStatus = 'STOPPED';
    let releaseFailed!: () => void;
    const failedPending = new Promise<void>((resolve) => {
      releaseFailed = resolve;
    });
    const updateStatus = vi.fn(
      async (_id: string, status: SessionStatus): Promise<boolean> => {
        writes.push(status);
        if (status === 'FAILED') await failedPending;
        persisted = status;
        return true;
      },
    );
    const repo = { updateStatus } as unknown as SessionRepository;
    const eventBus = {
      publish: (event: { payload: { payload: { status: SessionStatus } } }) => {
        published.push(event.payload.payload.status);
      },
    } as unknown as EventBus;
    let onEvent!: (name: 'session.status', payload: unknown) => void;
    const engineFactory = {
      create: (_engineType: string, deps: { onEvent: typeof onEvent }) => {
        onEvent = deps.onEvent;
        return { engineName: 'baileys' };
      },
    };
    const manager = new SessionManager(
      repo,
      {} as never,
      {
        get: (key: string) => (key === 'WA_LOG_LEVEL' ? 'silent' : undefined),
      } as never,
      eventBus,
      {} as never,
      {} as never,
      {} as never,
      engineFactory as never,
      {} as never,
    );
    own(manager, repo);
    (
      manager as unknown as {
        getOrCreateEngine: (id: string, engine: string) => unknown;
      }
    ).getOrCreateEngine('s1', 'BAILEYS');

    onEvent('session.status', {
      status: 'FAILED',
      error: 'protocolo recusado',
      lastErrorDetails: { code: 405, reason: 'client_too_old' },
    });
    await vi.waitFor(() => expect(writes).toEqual(['FAILED']));
    onEvent('session.status', {
      status: 'WORKING',
      error: null,
      lastErrorDetails: null,
    });
    await Promise.resolve();
    expect(writes).toEqual(['FAILED']);
    expect(persisted).toBe('STOPPED');
    expect(published).toEqual([]);

    releaseFailed();
    await vi.waitFor(() => expect(writes).toEqual(['FAILED', 'WORKING']));
    await vi.waitFor(() => expect(persisted).toBe('WORKING'));
    expect(published).toEqual(['FAILED', 'WORKING']);
    expect(updateStatus).toHaveBeenCalledTimes(2);
  });

  it('grava o diagnóstico do close após o WORKING pendente, sem apagá-lo', async () => {
    const writes: string[] = [];
    let persistedDetails: SessionErrorDetails | null = {
      code: 405,
      reason: 'old error',
    };
    let releaseWorking!: () => void;
    const workingPending = new Promise<void>((resolve) => {
      releaseWorking = resolve;
    });
    const repo = {
      updateStatus: async (
        _id: string,
        status: SessionStatus,
        patch: { lastErrorDetails?: SessionErrorDetails | null },
      ) => {
        writes.push(`${status}:start`);
        if (status === 'WORKING') await workingPending;
        persistedDetails = patch.lastErrorDetails ?? null;
        writes.push(`${status}:commit`);
        return true;
      },
      updateLastErrorDetails: async (
        _id: string,
        details: SessionErrorDetails,
      ) => {
        writes.push(`close:${details.code}`);
        persistedDetails = details;
        return true;
      },
    } as unknown as SessionRepository;
    let onEvent!: (name: 'session.status', payload: unknown) => void;
    let onDisconnect!: (details: SessionErrorDetails) => Promise<void>;
    const engineFactory = {
      create: (
        _engineType: string,
        deps: {
          onEvent: typeof onEvent;
          onDisconnect: typeof onDisconnect;
        },
      ) => {
        onEvent = deps.onEvent;
        onDisconnect = deps.onDisconnect;
        return { engineName: 'baileys' };
      },
    };
    const manager = new SessionManager(
      repo,
      {} as never,
      {
        get: (key: string) => (key === 'WA_LOG_LEVEL' ? 'silent' : undefined),
      } as never,
      { publish: () => undefined } as unknown as EventBus,
      {} as never,
      {} as never,
      {} as never,
      engineFactory as never,
      {} as never,
    );
    own(manager, repo);
    (
      manager as unknown as {
        getOrCreateEngine: (id: string, engine: string) => unknown;
      }
    ).getOrCreateEngine('s1', 'BAILEYS');

    onEvent('session.status', {
      status: 'WORKING',
      error: null,
      lastErrorDetails: null,
    });
    await vi.waitFor(() => expect(writes).toEqual(['WORKING:start']));
    const close = onDisconnect({ code: 500, reason: 'stream errored' });
    await Promise.resolve();
    expect(writes).toEqual(['WORKING:start']);

    releaseWorking();
    await close;
    await vi.waitFor(() =>
      expect(writes).toEqual(['WORKING:start', 'WORKING:commit', 'close:500']),
    );
    expect(persistedDetails).toEqual({ code: 500, reason: 'stream errored' });
  });
});
