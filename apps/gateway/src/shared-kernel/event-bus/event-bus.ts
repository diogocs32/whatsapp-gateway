import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import type { DomainEvent } from '../domain-event';

export type EventHandler = (event: DomainEvent) => void | Promise<void>;

// Barramento de eventos in-process. Em fase de sharding (F7) pode ganhar backend Redis pub/sub.
// captureRejections:true evita que um handler async rejeitado derrube o processo (Node v26 — blueprint §18.5).
@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private readonly emitter = new EventEmitter({ captureRejections: true });

  constructor() {
    this.emitter.setMaxListeners(0);
    this.emitter.on('error', (e) =>
      this.logger.error('Handler de evento rejeitou', e as Error),
    );
  }

  publish(event: DomainEvent): void {
    this.emitter.emit(event.name, event);
    this.emitter.emit('*', event);
  }

  subscribe(name: string, handler: EventHandler): void {
    this.emitter.on(name, handler);
  }

  unsubscribe(name: string, handler: EventHandler): void {
    this.emitter.off(name, handler);
  }

  subscribeAll(handler: EventHandler): void {
    this.emitter.on('*', handler);
  }
}
