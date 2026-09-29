import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';
import type { Env } from '../../../bootstrap/config';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { EventBus } from '../../../shared-kernel/event-bus/event-bus';
import { newId } from '../../../shared-kernel/ulid';
import { ContactDirectory } from '../../../infra/directory/contact-directory.service';
import { MediaStorage } from '../../../infra/storage/media-storage.service';
import { ProxyResolver } from '../../proxies/application/proxy-resolver.service';
import { GuardrailService } from '../../guardrail/guardrail.service';
import { SessionQuarantinedException } from '../../guardrail/session-quarantined.exception';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from '../domain/session.repository';
import type { Session } from '../domain/session.entity';
import { EngineFactory } from '../infrastructure/engine.factory';
import {
  LeaseLostError,
  PostgresSessionLease,
  type SessionFence,
} from '../infrastructure/postgres-session-lease';
import { WWebJSEngine } from '../infrastructure/wwebjs/wwebjs.engine';
import type {
  ChannelInfo,
  ChatFlag,
  ChatSummary,
  ContactCheck,
  EngineEventName,
  ForwardSource,
  GroupInfo,
  GroupParticipantAction,
  GroupSettingKey,
  HistoryMessage,
  IEngine,
  MembershipAction,
  MembershipRequest,
  MessagePayload,
  PreparedForward,
  PresenceState,
  SaveContactInput,
  SendLocationInput,
  SendMediaInput,
  SendOptions,
  SendPollInput,
  SessionStatePayload,
  WaEventEnvelope,
} from './engine.port';

// E27 (D-037): a sessão já tem uma operação de ciclo de vida em andamento e o chamador pediu para
// não esperar na fila (link público de conexão).
export class SessionBusyError extends ConflictException {
  constructor() {
    super('Operação em andamento na sessão');
    this.name = 'SessionBusyError';
  }
}

// A ausência temporária de WORKING tem a mesma mensagem pública (400) de antes, mas permite
// à campanha distingui-la de uma falha definitiva e devolver a reserva para retry.
export class SessionNotWorkingError extends Error {
  constructor(message: 'Sessão não iniciada' | 'Sessão não está conectada') {
    super(message);
    this.name = 'SessionNotWorkingError';
  }
}

@Injectable()
export class SessionManager implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SessionManager.name);
  private readonly engines = new Map<string, IEngine>();
  private readonly names = new Map<string, string>();
  // Última chave `status|erro` publicada por sessão — base do dedup de status idêntico consecutivo
  // (ver handleEngineEvent). Limpa junto com todo engines.delete para não vazar nem reter chave
  // velha quando uma engine nova assume a mesma sessão.
  private readonly lastStatusKey = new Map<string, string>();
  // Um close pode correr com o UPDATE de WORKING anterior ou com start manual/open posterior.
  // Ordena status e diagnóstico da mesma sessão para a última transição vencer no banco.
  private readonly statusWrites = new Map<string, Promise<void>>();
  // E27 (D-037): uma operação de ciclo de vida por sessão de cada vez (start, stop, restart, logout,
  // newQr, remove, pairing e a rejeição de número). Antes, newQr trocava a instância da engine e
  // não se enxergava com um stop/newQr concorrente (dois starts, socket novo derrubado). Por
  // processo: o gateway roda 1 réplica; a sobreposição do deploy start-first é o B-004. Criado sob
  // demanda (os specs montam o manager por Object.create, sem inicializadores de campo).
  private lifecycleLocks?: Map<string, Promise<void>>;
  // E27: reidratação do boot concluída — sem ela, "sem engine" pode ser só "ainda não reidratou".
  private rehydrated = false;
  private resolveRehydration!: () => void;
  private readonly rehydrationDone = new Promise<void>((resolve) => {
    this.resolveRehydration = resolve;
  });
  private readonly lease: PostgresSessionLease;
  private readonly owned = new Map<
    string,
    SessionFence & { active: boolean; timer?: ReturnType<typeof setTimeout> }
  >();
  private readonly bootRetries = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly pendingStops = new Map<string, Promise<void>>();
  private readonly draining = new Map<string, Promise<void>>();
  private readonly drainFailed = new Set<string>();
  private shuttingDown = false;

  constructor(
    @Inject(SESSION_REPOSITORY) private readonly repo: SessionRepository,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly eventBus: EventBus,
    private readonly proxyResolver: ProxyResolver,
    private readonly mediaStorage: MediaStorage,
    private readonly contactDirectory: ContactDirectory,
    private readonly engineFactory: EngineFactory,
    private readonly guardrail: GuardrailService,
  ) {
    this.lease = new PostgresSessionLease(prisma);
  }

  private isOwner(sessionId: string): boolean {
    const held = this.owned.get(sessionId);
    return !!held?.active && held.until.getTime() > Date.now() + 1_000;
  }

  private epochOf(sessionId: string): bigint {
    if (!this.isOwner(sessionId)) throw new LeaseLostError();
    return this.owned.get(sessionId)!.epoch;
  }

  private async ensureLease(sessionId: string): Promise<bigint> {
    if (this.shuttingDown) throw new SessionBusyError();
    if (this.draining.has(sessionId) || this.drainFailed.has(sessionId))
      throw new SessionBusyError();
    if (this.isOwner(sessionId)) return this.epochOf(sessionId);
    if (this.owned.has(sessionId)) await this.drain(sessionId);
    if (this.draining.has(sessionId) || this.drainFailed.has(sessionId))
      throw new SessionBusyError();
    const fence = await this.lease.acquire(sessionId);
    if (!fence) throw new SessionBusyError();
    const held = { ...fence, active: true } as SessionFence & {
      active: boolean;
      timer?: ReturnType<typeof setTimeout>;
    };
    this.owned.set(sessionId, held);
    this.scheduleRenew(sessionId, held);
    return fence.epoch;
  }

  private scheduleRenew(
    sessionId: string,
    held: SessionFence & {
      active: boolean;
      timer?: ReturnType<typeof setTimeout>;
    },
  ): void {
    held.timer = setTimeout(() => {
      void (async () => {
        if (!held.active || this.owned.get(sessionId) !== held) return;
        try {
          const attemptedEpoch = held.epoch;
          let until = await this.lease.renew(sessionId, attemptedEpoch);
          // Limpar auth incrementa o epoch na mesma posse. A renovação que entrou antes do
          // callback da engine pode receber 0 linhas; aguarda a publicação do novo epoch.
          if (!until && held.active) {
            await new Promise<void>((resolve) => setTimeout(resolve, 100));
            if (
              held.epoch !== attemptedEpoch &&
              this.owned.get(sessionId) === held
            )
              until = await this.lease.renew(sessionId, held.epoch);
          }
          if (!held.active || this.owned.get(sessionId) !== held) return;
          if (!until) throw new LeaseLostError();
          held.until = until;
          if (held.active) this.scheduleRenew(sessionId, held);
        } catch (e) {
          if (!held.active || this.owned.get(sessionId) !== held) return;
          this.logger.error(
            `Lease perdido (${sessionId}): ${(e as Error).message}`,
          );
          await this.drain(sessionId, held);
          // Só falha de rede/banco merece nova tentativa lenta. Disputa de epoch pertence ao
          // outro dono; o boot do novo processo já fará a própria reidratação.
          if (!(e instanceof LeaseLostError) && !this.shuttingDown)
            this.scheduleBootRetry(sessionId, 30_000);
        }
      })();
    }, 8_000);
    held.timer.unref?.();
  }

  private async drain(
    sessionId: string,
    expected?: SessionFence,
  ): Promise<void> {
    const held = this.owned.get(sessionId);
    if (expected && held !== expected) return;
    if (held) {
      held.active = false;
      if (held.timer) clearTimeout(held.timer);
      this.owned.delete(sessionId);
    }
    const engine = this.engines.get(sessionId);
    this.engines.delete(sessionId);
    this.names.delete(sessionId);
    this.lastStatusKey.delete(sessionId);
    if (engine) {
      const pending = Promise.resolve().then(
        () => engine.shutdown?.() ?? engine.stop(),
      );
      this.draining.set(sessionId, pending);
      void pending.then(
        () => {
          if (this.draining.get(sessionId) === pending)
            this.draining.delete(sessionId);
        },
        (e: unknown) => {
          this.drainFailed.add(sessionId);
          if (this.draining.get(sessionId) === pending)
            this.draining.delete(sessionId);
          this.logger.error(
            `Shutdown sem confirmação (${sessionId}): ${(e as Error).message}`,
          );
        },
      );
      if (!(await this.settledWithin(pending, 10_000)))
        this.logger.warn(
          `Shutdown ainda pendente (${sessionId}); nova posse local bloqueada`,
        );
    }
  }

  private async releaseLease(sessionId: string): Promise<void> {
    const held = this.owned.get(sessionId);
    if (!held) return;
    held.active = false;
    if (held.timer) clearTimeout(held.timer);
    this.owned.delete(sessionId);
    this.engines.delete(sessionId);
    this.lastStatusKey.delete(sessionId);
    await this.lease.release(sessionId, held.epoch);
  }

  private scheduleBootRetry(sessionId: string, delayMs: number): void {
    if (this.shuttingDown || this.bootRetries.has(sessionId)) return;
    const timer = setTimeout(() => {
      this.bootRetries.delete(sessionId);
      void this.startAutostart(sessionId).catch((e: unknown) => {
        if (e instanceof SessionBusyError || e instanceof LeaseLostError)
          this.scheduleBootRetry(sessionId, 5_000);
        else {
          this.logger.warn(
            `Retentativa de lease ${sessionId}: ${(e as Error).message}`,
          );
          if (this.isTransientDatabaseError(e))
            this.scheduleBootRetry(sessionId, 30_000);
        }
      });
    }, delayMs);
    timer.unref?.();
    this.bootRetries.set(sessionId, timer);
  }

  private isTransientDatabaseError(e: unknown): boolean {
    const code = (e as { code?: string })?.code;
    return [
      'P1001',
      'P1002',
      'P1008',
      'P1017',
      'P2024',
      'P2034',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EAI_AGAIN',
    ].includes(code ?? '');
  }

  private startAutostart(sessionId: string): Promise<void> {
    return this.runExclusive(sessionId, () =>
      this.startUnlocked(sessionId, true),
    );
  }

  async onApplicationBootstrap(): Promise<void> {
    const candidates = await this.repo.findAutostart();
    if (candidates.length === 0) {
      this.finishRehydration();
      return;
    }
    // Reidratação ESCALONADA e fora do bootstrap do Nest. Antes era tudo em paralelo: N sessões
    // wwebjs = N Chromium subindo de uma vez no boot (pico de CPU/RAM → swap/OOM do host = "trava
    // tudo") + N fetchLatestBaileysVersion simultâneos. Agora inicia UMA por vez — cada start já
    // tem teto próprio (START_TIMEOUT_MS), então uma sessão lenta não segura a fila por mais que
    // isso; ordena as leves primeiro (Baileys antes de WWEBJS) e as cronicamente quebradas
    // (DEGRADED — esgotaram as reconexões) por último, para não atrasarem as saudáveis.
    const weight = (s: Session) =>
      (s.status === 'DEGRADED' ? 2 : 0) + (s.engine === 'WWEBJS' ? 1 : 0);
    const ordered = [...candidates].sort((a, b) => weight(a) - weight(b));
    void (async () => {
      try {
        for (const s of ordered) {
          if (this.shuttingDown) break;
          this.logger.log(`Reidratando sessão "${s.name}" (${s.engine})`);
          try {
            await this.startAutostart(s.id);
          } catch (e) {
            if (e instanceof SessionBusyError || e instanceof LeaseLostError) {
              this.logger.log(
                `Sessão ${s.name} com lease em outro processo; aguardando liberação`,
              );
              this.scheduleBootRetry(s.id, 5_000);
            } else {
              this.logger.error(
                `Falha ao reidratar ${s.name}: ${(e as Error).message}`,
              );
              if (!this.shuttingDown && this.isTransientDatabaseError(e))
                this.scheduleBootRetry(s.id, 30_000);
            }
          }
        }
      } finally {
        this.finishRehydration();
      }
    })();
  }

  private finishRehydration(): void {
    this.rehydrated = true;
    this.resolveRehydration();
  }

  whenRehydrated(): Promise<void> {
    return this.rehydrationDone;
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    for (const timer of this.bootRetries.values()) clearTimeout(timer);
    this.bootRetries.clear();
    // Teto no shutdown (item 12 da auditoria 07/2026): um Chromium/socket travado não pode
    // pendurar o redeploy — o orquestrador mata o container após o grace period de qualquer
    // forma; melhor liberar o processo de forma controlada.
    // P-015: engines com shutdown() (wwebjs) fecham por FORA do mutex de ciclo de vida — um
    // logout/start pendurado segurando a fila deixava o stop() serializado sem nem COMEÇAR nos
    // 15s, o Chromium levava SIGKILL no meio de escritas e o perfil sujo fazia o WhatsApp exigir
    // QR a cada troca de container. Duração e estouros ficam logados para validar em prod.
    const startedAt = Date.now();
    const pending = new Set<string>();
    const stopAll = Promise.all(
      [...this.engines.entries()].map(async ([id, e]) => {
        pending.add(id);
        try {
          await (e.shutdown ? e.shutdown() : e.stop());
          await this.statusWrites.get(id);
          await this.releaseLease(id);
        } catch {
          /* melhor esforço — o processo está encerrando */
        } finally {
          pending.delete(id);
        }
      }),
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, 15_000);
    });
    try {
      await Promise.race([stopAll, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    const elapsedMs = Date.now() - startedAt;
    if (pending.size > 0) {
      this.logger.warn(
        `Shutdown estourou o teto de 15s (${elapsedMs}ms); sessões ainda fechando: ${[...pending].join(', ')} — Chromium pode morrer sujo com o container e invalidar o LocalAuth (P-015)`,
      );
    } else {
      this.logger.log(`Shutdown: todas as engines fecharam em ${elapsedMs}ms`);
    }
  }

  private getOrCreateEngine(sessionId: string, engineType: string): IEngine {
    const authEpoch = this.epochOf(sessionId);
    let engineEpoch = authEpoch;
    const existing = this.engines.get(sessionId);
    if (existing) return existing;
    const created = this.engineFactory.create(engineType, {
      sessionId,
      // deviceName: rótulo genérico legado (não é mais o fingerprint do Baileys — este agora é
      // realista e por sessão, ver baileys/browser-fingerprint.ts). Mantido só pela forma da deps.
      deviceName: 'WhatsApp Gateway',
      // Guard anti-vazamento: recusa conectar sem proxy vivo quando ligado (ver config WA_REQUIRE_PROXY).
      requireProxy: this.config.get('WA_REQUIRE_PROXY', { infer: true }),
      baileysProtocolVersion: this.config.get('BAILEYS_PROTOCOL_VERSION', {
        infer: true,
      }),
      baileysProtocolCanarySessionId: this.config.get(
        'BAILEYS_PROTOCOL_CANARY_SESSION_ID',
        { infer: true },
      ),
      onProtocolVersion: (version, source) =>
        this.logger.log(
          `Baileys protocolo ${sessionId}: versão ${version} (${source})`,
        ),
      prisma: this.prisma,
      lease: this.lease,
      authEpoch,
      onAuthEpoch: (next) => {
        const held = this.owned.get(sessionId);
        if (held?.active && held.epoch === engineEpoch) {
          held.epoch = next;
          engineEpoch = next;
        }
      },
      logger: pino({
        level: this.config.get('WA_LOG_LEVEL', { infer: true }),
      }),
      // Guard: só processa eventos enquanto ESTA engine for a registrada para a sessão. Se ela
      // foi descartada (remove/newQr) ou substituída, seus eventos tardios são ignorados
      // — sem isto, uma engine órfã reconectando persistiria status de sessão já removida (loop
      // de P2025 no update + violação de FK no insert da timeline).
      onEvent: (name, payload) => {
        if (this.engines.get(sessionId) !== created || !this.isOwner(sessionId))
          return;
        const eventEpoch = engineEpoch;
        if (name === 'session.status' || name === 'session.client_too_old') {
          void this.enqueueStatusWrite(
            sessionId,
            created,
            `evento ${name}`,
            () =>
              this.handleEngineEvent(
                sessionId,
                name,
                payload,
                created,
                eventEpoch,
              ),
          );
        } else {
          void this.handleEngineEvent(
            sessionId,
            name,
            payload,
            created,
            eventEpoch,
          );
        }
      },
      onRestrictionSignal: async (signal) => {
        if (this.engines.get(sessionId) !== created || !this.isOwner(sessionId))
          return;
        await this.guardrail.recordReachoutRestriction(
          sessionId,
          signal.signal,
          {
            until: signal.until,
            source: signal.source,
            enforcementType: signal.enforcementType,
          },
        );
      },
      onDisconnect: async (details) => {
        if (this.engines.get(sessionId) !== created || !this.isOwner(sessionId))
          return;
        const eventEpoch = engineEpoch;
        await this.enqueueStatusWrite(
          sessionId,
          created,
          'diagnóstico de desconexão',
          async () => {
            await this.lease.updateLastErrorDetails(
              sessionId,
              eventEpoch,
              details,
            );
          },
        );
      },
      resolveAgent: () => this.proxyResolver.resolveAgent(sessionId),
      resolveBaileysTransport: () =>
        this.proxyResolver.resolveBaileysTransport(sessionId),
      resolveProxyConfig: () =>
        this.proxyResolver.resolveProxyConfig(sessionId),
      resolveWwebjsWebVersion: async () =>
        (
          await this.prisma.sessionConfig.findUnique({
            where: { sessionId },
            select: { wwebjsWebVersion: true },
          })
        )?.wwebjsWebVersion ?? null,
      reportProxyFailure: async (reason, proxyId) => {
        if (this.engines.get(sessionId) !== created) throw new LeaseLostError();
        return this.lease.fenced(sessionId, engineEpoch, (tx) =>
          this.proxyResolver.reportFailure(sessionId, reason, proxyId, tx),
        );
      },
      storeMedia: (key, body, contentType) =>
        this.mediaStorage.put(key, body, contentType),
      contacts: {
        record: (c) =>
          void this.contactDirectory
            .record(sessionId, c)
            .catch((e) =>
              this.logger.warn(
                `diretório de contatos (${sessionId}): ${(e as Error).message}`,
              ),
            ),
        recordMany: (list) =>
          void this.contactDirectory
            .recordMany(sessionId, list)
            .catch((e) =>
              this.logger.warn(
                `diretório de contatos em lote (${sessionId}, ${list.length}): ${(e as Error).message}`,
              ),
            ),
        loadLidMap: () => this.contactDirectory.lidMap(sessionId),
        resolveNames: (keys) => this.contactDirectory.namesFor(sessionId, keys),
      },
    });
    this.engines.set(sessionId, created);
    return created;
  }

  private enqueueStatusWrite(
    sessionId: string,
    engine: IEngine,
    operation: string,
    write: () => Promise<void>,
  ): Promise<void> {
    const prior = this.statusWrites.get(sessionId) ?? Promise.resolve();
    const next = prior
      .then(() =>
        this.engines.get(sessionId) === engine && this.isOwner(sessionId)
          ? write()
          : undefined,
      )
      .catch((err) =>
        this.logger.error(
          `${operation} (${sessionId}): ${(err as Error).message}`,
        ),
      );
    this.statusWrites.set(sessionId, next);
    void next.finally(() => {
      if (this.statusWrites.get(sessionId) === next)
        this.statusWrites.delete(sessionId);
    });
    return next;
  }

  private get locks(): Map<string, Promise<void>> {
    return (this.lifecycleLocks ??= new Map());
  }

  // Mesmo encadeamento do enqueueStatusWrite: cada operação espera a anterior da mesma sessão
  // terminar (com sucesso ou erro) e o erro volta só para o próprio chamador. `failFast`: com algo
  // em andamento, lança SessionBusyError em vez de entrar na fila. Nunca chamar um método público
  // (com lock) de dentro de outro — a promise esperaria por ela mesma; use as versões *Unlocked.
  private runExclusive<T>(
    sessionId: string,
    fn: () => Promise<T>,
    opts: { failFast?: boolean } = {},
  ): Promise<T> {
    const prior = this.locks.get(sessionId);
    if (prior && opts.failFast) return Promise.reject(new SessionBusyError());
    const run = (prior ?? Promise.resolve()).then(fn);
    // Libera na PRIMEIRA reação ao fim de `run` (registrada antes do await de quem chamou): logo
    // depois do `await manager.stop(id)`, a sessão já não aparece ocupada.
    const release = (): void => {
      if (this.locks.get(sessionId) === settled) this.locks.delete(sessionId);
    };
    const settled: Promise<void> = run.then(release, release);
    this.locks.set(sessionId, settled);
    return run;
  }

  // E27: leituras sem efeito para o link público de conexão.
  isBusy(sessionId: string): boolean {
    return this.locks.has(sessionId);
  }

  isRehydrated(): boolean {
    return this.rehydrated;
  }

  hasEngine(sessionId: string): boolean {
    return this.engines.has(sessionId);
  }

  // Status e QR da MESMA instância, lidos juntos e sem await — depois de um newQr a engine é outra.
  liveView(
    sessionId: string,
  ): { status: SessionStatePayload['status']; qr: string | null } | null {
    const engine = this.engines.get(sessionId);
    return engine
      ? { status: engine.getStatus(), qr: engine.getQrBase64() }
      : null;
  }

  private async handleEngineEvent(
    sessionId: string,
    name: EngineEventName,
    payload: unknown,
    expectedEngine?: IEngine,
    expectedEpoch?: bigint,
  ): Promise<void> {
    if (
      !this.isOwner(sessionId) ||
      (expectedEngine && this.engines.get(sessionId) !== expectedEngine) ||
      (expectedEpoch !== undefined && this.epochOf(sessionId) !== expectedEpoch)
    )
      return;
    const held = this.owned.get(sessionId);
    // Engine REAL da sessão, capturada síncronamente ANTES dos awaits abaixo (persist/presign) para
    // não correr com um engines.delete concorrente. Antes o envelope rotulava TUDO como 'baileys',
    // inclusive sessões WWEBJS — o node n8n recebia a engine errada (contrato público).
    const engine = this.engines.get(sessionId)?.engineName ?? 'baileys';
    if (name === 'session.status') {
      if (
        !(await this.persistStatus(
          sessionId,
          payload as SessionStatePayload,
          expectedEpoch,
        ))
      )
        return;
      if (
        this.owned.get(sessionId) !== held ||
        (expectedEngine && this.engines.get(sessionId) !== expectedEngine) ||
        (expectedEpoch !== undefined && held?.epoch !== expectedEpoch)
      )
        return;
      // Dedup de status idêntico consecutivo. As engines RE-emitem session.status sem que nada
      // tenha mudado: o Baileys dispara WORKING em TODO connection 'open' (baileys.engine.ts:628),
      // então cada reconexão transitória de rede/proxy reemite WORKING já sendo WORKING; o wwebjs
      // reemite WORKING a cada heal (o 'ready' re-dispara). Sem dedup, cada uma dessas vira um
      // webhook → alerta no n8n (zap/telegram) dizendo "está WORKING" de novo — o "muitos alertas,
      // mas nada mudou". Chave = status + erro (meJid/mePushName continuam persistidos acima por
      // persistStatus, INDEPENDENTE do dedup do evento). persistStatus roda SEMPRE (antes deste
      // gate): mantém wa_sessions atualizado e detecta perda de posse ou exclusão da linha.
      // Não altera o contrato: um status idêntico não é uma transição — consumidor nenhum precisa
      // da duplicata (o timeline em wa_session_events também para de acumular linhas repetidas).
      const p = payload as SessionStatePayload;
      const key = `${p.status}|${p.error ?? ''}`;
      if (this.lastStatusKey.get(sessionId) === key) return;
      this.lastStatusKey.set(sessionId, key);
    }
    // Mídia: anexa uma URL pré-assinada (efêmera) ao payload para SSE/webhooks consumirem direto.
    if (name === 'message') {
      const p = payload as MessagePayload;
      if (p.mediaKey) {
        try {
          p.mediaUrl = await this.mediaStorage.presignedGetUrl(p.mediaKey);
        } catch (e) {
          this.logger.warn(
            `presign falhou (${p.mediaKey}): ${(e as Error).message}`,
          );
        }
      }
    }
    if (
      !this.isOwner(sessionId) ||
      this.owned.get(sessionId) !== held ||
      (expectedEngine && this.engines.get(sessionId) !== expectedEngine) ||
      (expectedEpoch !== undefined && held?.epoch !== expectedEpoch)
    )
      return;
    const envelope: WaEventEnvelope = {
      id: newId(),
      timestamp: Date.now(),
      event: name,
      sessionId,
      session: this.names.get(sessionId) ?? sessionId,
      payload,
      engine,
    };
    this.eventBus.publish({
      name: 'wa.event',
      occurredAt: new Date(),
      payload: envelope,
    });
  }

  private async persistStatus(
    sessionId: string,
    p: SessionStatePayload,
    expectedEpoch?: bigint,
  ): Promise<boolean> {
    const held = this.owned.get(sessionId);
    const epoch = held?.epoch;
    try {
      await this.lease.updateStatus(
        sessionId,
        expectedEpoch ?? this.epochOf(sessionId),
        p.status,
        {
          meJid: p.meJid,
          mePushName: p.mePushName,
          lastError: p.error,
          lastErrorDetails:
            p.lastErrorDetails !== undefined
              ? p.lastErrorDetails
              : p.error === null
                ? null
                : undefined,
        },
      );
      return true;
    } catch (e) {
      if (e instanceof LeaseLostError) {
        if (held && this.owned.get(sessionId) === held && held.epoch === epoch)
          void this.drain(sessionId, held);
        return false;
      }
      this.logger.error(`persist status ${sessionId}: ${(e as Error).message}`);
      return false;
    }
  }

  // Teto do start: subir o Chromium do wwebjs pode levar minutos em cenário ruim (proxy lento,
  // webVersion expirada — protocolTimeout interno é 240s). Sem teto, POST /start, /pairing-code e
  // o create ficavam pendurados até o Traefik cortar (499/504). 15s cobre o caminho feliz
  // observado (Baileys ~2s; wwebjs até o QR ~8s); passou disso, a rota responde e o start segue
  // em background com o estado real chegando via polling de status/QR.
  private static readonly START_TIMEOUT_MS = 15_000;

  start(sessionId: string): Promise<void> {
    return this.runExclusive(sessionId, () => this.startUnlocked(sessionId));
  }

  private async startUnlocked(
    sessionId: string,
    autostartOnly = false,
  ): Promise<void> {
    const session = await this.repo.findById(sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    await this.ensureLease(sessionId);
    if (this.shuttingDown) {
      await this.releaseLease(sessionId);
      throw new SessionBusyError();
    }
    if (autostartOnly) {
      const eligible = await this.lease.fenced(
        sessionId,
        this.epochOf(sessionId),
        (tx) =>
          tx.waSession.findUnique({
            where: { id: sessionId },
            select: { status: true, autostart: true },
          }),
      );
      if (
        !eligible?.autostart ||
        ![
          'WORKING',
          'STARTING',
          'SCAN_QR_CODE',
          'PAIRING_CODE',
          'DEGRADED',
        ].includes(eligible.status)
      ) {
        await this.releaseLease(sessionId);
        return;
      }
    }
    if (this.shuttingDown) {
      await this.releaseLease(sessionId);
      throw new SessionBusyError();
    }
    const retry = this.bootRetries.get(sessionId);
    if (retry) {
      clearTimeout(retry);
      this.bootRetries.delete(sessionId);
    }
    if (autostartOnly && this.engines.has(sessionId)) return;
    this.names.set(sessionId, session.name);
    const engine = this.getOrCreateEngine(sessionId, session.engine);
    await this.startWithTimeout(sessionId, engine.start());
  }

  // Erro DENTRO da janela propaga — o cliente recebe
  // o motivo real na hora; erro DEPOIS do teto vira status FAILED persistido com lastError (o
  // polling mostra), nunca um unhandledRejection nem uma falha silenciosa.
  private async startWithTimeout(
    sessionId: string,
    op: Promise<unknown>,
  ): Promise<void> {
    const held = this.owned.get(sessionId);
    const epoch = held?.epoch;
    const engine = this.engines.get(sessionId);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        resolve();
      }, SessionManager.START_TIMEOUT_MS);
    });
    const tail = op.then(
      () => undefined,
      (e: unknown) => {
        if (!timedOut) throw e; // ainda na janela: repropaga para a rota
        const msg = (e as Error)?.message ?? String(e);
        this.logger.error(`start em background falhou (${sessionId}): ${msg}`);
        if (
          this.owned.get(sessionId) !== held ||
          held?.epoch !== epoch ||
          this.engines.get(sessionId) !== engine
        )
          return;
        try {
          void this.lease
            .updateStatus(sessionId, this.epochOf(sessionId), 'FAILED', {
              lastError: msg,
            })
            .catch((e2) =>
              this.logger.error(
                `não persisti o status FAILED (${sessionId}): ${(e2 as Error).message}`,
              ),
            );
        } catch {
          // Perdeu o lease no intervalo do start: não grava FAILED por cima do novo dono.
        }
      },
    );
    try {
      await Promise.race([tail, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async settledWithin(
    op: Promise<unknown> | undefined,
    ms: number,
  ): Promise<boolean> {
    if (!op) return true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), ms);
    });
    const settled = Promise.resolve(op).then(
      () => true,
      (e: unknown) => {
        this.logger.warn(
          `Encerramento da engine falhou: ${(e as Error).message}`,
        );
        return false;
      },
    );
    try {
      return await Promise.race([settled, deadline]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private stopEngine(
    sessionId: string,
    engine: IEngine,
    ms: number,
  ): Promise<boolean> {
    let pending = this.pendingStops.get(sessionId);
    if (!pending) {
      pending = engine.stop();
      this.pendingStops.set(sessionId, pending);
      void pending.then(
        () => {
          if (this.pendingStops.get(sessionId) === pending)
            this.pendingStops.delete(sessionId);
        },
        () => {
          if (this.pendingStops.get(sessionId) === pending)
            this.pendingStops.delete(sessionId);
        },
      );
    }
    return this.settledWithin(pending, ms);
  }

  stop(sessionId: string): Promise<void> {
    return this.runExclusive(sessionId, () => this.stopUnlocked(sessionId));
  }

  private async stopUnlocked(
    sessionId: string,
    keepLease = false,
  ): Promise<void> {
    const engine = this.engines.get(sessionId);
    if (!engine) {
      // Após crash o banco ainda pode dizer WORKING/DEGRADED sem engine em nenhuma réplica.
      // A posse no banco, não esse status antigo, decide se podemos parar a sessão.
      const epoch = await this.ensureLease(sessionId);
      await this.lease.updateStatus(sessionId, epoch, 'STOPPED', {
        meJid: null,
        mePushName: null,
        lastError: null,
        lastErrorDetails: null,
      });
      if (!keepLease) await this.releaseLease(sessionId);
      return;
    }
    if (!this.isOwner(sessionId)) throw new SessionBusyError();
    if (!(await this.stopEngine(sessionId, engine, 10_000)))
      throw new SessionBusyError();
    await this.statusWrites.get(sessionId);
    if (!keepLease) await this.releaseLease(sessionId);
  }

  restart(sessionId: string): Promise<void> {
    return this.runExclusive(sessionId, async () => {
      // Após crash pode não existir engine em memória, embora o banco ainda registre FAILED ou
      // DEGRADED. A aquisição resolve a disputa real; o status persistido não é prova de posse.
      if (!this.engines.has(sessionId)) {
        await this.ensureLease(sessionId);
        await this.startUnlocked(sessionId);
        return;
      }
      await this.stopUnlocked(sessionId, true);
      // start já se auto-limita (START_TIMEOUT_MS) e propaga erro rápido — sem wrap extra.
      await this.startUnlocked(sessionId);
    });
  }

  logout(sessionId: string): Promise<void> {
    return this.runExclusive(sessionId, () => this.logoutUnlocked(sessionId));
  }

  private async logoutUnlocked(sessionId: string): Promise<void> {
    const epoch = await this.ensureLease(sessionId);
    const engine = this.engines.get(sessionId);
    if (engine) {
      if (!(await this.settledWithin(engine.logout(), 12_000))) {
        // O logout remoto do wwebjs não é cancelável. Enquanto pendente, a engine não confirma
        // stop/shutdown e o manager mantém a lease; o LocalAuth só toca disco sob fencing.
        if (engine.engineName === 'wwebjs') throw new SessionBusyError();
        // Mesmo se o logout remoto falhar, fecha a engine local antes de limpar o login.
        // Só solta o lease depois; o epoch novo veta callbacks
        // tardios do auth store antigo.
        if (
          !(await this.settledWithin(
            engine.shutdown?.() ?? engine.stop(),
            10_000,
          ))
        )
          throw new SessionBusyError();
        const next = await this.lease.clearAuth(
          sessionId,
          this.epochOf(sessionId),
        );
        this.owned.get(sessionId)!.epoch = next;
      }
      if (engine.engineName === 'wwebjs')
        await this.purgeAuthDir(sessionId, this.epochOf(sessionId));
      await this.statusWrites.get(sessionId);
      this.engines.delete(sessionId);
      this.lastStatusKey.delete(sessionId);
      await this.releaseLease(sessionId);
      return;
    }
    const next = await this.lease.clearAuth(sessionId, epoch);
    this.owned.get(sessionId)!.epoch = next;
    // Sem engine no mapa: as creds do wwebjs estão em disco (LocalAuth), não no Postgres acima.
    // Purga o perfil da sessão (no-op se for Baileys). Sem isto, o logout não limpava o wwebjs.
    await this.purgeAuthDir(sessionId, next);
    await this.lease.updateStatus(sessionId, next, 'STOPPED', {
      meJid: null,
      mePushName: null,
    });
    await this.releaseLease(sessionId);
  }

  // "Novo QR" de verdade: derruba o socket atual, limpa as credenciais persistidas e sobe um
  // socket novo — o caminho de recuperação para sessão desconectada pelo celular (creds mortas:
  // restart puro reconecta com elas e volta a falhar sem nunca gerar QR). De propósito NÃO faz
  // sock.logout() (round-trip com o WhatsApp): com creds mortas ele só trava, e o timeout abriria
  // corrida entre a limpeza tardia da engine velha e as creds novas do QR seguinte. Sessão WORKING
  // que queira desvincular "educadamente" do celular: usar POST /:id/logout.
  newQr(sessionId: string): Promise<void> {
    return this.runExclusive(sessionId, () => this.newQrUnlocked(sessionId));
  }

  private async purgeAuthDir(sessionId: string, epoch: bigint): Promise<void> {
    // O rename síncrono ocorre enquanto a linha está travada. O rm posterior opera só sobre
    // o caminho exclusivo descartado: mesmo se passar do teto, não alcança o próximo perfil.
    const detached = await this.lease.fenced(sessionId, epoch, async () =>
      WWebJSEngine.detachAuthDir(sessionId),
    );
    if (
      !(await this.settledWithin(
        WWebJSEngine.purgeDetachedAuthDir(detached),
        10_000,
      ))
    )
      this.logger.warn(`Limpeza do perfil descartado pendente: ${detached}`);
  }

  // E27 (D-037): "gerar QR" pedido pelo link público. Não espera na fila (failFast → o link responde
  // "já estamos preparando"). `check` roda DENTRO do lock: relê a sessão, confere a fase e reserva a
  // cota do link (erro = nada acontece). Depois, a engine em memória é conferida e retirada do mapa
  // no MESMO tick (sem await): se ela saiu do repouso (alguém iniciou/conectou), nada é apagado.
  newQrForConnectLink(
    sessionId: string,
    check: () => Promise<void>,
  ): Promise<void> {
    return this.runExclusive(
      sessionId,
      async () => {
        const alreadyOwned = this.isOwner(sessionId);
        await this.ensureLease(sessionId);
        try {
          await check();
          const status = this.engines.get(sessionId)?.getStatus();
          if (
            status !== undefined &&
            status !== 'STOPPED' &&
            status !== 'DEGRADED'
          ) {
            throw new SessionBusyError();
          }
          return await this.newQrUnlocked(sessionId);
        } catch (e) {
          if (!alreadyOwned && !this.engines.has(sessionId))
            await this.releaseLease(sessionId);
          throw e;
        }
      },
      { failFast: true },
    );
  }

  // E27 (D-037): a sessão conectou pelo link com um número diferente do esperado. Desvincula o
  // aparelho (logout da engine: remove-companion-device + limpa creds), grava STOPPED com o motivo
  // (vira webhook session.status) e devolve o "último número" ao esperado. Só faz algo se a engine
  // estiver NESTE processo (réplica dona) — sem ela, um logout só no banco não derrubaria o socket.
  // `withoutEngine: 'clear'` (reserva da timeline, sessão já fora de WORKING): sem engine neste
  // processo, limpa o login salvo como o logout sem engine e grava STOPPED com o motivo.
  rejectConnectedAccount(
    sessionId: string,
    reason: string,
    restoreLastMeJid: string | null,
    opts: { withoutEngine?: 'skip' | 'clear' } = {},
  ): Promise<void> {
    const hadOwnedEngine =
      this.engines.has(sessionId) && this.isOwner(sessionId);
    return this.runExclusive(sessionId, async () => {
      const engine = this.engines.get(sessionId);
      if (!engine) {
        if (opts.withoutEngine !== 'clear' && !hadOwnedEngine) return;
        const epoch = await this.ensureLease(sessionId);
        const next = await this.lease.clearAuth(sessionId, epoch);
        this.owned.get(sessionId)!.epoch = next;
        await this.purgeAuthDir(sessionId, next);
        await this.lease.updateStatus(
          sessionId,
          this.epochOf(sessionId),
          'STOPPED',
          {
            lastError: reason,
          },
        );
        await this.lease.setLastMeJid(
          sessionId,
          this.epochOf(sessionId),
          restoreLastMeJid,
        );
        await this.releaseLease(sessionId);
        return;
      }
      // Fora do mapa ANTES do logout (como no newQr): o guard de onEvent descarta o STOPPED sem
      // motivo do próprio logout — sai um único session.status STOPPED, o nosso, com o motivo.
      this.engines.delete(sessionId);
      this.lastStatusKey.delete(sessionId);
      try {
        if (!(await this.settledWithin(engine.logout(), 12_000))) {
          if (engine.engineName === 'wwebjs') {
            throw new SessionBusyError();
          }
          if (
            !(await this.settledWithin(
              engine.shutdown?.() ?? engine.stop(),
              10_000,
            ))
          )
            throw new SessionBusyError();
          const next = await this.lease.clearAuth(
            sessionId,
            this.epochOf(sessionId),
          );
          this.owned.get(sessionId)!.epoch = next;
        }
        // Client.logout pode falhar antes de chamar LocalAuth.logout; nesse caso a engine
        // fecha, mas o perfil do número rejeitado ainda precisa sair do caminho ativo.
        if (engine.engineName === 'wwebjs')
          await this.purgeAuthDir(sessionId, this.epochOf(sessionId));
        // Escritas de status que já estavam na fila desta sessão antes da nossa.
        await this.statusWrites.get(sessionId);
        await this.handleEngineEvent(sessionId, 'session.status', {
          status: 'STOPPED',
          meJid: null,
          mePushName: null,
          error: reason,
        });
        await this.lease.setLastMeJid(
          sessionId,
          this.epochOf(sessionId),
          restoreLastMeJid,
        );
        await this.releaseLease(sessionId);
      } catch (error) {
        // Falha de logout/teardown NÃO libera a posse de um socket que ainda pode estar vivo.
        if (!this.engines.has(sessionId)) this.engines.set(sessionId, engine);
        throw error;
      }
    });
  }

  private async newQrUnlocked(sessionId: string): Promise<void> {
    const epoch = await this.ensureLease(sessionId);
    const engine = this.engines.get(sessionId);
    // Fora do mapa ANTES do stop: o guard de onEvent passa a ignorar eventos tardios da engine
    // velha, e o start abaixo cria uma instância nova em vez de reaproveitar a antiga.
    this.engines.delete(sessionId);
    // Esquece o dedup de status: a engine nova (QR → STARTING → WORKING) deve publicar do zero.
    this.lastStatusKey.delete(sessionId);
    if (engine && !(await this.stopEngine(sessionId, engine, 10_000))) {
      if (engine) this.engines.set(sessionId, engine);
      throw new SessionBusyError();
    }
    const next = await this.lease.clearAuth(sessionId, epoch);
    this.owned.get(sessionId)!.epoch = next;
    // wwebjs: as creds vivem em disco (LocalAuth), não no Postgres — sem purgar, o LocalAuth
    // restaurava o MESMO perfil no start abaixo e o new-qr era no-op (a sessão voltava sem QR novo).
    // Chamado APÓS o stop (Chromium morto). No-op para sessão Baileys.
    await this.purgeAuthDir(sessionId, next);
    await this.startUnlocked(sessionId);
  }

  remove(sessionId: string): Promise<void> {
    return this.runExclusive(sessionId, () => this.removeUnlocked(sessionId));
  }

  private async removeUnlocked(sessionId: string): Promise<void> {
    await this.ensureLease(sessionId);
    const engine = this.engines.get(sessionId);
    // Remove do mapa ANTES de deletar/parar: a partir daqui o guard de onEvent ignora qualquer
    // evento tardio desta engine (a sessão vai deixar de existir).
    this.engines.delete(sessionId);
    this.names.delete(sessionId);
    this.lastStatusKey.delete(sessionId);
    // Para a engine com teto de tempo — não deixa um Chromium/socket travado pendurar a exclusão.
    if (engine && !(await this.stopEngine(sessionId, engine, 8_000))) {
      if (engine) this.engines.set(sessionId, engine);
      throw new SessionBusyError();
    }
    // Remove o perfil do Chromium do disco (wwebjs) — sem isto, cada sessão WWEBJS criada e removida
    // deixava dezenas–centenas de MB órfãos no volume persistente para sempre. No-op para Baileys.
    const detached = await this.lease.fenced(
      sessionId,
      this.epochOf(sessionId),
      async (tx) => {
        const path = WWebJSEngine.detachAuthDir(sessionId);
        await tx.waSession.delete({ where: { id: sessionId } });
        return path;
      },
    );
    if (
      !(await this.settledWithin(
        WWebJSEngine.purgeDetachedAuthDir(detached),
        10_000,
      ))
    )
      this.logger.warn(`Limpeza do perfil descartado pendente: ${detached}`);
    await this.releaseLease(sessionId);
  }

  getQr(sessionId: string): string | null {
    return this.engines.get(sessionId)?.getQrBase64() ?? null;
  }

  getPairingCode(sessionId: string): string | null {
    return this.engines.get(sessionId)?.getPairingCode?.() ?? null;
  }

  requestPairingCode(sessionId: string, phoneNumber: string): Promise<string> {
    return this.runExclusive(sessionId, () =>
      this.requestPairingCodeUnlocked(sessionId, phoneNumber),
    );
  }

  private async requestPairingCodeUnlocked(
    sessionId: string,
    phoneNumber: string,
  ): Promise<string> {
    const session = await this.repo.findById(sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    if (session.status === 'WORKING') {
      throw new Error('Sessão já pareada; código de pareamento indisponível');
    }
    if (session.engine === 'BAILEYS') {
      // Uma sessão pareada por QR pode manter creds.registered=false na rc14. Conferir me antes
      // de iniciar um socket parado evita reconectar a conta só para recusar o pedido de código.
      const row = await this.prisma.waSession.findUnique({
        where: { id: sessionId },
        select: { creds: true },
      });
      const creds = row?.creds;
      if (creds && typeof creds === 'object' && 'me' in creds && creds.me) {
        throw new Error('Sessão já pareada; código de pareamento indisponível');
      }
    }
    await this.ensureLease(sessionId);
    const engine = this.getOrCreateEngine(sessionId, session.engine);
    if (engine.getStatus() === 'WORKING') {
      throw new Error('Sessão já pareada; código de pareamento indisponível');
    }
    if (engine.getStatus() === 'STOPPED') {
      // Mesmo teto do start normal — sem ele, um wwebjs preso no initialize pendurava a rota.
      await this.startWithTimeout(sessionId, engine.start());
    }
    // O Baileys espera connection.update('connecting') ou o primeiro QR na própria engine,
    // com teto. O wwebjs já espera a inicialização do Client no start().
    // E27: o pedido roda dentro do lock de ciclo de vida — sem teto, um page.evaluate pendurado do
    // wwebjs (até o protocolTimeout de 240 s) seguraria Parar/Logout/Novo QR/remover da sessão, que
    // antes destravavam o pairing. Rejeita (nunca resolve vazio): a rota devolve 409.
    return this.rejectAfter(
      engine.requestPairingCode(phoneNumber),
      SessionManager.PAIRING_REQUEST_TIMEOUT_MS,
      'Sessão não conectada: o código de pareamento não chegou a tempo',
    );
  }

  // Baileys: espera de até 10 s pelo socket + envio com connectTimeout de 20 s — 45 s cobre folgado.
  private static readonly PAIRING_REQUEST_TIMEOUT_MS = 45_000;

  // Diferente do withTimeout (que resolve em silêncio): estourou → rejeita com `message`. A operação
  // órfã segue sozinha; a rejeição tardia dela é engolida.
  private async rejectAfter<T>(
    op: Promise<T>,
    ms: number,
    message: string,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    op.catch(() => undefined);
    try {
      return await Promise.race([op, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async sendText(
    sessionId: string,
    to: string,
    text: string,
    opts?: SendOptions,
  ): Promise<{ keyId: string; jid: string }> {
    const engine = await this.sending(sessionId);
    return engine.sendText(to, text, opts);
  }

  async sendMedia(
    sessionId: string,
    to: string,
    input: SendMediaInput,
  ): Promise<{ keyId: string; jid: string }> {
    return (await this.sending(sessionId)).sendMedia(to, input);
  }

  async sendLocation(
    sessionId: string,
    to: string,
    input: SendLocationInput,
  ): Promise<{ keyId: string; jid: string }> {
    return (await this.sending(sessionId)).sendLocation(to, input);
  }

  async sendPoll(
    sessionId: string,
    to: string,
    input: SendPollInput,
  ): Promise<{ keyId: string; jid: string }> {
    return (await this.sending(sessionId)).sendPoll(to, input);
  }

  async sendPresence(
    sessionId: string,
    to: string,
    state: PresenceState,
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).sendPresence(to, state);
  }

  async setProfileStatus(sessionId: string, status: string): Promise<void> {
    return (await this.ownedWorking(sessionId)).setProfileStatus(status);
  }
  async setProfileName(sessionId: string, name: string): Promise<void> {
    return (await this.ownedWorking(sessionId)).setProfileName(name);
  }
  async setProfilePhoto(
    sessionId: string,
    image: Buffer,
    mimetype: string,
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).setProfilePhoto(
      image,
      mimetype,
    );
  }

  async markRead(
    sessionId: string,
    chatJid: string,
    msgId: string,
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).markRead(chatJid, msgId);
  }

  // W7 — inbox/histórico (backfill). Só WWEBJS; Baileys lança UnsupportedEngineOperationError.
  async listChats(sessionId: string, limit: number): Promise<ChatSummary[]> {
    return (await this.ownedWorking(sessionId)).listChats(limit);
  }
  async fetchChatHistory(
    sessionId: string,
    chatJid: string,
    limit: number,
  ): Promise<HistoryMessage[]> {
    return (await this.ownedWorking(sessionId)).fetchChatHistory(
      chatJid,
      limit,
    );
  }
  async setChatFlag(
    sessionId: string,
    chatJid: string,
    flag: ChatFlag,
    enabled: boolean,
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).setChatFlag(
      chatJid,
      flag,
      enabled,
    );
  }

  async sendReaction(
    sessionId: string,
    chatJid: string,
    msgId: string,
    fromMe: boolean,
    emoji: string,
  ): Promise<void> {
    return (await this.sending(sessionId)).sendReaction(
      chatJid,
      msgId,
      fromMe,
      emoji,
    );
  }

  // P-068 (E24) — encaminhar: a engine carrega e confere a original UMA vez e devolve quem envia
  // para UM destino. O laço (um destino por vez, intervalo, idempotência, gate cold) é do
  // messaging (ForwardService) — o SessionManager só transporta.
  async prepareForward(
    sessionId: string,
    src: ForwardSource,
  ): Promise<PreparedForward> {
    const engine = await this.ownedWorking(sessionId);
    const prepared = await engine.prepareForward(src);
    return {
      ...prepared,
      // O laço do ForwardService espaça cada destino. A restrição pode começar DURANTE esse
      // intervalo: conferir no momento de cada envio, não só ao preparar a original.
      send: async (to, opts) => {
        if ((await this.sending(sessionId)) !== engine) {
          throw new Error(
            'Sessão reconectou durante o encaminhamento; repita o pedido',
          );
        }
        return prepared.send(to, opts);
      },
    };
  }

  private async sending(sessionId: string): Promise<IEngine> {
    if (this.shuttingDown) throw new LeaseLostError();
    const held = this.owned.get(sessionId);
    const epoch = this.epochOf(sessionId);
    if (!(await this.lease.isCurrent(sessionId, epoch))) {
      if (held && this.owned.get(sessionId) === held && held.epoch === epoch)
        void this.drain(sessionId, held);
      throw new LeaseLostError();
    }
    if (this.owned.get(sessionId) !== held || held?.epoch !== epoch)
      throw new LeaseLostError();
    const gate = await this.guardrail.canSendMessage(sessionId);
    if (!gate.allowed) {
      throw new SessionQuarantinedException(gate.state, gate.reason);
    }
    if (
      this.owned.get(sessionId) !== held ||
      held?.epoch !== epoch ||
      !(await this.lease.isCurrent(sessionId, epoch))
    ) {
      if (held && this.owned.get(sessionId) === held && held.epoch === epoch)
        void this.drain(sessionId, held);
      throw new LeaseLostError();
    }
    return this.working(sessionId);
  }

  // Retorna a engine só se a sessão estiver conectada (WORKING) — usado pelas operações F5.
  private working(sessionId: string): IEngine {
    if (this.shuttingDown) throw new SessionBusyError();
    this.epochOf(sessionId);
    const engine = this.engines.get(sessionId);
    if (!engine) throw new SessionNotWorkingError('Sessão não iniciada');
    if (engine.getStatus() !== 'WORKING') {
      throw new SessionNotWorkingError('Sessão não está conectada');
    }
    return engine;
  }

  // RPCs que alteram o WhatsApp também consultam a posse no banco imediatamente antes da
  // chamada; o relógio local do renewal sozinho não barra uma réplica antiga após takeover.
  private async ownedWorking(sessionId: string): Promise<IEngine> {
    if (this.shuttingDown) throw new LeaseLostError();
    const held = this.owned.get(sessionId);
    const epoch = this.epochOf(sessionId);
    const engine = this.working(sessionId);
    if (
      !(await this.lease.isCurrent(sessionId, epoch)) ||
      this.owned.get(sessionId) !== held ||
      held?.epoch !== epoch
    ) {
      if (held && this.owned.get(sessionId) === held && held.epoch === epoch)
        void this.drain(sessionId, held);
      throw new LeaseLostError();
    }
    return engine;
  }

  // ---- Grupos (F5) ----
  async listGroups(sessionId: string): Promise<GroupInfo[]> {
    return (await this.ownedWorking(sessionId)).listGroups();
  }
  async groupInfo(sessionId: string, jid: string): Promise<GroupInfo> {
    return (await this.ownedWorking(sessionId)).groupInfo(jid);
  }
  async createGroup(
    sessionId: string,
    subject: string,
    participants: string[],
  ): Promise<GroupInfo> {
    return (await this.ownedWorking(sessionId)).createGroup(
      subject,
      participants,
    );
  }
  async updateParticipants(
    sessionId: string,
    jid: string,
    action: GroupParticipantAction,
    participants: string[],
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).updateParticipants(
      jid,
      action,
      participants,
    );
  }
  async leaveGroup(sessionId: string, jid: string): Promise<void> {
    return (await this.ownedWorking(sessionId)).leaveGroup(jid);
  }
  async setGroupSubject(
    sessionId: string,
    jid: string,
    subject: string,
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).setGroupSubject(jid, subject);
  }
  async setGroupDescription(
    sessionId: string,
    jid: string,
    description: string,
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).setGroupDescription(
      jid,
      description,
    );
  }
  async groupInviteCode(sessionId: string, jid: string): Promise<string> {
    return (await this.ownedWorking(sessionId)).groupInviteCode(jid);
  }
  async groupRevokeInvite(sessionId: string, jid: string): Promise<string> {
    return (await this.ownedWorking(sessionId)).groupRevokeInvite(jid);
  }
  async groupMembershipRequests(
    sessionId: string,
    jid: string,
  ): Promise<MembershipRequest[]> {
    return (await this.ownedWorking(sessionId)).groupMembershipRequests(jid);
  }
  async groupMembershipAction(
    sessionId: string,
    jid: string,
    action: MembershipAction,
    participants?: string[],
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).groupMembershipAction(
      jid,
      action,
      participants,
    );
  }
  async setGroupSetting(
    sessionId: string,
    jid: string,
    setting: GroupSettingKey,
    enabled: boolean,
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).setGroupSetting(
      jid,
      setting,
      enabled,
    );
  }
  async setGroupPhoto(
    sessionId: string,
    jid: string,
    image: Buffer,
    mimetype: string,
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).setGroupPhoto(
      jid,
      image,
      mimetype,
    );
  }

  // ---- Contatos (F5) ----
  async checkNumbers(
    sessionId: string,
    numbers: string[],
  ): Promise<ContactCheck[]> {
    return (await this.ownedWorking(sessionId)).checkNumbers(numbers);
  }
  async profilePicture(sessionId: string, jid: string): Promise<string | null> {
    return (await this.ownedWorking(sessionId)).profilePicture(jid);
  }
  async setBlock(
    sessionId: string,
    jid: string,
    action: 'block' | 'unblock',
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).setBlock(jid, action);
  }
  async saveContact(
    sessionId: string,
    jid: string,
    input: SaveContactInput,
  ): Promise<void> {
    return (await this.ownedWorking(sessionId)).saveContact(jid, input);
  }
  async removeContact(sessionId: string, jid: string): Promise<void> {
    return (await this.ownedWorking(sessionId)).removeContact(jid);
  }

  // ---- Canais (F5 — beta) ----
  async createChannel(
    sessionId: string,
    name: string,
    description?: string,
  ): Promise<ChannelInfo> {
    return (await this.ownedWorking(sessionId)).createChannel(
      name,
      description,
    );
  }
  async channelInfo(sessionId: string, jid: string): Promise<ChannelInfo> {
    return (await this.ownedWorking(sessionId)).channelInfo(jid);
  }
  async followChannel(sessionId: string, jid: string): Promise<void> {
    return (await this.ownedWorking(sessionId)).followChannel(jid);
  }
  async unfollowChannel(sessionId: string, jid: string): Promise<void> {
    return (await this.ownedWorking(sessionId)).unfollowChannel(jid);
  }
}
