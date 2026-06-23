export interface AuditEntry {
  actor: string;
  method: string;
  path: string;
  statusCode: number;
  ip: string | null;
}

export interface AuditLogRecord extends AuditEntry {
  id: string;
  createdAt: Date;
}

export interface AuditRepository {
  create(entry: AuditEntry): Promise<void>;
  list(limit: number, offset: number): Promise<AuditLogRecord[]>;
}

export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY');
