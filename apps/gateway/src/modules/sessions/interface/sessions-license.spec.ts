import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { Session } from '../domain/session.entity';
import type { CreateSessionInput } from '../domain/session.repository';
import type { SessionStatus } from '../domain/session-status';
import { SessionsController } from './sessions.controller';

function session(id: string, status: SessionStatus = 'STOPPED'): Session {
  return new Session(
    id,
    id,
    'BAILEYS',
    status,
    null,
    null,
    null,
    true,
    null,
    new Date('2026-09-30T12:00:00.000Z'),
    new Date('2026-09-30T12:00:00.000Z'),
  );
}

function setup(existing: Session[], maxSessions: number) {
  const repo = {
    findByName: vi.fn(async () => null),
    list: vi.fn(async () => existing),
    create: vi.fn(async (input: CreateSessionInput) => ({
      ...session(input.id),
      ...input,
    })),
    findById: vi.fn(async () => null),
    delete: vi.fn(async () => undefined),
  };
  // Não instancia manager/engine nem conecta conta: só a porta start é observada.
  const manager = { start: vi.fn(async () => undefined) };
  const license = { effective: vi.fn(() => ({ maxSessions })) };
  const proxies = { ensureAvailable: vi.fn(), assignSingle: vi.fn() };
  return {
    repo,
    manager,
    proxies,
    controller: new SessionsController(
      repo as never,
      manager as never,
      license as never,
      {} as never,
      {} as never,
      proxies as never,
      {} as never,
    ),
  };
}

describe('SessionsController — limite de sessões da licença', () => {
  it('cria e chama o manager falso abaixo do limite efetivo', async () => {
    const { controller, repo, manager } = setup([session('existing')], 2);
    const created = await controller.create({ name: 'synthetic-session' });

    expect(repo.create).toHaveBeenCalledExactlyOnceWith({
      id: created.id,
      name: 'synthetic-session',
      engine: 'BAILEYS',
      phoneNumber: null,
      autostart: true,
    });
    expect(manager.start).toHaveBeenCalledExactlyOnceWith(created.id);
    expect(created.status).toBe('STOPPED');
  });

  it.each(['STOPPED', 'FAILED', 'WORKING'] as const)(
    'conta sessão %s no limite e rejeita antes de efeitos',
    async (status) => {
      const { controller, repo, manager, proxies } = setup(
        [session('existing', status)],
        1,
      );
      await expect(
        controller.create({
          name: 'synthetic-session',
          proxyId: 'synthetic-proxy',
        }),
      ).rejects.toThrow(ConflictException);

      expect(repo.create).not.toHaveBeenCalled();
      expect(manager.start).not.toHaveBeenCalled();
      expect(proxies.ensureAvailable).not.toHaveBeenCalled();
      expect(proxies.assignSingle).not.toHaveBeenCalled();
    },
  );

  it.each([
    { used: 2, maxSessions: 1 },
    { used: 0, maxSessions: 0 },
  ])(
    'rejeita used=$used/maxSessions=$maxSessions sem criar/iniciar',
    async ({ used, maxSessions }) => {
      const { controller, repo, manager } = setup(
        Array.from({ length: used }, (_, i) => session(`existing-${i}`)),
        maxSessions,
      );
      await expect(
        controller.create({ name: 'synthetic-session' }),
      ).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
      expect(manager.start).not.toHaveBeenCalled();
    },
  );
});
