export interface SaveMessageInput {
  sessionId: string;
  keyId: string;
  chatJid: string;
  senderJid: string | null;
  fromMe: boolean;
  type: string;
  text: string | null;
  timestamp: Date;
  // G1: marcação de 1º contato + chave de dedup (só em outbound).
  isCold?: boolean;
  idempotencyKey?: string | null;
  // G2: origem do fromMe ("api"|"phone"); null em inbound.
  source?: string | null;
  mediaType?: string | null;
  mimetype?: string | null;
  fileName?: string | null;
  mediaKey?: string | null;
  fileSize?: number | null;
  // proto.IMessage codificado via BufferJSON (texto E mídia) → wa_messages.raw; usado no retry.
  raw?: unknown;
}

export interface StoredMessage {
  id: string;
  sessionId: string;
  // Chave real do WhatsApp — exposta no GET /messages (contrato CP-149: markRead e download de
  // mídia aceitam keyId; antes o pull só via o ULID interno).
  keyId: string;
  chatJid: string;
  senderJid: string | null;
  fromMe: boolean;
  type: string;
  text: string | null;
  status: string | null;
  isCold: boolean;
  source: string | null;
  timestamp: Date;
  mediaType: string | null;
  mimetype: string | null;
  fileName: string | null;
  mediaKey: string | null;
  fileSize: number | null;
}

// Resumo de uma conversa (1 por chatJid distinto) para a lista da inbox.
// Derivado de wa_messages (a "conversa" é implícita: mensagens com o mesmo chatJid),
// enriquecido com nome/foto de wa_contacts quando há match.
export interface ConversationSummary {
  chatJid: string;
  name: string | null; // COALESCE(name, verifiedName, pushName) do contato
  imgUrl: string | null;
  lastText: string | null;
  lastType: string;
  lastFromMe: boolean;
  lastTimestamp: Date;
}

// Resultado da dedup idempotente: o que devolver ao cliente quando o envio já foi feito.
export interface IdempotentHit {
  keyId: string;
  chatJid: string;
}

export interface MessageRepository {
  save(input: SaveMessageInput): Promise<void>;
  // W7 — grava um LOTE de mensagens históricas (backfill do inbox), deduplicando pelo keyId já
  // presente na sessão. NÃO passa pelo EventBus (não dispara webhook nem reply-rate). Devolve
  // quantas foram efetivamente inseridas (as já existentes são ignoradas).
  saveHistorical(inputs: SaveMessageInput[]): Promise<number>;
  // G1: localiza um envio anterior com a mesma idempotencyKey nesta sessão (dedup forte).
  findByIdempotencyKey(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<IdempotentHit | null>;
  // G3: grava o último ACK (sent→delivered→read) da mensagem identificada por keyId. Não regride.
  updateStatusByKey(
    sessionId: string,
    keyId: string,
    status: string,
  ): Promise<void>;
  // G8: chatJid + fromMe da mensagem (por keyId) — key do read receipt (G8) e da reação (W5).
  findByKeyId(
    sessionId: string,
    keyId: string,
  ): Promise<{ chatJid: string; fromMe: boolean } | null>;
  listByChat(
    sessionId: string,
    chatJids: string[],
    limit: number,
  ): Promise<StoredMessage[]>;
  // GAP 2 (CP-149): localiza uma mensagem pelo id interno (ULID do GET /messages) OU pelo keyId
  // do WhatsApp (do webhook) — o download de mídia aceita os dois identificadores.
  findByRef(sessionId: string, ref: string): Promise<StoredMessage | null>;
  // Lista as conversas (chatJid distintos) ordenadas pela última mensagem (mais recente primeiro).
  listConversations(
    sessionId: string,
    limit: number,
  ): Promise<ConversationSummary[]>;
  // W7 — busca por termo no texto das mensagens (case-insensitive). `chatJids` vazio = toda a
  // sessão; preenchido = restringe àquela conversa. Ordena pela mais recente. Servida do banco →
  // agnóstica de engine; alcança o que foi persistido (ao vivo + backfill).
  searchMessages(
    sessionId: string,
    query: string,
    chatJids: string[],
    limit: number,
  ): Promise<StoredMessage[]>;
}

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');
