import makeWASocket, {
  BufferJSON,
  DEFAULT_CONNECTION_CONFIG,
  downloadMediaMessage,
  extractMessageContent,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  proto,
  WAMessageStubType,
  type ConnectionState,
  type Contact,
  type GroupMetadata,
  type MessageUpsertType,
  type NewChatMessageCapInfo,
  type WAMessage,
  type WAMessageKey,
  type WAMessageUpdate,
  type WASocket,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';
import type { Agent } from 'node:http';
import type { Agent as HttpsAgent } from 'node:https';
import type { Logger } from 'pino';
import { Agent as UndiciAgent, type Dispatcher } from 'undici';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import type { ContactRecord } from '../../../../infra/directory/contact-directory.service';
import type { AnyMessageContent } from '@whiskeysockets/baileys';
import type {
  ChannelInfo,
  ChatFlag,
  ChatSummary,
  ContactCheck,
  EngineEventHandler,
  ForwardSource,
  GroupInfo,
  GroupParticipantAction,
  GroupSettingKey,
  AckStatus,
  HistoryMessage,
  IEngine,
  MembershipAction,
  MembershipRequest,
  MessageSource,
  PreparedForward,
  PresenceState,
  ReactionPayload,
  ReachoutRestrictionSignal,
  SaveContactInput,
  SendLocationInput,
  SendMediaInput,
  SendOptions,
  SendPollInput,
  SendResult,
  SessionStatePayload,
} from '../../application/engine.port';
import {
  ForwardSourceError,
  UnsupportedEngineOperationError,
} from '../../application/engine.port';
import type { SessionStatus } from '../../domain/session-status';
import { usePostgresAuthState } from './postgres-auth-state';
import type { PostgresSessionLease } from '../postgres-session-lease';
import { browserFingerprint } from './browser-fingerprint';
import {
  formatLocation,
  formatPoll,
  type ContentMedia,
} from '../message-content';
import {
  describeBaileysMessage,
  forwardableContent,
  toNum,
} from './baileys-content';
import { shouldAcceptUpsert } from './upsert-decision';
import { recordProcessError } from '../../../../shared-kernel/process-errors';
import { recordDisconnect } from '../../../../shared-kernel/disconnect-stats';
import type { SessionErrorDetails } from '../../domain/session.entity';
import { classifyDisconnect, disconnectDetails } from './disconnect-policy';
import { BaileysCacheObserver } from './baileys-cache-observer';

export interface BaileysEngineDeps {
  sessionId: string;
  deviceName: string;
  prisma: PrismaService;
  lease?: PostgresSessionLease;
  authEpoch?: bigint;
  onAuthEpoch?: (epoch: bigint) => void;
  logger: Logger;
  onEvent: EngineEventHandler;
  // E8: sinal LOCAL para o SessionManager gravar a pausa no guardrail; não usa EventBus remoto.
  onRestrictionSignal?: (signal: ReachoutRestrictionSignal) => Promise<void>;
  // Persiste o último código/motivo sem publicar `session.status` em cada queda transitória.
  onDisconnect?: (details: SessionErrorDetails) => Promise<void>;
  baileysProtocolVersion?: string;
  baileysProtocolCanarySessionId?: string;
  onProtocolVersion?: (version: string, source: string) => void;
  // Guard anti-vazamento (WA_REQUIRE_PROXY): quando true, a engine RECUSA conectar se resolveAgent
  // não devolver proxy — evita expor o IP do servidor (datacenter) ao WhatsApp. Default false.
  requireProxy?: boolean;
  // Resolve o proxy (agent) a cada conexão. null/ausente => conexão direta, sem proxy (§7.4).
  resolveAgent?: () => Promise<Agent | null>;
  // A mesma escolha de proxy alimenta WebSocket/upload e o fetch da CDN. null na factory com
  // Agent presente (SOCKS) = mídia apenas com metadados, sem saída direta pelo IP do servidor.
  resolveBaileysTransport?: () => Promise<{
    agent: Agent | null;
    createMediaDispatcher: (() => Dispatcher) | null;
  }>;
  // Dados crus do proxy (server + auth) para engines que aplicam proxy no browser (wwebjs:
  // --proxy-server + proxyAuthentication). null => conexão direta.
  resolveProxyConfig?: () => Promise<{
    server: string;
    username?: string;
    password?: string;
  } | null>;
  // Somente wwebjs: override persistido da build WA Web da sessão (null = modo global).
  resolveWwebjsWebVersion?: () => Promise<string | null>;
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

// A consulta da rc14 usa fetch sem repassar AbortSignal. Limitamos a espera e o número de
// consultas; só `isLatest:true` atualiza o cache. Um retorno tardio após o teto é ignorado.
type BaileysVersion = Awaited<
  ReturnType<typeof fetchLatestBaileysVersion>
>['version'];
type VersionSelection = {
  version: BaileysVersion | undefined;
  source: 'latest' | 'cache' | 'stale-cache' | 'bundled';
};
let baileysVersionCache: {
  version: BaileysVersion;
  fetchedAt: number;
} | null = null;
const BAILEYS_VERSION_TTL_MS = 12 * 60 * 60 * 1000;
const BAILEYS_VERSION_FETCH_TIMEOUT_MS = 3_000;
const BAILEYS_VERSION_RETRY_MS = 30_000;
const MEDIA_DOWNLOAD_WAIT_MS = 90_000;
const MEDIA_REUPLOAD_WAIT_MS = 20_000;
let baileysVersionFetch: Promise<VersionSelection> | null = null;
let lastVersionFetchAt: number | null = null;

function staleVersion(): VersionSelection {
  return baileysVersionCache
    ? { version: baileysVersionCache.version, source: 'stale-cache' }
    : { version: undefined, source: 'bundled' };
}

async function latestBaileysVersion(logger: Logger): Promise<VersionSelection> {
  if (
    baileysVersionCache &&
    Date.now() - baileysVersionCache.fetchedAt < BAILEYS_VERSION_TTL_MS
  ) {
    return { version: baileysVersionCache.version, source: 'cache' };
  }
  if (baileysVersionFetch) return baileysVersionFetch;
  if (
    lastVersionFetchAt !== null &&
    Date.now() - lastVersionFetchAt < BAILEYS_VERSION_RETRY_MS
  )
    return staleVersion();
  lastVersionFetchAt = Date.now();
  baileysVersionFetch = (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        fetchLatestBaileysVersion(),
        new Promise<undefined>((resolve) => {
          timer = setTimeout(
            () => resolve(undefined),
            BAILEYS_VERSION_FETCH_TIMEOUT_MS,
          );
          timer.unref?.();
        }),
      ]);
      if (result?.isLatest) {
        baileysVersionCache = {
          version: result.version,
          fetchedAt: Date.now(),
        };
        return {
          version: result.version,
          source: 'latest',
        } as VersionSelection;
      }
      logger.warn(
        { timedOut: !result, err: result?.error },
        'versão Baileys não confirmada; usando cache/default embutido',
      );
    } catch (e) {
      logger.warn(
        { err: e },
        'consulta de versão Baileys falhou; usando cache/default embutido',
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
    return staleVersion();
  })().finally(() => {
    baileysVersionFetch = null;
  });
  return baileysVersionFetch;
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
// corromper Buffers — mesma técnica do auth state. Usado pelo getMessage no retry de descriptografia
// e pelo encaminhar (P-068). Numa INSTÂNCIA proto o JSON.stringify passa antes pelo toJSON do
// protobufjs: bytes viram base64, long vira string e ENUM vira o NOME — por isso a volta passa pelo
// `proto.Message.fromObject` (sem ele o enum ≠ 0 virava 0 no reenvio: `gifAttribution` GIPHY,
// `font` de texto com prévia — provado offline na E24). Objeto plano com Buffer também volta
// (o reviver refaz o Buffer; o fromObject aceita os dois).
function encodeProto(msg: proto.IMessage): unknown {
  return JSON.parse(JSON.stringify(msg, BufferJSON.replacer));
}
function decodeProto(value: unknown): proto.IMessage {
  return proto.Message.fromObject(
    JSON.parse(JSON.stringify(value), BufferJSON.reviver) as Record<
      string,
      unknown
    >,
  );
}

// W6 — mapeia uma reação recebida (key da msg-alvo + proto.IReaction) para o payload público.
// `text` vazio = reação REMOVIDA; `reaction.key.fromMe` = a reação é nossa. Pura/testável.
// Na rc14 o evento `messages.reaction` traz `key` = mensagem-ALVO e `reaction.key` = a chave da
// mensagem de REAÇÃO (Utils/process-message.js:411-419): quem reagiu é `reaction.key.participant`
// (grupo) ou `reaction.key.remoteJid` (1:1). E22: até aqui o remetente saía de `key.participant`,
// que é o AUTOR DA MENSAGEM-ALVO — em grupo, duas pessoas reagindo pareciam a mesma (e em 1:1 saía
// `""`: o cleanMessage deixa participant vazio). O `*Alt` (Types/Message.d.ts:19-21) é o MESMO
// endereço no OUTRO formato — telefone quando a mensagem veio endereçada por LID, e @lid quando veio
// por telefone (Utils/decode-wa-message.js:73-92, :178-187) —, então vence o lado que for telefone.
export function mapBaileysReaction(
  key: proto.IMessageKey,
  reaction: proto.IReaction,
  ourJid: string | null,
): ReactionPayload | null {
  const keyId = key.id ?? '';
  const chatJid = key.remoteJid ?? '';
  if (!keyId || !chatJid || chatJid === 'status@broadcast') return null;
  const rk = (reaction.key ?? null) as WAMessageKey | null;
  const fromMe = !!rk?.fromMe;
  const reactor = chatJid.endsWith('@g.us')
    ? phoneFirst(rk?.participant, rk?.participantAlt) ||
      key.participant ||
      chatJid
    : phoneFirst(rk?.remoteJid, rk?.remoteJidAlt) || chatJid;
  const ts = toNum(reaction.senderTimestampMs);
  return {
    keyId,
    chatJid,
    senderJid: fromMe ? ourJid : reactor,
    emoji: reaction.text ?? '',
    fromMe,
    timestamp: ts ? Math.floor(ts / 1000) : Math.floor(Date.now() / 1000),
  };
}

// Do par (endereço, *Alt), o lado que for telefone; sem telefone, o que houver.
function phoneFirst(a?: string | null, b?: string | null): string | null {
  return [a, b].find((j) => j?.endsWith('@s.whatsapp.net')) ?? (a || b || null);
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
// PENDING não vira evento; ERROR vira `error` sem tique. PLAYED conta como leitura.
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
    case S.ERROR:
      return 'error';
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
  lid?: string; // a rc14 fornece quando id é PN
  phoneNumber?: string; // a rc14 fornece quando id é @lid
  name?: string;
  notify?: string;
};

// O roster rc14 expõe phoneNumber (não jid) quando id é @lid. O mapa recebido aqui
// contém apenas pares do próprio roster ou do lidMapping local, nunca lookup na rede.
function resolveParticipantPhone(
  p: RawParticipant,
  lidToPn: Map<string, string>,
): string | null {
  const fromRoster =
    p.phoneNumber ?? (p.id.endsWith('@s.whatsapp.net') ? p.id : null);
  if (fromRoster?.endsWith('@s.whatsapp.net'))
    return jidNormalizedUser(fromRoster).split('@')[0];
  const lidKey = p.lid ?? (p.id.endsWith('@lid') ? p.id : null);
  if (lidKey) {
    const pn = lidToPn.get(jidNormalizedUser(lidKey)) ?? lidToPn.get(lidKey);
    if (pn?.endsWith('@s.whatsapp.net') || pn?.endsWith('@hosted'))
      return jidNormalizedUser(pn).split('@')[0];
  }
  return null;
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
    (p.phoneNumber ? names.get(p.phoneNumber) : undefined) ??
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
const MAX_RESTART_REQUIRED_STREAK = 3;
const SENT_CACHE_MAX = 1000;
const UPSERT_CACHE_MAX = 2000;
// WA-12 (auditoria 09/2026): cache de metadata de grupo. A doc do Baileys recomenda
// `cachedGroupMetadata` para envios a grupo não consultarem os participantes a CADA mensagem
// (consulta repetida é associada por eles a rate-limit). TTL curto + invalidação por evento.
const GROUP_META_TTL_MS = 10 * 60_000;
const GROUP_META_MAX = 500;
const SOCKET_EVENTS = [
  'connection.update',
  'creds.update',
  'messages.upsert',
  'messages.update',
  'message-capping.update',
  'messages.reaction',
  'contacts.upsert',
  'contacts.update',
  'groups.update',
  'group-participants.update',
] as const;
const TIMELOCK_FETCH_TIMEOUT_MS = 3_000;
const TIMELOCK_FETCH_MIN_INTERVAL_MS = 30_000;

function cappingCycleEnd(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return undefined;
  const date = new Date(raw < 1e12 ? raw * 1000 : raw);
  return Number.isFinite(date.getTime()) && date.getTime() > Date.now()
    ? date
    : undefined;
}

export class BaileysEngine implements IEngine {
  readonly engineName = 'baileys' as const;
  private sock: WASocket | null = null;
  private cacheObserver: BaileysCacheObserver | null = null;
  private pairingReadySock: WASocket | null = null;
  // Um Dispatcher por mídia permite destruir só a requisição pendurada, sem afetar outros
  // downloads da sessão. O fetch da rc14 ignora AbortSignal; Promise.race sozinho não o cancela.
  private createMediaDispatcher: (() => Dispatcher) | null = () =>
    new UndiciAgent();
  private status: SessionStatus = 'STOPPED';
  private qrBase64: string | null = null;
  private stopped = false;
  private reconnectAttempts = 0;
  private replacedRetryUsed = false;
  private replacedRetryAttempted = false;
  private restartRequiredStreak = 0;
  // Mutex de ciclo de vida (espelha o da WwebjsEngine): serializa start/stop/logout/reconexão da
  // MESMA sessão. Sem isto, dois start() próximos (duplo clique, restart sobre start, create +
  // autostart) passam ambos pelo `if (this.sock)` de connect() com sock=null e criam DOIS
  // makeWASocket — o primeiro fica órfão com listeners vivos e os dois brigam pela sessão
  // (connectionReplaced/440 em loop até esgotar as reconexões).
  private lifecycle: Promise<unknown> = Promise.resolve();
  // cache de mensagens enviadas — usado pelo getMessage (retry de descriptografia, blueprint §8.6)
  private readonly sentMessages = new Map<string, proto.IMessage>();
  // Dedup antes do onEvent: impede webhook/SSE duplicado enquanto o persister grava em paralelo.
  // O banco cobre restarts; o cache cobre repetições e corridas na mesma instância.
  private readonly seenUpserts = new Set<string>();
  // cache LID→número (PN) aprendido das mensagens, para resolver conversas 1:1 (§23.1)
  private readonly lidToPn = new Map<string, string>();
  // Revisão E23: telefone de participante de grupo → último pushName gravado no diretório (evita um
  // upsert por mensagem). Teto FIFO, como o cacheLidPn do wwebjs.
  private readonly groupPushName = new Map<string, string>();
  // WA-11: timer da reconexão agendada + geração do connect. Antes o timer não era guardado: um
  // stop()+start() rápido deixava o timer velho vivo e ele derrubava o socket NOVO (saudável)
  // para "reconectar". Agora: start/stop/logout cancelam o timer e o callback checa a geração.
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private connectGeneration = 0;
  private timelockFetch: Promise<void> | null = null;
  private lastTimelockFetchAt = 0;
  // WA-12: metadata de grupo (jid → metadata + instante) servida ao `cachedGroupMetadata`.
  private readonly groupMetaCache = new Map<
    string,
    { md: GroupMetadata; at: number }
  >();

  constructor(private readonly deps: BaileysEngineDeps) {}

  private cacheGroupMeta(md: GroupMetadata | null | undefined): void {
    if (!md?.id) return;
    if (this.groupMetaCache.size >= GROUP_META_MAX) {
      const oldest = this.groupMetaCache.keys().next().value;
      if (oldest) this.groupMetaCache.delete(oldest);
    }
    this.groupMetaCache.set(md.id, { md, at: Date.now() });
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }

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
      this.replacedRetryUsed = false;
      this.replacedRetryAttempted = false;
      this.restartRequiredStreak = 0;
      this.clearReconnectTimer(); // WA-11: reconexão pendente de um ciclo anterior não vale mais
      this.connectGeneration += 1;
      return this.connect();
    });
  }

  private async connect(persistStartingStatus = true): Promise<void> {
    if (this.stopped) return;
    if (this.sock) {
      this.detachSocketListeners();
      this.cacheObserver?.close('close');
      this.cacheObserver = null;
      this.pairingReadySock = null;
      try {
        this.sock.end(undefined);
      } catch {
        /* noop */
      }
      this.sock = null;
    }

    if (!this.deps.lease || this.deps.authEpoch === undefined) {
      throw new Error('Baileys sem lease de auth');
    }
    const { state, saveCreds } = await usePostgresAuthState(
      this.deps.prisma,
      this.deps.sessionId,
      this.deps.lease,
      this.deps.authEpoch,
    );
    if (this.stopped) return;
    const canaryOverride =
      this.deps.baileysProtocolCanarySessionId === this.deps.sessionId &&
      this.deps.baileysProtocolVersion;
    const selected = canaryOverride
      ? {
          version: canaryOverride.split('.').map(Number) as BaileysVersion,
          source: 'canary-override' as const,
        }
      : await latestBaileysVersion(this.deps.logger);
    if (this.stopped) return;
    const { version } = selected;
    this.deps.logger.info(
      {
        sessionId: this.deps.sessionId,
        version: (version ?? DEFAULT_CONNECTION_CONFIG.version).join('.'),
        source: selected.source,
      },
      'versão do protocolo Baileys nesta conexão',
    );
    this.deps.onProtocolVersion?.(
      (version ?? DEFAULT_CONNECTION_CONFIG.version).join('.'),
      selected.source,
    );

    // Proxy (§7.4): uma única resolução decide o Agent Node do WebSocket/upload (`fetchAgent`)
    // e o Dispatcher undici do download. Uma segunda resolução avançaria o cursor rotativo.
    const transport = await this.deps.resolveBaileysTransport?.();
    const agent = transport
      ? (transport.agent ?? undefined)
      : ((await this.deps.resolveAgent?.()) ?? undefined);
    this.createMediaDispatcher = transport
      ? (transport.createMediaDispatcher ??
        (agent ? null : () => new UndiciAgent()))
      : agent
        ? null
        : () => new UndiciAgent();
    if (this.stopped) return;

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

    const cacheObserver = new BaileysCacheObserver(
      this.deps.sessionId,
      this.deps.prisma,
      this.deps.logger,
    );
    let sock: WASocket;
    try {
      sock = makeWASocket({
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
        // A frota usa números BR; a rc14 usa US por default. Coerência de configuração,
        // sem alegar que este campo sozinho altere risco de banimento.
        countryCode: 'BR',
        markOnlineOnConnect: false,
        syncFullHistory: false,
        msgRetryCounterCache: cacheObserver.msgRetryCounterCache,
        // A rc14 usa `await` no mget/mset, aceitando o retorno síncrono do próprio NodeCache,
        // mas PossiblyExtendedCacheStore declara esses métodos apenas como Promise.
        userDevicesCache: cacheObserver.userDevicesCache as never,
        // Sob carga, um commit transitório do key store no Postgres não pode perder uma chave
        // Signal e dessincronizar o ratchet. Os valores explícitos já são o default da rc14.
        transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
        // O Baileys tipa agent/fetchAgent como https.Agent; nossos agents (socks/https-proxy)
        // são http.Agent em runtime e funcionam — daí o cast (downcast seguro).
        agent: agent as HttpsAgent | undefined,
        fetchAgent: agent as HttpsAgent | undefined,
        getMessage: async (key) => this.loadMessageForRetry(key),
        // WA-12: envio a grupo reaproveita a metadata (participantes) por GROUP_META_TTL_MS em vez
        // de consultá-la a cada mensagem. Miss → busca 1× e guarda; eventos de grupo invalidam.
        cachedGroupMetadata: async (jid) => {
          const hit = this.groupMetaCache.get(jid);
          if (hit && Date.now() - hit.at < GROUP_META_TTL_MS) return hit.md;
          try {
            const md = await sock.groupMetadata(jid);
            this.cacheGroupMeta(md);
            return md;
          } catch {
            return hit?.md; // stale > nada: a lib consulta de novo se undefined
          }
        },
      });
    } catch (err) {
      cacheObserver.close('erro');
      throw err;
    }
    this.sock = sock;
    this.cacheObserver = cacheObserver;
    this.pairingReadySock = null;
    this.groupMetaCache.clear(); // socket novo: participantes podem ter mudado offline
    if (persistStartingStatus) this.setStatus('STARTING');
    else this.status = 'STARTING'; // 440: não pisar no WORKING de outra réplica antes do open

    // F7.2 — cada handler roda dentro de `safe()`: um erro processando evento de UMA sessão é
    // logado e isolado (não vira uncaughtException nem derruba as outras sessões).
    sock.ev.on('creds.update', () =>
      this.safe(() => saveCreds(), 'creds.update'),
    );
    sock.ev.on('connection.update', (u) => {
      // O evento pode chegar antes de a operação HTTP voltar do start(). Marcar no callback
      // síncrono evita perder o primeiro 'connecting' ao entrar na espera limitada abaixo.
      if (u.connection === 'connecting' || !!u.qr) this.pairingReadySock = sock;
      else if (u.connection === 'close' && this.pairingReadySock === sock)
        this.pairingReadySock = null;
      this.safe(
        () => this.serialize(() => this.onConnectionUpdate(u, sock)),
        'connection.update',
      );
    });
    sock.ev.on('messages.upsert', (u) =>
      this.safe(() => this.onMessagesUpsert(u), 'messages.upsert'),
    );
    // G3 — ACK de entrega/leitura (receipts das mensagens que enviamos).
    sock.ev.on('messages.update', (u) =>
      this.safe(() => this.onMessagesUpdate(u), 'messages.update'),
    );
    sock.ev.on('message-capping.update', (info) =>
      this.safe(() => this.onMessageCapping(info), 'message-capping.update'),
    );
    // Sync de contatos do WhatsApp → diretório persistente (a fonte mais rica de LID↔telefone).
    sock.ev.on('contacts.upsert', (cs) =>
      this.safe(() => this.onContacts(cs), 'contacts.upsert'),
    );
    sock.ev.on('contacts.update', (cs) =>
      this.safe(() => this.onContacts(cs), 'contacts.update'),
    );
    // W6 — reação RECEBIDA (o lead reagiu a uma mensagem). Emite o evento message.reaction.
    sock.ev.on('messages.reaction', (rs) =>
      this.safe(() => this.onReactions(rs), 'messages.reaction'),
    );
    // WA-12 — invalidação do cache de metadata de grupo (membros/assunto mudaram).
    sock.ev.on('groups.update', (updates) => {
      for (const u of updates) if (u.id) this.groupMetaCache.delete(u.id);
    });
    sock.ev.on('group-participants.update', (u) => {
      if (u.id) this.groupMetaCache.delete(u.id);
    });
  }

  // W6 — reações recebidas. O mapeamento (fromMe/emoji/removida/timestamp) é uma função pura
  // testável (mapBaileysReaction); aqui só iteramos e emitimos o evento message.reaction.
  private onReactions(
    reactions: { key: proto.IMessageKey; reaction: proto.IReaction }[],
  ): void {
    const ourJid = this.sock?.user?.id ?? null;
    for (const { key, reaction } of reactions) {
      const payload = mapBaileysReaction(key, reaction, ourJid);
      if (!payload) continue;
      // E22: mesma normalização do upsert — @lid → telefone quando o par é conhecido. O par que vem
      // na própria chave da reação (endereço + *Alt, nos dois sentidos) é aprendido antes — só de
      // reação ALHEIA: na nossa o *Alt pode ser o NOSSO LID. Sem isto a reação de um contato @lid
      // ficava num chat diferente do das mensagens dele (e fora do reply-rate por chat).
      const rk = reaction.key as WAMessageKey | null | undefined;
      if (rk && !rk.fromMe) {
        this.learnPair(rk.remoteJid, rk.remoteJidAlt);
        this.learnPair(rk.participant, rk.participantAlt);
      }
      payload.chatJid = this.resolveChatJid(payload.chatJid);
      if (!payload.fromMe) {
        // 1:1: quem reagiu só pode ser o contato → mesmo formato do chatJid das mensagens.
        payload.senderJid = payload.chatJid.endsWith('@g.us')
          ? payload.senderJid && this.resolveChatJid(payload.senderJid)
          : payload.chatJid;
      }
      this.deps.onEvent('message.reaction', payload);
    }
  }

  // @lid → telefone pelo cache aprendido e @s.whatsapp.net canônico (sem aparelho). Grupo e demais
  // sufixos passam intactos. Mesma regra do upsert.
  private resolveChatJid(jid: string): string {
    if (jid.endsWith('@lid')) return this.lidToPn.get(jid) ?? jid;
    if (jid.endsWith('@s.whatsapp.net')) return jidNormalizedUser(jid);
    return jid;
  }

  // Um endereço e o seu *Alt da MESMA mensagem: se um for @lid e o outro telefone, é um par.
  private learnPair(a?: string | null, b?: string | null): void {
    const lid = [a, b].find((j) => j?.endsWith('@lid'));
    const pn = [a, b].find((j) => j?.endsWith('@s.whatsapp.net'));
    if (lid && pn) this.learnLid(jidNormalizedUser(lid), jidNormalizedUser(pn));
  }

  // Par LID↔telefone NOVO → cache + merge retroativo da conversa que ficou dividida em @lid no banco.
  private learnLid(lid: string, pn: string): void {
    if (this.lidToPn.get(lid) === pn) return;
    this.lidToPn.set(lid, pn);
    void this.mergeLidMessages(lid, pn);
  }

  // P-074 (E23) — remetente de mensagem ALHEIA em grupo = o PARTICIPANTE (antes saía o jid do
  // grupo). Na rc14 `key.participant` já chega sem aparelho (cleanMessage, Utils/process-message.js:
  // 73-78, roda antes do upsert — Socket/messages-recv.js:1431-1432) e `participantAlt` é o MESMO
  // endereço no OUTRO formato: telefone no modo LID, @lid no modo PN (Utils/decode-wa-message.js:
  // 73-86, :187) — vence o lado telefone (phoneFirst), como na reação (E22). `participantAlt ??
  // participant` devolveria o @lid no modo PN. Sem par, @lid → telefone pelo cache. Par NOVO →
  // cache + merge. Sem participante → null (fica o grupo).
  // Diretório (revisão E23): grava {telefone, lid, pushName} quando o par é NOVO (volta no restart
  // pelo warmLidCache) OU quando o pushName (decode-wa-message.js:177) difere do último gravado para
  // aquele telefone — também sem o par NESTA mensagem (@lid resolvido pelo cache, ou só telefone):
  // o contacts.update da lib grava o nome na linha do ENDEREÇO da chave (Socket/chats.js:917-924 —
  // no modo LID, a linha @lid sem telefone), que o senderName por telefone não alcança; e o par pode
  // ter vindo do warmLidCache ou de uma reação, que não gravam nome. No modo PN a linha do telefone
  // já recebe o nome pela lib; a gravação aqui é redundante mas limitada a 1× por nome novo (Map).
  private groupSenderOf(m: WAMessage): string | null {
    const { participant, participantAlt } = m.key;
    const lid = [participant, participantAlt].find((j) => j?.endsWith('@lid'));
    const pn = [participant, participantAlt].find((j) =>
      j?.endsWith('@s.whatsapp.net'),
    );
    const l = lid ? jidNormalizedUser(lid) : null;
    let newPair = false;
    if (l && pn) {
      const p = jidNormalizedUser(pn);
      newPair = this.lidToPn.get(l) !== p;
      this.learnLid(l, p);
    }
    const who = phoneFirst(participant, participantAlt);
    const sender = who ? this.resolveChatJid(jidNormalizedUser(who)) : null;
    // Telefone desconhecido (@lid oculto): o nome já fica na linha @lid pela lib — nada a gravar.
    if (sender?.endsWith('@s.whatsapp.net')) {
      const pushName = m.pushName || null;
      const nameChanged =
        !!pushName && this.groupPushName.get(sender) !== pushName;
      if (newPair || nameChanged) {
        this.deps.contacts?.record({
          waId: sender,
          jid: sender,
          lid: l,
          pushName,
          source: 'message',
        });
        if (pushName) this.rememberGroupPushName(sender, pushName);
      }
    }
    return sender;
  }

  private rememberGroupPushName(pn: string, pushName: string): void {
    if (!this.groupPushName.has(pn) && this.groupPushName.size >= 5000) {
      const oldest = this.groupPushName.keys().next().value;
      if (oldest !== undefined) this.groupPushName.delete(oldest);
    }
    this.groupPushName.set(pn, pushName);
  }

  private async onConnectionUpdate(
    update: Partial<ConnectionState>,
    eventSock?: WASocket,
  ): Promise<void> {
    if (this.stopped || (eventSock && eventSock !== this.sock)) return;
    const generation = this.connectGeneration;
    const { connection, lastDisconnect, qr } = update;

    // rc14: notificação MEX e fetchAccountReachoutTimelock chegam aqui com o MESMO shape.
    // A notificação fabrica now+60s quando o servidor omite o prazo; só a resposta direta
    // do RPC permite confirmar `timeEnforcementEnds`. `isActive:false` não apaga a pausa:
    // o prazo gravado expira por relógio e evita liberação prematura por capping concorrente.
    const lock = update.reachoutTimeLock;
    if (lock?.isActive) {
      try {
        await this.deps.onRestrictionSignal?.({
          signal: 'reachoutTimeLock',
          until: lock.timeEnforcementEnds,
          source: 'temporary',
          enforcementType: lock.enforcementType,
        });
      } catch (err) {
        recordProcessError('baileys_restriction_record');
        this.deps.logger.error({ err }, 'falha ao gravar restrição nativa');
      }
      // A consulta tem single-flight, intervalo mínimo de 30 s e teto de 3 s. Não atrasa
      // status/QR/open da conexão; a própria função captura falha e conserva a pausa.
      void this.fetchReachoutTimelock();
    }

    // `onRestrictionSignal` pode esperar I/O. Um start/stop durante esse await invalida QR,
    // open e close do socket anterior; a pausa E8 já usa o próprio guard do RPC.
    if (
      this.stopped ||
      generation !== this.connectGeneration ||
      (eventSock && eventSock !== this.sock)
    )
      return;

    if (qr) {
      if (this.replacedRetryUsed) return; // réplica substituída não publica QR na tentativa quieta
      try {
        const qrBase64 = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
        if (
          this.stopped ||
          generation !== this.connectGeneration ||
          (eventSock && eventSock !== this.sock)
        )
          return;
        this.qrBase64 = qrBase64;
        this.setStatus('SCAN_QR_CODE');
      } catch (e) {
        this.deps.logger.error({ err: e }, 'falha ao gerar QR');
      }
    }

    if (connection === 'open') {
      void this.cacheObserver?.snapshot('open');
      this.qrBase64 = null;
      this.reconnectAttempts = 0;
      this.replacedRetryUsed = false;
      this.replacedRetryAttempted = false;
      this.restartRequiredStreak = 0;
      const me = this.sock?.user;
      this.setStatus('WORKING', {
        meJid: me?.id ?? null,
        mePushName: me?.name ?? null,
        error: null,
        lastErrorDetails: null,
      });
      void this.warmLidCache(); // aquece o cache LID↔telefone do diretório persistido
    }

    if (connection === 'close') {
      this.cacheObserver?.close('close');
      this.cacheObserver = null;
      this.pairingReadySock = null;
      const details = disconnectDetails(lastDisconnect?.error);
      const decision = classifyDisconnect(details.code, details.reason);
      recordDisconnect('baileys', details.code);
      if (this.stopped) return;
      if (this.replacedRetryUsed) {
        // Após 440, esta réplica perdeu ownership. Nenhum código da tentativa quieta pode
        // limpar credenciais, persistir terminal ou publicar alerta. Um close duplicado antes
        // do timer mantém a única tentativa agendada; depois dela, a réplica fica quiescente.
        if (this.replacedRetryAttempted) {
          this.stopped = true;
          this.clearReconnectTimer();
          this.status = 'DEGRADED';
        }
        return;
      }
      if (decision.action !== 'restart') this.restartRequiredStreak = 0;
      // Não oferecer envio por um socket já fechado durante backoff. Este estado é apenas local;
      // um processo antigo que recebeu 440 não sobrescreve o status compartilhado do novo.
      this.status = 'DEGRADED';
      try {
        await this.deps.onDisconnect?.(details);
      } catch (err) {
        this.deps.logger.error(
          { err },
          'falha ao persistir motivo da desconexão',
        );
      }

      if (
        this.stopped ||
        generation !== this.connectGeneration ||
        (eventSock && eventSock !== this.sock)
      )
        return;

      if (decision.action === 'logged_out') {
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
          error: decision.error,
          lastErrorDetails: details,
        });
        return;
      }
      if (
        decision.action === 'terminal' ||
        decision.action === 'client_too_old'
      ) {
        this.stopped = true;
        this.clearReconnectTimer();
        this.setStatus('FAILED', {
          error: decision.error,
          lastErrorDetails: details,
        });
        if (decision.action === 'client_too_old') {
          this.deps.onEvent('session.client_too_old', details);
        }
        return;
      }

      if (decision.action === 'replaced') {
        this.replacedRetryUsed = true;
        this.scheduleReconnect(60_000, details, false, true);
        return;
      }

      if (decision.action === 'restart') {
        // 515 após pair-success é parte do handshake; não consome orçamento de falhas.
        this.restartRequiredStreak += 1;
        if (this.restartRequiredStreak > MAX_RESTART_REQUIRED_STREAK) {
          this.stopped = true;
          this.setStatus('DEGRADED', {
            error:
              'Reinício 515 repetido sem conexão aberta — verifique a sessão',
            lastErrorDetails: details,
          });
          return;
        }
        this.scheduleReconnect(1_000, details, true);
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
      this.scheduleBudgetedReconnect(details);
    }
  }

  private scheduleBudgetedReconnect(details: SessionErrorDetails): void {
    if (this.reconnectAttempts > MAX_RECONNECT) {
      this.clearReconnectTimer();
      this.setStatus('DEGRADED', {
        error: `Falha ao reconectar após ${MAX_RECONNECT} tentativas (${details.code ?? 'sem código'})`,
        lastErrorDetails: details,
      });
      // Só quedas de transporte/serviço seguem tentando devagar depois do orçamento. 500 pode
      // ser badSession e código desconhecido exige investigação; 401/403/405/411/440/515 já são
      // tratados antes e nunca entram aqui. stop/shutdown invalida o timer por geração.
      if (details.code === 408 || details.code === 428 || details.code === 503)
        this.scheduleReconnect(300_000, details, true);
      return;
    }
    const delay =
      Math.min(30_000, 1_000 * 2 ** this.reconnectAttempts) +
      Math.floor(Math.random() * 1_000);
    this.scheduleReconnect(delay, details, true);
  }

  private scheduleReconnect(
    delay: number,
    details: SessionErrorDetails,
    retryAfterConnectFailure: boolean,
    quietStart = false,
  ): void {
    this.deps.logger.warn(
      {
        code: details.code,
        reason: details.reason,
        attempt: this.reconnectAttempts,
        delay,
      },
      'reconectando sessão',
    );
    // WA-11: um timer por geração; stop/start/logoff invalidam a intenção antiga.
    this.clearReconnectTimer();
    const gen = this.connectGeneration;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.stopped || gen !== this.connectGeneration) return;
      if (quietStart) this.replacedRetryAttempted = true;
      void this.serialize(() =>
        this.stopped || gen !== this.connectGeneration
          ? Promise.resolve()
          : this.connect(!quietStart),
      ).catch((err) => {
        this.deps.logger.error(
          { err, code: details.code },
          'erro ao reconectar',
        );
        if (quietStart && gen === this.connectGeneration) {
          this.stopped = true;
          this.status = 'DEGRADED';
        }
        if (
          !retryAfterConnectFailure ||
          this.stopped ||
          gen !== this.connectGeneration
        )
          return;
        this.reconnectAttempts += 1;
        this.scheduleBudgetedReconnect({
          code: details.code,
          reason:
            err instanceof Error ? err.message.slice(0, 500) : details.reason,
        });
      });
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private async onMessagesUpsert(upsert: {
    messages: WAMessage[];
    type: MessageUpsertType;
  }): Promise<void> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    for (const m of upsert.messages) {
      if (!shouldAcceptUpsert(m, upsert.type, nowSeconds)) continue;
      const keyId = m.key.id ?? '';
      // Já emitida pelo sendText (envio via gateway) → não duplica.
      if (keyId && this.sentMessages.has(keyId)) continue;

      let chatJid = m.key.remoteJid ?? '';

      // Aprende LID→número a partir do JID alternativo. Baileys 7.x: quando o remoteJid vem em
      // formato @lid, o número (PN) fica em `remoteJidAlt` (antes era `senderPn`).
      if (chatJid.endsWith('@lid') && m.key.remoteJidAlt) {
        const pn = jidNormalizedUser(m.key.remoteJidAlt);
        // Mapeamento NOVO → funde retroativamente a conversa que ficou dividida em @lid no banco
        // (mensagens gravadas ANTES de o par LID↔PN ser aprendido "somem" do Inbox — ficam num
        // chat @lid separado). Paridade com o merge da engine wwebjs.
        this.learnLid(chatJid, pn);
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
      // P-074 (E23): em GRUPO o remetente é o participante — só de mensagem ALHEIA (na nossa o *Alt
      // pode ser o NOSSO LID). Antes do describe: reação/protocolo ignorados também ensinam o par.
      const groupSender =
        chatJid.endsWith('@g.us') && !m.key.fromMe
          ? this.groupSenderOf(m)
          : null;

      // P-066 (E22): o que é mensagem visível e com que tipo/texto — função pura (baileys-content.ts).
      // Desembrulha invólucros (deviceSent, ephemeral, viewOnce, lottie…) e IGNORA o que não é
      // mensagem no chat: protocolo/chaves, REAÇÃO (sai só como `message.reaction` — antes virava
      // `other` com texto null → "…" no painel, 🔴 na triagem e handoff falso; D-028), fixar,
      // álbum-mãe… Fica DEPOIS do aprendizado de LID/contato acima (uma reação também ensina o par).
      const d = describeBaileysMessage(m.message, !!m.key.fromMe);
      if (d.kind === 'ignore') continue;

      if (this.seenUpserts.has(keyId)) continue;
      this.seenUpserts.add(keyId);
      try {
        // A consulta por sessão+keyId também reconhece uma mensagem salva antes do restart
        // (inclusive eco da API com sentMessages vazio). O índice existente suporta a busca.
        const previous = await this.deps.prisma.waMessage.findFirst({
          where: { sessionId: this.deps.sessionId, keyId },
          select: { id: true },
        });
        if (previous) continue;
      } catch (err) {
        this.seenUpserts.delete(keyId);
        this.deps.logger.error({ err, keyId }, 'dedup de upsert falhou');
        continue;
      }
      if (this.seenUpserts.size > UPSERT_CACHE_MAX) {
        const oldest = this.seenUpserts.values().next().value;
        if (oldest) this.seenUpserts.delete(oldest);
      }

      const ts = m.messageTimestamp;
      const base = {
        keyId,
        chatJid,
        senderJid: m.key.fromMe
          ? (this.sock?.user?.id ?? null)
          : (groupSender ?? chatJid),
        fromMe: !!m.key.fromMe,
        // G2: já filtramos o que saiu pela API (sentMessages, acima). Um fromMe que chega aqui
        // foi digitado em outro device = celular. Inbound (fromMe=false) não tem origem nossa.
        source: (m.key.fromMe ? 'phone' : null) as MessageSource | null,
        timestamp: typeof ts === 'number' ? ts : Number(ts ?? 0),
        isForwarded: d.isForwarded,
        forwardingScore: d.forwardingScore,
        // P-068 (E24): a original COMPLETA (invólucros inclusos — só ela prova visualização única)
        // é o que o encaminhar reaproveita (`sendMessage({forward})` exige o proto). Vai para
        // wa_messages.raw (retenção de 7 d); webhook/SSE/fan-out a removem antes de sair.
        raw: m.message ? encodeProto(m.message) : null,
      };

      if (d.media) {
        // download + upload S3 são assíncronos — não travam o handler de eventos. Invólucro que a
        // lib não abre (figurinha lottie) → baixa do conteúdo já desembrulhado.
        const source = d.mediaMessage ? { ...m, message: d.mediaMessage } : m;
        void this.handleIncomingMedia(source, base, d.media, m.message);
        continue;
      }

      this.deps.onEvent('message', { ...base, type: d.type, text: d.text });
    }
  }

  // G3 — receipts: o Baileys emite messages.update com `update.status` quando uma mensagem que
  // enviamos é entregue/lida. Traduzimos para um evento `message.ack` first-class.
  private async onMessagesUpdate(updates: WAMessageUpdate[]): Promise<void> {
    for (const { key, update } of updates) {
      // P-068 (E24): apagada para todos (REVOKE: `message:null` + stub) e editada (MESSAGE_EDIT:
      // `message.editedMessage`) — Utils/process-message.js:298-307, :364-380. Só MARCAM a linha: o
      // encaminhar recusa as duas (a original guardada em `raw` é o conteúdo apagado / a versão
      // velha). Exibir apagada/editada no painel = P-069. SEM `continue`: o event-buffer da lib funde
      // no MESMO update tudo o que chega para a mensagem na janela (Object.assign —
      // Utils/event-buffer.js:425-443), então um ACK pode vir junto e não pode se perder.
      if (key.id) {
        if (
          update.message === null &&
          update.messageStubType === WAMessageStubType.REVOKE
        ) {
          this.markMessage(key.id, !!key.fromMe, 'revokedAt');
        } else if (update.message?.editedMessage) {
          this.markMessage(key.id, !!key.fromMe, 'editedAt');
        }
      }
      if (update.status === proto.WebMessageInfo.Status.ERROR) {
        const code = String(update.messageStubParameters?.[0] ?? '');
        if (code === '463' && key.fromMe) {
          // No rc14 o ramo `MessageAccountRestriction` consome o 463 antes do ramo que consulta
          // o timelock (messages-recv.js:1513-1552). Trava provisória antes do RPC, com teto.
          try {
            await this.deps.onRestrictionSignal?.({ signal: '463' });
          } catch (err) {
            recordProcessError('baileys_restriction_record');
            this.deps.logger.error({ err }, 'falha ao gravar ACK 463');
          }
          await this.fetchReachoutTimelock();
        } else if (code === '479') {
          recordProcessError('baileys_ack_479');
          this.deps.logger.warn(
            { sessionId: this.deps.sessionId, keyId: key.id },
            'ACK 479: stanza rejeitada; não é prova de restrição',
          );
        }
      }
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

  private async onMessageCapping(info: NewChatMessageCapInfo): Promise<void> {
    if (info.capping_status !== 'CAPPED') {
      this.deps.logger.info(
        {
          status: info.capping_status,
          used: info.used_quota,
          total: info.total_quota,
        },
        'atualização do limite de novos chats (sem pausa)',
      );
      return;
    }
    const until = cappingCycleEnd(info.cycle_end_timestamp);
    try {
      await this.deps.onRestrictionSignal?.({
        signal: 'message-capping',
        until,
        source: until ? 'cycle_end_timestamp' : undefined,
      });
    } catch (err) {
      recordProcessError('baileys_restriction_record');
      this.deps.logger.error({ err }, 'falha ao gravar message-capping');
    }
    await this.fetchReachoutTimelock();
  }

  private fetchReachoutTimelock(): Promise<void> {
    if (this.timelockFetch) return this.timelockFetch;
    if (
      Date.now() - this.lastTimelockFetchAt <
      TIMELOCK_FETCH_MIN_INTERVAL_MS
    ) {
      return Promise.resolve();
    }
    const sock = this.sock;
    if (!sock) return Promise.resolve();
    const startedAt = Date.now();
    this.lastTimelockFetchAt = startedAt;
    this.timelockFetch = (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let deadlinePassed = false;
      // `Promise.race` limita quem aguarda a consulta, mas não cancela o RPC. A rc14 pode
      // responder depois de 3 s; nesse caso ainda promovemos o prazo confirmado, desde
      // que o socket e a consulta continuem atuais.
      const confirmed = Promise.resolve()
        .then(() => sock.fetchAccountReachoutTimelock())
        .then(async (state) => {
          if (
            this.sock === sock &&
            this.lastTimelockFetchAt === startedAt &&
            state.isActive
          ) {
            await this.deps.onRestrictionSignal?.({
              signal: 'reachoutTimeLock',
              until: state.timeEnforcementEnds,
              source: state.timeEnforcementEnds
                ? 'timeEnforcementEnds'
                : 'temporary',
              enforcementType: state.enforcementType,
            });
          }
        })
        .catch((err: unknown) => {
          if (deadlinePassed) {
            recordProcessError('baileys_timelock_fetch');
            this.deps.logger.warn(
              { err, sessionId: this.deps.sessionId },
              'consulta tardia do timelock falhou',
            );
          }
          throw err;
        });
      try {
        await Promise.race([
          confirmed,
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error('consulta do timelock excedeu 3 s')),
              TIMELOCK_FETCH_TIMEOUT_MS,
            );
            timer.unref?.();
          }),
        ]);
      } catch (err) {
        deadlinePassed = true;
        recordProcessError('baileys_timelock_fetch');
        this.deps.logger.warn(
          { err, sessionId: this.deps.sessionId },
          'falha ao consultar prazo da restrição; pausa provisória expira sozinha',
        );
      } finally {
        if (timer) clearTimeout(timer);
        this.timelockFetch = null;
      }
    })();
    return this.timelockFetch;
  }

  // P-068 (E24): marca apagada/editada nas linhas do keyId NESTA sessão (o mesmo keyId aparece nas
  // duas pontas quando duas sessões do gateway conversam) e do MESMO lado (`fromMe`): a lib não
  // confere o autor do REVOKE/EDIT (process-message.js:298-307) — um contato não marca a NOSSA
  // mensagem, nem nós a dele. Linha ainda não gravada (mídia recebida há segundos — o INSERT vem
  // depois do upload) fica sem a marca: resíduo aceito.
  private markMessage(
    keyId: string,
    fromMe: boolean,
    field: 'revokedAt' | 'editedAt',
  ): void {
    void this.deps.prisma.waMessage
      .updateMany({
        where: { sessionId: this.deps.sessionId, keyId, fromMe },
        data: { [field]: new Date() },
      })
      .catch((e: unknown) =>
        this.deps.logger.warn(
          { err: e, keyId, field },
          'falha ao marcar mensagem apagada/editada',
        ),
      );
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
      isForwarded: boolean;
      forwardingScore: number | null;
      raw: unknown;
    },
    media: ContentMedia,
    // P-068 (E24): a original COMPLETA — o `raw` é serializado na hora de emitir, DEPOIS do download:
    // um reupload (CDN 404/410 → sock.updateMediaMessage) MUTA url/directPath dentro dela, e o
    // encaminhar reaproveita esses campos (sem eles a cópia chegaria com mídia que não baixa).
    original?: proto.IMessage | null,
  ): Promise<void> {
    const rawNow = () => (original ? encodeProto(original) : base.raw);
    const sock = this.sock;
    if (!sock) return;
    let dispatcher: Dispatcher | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    let dispatcherDestroyed = false;
    const destroyDispatcher = () => {
      if (dispatcher && !dispatcherDestroyed) {
        dispatcherDestroyed = true;
        // destroy(), ao contrário de close(), interrompe um fetch/stream que nunca terminou.
        try {
          void Promise.resolve(dispatcher.destroy()).catch(() => undefined);
        } catch {
          /* a falha do cleanup não impede o fallback da mensagem */
        }
      }
    };
    try {
      const createDispatcher = this.createMediaDispatcher;
      if (!createDispatcher) {
        throw new Error(
          'download de mídia via SOCKS não validado; somente metadados',
        );
      }
      dispatcher = createDispatcher();
      const options = { options: { dispatcher } };
      // A rc14 não repassa signal ao fetch. O teto cobre download, pedido de reupload e segunda
      // tentativa JUNTOS. O dispatcher é privado desta mensagem e destruído no timeout.
      const download = async () => {
        try {
          return await downloadMediaMessage(m, 'buffer', options);
        } catch (error) {
          const code = (error as { output?: { statusCode?: number } })?.output
            ?.statusCode;
          if (!active || (code !== 404 && code !== 410)) throw error;
          // Não passamos ctx.reuploadRequest à lib: seu ramo usa error.status e não tem teto.
          // Para ptv, assertMediaContent da rc14 aceita videoMessage mas não ptvMessage;
          // a referência do nó é compartilhada para preservar url/directPath no raw original.
          const content = extractMessageContent(m.message);
          const reuploadMessage = content?.ptvMessage
            ? { ...m, message: { videoMessage: content.ptvMessage } }
            : m;
          let reuploadDeadline: ReturnType<typeof setTimeout> | undefined;
          try {
            await Promise.race([
              sock.updateMediaMessage(reuploadMessage),
              new Promise<never>((_, reject) => {
                reuploadDeadline = setTimeout(
                  () => reject(new Error('reupload de mídia excedeu 20 s')),
                  MEDIA_REUPLOAD_WAIT_MS,
                );
                reuploadDeadline.unref?.();
              }),
            ]);
          } finally {
            if (reuploadDeadline) clearTimeout(reuploadDeadline);
          }
          if (!active)
            throw new Error('download de mídia expirou após reupload');
          return downloadMediaMessage(m, 'buffer', options);
        }
      };
      const buffer = await Promise.race([
        download(),
        new Promise<never>((_, reject) => {
          deadline = setTimeout(() => {
            active = false;
            destroyDispatcher();
            reject(new Error('download de mídia excedeu 90 s'));
          }, MEDIA_DOWNLOAD_WAIT_MS);
          deadline.unref?.();
        }),
      ]);
      if (deadline) clearTimeout(deadline);
      deadline = undefined;

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
        raw: rawNow(),
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
        raw: rawNow(),
        type: media.mediaType,
        text: media.caption,
        mediaType: media.mediaType,
        mimetype: media.mimetype,
        fileName: media.fileName,
        fileSize: media.fileSize,
      });
    } finally {
      active = false;
      if (deadline) clearTimeout(deadline);
      destroyDispatcher();
    }
  }

  async sendText(
    to: string,
    text: string,
    opts?: SendOptions,
  ): Promise<{ keyId: string; jid: string }> {
    if (!this.sock) throw new Error('Sessão não conectada');
    const jid = await this.resolveJid(to);
    // W5: menções (@) — JIDs a marcar; Baileys põe em contextInfo.mentionedJid via `mentions`.
    const mentions = (opts?.mentions ?? []).map(toContactJid);
    const sent = await this.sock.sendMessage(jid, {
      text,
      ...(mentions.length ? { mentions } : {}),
    });
    const keyId = sent?.key?.id ?? '';
    if (keyId && sent?.message) this.cacheSent(keyId, sent.message);
    // A rc14 também reemite o envio como append; a E7 filtra o eco (fromMe) no upsert.
    // Emitimos aqui com source=api e a chave/intent originais.
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
    // W5: menções (@) também na legenda de mídia.
    const mentions = (input.mentions ?? []).map(toContactJid);
    const sent = await this.sock.sendMessage(
      jid,
      mentions.length ? { ...content, mentions } : content,
    );
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

  async sendLocation(
    to: string,
    input: SendLocationInput,
  ): Promise<{ keyId: string; jid: string }> {
    if (!this.sock) throw new Error('Sessão não conectada');
    const jid = await this.resolveJid(to);
    const sent = await this.sock.sendMessage(jid, {
      location: {
        degreesLatitude: input.latitude,
        degreesLongitude: input.longitude,
        ...(input.name ? { name: input.name } : {}),
        ...(input.address ? { address: input.address } : {}),
      },
    });
    // P-077 (E24): o eco leva o mesmo texto da localização RECEBIDA (rótulo + link do mapa).
    return this.emitOutbound(
      sent,
      jid,
      'location',
      formatLocation({
        latitude: input.latitude,
        longitude: input.longitude,
        name: input.name,
        address: input.address,
      }),
      input,
    );
  }

  async sendPoll(
    to: string,
    input: SendPollInput,
  ): Promise<{ keyId: string; jid: string }> {
    if (!this.sock) throw new Error('Sessão não conectada');
    const jid = await this.resolveJid(to);
    const sent = await this.sock.sendMessage(jid, {
      poll: {
        name: input.name,
        values: input.options,
        // selectableCount: 1 = escolha única · 0 = múltipla (mesma semântica do wwebjs).
        selectableCount: input.multi ? 0 : 1,
      },
    });
    // P-077 (E24): o eco leva a pergunta + "• opção" por linha, como a enquete RECEBIDA.
    return this.emitOutbound(
      sent,
      jid,
      'poll',
      formatPoll(input.name, input.options),
      input,
    );
  }

  // Eco de um envio nosso (fromMe=api) para o EventBus — persistência + webhook + reply-rate (G1).
  private emitOutbound(
    sent:
      { key?: proto.IMessageKey; message?: proto.IMessage | null } | undefined,
    jid: string,
    type: string,
    text: string | null,
    opts: SendOptions,
  ): { keyId: string; jid: string } {
    const keyId = sent?.key?.id ?? '';
    if (keyId && sent?.message) this.cacheSent(keyId, sent.message);
    this.deps.onEvent('message', {
      keyId,
      chatJid: jid,
      senderJid: this.sock?.user?.id ?? null,
      fromMe: true,
      type,
      text,
      isCold: opts.cold ?? false,
      idempotencyKey: opts.idempotencyKey ?? null,
      source: 'api',
      raw: sent?.message ? encodeProto(sent.message) : null,
      timestamp: Math.floor(Date.now() / 1000),
    });
    return { keyId, jid };
  }

  // Resolve o JID localmente, SEM consulta de rede (31/08/2026): o onWhatsApp que
  // vivia aqui checava existência a cada envio — padrão de contact-check que arrisca
  // ban do chip e, quando a resposta vinha vazia (pós-reconexão), derrubava TODO
  // envio com "não está no WhatsApp" → HTTP 400. Política: não existe checagem de
  // existência no caminho de envio; destino inexistente simplesmente não entrega
  // (ACK não evolui) e é o ledger de ACKs quem conta essa história.
  private async resolveJid(to: string): Promise<string> {
    return toJid(to);
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

  // W8 — perfil da conta conectada.
  async setProfileStatus(status: string): Promise<void> {
    await this.sk().updateProfileStatus(status);
  }
  async setProfileName(name: string): Promise<void> {
    await this.sk().updateProfileName(name);
  }
  async setProfilePhoto(image: Buffer, _mimetype: string): Promise<void> {
    const me = this.sock?.user?.id;
    if (!me) throw new Error('Sessão não conectada');
    // updateProfilePicture aceita Buffer direto (WAMediaUpload); o WhatsApp reprocessa a imagem.
    await this.sk().updateProfilePicture(jidNormalizedUser(me), image);
  }

  // G8 — marca a mensagem como lida (read receipt). Em 1:1 a key {remoteJid,id,fromMe:false} basta.
  async markRead(chatJid: string, msgId: string): Promise<void> {
    await this.sk().readMessages([
      { remoteJid: toJid(chatJid), id: msgId, fromMe: false },
    ]);
  }

  // W5 — reage a uma mensagem. Emoji vazio remove a reação. A key precisa do fromMe correto
  // (reagir à própria mensagem vs. à do contato) — o chamador resolve pelo registro da mensagem.
  async sendReaction(
    chatJid: string,
    msgId: string,
    fromMe: boolean,
    emoji: string,
  ): Promise<void> {
    if (!this.sock) throw new Error('Sessão não conectada');
    const remoteJid = toJid(chatJid);
    await this.sock.sendMessage(remoteJid, {
      react: { text: emoji, key: { remoteJid, id: msgId, fromMe } },
    });
  }

  // P-068 (E24) — encaminhar como o WhatsApp Web: `sendMessage(jid, {forward})` →
  // generateForwardMessageContent (Utils/messages.js:238-262) copia o conteúdo, reaproveita a mídia
  // (mesmo url/directPath/mediaKey — sem novo upload) e põe o selo `{isForwarded,
  // forwardingScore: original + 1}`; original NOSSA (fromMe) sem `force` sai sem selo, como no app.
  // A original é o proto guardado em wa_messages.raw (recebidas desde a E24; envios da API — 7 d).
  async prepareForward(src: ForwardSource): Promise<PreparedForward> {
    if (!this.sock) throw new Error('Sessão não conectada');
    // keyId pode repetir na sessão (sem unique): vale a linha que TEM a original, a mais recente.
    const rows = await this.deps.prisma.waMessage.findMany({
      where: { sessionId: this.deps.sessionId, keyId: src.keyId },
      select: { raw: true },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });
    const raw = rows.find((r) => r.raw != null)?.raw;
    let message: proto.IMessage;
    let score: number | null;
    if (raw != null) {
      let original: proto.IMessage;
      try {
        original = decodeProto(raw);
      } catch (e) {
        this.deps.logger.warn(
          { err: e, keyId: src.keyId },
          'encaminhar: original guardada ilegível',
        );
        throw new ForwardSourceError(
          'FORWARD_SOURCE_UNAVAILABLE',
          'A original guardada desta mensagem está ilegível — encaminhe pelo celular.',
        );
      }
      const fc = forwardableContent(original);
      if (!fc.ok) {
        throw new ForwardSourceError(
          'FORWARD_UNSUPPORTED',
          `Esta mensagem não pode ser encaminhada pelo gateway (${fc.reason}).`,
        );
      }
      if (
        fc.expiration &&
        src.timestamp &&
        src.timestamp + fc.expiration < Math.floor(Date.now() / 1000)
      ) {
        throw new ForwardSourceError(
          'FORWARD_UNSUPPORTED',
          'Esta mensagem não pode ser encaminhada pelo gateway (mensagem temporária já expirada).',
        );
      }
      message = fc.message;
      score = fc.forwardingScore;
    } else if (src.type === 'text' && src.text) {
      // Sem a original (mais de RETENTION_MESSAGE_RAW_DAYS, anterior à E24, histórico): texto
      // remonta FIEL — o `forward` troca o contextInfo inteiro de qualquer jeito; só a prévia de
      // link se perde (e o gateway nunca gerou prévia: link-preview-js não está instalado).
      message = {
        extendedTextMessage: {
          text: src.text,
          contextInfo: src.forwardingScore
            ? { isForwarded: true, forwardingScore: src.forwardingScore }
            : {},
        },
      };
      score = src.forwardingScore;
    } else {
      throw new ForwardSourceError(
        'FORWARD_SOURCE_UNAVAILABLE',
        'A original desta mensagem não está mais guardada no gateway (mais de 7 dias ou recebida antes da atualização) — sem ela só texto pode ser encaminhado. Encaminhe pelo celular.',
      );
    }
    return {
      forwardingScore: score,
      send: (to, opts) => this.forwardTo(message, src, to, opts),
    };
  }

  private async forwardTo(
    message: proto.IMessage,
    src: ForwardSource,
    to: string,
    opts: SendOptions,
  ): Promise<SendResult> {
    if (!this.sock) throw new Error('Sessão não conectada');
    const jid = await this.resolveJid(to);
    const sent = await this.sock.sendMessage(jid, {
      forward: {
        key: {
          remoteJid: toJid(src.chatJid),
          id: src.keyId,
          fromMe: src.fromMe,
        },
        message,
      },
    });
    const keyId = sent?.key?.id ?? '';
    // cacheSent: o eco `append` da própria lib (emitOwnEvents) já morre no filtro de tipo do
    // onMessagesUpsert; o cache também serve ao retry de descriptografia.
    if (keyId && sent?.message) this.cacheSent(keyId, sent.message);
    // O eco descreve o que FOI enviado (tipo/texto/selo reais); a mídia é a mesma da original,
    // então o objeto S3 dela serve ao painel/`/media` sem baixar de novo.
    const d = describeBaileysMessage(sent?.message, true);
    const described = d.kind === 'content' ? d : null;
    const media = described?.media ?? null;
    const fwd = {
      isForwarded: described?.isForwarded ?? false,
      forwardingScore: described?.forwardingScore ?? null,
    };
    this.deps.onEvent('message', {
      keyId,
      // Remetente = a nossa conta (o autor original não vai no eco — Diário da E23, item 4).
      chatJid: jid,
      senderJid: this.sock.user?.id ?? null,
      fromMe: true,
      type: described?.type ?? src.type,
      text: described ? described.text : src.text,
      isCold: opts.cold ?? false,
      idempotencyKey: opts.idempotencyKey ?? null,
      source: 'api',
      ...fwd,
      ...(media
        ? {
            mediaType: media.mediaType,
            mimetype: media.mimetype ?? src.mimetype,
            fileName: media.fileName ?? src.fileName,
            fileSize: media.fileSize ?? src.fileSize,
            mediaKey: src.mediaKey,
          }
        : {}),
      raw: sent?.message ? encodeProto(sent.message) : null,
      timestamp: Math.floor(Date.now() / 1000),
    });
    return { keyId, jid, ...fwd };
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
        { err: e, keyId: id },
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
            { err: e, sessionId: this.deps.sessionId },
            `handler ${ctx} falhou`,
          ),
        );
      }
    } catch (e) {
      this.deps.logger.error(
        { err: e, sessionId: this.deps.sessionId },
        `handler ${ctx} falhou`,
      );
    }
  }

  private sk(): WASocket {
    if (!this.sock) throw new Error('Sessão não conectada');
    return this.sock;
  }

  // W7 — o Baileys não tem store de chats consultável (é stateless; o histórico do gateway vem dos
  // eventos ao vivo, já persistidos em wa_messages). Backfill de histórico é exclusivo do wwebjs.
  async listChats(_limit: number): Promise<ChatSummary[]> {
    throw new UnsupportedEngineOperationError(
      'Backfill de inbox/histórico não é suportado na engine Baileys (sem store de chats). Use uma sessão WWEBJS; a inbox ao vivo do Baileys segue via GET /messages/conversations.',
    );
  }
  async fetchChatHistory(
    _chatJid: string,
    _limit: number,
  ): Promise<HistoryMessage[]> {
    throw new UnsupportedEngineOperationError(
      'Backfill de inbox/histórico não é suportado na engine Baileys (sem store de chats). Use uma sessão WWEBJS; a inbox ao vivo do Baileys segue via GET /messages/conversations.',
    );
  }

  // W7 — gestão de chat: no Baileys, archive/markRead exigem sincronização de app-state com o
  // histórico (chatModify + lastMessages) — não coberta por ora, e falha silenciosa é vetada (R6).
  async setChatFlag(
    _chatJid: string,
    _flag: ChatFlag,
    _enabled: boolean,
  ): Promise<void> {
    throw new UnsupportedEngineOperationError(
      'Gestão de chat (arquivar/fixar/silenciar/marcar não-lido) não é suportada na engine Baileys por ora. Use uma sessão WWEBJS.',
    );
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
      // E22: as reações da conversa acompanham (reply-rate casa reação pelo chat do cold).
      const rx = await this.deps.prisma.messageReaction.updateMany({
        where: { sessionId: this.deps.sessionId, chatJid: lid },
        data: { chatJid: phoneJid },
      });
      if (r.count > 0 || rx.count > 0) {
        this.deps.logger.info(
          { lid, phoneJid, count: r.count, reactions: rx.count },
          'merge LID->telefone (retroativo)',
        );
      }
    } catch (e) {
      this.deps.logger.error({ err: e }, 'mergeLidMessages falhou');
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
      this.deps.logger.error({ err: e }, 'mergeKnownLids falhou');
    }
  }

  // contacts.upsert/update do Baileys → diretório (a fonte mais completa).
  private onContacts(list: Array<Partial<Contact>>): void {
    const records = list
      .filter((c) => c.id)
      .map((c) => contactToRecord(c, 'contacts-sync'));
    if (records.length) this.deps.contacts?.recordMany(records);
  }

  private async recordGroupParticipants(
    groups: RawGroup[],
  ): Promise<Map<string, string>> {
    const participants = groups.flatMap((md) => md.participants ?? []);
    const rosterLidToPn = new Map<string, string>();
    const unresolved = new Set<string>();
    for (const p of participants) {
      const lid = p.lid ?? (p.id.endsWith('@lid') ? p.id : null);
      const pn =
        p.phoneNumber ?? (p.id.endsWith('@s.whatsapp.net') ? p.id : null);
      if (!lid) continue;
      const key = jidNormalizedUser(lid);
      if (pn?.endsWith('@s.whatsapp.net')) {
        const normalizedPn = jidNormalizedUser(pn);
        rosterLidToPn.set(key, normalizedPn);
        this.lidToPn.set(key, normalizedPn);
      } else if (key.endsWith('@lid')) {
        unresolved.add(key);
      }
    }
    // Um mesmo LID pode aparecer em vários grupos: phoneNumber de qualquer roster deste lote
    // tem prioridade sobre um mapping local possivelmente antigo.
    for (const lid of rosterLidToPn.keys()) unresolved.delete(lid);
    if (unresolved.size) {
      try {
        // rc14: getPNsForLIDs consulta apenas mappingCache e auth.keys('lid-mapping').
        // Não usar getLIDForPN/USync, que podem consultar a rede.
        const mappings =
          await this.sock?.signalRepository.lidMapping.getPNsForLIDs([
            ...unresolved,
          ]);
        for (const pair of mappings ?? []) {
          if (
            unresolved.has(jidNormalizedUser(pair.lid)) &&
            (pair.pn.endsWith('@s.whatsapp.net') || pair.pn.endsWith('@hosted'))
          ) {
            const lid = jidNormalizedUser(pair.lid);
            const pn = jidNormalizedUser(pair.pn);
            rosterLidToPn.set(lid, pn);
            this.lidToPn.set(lid, pn);
          }
        }
      } catch (err) {
        this.deps.logger.warn({ err }, 'fallback LID local do roster falhou');
      }
    }
    const recs: ContactRecord[] = participants.map((p) => {
      const lid = p.lid ?? (p.id.endsWith('@lid') ? p.id : null);
      const pn =
        p.phoneNumber ??
        (p.id.endsWith('@s.whatsapp.net') ? p.id : null) ??
        (lid ? rosterLidToPn.get(jidNormalizedUser(lid)) : null);
      const jid = pn ? jidNormalizedUser(pn) : null;
      return {
        waId: p.id,
        jid,
        lid: lid ? jidNormalizedUser(lid) : null,
        phone: resolveParticipantPhone(p, rosterLidToPn),
        name: p.name ?? null,
        pushName: p.notify ?? null,
        source: 'group',
      };
    });
    if (recs.length) this.deps.contacts?.recordMany(recs);
    return rosterLidToPn;
  }

  // ---- Grupos (§ F5) ----
  // Busca em lote (1 query) os nomes salvos no diretório para todos os participantes dos grupos.
  private async resolveParticipantNames(
    groups: RawGroup[],
    rosterLidToPn: Map<string, string>,
  ): Promise<Map<string, { name: string | null; pushName: string | null }>> {
    if (!this.deps.contacts?.resolveNames) return new Map();
    const keys = new Set<string>();
    for (const g of groups) {
      for (const p of g.participants ?? []) {
        if (p.id) keys.add(p.id);
        if (p.lid) keys.add(p.lid);
        if (p.phoneNumber) keys.add(p.phoneNumber);
        const phone = resolveParticipantPhone(p, rosterLidToPn);
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
    for (const md of Object.values(map)) this.cacheGroupMeta(md); // WA-12
    const raws = Object.values(map) as unknown as RawGroup[];
    const rosterLidToPn = await this.recordGroupParticipants(raws);
    const names = await this.resolveParticipantNames(raws, rosterLidToPn);
    return raws.map((g) => toGroupInfo(g, rosterLidToPn, names));
  }
  async groupInfo(jid: string): Promise<GroupInfo> {
    const fresh = await this.sk().groupMetadata(toGroupJid(jid));
    this.cacheGroupMeta(fresh); // WA-12
    const md = fresh as unknown as RawGroup;
    const rosterLidToPn = await this.recordGroupParticipants([md]);
    const names = await this.resolveParticipantNames([md], rosterLidToPn);
    return toGroupInfo(md, rosterLidToPn, names);
  }
  async createGroup(
    subject: string,
    participants: string[],
  ): Promise<GroupInfo> {
    const jids = await this.resolveParticipants(participants);
    const md = await this.sk().groupCreate(subject, jids);
    const raw = md as unknown as RawGroup;
    const rosterLidToPn = await this.recordGroupParticipants([raw]);
    return toGroupInfo(raw, rosterLidToPn);
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

  // W8 — fila de entrada do grupo (membership requests). O Baileys devolve linhas com `jid`; o
  // formato exato varia entre builds, daí o cast defensivo. `requestedAt` não é exposto → null.
  async groupMembershipRequests(jid: string): Promise<MembershipRequest[]> {
    const rows = (await this.sk().groupRequestParticipantsList(
      toGroupJid(jid),
    )) as Array<Record<string, string>>;
    return (rows ?? []).map((r) => {
      const id = r.jid ?? r.phone_number ?? Object.values(r)[0] ?? '';
      const num = id.endsWith('@s.whatsapp.net') ? id.replace(/\D/g, '') : null;
      return { id, phone: num || null, requestedAt: null };
    });
  }

  // W8 — aprova/rejeita pedidos. participants vazio = age sobre TODA a fila (busca a lista antes).
  async groupMembershipAction(
    jid: string,
    action: MembershipAction,
    participants?: string[],
  ): Promise<void> {
    const gjid = toGroupJid(jid);
    let jids = participants?.length
      ? await this.resolveParticipants(participants)
      : [];
    if (!jids.length) {
      const list = (await this.sk().groupRequestParticipantsList(
        gjid,
      )) as Array<Record<string, string>>;
      jids = (list ?? [])
        .map((r) => r.jid ?? r.phone_number ?? Object.values(r)[0] ?? '')
        .filter(Boolean);
    }
    if (!jids.length) return; // fila vazia — nada a fazer
    await this.sk().groupRequestParticipantsUpdate(gjid, jids, action);
  }

  // W8 — announce (só admin envia) / restrict (só admin edita a info) do grupo.
  async setGroupSetting(
    jid: string,
    setting: GroupSettingKey,
    enabled: boolean,
  ): Promise<void> {
    const value =
      setting === 'announce'
        ? enabled
          ? 'announcement'
          : 'not_announcement'
        : enabled
          ? 'locked'
          : 'unlocked';
    await this.sk().groupSettingUpdate(toGroupJid(jid), value);
  }

  // W8 — foto do grupo (updateProfilePicture aceita Buffer; o WhatsApp reprocessa a imagem).
  async setGroupPhoto(
    jid: string,
    image: Buffer,
    _mimetype: string,
  ): Promise<void> {
    await this.sk().updateProfilePicture(toGroupJid(jid), image);
  }

  // ---- Contatos / perfil (§ F5) ----
  async checkNumbers(numbers: string[]): Promise<ContactCheck[]> {
    const sock = this.sk();
    const out: ContactCheck[] = [];
    for (const n of numbers) {
      const digits = n.replace(/[^0-9]/g, '');
      const r = (await sock.onWhatsApp(digits))?.[0] as
        { jid?: string; exists?: boolean } | undefined;
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

  private async waitForPairingReady(sock: WASocket): Promise<void> {
    if (this.pairingReadySock === sock) return;
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        sock.ev.off('connection.update', onUpdate);
        if (error) reject(error);
        else resolve();
      };
      const onUpdate = (update: Partial<ConnectionState>) => {
        if (update.connection === 'close')
          finish(new Error('Sessão desconectada antes do pareamento'));
        else if (update.connection === 'connecting' || !!update.qr) finish();
      };
      sock.ev.on('connection.update', onUpdate);
      const timer = setTimeout(
        () =>
          finish(
            new Error('Sessão não ficou pronta para parear em 10 segundos'),
          ),
        10_000,
      );
      if (this.pairingReadySock === sock) finish();
    });
  }

  async requestPairingCode(phoneNumber: string): Promise<string> {
    const sock = this.sock;
    if (!sock) throw new Error('Sessão não iniciada');
    // A rc14 sobrescreve creds.me ANTES da requisição. registered=false também pode ser uma
    // sessão já pareada por QR; user/creds.me e WORKING são os sinais conservadores.
    if (this.getStatus() === 'WORKING' || sock.user || sock.authState?.creds.me)
      throw new Error('Sessão já pareada; código de pareamento indisponível');
    await this.waitForPairingReady(sock);
    if (this.sock !== sock || this.stopped)
      throw new Error('Sessão desconectada antes do pareamento');
    if (this.getStatus() === 'WORKING' || sock.user || sock.authState?.creds.me)
      throw new Error('Sessão já pareada; código de pareamento indisponível');
    const digits = phoneNumber.replace(/[^0-9]/g, '');
    const code = await sock.requestPairingCode(digits);
    if (this.sock !== sock || this.stopped)
      throw new Error('Sessão desconectada durante o pareamento');
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
    this.clearReconnectTimer();
    this.cacheObserver?.close('close');
    this.cacheObserver = null;
    this.pairingReadySock = null;
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
    this.setStatus('STOPPED', { error: null });
  }

  private detachSocketListeners(): void {
    try {
      const ev = this.sock?.ev as unknown as {
        removeAllListeners?: (event?: string) => void;
      };
      for (const event of SOCKET_EVENTS) ev?.removeAllListeners?.(event);
    } catch {
      /* noop */
    }
  }

  // P-042 — encerramento do PROCESSO (SIGTERM do redeploy), espelhando o shutdown() do wwebjs:
  // fecha o socket SEM persistir status. O stop() grava STOPPED (doStop → setStatus), e o
  // findAutostart NÃO reidrata STOPPED. No deploy stop-first os dois containers coexistem por alguns
  // segundos; sem este método, o `onModuleDestroy` do container que MORRE cai no stop() (o Baileys
  // não tinha shutdown()) e grava STOPPED por cima do WORKING que o container NOVO já persistiu —
  // visto em produção 09/09: Diogo reidratou e seguiu enviando (201), mas o painel mostrava STOPPED
  // porque o "Shutdown: todas as engines fecharam" do container antigo, às 17:26:55, chamou stop()
  // para a única sessão Baileys. Pior caso: se o STOPPED chegar ANTES de o novo ler o findAutostart,
  // a sessão nem reidrata. Fechar o socket sem tocar o status deixa a sessão como estava (WORKING/…)
  // no banco → reidrata sozinha. Fora do mutex (grace do SIGTERM não pode ficar preso atrás de uma
  // operação pendurada). Detacha listeners ANTES do end() para o 'close' tardio não reentrar em
  // onConnectionUpdate e emitir STOPPED (o que anularia todo o propósito).
  async shutdown(): Promise<void> {
    this.stopped = true;
    this.clearReconnectTimer();
    this.cacheObserver?.close('close');
    this.cacheObserver = null;
    this.pairingReadySock = null;
    this.detachSocketListeners();
    try {
      this.sock?.end(undefined);
    } catch {
      /* noop — o processo está encerrando */
    }
    this.sock = null;
    this.qrBase64 = null;
    // Sem setStatus: o status persistido fica intacto para o findAutostart reidratar no novo container.
  }

  logout(): Promise<void> {
    this.stopped = true;
    return this.serialize(() => this.doLogout());
  }

  private async doLogout(): Promise<void> {
    this.stopped = true;
    this.clearReconnectTimer();
    this.cacheObserver?.close('close');
    this.cacheObserver = null;
    this.pairingReadySock = null;
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
    if (!this.deps.lease || this.deps.authEpoch === undefined)
      throw new Error('Baileys sem lease de auth');
    const next = await this.deps.lease.clearAuth(
      this.deps.sessionId,
      this.deps.authEpoch,
    );
    this.deps.authEpoch = next;
    this.deps.onAuthEpoch?.(next);
  }
}

function toJid(to: string): string {
  if (to.includes('@')) return to;
  const digits = to.replace(/[^0-9]/g, '');
  return `${digits}@s.whatsapp.net`;
}
