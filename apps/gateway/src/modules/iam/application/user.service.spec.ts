import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { CreateUserInput } from '../domain/user.repository';
import { UserService } from './user.service';

const INPUT = {
  username: 'synthetic-user',
  name: 'Usuário sintético',
  password: 'synthetic-test-password',
  role: 'OPERATOR' as const,
};

function setup(used: number, maxSeats: number) {
  const users = {
    count: vi.fn(async () => used),
    findByUsername: vi.fn(async () => null),
    create: vi.fn(async (input: CreateUserInput) => ({
      ...input,
      createdAt: new Date(),
    })),
  };
  const license = { effective: vi.fn(() => ({ maxSeats })) };
  return {
    users,
    service: new UserService(users as never, {} as never, license as never),
  };
}

describe('UserService — limite de assentos da licença', () => {
  it('cria usuário abaixo do limite efetivo', async () => {
    const { service, users } = setup(1, 2);
    const created = await service.create(INPUT);

    expect(users.create).toHaveBeenCalledExactlyOnceWith({
      id: expect.any(String),
      username: INPUT.username,
      name: INPUT.name,
      role: INPUT.role,
      passwordHash: expect.any(String),
    });
    expect(created.passwordHash).not.toBe(INPUT.password);
  });

  it.each([
    { used: 2, maxSeats: 2 },
    { used: 3, maxSeats: 2 },
    { used: 0, maxSeats: 0 },
  ])(
    'rejeita used=$used/maxSeats=$maxSeats antes de criar',
    async ({ used, maxSeats }) => {
      const { service, users } = setup(used, maxSeats);
      await expect(service.create(INPUT)).rejects.toThrow(ConflictException);
      expect(users.findByUsername).not.toHaveBeenCalled();
      expect(users.create).not.toHaveBeenCalled();
    },
  );

  it('seats expõe ocupação e limite efetivo da licença', async () => {
    const { service } = setup(3, 8);
    await expect(service.seats()).resolves.toEqual({ used: 3, max: 8 });
  });
});
