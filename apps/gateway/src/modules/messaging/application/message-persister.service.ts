import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { DomainEvent } from '../../../shared-kernel/domain-event';
import { EventBus } from '../../../shared-kernel/event-bus/event-bus';
import type {
  MessageAckPayload,
  MessagePayload,
  WaEventEnvelope,
} from '../../sessions/application/engine.port';
import {
  MESSAGE_REPOSITORY,
  type MessageRepository,
} from '../domain/message.repository';

// Assina o EventBus e persiste mensagens (entrada e saída). Desacopla a engine da persistência.
@Injectable()
export class MessagePersister implements OnModuleInit {
  private readonly logger = new Logger(MessagePersister.name);

  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repo: MessageRepository,
    private readonly eventBus: EventBus,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe('wa.event', (e: DomainEvent) => {
      const env = e.payload as WaEventEnvelope;
      // G3: ACK de entrega/leitura → atualiza o último status da mensagem (sem regredir).
      if (env.event === 'message.ack') {
        const a = env.payload as MessageAckPayload;
        void this.repo
          .updateStatusByKey(env.sessionId, a.keyId, a.status)
          .catch((err) =>
            this.logger.error(
              `falha ao atualizar status (ack): ${(err as Error).message}`,
            ),
          );
        return;
      }
      if (env.event !== 'message') return;
      const p = env.payload as MessagePayload;
      void this.repo
        .save({
          sessionId: env.sessionId,
          keyId: p.keyId,
          chatJid: p.chatJid,
          senderJid: p.senderJid,
          fromMe: p.fromMe,
          type: p.type,
          text: p.text,
          isCold: p.isCold ?? false,
          idempotencyKey: p.idempotencyKey ?? null,
          source: p.source ?? null,
          timestamp: new Date(p.timestamp * 1000),
          mediaType: p.mediaType,
          mimetype: p.mimetype,
          fileName: p.fileName,
          mediaKey: p.mediaKey,
          fileSize: p.fileSize,
          isForwarded: p.isForwarded ?? false,
          forwardingScore: p.forwardingScore ?? null,
          raw: p.raw,
        })
        .catch((err) =>
          this.logger.error(
            `falha ao persistir mensagem: ${(err as Error).message}`,
          ),
        );
    });
  }
}
