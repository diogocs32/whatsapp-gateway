import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';
import type { Env } from '../../../bootstrap/config';
import { PrismaService, Prisma } from '../../../infra/prisma/prisma.service';
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
export class SessionBusyError extends Error {
  constructor() {
    super('Operação em andamento na sessão');
    this.name = 'SessionBusyError';
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
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const candidates = await this.repo.findAutostart();
    if (candidates.length === 0) {
      this.rehydrated = true;
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
      for (const s of ordered) {
        this.logger.log(`Reidratando sessão "${s.name}" (${s.engine})`);
        try {
          await this.start(s.id);
        } catch (e) {
          this.logger.error(
            `Falha ao reidratar ${s.name}: ${(e as Error).message}`,
          );
        }
      }
      this.rehydrated = true;
    })();
  }

  async onModuleDestroy(): Promise<void> {
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
      logger: pino({
        level: this.config.get('WA_LOG_LEVEL', { infer: true }),
      }),
      // Guard: só processa eventos enquanto ESTA engine for a registrada para a sessão. Se ela
      // foi descartada (remove/discardOrphan) ou substituída, seus eventos tardios são ignorados
      // — sem isto, uma engine órfã reconectando persistiria status de sessão já removida (loop
      // de P2025 no update + violação de FK no insert da timeline).
      onEvent: (name, payload) => {
        if (this.engines.get(sessionId) !== created) return;
        if (name === 'session.status' || name === 'session.client_too_old') {
          void this.enqueueStatusWrite(
            sessionId,
            created,
            `evento ${name}`,
            () => this.handleEngineEvent(sessionId, name, payload),
          );
        } else {
          void this.handleEngineEvent(sessionId, name, payload);
        }
      },
      onRestrictionSignal: async (signal) => {
        if (this.engines.get(sessionId) !== created) return;
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
        if (this.engines.get(sessionId) !== created) return;
        await this.enqueueStatusWrite(
          sessionId,
          created,
          'diagnóstico de desconexão',
          async () => {
            await this.repo.updateLastErrorDetails(sessionId, details);
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
      reportProxyFailure: (reason) =>
        this.proxyResolver.reportFailure(sessionId, reason),
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
        this.engines.get(sessionId) === engine ? write() : undefined,
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
  ): Promise<void> {
    // Engine REAL da sessão, capturada síncronamente ANTES dos awaits abaixo (persist/presign) para
    // não correr com um engines.delete concorrente. Antes o envelope rotulava TUDO como 'baileys',
    // inclusive sessões WWEBJS — o node n8n recebia a engine errada (contrato público).
    const engine = this.engines.get(sessionId)?.engineName ?? 'baileys';
    if (name === 'session.status') {
      await this.persistStatus(sessionId, payload as SessionStatePayload);
      // Dedup de status idêntico consecutivo. As engines RE-emitem session.status sem que nada
      // tenha mudado: o Baileys dispara WORKING em TODO connection 'open' (baileys.engine.ts:628),
      // então cada reconexão transitória de rede/proxy reemite WORKING já sendo WORKING; o wwebjs
      // reemite WORKING a cada heal (o 'ready' re-dispara). Sem dedup, cada uma dessas vira um
      // webhook → alerta no n8n (zap/telegram) dizendo "está WORKING" de novo — o "muitos alertas,
      // mas nada mudou". Chave = status + erro (meJid/mePushName continuam persistidos acima por
      // persistStatus, INDEPENDENTE do dedup do evento). persistStatus roda SEMPRE (antes deste
      // gate): mantém wa_sessions atualizado e a detecção de engine órfã (discardOrphan) intacta.
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
  ): Promise<void> {
    try {
      const found = await this.repo.updateStatus(sessionId, p.status, {
        meJid: p.meJid,
        mePushName: p.mePushName,
        lastError: p.error,
        lastErrorDetails:
          p.lastErrorDetails !== undefined
            ? p.lastErrorDetails
            : p.error === null
              ? null
              : undefined,
      });
      // A sessão não existe mais no banco, mas a engine seguiu viva emitindo status (órfã de um
      // ciclo anterior, ou exclusão feita por fora). Encerra e descarta a engine — corta o loop
      // de reconexão na raiz em vez de só engolir o erro a cada backoff.
      if (!found) await this.discardOrphan(sessionId);
    } catch (e) {
      this.logger.error(`persist status ${sessionId}: ${(e as Error).message}`);
    }
  }

  // Fila de descartes em andamento — evita reentrância (o stop() abaixo emite STOPPED, que o guard
  // de onEvent já ignora porque a engine saiu do mapa; este set cobre o resto).
  private readonly discarding = new Set<string>();

  // Encerra uma engine que perdeu seu registro no banco: para o socket/Chromium e a remove do mapa.
  private async discardOrphan(sessionId: string): Promise<void> {
    if (this.discarding.has(sessionId)) return;
    this.discarding.add(sessionId);
    const engine = this.engines.get(sessionId);
    this.engines.delete(sessionId);
    this.names.delete(sessionId);
    this.lastStatusKey.delete(sessionId);
    this.logger.warn(
      `Sessão ${sessionId} não existe mais no banco — encerrando engine órfã.`,
    );
    try {
      await engine?.stop();
    } catch {
      /* noop */
    } finally {
      this.discarding.delete(sessionId);
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

  private async startUnlocked(sessionId: string): Promise<void> {
    const session = await this.repo.findById(sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    this.names.set(sessionId, session.name);
    const engine = this.getOrCreateEngine(sessionId, session.engine);
    await this.startWithTimeout(sessionId, engine.start());
  }

  // Diferente do withTimeout (que engole tudo): erro DENTRO da janela propaga — o cliente recebe
  // o motivo real na hora; erro DEPOIS do teto vira status FAILED persistido com lastError (o
  // polling mostra), nunca um unhandledRejection nem uma falha silenciosa.
  private async startWithTimeout(
    sessionId: string,
    op: Promise<unknown>,
  ): Promise<void> {
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
        this.repo
          .updateStatus(sessionId, 'FAILED', { lastError: msg })
          .catch((e2) =>
            this.logger.error(
              `não persisti o status FAILED (${sessionId}): ${(e2 as Error).message}`,
            ),
          );
      },
    );
    try {
      await Promise.race([tail, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // Teto de tempo para operações de ciclo de vida da engine. Fechar o Chromium (wwebjs) ou o
  // round-trip de rede com o WhatsApp (logout Baileys) pode levar de segundos a minutos — ou travar.
  // Sem teto, a rota HTTP fica pendurada até o proxy (Traefik/Nginx) desistir (499/504) e o botão
  // parece "travado". Com o teto, a rota responde rápido; se a operação não terminou, ela segue em
  // background e o estado real aparece no polling de status (o guard de onEvent + as escritas
  // tolerantes garantem que isso não gere loop de erro).
  private async withTimeout(
    op: Promise<unknown> | undefined,
    ms: number,
  ): Promise<void> {
    if (!op) return;
    // Engole a rejeição (a engine já loga por dentro) para não virar unhandledRejection se o
    // timeout vencer a corrida.
    const guarded = Promise.resolve(op).then(
      () => undefined,
      () => undefined,
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    });
    try {
      await Promise.race([guarded, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  stop(sessionId: string): Promise<void> {
    return this.runExclusive(sessionId, () => this.stopUnlocked(sessionId));
  }

  private async stopUnlocked(sessionId: string): Promise<void> {
    await this.withTimeout(this.engines.get(sessionId)?.stop(), 10_000);
  }

  restart(sessionId: string): Promise<void> {
    return this.runExclusive(sessionId, async () => {
      await this.stopUnlocked(sessionId);
      // start já se auto-limita (START_TIMEOUT_MS) e propaga erro rápido — sem wrap extra.
      await this.startUnlocked(sessionId);
    });
  }

  logout(sessionId: string): Promise<void> {
    return this.runExclusive(sessionId, () => this.logoutUnlocked(sessionId));
  }

  private async logoutUnlocked(sessionId: string): Promise<void> {
    const engine = this.engines.get(sessionId);
    if (engine) {
      await this.withTimeout(engine.logout(), 12_000);
      this.engines.delete(sessionId);
      this.lastStatusKey.delete(sessionId);
      return;
    }
    await this.prisma.waAuthKey.deleteMany({ where: { sessionId } });
    // updateMany: se a sessão já foi removida, não lança P2025 (segue como no-op).
    await this.prisma.waSession.updateMany({
      where: { id: sessionId },
      data: { creds: Prisma.DbNull },
    });
    // Sem engine no mapa: as creds do wwebjs estão em disco (LocalAuth), não no Postgres acima.
    // Purga o perfil da sessão (no-op se for Baileys). Sem isto, o logout não limpava o wwebjs.
    await WWebJSEngine.purgeAuthDir(sessionId);
    await this.repo.updateStatus(sessionId, 'STOPPED', {
      meJid: null,
      mePushName: null,
    });
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
        await check();
        const status = this.engines.get(sessionId)?.getStatus();
        if (
          status !== undefined &&
          status !== 'STOPPED' &&
          status !== 'DEGRADED'
        ) {
          throw new SessionBusyError();
        }
        return this.newQrUnlocked(sessionId);
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
    return this.runExclusive(sessionId, async () => {
      const engine = this.engines.get(sessionId);
      if (!engine) {
        if (opts.withoutEngine !== 'clear') return;
        await this.logoutUnlocked(sessionId);
        await this.repo.updateStatus(sessionId, 'STOPPED', {
          lastError: reason,
        });
        await this.repo.setLastMeJid(sessionId, restoreLastMeJid);
        return;
      }
      // Fora do mapa ANTES do logout (como no newQr): o guard de onEvent descarta o STOPPED sem
      // motivo do próprio logout — sai um único session.status STOPPED, o nosso, com o motivo.
      this.engines.delete(sessionId);
      this.lastStatusKey.delete(sessionId);
      await this.withTimeout(engine.logout(), 12_000);
      // Escritas de status que já estavam na fila desta sessão antes da nossa.
      await this.statusWrites.get(sessionId);
      await this.handleEngineEvent(sessionId, 'session.status', {
        status: 'STOPPED',
        meJid: null,
        mePushName: null,
        error: reason,
      });
      await this.repo.setLastMeJid(sessionId, restoreLastMeJid);
    });
  }

  private async newQrUnlocked(sessionId: string): Promise<void> {
    const engine = this.engines.get(sessionId);
    // Fora do mapa ANTES do stop: o guard de onEvent passa a ignorar eventos tardios da engine
    // velha, e o start abaixo cria uma instância nova em vez de reaproveitar a antiga.
    this.engines.delete(sessionId);
    // Esquece o dedup de status: a engine nova (QR → STARTING → WORKING) deve publicar do zero.
    this.lastStatusKey.delete(sessionId);
    await this.withTimeout(engine?.stop(), 10_000);
    await this.prisma.waAuthKey.deleteMany({ where: { sessionId } });
    // updateMany: se a sessão já foi removida, não lança P2025 (segue como no-op).
    await this.prisma.waSession.updateMany({
      where: { id: sessionId },
      data: { creds: Prisma.DbNull },
    });
    // wwebjs: as creds vivem em disco (LocalAuth), não no Postgres — sem purgar, o LocalAuth
    // restaurava o MESMO perfil no start abaixo e o new-qr era no-op (a sessão voltava sem QR novo).
    // Chamado APÓS o stop (Chromium morto). No-op para sessão Baileys.
    await WWebJSEngine.purgeAuthDir(sessionId);
    await this.startUnlocked(sessionId);
  }

  remove(sessionId: string): Promise<void> {
    return this.runExclusive(sessionId, () => this.removeUnlocked(sessionId));
  }

  private async removeUnlocked(sessionId: string): Promise<void> {
    const engine = this.engines.get(sessionId);
    // Remove do mapa ANTES de deletar/parar: a partir daqui o guard de onEvent ignora qualquer
    // evento tardio desta engine (a sessão vai deixar de existir).
    this.engines.delete(sessionId);
    this.names.delete(sessionId);
    this.lastStatusKey.delete(sessionId);
    // Para a engine com teto de tempo — não deixa um Chromium/socket travado pendurar a exclusão.
    await this.withTimeout(engine?.stop(), 8_000);
    // Remove o perfil do Chromium do disco (wwebjs) — sem isto, cada sessão WWEBJS criada e removida
    // deixava dezenas–centenas de MB órfãos no volume persistente para sempre. No-op para Baileys.
    await WWebJSEngine.purgeAuthDir(sessionId);
    await this.repo.delete(sessionId);
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
    const engine = this.getOrCreateEngine(sessionId, session.engine);
    if (engine.getStatus() === 'WORKING') {
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

  sendPresence(
    sessionId: string,
    to: string,
    state: PresenceState,
  ): Promise<void> {
    return this.working(sessionId).sendPresence(to, state);
  }

  setProfileStatus(sessionId: string, status: string): Promise<void> {
    return this.working(sessionId).setProfileStatus(status);
  }
  setProfileName(sessionId: string, name: string): Promise<void> {
    return this.working(sessionId).setProfileName(name);
  }
  setProfilePhoto(
    sessionId: string,
    image: Buffer,
    mimetype: string,
  ): Promise<void> {
    return this.working(sessionId).setProfilePhoto(image, mimetype);
  }

  markRead(sessionId: string, chatJid: string, msgId: string): Promise<void> {
    return this.working(sessionId).markRead(chatJid, msgId);
  }

  // W7 — inbox/histórico (backfill). Só WWEBJS; Baileys lança UnsupportedEngineOperationError.
  listChats(sessionId: string, limit: number): Promise<ChatSummary[]> {
    return this.working(sessionId).listChats(limit);
  }
  fetchChatHistory(
    sessionId: string,
    chatJid: string,
    limit: number,
  ): Promise<HistoryMessage[]> {
    return this.working(sessionId).fetchChatHistory(chatJid, limit);
  }
  setChatFlag(
    sessionId: string,
    chatJid: string,
    flag: ChatFlag,
    enabled: boolean,
  ): Promise<void> {
    return this.working(sessionId).setChatFlag(chatJid, flag, enabled);
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
    const engine = this.working(sessionId);
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
    const gate = await this.guardrail.canSendMessage(sessionId);
    if (!gate.allowed) {
      throw new SessionQuarantinedException(gate.state, gate.reason);
    }
    return this.working(sessionId);
  }

  // Retorna a engine só se a sessão estiver conectada (WORKING) — usado pelas operações F5.
  private working(sessionId: string): IEngine {
    const engine = this.engines.get(sessionId);
    if (!engine) throw new Error('Sessão não iniciada');
    if (engine.getStatus() !== 'WORKING') {
      throw new Error('Sessão não está conectada');
    }
    return engine;
  }

  // ---- Grupos (F5) ----
  listGroups(sessionId: string): Promise<GroupInfo[]> {
    return this.working(sessionId).listGroups();
  }
  groupInfo(sessionId: string, jid: string): Promise<GroupInfo> {
    return this.working(sessionId).groupInfo(jid);
  }
  createGroup(
    sessionId: string,
    subject: string,
    participants: string[],
  ): Promise<GroupInfo> {
    return this.working(sessionId).createGroup(subject, participants);
  }
  updateParticipants(
    sessionId: string,
    jid: string,
    action: GroupParticipantAction,
    participants: string[],
  ): Promise<void> {
    return this.working(sessionId).updateParticipants(
      jid,
      action,
      participants,
    );
  }
  leaveGroup(sessionId: string, jid: string): Promise<void> {
    return this.working(sessionId).leaveGroup(jid);
  }
  setGroupSubject(
    sessionId: string,
    jid: string,
    subject: string,
  ): Promise<void> {
    return this.working(sessionId).setGroupSubject(jid, subject);
  }
  setGroupDescription(
    sessionId: string,
    jid: string,
    description: string,
  ): Promise<void> {
    return this.working(sessionId).setGroupDescription(jid, description);
  }
  groupInviteCode(sessionId: string, jid: string): Promise<string> {
    return this.working(sessionId).groupInviteCode(jid);
  }
  groupRevokeInvite(sessionId: string, jid: string): Promise<string> {
    return this.working(sessionId).groupRevokeInvite(jid);
  }
  groupMembershipRequests(
    sessionId: string,
    jid: string,
  ): Promise<MembershipRequest[]> {
    return this.working(sessionId).groupMembershipRequests(jid);
  }
  groupMembershipAction(
    sessionId: string,
    jid: string,
    action: MembershipAction,
    participants?: string[],
  ): Promise<void> {
    return this.working(sessionId).groupMembershipAction(
      jid,
      action,
      participants,
    );
  }
  setGroupSetting(
    sessionId: string,
    jid: string,
    setting: GroupSettingKey,
    enabled: boolean,
  ): Promise<void> {
    return this.working(sessionId).setGroupSetting(jid, setting, enabled);
  }
  setGroupPhoto(
    sessionId: string,
    jid: string,
    image: Buffer,
    mimetype: string,
  ): Promise<void> {
    return this.working(sessionId).setGroupPhoto(jid, image, mimetype);
  }

  // ---- Contatos (F5) ----
  checkNumbers(sessionId: string, numbers: string[]): Promise<ContactCheck[]> {
    return this.working(sessionId).checkNumbers(numbers);
  }
  profilePicture(sessionId: string, jid: string): Promise<string | null> {
    return this.working(sessionId).profilePicture(jid);
  }
  setBlock(
    sessionId: string,
    jid: string,
    action: 'block' | 'unblock',
  ): Promise<void> {
    return this.working(sessionId).setBlock(jid, action);
  }
  saveContact(
    sessionId: string,
    jid: string,
    input: SaveContactInput,
  ): Promise<void> {
    return this.working(sessionId).saveContact(jid, input);
  }
  removeContact(sessionId: string, jid: string): Promise<void> {
    return this.working(sessionId).removeContact(jid);
  }

  // ---- Canais (F5 — beta) ----
  createChannel(
    sessionId: string,
    name: string,
    description?: string,
  ): Promise<ChannelInfo> {
    return this.working(sessionId).createChannel(name, description);
  }
  channelInfo(sessionId: string, jid: string): Promise<ChannelInfo> {
    return this.working(sessionId).channelInfo(jid);
  }
  followChannel(sessionId: string, jid: string): Promise<void> {
    return this.working(sessionId).followChannel(jid);
  }
  unfollowChannel(sessionId: string, jid: string): Promise<void> {
    return this.working(sessionId).unfollowChannel(jid);
  }
}
