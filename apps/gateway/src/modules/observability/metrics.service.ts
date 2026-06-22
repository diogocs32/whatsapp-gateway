import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Gauge, Registry } from 'prom-client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { memoryStats } from '../../shared-kernel/memory';

// Exporta métricas no formato Prometheus (F7 — Observability, blueprint §14).
// Usa um Registry próprio (não o global) para não conflitar com nada.
@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();
  private sessions!: Gauge<string>;
  private messages!: Gauge<string>;

  constructor(private readonly prisma: PrismaService) {}

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
  }

  // Atualiza os gauges custom (consulta o banco) e devolve o dump Prometheus.
  async collect(): Promise<string> {
    await this.refresh();
    return this.registry.metrics();
  }

  // Resumo JSON para a UI (tela "Logs & saúde").
  async summary() {
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
    const mem = memoryStats();
    return {
      uptimeSeconds: Math.round(process.uptime()),
      rssBytes: mem.rssBytes,
      heapUsedBytes: mem.heapUsedBytes,
      heapUsedPct: mem.heapUsedPct,
      heapLimitBytes: mem.heapLimitBytes,
      memoryUsedPct: mem.memoryUsedPct,
      containerLimitBytes: mem.containerLimitBytes,
      sessions,
      messages: { out, in: inbound },
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
    const rows = await this.prisma.waSession.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    this.sessions.reset();
    for (const r of rows) {
      this.sessions.set({ status: r.status }, r._count._all);
    }

    const [out, inbound] = await Promise.all([
      this.prisma.waMessage.count({ where: { fromMe: true } }),
      this.prisma.waMessage.count({ where: { fromMe: false } }),
    ]);
    this.messages.set({ direction: 'out' }, out);
    this.messages.set({ direction: 'in' }, inbound);
  }
}
