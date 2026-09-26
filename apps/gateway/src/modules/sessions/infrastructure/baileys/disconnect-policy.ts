import { DisconnectReason } from '@whiskeysockets/baileys';
import type { SessionErrorDetails } from '../../domain/session.entity';

export type DisconnectAction =
  | 'logged_out'
  | 'client_too_old'
  | 'terminal'
  | 'replaced'
  | 'restart'
  | 'retry';

export function disconnectDetails(error: unknown): SessionErrorDetails {
  if (!error || typeof error !== 'object') return { code: null, reason: null };
  const e = error as {
    output?: { statusCode?: unknown };
    data?: { reason?: unknown };
    message?: unknown;
  };
  const code = e.output?.statusCode;
  const rawReason = e.data?.reason ?? e.message;
  return {
    code: typeof code === 'number' && Number.isFinite(code) ? code : null,
    reason: typeof rawReason === 'string' ? rawReason.slice(0, 500) : null,
  };
}

// Texto humano estável por código: o motivo bruto pode mudar em cada tentativa e fica no campo
// estruturado. Variar `error` geraria `session.status`/webhooks repetidos pelo dedup D-015.
export function classifyDisconnect(
  code: number | null,
  _reason: string | null,
): { action: DisconnectAction; error: string } {
  switch (code) {
    case DisconnectReason.loggedOut:
      return {
        action: 'logged_out',
        error:
          'Desconectada pelo celular (loggedOut) — credenciais limpas; gere um novo QR para reconectar',
      };
    case 405: // rc14 não enumera 405; CB:failure preserva o status bruto.
      return {
        action: 'client_too_old',
        error:
          'Versão do protocolo WhatsApp recusada (405) — teste uma versão no canário',
      };
    case DisconnectReason.forbidden:
      return {
        action: 'terminal',
        error:
          'Conexão recusada pelo WhatsApp (403) — confira o estado da conta no celular',
      };
    case DisconnectReason.multideviceMismatch:
      return {
        action: 'terminal',
        error:
          'Dispositivo incompatível com a sessão (411) — intervenção necessária',
      };
    case DisconnectReason.connectionReplaced:
      return { action: 'replaced', error: 'Conexão substituída (440)' };
    case DisconnectReason.restartRequired:
      return {
        action: 'restart',
        error: 'Reinício solicitado pelo WhatsApp (515)',
      };
    case DisconnectReason.connectionLost:
      return { action: 'retry', error: 'Conexão perdida ou expirou (408)' };
    case DisconnectReason.connectionClosed:
      return { action: 'retry', error: 'Conexão encerrada (428)' };
    case DisconnectReason.badSession:
      return { action: 'retry', error: 'Falha de conexão (500)' };
    case DisconnectReason.unavailableService:
      return { action: 'retry', error: 'Serviço WhatsApp indisponível (503)' };
    default:
      return {
        action: 'retry',
        error: `Conexão encerrada (${code ?? 'sem código'})`,
      };
  }
}
