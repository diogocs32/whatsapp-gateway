import { Injectable, NotFoundException } from '@nestjs/common';
import type { NewRecipientsMetricDto } from '@whatsapp-gateway/contracts';
import { PrismaService } from '../../infra/prisma/prisma.service';

interface RawMetric {
  newRecipients: number;
  responded: number;
  unresolvedLidRecipients: number;
}

// E20/P-064: observação de novas relações, sem usar isCold nem alterar o G4/G5.
// "Novo" significa primeiro outbound no histórico RETIDO, sem inbound/reação anterior.
// Retenção, importação incompleta e LIDs sem vínculo impedem afirmar primeiro contato absoluto.
@Injectable()
export class NewRecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(
    ref: string,
    computedAt = new Date(),
  ): Promise<NewRecipientsMetricDto> {
    // ID tem precedência sobre nome, igual ao SessionRefPipe.
    const session =
      (await this.prisma.waSession.findUnique({
        where: { id: ref },
        select: { id: true, meJid: true, lastMeJid: true },
      })) ??
      (await this.prisma.waSession.findUnique({
        where: { name: ref },
        select: { id: true, meJid: true, lastMeJid: true },
      }));
    if (!session) throw new NotFoundException(`Sessão não encontrada: ${ref}`);
    const sessionId = session.id;
    const windowStartedAt = new Date(computedAt.getTime() - 30 * 86_400_000);

    // Prisma 7 $queryRaw parametriza sessão/datas; count::int evita BigInt no JSON.
    // Uma única SELECT fornece contagens coerentes no mesmo snapshot do Postgres.
    // JIDs de telefone @c.us/@s.whatsapp.net e sufixos de device viram a mesma identidade;
    // LID só se une a telefone por vínculo unívoco registrado em wa_contacts da MESMA sessão.
    // Nunca inferimos o 9º dígito nem consultamos o WhatsApp para completar o vínculo.
    // keyId não é UNIQUE: reação com LID desconhecido só usa o alvo se este pertence a um
    // único destinatário canônico entre TODAS as mensagens, incluindo inbound e self-chat;
    // duplicatas/eco no mesmo chat não tornam o alvo ambíguo.
    // Timestamp do WhatsApp tem precisão de segundos. Entrada no mesmo timestamp conta como
    // interação/resposta: a ordem é indeterminada, e createdAt é ingestão (inclusive backfill),
    // não prova causalidade. Só timestamp estritamente anterior demonstra relação prévia.
    const [row] = await this.prisma.$queryRaw<RawMetric[]>`
      WITH contact_pairs AS (
        SELECT
          regexp_replace(c."lid", ':[0-9]+@', '@') AS lid,
          replace(regexp_replace(c."jid", ':[0-9]+@', '@'), '@c.us', '@s.whatsapp.net') AS jid
        FROM "wa_contacts" c
        WHERE c."sessionId" = ${sessionId}
          AND c."lid" ~ '^[0-9]+(:[0-9]+)?@lid$'
          AND c."jid" ~ '^[0-9]+(:[0-9]+)?@(s[.]whatsapp[.]net|c[.]us)$'
      ), lid_aliases AS (
        SELECT lid, min(jid) AS jid FROM contact_pairs
        GROUP BY lid HAVING count(DISTINCT jid) = 1
      ), normalized_own_jids AS (
        SELECT replace(regexp_replace(jid, ':[0-9]+@', '@'), '@c.us', '@s.whatsapp.net') AS jid
        FROM unnest(ARRAY[${session.meJid}, ${session.lastMeJid}]::text[]) AS own(jid)
        WHERE jid ~ '^[0-9]+(:[0-9]+)?@(s[.]whatsapp[.]net|c[.]us|lid)$'
      ), own_recipients AS (
        SELECT coalesce(a.jid, o.jid) AS recipient
        FROM normalized_own_jids o LEFT JOIN lid_aliases a ON a.lid = o.jid
      ), normalized_messages AS (
        SELECT m."keyId", m."fromMe", m."timestamp",
          replace(regexp_replace(m."chatJid", ':[0-9]+@', '@'), '@c.us', '@s.whatsapp.net') AS jid
        FROM "wa_messages" m
        WHERE m."sessionId" = ${sessionId}
          AND m."timestamp" <= ${computedAt}
          AND m."chatJid" ~ '^[0-9]+(:[0-9]+)?@(s[.]whatsapp[.]net|c[.]us|lid)$'
      ), all_messages AS (
        SELECT m.*, coalesce(a.jid, m.jid) AS recipient
        FROM normalized_messages m LEFT JOIN lid_aliases a ON a.lid = m.jid
      ), messages AS (
        SELECT m.* FROM all_messages m
        WHERE NOT EXISTS (
          SELECT 1 FROM own_recipients o WHERE o.recipient = m.recipient
        )
      ), outbound_targets AS (
        SELECT "keyId", recipient, min("timestamp") AS "timestamp"
        FROM messages WHERE "fromMe" = true GROUP BY "keyId", recipient
      ), unambiguous_targets AS (
        SELECT "keyId", min(recipient) AS recipient
        FROM all_messages GROUP BY "keyId" HAVING count(DISTINCT recipient) = 1
      ), normalized_reactions AS (
        SELECT x."targetKeyId", x."timestamp", x."createdAt",
          replace(regexp_replace(x."chatJid", ':[0-9]+@', '@'), '@c.us', '@s.whatsapp.net') AS jid
        FROM "wa_message_reactions" x
        WHERE x."sessionId" = ${sessionId} AND x."fromMe" = false
          AND x."chatJid" ~ '^[0-9]+(:[0-9]+)?@(s[.]whatsapp[.]net|c[.]us|lid)$'
      ), reactions AS (
        SELECT x.*, coalesce(a.jid, x.jid) AS recipient,
          t.recipient AS "targetRecipient", t."timestamp" AS "targetTimestamp"
        FROM normalized_reactions x
        LEFT JOIN lid_aliases a ON a.lid = x.jid
        LEFT JOIN unambiguous_targets u ON u."keyId" = x."targetKeyId"
        LEFT JOIN outbound_targets t ON t."keyId" = x."targetKeyId"
          AND (t.recipient = coalesce(a.jid, x.jid)
               OR (a.jid IS NULL AND x.jid LIKE '%@lid' AND t.recipient = u.recipient))
      ), first_outbound AS (
        SELECT recipient, min("timestamp") AS "firstAt"
        FROM messages WHERE "fromMe" = true GROUP BY recipient
      ), new_recipients AS (
        SELECT f.* FROM first_outbound f
        WHERE f."firstAt" >= ${windowStartedAt}
          AND NOT EXISTS (
            SELECT 1 FROM messages p
            WHERE p.recipient = f.recipient AND p."fromMe" = false
              AND p."timestamp" < f."firstAt"
          )
          AND NOT EXISTS (
            SELECT 1 FROM reactions x
            WHERE coalesce(x."targetRecipient", x.recipient) = f.recipient
              AND x."timestamp" < f."firstAt"
              AND (x."targetTimestamp" IS NULL OR x."targetTimestamp" < f."firstAt")
          )
      ), classified AS (
        SELECT n.recipient, EXISTS (
          SELECT 1 FROM messages r
          WHERE r.recipient = n.recipient AND r."fromMe" = false
            AND r."timestamp" >= n."firstAt"
        ) OR EXISTS (
          SELECT 1 FROM reactions x
          WHERE (
            (x."targetRecipient" = n.recipient AND x."targetTimestamp" >= n."firstAt")
            OR (x.recipient = n.recipient AND x."timestamp" >= n."firstAt")
          )
          AND (CASE WHEN x."createdAt" > n."firstAt"
                    THEN LEAST(x."timestamp", x."createdAt")
                    ELSE x."timestamp"
               END) <= ${computedAt}
        ) AS responded
        FROM new_recipients n
      )
      SELECT count(*)::int AS "newRecipients",
        count(*) FILTER (WHERE responded)::int AS "responded",
        count(*) FILTER (WHERE recipient LIKE '%@lid')::int AS "unresolvedLidRecipients"
      FROM classified
    `;

    const metric = row ?? {
      newRecipients: 0,
      responded: 0,
      unresolvedLidRecipients: 0,
    };
    return {
      sessionId,
      windowDays: 30,
      ...metric,
      withoutResponse: metric.newRecipients - metric.responded,
      computedAt: computedAt.toISOString(),
      windowStartedAt: windowStartedAt.toISOString(),
      basis: 'first-observed-outbound',
      coverage: 'retained-history',
    };
  }
}
