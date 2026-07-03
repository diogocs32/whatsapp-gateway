import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type Redis from 'ioredis';
import type { DomainEvent } from '../../shared-kernel/domain-event';
import { EventBus } from '../../shared-kernel/event-bus/event-bus';
import { newId } from '../../shared-kernel/ulid';
import { RedisService } from './redis.service';

const CHANNEL = 'wa:events';

// Item 20 (auditoria 07/2026) — fan-out de eventos entre réplicas via Redis pub/sub. O EventBus é
// in-process; com 2+ réplicas, SSE e webhooks só enxergariam os eventos da própria réplica. A
// ponte: todo 'wa.event' local é publicado no canal Redis carimbado com o id desta instância;
// eventos de OUTRAS instâncias são re-emitidos localmente como 'wa.event.remote' (nunca os
// próprios — sem eco). Quem deve reagir a eventos de qualquer réplica assina os DOIS nomes
// (SSE, WebhookDispatcher — este com dedup por jobId); quem PERSISTE (mensagens, timeline)
// assina só o local: a réplica dona da sessão grava. Com 1 réplica é no-op de custo mínimo.
// Desligado nos e2e (os apps de teste compartilham o Redis e vazariam eventos entre specs) e
// via EVENT_FANOUT=off.
@Injectable()
export class EventFanout implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventFanout.name);
  private readonly instanceId = newId();
  private sub: Redis | null = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    if ((process.env.EVENT_FANOUT ?? 'on') === 'off') return;

    // Conexão dedicada: um client ioredis em modo subscribe não executa outros comandos.
    this.sub = this.redis.client.duplicate();
    this.sub.on('error', (e) =>
      this.logger.error(`fanout (sub): ${e.message}`),
    );
    await this.sub.subscribe(CHANNEL);
    this.sub.on('message', (_channel, msg) => this.onRemote(msg));

    this.eventBus.subscribe('wa.event', (e) => {
      void this.redis.client
        .publish(CHANNEL, JSON.stringify({ i: this.instanceId, e }))
        .catch((err) =>
          this.logger.warn(`fanout (pub): ${(err as Error).message}`),
        );
    });
    this.logger.log(`Fan-out de eventos ativo (instância ${this.instanceId})`);
  }

  private onRemote(msg: string): void {
    try {
      const { i, e } = JSON.parse(msg) as {
        i: string;
        e: DomainEvent & { occurredAt: string | Date };
      };
      if (i === this.instanceId) return; // nosso próprio publish (eco)
      this.eventBus.publish({
        name: 'wa.event.remote',
        occurredAt: new Date(e.occurredAt),
        payload: e.payload,
      });
    } catch (err) {
      this.logger.warn(`fanout (msg inválida): ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.sub?.quit();
    } catch {
      /* noop */
    }
  }
}
