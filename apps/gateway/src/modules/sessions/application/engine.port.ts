import type { SessionStatus } from '../domain/session-status';

export interface SessionStatePayload {
  status: SessionStatus;
  meJid?: string | null;
  mePushName?: string | null;
  error?: string | null;
}

// G2: origem de uma mensagem fromMe. `api` = saiu pela nossa API (engine.sendText/sendMedia);
// `phone` = digitada em outro device (o celular do Diogo). Em inbound (fromMe=false) fica null.
// Sustenta o handoff IA×celular: a IA pausa quando vê um fromMe com source=phone.
export type MessageSource = 'api' | 'phone';

export interface MessagePayload {
  keyId: string;
  chatJid: string;
  senderJid: string | null;
  fromMe: boolean;
  type: string;
  text: string | null;
  timestamp: number; // unix seconds
  // G1: presentes no eco de outbound (fromMe). `isCold` = 1º contato permissionado;
  // `idempotencyKey` = chave de dedup do envio (persistida em wa_messages p/ retry seguro).
  isCold?: boolean;
  idempotencyKey?: string | null;
  // G2: api|phone para fromMe; null em inbound.
  source?: MessageSource | null;
  // Mídia (F4) — presentes quando type é image|video|audio|document|sticker.
  mediaType?: string | null;
  mimetype?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mediaKey?: string | null; // chave do objeto no S3 (persistida)
  mediaUrl?: string | null; // URL pré-assinada (preenchida pelo SessionManager; NÃO persistida)
  // proto.IMessage codificado via BufferJSON (texto E mídia). Só preenchido em fromMe; persistido em
  // wa_messages.raw e usado pelo getMessage para reenviar fielmente no retry de descriptografia
  // (evita "Aguardando mensagem" também em mídia, que { conversation } não cobre).
  raw?: unknown;
}

// G3: ACK de entrega/leitura de uma mensagem (sent→delivered→read). Resolve "enviado ≠ entregue"
// e alimenta o ACK ratio do score_saude (G4). Persistido em WaMessage.status (último vence, sem regredir).
export type AckStatus = 'sent' | 'delivered' | 'read';

export interface MessageAckPayload {
  keyId: string; // msg_id
  chatJid: string;
  fromMe: boolean;
  status: AckStatus;
  timestamp: number; // unix seconds (momento do receipt)
}

export type EngineEventName = 'session.status' | 'message' | 'message.ack';
export type EngineEventHandler = (
  name: EngineEventName,
  payload: unknown,
) => void;

// Envelope publicado no EventBus (consumido por SSE e pela persistência de mensagens).
export interface WaEventEnvelope {
  id: string;
  timestamp: number;
  event: EngineEventName;
  sessionId: string;
  session: string; // nome da sessão
  payload: unknown;
  engine: 'baileys' | 'wwebjs';
}

export type MediaSendType =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker';

// G1: opções de envio comuns a texto e mídia. `cold` é repassado ao eco; `idempotencyKey`
// dá dedup forte (o gateway é o juiz — ver MessagesController).
export interface SendOptions {
  cold?: boolean;
  idempotencyKey?: string | null;
}

export interface SendMediaInput extends SendOptions {
  buffer: Buffer;
  type: MediaSendType;
  mimetype: string;
  fileName?: string | null;
  caption?: string | null;
  ptt?: boolean; // áudio como nota de voz
}

// ---- F5: grupos / contatos / canais (resultados independentes da engine) ----
export type GroupParticipantRole = 'admin' | 'superadmin' | 'member';
export type GroupParticipantAction = 'add' | 'remove' | 'promote' | 'demote';

export interface GroupParticipantInfo {
  id: string;
  role: GroupParticipantRole;
  phone: string | null;
  name: string | null;
}
export interface GroupInfo {
  id: string;
  subject: string;
  owner: string | null;
  desc: string | null;
  size: number;
  announce: boolean;
  restrict: boolean;
  participants: GroupParticipantInfo[];
}
export interface ContactCheck {
  number: string;
  exists: boolean;
  jid: string | null;
}
export interface ChannelInfo {
  id: string;
  name: string;
  description: string | null;
  subscribers: number | null;
}

export interface IEngine {
  start(): Promise<void>;
  stop(): Promise<void>;
  logout(): Promise<void>;
  requestPairingCode(phoneNumber: string): Promise<string>;
  sendText(
    to: string,
    text: string,
    opts?: SendOptions,
  ): Promise<{ keyId: string; jid: string }>;
  sendMedia(
    to: string,
    input: SendMediaInput,
  ): Promise<{ keyId: string; jid: string }>;
  sendPresence(
    to: string,
    state: 'composing' | 'paused' | 'recording',
  ): Promise<void>;
  getQrBase64(): string | null;
  getStatus(): SessionStatus;

  // Grupos
  listGroups(): Promise<GroupInfo[]>;
  groupInfo(jid: string): Promise<GroupInfo>;
  createGroup(subject: string, participants: string[]): Promise<GroupInfo>;
  updateParticipants(
    jid: string,
    action: GroupParticipantAction,
    participants: string[],
  ): Promise<void>;
  leaveGroup(jid: string): Promise<void>;
  setGroupSubject(jid: string, subject: string): Promise<void>;
  setGroupDescription(jid: string, description: string): Promise<void>;
  groupInviteCode(jid: string): Promise<string>;
  groupRevokeInvite(jid: string): Promise<string>;

  // Contatos / perfil
  checkNumbers(numbers: string[]): Promise<ContactCheck[]>;
  profilePicture(jid: string): Promise<string | null>;
  setBlock(jid: string, action: 'block' | 'unblock'): Promise<void>;

  // Canais (newsletter) — beta
  createChannel(name: string, description?: string): Promise<ChannelInfo>;
  channelInfo(jid: string): Promise<ChannelInfo>;
  followChannel(jid: string): Promise<void>;
  unfollowChannel(jid: string): Promise<void>;
}
