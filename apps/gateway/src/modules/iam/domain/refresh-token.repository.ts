// Porta do repositório de refresh tokens (sessão do painel). A implementação concreta (Prisma) vive
// em infrastructure/ e encapsula a rotação atômica + detecção de reuso numa transação.

export interface CreateRefreshTokenInput {
  id: string;
  userId: string;
  tokenHash: string;
  sessionId: string; // "família" — todos os tokens rotacionados a partir do mesmo login
  expiresAt: Date;
  userAgent?: string | null;
  ip?: string | null;
}

export interface RotateInput {
  presentedHash: string; // sha512 do refresh apresentado pelo cliente
  newId: string;
  newTokenHash: string;
  newExpiresAt: Date;
  userAgent?: string | null;
  ip?: string | null;
}

// Resultado da rotação:
// - ok:      rotacionou; devolve userId + sessionId para emitir o novo access.
// - unknown: hash não existe (token forjado ou já purgado) → 401.
// - reused:  refresh JÁ revogado foi reapresentado (reuso = token roubado) → a família foi
//            revogada dentro da transação; o cliente deve refazer login.
// - expired: refresh dentro da validade do cookie mas com expiresAt vencido no banco → 401.
// - raced:   corrida legítima (duas abas rotacionaram junto); a linha já foi rotacionada por outra
//            request — NÃO é reuso, NÃO revoga a família; o outro request já entregou o novo par.
export type RotateResult =
  | { status: 'ok'; userId: string; sessionId: string }
  | { status: 'unknown' }
  | { status: 'reused' }
  | { status: 'expired' }
  | { status: 'raced' };

export interface RefreshTokenRepository {
  create(input: CreateRefreshTokenInput): Promise<void>;
  rotate(input: RotateInput): Promise<RotateResult>;
  // Revoga a família inteira a partir do token apresentado (logout). No-op se o token não existir.
  revokeFamilyByToken(tokenHash: string): Promise<void>;
  // Revoga TODAS as famílias ativas do usuário (reset de senha, rebaixamento de papel, incidente —
  // ABE-09). Devolve quantos tokens foram revogados.
  revokeAllForUser(userId: string): Promise<number>;
  // Remove até batchSize expirados antes do cutoff, conservando ancestrais de famílias
  // com token não revogado dentro da margem. Revalida sob o lock usado pela rotação.
  purgeExpired(cutoff: Date, batchSize?: number): Promise<number>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
