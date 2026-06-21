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

export interface MessageRepository {
  save(input: SaveMessageInput): Promise<void>;
  listByChat(
    sessionId: string,
    chatJids: string[],
    limit: number,
  ): Promise<StoredMessage[]>;
}

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');
