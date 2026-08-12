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

// G6 — eventos OUT do guard-rail (catálogo consumido pelo n8n via webhook). C5: NÃO existe evento
// de block/report (impossível detectar no Baileys) — não prometer o que o protocolo não dá.
export type GuardrailEventName =
  | 'session.throttled'
  | 'session.quarantined'
  | 'session.warming'
  | 'session.recovered'
  | 'session.banned'
  | 'signal.463'
  | 'signal.restriction'
  | 'send.blocked';

// Qualquer evento que trafega no EventBus → webhook OUT.
export type WaEventName = EngineEventName | GuardrailEventName;

// Envelope publicado no EventBus (consumido por SSE e pela persistência de mensagens).
export interface WaEventEnvelope {
  id: string;
  timestamp: number;
  event: WaEventName;
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
  // W5: menções — JIDs/números a marcar (@) na mensagem. Resolvidos ao formato de cada engine
  // (Baileys: `@s.whatsapp.net`; wwebjs: `@c.us`). Vazio/ausente = sem menção.
  mentions?: string[];
}

export interface SendMediaInput extends SendOptions {
  buffer: Buffer;
  type: MediaSendType;
  mimetype: string;
  fileName?: string | null;
  caption?: string | null;
  ptt?: boolean; // áudio como nota de voz
}

// W5 — localização e enquete (poll). Sends completos em si (sem evento inbound novo).
export interface SendLocationInput extends SendOptions {
  latitude: number;
  longitude: number;
  name?: string | null; // rótulo do lugar
  address?: string | null; // endereço legível
}
export interface SendPollInput extends SendOptions {
  name: string; // a pergunta
  options: string[]; // as opções (2..12)
  multi?: boolean; // permite múltiplas respostas (default: escolha única)
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

// Dados para salvar/editar um contato na agenda da conta. `syncToPhone` pede ao WhatsApp para
// propagar também para a agenda do aparelho (saveOnPrimaryAddressbook no Baileys /
// syncToAddressbook no wwebjs). Sem ele, o contato fica só na agenda da conta WhatsApp.
export interface SaveContactInput {
  firstName: string;
  lastName?: string | null;
  syncToPhone?: boolean;
}
export interface ChannelInfo {
  id: string;
  name: string;
  description: string | null;
  subscribers: number | null;
}

// G8 — estados de presença. composing/recording/paused são por chat; available/unavailable globais.
export type PresenceState =
  | 'composing'
  | 'paused'
  | 'recording'
  | 'available'
  | 'unavailable';

// Erro de operação NÃO suportada pela engine ativa (ex.: grupos/canais no wwebjs, cujo `nope()` o
// lança). O controller mapeia para HTTP 501 (Not Implemented) — distinto de payload inválido (400):
// para o integrador (node n8n), "esta engine não faz isso" ≠ "você mandou errado".
export class UnsupportedEngineOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedEngineOperationError';
  }
}

export interface IEngine {
  // Nome da engine desta instância — usado para rotular o envelope de eventos (webhook OUT) com a
  // engine REAL da sessão. Sem isto o SessionManager rotulava tudo como 'baileys' (inclusive WWEBJS).
  readonly engineName: 'baileys' | 'wwebjs';
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
  // W5 — envia uma localização (mapa) e uma enquete (poll).
  sendLocation(
    to: string,
    input: SendLocationInput,
  ): Promise<{ keyId: string; jid: string }>;
  sendPoll(
    to: string,
    input: SendPollInput,
  ): Promise<{ keyId: string; jid: string }>;
  sendPresence(to: string, state: PresenceState): Promise<void>;
  // G8 — marca uma mensagem recebida como lida (read receipt / "visto").
  markRead(chatJid: string, msgId: string): Promise<void>;
  // W5 — reage a uma mensagem com um emoji (string vazia REMOVE a reação). `fromMe` identifica
  // se a mensagem-alvo foi enviada por nós (o Baileys precisa disso para montar a key; o wwebjs
  // resolve só pelo msgId).
  sendReaction(
    chatJid: string,
    msgId: string,
    fromMe: boolean,
    emoji: string,
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
  // Salva/edita um contato na agenda da conta (opcionalmente sincroniza com o aparelho).
  saveContact(jid: string, input: SaveContactInput): Promise<void>;
  // Remove o contato da agenda da conta.
  removeContact(jid: string): Promise<void>;

  // Canais (newsletter) — beta
  createChannel(name: string, description?: string): Promise<ChannelInfo>;
  channelInfo(jid: string): Promise<ChannelInfo>;
  followChannel(jid: string): Promise<void>;
  unfollowChannel(jid: string): Promise<void>;
}
