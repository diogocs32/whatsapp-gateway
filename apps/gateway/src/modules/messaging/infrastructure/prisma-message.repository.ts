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

// O PostgreSQL não guarda U+0000 em `text` nem em `jsonb` (doc oficial PG 18: "The jsonb type also
// rejects \u0000"; o tipo text "cannot store" NUL) — um NUL num texto, nome de arquivo ou no proto
// derrubava o INSERT inteiro e a mensagem sumia (o persister só loga). No `jsonb` também cai o
// surrogate UTF-16 SOLTO (texto com UTF-8 malformado decodificado pelo protobufjs vira '\ud800'; o
// Prisma o manda escapado no JSON e o PG recusa: "Unicode low surrogate must follow a high
// surrogate" — no `text` o driver já troca por U+FFFD). Desde a E24 o `raw` também vem das
// RECEBIDAS (muitas strings de terceiros) — limpeza única aqui, na gravação.
type WellFormed = { toWellFormed(): string }; // ES2024 (Node ≥ 20); o lib do tsconfig é ES2023
function noNul(v: string | null | undefined): string | null | undefined {
  if (typeof v !== 'string') return v;
  const s = v.includes('\u0000') ? v.replaceAll('\u0000', '') : v;
  return (s as unknown as WellFormed).toWellFormed();
}
function noNulDeep(v: unknown): unknown {
  if (typeof v === 'string') return noNul(v);
  if (Array.isArray(v)) return v.map(noNulDeep);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      out[noNul(k) as string] = noNulDeep(x);
    }
    return out;
  }
  return v;
}

@Injectable()
export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: SaveMessageInput): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        await this.lockAckKeys(tx, [
          { sessionId: input.sessionId, keyId: input.keyId },
        ]);
        // Mantém a dedup por idempotencyKey; conflito com OUTRA key não consome seu ACK.
        await tx.waMessage.createMany({
          data: {
            id: newId(),
            sessionId: input.sessionId,
            keyId: input.keyId,
            chatJid: input.chatJid,
            senderJid: input.senderJid,
            fromMe: input.fromMe,
            type: input.type,
            text: noNul(input.text) ?? null,
            isCold: input.isCold ?? false,
            idempotencyKey: input.idempotencyKey ?? null,
            source: input.source ?? null,
            timestamp: input.timestamp,
            mediaType: input.mediaType ?? null,
            mimetype: noNul(input.mimetype) ?? null,
            fileName: noNul(input.fileName) ?? null,
            mediaKey: input.mediaKey ?? null,
            fileSize: input.fileSize ?? null,
            isForwarded: input.isForwarded ?? false,
            forwardingScore: input.forwardingScore ?? null,
            raw:
              input.raw != null
                ? (noNulDeep(input.raw) as Prisma.InputJsonValue)
                : undefined,
          },
          skipDuplicates: true,
        });
        await this.reconcileAck(tx, input.sessionId, input.keyId);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async saveHistorical(inputs: SaveMessageInput[]): Promise<number> {
    let count = 0;
    // Backfill até 500 mensagens/chat: limita locks e duração sem serializar a sessão inteira.
    for (let offset = 0; offset < inputs.length; offset += 50) {
      const unique = new Map<string, SaveMessageInput>();
      for (const input of inputs.slice(offset, offset + 50)) {
        const identity = JSON.stringify([input.sessionId, input.keyId]);
        if (input.keyId && !unique.has(identity)) unique.set(identity, input);
      }
      const chunk = [...unique.values()];
      if (!chunk.length) continue;
      count += await this.prisma.$transaction(
        async (tx) => {
          await this.lockAckKeys(tx, chunk);
          const rows: Prisma.WaMessageCreateManyInput[] = [];
          const existing = await tx.waMessage.findMany({
            where: {
              OR: chunk.map((i) => ({
                sessionId: i.sessionId,
                keyId: i.keyId,
              })),
            },
            select: { sessionId: true, keyId: true },
          });
          const seen = new Set(
            existing.map((i) => JSON.stringify([i.sessionId, i.keyId])),
          );
          for (const i of chunk) {
            if (seen.has(JSON.stringify([i.sessionId, i.keyId]))) continue;
            rows.push({
              id: newId(),
              sessionId: i.sessionId,
              keyId: i.keyId,
              chatJid: i.chatJid,
              senderJid: i.senderJid,
              fromMe: i.fromMe,
              type: i.type,
              text: noNul(i.text) ?? null,
              isCold: i.isCold ?? false,
              idempotencyKey: i.idempotencyKey ?? null,
              source: i.source ?? null,
              timestamp: i.timestamp,
              mediaType: i.mediaType ?? null,
              mimetype: noNul(i.mimetype) ?? null,
              fileName: noNul(i.fileName) ?? null,
              mediaKey: i.mediaKey ?? null,
              fileSize: i.fileSize ?? null,
              isForwarded: i.isForwarded ?? false,
              forwardingScore: i.forwardingScore ?? null,
            });
          }
          const inserted = rows.length
            ? await tx.waMessage.createMany({
                data: rows,
                skipDuplicates: true,
              })
            : { count: 0 };
          for (const i of chunk) {
            await this.reconcileAck(tx, i.sessionId, i.keyId);
          }
          return inserted.count;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    }
    return count;
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

  // P-068 (E24): chat da conversa EXISTENTE com o destino — a última mensagem RECEBIDA (fromMe=false)
  // num dos jids candidatos. null = destino sem conversa → o encaminhar trata como cold. Índice
  // (sessionId, chatJid, timestamp).
  async findInboundChat(
    sessionId: string,
    chatJids: string[],
  ): Promise<string | null> {
    if (!chatJids.length) return null;
    const row = await this.prisma.waMessage.findFirst({
      where: { sessionId, chatJid: { in: chatJids }, fromMe: false },
      select: { chatJid: true },
      orderBy: { timestamp: 'desc' },
    });
    return row?.chatJid ?? null;
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
    error: 4,
  };

  async updateStatusByKey(
    sessionId: string,
    keyId: string,
    status: string,
  ): Promise<void> {
    if (!Object.hasOwn(PrismaMessageRepository.ACK_RANK, status)) return;
    await this.prisma.$transaction(
      async (tx) => {
        await this.lockAckKeys(tx, [{ sessionId, keyId }]);
        await this.reconcileAck(tx, sessionId, keyId, status);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  private ackRankSql(status: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`CASE ${status}
      WHEN 'sent' THEN 1 WHEN 'delivered' THEN 2
      WHEN 'read' THEN 3 WHEN 'error' THEN 4 ELSE 0 END`;
  }

  // Mesmo lock para ACK/live/histórico; statement separado garante snapshot posterior à espera.
  // Ordena os hashes EFETIVOS (inclusive colisões) para lotes concorrentes não fazerem deadlock.
  private async lockAckKeys(
    tx: Prisma.TransactionClient,
    keys: Array<{ sessionId: string; keyId: string }>,
  ): Promise<void> {
    const identities = keys.map((k) =>
      JSON.stringify(['message-ack', k.sessionId, k.keyId]),
    );
    const locks = await tx.$queryRaw<Array<{ key: bigint }>>`
      SELECT DISTINCT hashtextextended(value, 0) AS key
      FROM unnest(ARRAY[${Prisma.join(identities)}]::text[]) AS value
      ORDER BY key`;
    for (const lock of locks) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lock.key})`;
    }
  }

  private async reconcileAck(
    tx: Prisma.TransactionClient,
    sessionId: string,
    keyId: string,
    incoming?: string,
  ): Promise<void> {
    // Mantém o alvo legado (latest timestamp por sessão/key), inclusive read-self inbound.
    const target = await tx.waMessage.findFirst({
      where: { sessionId, keyId },
      orderBy: { timestamp: 'desc' },
      select: { id: true },
    });
    if (!target) {
      if (incoming) {
        const rank = PrismaMessageRepository.ACK_RANK[incoming];
        await tx.$executeRaw`
          INSERT INTO "wa_pending_message_acks" ("sessionId", "keyId", "status", "lastSeenAt")
          VALUES (${sessionId}, ${keyId}, ${incoming}, clock_timestamp())
          ON CONFLICT ("sessionId", "keyId") DO UPDATE
          SET "status" = CASE
              WHEN ${this.ackRankSql(Prisma.sql`"wa_pending_message_acks"."status"`)} < ${rank}
              THEN EXCLUDED."status" ELSE "wa_pending_message_acks"."status" END,
              "lastSeenAt" = clock_timestamp()`;
      }
      return;
    }
    const pending = await tx.pendingMessageAck.findUnique({
      where: { sessionId_keyId: { sessionId, keyId } },
      select: { status: true },
    });
    const status =
      pending &&
      (PrismaMessageRepository.ACK_RANK[pending.status] ?? 0) >
        (PrismaMessageRepository.ACK_RANK[incoming ?? ''] ?? 0)
        ? pending.status
        : incoming;
    if (status) {
      const rank = PrismaMessageRepository.ACK_RANK[status];
      await tx.$executeRaw`
        UPDATE "wa_messages" SET "status" = ${status}
        WHERE "id" = ${target.id}
          AND ${this.ackRankSql(Prisma.sql`"status"`)} < ${rank}`;
    }
    if (pending) {
      // O purge pode ter removido o órfão após a leitura; 0 linhas não invalida o INSERT/status.
      await tx.pendingMessageAck.deleteMany({
        where: { sessionId, keyId },
      });
    }
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
    isForwarded: boolean;
    forwardingScore: number | null;
    revokedAt: Date | null;
    editedAt: Date | null;
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
      isForwarded: r.isForwarded,
      forwardingScore: r.forwardingScore,
      revokedAt: r.revokedAt,
      editedAt: r.editedAt,
    };
  }

  async listByChat(
    sessionId: string,
    chatJids: string[],
    limit: number,
  ): Promise<StoredMessage[]> {
    const rows = await this.prisma.waMessage.findMany({
      where: { sessionId, chatJid: { in: chatJids } },
      // O `raw` (proto, até dezenas de KB com miniatura) não vai no DTO — desde a E24 ele existe em
      // toda recebida do Baileys e o Inbox relê a conversa a cada 2,5 s.
      omit: { raw: true },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows.reverse().map((r) => this.toStored(r));
  }

  async searchMessages(
    sessionId: string,
    query: string,
    chatJids: string[],
    limit: number,
  ): Promise<StoredMessage[]> {
    const rows = await this.prisma.waMessage.findMany({
      where: {
        sessionId,
        // ILIKE '%query%' (parametrizado). `%`/`_` do usuário viram wildcard — aceitável numa
        // caixa de busca. Sem índice dedicado (seq scan no `text`) — ok p/ o volume atual; um
        // índice trigram/FTS é melhoria futura se a tabela crescer muito.
        text: { contains: query, mode: 'insensitive' },
        ...(chatJids.length ? { chatJid: { in: chatJids } } : {}),
      },
      omit: { raw: true },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toStored(r));
  }

  // GAP 2 (CP-149): aceita o ULID interno OU o keyId do WhatsApp. Em colisão improvável,
  // a mensagem mais recente vence (mesmo critério do findByKeyId).
  async findByRef(
    sessionId: string,
    ref: string,
  ): Promise<StoredMessage | null> {
    const row = await this.prisma.waMessage.findFirst({
      where: { sessionId, OR: [{ id: ref }, { keyId: ref }] },
      omit: { raw: true },
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
