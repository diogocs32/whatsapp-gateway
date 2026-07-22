import makeWASocket, {
  BufferJSON,
  DisconnectReason,
  downloadMediaMessage,
  extractMessageContent,
  fetchLatestBaileysVersion,
  getContentType,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  proto,
  type ConnectionState,
  type Contact,
  type MessageUpsertType,
  type WAMessage,
  type WAMessageUpdate,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import type { Agent } from 'node:http';
import type { Agent as HttpsAgent } from 'node:https';
import type { Logger } from 'pino';
import { PrismaService, Prisma } from '../../../../infra/prisma/prisma.service';
import type { ContactRecord } from '../../../../infra/directory/contact-directory.service';
import type { AnyMessageContent } from '@whiskeysockets/baileys';
import type {
  ChannelInfo,
  ContactCheck,
  EngineEventHandler,
  GroupInfo,
  GroupParticipantAction,
  AckStatus,
  IEngine,
  MessageSource,
  PresenceState,
  SaveContactInput,
  SendMediaInput,
  SendOptions,
  SessionStatePayload,
} from '../../application/engine.port';
import type { SessionStatus } from '../../domain/session-status';
import { usePostgresAuthState } from './postgres-auth-state';
import { browserFingerprint } from './browser-fingerprint';

export interface BaileysEngineDeps {
  sessionId: string;
  deviceName: string;
  prisma: PrismaService;
  logger: Logger;
  onEvent: EngineEventHandler;
  // Guard anti-vazamento (WA_REQUIRE_PROXY): quando true, a engine RECUSA conectar se resolveAgent
  // não devolver proxy — evita expor o IP do servidor (datacenter) ao WhatsApp. Default false.
  requireProxy?: boolean;
  // Resolve o proxy (agent) a cada conexão. null/ausente => conexão direta, sem proxy (§7.4).
  resolveAgent?: () => Promise<Agent | null>;
  // Dados crus do proxy (server + auth) para engines que aplicam proxy no browser (wwebjs:
  // --proxy-server + proxyAuthentication). null => conexão direta.
  resolveProxyConfig?: () => Promise<{
    server: string;
    username?: string;
    password?: string;
  } | null>;
  // Notifica que o proxy ATUAL da sessão falhou em uso real (auth/tunnel rejeitados). O resolver
  // marca-o DEAD e devolve o modo do assignment — nos modos rotativos o chamador pode re-resolver
  // e tentar o próximo candidato (item 8 da auditoria 07/2026).
  reportProxyFailure?: (
    reason: string,
  ) => Promise<{ mode: string | null; marked: boolean }>;
  // Persiste o binário da mídia (S3). Recebe a chave do objeto, o buffer e o content-type (F4).
  storeMedia?: (
    key: string,
    body: Buffer,
    contentType: string,
  ) => Promise<void>;
  // Diretório de contatos persistente (LID↔telefone + metadados). Fire-and-forget (F5+).
  contacts?: {
    record: (c: ContactRecord) => void;
    recordMany: (list: ContactRecord[]) => void;
    loadLidMap: () => Promise<Array<{ lid: string; jid: string }>>;
    // Nomes salvos (agenda/pushName) para um conjunto de chaves — cruza membros de grupo × contatos.
    resolveNames: (
      keys: string[],
    ) => Promise<Map<string, { name: string | null; pushName: string | null }>>;
  };
}

// Cache de processo da versão do WhatsApp Web usada pelo Baileys (item 7 da auditoria 07/2026):
// fetchLatestBaileysVersion é uma chamada HTTP externa que ficava no hot path de TODO connect e
// de CADA tentativa de reconexão (numa tempestade de reconexão, N chamadas em paralelo). TTL de
// 12h; em falha, reusa a última versão conhecida (stale) ou deixa o makeWASocket usar a default
// embutida do Baileys (retorno undefined).
type BaileysVersion = Awaited<
  ReturnType<typeof fetchLatestBaileysVersion>
>['version'];
let baileysVersionCache: {
  version: BaileysVersion;
  fetchedAt: number;
} | null = null;
const BAILEYS_VERSION_TTL_MS = 12 * 60 * 60 * 1000;

async function latestBaileysVersion(
  logger: Logger,
): Promise<BaileysVersion | undefined> {
  if (
    baileysVersionCache &&
    Date.now() - baileysVersionCache.fetchedAt < BAILEYS_VERSION_TTL_MS
  ) {
    return baileysVersionCache.version;
  }
  try {
    const { version } = await fetchLatestBaileysVersion();
    baileysVersionCache = { version, fetchedAt: Date.now() };
    return version;
  } catch (e) {
    logger.warn(
      { err: (e as Error).message },
      'fetchLatestBaileysVersion falhou — usando versão em cache/default',
    );
    return baileysVersionCache?.version;
  }
}

// Converte um Contact do Baileys (contacts.upsert/update) em ContactRecord do diretório.
function contactToRecord(c: Partial<Contact>, source: string): ContactRecord {
  const id = c.id ?? '';
  // Baileys 7.x: o Contact perdeu o campo `jid`; o número (PN) agora vem em `phoneNumber`.
  const jid = c.phoneNumber ?? (id.endsWith('@s.whatsapp.net') ? id : null);
  const lid = c.lid ?? (id.endsWith('@lid') ? id : null);
  return {
    waId: id,
    jid,
    lid,
    name: c.name ?? null,
    pushName: c.notify ?? null,
    verifiedName: c.verifiedName ?? null,
    imgUrl: typeof c.imgUrl === 'string' ? c.imgUrl : null,
    status: c.status ?? null,
    source,
  };
}

// Codifica/decodifica proto.IMessage via BufferJSON p/ guardar em jsonb (wa_messages.raw) sem
// corromper Buffers — mesma técnica do auth state. Usado pelo getMessage no retry de descriptografia.
function encodeProto(msg: proto.IMessage): unknown {
  return JSON.parse(JSON.stringify(msg, BufferJSON.replacer));
}
function decodeProto(value: unknown): proto.IMessage {
  return JSON.parse(
    JSON.stringify(value),
    BufferJSON.reviver,
  ) as proto.IMessage;
}

interface MediaInfo {
  mediaType: string;
  mimetype: string | null;
  fileName: string | null;
  caption: string | null;
  fileSize: number | null;
}

// Converte Long (protobufjs) | number | null em number | null.
function toNum(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (v && typeof (v as { toNumber?: () => number }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Identifica e extrai metadados de mensagens de mídia recebidas (§ F4).
function mediaInfoOf(msg: proto.IMessage | null | undefined): MediaInfo | null {
  if (!msg) return null;
  const im = msg.imageMessage;
  if (im)
    return {
      mediaType: 'image',
      mimetype: im.mimetype ?? null,
      fileName: null,
      caption: im.caption ?? null,
      fileSize: toNum(im.fileLength),
    };
  const vm = msg.videoMessage;
  if (vm)
    return {
      mediaType: 'video',
      mimetype: vm.mimetype ?? null,
      fileName: null,
      caption: vm.caption ?? null,
      fileSize: toNum(vm.fileLength),
    };
  const am = msg.audioMessage;
  if (am)
    return {
      mediaType: 'audio',
      mimetype: am.mimetype ?? null,
      fileName: null,
      caption: null,
      fileSize: toNum(am.fileLength),
    };
  const dm =
    msg.documentMessage ??
    msg.documentWithCaptionMessage?.message?.documentMessage;
  if (dm)
    return {
      mediaType: 'document',
      mimetype: dm.mimetype ?? null,
      fileName: dm.fileName ?? dm.title ?? null,
      caption: dm.caption ?? null,
      fileSize: toNum(dm.fileLength),
    };
  const sm = msg.stickerMessage;
  if (sm)
    return {
      mediaType: 'sticker',
      mimetype: sm.mimetype ?? null,
      fileName: null,
      caption: null,
      fileSize: toNum(sm.fileLength),
    };
  return null;
}

// Extensão do arquivo: do fileName se houver, senão do subtipo do mimetype.
function extOf(mimetype: string | null, fileName: string | null): string {
  if (fileName && fileName.includes('.')) {
    const e = fileName.split('.').pop();
    if (e && e.length <= 5) return e.toLowerCase();
  }
  if (mimetype) {
    const sub = mimetype.split('/')[1]?.split(';')[0];
    if (sub) return sub.toLowerCase();
  }
  return 'bin';
}

// G3: mapeia o enum de status do WhatsApp (proto.WebMessageInfo.Status) para o ACK público.
// PENDING/ERROR não viram evento; PLAYED (áudio ouvido) conta como leitura.
function mapAckStatus(
  status: proto.WebMessageInfo.Status | null | undefined,
): AckStatus | null {
  const S = proto.WebMessageInfo.Status;
  switch (status) {
    case S.SERVER_ACK:
      return 'sent';
    case S.DELIVERY_ACK:
      return 'delivered';
    case S.READ:
    case S.PLAYED:
      return 'read';
    default:
      return null;
  }
}

// Monta o content do sendMessage conforme o tipo de mídia (§ F4 / AnyMediaMessageContent).
function buildMediaContent(input: SendMediaInput): AnyMessageContent {
  const caption = input.caption ?? undefined;
  switch (input.type) {
    case 'image':
      return { image: input.buffer, caption, mimetype: input.mimetype };
    case 'video':
      return { video: input.buffer, caption, mimetype: input.mimetype };
    case 'audio':
      return {
        audio: input.buffer,
        mimetype: input.mimetype,
        ptt: !!input.ptt,
      };
    case 'sticker':
      return { sticker: input.buffer };
    case 'document':
    default:
      return {
        document: input.buffer,
        mimetype: input.mimetype,
        fileName: input.fileName ?? 'arquivo',
        caption,
      };
  }
}

// ---- Mapeadores F5 (Baileys → tipos do port) ----
type RawParticipant = {
  id: string;
  admin?: 'admin' | 'superadmin' | null;
  jid?: string; // telefone (@s.whatsapp.net) quando o Baileys resolve
  lid?: string; // identificador anônimo (@lid)
  phoneNumber?: string;
  name?: string;
  notify?: string;
};

// Resolve o telefone do participante: prefere o jid explícito; senão tenta o cache LID→PN
// aprendido das mensagens. Em grupos novos (addressingMode 'lid') o WhatsApp esconde o número
// por privacidade — quando não dá pra resolver, fica null (a UI cai pro nome ou pro LID).
function resolveParticipantPhone(
  p: RawParticipant,
  lidToPn: Map<string, string>,
): string | null {
  const fromJid = p.jid ?? p.phoneNumber;
  if (fromJid?.includes('@s.whatsapp.net')) return fromJid.split('@')[0];
  if (p.id.endsWith('@s.whatsapp.net')) return p.id.split('@')[0];
  const lidKey = p.lid ?? (p.id.endsWith('@lid') ? p.id : null);
  if (lidKey) {
    const pn = lidToPn.get(jidNormalizedUser(lidKey)) ?? lidToPn.get(lidKey);
    if (pn) return pn.split('@')[0];
  }
  return fromJid ? fromJid.split('@')[0] : null;
}
type RawGroup = {
  id: string;
  subject?: string;
  owner?: string | null;
  desc?: string | null;
  size?: number;
  announce?: boolean;
  restrict?: boolean;
  participants?: RawParticipant[];
};
type RawNewsletter = {
  id?: string;
  thread_metadata?: {
    name?: { text?: string };
    description?: { text?: string };
    subscribers_count?: string | number;
  };
};

// Nome do diretório para um participante, testando todas as chaves que ele pode ter.
function dirNameFor(
  p: RawParticipant,
  phone: string | null,
  names?: Map<string, { name: string | null; pushName: string | null }>,
): { name: string | null; pushName: string | null } | undefined {
  if (!names) return undefined;
  return (
    names.get(p.id) ??
    (p.lid ? names.get(p.lid) : undefined) ??
    (p.jid ? names.get(p.jid) : undefined) ??
    (phone ? names.get(phone) : undefined)
  );
}

function toGroupInfo(
  md: RawGroup,
  lidToPn: Map<string, string>,
  names?: Map<string, { name: string | null; pushName: string | null }>,
): GroupInfo {
  return {
    id: md.id,
    subject: md.subject ?? '',
    owner: md.owner ?? null,
    desc: md.desc ?? null,
    size: md.size ?? md.participants?.length ?? 0,
    announce: !!md.announce,
    restrict: !!md.restrict,
    participants: (md.participants ?? []).map((p) => {
      const phone = resolveParticipantPhone(p, lidToPn);
      const dir = dirNameFor(p, phone, names);
      return {
        id: p.id,
        role:
          p.admin === 'superadmin'
            ? 'superadmin'
            : p.admin === 'admin'
              ? 'admin'
              : 'member',
        phone,
        // Prioridade: nome da agenda (metadado → diretório) > pushName (metadado → diretório).
        // O fallback no diretório resolve o caso LID, em que o metadado do grupo vem sem nome.
        name: p.name ?? dir?.name ?? p.notify ?? dir?.pushName ?? null,
      };
    }),
  };
}

function toChannelInfo(md: RawNewsletter): ChannelInfo {
  const tm = md.thread_metadata;
  const subs = Number(tm?.subscribers_count ?? NaN);
  return {
    id: md.id ?? '',
    name: tm?.name?.text ?? '',
    description: tm?.description?.text ?? null,
    subscribers: Number.isFinite(subs) ? subs : null,
  };
}

function toGroupJid(jid: string): string {
  return jid.includes('@') ? jid : `${jid}@g.us`;
}
function toContactJid(jid: string): string {
  if (jid.includes('@')) return jid;
  return `${jid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
}

const MAX_RECONNECT = 5;
const SENT_CACHE_MAX = 1000;

export class BaileysEngine implements IEngine {
  private sock: WASocket | null = null;
  private status: SessionStatus = 'STOPPED';
  private qrBase64: string | null = null;
  private stopped = false;
  private reconnectAttempts = 0;
  // Mutex de ciclo de vida (espelha o da WwebjsEngine): serializa start/stop/logout/reconexão da
  // MESMA sessão. Sem isto, dois start() próximos (duplo clique, restart sobre start, create +
  // autostart) passam ambos pelo `if (this.sock)` de connect() com sock=null e criam DOIS
  // makeWASocket — o primeiro fica órfão com listeners vivos e os dois brigam pela sessão
  // (connectionReplaced/440 em loop até esgotar as reconexões).
  private lifecycle: Promise<unknown> = Promise.resolve();
  // cache de mensagens enviadas — usado pelo getMessage (retry de descriptografia, blueprint §8.6)
  private readonly sentMessages = new Map<string, proto.IMessage>();
  // cache LID→número (PN) aprendido das mensagens, para resolver conversas 1:1 (§23.1)
  private readonly lidToPn = new Map<string, string>();

  constructor(private readonly deps: BaileysEngineDeps) {}

  getStatus(): SessionStatus {
    return this.status;
  }

  getQrBase64(): string | null {
    return this.qrBase64;
  }

  private setStatus(
    status: SessionStatus,
    extra: Partial<SessionStatePayload> = {},
  ): void {
    this.status = status;
    this.deps.onEvent('session.status', { status, ...extra });
  }

  // Encadeia `fn` após a última operação de ciclo de vida (resolvendo ou rejeitando), garantindo
  // execução serializada por instância (1 sessão = 1 engine).
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.lifecycle.then(fn, fn);
    this.lifecycle = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  start(): Promise<void> {
    return this.serialize(() => {
      this.stopped = false;
      this.reconnectAttempts = 0;
      return this.connect();
    });
  }

  private async connect(): Promise<void> {
    if (this.sock) {
      const ev = this.sock.ev as unknown as {
        removeAllListeners?: (event?: string) => void;
      };
      try {
        ev.removeAllListeners?.('connection.update');
        ev.removeAllListeners?.('creds.update');
        ev.removeAllListeners?.('messages.upsert');
      } catch {
        /* noop */
      }
      try {
        this.sock.end(undefined);
      } catch {
        /* noop */
      }
      this.sock = null;
    }

    const { state, saveCreds } = await usePostgresAuthState(
      this.deps.prisma,
      this.deps.sessionId,
    );
    // Item 7 — versão com cache de processo (TTL 12h) em vez de HTTP a cada connect/reconnect.
    const version = await latestBaileysVersion(this.deps.logger);

    // Proxy (§7.4): o mesmo Agent serve para o WebSocket (`agent`) e para o download de mídia (`fetchAgent`).
    const agent = (await this.deps.resolveAgent?.()) ?? undefined;

    // Guard anti-vazamento (opcional, WA_REQUIRE_PROXY): sem proxy resolvido, o WhatsApp seria
    // acessado DIRETO pelo IP do servidor (datacenter) — gatilho nº 1 de flag de automação na
    // conexão. Com o guard ligado, recusamos conectar em vez de vazar o IP. `stopped=true` corta
    // o loop de reconexão (um start manual reseta e tenta de novo, já com proxy atribuído).
    if (!agent && this.deps.requireProxy) {
      this.stopped = true;
      this.deps.logger.error(
        `Sessão ${this.deps.sessionId}: conexão BLOQUEADA — WA_REQUIRE_PROXY ligado e nenhum proxy vivo atribuído.`,
      );
      this.setStatus('FAILED', {
        error:
          'Sem proxy vivo e WA_REQUIRE_PROXY ligado — conexão bloqueada para não vazar o IP do servidor. Atribua um proxy residencial à sessão e reinicie.',
      });
      return;
    }

    const sock = makeWASocket({
      // Espalha condicionalmente: `version: undefined` sobrescreveria a default embutida do
      // Baileys no merge de config (spread), quebrando o handshake.
      ...(version ? { version } : {}),
      // Envolve o key store do Postgres num cache em memória (write-through). Sem isso, cada
      // leitura/escrita de chave Signal bate direto no banco de forma assíncrona e leituras
      // concorrentes podem ver estado obsoleto → o ratchet dessincroniza e o destinatário não
      // descriptografa ("Aguardando mensagem"). Recomendado pelo Baileys p/ qualquer auth store de DB.
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
          state.keys,
          this.deps.logger as never,
        ),
      },
      logger: this.deps.logger as never,
      // Fingerprint realista e estável por sessão (ver browser-fingerprint.ts). Substitui o antigo
      // ['WhatsApp Gateway','Chrome','1.0.0'], que aparecia como "WhatsApp Gateway" em Aparelhos
      // Conectados e denunciava automação.
      browser: browserFingerprint(this.deps.sessionId),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      // Sob carga (campanhas), o commit do key store no Postgres pode falhar transitoriamente.
      // Mais tentativas de commit evitam perder a escrita de uma chave Signal — o que dessincroniza
      // o ratchet e gera "Aguardando mensagem". Espelha o Evolution (whatsapp.baileys.service.ts:676);
      // o default do Baileys é mais baixo (maxCommitRetries=5, delayBetweenTriesMs=1000).
      transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
      // O Baileys tipa agent/fetchAgent como https.Agent; nossos agents (socks/https-proxy)
      // são http.Agent em runtime e funcionam — daí o cast (downcast seguro).
      agent: agent as HttpsAgent | undefined,
      fetchAgent: agent as HttpsAgent | undefined,
      getMessage: async (key) => this.loadMessageForRetry(key),
    });
    this.sock = sock;
    this.setStatus('STARTING');

    // F7.2 — cada handler roda dentro de `safe()`: um erro processando evento de UMA sessão é
    // logado e isolado (não vira uncaughtException nem derruba as outras sessões).
    sock.ev.on('creds.update', () =>
      this.safe(() => saveCreds(), 'creds.update'),
    );
    sock.ev.on('connection.update', (u) =>
      this.safe(() => this.onConnectionUpdate(u), 'connection.update'),
    );
    sock.ev.on('messages.upsert', (u) =>
      this.safe(() => this.onMessagesUpsert(u), 'messages.upsert'),
    );
    // G3 — ACK de entrega/leitura (receipts das mensagens que enviamos).
    sock.ev.on('messages.update', (u) =>
      this.safe(() => this.onMessagesUpdate(u), 'messages.update'),
    );
    // Sync de contatos do WhatsApp → diretório persistente (a fonte mais rica de LID↔telefone).
    sock.ev.on('contacts.upsert', (cs) =>
      this.safe(() => this.onContacts(cs), 'contacts.upsert'),
    );
    sock.ev.on('contacts.update', (cs) =>
      this.safe(() => this.onContacts(cs), 'contacts.update'),
    );
  }

  private async onConnectionUpdate(
    update: Partial<ConnectionState>,
  ): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        this.qrBase64 = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
        this.setStatus('SCAN_QR_CODE');
      } catch (e) {
        this.deps.logger.error({ e }, 'falha ao gerar QR');
      }
    }

    if (connection === 'open') {
      this.qrBase64 = null;
      this.reconnectAttempts = 0;
      const me = this.sock?.user;
      this.setStatus('WORKING', {
        meJid: me?.id ?? null,
        mePushName: me?.name ?? null,
        error: null,
      });
      void this.warmLidCache(); // aquece o cache LID↔telefone do diretório persistido
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
        ?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        // Deslogado pelo celular: as credenciais persistidas estão MORTAS — qualquer
        // reconexão/restart com elas volta a falhar sem nunca gerar QR. Limpa tudo e para em
        // STOPPED: o próximo start (botão Conectar / POST /new-qr) gera QR novo direto.
        this.stopped = true;
        this.qrBase64 = null;
        this.sentMessages.clear();
        this.detachSocketListeners();
        try {
          this.sock?.end(undefined);
        } catch {
          /* noop */
        }
        this.sock = null;
        await this.clearCredentials();
        this.setStatus('STOPPED', {
          meJid: null,
          mePushName: null,
          error:
            'Desconectada pelo celular (loggedOut) — credenciais limpas; gere um novo QR para reconectar',
        });
        return;
      }
      if (this.stopped) {
        this.setStatus('STOPPED');
        return;
      }

      // Item 8b — se a sessão usa proxy, um close com assinatura de erro de rede/túnel implica o
      // proxy (todo o tráfego passa por ele). Marca-o DEAD antes de reagendar: o connect() da
      // reconexão re-resolve o proxy e, nos modos rotativos, pula os DEAD e pega o próximo
      // candidato. Sem proxy atribuído, reportFailure é no-op. Padrões conservadores de propósito
      // (quedas rotineiras do stream — restartRequired/connectionReplaced — NÃO casam); um
      // falso-positivo é revertido pelo re-teste periódico (item 9), que revive o proxy.
      const closeMsg =
        (lastDisconnect?.error as Error | undefined)?.message ?? '';
      if (
        this.deps.reportProxyFailure &&
        /407|ERR_TUNNEL|tunneling socket|proxy|connect ECONNREFUSED|connect ETIMEDOUT|getaddrinfo ENOTFOUND|EHOSTUNREACH/i.test(
          closeMsg,
        )
      ) {
        try {
          await this.deps.reportProxyFailure(
            `baileys close: ${closeMsg.slice(0, 100)}`,
          );
        } catch (err) {
          this.deps.logger.warn({ err }, 'reportProxyFailure falhou');
        }
      }

      this.reconnectAttempts += 1;
      if (this.reconnectAttempts > MAX_RECONNECT) {
        this.setStatus('DEGRADED', {
          error: `Falha ao reconectar após ${MAX_RECONNECT} tentativas`,
        });
        return;
      }
      const delay =
        Math.min(30_000, 1_000 * 2 ** this.reconnectAttempts) +
        Math.floor(Math.random() * 1_000);
      this.deps.logger.warn(
        { statusCode, attempt: this.reconnectAttempts, delay },
        'reconectando sessão',
      );
      setTimeout(() => {
        if (!this.stopped) {
          // Serializada e re-checando `stopped` DENTRO da fila: um stop()/logout() que entrou
          // entre o agendamento e a execução cancela a reconexão em vez de ressuscitar o socket.
          void this.serialize(() =>
            this.stopped ? Promise.resolve() : this.connect(),
          ).catch((e) => this.deps.logger.error({ e }, 'erro ao reconectar'));
        }
      }, delay);
    }
  }

  private onMessagesUpsert(upsert: {
    messages: WAMessage[];
    type: MessageUpsertType;
  }): void {
    if (upsert.type !== 'notify') return;
    for (const m of upsert.messages) {
      const keyId = m.key.id ?? '';
      // Já emitida pelo sendText (envio via gateway) → não duplica.
      if (keyId && this.sentMessages.has(keyId)) continue;

      let chatJid = m.key.remoteJid ?? '';
      if (!chatJid || chatJid === 'status@broadcast') continue;

      // Aprende LID→número a partir do JID alternativo. Baileys 7.x: quando o remoteJid vem em
      // formato @lid, o número (PN) fica em `remoteJidAlt` (antes era `senderPn`).
      if (chatJid.endsWith('@lid') && m.key.remoteJidAlt) {
        const pn = jidNormalizedUser(m.key.remoteJidAlt);
        // Mapeamento NOVO → funde retroativamente a conversa que ficou dividida em @lid no banco
        // (mensagens gravadas ANTES de o par LID↔PN ser aprendido "somem" do Inbox — ficam num
        // chat @lid separado). Paridade com o merge da engine wwebjs.
        if (this.lidToPn.get(chatJid) !== pn) {
          this.lidToPn.set(chatJid, pn);
          void this.mergeLidMessages(chatJid, pn);
        }
        this.deps.contacts?.record({
          waId: pn,
          jid: pn,
          lid: chatJid,
          pushName: m.pushName ?? null,
          source: 'message',
        });
      }
      // Resolve @lid → número (1:1, §23.1) usando o cache aprendido (cobre os dois sentidos).
      if (chatJid.endsWith('@lid')) {
        const pn = this.lidToPn.get(chatJid);
        if (pn) chatJid = pn;
      }
      if (chatJid.endsWith('@s.whatsapp.net')) {
        chatJid = jidNormalizedUser(chatJid);
        if (!m.key.fromMe) {
          this.deps.contacts?.record({
            waId: chatJid,
            jid: chatJid,
            pushName: m.pushName ?? null,
            source: 'message',
          });
        }
      }

      const ts = m.messageTimestamp;
      const base = {
        keyId,
        chatJid,
        senderJid: m.key.fromMe ? (this.sock?.user?.id ?? null) : chatJid,
        fromMe: !!m.key.fromMe,
        // G2: já filtramos o que saiu pela API (sentMessages, acima). Um fromMe que chega aqui
        // foi digitado em outro device = celular. Inbound (fromMe=false) não tem origem nossa.
        source: (m.key.fromMe ? 'phone' : null) as MessageSource | null,
        timestamp: typeof ts === 'number' ? ts : Number(ts ?? 0),
      };

      // Desembrulha invólucros (deviceSentMessage de msgs enviadas do próprio aparelho, ephemeral,
      // viewOnce, editado…) e IGNORA mensagens de protocolo/sistema (setup de sessão, sync, distribuição
      // de chave). Elas acompanham o pareamento e o envio pelo celular e poluiriam o inbox como [other].
      // (Baileys: extractMessageContent + getContentType.)
      let content = extractMessageContent(m.message ?? undefined);
      if (content?.deviceSentMessage?.message) {
        content = extractMessageContent(content.deviceSentMessage.message);
      }
      const ctype = content ? getContentType(content) : undefined;
      if (
        !ctype ||
        ctype === 'protocolMessage' ||
        ctype === 'senderKeyDistributionMessage'
      ) {
        continue;
      }

      const media = mediaInfoOf(content);
      if (media) {
        // download + upload S3 são assíncronos — não travam o handler de eventos.
        void this.handleIncomingMedia(m, base, media);
        continue;
      }

      const text =
        content?.conversation ?? content?.extendedTextMessage?.text ?? null;
      this.deps.onEvent('message', {
        ...base,
        type: text != null ? 'text' : 'other',
        text,
      });
    }
  }

  // G3 — receipts: o Baileys emite messages.update com `update.status` quando uma mensagem que
  // enviamos é entregue/lida. Traduzimos para um evento `message.ack` first-class.
  private onMessagesUpdate(updates: WAMessageUpdate[]): void {
    for (const { key, update } of updates) {
      const status = mapAckStatus(update.status);
      if (!status) continue;
      const keyId = key.id ?? '';
      if (!keyId) continue;
      let chatJid = key.remoteJid ?? '';
      if (!chatJid || chatJid === 'status@broadcast') continue;
      // Mesma normalização do upsert: @lid → telefone (quando conhecido) e @s.whatsapp.net canônico.
      if (chatJid.endsWith('@lid')) {
        const pn = this.lidToPn.get(chatJid);
        if (pn) chatJid = pn;
      }
      if (chatJid.endsWith('@s.whatsapp.net')) {
        chatJid = jidNormalizedUser(chatJid);
      }
      this.deps.onEvent('message.ack', {
        keyId,
        chatJid,
        fromMe: !!key.fromMe,
        status,
        timestamp: Math.floor(Date.now() / 1000),
      });
    }
  }

  // Baixa o binário da mídia recebida, sobe para o S3 e emite o evento com a chave (§ F4).
  private async handleIncomingMedia(
    m: WAMessage,
    base: {
      keyId: string;
      chatJid: string;
      senderJid: string | null;
      fromMe: boolean;
      source: MessageSource | null;
      timestamp: number;
    },
    media: MediaInfo,
  ): Promise<void> {
    if (!this.sock) return;
    try {
      const buffer = (await downloadMediaMessage(
        m,
        'buffer',
        {},
        {
          reuploadRequest: this.sock.updateMediaMessage,
          logger: this.deps.logger as never,
        },
      )) as Buffer;

      const ext = extOf(media.mimetype, media.fileName);
      const safeId = (base.keyId || String(base.timestamp)).replace(
        /[^a-zA-Z0-9_-]/g,
        '',
      );
      const key = `media/${this.deps.sessionId}/${safeId}.${ext}`;
      await this.deps.storeMedia?.(
        key,
        buffer,
        media.mimetype ?? 'application/octet-stream',
      );

      this.deps.onEvent('message', {
        ...base,
        type: media.mediaType,
        text: media.caption,
        mediaType: media.mediaType,
        mimetype: media.mimetype,
        fileName: media.fileName,
        fileSize: media.fileSize ?? buffer.length,
        mediaKey: key,
      });
    } catch (e) {
      // `err` (não `e`): o pino só aplica o serializer de Error na chave `err` — com `e` o log
      // saía como objeto vazio e a causa real (ex.: NoSuchBucket) ficava invisível (CP-149).
      this.deps.logger.error(
        { err: e, reason: (e as Error)?.message },
        'falha ao baixar/armazenar mídia — a mensagem seguirá SEM mediaKey/mediaUrl',
      );
      // Emite os metadados mesmo sem o binário, para a conversa não “sumir”.
      this.deps.onEvent('message', {
        ...base,
        type: media.mediaType,
        text: media.caption,
        mediaType: media.mediaType,
        mimetype: media.mimetype,
        fileName: media.fileName,
        fileSize: media.fileSize,
      });
    }
  }

  async sendText(
    to: string,
    text: string,
    opts?: SendOptions,
  ): Promise<{ keyId: string; jid: string }> {
    if (!this.sock) throw new Error('Sessão não conectada');
    const jid = await this.resolveJid(to);
    const sent = await this.sock.sendMessage(jid, { text });
    const keyId = sent?.key?.id ?? '';
    if (keyId && sent?.message) this.cacheSent(keyId, sent.message);
    // O Baileys não emite messages.upsert para o que enviamos — emitimos aqui.
    this.deps.onEvent('message', {
      keyId,
      chatJid: jid,
      senderJid: this.sock.user?.id ?? null,
      fromMe: true,
      type: 'text',
      text,
      isCold: opts?.cold ?? false,
      idempotencyKey: opts?.idempotencyKey ?? null,
      source: 'api',
      raw: sent?.message ? encodeProto(sent.message) : null,
      timestamp: Math.floor(Date.now() / 1000),
    });
    return { keyId, jid };
  }

  async sendMedia(
    to: string,
    input: SendMediaInput,
  ): Promise<{ keyId: string; jid: string }> {
    if (!this.sock) throw new Error('Sessão não conectada');
    const jid = await this.resolveJid(to);
    const content = buildMediaContent(input);
    const sent = await this.sock.sendMessage(jid, content);
    const keyId = sent?.key?.id ?? '';
    if (keyId && sent?.message) this.cacheSent(keyId, sent.message);

    // Guarda nossa própria mídia no S3 para ela aparecer no Inbox (mesma pipeline da recebida).
    let mediaKey: string | null = null;
    try {
      const ext = extOf(input.mimetype, input.fileName ?? null);
      const safeId = (keyId || String(Date.now())).replace(
        /[^a-zA-Z0-9_-]/g,
        '',
      );
      mediaKey = `media/${this.deps.sessionId}/${safeId}.${ext}`;
      await this.deps.storeMedia?.(mediaKey, input.buffer, input.mimetype);
    } catch (e) {
      this.deps.logger.error(
        { err: e, reason: (e as Error)?.message },
        'falha ao armazenar mídia enviada',
      );
      mediaKey = null;
    }

    this.deps.onEvent('message', {
      keyId,
      chatJid: jid,
      senderJid: this.sock.user?.id ?? null,
      fromMe: true,
      type: input.type,
      text: input.caption ?? null,
      isCold: input.cold ?? false,
      idempotencyKey: input.idempotencyKey ?? null,
      source: 'api',
      mediaType: input.type,
      mimetype: input.mimetype,
      fileName: input.fileName ?? null,
      fileSize: input.buffer.length,
      mediaKey,
      raw: sent?.message ? encodeProto(sent.message) : null,
      timestamp: Math.floor(Date.now() / 1000),
    });
    return { keyId, jid };
  }

  // Resolve o JID canônico de números individuais (corrige o 9º dígito BR — §23.11).
  private async resolveJid(to: string): Promise<string> {
    let jid = toJid(to);
    if (this.sock && jid.endsWith('@s.whatsapp.net')) {
      const number = jid.slice(0, -'@s.whatsapp.net'.length);
      const result = (await this.sock.onWhatsApp(number))?.[0];
      if (!result?.exists) {
        throw new Error(`O número ${number} não está no WhatsApp`);
      }
      jid = result.jid;
      // Baileys 7.x: onWhatsApp não retorna mais o LID (o mapeamento LID↔PN passou a ser resolvido
      // pelo lidMapping interno do Baileys). Registramos só o PN aqui.
      this.deps.contacts?.record({
        waId: jid,
        jid,
        lid: null,
        source: 'onwhatsapp',
      });
    }
    return jid;
  }

  // Humanização (F6): "digitando…" antes do envio em campanhas.
  async sendPresence(to: string, state: PresenceState): Promise<void> {
    // available/unavailable são presença GLOBAL (sem jid); os demais são por chat.
    if (state === 'available' || state === 'unavailable') {
      await this.sk().sendPresenceUpdate(state);
    } else {
      await this.sk().sendPresenceUpdate(state, toJid(to));
    }
  }

  // G8 — marca a mensagem como lida (read receipt). Em 1:1 a key {remoteJid,id,fromMe:false} basta.
  async markRead(chatJid: string, msgId: string): Promise<void> {
    await this.sk().readMessages([
      { remoteJid: toJid(chatJid), id: msgId, fromMe: false },
    ]);
  }

  private cacheSent(keyId: string, message: proto.IMessage): void {
    if (this.sentMessages.size >= SENT_CACHE_MAX) {
      const oldest = this.sentMessages.keys().next().value;
      if (oldest) this.sentMessages.delete(oldest);
    }
    this.sentMessages.set(keyId, message);
  }

  // getMessage do Baileys: responde aos *retry receipts* — quando o destinatário não conseguiu
  // descriptografar, ele pede o reenvio e o Baileys chama isto para re-encriptar a mensagem
  // original. O cache em memória (`sentMessages`) é volátil: some em reconnect/restart e por
  // eviction (SENT_CACHE_MAX) — crítico num gateway de campanhas. Sem um fallback durável, o
  // retry devolve `undefined` e o destinatário fica preso em "Aguardando mensagem" para sempre.
  // Caímos para o banco (índice @@index([sessionId, keyId])) e reconstruímos o texto. (blueprint §8.6)
  private async loadMessageForRetry(
    key: proto.IMessageKey,
  ): Promise<proto.IMessage | undefined> {
    const id = key.id ?? undefined;
    if (!id) return undefined;
    const cached = this.sentMessages.get(id);
    if (cached) return cached;
    try {
      const row = await this.deps.prisma.waMessage.findFirst({
        where: { sessionId: this.deps.sessionId, keyId: id, fromMe: true },
        select: { raw: true, text: true },
      });
      // `raw` guarda o proto.IMessage inteiro (texto E mídia) → reenvio fiel no retry.
      if (row?.raw != null) {
        const message = decodeProto(row.raw);
        this.cacheSent(id, message); // reidrata o cache p/ retries subsequentes
        return message;
      }
      // Fallback p/ linhas antigas (sem raw): ao menos o texto, p/ não travar texto puro.
      if (row?.text != null) {
        const message: proto.IMessage = { conversation: row.text };
        this.cacheSent(id, message);
        return message;
      }
    } catch (e) {
      this.deps.logger.warn(
        { e, keyId: id },
        'getMessage: falha ao buscar mensagem no banco para retry',
      );
    }
    return undefined;
  }

  // F7.2 — executa um handler de evento isolando falhas (sync e async). Erro de UMA sessão é
  // logado com o sessionId e NÃO propaga (não derruba o processo nem as outras sessões).
  private safe(fn: () => void | Promise<void>, ctx: string): void {
    try {
      const r = fn();
      if (r && typeof (r as Promise<void>).catch === 'function') {
        void (r as Promise<void>).catch((e) =>
          this.deps.logger.error(
            { e, sessionId: this.deps.sessionId },
            `handler ${ctx} falhou`,
          ),
        );
      }
    } catch (e) {
      this.deps.logger.error(
        { e, sessionId: this.deps.sessionId },
        `handler ${ctx} falhou`,
      );
    }
  }

  private sk(): WASocket {
    if (!this.sock) throw new Error('Sessão não conectada');
    return this.sock;
  }

  private async resolveParticipants(items: string[]): Promise<string[]> {
    const out: string[] = [];
    for (const it of items) {
      out.push(it.includes('@') ? it : await this.resolveJid(it));
    }
    return out;
  }

  // Aquece o cache LID↔telefone (em memória) a partir do diretório persistido (sobrevive a restart).
  private async warmLidCache(): Promise<void> {
    try {
      const pairs = (await this.deps.contacts?.loadLidMap()) ?? [];
      for (const p of pairs) this.lidToPn.set(p.lid, p.jid);
      // Passada única de merge: funde conversas que ficaram divididas em @lid ANTES de o par ser
      // aprendido (Inbox "sem todas as conversas"). Roda no open, fora do hot path de mensagens.
      void this.mergeKnownLids();
    } catch {
      /* noop */
    }
  }

  // Merge retroativo: reescreve para o telefone as mensagens gravadas com este @lid (funde a
  // conversa dividida no Inbox). Idempotente — mesmo mecanismo da engine wwebjs.
  private async mergeLidMessages(lid: string, phoneJid: string): Promise<void> {
    try {
      const r = await this.deps.prisma.waMessage.updateMany({
        where: { sessionId: this.deps.sessionId, chatJid: lid },
        data: { chatJid: phoneJid },
      });
      if (r.count > 0) {
        this.deps.logger.info(
          { lid, phoneJid, count: r.count },
          'merge LID->telefone (retroativo)',
        );
      }
    } catch (e) {
      this.deps.logger.error({ e }, 'mergeLidMessages falhou');
    }
  }

  // Funde no banco todas as conversas @lid cujo telefone já é conhecido (diretório/cache).
  private async mergeKnownLids(): Promise<void> {
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
        const pn = this.lidToPn.get(r.chatJid);
        if (pn) await this.mergeLidMessages(r.chatJid, pn);
      }
    } catch (e) {
      this.deps.logger.error({ e }, 'mergeKnownLids falhou');
    }
  }

  // contacts.upsert/update do Baileys → diretório (a fonte mais completa).
  private onContacts(list: Array<Partial<Contact>>): void {
    const records = list
      .filter((c) => c.id)
      .map((c) => contactToRecord(c, 'contacts-sync'));
    if (records.length) this.deps.contacts?.recordMany(records);
  }

  private recordGroupParticipants(md: RawGroup): void {
    const recs: ContactRecord[] = (md.participants ?? []).map((p) => ({
      waId: p.id,
      jid: p.jid ?? (p.id.endsWith('@s.whatsapp.net') ? p.id : null),
      lid: p.lid ?? (p.id.endsWith('@lid') ? p.id : null),
      name: p.name ?? null,
      pushName: p.notify ?? null,
      source: 'group',
    }));
    if (recs.length) this.deps.contacts?.recordMany(recs);
  }

  // ---- Grupos (§ F5) ----
  // Busca em lote (1 query) os nomes salvos no diretório para todos os participantes dos grupos.
  private async resolveParticipantNames(
    groups: RawGroup[],
  ): Promise<Map<string, { name: string | null; pushName: string | null }>> {
    if (!this.deps.contacts?.resolveNames) return new Map();
    const keys = new Set<string>();
    for (const g of groups) {
      for (const p of g.participants ?? []) {
        if (p.id) keys.add(p.id);
        if (p.lid) keys.add(p.lid);
        if (p.jid) keys.add(p.jid);
        const phone = resolveParticipantPhone(p, this.lidToPn);
        if (phone) keys.add(phone);
      }
    }
    if (!keys.size) return new Map();
    try {
      return await this.deps.contacts.resolveNames([...keys]);
    } catch {
      return new Map();
    }
  }

  async listGroups(): Promise<GroupInfo[]> {
    const map = await this.sk().groupFetchAllParticipating();
    const raws = Object.values(map) as unknown as RawGroup[];
    for (const g of raws) this.recordGroupParticipants(g);
    const names = await this.resolveParticipantNames(raws);
    return raws.map((g) => toGroupInfo(g, this.lidToPn, names));
  }
  async groupInfo(jid: string): Promise<GroupInfo> {
    const md = (await this.sk().groupMetadata(
      toGroupJid(jid),
    )) as unknown as RawGroup;
    this.recordGroupParticipants(md);
    const names = await this.resolveParticipantNames([md]);
    return toGroupInfo(md, this.lidToPn, names);
  }
  async createGroup(
    subject: string,
    participants: string[],
  ): Promise<GroupInfo> {
    const jids = await this.resolveParticipants(participants);
    const md = await this.sk().groupCreate(subject, jids);
    return toGroupInfo(md as unknown as RawGroup, this.lidToPn);
  }
  async updateParticipants(
    jid: string,
    action: GroupParticipantAction,
    participants: string[],
  ): Promise<void> {
    const jids = await this.resolveParticipants(participants);
    await this.sk().groupParticipantsUpdate(toGroupJid(jid), jids, action);
  }
  async leaveGroup(jid: string): Promise<void> {
    await this.sk().groupLeave(toGroupJid(jid));
  }
  async setGroupSubject(jid: string, subject: string): Promise<void> {
    await this.sk().groupUpdateSubject(toGroupJid(jid), subject);
  }
  async setGroupDescription(jid: string, description: string): Promise<void> {
    await this.sk().groupUpdateDescription(toGroupJid(jid), description);
  }
  async groupInviteCode(jid: string): Promise<string> {
    return (await this.sk().groupInviteCode(toGroupJid(jid))) ?? '';
  }
  async groupRevokeInvite(jid: string): Promise<string> {
    return (await this.sk().groupRevokeInvite(toGroupJid(jid))) ?? '';
  }

  // ---- Contatos / perfil (§ F5) ----
  async checkNumbers(numbers: string[]): Promise<ContactCheck[]> {
    const sock = this.sk();
    const out: ContactCheck[] = [];
    for (const n of numbers) {
      const digits = n.replace(/[^0-9]/g, '');
      const r = (await sock.onWhatsApp(digits))?.[0] as
        | { jid?: string; exists?: boolean }
        | undefined;
      out.push({
        number: n,
        exists: !!r?.exists,
        jid: r?.exists ? (r.jid ?? null) : null,
      });
    }
    return out;
  }
  async profilePicture(jid: string): Promise<string | null> {
    try {
      return (
        (await this.sk().profilePictureUrl(toContactJid(jid), 'image')) ?? null
      );
    } catch {
      return null; // sem foto ou perfil privado
    }
  }
  async setBlock(jid: string, action: 'block' | 'unblock'): Promise<void> {
    await this.sk().updateBlockStatus(toContactJid(jid), action);
  }
  async saveContact(jid: string, input: SaveContactInput): Promise<void> {
    const fullName =
      [input.firstName, input.lastName]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(' ') || input.firstName;
    // addOrEditContact = chatModify({ contact }) → app-state sync (propaga p/ todos os devices).
    await this.sk().addOrEditContact(toContactJid(jid), {
      firstName: input.firstName,
      fullName,
      saveOnPrimaryAddressbook: input.syncToPhone ?? false,
    });
  }
  async removeContact(jid: string): Promise<void> {
    await this.sk().removeContact(toContactJid(jid));
  }

  // ---- Canais / newsletter (§ F5 — beta) ----
  async createChannel(
    name: string,
    description?: string,
  ): Promise<ChannelInfo> {
    const md = await this.sk().newsletterCreate(name, description);
    return toChannelInfo(md as unknown as RawNewsletter);
  }
  async channelInfo(jid: string): Promise<ChannelInfo> {
    const md = await this.sk().newsletterMetadata('jid', jid);
    return toChannelInfo(md as unknown as RawNewsletter);
  }
  async followChannel(jid: string): Promise<void> {
    await this.sk().newsletterFollow(jid);
  }
  async unfollowChannel(jid: string): Promise<void> {
    await this.sk().newsletterUnfollow(jid);
  }

  async requestPairingCode(phoneNumber: string): Promise<string> {
    if (!this.sock) throw new Error('Sessão não iniciada');
    const digits = phoneNumber.replace(/[^0-9]/g, '');
    const code = await this.sock.requestPairingCode(digits);
    this.setStatus('PAIRING_CODE');
    return code;
  }

  stop(): Promise<void> {
    // `stopped` marcado FORA da fila: cancela na hora reconexões agendadas e faz um start em
    // andamento terminar sem ser seguido de reconexão — o doStop serializado fecha o resto.
    this.stopped = true;
    return this.serialize(() => this.doStop());
  }

  private async doStop(): Promise<void> {
    this.stopped = true;
    // Remove os listeners ANTES de encerrar o socket. Sem isto, o `end()` dispara um
    // connection.update 'close' tardio que reentra em onConnectionUpdate e re-emite status
    // (status fantasma após a parada). Espelha a limpeza feita no início de connect().
    this.detachSocketListeners();
    try {
      this.sock?.end(undefined);
    } catch {
      /* noop */
    }
    this.sock = null;
    this.qrBase64 = null;
    this.setStatus('STOPPED');
  }

  private detachSocketListeners(): void {
    try {
      const ev = this.sock?.ev as unknown as {
        removeAllListeners?: (event?: string) => void;
      };
      ev?.removeAllListeners?.('connection.update');
      ev?.removeAllListeners?.('creds.update');
      ev?.removeAllListeners?.('messages.upsert');
    } catch {
      /* noop */
    }
  }

  logout(): Promise<void> {
    this.stopped = true;
    return this.serialize(() => this.doLogout());
  }

  private async doLogout(): Promise<void> {
    this.stopped = true;
    try {
      await this.sock?.logout();
    } catch {
      /* noop */
    }
    this.detachSocketListeners();
    try {
      this.sock?.end(undefined);
    } catch {
      /* noop */
    }
    this.sock = null;
    this.qrBase64 = null;
    this.sentMessages.clear();
    await this.clearCredentials();
    this.setStatus('STOPPED', { meJid: null, mePushName: null, error: null });
  }

  // Apaga as credenciais persistidas (chaves Signal + creds do handshake). Idempotente;
  // updateMany: se a sessão já foi removida, não lança P2025 (segue como no-op).
  private async clearCredentials(): Promise<void> {
    await this.deps.prisma.waAuthKey.deleteMany({
      where: { sessionId: this.deps.sessionId },
    });
    await this.deps.prisma.waSession.updateMany({
      where: { id: this.deps.sessionId },
      data: { creds: Prisma.DbNull },
    });
  }
}

function toJid(to: string): string {
  if (to.includes('@')) return to;
  const digits = to.replace(/[^0-9]/g, '');
  return `${digits}@s.whatsapp.net`;
}
