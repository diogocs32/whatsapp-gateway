import { SetMetadata } from '@nestjs/common';
import type { Role } from '../domain/role';

export const MIN_ROLE_KEY = 'minRole';

// Define o papel MÍNIMO exigido para um handler/controller (RBAC hierárquico — ver roleMeets).
// Usado junto do RolesGuard. Pode ir na classe (default do controller) e ser sobreposto por método.
export const MinRole = (role: Role) => SetMetadata(MIN_ROLE_KEY, role);
