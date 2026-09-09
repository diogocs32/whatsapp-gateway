import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword } from '../../../shared-kernel/crypto';
import { newId } from '../../../shared-kernel/ulid';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../domain/refresh-token.repository';
import type { Role } from '../domain/role';
import type { User } from '../domain/user.entity';
import {
  USER_REPOSITORY,
  type UpdateUserInput,
  type UserRepository,
} from '../domain/user.repository';
import { LicenseService } from './license.service';

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
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly license: LicenseService,
  ) {}

  list(): Promise<User[]> {
    return this.users.list();
  }

  async seats(): Promise<{ used: number; max: number }> {
    return {
      used: await this.users.count(),
      max: this.license.effective().maxSeats,
    };
  }

  async create(data: CreateUserData): Promise<User> {
    const max = this.license.effective().maxSeats;
    if ((await this.users.count()) >= max) {
      throw new ConflictException(
        `Limite de ${max} assentos atingido — instale uma licença com mais assentos.`,
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
    const updated = await this.users.update(id, patch);
    // Mudou o papel → as sessões abertas param de renovar (ABE-09): o próximo refresh exige novo
    // login com o papel novo. O access em voo vale no máximo JWT_ACCESS_TTL (15 min por default).
    if (patch.role && patch.role !== user.role) {
      await this.refreshTokens.revokeAllForUser(id);
    }
    return updated;
  }

  async resetPassword(id: string, password: string): Promise<void> {
    await this.require(id);
    await this.users.updatePassword(id, await hashPassword(password));
    // Reset de senha invalida todas as famílias de refresh do usuário (OWASP Forgot Password —
    // ABE-09): quem tinha a sessão antiga (inclusive um eventual invasor) precisa logar de novo.
    await this.refreshTokens.revokeAllForUser(id);
  }

  async remove(id: string): Promise<void> {
    const user = await this.require(id);
    if (user.role === 'OWNER' && (await this.users.countByRole('OWNER')) <= 1) {
      throw new ForbiddenException('Não é possível remover o último OWNER.');
    }
    await this.refreshTokens.revokeAllForUser(id); // explícito (o cascade do delete também apaga)
    await this.users.delete(id);
  }

  private async require(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }
}
