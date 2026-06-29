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
    for (const s of candidates) {
      this.logger.log(`Reidratando sessão "${s.name}"`);
      void this.start(s.id).catch((e) =>
        this.logger.error(
          `Falha ao reidratar ${s.name}: ${(e as Error).message}`,
        ),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.engines.values()].map((e) => e.stop().catch(() => undefined)),
    );
  }

  private getOrCreateEngine(sessionId: string, engineType: string): IEngine {
    let engine = this.engines.get(sessionId);
    if (!engine) {
      engine = this.engineFactory.create(engineType, {
        sessionId,
        deviceName: 'WhatsApp Gateway',
        prisma: this.prisma,
        logger: pino({
          level: this.config.get('WA_LOG_LEVEL', { infer: true }),
        }),
        onEvent: (name, payload) =>
          void this.handleEngineEvent(sessionId, name, payload),
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
          resolveNames: (keys) =>
            this.contactDirectory.namesFor(sessionId, keys),
        },
      });
      this.engines.set(sessionId, engine);
    }
    return engine;
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
      await this.repo.updateStatus(sessionId, p.status, {
        meJid: p.meJid,
        mePushName: p.mePushName,
        lastError: p.error,
      });
    } catch (e) {
      this.logger.error(`persist status ${sessionId}: ${(e as Error).message}`);
    }
  }

  async start(sessionId: string): Promise<void> {
    const session = await this.repo.findById(sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    this.names.set(sessionId, session.name);
    await this.getOrCreateEngine(sessionId, session.engine).start();
  }

  async stop(sessionId: string): Promise<void> {
    await this.engines.get(sessionId)?.stop();
  }

  async restart(sessionId: string): Promise<void> {
    await this.stop(sessionId);
    await this.start(sessionId);
  }

  async logout(sessionId: string): Promise<void> {
    const engine = this.engines.get(sessionId);
    if (engine) {
      await engine.logout();
      this.engines.delete(sessionId);
      return;
    }
    await this.prisma.waAuthKey.deleteMany({ where: { sessionId } });
    await this.prisma.waSession.update({
      where: { id: sessionId },
      data: { creds: Prisma.DbNull },
    });
    await this.repo.updateStatus(sessionId, 'STOPPED', {
      meJid: null,
      mePushName: null,
    });
  }

  async remove(sessionId: string): Promise<void> {
    await this.engines.get(sessionId)?.stop();
    this.engines.delete(sessionId);
    this.names.delete(sessionId);
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
      await engine.start();
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
