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

  async saveHistorical(inputs: SaveMessageInput[]): Promise<number> {
    if (!inputs.length) return 0;
    const sessionId = inputs[0].sessionId;
    const keyIds = inputs.map((i) => i.keyId).filter(Boolean);
    // Dedup contra o que já existe no banco (histórico + ao vivo). Sem unique em (sessionId,keyId)
    // no schema, a checagem é em aplicação; createMany(skipDuplicates) só cobre o unique de
    // idempotencyKey (null no histórico → NULLS DISTINCT → não conflita).
    const existing = await this.prisma.waMessage.findMany({
      where: { sessionId, keyId: { in: keyIds } },
      select: { keyId: true },
    });
    const seen = new Set(existing.map((e) => e.keyId));
    const rows: Prisma.WaMessageCreateManyInput[] = [];
    for (const i of inputs) {
      if (!i.keyId || seen.has(i.keyId)) continue;
      seen.add(i.keyId); // dedup também dentro do próprio lote
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
    if (!rows.length) return 0;
    const r = await this.prisma.waMessage.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return r.count;
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
  };

  async updateStatusByKey(
    sessionId: string,
    keyId: string,
    status: string,
  ): Promise<void> {
    const rank = PrismaMessageRepository.ACK_RANK[status] ?? 0;
    if (rank === 0) return; // status desconhecido nunca persiste (mesma regra de antes)
    // UM statement atômico no lugar de findFirst+update: além de cortar o round-trip (ACK é hot
    // path — todo delivered/read passa aqui), a guarda de ranking DENTRO do UPDATE elimina a
    // corrida read-modify-write entre ACKs concorrentes (um `delivered` atrasado não sobrescreve
    // mais um `read` que commitou entre a leitura e a escrita). Alvo = linha mais recente de
    // (sessionId, keyId), como no findFirst anterior (usa o índice [sessionId, keyId]).
    // ACK de mensagem ainda não persistida (eco tardio) → 0 linhas, no-op — comportamento igual.
    await this.prisma.$executeRaw`
      UPDATE "wa_messages" SET "status" = ${status}
      WHERE "id" = (
        SELECT "id" FROM "wa_messages"
        WHERE "sessionId" = ${sessionId} AND "keyId" = ${keyId}
        ORDER BY "timestamp" DESC
        LIMIT 1
      )
      AND (CASE "status"
             WHEN 'sent' THEN 1
             WHEN 'delivered' THEN 2
             WHEN 'read' THEN 3
             ELSE 0
           END) < ${rank}`;
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
