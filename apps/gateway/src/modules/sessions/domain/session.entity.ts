import type { Engine, SessionStatus } from './session-status';

export interface SessionErrorDetails {
  code: number | null;
  reason: string | null;
}

export class Session {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly engine: Engine,
    public status: SessionStatus,
    public meJid: string | null,
    public mePushName: string | null,
    public phoneNumber: string | null,
    public autostart: boolean,
    public lastError: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public lastErrorDetails: SessionErrorDetails | null = null,
  ) {}
}
