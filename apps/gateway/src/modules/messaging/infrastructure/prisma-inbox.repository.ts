import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../../infra/prisma/prisma.service';
import { newId } from '../../../shared-kernel/ulid';
import type {
  InboxConversationRow,
  InboxFeedRow,
  InboxRepository,
} from '../domain/inbox.repository';

// Chats que a caixa única NÃO mostra (decisão do dono 15/09/2026): grupo (`@g.us`), lista de
// transmissão / status (`@broadcast`) e canal (`@newsletter`). O filtro é por sufixo do JID —
// vale para as duas engines (`@s.whatsapp.net` do Baileys e `@c.us` do wwebjs são 1:1).
const EXCLUDED_CHAT_SUFFIXES = ['@g.us', '@broadcast', '@newsletter'];

@Injectable()
export class PrismaInboxRepository implements InboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Só conversa 1:1 — aplicado em TODA consulta desta classe.
  private get chatFilter(): Prisma.Sql {
    return Prisma.join(
      EXCLUDED_CHAT_SUFFIXES.map(
        (suffix) => Prisma.sql`m."chatJid" NOT LIKE ${'%' + suffix}`,
      ),
      ' AND ',
    );
  }

  // Aceita ID **ou NOME** de sessão — paridade com o resto da API (SessionRefPipe). A subquery em
  // wa_sessions é barata (tabela de dezenas de linhas) e resolve os nomes dentro do próprio SQL.
  private sessionFilter(sessionRefs: string[] | undefined): Prisma.Sql {
    if (!sessionRefs?.length) return Prisma.sql`TRUE`;
    const refs = Prisma.join(sessionRefs);
    return Prisma.sql`m."sessionId" IN (
      SELECT sf."id" FROM "wa_sessions" sf
      WHERE sf."id" IN (${refs}) OR sf."name" IN (${refs})
    )`;
  }

  // Uma consulta para a lista inteira do painel. `DISTINCT ON (sessionId, chatJid)` pega a última
  // mensagem de cada conversa de cada aparelho (usa o índice [sessionId, chatJid, timestamp]); os
  // LATERAL trazem a última ENTRADA (âncora do amarelo), a última SAÍDA e quantas entradas ainda
  // não foram respondidas. LATERAL com LIMIT 1 também evita o contato/triagem duplicar a linha.
  async listConversations(opts: {
    limit: number;
    sessionIds?: string[];
  }): Promise<InboxConversationRow[]> {
    return this.prisma.$queryRaw<InboxConversationRow[]>`
      SELECT last."sessionId"                                  AS "sessionId",
             s."name"                                          AS "sessionName",
             s."engine"::text                                   AS "engine",
             last."chatJid"                                    AS "chatJid",
             ct."name"                                         AS "name",
             ct."phone"                                        AS "phone",
             ct."imgUrl"                                       AS "imgUrl",
             last."lastText"                                   AS "lastText",
             last."lastType"                                   AS "lastType",
             last."lastFromMe"                                 AS "lastFromMe",
             last."lastSource"                                 AS "lastSource",
             last."lastTimestamp"                              AS "lastTimestamp",
             inb."keyId"                                       AS "lastInboundKeyId",
             inb."timestamp"                                   AS "lastInboundTimestamp",
             COALESCE(pend."pendingInbound", 0)                AS "pendingInbound",
             tri."markedKeyId"                                 AS "triageKeyId",
             tri."markedTimestamp"                             AS "triageTimestamp"
      FROM (
        SELECT DISTINCT ON (m."sessionId", m."chatJid")
               m."sessionId"  AS "sessionId",
               m."chatJid"    AS "chatJid",
               m."text"       AS "lastText",
               m."type"       AS "lastType",
               m."fromMe"     AS "lastFromMe",
               m."source"     AS "lastSource",
               m."timestamp"  AS "lastTimestamp"
        FROM "wa_messages" m
        WHERE ${this.chatFilter}
          AND ${this.sessionFilter(opts.sessionIds)}
        ORDER BY m."sessionId", m."chatJid", m."timestamp" DESC
      ) last
      JOIN "wa_sessions" s ON s."id" = last."sessionId"
      LEFT JOIN LATERAL (
        SELECT m."keyId", m."timestamp"
        FROM "wa_messages" m
        WHERE m."sessionId" = last."sessionId"
          AND m."chatJid" = last."chatJid"
          AND m."fromMe" = FALSE
        ORDER BY m."timestamp" DESC
        LIMIT 1
      ) inb ON TRUE
      LEFT JOIN LATERAL (
        SELECT m."timestamp"
        FROM "wa_messages" m
        WHERE m."sessionId" = last."sessionId"
          AND m."chatJid" = last."chatJid"
          AND m."fromMe" = TRUE
        ORDER BY m."timestamp" DESC
        LIMIT 1
      ) outg ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS "pendingInbound"
        FROM "wa_messages" m
        WHERE m."sessionId" = last."sessionId"
          AND m."chatJid" = last."chatJid"
          AND m."fromMe" = FALSE
          AND (outg."timestamp" IS NULL OR m."timestamp" > outg."timestamp")
      ) pend ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(c."name", c."verifiedName", c."pushName") AS "name",
               c."phone" AS "phone",
               c."imgUrl" AS "imgUrl"
        FROM "wa_contacts" c
        WHERE c."sessionId" = last."sessionId"
          AND (c."jid" = last."chatJid" OR c."waId" = last."chatJid" OR c."lid" = last."chatJid")
        ORDER BY c."updatedAt" DESC
        LIMIT 1
      ) ct ON TRUE
      LEFT JOIN "wa_conversation_triage" tri
        ON tri."sessionId" = last."sessionId" AND tri."chatJid" = last."chatJid"
      ORDER BY last."lastTimestamp" DESC
      LIMIT ${opts.limit}
    `;
  }

  // Fluxo cronológico da carga inicial (o tempo real vem do SSE /api/events/stream).
  async listFeed(opts: {
    limit: number;
    sessionIds?: string[];
  }): Promise<InboxFeedRow[]> {
    return this.prisma.$queryRaw<InboxFeedRow[]>`
      SELECT m."id"                              AS "id",
             m."keyId"                           AS "keyId",
             m."sessionId"                       AS "sessionId",
             s."name"                            AS "sessionName",
             m."chatJid"                         AS "chatJid",
             ct."name"                           AS "name",
             m."fromMe"                          AS "fromMe",
             m."source"                          AS "source",
             m."type"                            AS "type",
             m."text"                            AS "text",
             m."timestamp"                       AS "timestamp"
      FROM "wa_messages" m
      JOIN "wa_sessions" s ON s."id" = m."sessionId"
      LEFT JOIN LATERAL (
        SELECT COALESCE(c."name", c."verifiedName", c."pushName") AS "name"
        FROM "wa_contacts" c
        WHERE c."sessionId" = m."sessionId"
          AND (c."jid" = m."chatJid" OR c."waId" = m."chatJid" OR c."lid" = m."chatJid")
        ORDER BY c."updatedAt" DESC
        LIMIT 1
      ) ct ON TRUE
      WHERE ${this.chatFilter}
        AND ${this.sessionFilter(opts.sessionIds)}
      ORDER BY m."timestamp" DESC
      LIMIT ${opts.limit}
    `;
  }

  async findLastInbound(
    sessionId: string,
    chatJid: string,
  ): Promise<{ keyId: string; timestamp: Date } | null> {
    const row = await this.prisma.waMessage.findFirst({
      where: { sessionId, chatJid, fromMe: false },
      orderBy: { timestamp: 'desc' },
      select: { keyId: true, timestamp: true },
    });
    return row ?? null;
  }

  // Upsert por (sessionId, chatJid): uma conversa tem no máximo UMA marca, sempre a mais recente.
  async markIgnored(input: {
    sessionId: string;
    chatJid: string;
    keyId: string | null;
    timestamp: Date;
  }): Promise<void> {
    await this.prisma.conversationTriage.upsert({
      where: {
        sessionId_chatJid: {
          sessionId: input.sessionId,
          chatJid: input.chatJid,
        },
      },
      create: {
        id: newId(),
        sessionId: input.sessionId,
        chatJid: input.chatJid,
        markedKeyId: input.keyId,
        markedTimestamp: input.timestamp,
      },
      update: {
        markedKeyId: input.keyId,
        markedTimestamp: input.timestamp,
      },
    });
  }

  async clearTriage(sessionId: string, chatJid: string): Promise<void> {
    await this.prisma.conversationTriage.deleteMany({
      where: { sessionId, chatJid },
    });
  }
}
