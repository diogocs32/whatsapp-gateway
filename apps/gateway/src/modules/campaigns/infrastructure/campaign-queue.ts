import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import {
  DelayedError,
  Job,
  Queue,
  Worker,
  type ConnectionOptions,
} from 'bullmq';
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
  SessionNotWorkingError,
} from '../../sessions/application/session-manager.service';
import { CampaignRepository } from './campaign.repository';

export interface CampaignJob {
  campaignId: string;
  recipientId: string;
  scheduleEpoch?: number; // ausente nos jobs anteriores à migration: época 0
  notReadyRetries?: number;
}

const QUEUE_NAME = 'campaigns';
const RETRY_MIN_MS = 30_000;
// Um início de job a cada 8 s em TODAS as réplicas da fila (limiter Redis do BullMQ 5).
// O espaçamento de cada campanha continua sendo minDelaySec/maxDelaySec.
const GLOBAL_JOB_INTERVAL_MS = 8_000;
const SEND_SLOT_KEY = 'bull:campaigns:send-slot';
const SEND_SLOT_SCRIPT = `
local now = tonumber(ARGV[1])
local interval = tonumber(ARGV[2])
local previous = tonumber(redis.call('GET', KEYS[1]) or '0')
local slot = math.max(now, previous)
redis.call('SET', KEYS[1], slot + interval, 'PX', math.max(120000, slot - now + 120000))
return slot
`;
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

class SendSlotUnavailableError extends Error {}

// Fila de disparo de campanhas (BullMQ) com anti-ban: cada destinatário é agendado com
// espaçamento aleatório (delay acumulado) + "digitando" antes do envio (humanização).
//
// Auditoria 09/2026 (ABE-02/04/05): a campanha passa pelo MESMO gate de 1º contato do endpoint
// de mensagens (firstContact → canSendCold), o destinatário é reservado atomicamente (1 worker),
// o teto diário é por dia local e serializado, a pausa é revalidada imediatamente antes do
// efeito e cada envio leva idempotencyKey determinística (retry não duplica).
@Injectable()
export class CampaignQueue
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(CampaignQueue.name);
  private queue!: Queue<CampaignJob>;
  private worker!: Worker<CampaignJob>;
  private closing = false;

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
    this.queue = new Queue<CampaignJob>(QUEUE_NAME, { connection });
    // Handshake concluído antes de seguir (mesma razão do WebhookQueue — item 22).
    await this.queue.waitUntilReady();
    this.worker = new Worker<CampaignJob>(
      QUEUE_NAME,
      (job, token) => this.process(job, token),
      {
        connection,
        concurrency: 4,
        limiter: { max: 1, duration: GLOBAL_JOB_INTERVAL_MS },
        autorun: false,
      },
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

  onApplicationBootstrap(): void {
    if (!this.worker) return; // testes HTTP usam a fila desativada
    // O SessionManager reidrata em background para não segurar o HTTP. O Worker pode nascer,
    // mas não consome jobs vencidos até a primeira passada terminar. Sessões ainda não WORKING
    // usam a liberação de reserva e backoff abaixo.
    void this.manager.whenRehydrated().then(() => {
      if (this.closing) return;
      void this.worker.run().catch((e: unknown) => {
        if (!this.closing)
          this.logger.error(
            `worker de campanhas parou: ${(e as Error).message}`,
          );
      });
    });
  }

  // jobId determinístico (sem `:` — o BullMQ rejeita) dedupa o agendamento entre starts
  // concorrentes/réplicas; a época no id separa retomadas e invalida jobs antigos.
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

  private async delay(
    job: Job<CampaignJob>,
    token: string | undefined,
    delayMs: number,
  ): Promise<never> {
    await job.moveToDelayed(
      Date.now() + Math.max(1_000, Math.round(delayMs)),
      token,
    );
    throw new DelayedError();
  }

  private async retrySession(
    job: Job<CampaignJob>,
    token: string | undefined,
  ): Promise<never> {
    const retries = Math.min((job.data.notReadyRetries ?? 0) + 1, 6);
    await job.updateData({ ...job.data, notReadyRetries: retries });
    const backoff = Math.min(120_000, 5_000 * 2 ** (retries - 1));
    return this.delay(job, token, backoff + randInt(0, 2_000));
  }

  // O limiter do Worker governa o INÍCIO do job. Dois downloads concorrentes podem terminar
  // juntos: esta reserva atômica no Redis espaça os RPCs efetivos entre todas as réplicas.
  private async waitForGlobalSendSlot(): Promise<void> {
    if (!this.queue) return; // testes unitários do processor, sem Redis
    try {
      // A instância instalada (BullMQ 5.81.5) encapsula ioredis em um Proxy que encaminha
      // comandos nativos; IRedisClient declara apenas o subconjunto usado pelo BullMQ.
      const client = (await this.queue.client) as unknown as Redis;
      const [seconds, microseconds] = await client.time();
      const now =
        Number(seconds) * 1000 + Math.floor(Number(microseconds) / 1000);
      const slot = Number(
        await client.eval(
          SEND_SLOT_SCRIPT,
          1,
          SEND_SLOT_KEY,
          String(now),
          String(GLOBAL_JOB_INTERVAL_MS),
        ),
      );
      if (!Number.isFinite(slot)) throw new Error('slot Redis inválido');
      await sleep(Math.max(0, slot - now));
    } catch (e) {
      throw new SendSlotUnavailableError((e as Error).message);
    }
  }

  private async process(job: Job<CampaignJob>, token?: string): Promise<void> {
    const data = job.data;
    const c = await this.repo.findById(data.campaignId);
    // Jobs PAUSED são consumidos uma vez e param. O resume agenda os PENDING na nova época,
    // espaçados; jobs velhos que ainda estejam delayed/waiting não causam rajada.
    if (!c || c.status !== 'RUNNING') return;
    if ((data.scheduleEpoch ?? 0) !== c.scheduleEpoch) return;
    const messageGate = await this.guardrail.canSendMessage(c.sessionId);
    if (!messageGate.allowed) {
      // Não muda a campanha para PAUSED: esse estado exigiria /resume manual. O job espera e
      // reconsulta o banco; depois de restrictionUntil ele volta sozinho, inclusive após restart.
      return this.delay(
        job,
        token,
        Math.min(
          60 * 60_000,
          Math.max(
            RETRY_MIN_MS,
            (messageGate.until?.getTime() ?? 0) - Date.now(),
          ),
        ),
      );
    }
    // ABE-02: campanha de 1º contato respeita o guard-rail (quarentena/pausa manual) — antes
    // passava por fora do gate que o endpoint /messages aplica a `cold:true`.
    if (c.firstContact) {
      const gate = await this.guardrail.canSendCold(c.sessionId);
      if (!gate.allowed) {
        if (gate.until) {
          return this.delay(
            job,
            token,
            Math.max(RETRY_MIN_MS, gate.until.getTime() - Date.now()),
          );
        }
        this.logger.warn(
          `campanha ${c.id} pausada pelo guard-rail (${gate.state}${gate.reason ? `: ${gate.reason}` : ''})`,
        );
        await this.repo.pauseIfRunning(c.id, c.scheduleEpoch);
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
      if (
        c.dailyCap !== null &&
        reservation.sentToday < c.dailyCap &&
        reservation.inFlight > 0
      ) {
        // Cap ocupado só por reservas em voo: elas podem ser devolvidas por perda de lease,
        // shutdown ou sessão sem WORKING. Não transformar isso em PAUSED permanente.
        return this.delay(job, token, RETRY_MIN_MS);
      }
      this.logger.log(
        `campanha ${c.id}: teto diário (${c.dailyCap}) atingido — pausada; retoma com /resume`,
      );
      await this.repo.pauseIfRunning(c.id, c.scheduleEpoch);
      // O destinatário fica PENDING; /resume (manual) agenda a nova época.
      return;
    }
    if (reservation.kind === 'busy') {
      // Reserva de um worker anterior ainda viva: não perder o único job da retomada.
      return this.delay(job, token, reservation.retryAfterMs + 1_000);
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
      const stillRunning = async () => {
        const fresh = await this.repo.findById(c.id);
        return (
          fresh?.status === 'RUNNING' &&
          fresh.scheduleEpoch === (data.scheduleEpoch ?? 0)
        );
      };
      if (!(await stillRunning())) {
        await this.repo.releaseRecipient(r.id, r.reservedAt);
        return;
      }

      // idempotencyKey determinística: um retry/stall do BullMQ não gera 2ª mensagem.
      const opts = {
        cold: c.firstContact,
        idempotencyKey: `campaign-${c.id}-${r.id}`,
      };
      let keyId: string;
      if (c.messageType === 'text') {
        await this.waitForGlobalSendSlot();
        if (!(await stillRunning())) {
          await this.repo.releaseRecipient(r.id, r.reservedAt);
          return;
        }
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
        // Download pode levar até 20 s. Reservar o slot somente depois dele e revalidar a
        // época após a espera evita rajada de mídia e envio de job pausado.
        await this.waitForGlobalSendSlot();
        if (!(await stillRunning())) {
          await this.repo.releaseRecipient(r.id, r.reservedAt);
          return;
        }
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
        e instanceof SessionBusyError ||
        e instanceof SessionNotWorkingError ||
        e instanceof SendSlotUnavailableError
      ) {
        // A réplica sem lease, o shutdown e a sessão ainda não WORKING são transitórios.
        await this.repo.releaseRecipient(r.id, r.reservedAt);
        const fresh = await this.repo.findById(c.id);
        if (
          fresh?.status === 'RUNNING' &&
          fresh.scheduleEpoch === (data.scheduleEpoch ?? 0)
        ) {
          await this.retrySession(job, token);
        }
        return;
      }
      await this.repo.markRecipientFailed(r.id, (e as Error).message);
    }
    await this.repo.refreshCounts(c.id);
  }

  async onModuleDestroy(): Promise<void> {
    this.closing = true;
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
