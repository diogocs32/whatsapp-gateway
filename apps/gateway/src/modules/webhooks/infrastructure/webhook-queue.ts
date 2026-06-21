import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { createHmac } from 'node:crypto';
import type { Env } from '../../../bootstrap/config';

export interface WebhookJob {
  webhookId: string;
  url: string;
  secret: string | null;
  headers: Record<string, string> | null;
  body: unknown;
}

const QUEUE_NAME = 'webhooks';

// Fila de entrega de webhooks (BullMQ): HMAC SHA-512 + retries com backoff exponencial.
@Injectable()
export class WebhookQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookQueue.name);
  private queue!: Queue;
  private worker!: Worker;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit(): void {
    const u = new URL(this.config.get('REDIS_URL', { infer: true }));
    // Passamos OPÇÕES (não uma instância) — o BullMQ usa o ioredis dele, evitando conflito de tipos.
    const connection: ConnectionOptions = {
      host: u.hostname,
      port: Number(u.port) || 6379,
      maxRetriesPerRequest: null,
    };
    this.queue = new Queue(QUEUE_NAME, { connection });
    this.worker = new Worker(
      QUEUE_NAME,
      (job) => this.deliver(job.data as WebhookJob),
      {
        connection,
      },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.warn(
        `webhook ${(job?.data as WebhookJob | undefined)?.webhookId} falhou (tentativa ${job?.attemptsMade}): ${err.message}`,
      ),
    );
  }

  async enqueue(data: WebhookJob, attempts: number): Promise<void> {
    await this.queue.add('deliver', data, {
      attempts: Math.max(1, attempts),
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
  }

  private async deliver(data: WebhookJob): Promise<void> {
    const payload = JSON.stringify(data.body);
    const signature = data.secret
      ? createHmac('sha512', data.secret).update(payload).digest('hex')
      : undefined;

    const res = await fetch(data.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(signature ? { 'x-webhook-signature': `sha512=${signature}` } : {}),
        ...(data.headers ?? {}),
      },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`destino respondeu HTTP ${res.status}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }
}
