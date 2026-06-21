import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import type { Message } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import type { BaileysEngineDeps } from '../baileys/baileys.engine';
import type {
  ChannelInfo,
  ContactCheck,
  GroupInfo,
  IEngine,
  SendMediaInput,
} from '../../application/engine.port';
import type { SessionStatus } from '../../domain/session-status';

// Caminho do Chrome do sistema (no WSL já existe /usr/bin/google-chrome-stable). Configurável por env.
const CHROME_PATH =
  process.env.WWEBJS_CHROME_PATH ?? '/usr/bin/google-chrome-stable';
const AUTH_PATH = process.env.WWEBJS_DATA_PATH ?? 'auth/wwebjs';

// Engine alternativa (F8) usando whatsapp-web.js (Puppeteer + Chrome do sistema). Mesmo contrato
// IEngine do BaileysEngine, escolhida por sessão via EngineFactory. NÚCLEO: conexão/QR, status,
// enviar/receber texto e mídia. Recursos avançados (grupos/contatos/canais) ainda não suportados.
export class WWebJSEngine implements IEngine {
  private client: Client | null = null;
  private status: SessionStatus = 'STOPPED';
  private qrBase64: string | null = null;
  private stopped = false;
  // Cache LID(serializado) -> telefone (<num>@c.us) já resolvido via Store, para não consultar o
  // Puppeteer a cada mensagem. Persiste entre start/stop da mesma sessão (o mapeamento não muda).
  private readonly lidToPnCache = new Map<string, string>();

  constructor(private readonly deps: BaileysEngineDeps) {}

  getStatus(): SessionStatus {
    return this.status;
  }
  getQrBase64(): string | null {
    return this.qrBase64;
  }

  private setStatus(
    status: SessionStatus,
    extra?: { meJid?: string | null; mePushName?: string | null; error?: string | null },
  ): void {
    this.status = status;
    this.deps.onEvent('session.status', { status, ...extra });
  }

  async start(): Promise<void> {
    if (this.client) return;
    this.stopped = false;

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: this.deps.sessionId,
        dataPath: AUTH_PATH,
      }),
      puppeteer: {
        headless: true,
        executablePath: CHROME_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      },
      browserName: 'Chrome',
    });
    this.client = client;
    this.setStatus('STARTING');

    client.on('qr', (qr: string) => {
      void QRCode.toDataURL(qr, { margin: 1, width: 320 })
        .then((url) => {
          this.qrBase64 = url;
          this.setStatus('SCAN_QR_CODE');
        })
        .catch((e) => this.deps.logger.error({ e }, 'wwebjs: falha ao gerar QR'));
    });
    client.on('ready', () => {
      this.qrBase64 = null;
      this.setStatus('WORKING', {
        meJid: client.info?.wid?._serialized ?? null,
        mePushName: client.info?.pushname ?? null,
        error: null,
      });
      // Merge: funde conversas antigas divididas em @lid (após o Store sincronizar).
      setTimeout(() => void this.mergeExistingLids(), 4000);
    });
    client.on('auth_failure', (m: string) =>
      this.setStatus('FAILED', { error: `auth_failure: ${m}` }),
    );
    client.on('disconnected', (reason: unknown) => {
      this.setStatus(this.stopped ? 'STOPPED' : 'DEGRADED', {
        error: this.stopped ? null : `desconectado: ${String(reason)}`,
      });
    });
    // 'message' = somente RECEBIDAS. As enviadas (painel) são emitidas no próprio sendText/sendMedia
    // já com o telefone que digitamos — garante que apareçam no inbox por número. (Pelo message_create
    // as fromMe viriam com o @lid interno do WhatsApp, não buscável.) Ver docs/motores-whatsapp.md.
    client.on('message', (msg: Message) => void this.onMessage(msg));

    await client.initialize();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    try {
      await this.client?.destroy();
    } catch {
      /* noop */
    }
    this.client = null;
    this.setStatus('STOPPED');
  }

  async logout(): Promise<void> {
    this.stopped = true;
    try {
      await this.client?.logout();
    } catch {
      /* noop */
    }
    try {
      await this.client?.destroy();
    } catch {
      /* noop */
    }
    this.client = null;
    this.setStatus('STOPPED');
  }

  async requestPairingCode(phoneNumber: string): Promise<string> {
    return this.req().requestPairingCode(phoneNumber.replace(/\D/g, ''));
  }

  async sendText(
    to: string,
    text: string,
  ): Promise<{ keyId: string; jid: string }> {
    const c = this.req();
    const jid = this.toChatId(to);
    const sent = await c.sendMessage(jid, text);
    const keyId = sent.id?._serialized ?? '';
    this.deps.onEvent('message', {
      keyId,
      chatJid: jid,
      senderJid: c.info?.wid?._serialized ?? null,
      fromMe: true,
      type: 'text',
      text,
      timestamp: Math.floor(Date.now() / 1000),
    });
    return { keyId, jid };
  }

  async sendMedia(
    to: string,
    input: SendMediaInput,
  ): Promise<{ keyId: string; jid: string }> {
    const c = this.req();
    const jid = this.toChatId(to);
    const media = new MessageMedia(
      input.mimetype,
      input.buffer.toString('base64'),
      input.fileName ?? undefined,
    );
    const sent = await c.sendMessage(jid, media, {
      caption: input.caption ?? undefined,
      sendAudioAsVoice: input.ptt,
    });
    const keyId = sent.id?._serialized ?? '';
    this.deps.onEvent('message', {
      keyId,
      chatJid: jid,
      senderJid: c.info?.wid?._serialized ?? null,
      fromMe: true,
      type: input.type,
      text: input.caption ?? null,
      mediaType: input.type,
      mimetype: input.mimetype,
      fileName: input.fileName ?? null,
      fileSize: input.buffer.length,
      timestamp: Math.floor(Date.now() / 1000),
    });
    return { keyId, jid };
  }

  async sendPresence(
    to: string,
    state: 'composing' | 'paused' | 'recording',
  ): Promise<void> {
    const chat = await this.req().getChatById(this.toChatId(to));
    if (state === 'composing') await chat.sendStateTyping();
    else if (state === 'recording') await chat.sendStateRecording();
    else await chat.clearState();
  }

  // Handler do evento 'message' (somente RECEBIDAS — as enviadas são emitidas no sendText/sendMedia).
  // chatJid normaliza @lid → telefone (best-effort) para casar com as enviadas (mesmo número).
  private async onMessage(msg: Message): Promise<void> {
    try {
      if (msg.fromMe) return;
      const raw = msg.from ?? '';
      if (!raw || raw === 'status@broadcast') return;
      const chatJid = await this.resolveNumberJid(raw);
      this.deps.onEvent('message', {
        keyId: msg.id?._serialized ?? '',
        chatJid,
        senderJid: chatJid,
        fromMe: false,
        type: msg.hasMedia ? 'other' : 'text',
        text: msg.body || null,
        timestamp:
          typeof msg.timestamp === 'number'
            ? msg.timestamp
            : Math.floor(Date.now() / 1000),
      });
    } catch (e) {
      this.deps.logger.error({ e }, 'wwebjs: onMessage falhou');
    }
  }

  // Merge automático @lid → telefone (como o WAHA): resolve via Store interno do WhatsApp Web e, ao
  // descobrir o número, funde a conversa (retroativo) e registra o par no diretório. Mantém o @lid
  // puro se o Store não souber o número (contato anônimo). Ver docs/motores-whatsapp.md.
  private async resolveNumberJid(rawId: string): Promise<string> {
    if (!rawId.endsWith('@lid')) return rawId;
    const cached = this.lidToPnCache.get(rawId);
    if (cached) return cached;
    const pn = await this.resolveLidToPhone(rawId);
    const num = pn?.replace(/\D/g, '');
    if (!num) return rawId;
    const phoneJid = `${num}@c.us`;
    this.lidToPnCache.set(rawId, phoneJid);
    await this.mergeLidMessages(rawId, phoneJid);
    this.deps.contacts?.record({
      waId: rawId,
      lid: rawId,
      jid: `${num}@s.whatsapp.net`,
      phone: num,
      source: 'wwebjs-lid',
    });
    return phoneJid;
  }

  // Consulta o Store interno do WhatsApp Web (window.Store.LidUtils.getPhoneNumber) via Puppeteer —
  // o MESMO mecanismo de WAHA/WPPConnect. Fonte confiável de LID↔telefone no motor browser (o
  // getContact().number do whatsapp-web.js devolve o próprio LID).
  private async resolveLidToPhone(lid: string): Promise<string | null> {
    const page = (
      this.client as unknown as {
        pupPage?: {
          evaluate: (
            fn: (l: string) => unknown,
            arg: string,
          ) => Promise<unknown>;
        } | null;
      } | null
    )?.pupPage;
    if (!page) return null;
    try {
      // window.WWebJS.enforceLidAndPnRetrieval força o WhatsApp Web a buscar o par LID↔telefone;
      // depois WWebJS.getContact devolve o contato com id já no formato <telefone>@c.us. (O
      // window.Store NÃO é exposto no whatsapp-web.js 1.34 — esta é a via suportada para o merge.)
      const idStr = (await page.evaluate(async (lidId: string) => {
        const J = (globalThis as { WWebJS?: Record<string, any> }).WWebJS;
        if (!J || typeof J.getContact !== 'function') return null;
        try {
          if (typeof J.enforceLidAndPnRetrieval === 'function') {
            try {
              await J.enforceLidAndPnRetrieval([lidId]);
            } catch {
              /* segue mesmo sem enforce */
            }
          }
          const c = await J.getContact(lidId);
          const id = c?.id?._serialized ?? c?.id;
          return typeof id === 'string' ? id : null;
        } catch {
          return null;
        }
      }, lid)) as string | null;
      if (!idStr || !idStr.endsWith('@c.us')) return null;
      const num = idStr.replace(/[^0-9]/g, '');
      const lidNum = lid.replace(/[^0-9]/g, '');
      return num && num !== lidNum ? num : null;
    } catch (e) {
      this.deps.logger.error({ e }, 'wwebjs: resolveLidToPhone falhou');
      return null;
    }
  }

  // Merge retroativo: reescreve para o telefone as mensagens já gravadas com este @lid (funde a
  // conversa que estava dividida). Idempotente.
  private async mergeLidMessages(lid: string, phoneJid: string): Promise<void> {
    try {
      const r = await this.deps.prisma.waMessage.updateMany({
        where: { sessionId: this.deps.sessionId, chatJid: lid },
        data: { chatJid: phoneJid },
      });
      if (r.count > 0) {
        this.deps.logger.info(
          { lid, phoneJid, count: r.count },
          'wwebjs: merge LID->telefone (retroativo)',
        );
      }
    } catch (e) {
      this.deps.logger.error({ e }, 'wwebjs: mergeLidMessages falhou');
    }
  }

  // No 'ready': tenta resolver/fundir todos os @lid já gravados nesta sessão (conversas antigas
  // divididas). As novas são fundidas na entrada via resolveNumberJid.
  private async mergeExistingLids(): Promise<void> {
    try {
      const rows = await this.deps.prisma.waMessage.findMany({
        where: {
          sessionId: this.deps.sessionId,
          chatJid: { endsWith: '@lid' },
        },
        distinct: ['chatJid'],
        select: { chatJid: true },
      });
      for (const r of rows) {
        await this.resolveNumberJid(r.chatJid);
      }
      if (rows.length) {
        this.deps.logger.info(
          { lids: rows.length },
          'wwebjs: merge de LIDs existentes processado',
        );
      }
    } catch (e) {
      this.deps.logger.error({ e }, 'wwebjs: mergeExistingLids falhou');
    }
  }

  private toChatId(to: string): string {
    if (to.includes('@')) return to;
    return `${to.replace(/\D/g, '')}@c.us`;
  }

  private req(): Client {
    if (!this.client) throw new Error('Sessão não conectada');
    return this.client;
  }

  private nope(op: string): never {
    throw new Error(`${op} ainda não suportado na engine WWEBJS (use BAILEYS)`);
  }

  // ---- Recursos avançados (F5): ainda não implementados nesta engine ----
  listGroups(): Promise<GroupInfo[]> {
    return this.nope('listGroups');
  }
  groupInfo(): Promise<GroupInfo> {
    return this.nope('groupInfo');
  }
  createGroup(): Promise<GroupInfo> {
    return this.nope('createGroup');
  }
  updateParticipants(): Promise<void> {
    return this.nope('updateParticipants');
  }
  leaveGroup(): Promise<void> {
    return this.nope('leaveGroup');
  }
  setGroupSubject(): Promise<void> {
    return this.nope('setGroupSubject');
  }
  setGroupDescription(): Promise<void> {
    return this.nope('setGroupDescription');
  }
  groupInviteCode(): Promise<string> {
    return this.nope('groupInviteCode');
  }
  groupRevokeInvite(): Promise<string> {
    return this.nope('groupRevokeInvite');
  }
  checkNumbers(): Promise<ContactCheck[]> {
    return this.nope('checkNumbers');
  }
  profilePicture(): Promise<string | null> {
    return this.nope('profilePicture');
  }
  setBlock(): Promise<void> {
    return this.nope('setBlock');
  }
  createChannel(): Promise<ChannelInfo> {
    return this.nope('createChannel');
  }
  channelInfo(): Promise<ChannelInfo> {
    return this.nope('channelInfo');
  }
  followChannel(): Promise<void> {
    return this.nope('followChannel');
  }
  unfollowChannel(): Promise<void> {
    return this.nope('unfollowChannel');
  }
}
