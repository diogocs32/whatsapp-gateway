import { Controller, MessageEvent, Req, Sse, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import type { DomainEvent } from '../../../shared-kernel/domain-event';
import { EventBus } from '../../../shared-kernel/event-bus/event-bus';
import type { WaEventEnvelope } from '../../sessions/application/engine.port';
import { SseAuthGuard } from './sse-auth.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventBus: EventBus) {}

  // Stream SSE de todos os eventos (filtrável por ?session=nome|id). Event Monitor (blueprint §14).
  @UseGuards(SseAuthGuard)
  @Sse('stream')
  stream(@Req() req: FastifyRequest): Observable<MessageEvent> {
    const filter = (req.query as { session?: string })?.session;
    return new Observable<MessageEvent>((subscriber) => {
      const handler = (e: DomainEvent) => {
        const env = e.payload as WaEventEnvelope;
        if (filter && env.session !== filter && env.sessionId !== filter)
          return;
        // `raw` (proto.IMessage p/ persistência/retry) não vai no stream — só bloataria o SSE.
        let data: unknown = env;
        if (
          env.payload &&
          typeof env.payload === 'object' &&
          'raw' in env.payload
        ) {
          const payload = { ...(env.payload as Record<string, unknown>) };
          delete payload.raw;
          data = { ...env, payload };
        }
        subscriber.next({ data } as MessageEvent);
      };
      this.eventBus.subscribe('wa.event', handler);
      // Item 20: eventos de OUTRAS réplicas (via fan-out Redis) — o Monitor vê tudo,
      // independente de qual réplica hospeda a sessão.
      this.eventBus.subscribe('wa.event.remote', handler);
      return () => {
        this.eventBus.unsubscribe('wa.event', handler);
        this.eventBus.unsubscribe('wa.event.remote', handler);
      };
    });
  }
}
