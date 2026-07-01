import type { Engine, SessionStatus } from './session-status';
import type { Session } from './session.entity';

export interface CreateSessionInput {
  id: string;
  name: string;
  engine: Engine;
  phoneNumber: string | null;
  autostart: boolean;
}

export interface StatusPatch {
  meJid?: string | null;
  mePushName?: string | null;
  lastError?: string | null;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  findByName(name: string): Promise<Session | null>;
  list(): Promise<Session[]>;
  // Retorna `true` se a sessão existia e foi atualizada; `false` se não há registro
  // (sessão removida). Não lança quando o registro sumiu — o chamador decide o que fazer.
  updateStatus(
    id: string,
    status: SessionStatus,
    patch?: StatusPatch,
  ): Promise<boolean>;
  delete(id: string): Promise<void>;
  findAutostart(): Promise<Session[]>;
}

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
