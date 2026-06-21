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
    });
    client.on('auth_failure', (m: string) =>
      this.setStatus('FAILED', { error: `auth_failure: ${m}` }),
    );
    client.on('disconnected', (reason: unknown) => {
      this.setStatus(this.stopped ? 'STOPPED' : 'DEGRADED', {
        error: this.stopped ? null : `desconectado: ${String(reason)}`,
      });
    });
    // message_create capta recebidas E as suas enviadas de qualquer device (inclusive do celular);
    // 'message' sozinho só pega recebidas (whatsapp-web.js #1226).
    client.on('message_create', (msg: Message) => void this.onMessageCreate(msg));

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
    // Não emite o evento aqui: o handler message_create capta esta mensagem, normaliza o JID
    // (@lid → número) e persiste — evita duplicação e unifica enviadas/recebidas no mesmo chat.
    const sent = await c.sendMessage(jid, text);
    return { keyId: sent.id?._serialized ?? '', jid };
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
    // Captura via message_create (ver sendText). Mídia no WWEBJS é básica (sem download/S3 ainda).
    const sent = await c.sendMessage(jid, media, {
      caption: input.caption ?? undefined,
      sendAudioAsVoice: input.ptt,
    });
    return { keyId: sent.id?._serialized ?? '', jid };
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

  // Handler do message_create: capta recebidas E enviadas (qualquer device). O "chat" é o outro
  // lado (msg.to nas enviadas, msg.from nas recebidas); normalizamos @lid → número (best-effort).
  private async onMessageCreate(msg: Message): Promise<void> {
    try {
      const keyId = msg.id?._serialized ?? '';
      const raw = (msg.fromMe ? msg.to : msg.from) ?? '';
      if (!raw || raw === 'status@broadcast') return;
      const chatJid = await this.resolveNumberJid(raw);
      this.deps.onEvent('message', {
        keyId,
        chatJid,
        senderJid: msg.fromMe
          ? (this.client?.info?.wid?._serialized ?? null)
          : chatJid,
        fromMe: !!msg.fromMe,
        type: msg.hasMedia ? 'other' : 'text',
        text: msg.body || null,
        timestamp:
          typeof msg.timestamp === 'number'
            ? msg.timestamp
            : Math.floor(Date.now() / 1000),
      });
    } catch (e) {
      this.deps.logger.error({ e }, 'wwebjs: onMessageCreate falhou');
    }
  }

  // Resolve @lid → telefone real (best-effort) via getContactById. Só aceita o número quando ele é
  // DIFERENTE do próprio LID — caso contrário o whatsapp-web.js apenas devolveu o LID de volta (bug
  // upstream #3969/#3857/#4003) e mantemos o @lid puro, sem inventar um número falso. Quando resolve
  // (típico de contatos salvos), enviadas e recebidas caem no mesmo <tel>@c.us, buscável por número.
  // A resolução robusta de LID está em outros motores (Baileys 7.x, WAHA NOWEB/GOWS, WPPConnect) —
  // ver docs/motores-whatsapp.md.
  private async resolveNumberJid(rawId: string): Promise<string> {
    if (!rawId.endsWith('@lid')) return rawId;
    const lidNum = rawId.slice(0, -'@lid'.length);
    try {
      const contact = (await this.req().getContactById(rawId)) as {
        number?: string;
      } | null;
      const num = contact?.number?.replace(/\D/g, '');
      if (num && num !== lidNum) return `${num}@c.us`;
    } catch {
      /* fallback abaixo */
    }
    return rawId;
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
