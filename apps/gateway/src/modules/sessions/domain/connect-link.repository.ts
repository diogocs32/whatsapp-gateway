import type {
  ConnectLinkRecord,
  ConnectLinkRevokedReason,
} from './connect-link';

export interface CreateConnectLinkInput {
  id: string;
  sessionId: string;
  tokenHash: string;
  createdBy: string;
  expectedPhone: string | null;
  expiresAt: Date;
  now: Date;
}

// E27 · P-086 — tabela `wa_connect_links` (dona: sessions). As escritas condicionais são o
// que garante as regras entre processos: um link ativo por sessão, cota/intervalo de "gerar QR"
// e consumo único.
export interface ConnectLinkRepository {
  // Numa transação com a linha da sessão travada: revoga (REPLACED) os links ainda não revogados
  // nem consumidos da sessão, apaga os inativos antigos e cria o novo.
  createReplacing(input: CreateConnectLinkInput): Promise<ConnectLinkRecord>;
  findByHash(tokenHash: string): Promise<ConnectLinkRecord | null>;
  findLatestBySession(sessionId: string): Promise<ConnectLinkRecord | null>;
  // Link não revogado, não consumido e dentro da validade.
  findActiveBySession(
    sessionId: string,
    now: Date,
  ): Promise<ConnectLinkRecord | null>;
  revokeActive(
    sessionId: string,
    now: Date,
    reason: ConnectLinkRevokedReason,
  ): Promise<number>;
  revoke(
    id: string,
    now: Date,
    reason: ConnectLinkRevokedReason,
  ): Promise<boolean>;
  // Grava consumedAt se o link ainda estiver ativo (não revogado, não consumido, na validade).
  consume(id: string, now: Date): Promise<boolean>;
  // CAS da cota: incrementa newQrCount e grava lastNewQrAt só se o link estiver ativo, abaixo do
  // teto e fora do intervalo mínimo. false = nada gravado.
  reserveNewQr(
    id: string,
    now: Date,
    max: number,
    cooldownMs: number,
  ): Promise<boolean>;
  touchSeen(id: string, now: Date): Promise<void>;
  // Houve WORKING na timeline da sessão desde `since`? (leitura dedicada de wa_session_events,
  // tabela da observabilidade — permitido pela ARQUITETURA: só leitura.)
  hasWorkingSince(sessionId: string, since: Date): Promise<boolean>;
}

export const CONNECT_LINK_REPOSITORY = Symbol('CONNECT_LINK_REPOSITORY');
