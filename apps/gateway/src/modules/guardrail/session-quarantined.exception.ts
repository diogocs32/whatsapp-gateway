import { HttpException, HttpStatus } from '@nestjs/common';

// G5 — hard-gate: um envio cold (1º contato) numa sessão bloqueada pelo guard-rail responde
// HTTP 423 (Locked) com code SESSION_QUARANTINED. O n8n ramifica nisso e re-enfileira o lead (N7).
export class SessionQuarantinedException extends HttpException {
  constructor(state: string, reason?: string | null) {
    super(
      {
        code: 'SESSION_QUARANTINED',
        state,
        message:
          reason ?? `Sessão em "${state}": envio cold bloqueado pelo guard-rail.`,
      },
      HttpStatus.LOCKED,
    );
  }
}
