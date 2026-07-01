import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { DomainEvent } from '../../shared-kernel/domain-event';
import { EventBus } from '../../shared-kernel/event-bus/event-bus';
import { newId } from '../../shared-kernel/ulid';
import { PrismaService, Prisma } from '../../infra/prisma/prisma.service';
import type {
  SessionStatePayload,
  WaEventEnvelope,
} from '../sessions/application/engine.port';

// Persiste as mudanças de status de sessão na timeline (F7 — Observability, blueprint §14):
// conexões, reconexões e erros. Desacoplado via EventBus (não acopla a engine).
@Injectable()
export class SessionEventLogger implements OnModuleInit {
  private readonly logger = new Logger(SessionEventLogger.name);

  constructor(
    private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe('wa.event', (e: DomainEvent) => {
      const env = e.payload as WaEventEnvelope;
      if (env.event !== 'session.status') return;
      const p = env.payload as SessionStatePayload;
      void this.prisma.waSessionEvent
        .create({
          data: {
            id: newId(),
            sessionId: env.sessionId,
            type: p.error ? 'error' : 'status',
            status: p.status,
            detail: p.error ?? null,
          },
        })
        .catch((err) => {
          // P2003 = violação de FK: a sessão-pai já foi removida e a engine emitiu um status
          // tardio. É esperado (não é falha real) — ignora em silêncio em vez de poluir o log.
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2003'
          ) {
            return;
          }
          this.logger.error(
            `falha ao persistir evento de timeline: ${(err as Error).message}`,
          );
        });
    });
  }
}
