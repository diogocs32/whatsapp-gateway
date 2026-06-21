import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashPassword } from '../../../shared-kernel/crypto';
import { newId } from '../../../shared-kernel/ulid';
import type { Env } from '../../../bootstrap/config';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../domain/user.repository';

// Cria o admin inicial no primeiro boot (se não houver nenhum usuário).
@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if ((await this.users.count()) > 0) return;

    const username = this.config.get('DASHBOARD_USERNAME', { infer: true });
    const password = this.config.get('DASHBOARD_PASSWORD', { infer: true });

    await this.users.create({
      id: newId(),
      username,
      name: 'Administrador',
      passwordHash: await hashPassword(password),
      role: 'OWNER',
    });

    this.logger.log(`Usuário admin "${username}" criado (login inicial).`);
  }
}
