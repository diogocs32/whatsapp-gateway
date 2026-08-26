import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../bootstrap/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { GuardrailService } from './guardrail.service';

interface StuckRow {
  sessionId: string;
  name: string;
  stuckMsgs: number;
  stuckChats: number;
}

// Detector de NÃO-ENTREGA (assinatura de restrição/ban do WhatsApp).
//
// Motivação (auditoria 08/2026): a engine wwebjs NÃO emite nenhum sinal explícito de restrição —
// quando a conta é limitada, as mensagens SAEM (o painel do celular mostra 1 tick) mas nunca
// recebem confirmação do servidor. O único jeito de detectar isso do lado de quem envia é o
// PADRÃO AGREGADO dos ACKs: muitos cold-sends para contatos DISTINTOS presos sem entrega por
// tempo demais, com a sessão CONECTADA. Uma conta saudável entrega ~100%.
//
// Por que agregado e não "1 tick isolado": 1 tick num contato só pode ser o celular dele
// desligado ou ele te bloqueou (a doc oficial do wwebjs não dá semântica a ack=-1 isolado). Só o
// padrão em ESCALA (≥N msgs, ≥M chats distintos, > X min) revela restrição — é exatamente o
// comportamento do erro 463 do WhatsApp ("bloqueia chats novos, preserva os existentes").
//
// Ação: chama GuardrailService.recordHardSignal(sessionId, 'restriction') — que já emite o evento
// OUT `signal.restriction` (catálogo do webhook / n8n) e, com GUARDRAIL_ENFORCE=true, coloca a
// sessão em quarentena (cold-sends passam a responder 423, protegendo a conta). Roda fora do
// caminho de request; erro só loga. Desligado nos e2e e quando UNDELIVERED_SWEEP_MIN=0.
@Injectable()
export class UndeliveredDetectorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UndeliveredDetectorService.name);
  private readonly sweepMin: number;
  private readonly stuckMin: number;
  private readonly minMsgs: number;
  private readonly minChats: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly guardrail: GuardrailService,
    config: ConfigService<Env, true>,
  ) {
    this.sweepMin = config.get('UNDELIVERED_SWEEP_MIN', { infer: true });
    this.stuckMin = config.get('UNDELIVERED_STUCK_MIN', { infer: true });
    this.minMsgs = config.get('UNDELIVERED_MIN_MSGS', { infer: true });
    this.minChats = config.get('UNDELIVERED_MIN_CHATS', { infer: true });
  }

  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === 'test') return;
    if (!Number.isFinite(this.sweepMin) || this.sweepMin <= 0) {
      this.logger.log('Detector de não-entrega: DESLIGADO (sweep=0)');
      return;
    }
    // Primeira varredura 3 min após o boot — não compete com a reidratação de sessões e dá tempo
    // de os ACKs das mensagens em voo chegarem antes do primeiro veredito.
    const first = setTimeout(() => void this.sweep(), 3 * 60_000);
    first.unref();
    const timer = setInterval(() => void this.sweep(), this.sweepMin * 60_000);
    timer.unref();
    this.logger.log(
      `Detector de não-entrega: a cada ${this.sweepMin}min ` +
        `(≥${this.minMsgs} msgs / ≥${this.minChats} chats presos >${this.stuckMin}min)`,
    );
  }

  // Uma única query agrupa os cold-sends "presos" (fromMe + isCold, sem entrega, mais velhos que
  // stuckMin) por sessão CONECTADA (status WORKING). O casting ::int evita BigInt no driver.
  async sweep(): Promise<StuckRow[]> {
    try {
      const rows = await this.prisma.$queryRaw<StuckRow[]>`
        SELECT
          m."sessionId"                             AS "sessionId",
          s."name"                                  AS "name",
          count(*)::int                             AS "stuckMsgs",
          count(DISTINCT m."chatJid")::int          AS "stuckChats"
        FROM "wa_messages" m
        JOIN "wa_sessions" s ON s."id" = m."sessionId"
        WHERE m."fromMe" = true
          AND m."isCold" = true
          AND (m."status" IS NULL OR m."status" = 'sent')
          AND m."timestamp" <= now() - (${this.stuckMin} * interval '1 minute')
          AND m."timestamp" >  now() - interval '24 hours'
          AND s."status" = 'WORKING'
        GROUP BY m."sessionId", s."name"
        HAVING count(*) >= ${this.minMsgs}
           AND count(DISTINCT m."chatJid") >= ${this.minChats}
      `;

      for (const r of rows) {
        this.logger.warn(
          `não-entrega em "${r.name}": ${r.stuckMsgs} cold-sends para ` +
            `${r.stuckChats} contatos presos há >${this.stuckMin}min — ` +
            `sinalizando restrição (recordHardSignal)`,
        );
        await this.guardrail.recordHardSignal(r.sessionId, 'restriction');
      }
      return rows;
    } catch (e) {
      this.logger.error(`detector de não-entrega: ${(e as Error).message}`);
      return [];
    }
  }
}
