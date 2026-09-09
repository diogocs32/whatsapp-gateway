import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaService } from '../../../infra/prisma/prisma.service';
import { newId } from '../../../shared-kernel/ulid';
import {
  decideOnExistingIntent,
  PENDING_INTENT_TTL_MS,
} from './send-intent.decision';

export type ReserveResult =
  | { kind: 'reserved'; intentId: string }
  | { kind: 'replay'; keyId: string; chatJid: string };

// ABE-03 (auditoria 09/2026) — reserva DURÁVEL da intenção de envio antes do transporte.
// Fluxo: reserve() (create atômico; P2002 → decisão sobre a linha existente) → envio →
// complete()/fail(). Duas requisições concorrentes com a mesma key: uma reserva, a outra recebe
// 409 "em andamento" (ou o replay, se a primeira já concluiu). Key reutilizada com payload
// diferente → 409 conflito. Processo que cai no meio deixa `pending` antigo → a próxima chamada
// assume (takeover) em vez de ficar travada para sempre. O unique de wa_messages continua como
// 2ª camada.
@Injectable()
export class SendIntentService {
  private readonly logger = new Logger(SendIntentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async reserve(
    sessionId: string,
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<ReserveResult> {
    const id = newId();
    try {
      await this.prisma.sendIntent.create({
        data: { id, sessionId, idempotencyKey, fingerprint },
      });
      return { kind: 'reserved', intentId: id };
    } catch (e) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        e.code !== 'P2002'
      ) {
        throw e;
      }
    }
    const existing = await this.prisma.sendIntent.findUnique({
      where: { sessionId_idempotencyKey: { sessionId, idempotencyKey } },
    });
    if (!existing) {
      // Corrida rara: a linha sumiu entre o P2002 e a leitura (retenção). Tenta de novo uma vez.
      return this.reserve(sessionId, idempotencyKey, fingerprint);
    }
    const decision = decideOnExistingIntent(existing, fingerprint);
    switch (decision.kind) {
      case 'replay':
        return decision;
      case 'conflict':
        throw new ConflictException(
          'idempotencyKey já usada nesta sessão com outro destinatário/conteúdo — use uma chave nova',
        );
      case 'in-flight':
        throw new ConflictException(
          'envio com esta idempotencyKey em andamento — aguarde a resposta anterior ou retente em instantes',
        );
      case 'takeover': {
        // Só UMA chamada assume (WHERE status/updatedAt iguais aos lidos): a outra leva 409.
        const won = await this.prisma.sendIntent.updateMany({
          where: {
            id: existing.id,
            status: existing.status,
            updatedAt: existing.updatedAt,
          },
          data: {
            status: 'pending',
            error: null,
            attempts: { increment: 1 },
          },
        });
        if (won.count !== 1) {
          throw new ConflictException(
            'envio com esta idempotencyKey em andamento — retente em instantes',
          );
        }
        return { kind: 'reserved', intentId: existing.id };
      }
    }
  }

  async complete(
    intentId: string,
    keyId: string,
    chatJid: string,
  ): Promise<void> {
    await this.prisma.sendIntent
      .update({
        where: { id: intentId },
        data: { status: 'sent', keyId, chatJid, error: null },
      })
      .catch((e: Error) =>
        this.logger.warn(
          `falha ao concluir intenção ${intentId}: ${e.message}`,
        ),
      );
  }

  async fail(intentId: string, error: string): Promise<void> {
    await this.prisma.sendIntent
      .update({
        where: { id: intentId },
        data: { status: 'failed', error: error.slice(0, 500) },
      })
      .catch((e: Error) =>
        this.logger.warn(
          `falha ao registrar falha da intenção ${intentId}: ${e.message}`,
        ),
      );
  }

  // Exposto para diagnóstico/testes.
  static readonly PENDING_TTL_MS = PENDING_INTENT_TTL_MS;
}
