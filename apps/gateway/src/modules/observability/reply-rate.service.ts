import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ReplyRateMetricDto } from '@whatsapp-gateway/contracts';
import type { Env } from '../../bootstrap/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { newId } from '../../shared-kernel/ulid';

// G4 — contabilidade/reply-rate por sessão. É a BASE do guard-rail (G5): mede quantos 1º-contatos
// (cold) foram respondidos, sem agir ainda (modo observação). Calculado sob demanda via SQL sobre
// wa_messages (fonte: isCold/source/status de G1-G3) e persistido como snapshot em SessionMetric.

export type ReplyRateResult = ReplyRateMetricDto;

// Amostra mínima antes de qualquer veredito de saúde (G5). Abaixo disso, reliable=false.
// WA-05 (auditoria 09/2026): UMA fonte de verdade — o mesmo Nmin do guard-rail (override em
// guardrail_config ou GUARDRAIL_NMIN do env), não uma constante paralela que divergia do que o
// `evaluate` usava. Cache curto para não consultar o singleton a cada snapshot.
const NMIN_FALLBACK = 20;
const NMIN_CACHE_MS = 60_000;

interface RawRow {
  coldTotal: number;
  coldMature: number;
  responded: number;
  ambiguousMature: number;
  delivered: number;
  readCnt: number;
}

@Injectable()
export class ReplyRateService {
  private nminCache: { value: number; at: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Nmin em vigor: guardrail_config.nmin (PATCH em runtime) > GUARDRAIL_NMIN (env) > 20.
  private async nmin(): Promise<number> {
    if (this.nminCache && Date.now() - this.nminCache.at < NMIN_CACHE_MS) {
      return this.nminCache.value;
    }
    let value =
      this.config.get('GUARDRAIL_NMIN', { infer: true }) ?? NMIN_FALLBACK;
    try {
      const row = await this.prisma.guardrailConfig.findUnique({
        where: { id: 'singleton' },
        select: { nmin: true },
      });
      if (row?.nmin) value = row.nmin;
    } catch {
      /* sem override no DB / DB fora: vale o env */
    }
    this.nminCache = { value, at: Date.now() };
    return value;
  }

  // Resolve nome OU id da sessão para o id real (mesma semântica do SessionRefPipe).
  private async resolveSessionId(ref: string): Promise<string> {
    const s = await this.prisma.waSession.findFirst({
      where: { OR: [{ id: ref }, { name: ref }] },
      select: { id: true },
    });
    if (!s) throw new NotFoundException(`Sessão não encontrada: ${ref}`);
    return s.id;
  }

  async compute(ref: string, windowDays: number): Promise<ReplyRateResult> {
    return this.computeFor(await this.resolveSessionId(ref), windowDays);
  }

  // Snapshot das duas janelas: 7d (operacional) e 30d (referência).
  async snapshot(ref: string): Promise<ReplyRateResult[]> {
    const sessionId = await this.resolveSessionId(ref);
    return Promise.all([
      this.computeFor(sessionId, 7),
      this.computeFor(sessionId, 30),
    ]);
  }

  private async computeFor(
    sessionId: string,
    windowDays: number,
  ): Promise<ReplyRateResult> {
    // C2/D-028: só cold maduro (>72h), resposta em até 72h, reação removida conta.
    // P-103: keyId é apenas indexado. Chat explícito identifica a conversa; LID sem
    // vínculo local só infere o alvo se a chave tem UM chat entre TODAS as mensagens
    // da sessão (também inbound, self-chat, grupos e fora da janela). Eco no mesmo
    // chat não é conflito. Alias LID contraditório não autoriza inferência.
    // Reação ambígua não prova resposta nem ausência: mantém denominador/amostra,
    // mas invalida reliable se houver cold maduro ainda sem outra resposta certa.
    const rows = await this.prisma.$queryRaw<RawRow[]>`
      WITH contact_pairs AS (
        SELECT regexp_replace("lid", ':[0-9]+@', '@') AS lid,
          replace(regexp_replace("jid", ':[0-9]+@', '@'), '@c.us', '@s.whatsapp.net') AS jid
        FROM "wa_contacts"
        WHERE "sessionId" = ${sessionId}
          AND "lid" ~ '^[0-9]+(:[0-9]+)?@lid$'
          AND "jid" ~ '^[0-9]+(:[0-9]+)?@(s[.]whatsapp[.]net|c[.]us)$'
      ), aliases AS (
        SELECT lid, min(jid) AS jid, count(DISTINCT jid) AS destinations
        FROM contact_pairs GROUP BY lid
      ), target_keys AS (
        SELECT DISTINCT "targetKeyId" FROM "wa_message_reactions"
        WHERE "sessionId" = ${sessionId} AND "fromMe" = false
      ), normalized_targets AS (
        SELECT m.id, m."keyId", m."timestamp", m."fromMe",
          replace(regexp_replace(m."chatJid", ':[0-9]+@', '@'), '@c.us', '@s.whatsapp.net') AS jid
        FROM "wa_messages" m JOIN target_keys k ON k."targetKeyId" = m."keyId"
        WHERE m."sessionId" = ${sessionId}
      ), targets AS (
        SELECT m.*, CASE WHEN a.destinations = 1 THEN a.jid ELSE m.jid END AS recipient
        FROM normalized_targets m LEFT JOIN aliases a ON a.lid = m.jid
      ), key_chats AS (
        SELECT "keyId", count(DISTINCT recipient) AS destinations, min(recipient) AS recipient
        FROM targets GROUP BY "keyId"
      ), normalized_reactions AS (
        SELECT x.*,
          replace(regexp_replace(x."chatJid", ':[0-9]+@', '@'), '@c.us', '@s.whatsapp.net') AS jid
        FROM "wa_message_reactions" x
        WHERE x."sessionId" = ${sessionId} AND x."fromMe" = false
      ), reactions AS (
        SELECT x.*, CASE WHEN a.destinations = 1 THEN a.jid ELSE x.jid END AS recipient,
          (x.jid LIKE '%@lid' AND a.lid IS NULL) AS unresolved,
          coalesce(a.destinations > 1, false) AS "aliasConflict",
          k.destinations AS "keyDestinations", k.recipient AS "keyRecipient"
        FROM normalized_reactions x
        LEFT JOIN aliases a ON a.lid = x.jid
        LEFT JOIN key_chats k ON k."keyId" = x."targetKeyId"
      ), normalized_cold AS (
        SELECT m.id, m."keyId", m."chatJid", m."timestamp", m."status",
          replace(regexp_replace(m."chatJid", ':[0-9]+@', '@'), '@c.us', '@s.whatsapp.net') AS jid
        FROM "wa_messages" m
        WHERE m."sessionId" = ${sessionId} AND m."fromMe" = true AND m."isCold" = true
          AND m."timestamp" >= now() - (${windowDays} * interval '1 day')
      ), cold AS (
        SELECT m.*, CASE WHEN a.destinations = 1 THEN a.jid ELSE m.jid END AS recipient
        FROM normalized_cold m LEFT JOIN aliases a ON a.lid = m.jid
      ), mature AS (
        SELECT * FROM cold WHERE "timestamp" <= now() - interval '72 hours'
      ), responses AS MATERIALIZED (
        SELECT c.*, EXISTS (
          SELECT 1 FROM "wa_messages" r
          WHERE r."sessionId" = ${sessionId} AND r."fromMe" = false AND r."chatJid" = c."chatJid"
            AND r."timestamp" > c."timestamp"
            AND r."timestamp" <= c."timestamp" + interval '72 hours'
        ) OR EXISTS (
          SELECT 1 FROM reactions x
          WHERE (
            (x."targetKeyId" = c."keyId" AND (
              x.recipient = c.recipient OR
              (x.unresolved AND x."keyDestinations" = 1 AND x."keyRecipient" = c.recipient
                AND x."keyRecipient" ~ '^[0-9]+@(s[.]whatsapp[.]net|lid)$')
            )) OR (x.recipient = c.recipient AND x."timestamp" > c."timestamp")
          )
          AND (CASE WHEN x."createdAt" > c."timestamp"
                    THEN LEAST(x."timestamp", x."createdAt") ELSE x."timestamp" END)
            <= c."timestamp" + interval '72 hours'
        ) OR EXISTS (
          SELECT 1 FROM targets t JOIN reactions x ON x."targetKeyId" = t."keyId"
          WHERE t."fromMe" = true AND t.recipient = c.recipient
            AND t."timestamp" > c."timestamp"
            AND t."timestamp" <= c."timestamp" + interval '72 hours'
            AND (x.recipient = t.recipient OR
              (x.unresolved AND x."keyDestinations" = 1 AND x."keyRecipient" = t.recipient
                AND x."keyRecipient" ~ '^[0-9]+@(s[.]whatsapp[.]net|lid)$'))
            AND LEAST(x."timestamp", x."createdAt") <= c."timestamp" + interval '72 hours'
        ) AS responded FROM mature c
      ), classified AS (
        SELECT c.responded, NOT c.responded AND EXISTS (
          SELECT 1 FROM reactions x JOIN targets t ON t."keyId" = x."targetKeyId"
          WHERE (x."aliasConflict" OR (x.unresolved AND (x."keyDestinations" > 1
              OR x."keyRecipient" !~ '^[0-9]+@(s[.]whatsapp[.]net|lid)$')))
            AND t."fromMe" = true AND t.recipient = c.recipient
            AND (
              (t.id = c.id AND
                (CASE WHEN x."createdAt" > c."timestamp"
                      THEN LEAST(x."timestamp", x."createdAt") ELSE x."timestamp" END)
                  <= c."timestamp" + interval '72 hours')
              OR (t."timestamp" > c."timestamp"
                AND t."timestamp" <= c."timestamp" + interval '72 hours'
                AND LEAST(x."timestamp", x."createdAt") <= c."timestamp" + interval '72 hours')
            )
        ) AS ambiguous FROM responses c
      )
      SELECT
        (SELECT count(*)::int FROM cold) AS "coldTotal",
        (SELECT count(*)::int FROM mature) AS "coldMature",
        (SELECT count(*)::int FROM classified WHERE responded) AS "responded",
        (SELECT count(*)::int FROM classified WHERE ambiguous) AS "ambiguousMature",
        (SELECT count(*)::int FROM cold WHERE "status" IN ('delivered','read')) AS "delivered",
        (SELECT count(*)::int FROM cold WHERE "status" = 'read') AS "readCnt"
    `;
    const r = rows[0] ?? {
      coldTotal: 0,
      coldMature: 0,
      responded: 0,
      ambiguousMature: 0,
      delivered: 0,
      readCnt: 0,
    };

    const replyRate = r.coldMature > 0 ? r.responded / r.coldMature : 0;
    const deliveryRate = r.coldTotal > 0 ? r.delivered / r.coldTotal : 0;
    const readRate = r.coldTotal > 0 ? r.readCnt / r.coldTotal : 0;
    const sample = r.coldMature;
    // Score 0..100: reply-rate domina (0.6); leitura (0.25) e entrega (0.15) complementam. Tunável.
    const scoreSaude = Math.round(
      100 * (0.6 * replyRate + 0.25 * readRate + 0.15 * deliveryRate),
    );

    const data = {
      coldTotal: r.coldTotal,
      coldMature: r.coldMature,
      responded: r.responded,
      ambiguousMature: r.ambiguousMature,
      replyRate,
      sample,
      reliable: sample >= (await this.nmin()) && r.ambiguousMature === 0,
      deliveryRate,
      readRate,
      scoreSaude,
    };

    // ambiguousMature é diagnóstico calculado; sem coluna/migration nova.
    const persisted = {
      coldTotal: data.coldTotal,
      coldMature: data.coldMature,
      responded: data.responded,
      replyRate,
      sample,
      reliable: data.reliable,
      deliveryRate,
      readRate,
      scoreSaude,
    };
    const saved = await this.prisma.sessionMetric.upsert({
      where: { sessionId_windowDays: { sessionId, windowDays } },
      create: { id: newId(), sessionId, windowDays, ...persisted },
      update: { ...persisted, computedAt: new Date() },
    });

    return {
      sessionId,
      windowDays,
      ...data,
      computedAt: saved.computedAt.toISOString(),
    };
  }
}
