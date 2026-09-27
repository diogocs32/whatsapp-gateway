import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import type { Env } from '../../../bootstrap/config';
import { redisConnection } from '../../../infra/redis/redis-connection';
import {
  egressPolicyFromEnv,
  safeFetch,
} from '../../../shared-kernel/safe-fetch';
import { GuardrailService } from '../../guardrail/guardrail.service';
import { SessionQuarantinedException } from '../../guardrail/session-quarantined.exception';
import { LeaseLostError } from '../../sessions/application/session-lease.error';
import type { MediaSendType } from '../../sessions/application/engine.port';
import {
  SessionBusyError,
  SessionManager,
} from '../../sessions/application/session-manager.service';
import { CampaignRepository } from './campaign.repository';

export interface CampaignJob {
  campaignId: string;
  recipientId: string;
}

const QUEUE_NAME = 'campaigns';
const PAUSE_REQUEUE_MS = 30_000;
// ABE-04: reserva do destinatário considerada "em voo" por este tempo; acima disto, o worker que
// reservou é dado como morto e outro pode retomar (até o teto de tentativas do repositório).
const RESERVATION_STALE_MS = 10 * 60_000;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ABE-06/07: download com política de egress (sem rede privada/metadata, redirect validado) e
// corpo lido em FLUXO com teto MEDIA_MAX_BYTES — antes o content-length era checado mas o
// arrayBuffer() ainda alocava o corpo inteiro quando o header faltava/mentia.
async function fetchMedia(
  url: string,
  fallbackMime: string | null,
  maxBytes: number,
): Promise<{ buffer: Buffer; mime: string }> {
  const res = await safeFetch(url, {
    policy: egressPolicyFromEnv(),
    maxBytes,
    timeoutMs: 20_000,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`mídia respondeu HTTP ${res.status}`);
  }
  const mime =
    fallbackMime ||
    res.headers.get('content-type')?.split(';')[0] ||
    'application/octet-stream';
  return { buffer: res.body, mime };
}

// Fila de disparo de campanhas (BullMQ) com anti-ban: cada destinatário é agendado com
// espaçamento aleatório (delay acumulado) + "digitando" antes do envio (humanização).
//
// Auditoria 09/2026 (ABE-02/04/05): a campanha passa pelo MESMO gate de 1º contato do endpoint
// de mensagens (firstContact → canSendCold), o destinatário é reservado atomicamente (1 worker),
// o teto diário é por dia local e serializado, a pausa é revalidada imediatamente antes do
// efeito e cada envio leva idempotencyKey determinística (retry não duplica).
@Injectable()
export class CampaignQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CampaignQueue.name);
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly repo: CampaignRepository,
    private readonly manager: SessionManager,
    private readonly guardrail: GuardrailService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Em testes não subimos a fila/worker (as conexões do BullMQ geram ruído no teardown
    // e nenhum job é enfileirado nos e2e).
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    const connection: ConnectionOptions = redisConnection(this.config);
    this.queue = new Queue(QUEUE_NAME, { connection });
    // Handshake concluído antes de seguir (mesma razão do WebhookQueue — item 22).
    await this.queue.waitUntilReady();
    this.worker = new Worker(
      QUEUE_NAME,
      (job) => this.process(job.data as CampaignJob),
      { connection, concurrency: 4 },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.warn(
        `job de campanha ${(job?.data as CampaignJob | undefined)?.campaignId} (job ${job?.id}, tentativa ${job?.attemptsMade}) falhou: ${err.message}`,
      ),
    );
    // Sem listener de 'error' o BullMQ despeja no console.error (fora do formato) — e um erro de
    // conexão/lock do worker passaria batido.
    this.worker.on('error', (err) =>
      this.logger.error(
        `worker da fila de campanhas: ${err.message}`,
        err.stack,
      ),
    );
    this.queue.on('error', (err) =>
      this.logger.error(`fila de campanhas: ${err.message}`, err.stack),
    );
  }

  // jobId determinístico (sem `:` — o BullMQ rejeita) dedupa o agendamento entre starts
  // concorrentes/réplicas; requeues de pausa/cap vão sem id (o job atual completa).
  enqueueSend(
    data: CampaignJob,
    delayMs: number,
    jobId?: string,
  ): Promise<unknown> {
    if (!this.queue) return Promise.resolve(); // ambiente de teste (fila desativada)
    return this.queue.add('send', data, {
      delay: Math.max(0, Math.round(delayMs)),
      attempts: 1,
      removeOnComplete: 2000,
      removeOnFail: 2000,
      ...(jobId ? { jobId } : {}),
    });
  }

  private async requeue(
    data: CampaignJob,
    delayMs = PAUSE_REQUEUE_MS,
  ): Promise<void> {
    await this.queue.add('send', data, {
      delay: delayMs,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  private async process(data: CampaignJob): Promise<void> {
    const c = await this.repo.findById(data.campaignId);
    if (!c || c.status === 'CANCELLED' || c.status === 'DONE') return;
    if (c.status === 'PAUSED') {
      // Pausada: re-agenda o job p/ checar de novo (retoma quando voltar a RUNNING).
      await this.requeue(data);
      return;
    }
    const messageGate = await this.guardrail.canSendMessage(c.sessionId);
    if (!messageGate.allowed) {
      // Não muda a campanha para PAUSED: esse estado exigiria /resume manual. O job espera e
      // reconsulta o banco; depois de restrictionUntil ele volta sozinho, inclusive após restart.
      await this.requeue(
        data,
        Math.min(
          60 * 60_000,
          Math.max(
            PAUSE_REQUEUE_MS,
            (messageGate.until?.getTime() ?? 0) - Date.now(),
          ),
        ),
      );
      return;
    }
    // ABE-02: campanha de 1º contato respeita o guard-rail (quarentena/pausa manual) — antes
    // passava por fora do gate que o endpoint /messages aplica a `cold:true`.
    if (c.firstContact) {
      const gate = await this.guardrail.canSendCold(c.sessionId);
      if (!gate.allowed) {
        if (gate.until) {
          await this.requeue(data);
          return;
        }
        this.logger.warn(
          `campanha ${c.id} pausada pelo guard-rail (${gate.state}${gate.reason ? `: ${gate.reason}` : ''})`,
        );
        await this.repo.updateStatus(c.id, 'PAUSED');
        await this.requeue(data);
        return;
      }
    }
    // ABE-04/05: reserva atômica do destinatário + teto diário (dia local, serializado).
    const reservation = await this.repo.reserveRecipient(
      c.id,
      data.recipientId,
      { dailyCap: c.dailyCap, staleMs: RESERVATION_STALE_MS },
    );
    if (reservation.kind === 'cap') {
      this.logger.log(
        `campanha ${c.id}: teto diário (${c.dailyCap}) atingido — pausada; retoma no próximo dia local ou com /resume`,
      );
      await this.repo.updateStatus(c.id, 'PAUSED');
      await this.requeue(data); // o job NÃO some: continua checando (ABE-05)
      return;
    }
    if (reservation.kind !== 'reserved') return;
    const r = reservation.recipient;

    try {
      if (c.typingPreview) {
        await this.manager
          .sendPresence(c.sessionId, r.to, 'composing')
          .catch((e) =>
            this.logger.debug(
              `presence composing (${c.id} → ${r.to}): ${(e as Error).message}`,
            ),
          );
        await sleep(randInt(800, 2500));
      }

      // Revalida pausa/cancelamento IMEDIATAMENTE antes do efeito (a pausa durante o
      // "digitando" precisa valer) — ABE-04.
      const fresh = await this.repo.findById(c.id);
      if (!fresh || fresh.status !== 'RUNNING') {
        await this.repo.releaseRecipient(r.id);
        if (fresh?.status === 'PAUSED') await this.requeue(data);
        return;
      }

      // idempotencyKey determinística: um retry/stall do BullMQ não gera 2ª mensagem.
      const opts = {
        cold: c.firstContact,
        idempotencyKey: `campaign-${c.id}-${r.id}`,
      };
      let keyId: string;
      if (c.messageType === 'text') {
        keyId = (
          await this.manager.sendText(c.sessionId, r.to, c.text ?? '', opts)
        ).keyId;
      } else {
        if (!c.mediaUrl) throw new Error('campanha de mídia sem mediaUrl');
        const { buffer, mime } = await fetchMedia(
          c.mediaUrl,
          c.mediaMime,
          this.config.get('MEDIA_MAX_BYTES', { infer: true }),
        );
        keyId = (
          await this.manager.sendMedia(c.sessionId, r.to, {
            buffer,
            type: c.messageType as MediaSendType,
            mimetype: mime,
            fileName: c.fileName,
            caption: c.text,
            ...opts,
          })
        ).keyId;
      }

      if (c.typingPreview) {
        await this.manager
          .sendPresence(c.sessionId, r.to, 'paused')
          .catch((e) =>
            this.logger.debug(
              `presence paused (${c.id} → ${r.to}): ${(e as Error).message}`,
            ),
          );
      }
      await this.repo.markRecipientSent(r.id, keyId);
    } catch (e) {
      if (
        e instanceof SessionQuarantinedException ||
        e instanceof LeaseLostError ||
        e instanceof SessionBusyError
      ) {
        // O Worker também roda na réplica sem lease durante start-first. Não transformar uma
        // disputa transitória de posse em FAILED definitivo para o destinatário.
        await this.repo.releaseRecipient(r.id);
        await this.requeue(data);
        return;
      }
      await this.repo.markRecipientFailed(r.id, (e as Error).message);
    }
    await this.repo.refreshCounts(c.id);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker
      ?.close()
      .catch((e) =>
        this.logger.warn(
          `fechamento do worker de campanhas: ${(e as Error).message}`,
        ),
      );
    await this.queue
      ?.close()
      .catch((e) =>
        this.logger.warn(
          `fechamento da fila de campanhas: ${(e as Error).message}`,
        ),
      );
  }
}
