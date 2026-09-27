import type { Engine, SessionStatus } from './session-status';
import type { Session, SessionErrorDetails } from './session.entity';

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
  lastErrorDetails?: SessionErrorDetails | null;
}

// E27 (P-086): o que o link de conexão precisa saber da sessão, numa leitura só. `paired` = há
// credencial de conta salva (Baileys `creds.account`, gravado no pair-success) — sem trazer o JSON
// inteiro das creds.
export interface ConnectSnapshot {
  id: string;
  engine: Engine;
  status: SessionStatus;
  meJid: string | null;
  lastMeJid: string | null;
  paired: boolean;
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
  // Guarda o último close sem criar um `session.status` público por queda transitória.
  updateLastErrorDetails(
    id: string,
    details: SessionErrorDetails,
  ): Promise<boolean>;
  delete(id: string): Promise<void>;
  findAutostart(): Promise<Session[]>;
  findConnectSnapshot(id: string): Promise<ConnectSnapshot | null>;
  // Corrige o último número conhecido (ex.: conexão desfeita por número errado não pode virar a
  // sugestão do próximo link).
  setLastMeJid(id: string, jid: string | null): Promise<void>;
}

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
