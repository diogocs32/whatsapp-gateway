import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '../../../infra/prisma/prisma.service';
import { newId } from '../../../shared-kernel/ulid';
import type {
  MessageRepository,
  SaveMessageInput,
  StoredMessage,
} from '../domain/message.repository';

@Injectable()
export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: SaveMessageInput): Promise<void> {
    await this.prisma.waMessage.create({
      data: {
        id: newId(),
        sessionId: input.sessionId,
        keyId: input.keyId,
        chatJid: input.chatJid,
        senderJid: input.senderJid,
        fromMe: input.fromMe,
        type: input.type,
        text: input.text,
        timestamp: input.timestamp,
        mediaType: input.mediaType ?? null,
        mimetype: input.mimetype ?? null,
        fileName: input.fileName ?? null,
        mediaKey: input.mediaKey ?? null,
        fileSize: input.fileSize ?? null,
        raw:
          input.raw != null
            ? (input.raw as Prisma.InputJsonValue)
            : undefined,
      },
    });
  }

  async listByChat(
    sessionId: string,
    chatJids: string[],
    limit: number,
  ): Promise<StoredMessage[]> {
    const rows = await this.prisma.waMessage.findMany({
      where: { sessionId, chatJid: { in: chatJids } },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows.reverse().map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      chatJid: r.chatJid,
      senderJid: r.senderJid,
      fromMe: r.fromMe,
      type: r.type,
      text: r.text,
      status: r.status,
      timestamp: r.timestamp,
      mediaType: r.mediaType,
      mimetype: r.mimetype,
      fileName: r.fileName,
      mediaKey: r.mediaKey,
      fileSize: r.fileSize,
    }));
  }
}
