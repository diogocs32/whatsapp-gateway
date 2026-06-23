export interface SaveMessageInput {
  sessionId: string;
  keyId: string;
  chatJid: string;
  senderJid: string | null;
  fromMe: boolean;
  type: string;
  text: string | null;
  timestamp: Date;
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
  chatJid: string;
  senderJid: string | null;
  fromMe: boolean;
  type: string;
  text: string | null;
  status: string | null;
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

export interface MessageRepository {
  save(input: SaveMessageInput): Promise<void>;
  listByChat(
    sessionId: string,
    chatJids: string[],
    limit: number,
  ): Promise<StoredMessage[]>;
  // Lista as conversas (chatJid distintos) ordenadas pela última mensagem (mais recente primeiro).
  listConversations(
    sessionId: string,
    limit: number,
  ): Promise<ConversationSummary[]>;
}

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');
