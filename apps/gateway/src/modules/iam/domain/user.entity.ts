import type { Role } from './role';

// Entidade de domínio (pura, sem dependência de infra).
export class User {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly name: string,
    public readonly passwordHash: string,
    public readonly role: Role,
  ) {}
}
