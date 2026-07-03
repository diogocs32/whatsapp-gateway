import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;

// Item 13 (auditoria 07/2026) — retenção de dados: wa_messages (incluindo o proto `raw` em
// jsonb, a maior fatia), wa_session_events e wa_audit_logs cresciam para sempre — custo de disco,
// latência e risco de disco cheio. Varredura periódica com janelas configuráveis por env (0
// desliga a janela): o `raw` é zerado cedo (só serve para retry de descriptografia e depuração
// RECENTE) e as linhas antigas são removidas depois. Roda fora do caminho de request; erro só
// loga. Desligada nos e2e.
@Injectable()
export class RetentionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === 'test') return;
    const hours = Number(process.env.RETENTION_SWEEP_HOURS ?? 6);
    if (!Number.isFinite(hours) || hours <= 0) return;
    // Primeira varredura 2 min após o boot — não compete com a reidratação de sessões.
    const first = setTimeout(() => void this.sweep(), 2 * 60_000);
    first.unref();
    const timer = setInterval(() => void this.sweep(), hours * 60 * 60_000);
    timer.unref();
    this.logger.log(`Retenção de dados: varredura a cada ${hours}h`);
  }

  async sweep(): Promise<void> {
    await this.stripOldRaw();
    await this.purge('wa_messages', 'RETENTION_MESSAGES_DAYS', 90, (cut) =>
      this.prisma.waMessage.deleteMany({ where: { createdAt: { lt: cut } } }),
    );
    await this.purge('wa_session_events', 'RETENTION_EVENTS_DAYS', 30, (cut) =>
      this.prisma.waSessionEvent.deleteMany({
        where: { createdAt: { lt: cut } },
      }),
    );
    await this.purge('wa_audit_logs', 'RETENTION_AUDIT_DAYS', 180, (cut) =>
      this.prisma.waAuditLog.deleteMany({ where: { createdAt: { lt: cut } } }),
    );
  }

  private cutoff(envName: string, defDays: number): Date | null {
    const days = Number(process.env[envName] ?? defDays);
    if (!Number.isFinite(days) || days <= 0) return null;
    return new Date(Date.now() - days * DAY_MS);
  }

  // SQL cru de propósito: o updateMany do Prisma não filtra `raw IS NOT NULL` de forma limpa
  // (semântica DbNull/JsonNull) e reescreveria as MESMAS linhas já limpas a cada varredura.
  private async stripOldRaw(): Promise<void> {
    const cut = this.cutoff('RETENTION_MESSAGE_RAW_DAYS', 7);
    if (!cut) return;
    try {
      const n = await this.prisma.$executeRaw`
        UPDATE wa_messages SET raw = NULL
        WHERE "createdAt" < ${cut} AND raw IS NOT NULL`;
      if (n > 0) {
        this.logger.log(`retenção: raw zerado em ${n} mensagens antigas`);
      }
    } catch (e) {
      this.logger.error(`retenção (raw): ${(e as Error).message}`);
    }
  }

  private async purge(
    label: string,
    envName: string,
    defDays: number,
    del: (cut: Date) => Promise<{ count: number }>,
  ): Promise<void> {
    const cut = this.cutoff(envName, defDays);
    if (!cut) return;
    try {
      const { count } = await del(cut);
      if (count > 0) {
        this.logger.log(
          `retenção: ${count} linhas de ${label} removidas (${envName})`,
        );
      }
    } catch (e) {
      this.logger.error(`retenção (${label}): ${(e as Error).message}`);
    }
  }
}
