import { createHash } from 'node:crypto';

// ABE-03 (auditoria 09/2026) — decisão PURA sobre uma intenção já existente para a mesma
// (sessão, idempotencyKey). Separada do serviço para ser testada sem banco.
//
//   conflict  — mesma key com destinatário/conteúdo DIFERENTE: rejeitar (409), nunca reenviar.
//   replay    — já enviada: devolver o resultado anterior sem tocar o transporte.
//   in-flight — pending recente: outra chamada está enviando agora (409; o cliente retenta depois).
//   takeover  — failed, ou pending abandonada (processo caiu no meio): esta chamada assume.

export interface ExistingIntent {
  status: string; // pending | sent | failed
  fingerprint: string;
  updatedAt: Date;
  keyId: string | null;
  chatJid: string | null;
}

export type IntentDecision =
  | { kind: 'replay'; keyId: string; chatJid: string }
  | { kind: 'conflict' }
  | { kind: 'in-flight' }
  | { kind: 'takeover' };

// Janela em que uma intenção `pending` é considerada "em voo" — acima disto assume-se que o
// processo morreu antes de concluir/falhar (o envio real leva segundos, não minutos).
export const PENDING_INTENT_TTL_MS = 2 * 60_000;

export function decideOnExistingIntent(
  row: ExistingIntent,
  fingerprint: string,
  now: number = Date.now(),
  pendingTtlMs: number = PENDING_INTENT_TTL_MS,
): IntentDecision {
  if (row.fingerprint !== fingerprint) return { kind: 'conflict' };
  if (row.status === 'sent') {
    return {
      kind: 'replay',
      keyId: row.keyId ?? '',
      chatJid: row.chatJid ?? '',
    };
  }
  if (
    row.status === 'pending' &&
    now - row.updatedAt.getTime() < pendingTtlMs
  ) {
    return { kind: 'in-flight' };
  }
  return { kind: 'takeover' };
}

// Fingerprint dos parâmetros que definem "o mesmo envio": ordem de chaves estável, sha256 hex.
export function sendFingerprint(parts: Record<string, unknown>): string {
  const stable = JSON.stringify(parts, Object.keys(parts).sort());
  return createHash('sha256').update(stable).digest('hex');
}
