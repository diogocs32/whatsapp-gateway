import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Gauge, Registry } from 'prom-client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { memoryStats } from '../../shared-kernel/memory';
import { processErrorTotals } from '../../shared-kernel/process-errors';
import { disconnectTotals } from '../../shared-kernel/disconnect-stats';

// Contadores caros (groupBy de sessões + counts full-table de wa_messages) compartilhados entre o
// scrape do Prometheus e o summary da UI.
interface Counters {
  sessions: Record<string, number>;
  out: number;
  inbound: number;
}

// Exporta métricas no formato Prometheus (F7 — Observability, blueprint §14).
// Usa um Registry próprio (não o global) para não conflitar com nada.
@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();
  private readonly logger = new Logger(MetricsService.name);
  private sessions!: Gauge<string>;
  private messages!: Gauge<string>;
  private processErrors!: Gauge<string>;
  private disconnects!: Gauge<string>;

  // Item 16 (auditoria 07/2026): os counts de wa_messages são full-table e eram disparados a CADA
  // scrape do Prometheus e a CADA polling do dashboard (5s em 2 telas) — com a tabela crescendo,
  // vira gargalo permanente de Postgres. Cache curto no Redis (compartilhado entre os caminhos)
  // limita a 1 rodada de queries por TTL; se o Redis falhar, degrada para a query direta.
  private static readonly COUNTERS_TTL_S = 10;
  private static readonly COUNTERS_KEY = 'obs:counters';
  private countersInFlight: Promise<Counters> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    // Runtime: heap, event loop lag (p50/p90/p99), GC, CPU — nomes padrão nodejs_/process_.
    collectDefaultMetrics({ register: this.registry });

    this.sessions = new Gauge({
      name: 'wa_sessions',
      help: 'Sessões WhatsApp por status',
      labelNames: ['status'],
      registers: [this.registry],
    });
    this.messages = new Gauge({
      name: 'wa_messages',
      help: 'Total de mensagens persistidas por direção (in/out)',
      labelNames: ['direction'],
      registers: [this.registry],
    });
    // ABE-19/ABE-18: erros que o processo engoliu para não derrubar a frota (uncaughtException,
    // unhandledRejection, falha de escrita de audit) — total desde o boot, por tipo. Alarme aqui.
    this.processErrors = new Gauge({
      name: 'gateway_process_errors_total',
      help: 'Erros não-tratados/engolidos desde o boot, por tipo',
      labelNames: ['kind'],
      registers: [this.registry],
    });
    this.disconnects = new Gauge({
      name: 'wa_disconnects_total',
      help: 'Desconexões WhatsApp desde o boot, por engine e código',
      labelNames: ['engine', 'code'],
      registers: [this.registry],
    });
  }

  // Atualiza os gauges custom (consulta o banco) e devolve o dump Prometheus.
  async collect(): Promise<string> {
    await this.refresh();
    return this.registry.metrics();
  }

  // Resumo JSON para a UI (tela "Logs & saúde").
  async summary() {
    const c = await this.counters();
    const mem = memoryStats();
    return {
      uptimeSeconds: Math.round(process.uptime()),
      rssBytes: mem.rssBytes,
      heapUsedBytes: mem.heapUsedBytes,
      heapUsedPct: mem.heapUsedPct,
      heapLimitBytes: mem.heapLimitBytes,
      memoryUsedPct: mem.memoryUsedPct,
      containerLimitBytes: mem.containerLimitBytes,
      sessions: c.sessions,
      messages: { out: c.out, in: c.inbound },
    };
  }

  // Timeline de eventos de uma sessão (mais recentes primeiro).
  async timeline(sessionId: string, limit: number) {
    const rows = await this.prisma.waSessionEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      detail: r.detail,
      at: r.createdAt.toISOString(),
    }));
  }

  private async refresh(): Promise<void> {
    const c = await this.counters();
    this.sessions.reset();
    for (const [status, n] of Object.entries(c.sessions)) {
      this.sessions.set({ status }, n);
    }
    this.messages.set({ direction: 'out' }, c.out);
    this.messages.set({ direction: 'in' }, c.inbound);
    for (const [kind, n] of Object.entries(processErrorTotals())) {
      this.processErrors.set({ kind }, n);
    }
    for (const { engine, code, total } of disconnectTotals()) {
      this.disconnects.set({ engine, code }, total);
    }
  }

  private async counters(): Promise<Counters> {
    try {
      const cached = await this.redis.client.get(MetricsService.COUNTERS_KEY);
      if (cached) return JSON.parse(cached) as Counters;
    } catch {
      /* Redis fora: segue para a query direta */
    }
    // Dedup em memória: pollings simultâneos (Prometheus + 2 telas) não disparam 3 rodadas.
    if (this.countersInFlight) return this.countersInFlight;
    this.countersInFlight = (async () => {
      const rows = await this.prisma.waSession.groupBy({
        by: ['status'],
        _count: { _all: true },
      });
      const sessions: Record<string, number> = {};
      for (const r of rows) sessions[r.status] = r._count._all;
      const [out, inbound] = await Promise.all([
        this.prisma.waMessage.count({ where: { fromMe: true } }),
        this.prisma.waMessage.count({ where: { fromMe: false } }),
      ]);
      const counters: Counters = { sessions, out, inbound };
      try {
        await this.redis.client.setex(
          MetricsService.COUNTERS_KEY,
          MetricsService.COUNTERS_TTL_S,
          JSON.stringify(counters),
        );
      } catch (e) {
        this.logger.warn(`cache de contadores: ${(e as Error).message}`);
      }
      return counters;
    })().finally(() => {
      this.countersInFlight = null;
    });
    return this.countersInFlight;
  }
}
