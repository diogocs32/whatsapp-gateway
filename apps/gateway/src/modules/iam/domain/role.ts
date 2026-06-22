// Papéis do painel (RBAC). Mesmos valores do enum Role do Prisma (compatível estruturalmente).
export const ROLES = ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

// Hierarquia: cada papel acumula as permissões dos de menor rank
// (VIEWER lê < OPERATOR opera < ADMIN administra < OWNER gere o IAM).
export const ROLE_RANK: Record<Role, number> = {
  VIEWER: 1,
  OPERATOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

// true se `role` atende ao papel mínimo `min` exigido por um endpoint.
export function roleMeets(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
