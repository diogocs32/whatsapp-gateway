import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import type { Env } from '../../../bootstrap/config';
import type { MediaSendType } from '../../sessions/application/engine.port';
import { SessionManager } from '../../sessions/application/session-manager.service';
import { CampaignRepository } from './campaign.repository';

export interface CampaignJob {
  campaignId: string;
  recipientId: string;
}

const QUEUE_NAME = 'campaigns';
const PAUSE_REQUEUE_MS = 30_000;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchMedia(
  url: string,
  fallbackMime: string | null,
): Promise<{ buffer: Buffer; mime: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`mídia respondeu HTTP ${res.status}`);
  const mime =
    fallbackMime ||
    res.headers.get('content-type')?.split(';')[0] ||
    'application/octet-stream';
  return { buffer: Buffer.from(await res.arrayBuffer()), mime };
}

// Fila de disparo de campanhas (BullMQ) com anti-ban: cada destinatário é agendado com
// espaçamento aleatório (delay acumulado) + "digitando" antes do envio (humanização).
@Injectable()
export class CampaignQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CampaignQueue.name);
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly repo: CampaignRepository,
    private readonly manager: SessionManager,
  ) {}

  onModuleInit(): void {
    // Em testes não subimos a fila/worker (as conexões do BullMQ geram ruído no teardown
    // e nenhum job é enfileirado nos e2e).
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    const u = new URL(this.config.get('REDIS_URL', { infer: true }));
    const connection: ConnectionOptions = {
      host: u.hostname,
      port: Number(u.port) || 6379,
      maxRetriesPerRequest: null,
    };
    this.queue = new Queue(QUEUE_NAME, { connection });
    this.worker = new Worker(
      QUEUE_NAME,
      (job) => this.process(job.data as CampaignJob),
      { connection, concurrency: 4 },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.warn(
        `job de campanha ${(job?.data as CampaignJob | undefined)?.campaignId} falhou: ${err.message}`,
      ),
    );
  }

  enqueueSend(data: CampaignJob, delayMs: number): Promise<unknown> {
    if (!this.queue) return Promise.resolve(); // ambiente de teste (fila desativada)
    return this.queue.add('send', data, {
      delay: Math.max(0, Math.round(delayMs)),
      attempts: 1,
      removeOnComplete: 2000,
      removeOnFail: 2000,
    });
  }

  private async process(data: CampaignJob): Promise<void> {
    const c = await this.repo.findById(data.campaignId);
    if (!c || c.status === 'CANCELLED' || c.status === 'DONE') return;
    if (c.status === 'PAUSED') {
      // Pausada: re-agenda o job p/ checar de novo (retoma quando voltar a RUNNING).
      await this.queue.add('send', data, {
        delay: PAUSE_REQUEUE_MS,
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      });
      return;
    }
    // Cap (anti-ban): atingiu o limite → pausa a campanha.
    if (c.dailyCap != null && c.sentCount >= c.dailyCap) {
      await this.repo.updateStatus(c.id, 'PAUSED');
      return;
    }

    const r = await this.repo.findRecipient(data.recipientId);
    if (!r || r.status !== 'PENDING') return;

    try {
      if (c.typingPreview) {
        await this.manager
          .sendPresence(c.sessionId, r.to, 'composing')
          .catch(() => undefined);
        await sleep(randInt(800, 2500));
      }

      let keyId: string;
      if (c.messageType === 'text') {
        keyId = (await this.manager.sendText(c.sessionId, r.to, c.text ?? ''))
          .keyId;
      } else {
        if (!c.mediaUrl) throw new Error('campanha de mídia sem mediaUrl');
        const { buffer, mime } = await fetchMedia(c.mediaUrl, c.mediaMime);
        keyId = (
          await this.manager.sendMedia(c.sessionId, r.to, {
            buffer,
            type: c.messageType as MediaSendType,
            mimetype: mime,
            fileName: c.fileName,
            caption: c.text,
          })
        ).keyId;
      }

      if (c.typingPreview) {
        await this.manager
          .sendPresence(c.sessionId, r.to, 'paused')
          .catch(() => undefined);
      }
      await this.repo.markRecipientSent(r.id, keyId);
    } catch (e) {
      await this.repo.markRecipientFailed(r.id, (e as Error).message);
    }
    await this.repo.refreshCounts(c.id);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }
}
