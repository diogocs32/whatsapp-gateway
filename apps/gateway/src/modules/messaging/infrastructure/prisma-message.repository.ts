import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '../../../infra/prisma/prisma.service';
import { newId } from '../../../shared-kernel/ulid';
import type {
  ConversationSummary,
  IdempotentHit,
  MessageRepository,
  SaveMessageInput,
  StoredMessage,
} from '../domain/message.repository';

@Injectable()
export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: SaveMessageInput): Promise<void> {
    try {
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
          isCold: input.isCold ?? false,
          idempotencyKey: input.idempotencyKey ?? null,
          source: input.source ?? null,
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
    } catch (e) {
      // P2002 = violação do unique (sessionId, idempotencyKey): o envio já foi persistido
      // por uma chamada anterior com a mesma idempotencyKey. Dedup — ignora em silêncio.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return;
      }
      throw e;
    }
  }

  async findByIdempotencyKey(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<IdempotentHit | null> {
    const row = await this.prisma.waMessage.findUnique({
      where: { sessionId_idempotencyKey: { sessionId, idempotencyKey } },
      select: { keyId: true, chatJid: true },
    });
    return row ?? null;
  }

  async findByKeyId(
    sessionId: string,
    keyId: string,
  ): Promise<{ chatJid: string; fromMe: boolean } | null> {
    const row = await this.prisma.waMessage.findFirst({
      where: { sessionId, keyId },
      // fromMe: necessário para a reação (a key do Baileys distingue reagir à própria msg vs. à do contato).
      select: { chatJid: true, fromMe: true },
      orderBy: { timestamp: 'desc' },
    });
    return row ?? null;
  }

  // Ordem dos ACKs — usada para nunca regredir (um `read` não volta para `delivered`).
  private static readonly ACK_RANK: Record<string, number> = {
    sent: 1,
    delivered: 2,
    read: 3,
  };

  async updateStatusByKey(
    sessionId: string,
    keyId: string,
    status: string,
  ): Promise<void> {
    const current = await this.prisma.waMessage.findFirst({
      where: { sessionId, keyId },
      select: { id: true, status: true },
      orderBy: { timestamp: 'desc' },
    });
    if (!current) return; // ACK de mensagem que ainda não persistimos (eco pode chegar depois)
    const rank = PrismaMessageRepository.ACK_RANK;
    const cur = current.status ? (rank[current.status] ?? 0) : 0;
    if ((rank[status] ?? 0) <= cur) return; // mesmo nível ou regressão → ignora
    await this.prisma.waMessage.update({
      where: { id: current.id },
      data: { status },
    });
  }

  private toStored(r: {
    id: string;
    sessionId: string;
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
  }): StoredMessage {
    return {
      id: r.id,
      sessionId: r.sessionId,
      keyId: r.keyId,
      chatJid: r.chatJid,
      senderJid: r.senderJid,
      fromMe: r.fromMe,
      type: r.type,
      text: r.text,
      status: r.status,
      isCold: r.isCold,
      source: r.source,
      timestamp: r.timestamp,
      mediaType: r.mediaType,
      mimetype: r.mimetype,
      fileName: r.fileName,
      mediaKey: r.mediaKey,
      fileSize: r.fileSize,
    };
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
    return rows.reverse().map((r) => this.toStored(r));
  }

  // GAP 2 (CP-149): aceita o ULID interno OU o keyId do WhatsApp. Em colisão improvável,
  // a mensagem mais recente vence (mesmo critério do findByKeyId).
  async findByRef(
    sessionId: string,
    ref: string,
  ): Promise<StoredMessage | null> {
    const row = await this.prisma.waMessage.findFirst({
      where: { sessionId, OR: [{ id: ref }, { keyId: ref }] },
      orderBy: { timestamp: 'desc' },
    });
    return row ? this.toStored(row) : null;
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
