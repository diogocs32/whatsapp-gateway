import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../bootstrap/config';
import { PrismaService } from '../../infra/prisma/prisma.service';

interface StuckRow {
  sessionId: string;
  name: string;
  stuckMsgs: number;
  stuckChats: number;
}

// Observador de NÃO-ENTREGA para WWEBJS, desligado por padrão.
//
// ACK atrasado, mesmo em vários chats, é indício inconclusivo. Esta consulta não chama
// recordHardSignal: na versão atual ele aplicaria `banida` (sticky) com enforce ligado.
// Somente registra candidatos para investigação; nenhum webhook, pausa ou bloqueio.
@Injectable()
export class UndeliveredDetectorService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(UndeliveredDetectorService.name);
  private readonly sweepMin: number;
  private readonly stuckMin: number;
  private readonly minMsgs: number;
  private readonly minChats: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
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
    // Primeiro ciclo após a reidratação. Reagendar só ao terminar evita varreduras sobrepostas.
    this.timer = setTimeout(() => void this.runScheduled(), 3 * 60_000);
    this.timer.unref();
    this.logger.log(
      `Observador de não-entrega WWEBJS: intervalo ${this.sweepMin}min ` +
        `(≥${this.minMsgs} msgs / ≥${this.minChats} chats sem entrega >${this.stuckMin}min)`,
    );
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private async runScheduled(): Promise<void> {
    await this.sweep();
    if (this.stopped) return;
    this.timer = setTimeout(
      () => void this.runScheduled(),
      this.sweepMin * 60_000,
    );
    this.timer.unref();
  }

  // Uma query agrupa cold-sends WWEBJS sem confirmação por sessão WORKING. O casting ::int
  // evita BigInt no driver. Sem gravar estado: uma consulta não confirma ban/restrição.
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
          AND s."engine" = 'WWEBJS'
        GROUP BY m."sessionId", s."name"
        HAVING count(*) >= ${this.minMsgs}
           AND count(DISTINCT m."chatJid") >= ${this.minChats}
      `;

      for (const r of rows) {
        this.logger.warn(
          `não-entrega observada em "${r.name}": ${r.stuckMsgs} cold-sends para ` +
            `${r.stuckChats} chats sem confirmação há >${this.stuckMin}min; ` +
            'indício inconclusivo, sem alteração de estado',
        );
      }
      return rows;
    } catch (e) {
      this.logger.error(`detector de não-entrega: ${(e as Error).message}`);
      return [];
    }
  }
}
