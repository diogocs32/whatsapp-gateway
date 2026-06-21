// Contratos compartilhados entre o gateway (backend) e o dashboard (frontend).
// Fonte única de verdade para os tipos que cruzam a fronteira HTTP/WS.

export type Role = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export type HealthStatus = 'ok' | 'degraded' | 'unhealthy';

export interface HealthResponse {
  status: HealthStatus;
  uptimeSeconds: number;
  checks: {
    database: boolean;
    redis: boolean;
    heapUsedPct: number;
  };
  version: string;
  timestamp: string;
}

// Observability (F7) — resumo JSON para a tela "Logs & saúde".
export interface ObservabilitySummary {
  uptimeSeconds: number;
  rssBytes: number;
  heapUsedBytes: number;
  heapUsedPct: number;
  sessions: Record<string, number>;
  messages: { out: number; in: number };
}

export interface TimelineEvent {
  id: string;
  type: string;
  status: string | null;
  detail: string | null;
  at: string;
}

// Envelope padronizado de evento (ver blueprint §10) — usado a partir da F2.
export interface EventEnvelope<P = unknown> {
  id: string;
  timestamp: number;
  event: string;
  session: string | null;
  payload: P;
  engine: 'baileys' | 'wwebjs' | null;
}

// ---- Sessões (F1) ----
export type Engine = 'BAILEYS' | 'WWEBJS';

export type SessionStatus =
  | 'STOPPED'
  | 'STARTING'
  | 'SCAN_QR_CODE'
  | 'PAIRING_CODE'
  | 'WORKING'
  | 'FAILED'
  | 'DEGRADED';

export type ConnectionMode = 'qr' | 'pairing';

export interface SessionDto {
  id: string;
  name: string;
  engine: Engine;
  status: SessionStatus;
  meJid: string | null;
  mePushName: string | null;
  phoneNumber: string | null;
  autostart: boolean;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionRequest {
  name: string;
  engine?: Engine;
  mode?: ConnectionMode;
  phoneNumber?: string;
  autostart?: boolean;
}

export interface QrResponse {
  status: SessionStatus;
  qr: string | null; // data URL base64 (image/png) ou null
}

export interface PairingCodeResponse {
  code: string;
}

// ---- Mensagens (F2) ----
export interface MessageDto {
  id: string;
  sessionId: string;
  chatJid: string;
  senderJid: string | null;
  fromMe: boolean;
  type: string;
  text: string | null;
  status: string | null;
  timestamp: string;
  // Mídia (F4) — presentes quando type é image|video|audio|document|sticker.
  mediaType?: string | null;
  mimetype?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mediaUrl?: string | null; // URL pré-assinada temporária para exibir/baixar
}

export interface SendTextRequest {
  to: string; // número (E.164 sem +) ou JID completo
  text: string;
}

export interface SendTextResponse {
  id: string;
  to: string;
}

// ---- Webhooks (F2b) ----
export interface WebhookDto {
  id: string;
  sessionId: string | null;
  url: string;
  events: string[];
  hasSecret: boolean;
  enabled: boolean;
  maxAttempts: number;
  createdAt: string;
}

export interface CreateWebhookRequest {
  sessionId?: string | null;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  maxAttempts?: number;
}

// Eventos disponíveis para assinar (use '*' para todos).
export const WEBHOOK_EVENTS = ['*', 'message', 'session.status'] as const;

// ---- Proxies (F3) ----
export type ProxyProtocol = 'HTTP' | 'HTTPS' | 'SOCKS4' | 'SOCKS5';
export type ProxySource = 'MANUAL' | 'WEBSHARE';
export type ProxyStatus = 'UNTESTED' | 'ALIVE' | 'DEAD';
export type ProxyMode = 'NONE' | 'SINGLE' | 'RANGE' | 'GLOBAL_ROUND_ROBIN';
export type ProxyStrategy =
  | 'STICKY'
  | 'ROUND_ROBIN'
  | 'LEAST_LATENCY'
  | 'RANDOM';

export interface ProxyDto {
  id: string;
  position: number;
  label: string | null;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  hasAuth: boolean;
  source: ProxySource;
  country: string | null;
  exitIp: string | null;
  latencyMs: number | null;
  status: ProxyStatus;
  enabled: boolean;
}

export interface CreateProxyRequest {
  label?: string;
  protocol?: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface ProxyAssignmentDto {
  sessionId: string;
  mode: ProxyMode;
  rangeStart: number | null;
  rangeEnd: number | null;
  strategy: ProxyStrategy;
  currentProxyId: string | null;
}

export interface SetProxyAssignmentRequest {
  mode: ProxyMode;
  rangeStart?: number | null;
  rangeEnd?: number | null;
  strategy?: ProxyStrategy;
  proxyId?: string | null;
}

export interface ProxyTestResult {
  id: string;
  status: ProxyStatus;
  latencyMs: number | null;
  exitIp: string | null;
}

export interface BulkImportProxiesRequest {
  // Uma linha por proxy. Formatos aceitos: `host:port`, `host:port:user:pass`, `user:pass@host:port`.
  text: string;
  protocol?: ProxyProtocol;
}

export interface BulkImportResult {
  created: number;
  failed: number;
  errors: string[];
}

export interface WebshareSyncResult {
  configured: boolean;
  created: number;
  updated: number;
  total: number;
}

// ---- Grupos (F5) ----
export type GroupParticipantRole = 'admin' | 'superadmin' | 'member';
export type GroupParticipantAction = 'add' | 'remove' | 'promote' | 'demote';

export interface GroupParticipantDto {
  id: string; // identificador usado nas ações (pode ser LID em grupos novos)
  role: GroupParticipantRole;
  phone: string | null; // telefone resolvido (quando disponível)
  name: string | null; // nome do contato (quando disponível)
}

export interface GroupDto {
  id: string;
  subject: string;
  owner: string | null;
  desc: string | null;
  size: number;
  announce: boolean; // só admins escrevem
  restrict: boolean; // só admins editam infos
  participants: GroupParticipantDto[];
}

export interface CreateGroupRequest {
  subject: string;
  participants: string[]; // números (E.164 sem +) ou JIDs
}

export interface GroupParticipantsRequest {
  action: GroupParticipantAction;
  participants: string[];
}

export interface GroupSubjectRequest {
  subject: string;
}
export interface GroupDescriptionRequest {
  description: string;
}
export interface GroupInviteDto {
  code: string;
  url: string;
}

// ---- Contatos (F5) ----
export interface ContactCheckDto {
  number: string;
  exists: boolean;
  jid: string | null;
}
export interface ProfilePictureDto {
  jid: string;
  url: string | null;
}
export interface BlockRequest {
  jid: string;
  action: 'block' | 'unblock';
}

// Diretório de contatos persistente (LID↔telefone + metadados) — base para automações.
export interface ContactDirectoryDto {
  waId: string;
  jid: string | null;
  lid: string | null;
  phone: string | null;
  pushName: string | null;
  name: string | null;
  verifiedName: string | null;
  imgUrl: string | null;
  status: string | null;
  source: string | null;
  updatedAt: string;
}

// ---- Canais / Newsletter (F5 — beta) ----
export interface ChannelDto {
  id: string;
  name: string;
  description: string | null;
  subscribers: number | null;
}
export interface CreateChannelRequest {
  name: string;
  description?: string;
}

// ---- Campanhas em massa + anti-ban (F6) ----
export type CampaignStatus =
  | 'DRAFT'
  | 'RUNNING'
  | 'PAUSED'
  | 'DONE'
  | 'CANCELLED';
export type CampaignMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document';
export type CampaignRecipientStatus =
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';

export interface CampaignDto {
  id: string;
  sessionId: string;
  name: string;
  messageType: CampaignMessageType;
  text: string | null;
  mediaUrl: string | null;
  status: CampaignStatus;
  total: number;
  sentCount: number;
  failedCount: number;
  minDelaySec: number;
  maxDelaySec: number;
  dailyCap: number | null;
  typingPreview: boolean;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface CreateCampaignRequest {
  sessionId: string;
  name: string;
  messageType?: CampaignMessageType;
  text?: string;
  mediaUrl?: string; // mídia por URL (o gateway baixa e envia)
  mediaMime?: string;
  fileName?: string;
  recipients: string[]; // números (E.164 sem +) ou JIDs
  minDelaySec?: number;
  maxDelaySec?: number;
  dailyCap?: number;
  typingPreview?: boolean;
  scheduledAt?: string; // ISO; futuro = agenda
  autostart?: boolean;
}

export interface CampaignRecipientDto {
  id: string;
  to: string;
  status: CampaignRecipientStatus;
  error: string | null;
  sentAt: string | null;
}
