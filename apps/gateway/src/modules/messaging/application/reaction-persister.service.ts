import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { DomainEvent } from '../../../shared-kernel/domain-event';
import { EventBus } from '../../../shared-kernel/event-bus/event-bus';
import type {
  ReactionPayload,
  WaEventEnvelope,
} from '../../sessions/application/engine.port';
import {
  REACTION_REPOSITORY,
  type ReactionRepository,
} from '../domain/reaction.repository';
import { toReactionInput } from './reaction-key';

// P-066 (E22) — assina o EventBus e grava as reações (evento `message.reaction`, as 2 engines) em
// wa_message_reactions: emoji novo substitui, emoji '' remove (lápide). Mesmo padrão do
// MessagePersister: só a réplica dona da sessão persiste ('wa.event'; o fan-out remoto chega como
// 'wa.event.remote' e não passa aqui). Erro só loga — o webhook sai de qualquer jeito.
@Injectable()
export class ReactionPersister implements OnModuleInit {
  private readonly logger = new Logger(ReactionPersister.name);

  constructor(
    @Inject(REACTION_REPOSITORY) private readonly repo: ReactionRepository,
    private readonly eventBus: EventBus,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe('wa.event', (e: DomainEvent) => {
      const env = e.payload as WaEventEnvelope;
      if (env.event !== 'message.reaction') return;
      const input = toReactionInput(
        env.sessionId,
        env.payload as ReactionPayload,
      );
      if (!input) return;
      void this.repo
        .upsert(input)
        .catch((err) =>
          this.logger.error(
            `falha ao gravar reação (${env.sessionId}): ${(err as Error).message}`,
          ),
        );
    });
  }
}
