import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SessionNameTakenError } from '../domain/session-name-taken.error';
import { Session } from '../domain/session.entity';
import type { CreateSessionInput } from '../domain/session.repository';
import { SessionsController } from './sessions.controller';

function session(id: string, name = id): Session {
  return new Session(
    id,
    name,
    'BAILEYS',
    'WORKING',
    null,
    null,
    null,
    true,
    null,
    new Date('2026-11-07T09:00:00.000Z'),
    new Date('2026-11-07T09:00:00.000Z'),
  );
}

// Controller real com portas falsas: nenhum banco, nenhuma engine, nenhuma conta — só o contrato
// do renomear (E30/P-110) é observado. O repositório falso reproduz o @unique de wa_sessions.name
// (SessionNameTakenError), como o Prisma faz com o P2002.
function setup(existing: Session[]) {
  const byId = new Map(existing.map((s) => [s.id, s]));
  const repo = {
    findById: vi.fn(async (id: string) => byId.get(id) ?? null),
    findByName: vi.fn(
      async (name: string) => existing.find((s) => s.name === name) ?? null,
    ),
    list: vi.fn(async () => existing),
    rename: vi.fn(async (id: string, name: string) => {
      if (existing.some((s) => s.id !== id && s.name === name)) {
        throw new SessionNameTakenError(name);
      }
      const s = byId.get(id);
      return s ? session(s.id, name) : null;
    }),
    create: vi.fn(async (input: CreateSessionInput) => ({
      ...session(input.id, input.name),
      ...input,
    })),
    delete: vi.fn(async () => undefined),
  };
  const manager = {
    noteRename: vi.fn(),
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    restart: vi.fn(),
  };
  const license = { effective: vi.fn(() => ({ maxSessions: 10 })) };
  const controller = new SessionsController(
    repo as never,
    manager as never,
    license as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { repo, manager, controller };
}

describe('SessionsController.update — renomear (E30/P-110)', () => {
  it.each([
    {},
    { name: '' },
    { name: 'com espaço' },
    { name: 'acentuação' },
    { name: 'x'.repeat(65) },
    { nome: 'campo-errado' },
  ])('corpo inválido %j → 400 sem tocar no repositório', async (body) => {
    const { controller, repo, manager } = setup([session('s1', 'vendas')]);
    await expect(controller.update('s1', body)).rejects.toThrow(
      BadRequestException,
    );
    expect(repo.rename).not.toHaveBeenCalled();
    expect(manager.noteRename).not.toHaveBeenCalled();
  });

  it('mesmo nome → devolve o DTO atual sem escrever', async () => {
    const { controller, repo, manager } = setup([session('s1', 'vendas')]);
    const dto = await controller.update('s1', { name: 'vendas' });
    expect(dto).toMatchObject({ id: 's1', name: 'vendas' });
    expect(repo.rename).not.toHaveBeenCalled();
    expect(manager.noteRename).not.toHaveBeenCalled();
  });

  it('nome de OUTRA sessão (o @unique do repositório) → 409, manager não avisado', async () => {
    const { controller, repo, manager } = setup([
      session('s1', 'vendas'),
      session('s2', 'suporte'),
    ]);
    await expect(controller.update('s1', { name: 'suporte' })).rejects.toThrow(
      ConflictException,
    );
    expect(repo.rename).toHaveBeenCalledExactlyOnceWith('s1', 'suporte');
    expect(manager.noteRename).not.toHaveBeenCalled();
  });

  it('nome igual ao ID de outra sessão → 409 antes de escrever (o pipe resolveria a outra)', async () => {
    const { controller, repo, manager } = setup([
      session('s1', 'vendas'),
      session('01JCXK7Q9ZV4N3M2P1R0S8T7U6', 'suporte'),
    ]);
    await expect(
      controller.update('s1', { name: '01JCXK7Q9ZV4N3M2P1R0S8T7U6' }),
    ).rejects.toThrow(ConflictException);
    expect(repo.rename).not.toHaveBeenCalled();
    expect(manager.noteRename).not.toHaveBeenCalled();
  });

  it('nome igual ao PRÓPRIO id é permitido', async () => {
    const { controller, repo } = setup([session('s1', 'vendas')]);
    const dto = await controller.update('s1', { name: 's1' });
    expect(dto).toMatchObject({ id: 's1', name: 's1' });
    expect(repo.rename).toHaveBeenCalledExactlyOnceWith('s1', 's1');
  });

  it('sessão apagada entre a leitura e a escrita → 404', async () => {
    const { controller, repo, manager } = setup([session('s1', 'vendas')]);
    repo.rename.mockResolvedValueOnce(null);
    await expect(
      controller.update('s1', { name: 'vendas-02' }),
    ).rejects.toThrow(NotFoundException);
    expect(manager.noteRename).not.toHaveBeenCalled();
  });

  it('erro inesperado do repositório propaga (não vira 409 nem 404)', async () => {
    const { controller, repo } = setup([session('s1', 'vendas')]);
    repo.rename.mockRejectedValueOnce(new Error('banco fora'));
    await expect(
      controller.update('s1', { name: 'vendas-02' }),
    ).rejects.toThrow('banco fora');
  });

  it('renomeia: mesmo id, nome novo, manager avisado e sem start/stop/restart', async () => {
    const { controller, repo, manager } = setup([
      session('s1', 'vendas'),
      session('s2', 'suporte'),
    ]);
    const dto = await controller.update('s1', { name: 'Vendas-SP_2' });
    expect(dto).toMatchObject({ id: 's1', name: 'Vendas-SP_2' });
    expect(repo.rename).toHaveBeenCalledExactlyOnceWith('s1', 'Vendas-SP_2');
    expect(manager.noteRename).toHaveBeenCalledExactlyOnceWith(
      's1',
      'Vendas-SP_2',
    );
    expect(manager.start).not.toHaveBeenCalled();
    expect(manager.stop).not.toHaveBeenCalled();
    expect(manager.restart).not.toHaveBeenCalled();
  });
});

describe('SessionsController.create — nome igual ao id de outra sessão (E30)', () => {
  it('→ 409 sem criar nem iniciar', async () => {
    const { controller, repo, manager } = setup([
      session('01JCXK7Q9ZV4N3M2P1R0S8T7U6', 'suporte'),
    ]);
    await expect(
      controller.create({ name: '01JCXK7Q9ZV4N3M2P1R0S8T7U6' }),
    ).rejects.toThrow(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
    expect(manager.start).not.toHaveBeenCalled();
  });

  it('nome livre continua criando normalmente', async () => {
    const { controller, repo, manager } = setup([session('s1', 'vendas')]);
    const created = await controller.create({ name: 'vendas-02' });
    expect(created.name).toBe('vendas-02');
    expect(repo.create).toHaveBeenCalledOnce();
    expect(manager.start).toHaveBeenCalledExactlyOnceWith(created.id);
  });
});
