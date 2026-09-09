import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Queue,
  UnrecoverableError,
  Worker,
  type ConnectionOptions,
} from 'bullmq';
import { createHmac } from 'node:crypto';
import type { Env } from '../../../bootstrap/config';
import { PrismaService, Prisma } from '../../../infra/prisma/prisma.service';
import { redisConnection } from '../../../infra/redis/redis-connection';
import {
  assertEgressAllowed,
  EgressBlockedError,
  egressPolicyFromEnv,
  parseEgressUrl,
} from '../../../shared-kernel/safe-fetch';
import { newId } from '../../../shared-kernel/ulid';

export interface WebhookJob {
  webhookId: string;
  url: string;
  secret: string | null;
  headers: Record<string, string> | null;
  body: unknown;
}

// Nome do evento do envelope (só para o log) — o body é opaco para a fila.
function eventOf(data: WebhookJob | undefined): string {
  const ev = (data?.body as { event?: unknown } | undefined)?.event;
  return typeof ev === 'string' ? ev : '?';
}

const QUEUE_NAME = 'webhooks';

// Headers que o integrador NÃO pode sobrescrever nos headers customizados do webhook (auditoria
// 09/2026, ABE-14): antes `...(data.headers)` vinha por último e podia trocar Content-Type ou a
// própria assinatura HMAC — o consumidor validaria um envelope adulterado sem perceber.
const RESERVED_HEADERS = new Set([
  'content-type',
  'content-length',
  'host',
  'transfer-encoding',
  'connection',
  'x-webhook-signature',
]);

export function safeCustomHeaders(
  headers: Record<string, string> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers ?? {})) {
    if (RESERVED_HEADERS.has(k.toLowerCase())) continue;
    out[k] = v;
  }
  return out;
}

// Fila de entrega de webhooks (BullMQ): HMAC SHA-512 + retries com backoff exponencial.
@Injectable()
export class WebhookQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookQueue.name);
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Conexão (URL ou partes, com senha) via helper compartilhado. Passamos OPÇÕES (não instância):
    // o BullMQ usa o ioredis dele, evitando conflito de tipos.
    const connection: ConnectionOptions = redisConnection(this.config);
    this.queue = new Queue(QUEUE_NAME, { connection });
    // Aguarda o handshake do ioredis INTERNO do BullMQ concluir (item 22 da auditoria 07/2026):
    // sem isto, o teardown rápido dos e2e (um app sobe/derruba por spec) fechava o socket com o
    // handshake em voo → unhandled "Connection is closed." dentro do BullMQ (flake intermitente
    // no sumário do vitest). Em produção é um await de milissegundos no boot.
    await this.queue.waitUntilReady();
    this.queue.on('error', (err) =>
      this.logger.error(`fila de webhooks: ${err.message}`, err.stack),
    );
    // Em testes (NODE_ENV=test) NÃO subimos o Worker: ele abre uma conexão bloqueante no Redis que
    // rejeita "Connection is closed" no teardown rápido do app (sobe/derruba a cada spec). O enqueue
    // (Queue) continua funcionando; só não processamos a entrega assíncrona.
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    this.worker = new Worker(
      QUEUE_NAME,
      (job) => this.deliver(job.data as WebhookJob),
      {
        connection,
        // Entregas em paralelo (I/O puro): sem isto o default do BullMQ é 1 e um endpoint lento
        // (até 10s de timeout) segura TODAS as entregas da fila (head-of-line blocking).
        concurrency: this.config.get('WEBHOOK_CONCURRENCY', { infer: true }),
      },
    );
    // Sem listener de 'error' o BullMQ despeja no console.error (fora do formato) — e um erro de
    // conexão/lock do worker passaria batido.
    this.worker.on('error', (err) =>
      this.logger.error(
        `worker da fila de webhooks: ${err.message}`,
        err.stack,
      ),
    );
    this.worker.on('failed', (job, err) => {
      const data = job?.data as WebhookJob | undefined;
      this.logger.warn(
        `webhook ${data?.webhookId} falhou (job ${job?.id}, tentativa ${job?.attemptsMade}, evento ${eventOf(data)}): ${err.message}`,
      );
      // C4: esgotou TODAS as tentativas → dead-letter (não some; reentregável depois).
      // Falha NÃO recuperável (destino bloqueado pela política de egress — ABE-06) não
      // retenta, mas TAMBÉM vai para a dead-letter: o operador precisa ver o evento e o motivo.
      if (
        job &&
        data &&
        (job.attemptsMade >= (job.opts.attempts ?? 1) ||
          err instanceof UnrecoverableError)
      ) {
        void this.toDeadLetter(data, err.message, job.attemptsMade).catch((e) =>
          this.logger.error(
            `falha ao gravar dead-letter: ${(e as Error).message}`,
          ),
        );
      }
    });
  }

  async enqueue(
    data: WebhookJob,
    attempts: number,
    jobId?: string,
  ): Promise<void> {
    await this.queue.add('deliver', data, {
      attempts: Math.max(1, attempts),
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
      // Dedup multi-réplica (item 20): o mesmo evento enfileirado por 2+ réplicas (fan-out) com o
      // mesmo jobId vira UM job — sem webhook duplicado.
      ...(jobId ? { jobId } : {}),
    });
  }

  private async deliver(data: WebhookJob): Promise<void> {
    // ABE-06: destino validado a CADA entrega (a URL pode ter mudado de DNS desde o cadastro).
    // Bloqueio é definitivo para este job (UnrecoverableError → sem retry, vai à dead-letter).
    try {
      await assertEgressAllowed(
        parseEgressUrl(data.url),
        egressPolicyFromEnv(),
      );
    } catch (e) {
      if (e instanceof EgressBlockedError) {
        throw new UnrecoverableError(
          `destino do webhook bloqueado pela política de egress: ${e.message} (libere via EGRESS_ALLOW_HOSTS se for interno legítimo)`,
        );
      }
      throw e;
    }
    const payload = JSON.stringify(data.body);
    const signature = data.secret
      ? createHmac('sha512', data.secret).update(payload).digest('hex')
      : undefined;

    const res = await fetch(data.url, {
      method: 'POST',
      headers: {
        ...safeCustomHeaders(data.headers),
        'content-type': 'application/json',
        ...(signature ? { 'x-webhook-signature': `sha512=${signature}` } : {}),
      },
      body: payload,
      signal: AbortSignal.timeout(10_000),
      // Sem seguir redirect: a assinatura/headers não podem "vazar" para outro host (ABE-06/14).
      redirect: 'manual',
    });
    if (!res.ok) {
      throw new Error(`destino respondeu HTTP ${res.status}`);
    }
  }

  // C4 — grava um evento que esgotou os retries na dead-letter (sem secret/headers: a reentrega
  // assina com o secret ATUAL do webhook).
  private async toDeadLetter(
    data: WebhookJob,
    error: string,
    attempts: number,
  ): Promise<void> {
    await this.prisma.webhookDeadLetter.create({
      data: {
        id: newId(),
        webhookId: data.webhookId,
        url: data.url,
        body: (data.body ?? {}) as Prisma.InputJsonValue,
        error,
        attempts,
      },
    });
  }

  // Lista os eventos na dead-letter (pendentes por padrão).
  async listDeadLetters(includeRedelivered = false) {
    return this.prisma.webhookDeadLetter.findMany({
      where: includeRedelivered ? {} : { redeliveredAt: null },
      orderBy: { failedAt: 'desc' },
      take: 200,
    });
  }

  // Reconciliação: reenfileira os eventos pendentes usando a config ATUAL do webhook (url/secret/
  // headers/maxAttempts). Pula webhooks removidos ou desabilitados. Marca redeliveredAt.
  async redeliverDeadLetters(
    limit = 100,
  ): Promise<{ redelivered: number; skipped: number }> {
    const items = await this.prisma.webhookDeadLetter.findMany({
      where: { redeliveredAt: null },
      orderBy: { failedAt: 'asc' },
      take: limit,
    });
    let redelivered = 0;
    let skipped = 0;
    for (const it of items) {
      const wh = await this.prisma.webhook.findUnique({
        where: { id: it.webhookId },
      });
      if (!wh || !wh.enabled) {
        skipped++;
        continue;
      }
      // Reserva ATÔMICA antes de enfileirar (ABE-14): duas chamadas concorrentes (ou um processo
      // que caiu entre enqueue e update) não reenfileiram o mesmo evento. Só quem marcar a linha
      // (WHERE redeliveredAt IS NULL) enfileira; se o enqueue falhar, devolve a linha à fila.
      const reserved = await this.prisma.webhookDeadLetter.updateMany({
        where: { id: it.id, redeliveredAt: null },
        data: { redeliveredAt: new Date() },
      });
      if (reserved.count !== 1) {
        skipped++;
        continue;
      }
      try {
        await this.enqueue(
          {
            webhookId: wh.id,
            url: wh.url,
            secret: wh.secret,
            headers: (wh.headers as Record<string, string> | null) ?? null,
            body: it.body,
          },
          wh.maxAttempts,
          // jobId determinístico (sem `:` — BullMQ rejeita): dedup mesmo entre réplicas.
          `dlq-redeliver-${it.id}`,
        );
      } catch (e) {
        await this.prisma.webhookDeadLetter
          .update({ where: { id: it.id }, data: { redeliveredAt: null } })
          .catch((e) =>
            this.logger.warn(
              `dead-letter ${it.id}: não desfiz a marca de reentrega (fica como reentregue sem job): ${(e as Error).message}`,
            ),
          );
        throw e;
      }
      redelivered++;
    }
    return { redelivered, skipped };
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker
      ?.close()
      .catch((e) =>
        this.logger.warn(
          `fechamento do worker de webhooks: ${(e as Error).message}`,
        ),
      );
    await this.queue
      ?.close()
      .catch((e) =>
        this.logger.warn(
          `fechamento da fila de webhooks: ${(e as Error).message}`,
        ),
      );
  }
}
