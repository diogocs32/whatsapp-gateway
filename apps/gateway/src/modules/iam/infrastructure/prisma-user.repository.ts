import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { Role } from '../domain/role';
import { User } from '../domain/user.entity';
import type {
  CreateUserInput,
  UserRepository,
} from '../domain/user.repository';

interface UserRow {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  role: string;
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { username } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const row = await this.prisma.user.create({
      data: {
        id: input.id,
        username: input.username,
        name: input.name,
        passwordHash: input.passwordHash,
        role: input.role,
      },
    });
    return this.toDomain(row);
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  private toDomain(row: UserRow): User {
    return new User(
      row.id,
      row.username,
      row.name,
      row.passwordHash,
      row.role as Role,
    );
  }
}
