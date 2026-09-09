import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../bootstrap/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { newId } from '../../shared-kernel/ulid';

// G4 — contabilidade/reply-rate por sessão. É a BASE do guard-rail (G5): mede quantos 1º-contatos
// (cold) foram respondidos, sem agir ainda (modo observação). Calculado sob demanda via SQL sobre
// wa_messages (fonte: isCold/source/status de G1-G3) e persistido como snapshot em SessionMetric.

export interface ReplyRateResult {
  sessionId: string;
  windowDays: number;
  coldTotal: number; // cold-sends na janela
  coldMature: number; // cold-sends já maduros (>72h) — denominador do replyRate (C2)
  responded: number; // cold maduros respondidos (inbound em até 72h)
  replyRate: number; // 0..1
  sample: number; // = coldMature
  reliable: boolean; // sample >= Nmin
  deliveryRate: number; // 0..1
  readRate: number; // 0..1
  scoreSaude: number; // 0..100
  computedAt: string;
}

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
    // ⚠️ C2: `mature` exclui cold-sends com menos de 72h (imaturos) — senão todo número novo cai
    // em falso-positivo de quarentena. `responded` casa um inbound (fromMe=false) no MESMO chat
    // dentro de 72h após o cold. count(*)::int evita BigInt no driver.
    const rows = await this.prisma.$queryRaw<RawRow[]>`
      WITH cold AS (
        SELECT m."chatJid", m."timestamp", m."status"
        FROM "wa_messages" m
        WHERE m."sessionId" = ${sessionId}
          AND m."fromMe" = true
          AND m."isCold" = true
          AND m."timestamp" >= now() - (${windowDays} * interval '1 day')
      ),
      mature AS (
        SELECT * FROM cold WHERE "timestamp" <= now() - interval '72 hours'
      )
      SELECT
        (SELECT count(*)::int FROM cold)   AS "coldTotal",
        (SELECT count(*)::int FROM mature) AS "coldMature",
        (SELECT count(*)::int FROM mature c WHERE EXISTS (
            SELECT 1 FROM "wa_messages" r
            WHERE r."sessionId" = ${sessionId}
              AND r."fromMe" = false
              AND r."chatJid" = c."chatJid"
              AND r."timestamp" >  c."timestamp"
              AND r."timestamp" <= c."timestamp" + interval '72 hours'
        )) AS "responded",
        (SELECT count(*)::int FROM cold WHERE "status" IN ('delivered','read')) AS "delivered",
        (SELECT count(*)::int FROM cold WHERE "status" = 'read') AS "readCnt"
    `;
    const r = rows[0] ?? {
      coldTotal: 0,
      coldMature: 0,
      responded: 0,
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
      replyRate,
      sample,
      reliable: sample >= (await this.nmin()),
      deliveryRate,
      readRate,
      scoreSaude,
    };

    const saved = await this.prisma.sessionMetric.upsert({
      where: { sessionId_windowDays: { sessionId, windowDays } },
      create: { id: newId(), sessionId, windowDays, ...data },
      update: { ...data, computedAt: new Date() },
    });

    return {
      sessionId,
      windowDays,
      ...data,
      computedAt: saved.computedAt.toISOString(),
    };
  }
}
