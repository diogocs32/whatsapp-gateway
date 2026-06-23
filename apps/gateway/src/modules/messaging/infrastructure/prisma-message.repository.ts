import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '../../../infra/prisma/prisma.service';
import { newId } from '../../../shared-kernel/ulid';
import type {
  ConversationSummary,
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

  // Conversas = chatJid distintos. DISTINCT ON pega a última mensagem de cada conversa
  // (usa o índice [sessionId, chatJid, timestamp]); a subquery externa reordena pela mais
  // recente. LEFT JOIN best-effort com wa_contacts (jid/waId/lid) p/ nome e foto.
  async listConversations(
    sessionId: string,
    limit: number,
  ): Promise<ConversationSummary[]> {
    return this.prisma.$queryRaw<ConversationSummary[]>`
      SELECT sub."chatJid"       AS "chatJid",
             sub."name"          AS "name",
             sub."imgUrl"        AS "imgUrl",
             sub."lastText"      AS "lastText",
             sub."lastType"      AS "lastType",
             sub."lastFromMe"    AS "lastFromMe",
             sub."lastTimestamp" AS "lastTimestamp"
      FROM (
        SELECT DISTINCT ON (m."chatJid")
               m."chatJid"                                          AS "chatJid",
               COALESCE(c."name", c."verifiedName", c."pushName")   AS "name",
               c."imgUrl"                                           AS "imgUrl",
               m."text"                                             AS "lastText",
               m."type"                                             AS "lastType",
               m."fromMe"                                           AS "lastFromMe",
               m."timestamp"                                        AS "lastTimestamp"
        FROM "wa_messages" m
        LEFT JOIN "wa_contacts" c
          ON c."sessionId" = m."sessionId"
         AND (c."jid" = m."chatJid" OR c."waId" = m."chatJid" OR c."lid" = m."chatJid")
        WHERE m."sessionId" = ${sessionId}
        ORDER BY m."chatJid", m."timestamp" DESC
      ) sub
      ORDER BY sub."lastTimestamp" DESC
      LIMIT ${limit}
    `;
  }
}
