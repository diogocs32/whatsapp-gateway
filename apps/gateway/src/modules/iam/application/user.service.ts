import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../bootstrap/config';
import { hashPassword } from '../../../shared-kernel/crypto';
import { newId } from '../../../shared-kernel/ulid';
import type { Role } from '../domain/role';
import type { User } from '../domain/user.entity';
import {
  USER_REPOSITORY,
  type UpdateUserInput,
  type UserRepository,
} from '../domain/user.repository';

export interface CreateUserData {
  username: string;
  name: string;
  password: string;
  role: Role;
}

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  list(): Promise<User[]> {
    return this.users.list();
  }

  async seats(): Promise<{ used: number; max: number }> {
    return {
      used: await this.users.count(),
      max: this.config.get('MAX_SEATS', { infer: true }),
    };
  }

  async create(data: CreateUserData): Promise<User> {
    const max = this.config.get('MAX_SEATS', { infer: true });
    if ((await this.users.count()) >= max) {
      throw new ConflictException(
        `Limite de ${max} assentos atingido — remova um usuário ou aumente MAX_SEATS.`,
      );
    }
    if (await this.users.findByUsername(data.username)) {
      throw new ConflictException('Já existe um usuário com esse username.');
    }
    return this.users.create({
      id: newId(),
      username: data.username,
      name: data.name,
      passwordHash: await hashPassword(data.password),
      role: data.role,
    });
  }

  async update(id: string, patch: UpdateUserInput): Promise<User> {
    const user = await this.require(id);
    // Não deixar o sistema sem OWNER: bloqueia rebaixar o último.
    if (
      user.role === 'OWNER' &&
      patch.role &&
      patch.role !== 'OWNER' &&
      (await this.users.countByRole('OWNER')) <= 1
    ) {
      throw new ForbiddenException('Não é possível rebaixar o último OWNER.');
    }
    return this.users.update(id, patch);
  }

  async resetPassword(id: string, password: string): Promise<void> {
    await this.require(id);
    await this.users.updatePassword(id, await hashPassword(password));
  }

  async remove(id: string): Promise<void> {
    const user = await this.require(id);
    if (
      user.role === 'OWNER' &&
      (await this.users.countByRole('OWNER')) <= 1
    ) {
      throw new ForbiddenException('Não é possível remover o último OWNER.');
    }
    await this.users.delete(id);
  }

  private async require(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }
}
