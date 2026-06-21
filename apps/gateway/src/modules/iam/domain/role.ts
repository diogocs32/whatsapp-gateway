// Papéis do painel (RBAC). Mesmos valores do enum Role do Prisma (compatível estruturalmente).
export const ROLES = ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];
