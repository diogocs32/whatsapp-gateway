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
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from '../domain/session.repository';
import type { Session } from '../domain/session.entity';
import { EngineFactory } from '../infrastructure/engine.factory';
import type {
  ChannelInfo,
  ContactCheck,
  EngineEventName,
  GroupInfo,
  GroupParticipantAction,
  IEngine,
  MessagePayload,
  PresenceState,
  SaveContactInput,
  SendMediaInput,
  SendOptions,
  SessionStatePayload,
  WaEventEnvelope,
} from './engine.port';

@Injectable()
export class SessionManager implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SessionManager.name);
  private readonly engines = new Map<string, IEngine>();
  private readonly names = new Map<string, string>();

  constructor(
    @Inject(SESSION_REPOSITORY) private readonly repo: SessionRepository,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly eventBus: EventBus,
    private readonly proxyResolver: ProxyResolver,
    private readonly mediaStorage: MediaStorage,
    private readonly contactDirectory: ContactDirectory,
    private readonly engineFactory: EngineFactory,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const candidates = await this.repo.findAutostart();
    if (candidates.length === 0) return;
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
    })();
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.engines.values()].map((e) => e.stop().catch(() => undefined)),
    );
  }

  private getOrCreateEngine(sessionId: string, engineType: string): IEngine {
    const existing = this.engines.get(sessionId);
    if (existing) return existing;
    const created = this.engineFactory.create(engineType, {
      sessionId,
      deviceName: 'WhatsApp Gateway',
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
        void this.handleEngineEvent(sessionId, name, payload);
      },
      resolveAgent: () => this.proxyResolver.resolveAgent(sessionId),
      resolveProxyConfig: () =>
        this.proxyResolver.resolveProxyConfig(sessionId),
      storeMedia: (key, body, contentType) =>
        this.mediaStorage.put(key, body, contentType),
      contacts: {
        record: (c) =>
          void this.contactDirectory.record(sessionId, c).catch(() => {}),
        recordMany: (list) =>
          void this.contactDirectory
            .recordMany(sessionId, list)
            .catch(() => {}),
        loadLidMap: () => this.contactDirectory.lidMap(sessionId),
        resolveNames: (keys) => this.contactDirectory.namesFor(sessionId, keys),
      },
    });
    this.engines.set(sessionId, created);
    return created;
  }

  private async handleEngineEvent(
    sessionId: string,
    name: EngineEventName,
    payload: unknown,
  ): Promise<void> {
    if (name === 'session.status') {
      await this.persistStatus(sessionId, payload as SessionStatePayload);
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
      engine: 'baileys',
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

  async start(sessionId: string): Promise<void> {
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
          .catch(() => undefined);
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

  async stop(sessionId: string): Promise<void> {
    await this.withTimeout(this.engines.get(sessionId)?.stop(), 10_000);
  }

  async restart(sessionId: string): Promise<void> {
    await this.stop(sessionId);
    // start() já se auto-limita (START_TIMEOUT_MS) e propaga erro rápido — sem wrap extra.
    await this.start(sessionId);
  }

  async logout(sessionId: string): Promise<void> {
    const engine = this.engines.get(sessionId);
    if (engine) {
      await this.withTimeout(engine.logout(), 12_000);
      this.engines.delete(sessionId);
      return;
    }
    await this.prisma.waAuthKey.deleteMany({ where: { sessionId } });
    // updateMany: se a sessão já foi removida, não lança P2025 (segue como no-op).
    await this.prisma.waSession.updateMany({
      where: { id: sessionId },
      data: { creds: Prisma.DbNull },
    });
    await this.repo.updateStatus(sessionId, 'STOPPED', {
      meJid: null,
      mePushName: null,
    });
  }

  async remove(sessionId: string): Promise<void> {
    const engine = this.engines.get(sessionId);
    // Remove do mapa ANTES de deletar/parar: a partir daqui o guard de onEvent ignora qualquer
    // evento tardio desta engine (a sessão vai deixar de existir).
    this.engines.delete(sessionId);
    this.names.delete(sessionId);
    // Para a engine com teto de tempo — não deixa um Chromium/socket travado pendurar a exclusão.
    await this.withTimeout(engine?.stop(), 8_000);
    await this.repo.delete(sessionId);
  }

  getQr(sessionId: string): string | null {
    return this.engines.get(sessionId)?.getQrBase64() ?? null;
  }

  async requestPairingCode(
    sessionId: string,
    phoneNumber: string,
  ): Promise<string> {
    const session = await this.repo.findById(sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    const engine = this.getOrCreateEngine(sessionId, session.engine);
    if (engine.getStatus() === 'STOPPED') {
      // Mesmo teto do start normal — sem ele, um wwebjs preso no initialize pendurava a rota.
      await this.startWithTimeout(sessionId, engine.start());
      await new Promise((r) => setTimeout(r, 1500));
    }
    return engine.requestPairingCode(phoneNumber);
  }

  async sendText(
    sessionId: string,
    to: string,
    text: string,
    opts?: SendOptions,
  ): Promise<{ keyId: string; jid: string }> {
    const engine = this.engines.get(sessionId);
    if (!engine) throw new Error('Sessão não iniciada');
    if (engine.getStatus() !== 'WORKING') {
      throw new Error('Sessão não está conectada');
    }
    return engine.sendText(to, text, opts);
  }

  async sendMedia(
    sessionId: string,
    to: string,
    input: SendMediaInput,
  ): Promise<{ keyId: string; jid: string }> {
    return this.working(sessionId).sendMedia(to, input);
  }

  sendPresence(
    sessionId: string,
    to: string,
    state: PresenceState,
  ): Promise<void> {
    return this.working(sessionId).sendPresence(to, state);
  }

  markRead(sessionId: string, chatJid: string, msgId: string): Promise<void> {
    return this.working(sessionId).markRead(chatJid, msgId);
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
