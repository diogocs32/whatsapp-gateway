import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { DomainEvent } from '../../../shared-kernel/domain-event';
import { EventBus } from '../../../shared-kernel/event-bus/event-bus';
import type { WaEventEnvelope } from '../../sessions/application/engine.port';
import type { Webhook } from '../domain/webhook.entity';
import {
  WEBHOOK_REPOSITORY,
  type WebhookRepository,
} from '../domain/webhook.repository';
import { WebhookQueue } from '../infrastructure/webhook-queue';

// Remove o campo interno `raw` do payload (proto de persistência) antes de despachar p/ terceiros.
function stripRaw(payload: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...payload };
  delete rest.raw;
  return rest;
}

// Assina o EventBus, casa eventos com webhooks (sessão + tipo) e enfileira a entrega.
@Injectable()
export class WebhookDispatcher implements OnModuleInit {
  private readonly logger = new Logger(WebhookDispatcher.name);
  private webhooks: Webhook[] = [];

  constructor(
    @Inject(WEBHOOK_REPOSITORY) private readonly repo: WebhookRepository,
    private readonly eventBus: EventBus,
    private readonly queue: WebhookQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refresh();
    const onEvent = (e: DomainEvent) =>
      this.handle(e.payload as WaEventEnvelope);
    this.eventBus.subscribe('wa.event', onEvent);
    // Item 20: eventos de OUTRAS réplicas (fan-out Redis) também disparam webhooks — o jobId
    // determinístico (envelope.id + webhook.id) dedupa quando 2+ réplicas enfileiram o mesmo.
    this.eventBus.subscribe('wa.event.remote', onEvent);
  }

  // Recarrega o cache de webhooks (chamado no boot e após CRUD).
  async refresh(): Promise<void> {
    this.webhooks = await this.repo.listEnabled();
  }

  private handle(env: WaEventEnvelope): void {
    // `raw` (proto.IMessage codificado em BufferJSON) é detalhe interno de persistência/retry.
    // NÃO vaza no webhook externo — manteria um blob `{type:'Buffer'}` feio no contrato do cliente.
    const body =
      env.event === 'message' &&
      env.payload &&
      typeof env.payload === 'object' &&
      'raw' in env.payload
        ? { ...env, payload: stripRaw(env.payload as Record<string, unknown>) }
        : env;
    for (const w of this.webhooks) {
      // global (sessionId null) ou específico da sessão (por id ou nome)
      if (
        w.sessionId &&
        w.sessionId !== env.sessionId &&
        w.sessionId !== env.session
      ) {
        continue;
      }
      if (!w.events.includes('*') && !w.events.includes(env.event)) continue;
      void this.queue
        .enqueue(
          {
            webhookId: w.id,
            url: w.url,
            secret: w.secret,
            headers: w.headers,
            body,
          },
          w.maxAttempts,
          // Dedup multi-réplica (item 20): o id do envelope é único por evento.
          `${env.id}:${w.id}`,
        )
        .catch((e) =>
          this.logger.error(`enqueue webhook: ${(e as Error).message}`),
        );
    }
  }
}
