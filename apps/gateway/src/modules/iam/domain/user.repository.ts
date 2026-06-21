import type { Role } from './role';
import type { User } from './user.entity';

export interface CreateUserInput {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  role: Role;
}

// Porta (interface) — a implementação concreta vive em infrastructure/.
export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  count(): Promise<number>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
