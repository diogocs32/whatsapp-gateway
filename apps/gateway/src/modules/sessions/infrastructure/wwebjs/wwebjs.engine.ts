import {
  Client,
  LocalAuth,
  MessageMedia,
  Location,
  Poll,
} from 'whatsapp-web.js';
import type {
  Message,
  GroupChat,
  GroupParticipant,
  Contact,
  Channel,
  Reaction,
} from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import { anonymizeProxy, closeAnonymizedProxy } from 'proxy-chain';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { BaileysEngineDeps } from '../baileys/baileys.engine';
import type { ContactRecord } from '../../../../infra/directory/contact-directory.service';
import type {
  ChannelInfo,
  ChatFlag,
  ChatSummary,
  ContactCheck,
  AckStatus,
  GroupInfo,
  GroupParticipantAction,
  GroupParticipantInfo,
  GroupParticipantRole,
  GroupSettingKey,
  HistoryMessage,
  IEngine,
  MembershipAction,
  MembershipRequest,
  MessageSource,
  PresenceState,
  SaveContactInput,
  SendLocationInput,
  SendMediaInput,
  SendOptions,
  SendPollInput,
} from '../../application/engine.port';
import type { SessionStatus } from '../../domain/session-status';

// Caminho do Chrome do sistema (no WSL já existe /usr/bin/google-chrome-stable). Configurável por env.
// `||` (não `??`): env VAZIA se comporta como ausente — mesma semântica do envStr() do config.ts.
const CHROME_PATH =
  process.env.WWEBJS_CHROME_PATH || '/usr/bin/google-chrome-stable';
const AUTH_PATH = process.env.WWEBJS_DATA_PATH || 'auth/wwebjs';

// Versão do WhatsApp Web a FIXAR. Sem fixar, o wwebjs baixa a versão "ao vivo" do web.whatsapp.com a
// cada conexão e a renegocia (é o "fica atualizando muito tempo") — e uma build ruim do WhatsApp Web
// quebra getChats/getContacts (o wwebjs depende do Store interno). Fixar acelera e estabiliza.
// DEFAULT = versão VALIDADA em produção para a extração de leads COM telefone (builds mais novas
// avançam o rollout do LID da Meta e tendem a ESCONDER o número dos participantes — item 23).
// ⚠️ A Meta expira versões em ~2 meses (esta: ~fim de agosto/2026) → revalidar uma mais nova antes
// de trocar o default; se expirar sem troca, o retry 'live' + warn seguram a operação.
// WWEBJS_WEB_VERSION aceita: versão explícita | 'auto' (currentVersion do wa-version — MAIS NOVA,
// risco de LID-only nos contatos) | 'live' (não fixa).
const DEFAULT_WEB_VERSION = '2.3000.1042271047-alpha';
const WEB_VERSION_MODE = process.env.WWEBJS_WEB_VERSION || DEFAULT_WEB_VERSION;
const WEB_VERSION_REMOTE =
  'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html';
// versions.json do wa-version: { currentVersion, versions: [{ version, expire, ... }] }.
const WA_VERSIONS_JSON =
  'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/versions.json';
// Cache de processo do modo 'auto' — 1 fetch por TTL atende todas as sessões/starts.
let autoWebVersion: { version: string; fetchedAt: number } | null = null;
const AUTO_WEB_VERSION_TTL_MS = 6 * 60 * 60 * 1000;
// Item 6 — cache LOCAL do HTML da versão (no volume persistente): o RemoteWebCache do wwebjs
// baixa o HTML do GitHub a CADA initialize (persist() é no-op); com o arquivo pré-baixado aqui,
// o LocalWebCache lê do disco e o start não depende de rede para a versão.
const WEB_CACHE_DIR = join(resolve(AUTH_PATH), '.webcache');
// P-012 anti-flag — UA realista, ESTÁVEL POR SESSÃO (paridade com o browser-fingerprint do
// Baileys): determinístico pelo sessionId — estável entre reconexões (trocar UA a cada conexão é
// suspeito) e distinto entre sessões (frota inteira com UA idêntico denuncia automação). Varia SÓ a
// versão do Chrome (UA reduction: minor congelado em .0.0.0); a plataforma fica Linux DE VERDADE —
// UA de Windows num Chromium Linux diverge de navigator.platform e é MAIS detectável, não menos.
// O default do wwebjs seria Chrome/101 (2022), que dispara o aviso de "navegador desatualizado".
// WWEBJS_USER_AGENT (env) segue como override global explícito. Exportado para teste.
const CHROME_UA_MAJORS = [144, 145, 146] as const;
export function userAgentFor(sessionId: string): string {
  const override = process.env.WWEBJS_USER_AGENT;
  if (override) return override;
  // FNV-1a 32-bit — o mesmo hash determinístico do browser-fingerprint.ts do Baileys.
  let h = 0x811c9dc5;
  for (let i = 0; i < sessionId.length; i++) {
    h ^= sessionId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const major = CHROME_UA_MAJORS[(h >>> 0) % CHROME_UA_MAJORS.length]!;
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}

// Máximo de reconexões automáticas seguidas antes de desistir e marcar DEGRADED (espelha o
// Baileys — baileys.engine.ts:398). O contador zera a cada 'ready' (conexão bem-sucedida).
const MAX_RECONNECT = 5;

// mime/fileName → extensão do objeto no S3. Espelha o extOf do Baileys (baileys.engine.ts:226) —
// helper mecânico (não é conhecimento de negócio), duplicado de propósito para não acoplar as
// duas engines num import de valor (R21 V6).
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

// Tipo do wwebjs (msg.type) → mediaType público (image|video|audio|document|sticker). ptt (nota de
// voz) conta como audio; qualquer mídia desconhecida cai em document (recuperável no GET /media).
// Exportado para teste unitário (é a tradução que decide o tipo emitido no webhook de mídia).
export function mapInboundMediaType(t: string | undefined): string {
  switch (t) {
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'audio':
    case 'ptt':
      return 'audio';
    case 'sticker':
      return 'sticker';
    default:
      return 'document';
  }
}

// P-012 — lê os flags REAIS do grupo (announce = só admin envia · restrict = só admin edita info).
// Vivem em `groupMetadata` no runtime do wwebjs (Utils.js:967), mas o d.ts não os tipa → cast.
// Ausente (metadata não carregada) → false, o mesmo fallback de antes (sem regressão). Puro/testável.
export function groupFlags(g: GroupChat): {
  announce: boolean;
  restrict: boolean;
} {
  const md = (
    g as unknown as {
      groupMetadata?: { announce?: unknown; restrict?: unknown };
    }
  ).groupMetadata;
  return { announce: !!md?.announce, restrict: !!md?.restrict };
}

// Monta a URL do proxy COM credenciais para o upstream do forwarder local (proxy-chain). Usa os
// setters do WHATWG URL, que aplicam o percent-encode do userinfo — senha com @ : / # não quebra
// a URL (o proxy-chain decodifica ao montar o Proxy-Authorization). Exportada para teste.
export function buildAuthProxyUrl(
  server: string,
  username: string,
  password: string,
): string {
  const url = new URL(server);
  url.username = username;
  url.password = password;
  return url.toString();
}

// Diretório do perfil do Chromium (LocalAuth) desta sessão no volume persistente
// (`{WWEBJS_DATA_PATH}/session-<sessionId>`, ver LocalAuth.js:35). É onde o wwebjs guarda as
// credenciais — ao contrário do Baileys, que usa o Postgres. Exportado para teste (contrato do path).
export function authDirOf(sessionId: string): string {
  return join(resolve(AUTH_PATH), `session-${sessionId}`);
}

// Tetos das operações de Store (P-014): a página do WhatsApp Web pode PENDURAR após reconexões de
// QR (evaluate nunca resolve) e o chamador ficava preso os 240s do protocolTimeout do CDP. O probe
// curto detecta página morta antes da operação; o teto por operação devolve erro acionável em
// segundos. Dimensionados para NÃO abortar sincronização legítima (getChats real volta em <30s).
const STORE_PROBE_TIMEOUT_MS = 10_000;
const STORE_OP_TIMEOUT_MS = 45_000;

// Corre uma promise de Store contra um teto. O race NÃO cancela a chamada CDP subjacente (fica
// pendente no Chromium até o protocolTimeout) — o teto existe para devolver o erro acionável AGORA
// em vez de prender o chamador; a rejeição tardia da promise órfã é engolida (sem unhandled).
// Exportada para teste.
export async function raceStoreOp<T>(
  op: Promise<T>,
  ms: number,
  timeoutMsg: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const ceiling = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(new Error(`${timeoutMsg} (teto de ${Math.round(ms / 1000)}s)`)),
      ms,
    );
  });
  try {
    return await Promise.race([op, ceiling]);
  } catch (e) {
    op.catch(() => undefined); // perdeu o race: engole a rejeição tardia da chamada órfã
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Engine alternativa (F8) usando whatsapp-web.js (Puppeteer + Chrome do sistema). Mesmo contrato
// IEngine do BaileysEngine, escolhida por sessão via EngineFactory. Cobre conexão/QR, status,
// enviar/receber texto e mídia (S3), grupos (incl. extração de leads via Store oficial), contatos
// (checar número, foto, bloquear, agenda) e canais/newsletter (beta) — paridade com o Baileys.
export class WWebJSEngine implements IEngine {
  readonly engineName = 'wwebjs' as const;
  private client: Client | null = null;
  private status: SessionStatus = 'STOPPED';
  private qrBase64: string | null = null;
  private stopped = false;
  // Cache LID(serializado) -> telefone (<num>@c.us) já resolvido via Store, para não consultar o
  // Puppeteer a cada mensagem. Persiste entre start/stop da mesma sessão (o mapeamento não muda).
  private readonly lidToPnCache = new Map<string, string>();
  // keyId das mensagens enviadas PELO painel (sendText/sendMedia) — para o handler message_create
  // não duplicá-las (já são emitidas no envio). Sobra capturar as enviadas pelo próprio celular.
  private readonly sentByPanel = new Set<string>();
  // URL do forwarder LOCAL (proxy-chain) que anonimiza o proxy autenticado deste start.
  // Fechado no stop/logout/queda/falha de init para liberar a porta (ver closeAnonProxy).
  private anonProxyUrl: string | null = null;
  // Mutex de ciclo de vida: serializa start/stop/logout da MESMA sessão. Sem isto, um restart
  // (stop→start) ou cliques/polling repetidos podem lançar 2 Chromium no mesmo userDataDir — entre o
  // `puppeteer.launch` (whatsapp-web.js Client.js:462) e o `this.pupBrowser = browser` (Client.js:477)
  // há uma janela em que `destroy()` (Client.js:1277, olha `this.pupBrowser`) NÃO enxerga o browser, que
  // fica órfão segurando o ProcessSingleton do perfil → "browser already running" (puppeteer
  // BrowserLauncher.js:175). Serializar fecha essa janela: nunca há dois ciclos concorrentes.
  private lifecycle: Promise<unknown> = Promise.resolve();
  // Reconexões automáticas seguidas (backoff). Zera no 'ready'. Ver handleDisconnect.
  private reconnectAttempts = 0;
  // Último percent visto no loading_screen (sincronização offline pós-login). Diagnóstico do
  // P-014: entra na mensagem de erro quando uma operação de Store estoura o teto — distingue
  // "ainda sincronizando em X%" de "página travada sem nunca ter emitido progresso" (null).
  private lastLoadingPct: number | null = null;

  constructor(private readonly deps: BaileysEngineDeps) {}

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

  getStatus(): SessionStatus {
    return this.status;
  }
  getQrBase64(): string | null {
    return this.qrBase64;
  }

  private setStatus(
    status: SessionStatus,
    extra?: {
      meJid?: string | null;
      mePushName?: string | null;
      error?: string | null;
    },
  ): void {
    this.status = status;
    this.deps.onEvent('session.status', { status, ...extra });
  }

  // Remove locks de perfil órfãos do Chromium (SingletonLock/Socket/Cookie) no userDataDir desta
  // sessão. O userDataDir (LocalAuth.js:35 → `${dataPath}/session-${clientId}`) fica em volume
  // PERSISTENTE (/data/wwebjs); o SingletonLock é um symlink `<hostname>-<pid>` e o hostname do
  // container MUDA a cada deploy/restart, então o Chromium vê o lock com hostname alheio, não valida o
  // dono e RECUSA ("Failed to create a ProcessSingleton" → puppeteer BrowserLauncher.js:175). Seguro:
  // o ciclo é serializado (mutex) e só chegamos aqui com client==null; 1 container por volume → o lock
  // remanescente é sempre de processo morto.
  private async clearStaleSingletonLocks(): Promise<void> {
    const dir = authDirOf(this.deps.sessionId);
    await Promise.all(
      ['SingletonLock', 'SingletonSocket', 'SingletonCookie'].map((f) =>
        rm(join(dir, f), { force: true }).catch(() => {}),
      ),
    );
  }

  // Remove o perfil do Chromium (credenciais do LocalAuth) desta sessão do DISCO. As credenciais do
  // wwebjs não ficam no Postgres (o SessionManager limpa lá é o store do Baileys) — ficam aqui.
  // Chamado por new-qr/logout/remove no SessionManager DEPOIS de parar a engine (Chromium já morto),
  // para: (a) o new-qr recuperar de verdade (creds mortas em disco → QR novo, antes era no-op); (b) o
  // DELETE não deixar o perfil (dezenas–centenas de MB) órfão no volume. Seguro para qualquer sessão:
  // se o dir não existe (sessão Baileys), é no-op.
  static async purgeAuthDir(sessionId: string): Promise<void> {
    await rm(authDirOf(sessionId), { recursive: true, force: true }).catch(
      () => {},
    );
  }

  start(): Promise<void> {
    return this.serialize(() => this.doStart());
  }

  // attempt limita os retries internos (fallback de proxy / de webVersion) — nunca recursão infinita.
  // forceLive=true refaz o start SEM fixar a webVersion (retry pós-falha com versão fixa).
  private async doStart(attempt = 0, forceLive = false): Promise<void> {
    if (this.client) return;
    this.stopped = false;

    // Remove locks de perfil órfãos (Singleton*) ANTES de lançar o Chromium — sem isto, um SingletonLock
    // stale no volume persistente (hostname do container mudou) faz o Chromium recusar com
    // "browser already running" indefinidamente. Ver clearStaleSingletonLocks.
    await this.clearStaleSingletonLocks();

    // Proxy atribuído à sessão (se houver): aplicado ao Chromium via --proxy-server, com a auth nativa
    // do wwebjs (proxyAuthentication). Sem isto, a engine browser ignorava o proxy (só o Baileys usava).
    const proxy = (await this.deps.resolveProxyConfig?.()) ?? null;
    if (proxy) {
      this.deps.logger.info(
        { server: proxy.server, auth: !!proxy.username },
        'wwebjs: usando proxy',
      );
      // Item 11 — username sem password: a auth NÃO será enviada → 407 "inexplicável".
      if (proxy.username && !proxy.password) {
        this.deps.logger.warn(
          { server: proxy.server },
          'wwebjs: proxy tem username sem password — conectando SEM auth (provável 407). Corrija a credencial do proxy.',
        );
      }
    } else {
      // Sem proxy: o Chromium conectaria pelo IP do servidor (datacenter) — o WhatsApp vê esse IP
      // em Aparelhos Conectados. Paridade com o log de conexão sem proxy do Baileys (hardening 22/07).
      this.deps.logger.warn(
        { sessionId: this.deps.sessionId },
        'wwebjs: conectando SEM proxy — o WhatsApp verá o IP do servidor. Atribua um proxy residencial se anti-flag importar.',
      );
    }

    // Guard anti-vazamento (WA_REQUIRE_PROXY): espelha o guard do Baileys (baileys.engine.ts:489-499).
    // Sem proxy vivo e com o guard ligado, RECUSAMOS conectar em vez de vazar o IP do datacenter —
    // gatilho nº 1 de flag na conexão. Falha ANTES de resolver a webVersion (nada de rede à toa).
    // stopped=true corta a reconexão automática; um start manual, já com proxy atribuído à sessão,
    // reseta e tenta de novo. (No wwebjs o commit 1525e4e injetava requireProxy mas nunca o lia.)
    if (!proxy && this.deps.requireProxy) {
      this.stopped = true;
      this.deps.logger.error(
        { sessionId: this.deps.sessionId },
        'wwebjs: conexão BLOQUEADA — WA_REQUIRE_PROXY ligado e nenhum proxy vivo atribuído.',
      );
      this.setStatus('FAILED', {
        error:
          'Sem proxy vivo e WA_REQUIRE_PROXY ligado — conexão bloqueada para não vazar o IP do servidor. Atribua um proxy residencial à sessão e reinicie.',
      });
      return;
    }

    // Chromium inexistente (typo/ausência em WWEBJS_CHROME_PATH) só estouraria no launch, com um
    // ENOENT críptico do puppeteer. Falha ANTES (e antes de resolver a webVersion — nada de rede à
    // toa), com diagnóstico acionável, e corta a reconexão automática (stopped=true): reconectar
    // não conserta binário ausente. Depois do guard de proxy de propósito: segurança primeiro.
    try {
      await access(CHROME_PATH);
    } catch {
      this.stopped = true;
      this.deps.logger.error(
        { chromePath: CHROME_PATH },
        'wwebjs: Chromium não encontrado',
      );
      this.setStatus('FAILED', {
        error: `Chromium não encontrado em "${CHROME_PATH}" — instale-o na imagem ou corrija WWEBJS_CHROME_PATH.`,
      });
      return;
    }

    // Fixa a versão do WhatsApp Web (acelera/estabiliza o carregamento e evita quebra do Store).
    const webVersion = await this.resolveWebVersion(forceLive);
    // Item 6 — garante o HTML da versão no cache local: 1 download por versão, não por initialize.
    const hasLocalHtml = webVersion
      ? await this.ensureWebVersionHtml(webVersion)
      : false;

    // Proxy AUTENTICADO vai por forwarder LOCAL (proxy-chain), não por page.authenticate. Visto em
    // produção (13/08, Webshare static residential): o proxy responde o 407 do CONNECT com
    // "Connection: close", e a auth por desafio do Puppeteer (interceptação Fetch) não completa —
    // o Chromium falha com ERR_TUNNEL_CONNECTION_FAILED e o proxy (são) era marcado DEAD. O
    // forwarder inverte o jogo: o Chromium fala com 127.0.0.1 SEM auth e o proxy-chain injeta o
    // Proxy-Authorization no upstream JÁ no 1º CONNECT — o mesmo caminho proativo do
    // https-proxy-agent que faz o health-tester e o Baileys funcionarem nesses proxies. Cobre
    // página, service worker e WebSocket de uma vez. Doc: README do proxy-chain (anonymizeProxy).
    await this.closeAnonProxy(); // reconexão/retry pode ter deixado o forwarder do start anterior
    let proxyServer = proxy?.server ?? null;
    let nativeProxyAuth = false;
    if (proxy?.username && proxy.password) {
      try {
        this.anonProxyUrl = await anonymizeProxy(
          buildAuthProxyUrl(proxy.server, proxy.username, proxy.password),
        );
        proxyServer = this.anonProxyUrl;
        this.deps.logger.info(
          { upstream: proxy.server, local: this.anonProxyUrl },
          'wwebjs: proxy autenticado anonimizado em forwarder local (proxy-chain)',
        );
      } catch (e) {
        // Fallback: caminho antigo (page.authenticate) — tentar é melhor do que não conectar.
        nativeProxyAuth = true;
        this.deps.logger.warn(
          { err: (e as Error)?.message, server: proxy.server },
          'wwebjs: falha ao subir o forwarder local — caindo para page.authenticate (CONNECT pode falhar)',
        );
      }
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: this.deps.sessionId,
        dataPath: AUTH_PATH,
      }),
      ...(webVersion
        ? {
            webVersion,
            // Preferência: cache LOCAL (HTML pré-baixado no volume — zero rede por start);
            // fallback: cache remoto do wa-version (comportamento anterior).
            webVersionCache: hasLocalHtml
              ? { type: 'local' as const, path: WEB_CACHE_DIR }
              : { type: 'remote' as const, remotePath: WEB_VERSION_REMOTE },
          }
        : {}),
      userAgent: userAgentFor(this.deps.sessionId),
      // page.authenticate SÓ no fallback (forwarder local indisponível): o Chromium não aceita
      // user:pass na URL do --proxy-server, e a auth por desafio falha com proxies que fecham a
      // conexão no 407 do CONNECT (ver bloco do proxy-chain acima).
      ...(nativeProxyAuth && proxy?.username && proxy.password
        ? {
            proxyAuthentication: {
              username: proxy.username,
              password: proxy.password,
            },
          }
        : {}),
      puppeteer: {
        headless: true,
        executablePath: CHROME_PATH,
        // Sobe o teto de timeout das chamadas CDP (host carregado / sync lenta não derruba à toa).
        protocolTimeout: 240_000,
        defaultViewport: { width: 1024, height: 768 },
        args: [
          ...(proxyServer ? [`--proxy-server=${proxyServer}`] : []),
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          // Reduzem RAM/CPU do Chromium em servidor headless, sem afetar o WhatsApp Web.
          // Evita-se --single-process/--no-zygote de propósito (instabilizam o whatsapp-web.js).
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-accelerated-2d-canvas',
          // Cap do heap V8 por renderer: RAM previsível por sessão (multi-tenant).
          '--js-flags=--max-old-space-size=512,--max-semi-space-size=64',
          '--disable-extensions',
          '--disable-component-update',
          '--disable-sync',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=Translate,BackForwardCache,MediaRouter,OptimizationHints,AcceptCHFrame,CalculateNativeWinOcclusion',
          '--mute-audio',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps',
        ],
      },
      browserName: 'Chrome',
    });
    this.client = client;
    this.lastLoadingPct = null; // página nova: progresso de sincronização recomeça do zero
    this.setStatus('STARTING');

    // Progresso da sincronização offline — torna visível o "demora muito" (em vez de ficar cego no
    // STARTING). Útil para diagnosticar carregamento lento (ex.: via proxy).
    client.on('loading_screen', (percent: number, message: string) => {
      this.lastLoadingPct = Number(percent);
      this.deps.logger.info(
        { percent, message },
        'wwebjs: carregando WhatsApp Web',
      );
    });

    client.on('qr', (qr: string) => {
      void QRCode.toDataURL(qr, { margin: 1, width: 320 })
        .then((url) => {
          this.qrBase64 = url;
          this.setStatus('SCAN_QR_CODE');
        })
        .catch((e) =>
          this.deps.logger.error({ e }, 'wwebjs: falha ao gerar QR'),
        );
    });
    client.on('ready', () => {
      this.qrBase64 = null;
      this.reconnectAttempts = 0; // conexão OK: zera o backoff de reconexão
      this.setStatus('WORKING', {
        meJid: client.info?.wid?._serialized ?? null,
        mePushName: client.info?.pushname ?? null,
        error: null,
      });
      // Merge: funde conversas antigas divididas em @lid (após o Store sincronizar).
      setTimeout(() => void this.mergeExistingLids(), 4000);
      // Puxa a agenda (nomes salvos) para o diretório. withStoreReady cobre o Store ainda injetando.
      setTimeout(() => void this.syncAddressBook(), 3000);
    });
    client.on('auth_failure', (m: string) =>
      this.setStatus('FAILED', { error: `auth_failure: ${m}` }),
    );
    // Diagnóstico de estabilidade: CONFLICT/UNPAIRED/TIMEOUT chegam AQUI antes do 'disconnected' —
    // no log fica claro o PORQUÊ da queda (ex.: UNPAIRED = desvinculado pelo celular; CONFLICT =
    // outro WhatsApp Web abriu com a mesma conta). Sem isto, só se via o sintoma (a desconexão).
    client.on('change_state', (state) => {
      this.deps.logger.warn(
        { sessionId: this.deps.sessionId, state },
        'wwebjs: estado da conexão mudou',
      );
    });
    // Login por código: o WhatsApp renova o pairing code a cada ~3 min; a rota devolve só o
    // primeiro. O renovado aparece no log — sem isto, código expirado = beco sem saída silencioso.
    client.on('code', (code: string) => {
      this.deps.logger.info(
        { sessionId: this.deps.sessionId, code },
        'wwebjs: pairing code renovado',
      );
    });
    client.on('disconnected', (reason: unknown) => {
      void this.handleDisconnect(reason);
    });
    // message_create capta recebidas E enviadas de QUALQUER device (inclusive do celular). As enviadas
    // pelo painel já são emitidas no sendText/sendMedia (com telefone + metadados) e deduplicadas aqui
    // via sentByPanel; resta capturar as enviadas pelo celular. O @lid é resolvido para telefone (merge).
    client.on(
      'message_create',
      (msg: Message) => void this.onMessageCreate(msg),
    );
    // G3 — ACK de entrega/leitura. O wwebjs entrega o ack como número (MessageAck).
    client.on('message_ack', (msg: Message, ack: number) =>
      this.onMessageAck(msg, ack),
    );
    // W6 — reação RECEBIDA (o lead reagiu a uma mensagem). Emite o evento message.reaction.
    client.on('message_reaction', (r: Reaction) => void this.onReaction(r));

    // Aguarda o initialize (já serializado pelo mutex de ciclo de vida) para garantir cleanup
    // determinístico: quando o `goto` falha (proxy), `this.pupBrowser` já foi setado (Client.js:477)
    // e o `destroy()` fecha o Chromium — não fica órfão. A falha NÃO propaga como HTTP 500: vira
    // status FAILED com mensagem acionável; o painel acompanha via status/QR.
    try {
      await client.initialize();
    } catch (e) {
      await this.handleInitFailure(e, attempt, webVersion);
    }
  }

  // Item 6 — garante o HTML da versão no cache LOCAL (volume persistente): baixa do wa-version
  // só quando o arquivo ainda não existe. true = dá para usar o LocalWebCache (lê do disco).
  private async ensureWebVersionHtml(version: string): Promise<boolean> {
    const file = join(WEB_CACHE_DIR, `${version}.html`);
    try {
      await access(file);
      return true;
    } catch {
      /* ainda não baixado */
    }
    try {
      const res = await fetch(
        WEB_VERSION_REMOTE.replace('{version}', version),
        { signal: AbortSignal.timeout(30_000) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      await mkdir(WEB_CACHE_DIR, { recursive: true });
      await writeFile(file, html);
      this.deps.logger.info(
        { version },
        'wwebjs: HTML da webVersion baixado para o cache local',
      );
      return true;
    } catch (e) {
      this.deps.logger.warn(
        { version, err: (e as Error).message },
        'wwebjs: falha ao pré-baixar o HTML da webVersion — usando cache remoto',
      );
      return false;
    }
  }

  // Resolve a versão do WhatsApp Web a fixar NESTE start. null = não fixa ('live'/forceLive).
  // No modo 'auto', consulta a currentVersion do wa-version com cache de processo; se o fetch
  // falhar, cai no DEFAULT_WEB_VERSION.
  private async resolveWebVersion(forceLive: boolean): Promise<string | null> {
    if (forceLive || WEB_VERSION_MODE === 'live') return null;
    if (WEB_VERSION_MODE !== 'auto') return WEB_VERSION_MODE;
    if (
      autoWebVersion &&
      Date.now() - autoWebVersion.fetchedAt < AUTO_WEB_VERSION_TTL_MS
    ) {
      return autoWebVersion.version;
    }
    try {
      const res = await fetch(WA_VERSIONS_JSON, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as { currentVersion?: string };
      if (!j.currentVersion) {
        throw new Error('versions.json sem currentVersion');
      }
      autoWebVersion = { version: j.currentVersion, fetchedAt: Date.now() };
      this.deps.logger.info(
        { version: j.currentVersion },
        'wwebjs: webVersion corrente resolvida (auto)',
      );
      return j.currentVersion;
    } catch (e) {
      this.deps.logger.warn(
        { err: (e as Error).message, fallback: DEFAULT_WEB_VERSION },
        'wwebjs: não consegui resolver a webVersion corrente — usando o default fixo',
      );
      return DEFAULT_WEB_VERSION;
    }
  }

  // Trata falha do client.initialize() (Puppeteer/WhatsApp Web). Em vez de propagar (500), registra,
  // limpa o client e marca a sessão como FAILED com um diagnóstico — com destaque para erros de proxy
  // (credencial rejeitada no CONNECT do Chromium) e para o lock de perfil órfão. Antes de desistir,
  // tenta os fallbacks (proxy seguinte / webVersion live) limitados por `attempt`.
  private async handleInitFailure(
    e: unknown,
    attempt: number,
    pinnedVersion: string | null,
  ): Promise<void> {
    const msg = (e as Error)?.message ?? String(e);
    const isProxyAuth = /ERR_INVALID_AUTH_CREDENTIALS/i.test(msg);
    const isProxyTunnel =
      /ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY_CONNECTION_FAILED|ERR_NO_SUPPORTED_PROXIES|ERR_SOCKS_CONNECTION_FAILED/i.test(
        msg,
      );
    const isBrowserLock = /already running for|ProcessSingleton/i.test(msg);
    this.deps.logger.error(
      {
        err: msg,
        proxyAuth: isProxyAuth,
        proxyTunnel: isProxyTunnel,
        browserLock: isBrowserLock,
      },
      'wwebjs: falha ao inicializar',
    );
    // Limpa SEMPRE (mesmo se houve stop concorrente) para não deixar o Chromium órfão.
    try {
      await this.client?.destroy();
    } catch {
      /* noop */
    }
    this.client = null;
    await this.closeAnonProxy(); // um retry (doStart abaixo) sobe forwarder novo; sem retry, libera a porta
    if (this.stopped) return; // stop()/logout() pediu parada — não sobrescreve o STOPPED
    // Item 8 — fallback de proxy: o proxy atual falhou em uso real. Marca-o DEAD e, nos modos
    // rotativos, tenta de novo UMA vez — o resolve() do retry pula os DEAD e entrega o próximo
    // candidato (ou null = conexão direta, o mesmo que um start sem proxy disponível). No SINGLE
    // o proxy foi pinado de propósito: não se rotaciona nem se conecta direto por conta própria —
    // a sessão fica FAILED com o motivo acionável.
    if (
      (isProxyAuth || isProxyTunnel) &&
      attempt === 0 &&
      this.deps.reportProxyFailure
    ) {
      try {
        const r = await this.deps.reportProxyFailure(
          isProxyAuth ? 'PROXY_AUTH' : 'PROXY_TUNNEL',
        );
        if (r.mode === 'RANGE' || r.mode === 'GLOBAL_ROUND_ROBIN') {
          this.deps.logger.warn(
            { mode: r.mode },
            'wwebjs: proxy marcado DEAD — tentando o próximo candidato',
          );
          return this.doStart(attempt + 1, false);
        }
      } catch (err) {
        this.deps.logger.error(
          { err },
          'wwebjs: falha ao reportar proxy morto',
        );
      }
    }
    // Item 10 — fallback da webVersion fixa: falha de init que NÃO é proxy nem lock de perfil, com
    // versão fixada, é compatível com versão EXPIRADA pela Meta. Tenta UMA vez sem fixar ('live').
    if (
      !isProxyAuth &&
      !isProxyTunnel &&
      !isBrowserLock &&
      pinnedVersion &&
      attempt < 2
    ) {
      this.deps.logger.warn(
        { pinnedVersion },
        'wwebjs: init falhou com a webVersion fixa — possível versão expirada; tentando com a versão live. Atualize WWEBJS_WEB_VERSION (use "auto" ou a currentVersion de github.com/wppconnect-team/wa-version).',
      );
      return this.doStart(attempt + 1, true);
    }
    const error = isProxyAuth
      ? `Proxy rejeitou a autenticação (ERR_INVALID_AUTH_CREDENTIALS): credencial do proxy desta sessão está incorreta. Sincronize o pool (Webshare) ou troque/remova o proxy.`
      : isProxyTunnel
        ? `Não foi possível conectar pelo proxy (${msg.split(' at ')[0]}): proxy indisponível ou exigindo auth. Troque/remova o proxy desta sessão.`
        : isBrowserLock
          ? `Instância anterior do navegador ainda ativa para esta sessão (perfil bloqueado). Pare a sessão e tente novamente; se persistir, reinicie o serviço.`
          : `Falha ao iniciar a sessão: ${msg}`;
    this.setStatus('FAILED', { error });
  }

  // Trata a queda da conexão (evento 'disconnected'). Dois problemas que este handler resolve:
  // (1) a lib chama `this.destroy()` internamente ao detectar o estado não-aceito (Client.js:851),
  //     mas mantém a instância viva; sem zerar `this.client`, o doStart:140 (`if (this.client) return`)
  //     faz TODO start/restart virar no-op silencioso e a sessão nunca volta.
  // (2) não havia reconexão automática — a sessão ficava DEGRADED até intervenção manual.
  // Espelha o Baileys (baileys.engine.ts:641-666): backoff exponencial + jitter, teto MAX_RECONNECT,
  // reconexão serializada re-checando `stopped` DENTRO da fila (um stop()/logout() que entrou entre o
  // agendamento e a execução cancela a reconexão em vez de ressuscitar o Chromium).
  private async handleDisconnect(reason: unknown): Promise<void> {
    const dead = this.client;
    try {
      await dead?.destroy();
    } catch {
      /* a própria lib já pode ter destruído */
    }
    // Só zera se ninguém trocou o client no meio-tempo (não nula uma instância nova de reconexão).
    if (this.client === dead) {
      this.client = null;
      // Forwarder do start que caiu não serve mais (a reconexão sobe um novo no doStart).
      await this.closeAnonProxy();
    }

    if (this.stopped) {
      this.setStatus('STOPPED', { error: null });
      return;
    }

    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > MAX_RECONNECT) {
      this.setStatus('DEGRADED', {
        error: `desconectado (${String(reason)}); falha ao reconectar após ${MAX_RECONNECT} tentativas — reinicie a sessão (POST /restart)`,
      });
      return;
    }
    const delay =
      Math.min(30_000, 1_000 * 2 ** this.reconnectAttempts) +
      Math.floor(Math.random() * 1_000);
    this.setStatus('DEGRADED', {
      error: `desconectado (${String(reason)}) — reconectando (tentativa ${this.reconnectAttempts}/${MAX_RECONNECT})`,
    });
    this.deps.logger.warn(
      { reason: String(reason), attempt: this.reconnectAttempts, delay },
      'wwebjs: reconectando sessão',
    );
    setTimeout(() => {
      if (this.stopped) return;
      void this.serialize(() =>
        this.stopped ? Promise.resolve() : this.doStart(),
      ).catch((e) =>
        this.deps.logger.error({ e }, 'wwebjs: erro ao reconectar'),
      );
    }, delay);
  }

  // Fecha o forwarder local (proxy-chain) deste start, se houver — libera a porta e derruba
  // conexões pendentes (closeConnections=true: o Chromium já morreu/vai morrer, não há o que drenar).
  // Idempotente e à prova de dupla chamada (zera a referência ANTES do await).
  private async closeAnonProxy(): Promise<void> {
    const url = this.anonProxyUrl;
    if (!url) return;
    this.anonProxyUrl = null;
    await closeAnonymizedProxy(url, true).catch(() => undefined);
  }

  // Fecha o Chromium com TETO de tempo: um destroy() que pendura (Chromium travado) não pode
  // bloquear a fila `lifecycle` (mutex) desta sessão para sempre — sem o teto, todo start/stop/logout
  // futuro penduraria atrás dele. Se estourar, o Chromium pode ficar órfão, mas o clearStaleSingletonLocks
  // do próximo start remove o lock remanescente — melhor um órfão do que a sessão travada.
  private async destroyWithTimeout(): Promise<void> {
    const client = this.client;
    if (!client) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((r) => {
      timer = setTimeout(r, 12_000);
    });
    try {
      await Promise.race([client.destroy().catch(() => {}), timeout]);
    } finally {
      if (timer) clearTimeout(timer); // não deixa o timer vivo 12s após um destroy rápido
    }
  }

  stop(): Promise<void> {
    return this.serialize(() => this.doStop());
  }

  private async doStop(): Promise<void> {
    this.stopped = true;
    await this.destroyWithTimeout();
    this.client = null;
    await this.closeAnonProxy();
    this.qrBase64 = null; // não servir um QR morto de sessão parada via getQrBase64()
    this.setStatus('STOPPED');
  }

  logout(): Promise<void> {
    return this.serialize(() => this.doLogout());
  }

  private async doLogout(): Promise<void> {
    this.stopped = true;
    try {
      // logout() do wwebjs faz o round-trip com o WhatsApp E remove o userDataDir (LocalAuth).
      await this.client?.logout();
    } catch {
      /* pode falhar com creds mortas — a purga em disco abaixo garante a limpeza */
    }
    await this.destroyWithTimeout();
    this.client = null;
    await this.closeAnonProxy();
    this.qrBase64 = null;
    // Garante a limpeza do perfil em disco MESMO se o logout() acima lançou (antes o catch vazio
    // deixava a credencial no volume). Idempotente com o rm que o próprio logout() já faz.
    await WWebJSEngine.purgeAuthDir(this.deps.sessionId);
    this.setStatus('STOPPED');
  }

  async requestPairingCode(phoneNumber: string): Promise<string> {
    const code = await this.req().requestPairingCode(
      phoneNumber.replace(/\D/g, ''),
    );
    // Paridade com o Baileys (baileys.engine.ts:1416): o painel/n8n distingue "esperando o código
    // ser digitado" de "esperando QR". O evento 'code' (acima) loga as renovações (~3 min).
    this.setStatus('PAIRING_CODE');
    return code;
  }

  async sendText(
    to: string,
    text: string,
    opts?: SendOptions,
  ): Promise<{ keyId: string; jid: string }> {
    const c = this.req();
    const jid = this.toChatId(to);
    const mentions = this.toMentionIds(opts?.mentions);
    const sent = await c.sendMessage(jid, text, mentions ? { mentions } : {});
    const keyId = sent.id?._serialized ?? '';
    if (keyId) this.rememberPanel(keyId);
    this.deps.onEvent('message', {
      keyId,
      chatJid: jid,
      senderJid: c.info?.wid?._serialized ?? null,
      fromMe: true,
      type: 'text',
      text,
      isCold: opts?.cold ?? false,
      idempotencyKey: opts?.idempotencyKey ?? null,
      source: 'api',
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
    // Fidelidade de tipo: sem sendMediaAsDocument/Sticker o wwebjs infere pelo mime — um sticker ia
    // como imagem comum e um arquivo pedido como 'document' podia perder o fileName.
    const mentions = this.toMentionIds(input.mentions);
    const sent = await c.sendMessage(jid, media, {
      caption: input.caption ?? undefined,
      sendAudioAsVoice: input.ptt,
      sendMediaAsDocument: input.type === 'document',
      sendMediaAsSticker: input.type === 'sticker',
      ...(mentions ? { mentions } : {}),
    });
    // Guard: o wwebjs devolve null/undefined para conteúdo/destino não suportado (canal, status) —
    // sem isto o `sent.id` estourava com TypeError em vez de um erro claro.
    if (!sent) {
      throw new Error(
        'wwebjs: envio de mídia não retornou mensagem (conteúdo ou destino não suportado)',
      );
    }
    const keyId = sent.id?._serialized ?? '';
    if (keyId) this.rememberPanel(keyId);

    // Sobe a própria mídia enviada ao S3 (mesma pipeline da recebida) para aparecer no Inbox e para
    // o webhook receber a mediaUrl — paridade com o Baileys (baileys.engine.ts:896-912). Antes o
    // mediaKey saía sempre null e o binário do que o painel mandou nunca ficava disponível.
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
        'wwebjs: falha ao armazenar mídia enviada — seguirá SEM mediaKey',
      );
      mediaKey = null;
    }

    this.deps.onEvent('message', {
      keyId,
      chatJid: jid,
      senderJid: c.info?.wid?._serialized ?? null,
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
      timestamp: Math.floor(Date.now() / 1000),
    });
    return { keyId, jid };
  }

  async sendLocation(
    to: string,
    input: SendLocationInput,
  ): Promise<{ keyId: string; jid: string }> {
    const c = this.req();
    const jid = this.toChatId(to);
    const loc = new Location(input.latitude, input.longitude, {
      name: input.name ?? undefined,
      address: input.address ?? undefined,
    });
    const sent = await c.sendMessage(jid, loc);
    if (!sent)
      throw new Error('wwebjs: envio de localização não retornou mensagem');
    const keyId = sent.id?._serialized ?? '';
    if (keyId) this.rememberPanel(keyId);
    this.emitOutbound(
      keyId,
      jid,
      'location',
      input.name || input.address || null,
      input,
    );
    return { keyId, jid };
  }

  async sendPoll(
    to: string,
    input: SendPollInput,
  ): Promise<{ keyId: string; jid: string }> {
    const c = this.req();
    const jid = this.toChatId(to);
    const poll = new Poll(input.name, input.options, {
      allowMultipleAnswers: input.multi ?? false,
      messageSecret: undefined,
    });
    const sent = await c.sendMessage(jid, poll);
    if (!sent)
      throw new Error('wwebjs: envio de enquete não retornou mensagem');
    const keyId = sent.id?._serialized ?? '';
    if (keyId) this.rememberPanel(keyId);
    this.emitOutbound(keyId, jid, 'poll', input.name, input);
    return { keyId, jid };
  }

  // Eco de um envio nosso (fromMe=api) para o EventBus — persistência + webhook + reply-rate (G1).
  private emitOutbound(
    keyId: string,
    jid: string,
    type: string,
    text: string | null,
    opts: SendOptions,
  ): void {
    this.deps.onEvent('message', {
      keyId,
      chatJid: jid,
      senderJid: this.client?.info?.wid?._serialized ?? null,
      fromMe: true,
      type,
      text,
      isCold: opts.cold ?? false,
      idempotencyKey: opts.idempotencyKey ?? null,
      source: 'api',
      timestamp: Math.floor(Date.now() / 1000),
    });
  }

  // W8 — perfil da conta conectada.
  async setProfileStatus(status: string): Promise<void> {
    await this.req().setStatus(status);
  }
  async setProfileName(name: string): Promise<void> {
    await this.req().setDisplayName(name);
  }
  async setProfilePhoto(image: Buffer, mimetype: string): Promise<void> {
    const media = new MessageMedia(mimetype, image.toString('base64'));
    await this.req().setProfilePicture(media);
  }

  async sendPresence(to: string, state: PresenceState): Promise<void> {
    const c = this.req();
    // available/unavailable são presença GLOBAL (online/offline da conta) — paridade com o Baileys
    // (sendPresenceUpdate sem jid). Antes degradavam para clearState do chat, respondendo ok sem
    // fazer o que o contrato promete (G8: presença global existe no catálogo público).
    if (state === 'available') return void (await c.sendPresenceAvailable());
    if (state === 'unavailable')
      return void (await c.sendPresenceUnavailable());
    const chat = await c.getChatById(this.toChatId(to));
    if (state === 'composing') await chat.sendStateTyping();
    else if (state === 'recording') await chat.sendStateRecording();
    // paused: não há "parou de digitar" explícito no wwebjs → limpa o estado do chat.
    else await chat.clearState();
  }

  // G8 — wwebjs marca o CHAT como visto (não há read por msgId); msgId é ignorado.
  async markRead(chatJid: string, _msgId: string): Promise<void> {
    const chat = await this.req().getChatById(this.toChatId(chatJid));
    await chat.sendSeen();
  }

  // W5 — reage a uma mensagem (emoji vazio remove). O wwebjs resolve só pelo msgId serializado;
  // chatJid/fromMe são ignorados (necessários só para o Baileys montar a key).
  async sendReaction(
    _chatJid: string,
    msgId: string,
    _fromMe: boolean,
    emoji: string,
  ): Promise<void> {
    await this.withStoreReady(() => this.req().sendReaction(msgId, emoji));
  }

  // W5 — normaliza menções para o formato do wwebjs (contact ids `<num>@c.us`). undefined = sem menção.
  private toMentionIds(mentions?: string[]): string[] | undefined {
    if (!mentions?.length) return undefined;
    return mentions.map((m) => this.toChatId(m));
  }

  // Handler do message_create: capta recebidas E enviadas de qualquer device. As enviadas pelo painel
  // já foram emitidas no sendText/sendMedia (sentByPanel) — aqui são ignoradas após uma janela curta
  // (o keyId só é conhecido quando o sendMessage resolve). Resta capturar as enviadas pelo CELULAR.
  // O "chat" é o outro lado (msg.to nas enviadas, msg.from nas recebidas), com merge @lid→telefone.
  private async onMessageCreate(msg: Message): Promise<void> {
    try {
      const keyId = msg.id?._serialized ?? '';
      if (msg.fromMe) {
        // Caminho rápido: sendMessage já resolveu → keyId já está em sentByPanel, sem esperar.
        if (this.sentByPanel.has(keyId)) return; // enviada pelo painel: já emitida
        // Janela p/ sendMessage lento (message_create pode chegar ANTES do sendMessage resolver).
        // Só quem cai aqui espera: digitadas no celular (raras) e ecos de envio ainda em trânsito.
        await new Promise((r) => setTimeout(r, 3000));
        if (this.sentByPanel.has(keyId)) return;
      }
      const raw = (msg.fromMe ? msg.to : msg.from) ?? '';
      if (!raw || raw === 'status@broadcast') return;
      const chatJid = await this.resolveNumberJid(raw);
      const base = {
        keyId,
        chatJid,
        senderJid: msg.fromMe
          ? (this.client?.info?.wid?._serialized ?? null)
          : chatJid,
        fromMe: !!msg.fromMe,
        // G2: as enviadas pelo painel já saíram filtradas (sentByPanel, acima). Um fromMe aqui
        // foi digitado no celular = phone; recebida do contato = sem origem nossa (null).
        source: (msg.fromMe ? 'phone' : null) as MessageSource | null,
        timestamp:
          typeof msg.timestamp === 'number'
            ? msg.timestamp
            : Math.floor(Date.now() / 1000),
      };
      // Mídia recebida: baixa o binário, sobe ao S3 e emite com a chave (antes virava type:'other'
      // sem download → GET /:msgId/media respondia 404 para toda mídia WWEBJS).
      if (msg.hasMedia) {
        await this.handleIncomingMedia(msg, base);
        return;
      }
      this.deps.onEvent('message', {
        ...base,
        type: 'text',
        text: msg.body || null,
      });
    } catch (e) {
      this.deps.logger.error({ e }, 'wwebjs: onMessageCreate falhou');
    }
  }

  // Baixa a mídia recebida (msg.downloadMedia), sobe ao S3 e emite com mediaKey + metadados reais.
  // Espelha o handleIncomingMedia do Baileys (baileys.engine.ts:791-856): em falha de download/upload,
  // emite os metadados SEM binário para a conversa não "sumir".
  private async handleIncomingMedia(
    msg: Message,
    base: {
      keyId: string;
      chatJid: string;
      senderJid: string | null;
      fromMe: boolean;
      source: MessageSource | null;
      timestamp: number;
    },
  ): Promise<void> {
    const mediaType = mapInboundMediaType(msg.type);
    const caption = msg.body || null;
    try {
      // O d.ts diz Promise<MessageMedia>, mas em runtime devolve undefined quando a mídia expirou
      // ou está sendo reprocessada — daí o cast + guard.
      const media = (await msg.downloadMedia()) as MessageMedia | undefined;
      if (!media?.data) throw new Error('downloadMedia sem dados');
      const buffer = Buffer.from(media.data, 'base64');
      const mimetype = media.mimetype || 'application/octet-stream';
      const fileName = media.filename ?? null;
      const ext = extOf(mimetype, fileName);
      const safeId = (base.keyId || String(base.timestamp)).replace(
        /[^a-zA-Z0-9_-]/g,
        '',
      );
      const key = `media/${this.deps.sessionId}/${safeId}.${ext}`;
      await this.deps.storeMedia?.(key, buffer, mimetype);
      this.deps.onEvent('message', {
        ...base,
        type: mediaType,
        text: caption,
        mediaType,
        mimetype,
        fileName,
        fileSize: media.filesize ?? buffer.length,
        mediaKey: key,
      });
    } catch (e) {
      this.deps.logger.error(
        { err: e, reason: (e as Error)?.message },
        'wwebjs: falha ao baixar/armazenar mídia recebida — seguirá SEM mediaKey',
      );
      this.deps.onEvent('message', {
        ...base,
        type: mediaType,
        text: caption,
        mediaType,
        mimetype: null,
        fileName: null,
        fileSize: null,
      });
    }
  }

  // G3 — traduz o ack numérico do wwebjs (MessageAck) para o ACK público.
  // ACK_SERVER=1, ACK_DEVICE=2, ACK_READ=3, ACK_PLAYED=4 (ACK_ERROR=-1/ACK_PENDING=0 → ignora).
  private mapAck(ack: number): AckStatus | null {
    switch (ack) {
      case 1:
        return 'sent';
      case 2:
        return 'delivered';
      case 3:
      case 4:
        return 'read';
      default:
        return null;
    }
  }

  private onMessageAck(msg: Message, ack: number): void {
    try {
      const status = this.mapAck(ack);
      if (!status) return;
      const keyId = msg.id?._serialized ?? '';
      if (!keyId) return;
      const chatJid = (msg.fromMe ? msg.to : msg.from) ?? '';
      if (!chatJid || chatJid === 'status@broadcast') return;
      this.deps.onEvent('message.ack', {
        keyId,
        chatJid, // wwebjs usa <num>@c.us; o casamento no banco é por keyId, não por chatJid
        fromMe: !!msg.fromMe,
        status,
        timestamp: Math.floor(Date.now() / 1000),
      });
    } catch (e) {
      this.deps.logger.error({ e }, 'wwebjs: onMessageAck falhou');
    }
  }

  // W6 — reação recebida. `msgId` (MessageId) é a mensagem-alvo; `reaction` é o emoji ('' = removida);
  // `id.fromMe` diz se a reação é NOSSA. O chat vem do `msgId.remote` (com merge @lid→telefone).
  private async onReaction(r: Reaction): Promise<void> {
    try {
      const keyId = r.msgId?._serialized ?? '';
      if (!keyId) return;
      const rawChat = r.msgId?.remote ?? '';
      if (!rawChat || rawChat === 'status@broadcast') return;
      const chatJid = await this.resolveNumberJid(rawChat);
      this.deps.onEvent('message.reaction', {
        keyId,
        chatJid,
        senderJid: r.senderId ?? null,
        emoji: r.reaction ?? '',
        fromMe: !!r.id?.fromMe,
        timestamp:
          typeof r.timestamp === 'number'
            ? r.timestamp
            : Math.floor(Date.now() / 1000),
      });
    } catch (e) {
      this.deps.logger.error({ e }, 'wwebjs: onReaction falhou');
    }
  }

  // Marca uma mensagem como enviada pelo painel (com teto para não vazar memória).
  private rememberPanel(keyId: string): void {
    if (this.sentByPanel.size >= 1000) {
      const oldest = this.sentByPanel.values().next().value;
      if (oldest) this.sentByPanel.delete(oldest);
    }
    this.sentByPanel.add(keyId);
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
    this.cacheLidPn(rawId, phoneJid);
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

  // Teto do cache LID→telefone (FIFO): sem isto crescia sem limite pela vida do processo.
  private cacheLidPn(lid: string, phoneJid: string): void {
    if (this.lidToPnCache.size >= 5000) {
      const oldest = this.lidToPnCache.keys().next().value;
      if (oldest !== undefined) this.lidToPnCache.delete(oldest);
    }
    this.lidToPnCache.set(lid, phoneJid);
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
    if (this.stopped || !this.client) return; // sessão parou entre o 'ready' e o agendamento
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

  // Sincroniza a AGENDA do WhatsApp Web para o diretório: getContacts() traz o nome SALVO (name) e o
  // público (pushname) de cada contato — é o que faltava para o diretório mostrar nomes (antes só vinham
  // telefones de mensagens recebidas, sem nome). Roda no 'ready' (fire-and-forget).
  private async syncAddressBook(): Promise<void> {
    if (this.stopped || !this.client) return; // sessão parou entre o 'ready' e o agendamento
    try {
      const contacts = await this.withStoreReady(() =>
        this.req().getContacts(),
      );
      const recs: ContactRecord[] = [];
      for (const c of contacts as Contact[]) {
        if (c.isGroup || c.isMe) continue;
        const id = c.id?._serialized;
        if (!id) continue;
        const isPhone = c.id.server === 'c.us' || id.endsWith('@c.us');
        const phone = isPhone ? c.id.user.replace(/\D/g, '') : null;
        const name = (c.name || '').trim() || null;
        const pushName = (c.pushname || '').trim() || null;
        // Só guarda quem tem algo útil (nome, pushname ou telefone). Ignora ruído.
        if (!name && !pushName && !phone) continue;
        recs.push({
          waId: id,
          jid: phone ? `${phone}@s.whatsapp.net` : null,
          lid: id.endsWith('@lid') ? id : null,
          phone,
          name,
          pushName,
          source: 'wwebjs-contacts',
        });
      }
      if (recs.length) {
        this.deps.contacts?.recordMany(recs);
        this.deps.logger.info(
          { count: recs.length },
          'wwebjs: agenda sincronizada para o diretório',
        );
      }
    } catch (e) {
      this.deps.logger.error({ e }, 'wwebjs: syncAddressBook falhou');
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

  // Executa uma operação que depende do Store interno do WhatsApp Web, tolerando o RACE do wwebjs
  // 1.34.7: logo após o `ready` o Store (window.WWebJS) pode ainda não estar injetado, e getChats/
  // getChatById estouram "Cannot read properties of undefined (reading 'getChats')". Em vez de falhar,
  // aguarda e tenta de novo (o Store fica pronto em segundos). Ver issue wwebjs #3505.
  //
  // P-014 (página do Store travada após reconexões de QR): quando a página PENDURA — o evaluate
  // nunca resolve nem rejeita — o retry acima não atua e o chamador ficava preso os 240s do
  // protocolTimeout (CDP). Dois tetos curtos resolvem a UX sem mascarar sincronização legítima:
  // 1) PROBE: um `getState()` (evaluate trivial, Client.js:1975) com teto próprio detecta página
  //    morta em segundos, ANTES de disparar a operação pesada;
  // 2) TETO por tentativa: a operação corre num raceStoreOp — estourou, erro ACIONÁVEL na hora
  //    (sem retry: a chamada CDP subjacente segue órfã no Chromium; repetir só empilharia outra).
  private async withStoreReady<T>(
    fn: () => Promise<T>,
    attempts = 8,
    delayMs = 1500,
    opTimeoutMs = STORE_OP_TIMEOUT_MS,
    probeTimeoutMs = STORE_PROBE_TIMEOUT_MS,
  ): Promise<T> {
    if (this.client) {
      // Estado em si não importa (o .catch cobre client ainda sem pupPage — segue para o fn(),
      // cujo erro real cai no retry abaixo); só a RESPONSIVIDADE da página interessa aqui.
      try {
        await raceStoreOp(
          this.client.getState().catch(() => null),
          probeTimeoutMs,
          `Página do WhatsApp Web não responde${this.syncHint()} — provável sincronização travada após reconexão (P-014). Recuperação automática disparada; tente novamente em ~1 min`,
        );
      } catch (e) {
        // Página presa não se recupera sozinha (evidência P-014: event loop fica preso PARA
        // SEMPRE após um getContacts tardio). Dispara o auto-heal em background e devolve o
        // erro acionável imediatamente.
        void this.healWedgedPage();
        throw e;
      }
    }
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await raceStoreOp(
          fn(),
          opTimeoutMs,
          `Operação no WhatsApp Web não respondeu${this.syncHint()} — a página pode ainda estar sincronizando. Tente novamente em instantes; se persistir, reinicie a sessão`,
        );
      } catch (e) {
        const msg = (e as Error)?.message ?? '';
        const storeNotReady =
          /undefined|getChats|getContact|Evaluation failed|Cannot read/i.test(
            msg,
          );
        if (!storeNotReady) throw e;
        lastErr = e;
        this.deps.logger.warn(
          { attempt: i + 1, attempts },
          'wwebjs: Store ainda sincronizando, aguardando…',
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw new Error(
      `WhatsApp Web ainda sincronizando (Store indisponível após ${attempts} tentativas) — tente em alguns segundos. Causa: ${(lastErr as Error)?.message ?? 'desconhecida'}`,
    );
  }

  // Contexto de sincronização para as mensagens de erro do P-014: "em 37%" = sincronizando de
  // verdade (aguarde); nada = a página nunca emitiu loading_screen nesta subida (travou antes).
  private syncHint(): string {
    return this.lastLoadingPct != null
      ? ` (sincronização vista em ${this.lastLoadingPct}%)`
      : '';
  }

  // Auto-heal do P-014: a página com event loop preso NÃO volta sozinha — um reload (F5 via CDP,
  // que age pelo processo do browser mesmo com o renderer ocupado) refaz a página, e a re-injeção
  // pós-navegação (fix do commit 1780711 — main-frame filter no framenavigated) recoloca o Store.
  // SEM QR: o pareamento persiste no perfil. Single-flight + cooldown para não flapar; disparado
  // pelo probe do withStoreReady quando a página não responde.
  private lastHealAt = 0;
  private healing = false;
  private static readonly HEAL_COOLDOWN_MS = 120_000;

  private async healWedgedPage(): Promise<void> {
    const page = this.client?.pupPage;
    if (!page || this.healing || this.stopped) return;
    const now = Date.now();
    if (now - this.lastHealAt < WWebJSEngine.HEAL_COOLDOWN_MS) return;
    this.healing = true;
    this.lastHealAt = now;
    this.deps.logger.warn(
      { sessionId: this.deps.sessionId },
      'wwebjs: página sem resposta — auto-heal via reload da página (sem QR)',
    );
    try {
      await page.reload({ waitUntil: 'load', timeout: 60_000 });
      this.lastLoadingPct = null; // sincronização recomeça — o hint volta a valer do zero
      this.deps.logger.info(
        { sessionId: this.deps.sessionId },
        'wwebjs: reload do auto-heal concluído — Store re-injetando',
      );
    } catch (e) {
      this.deps.logger.error(
        { err: (e as Error)?.message, sessionId: this.deps.sessionId },
        'wwebjs: auto-heal falhou — se persistir, reinicie a sessão',
      );
    } finally {
      this.healing = false;
    }
  }

  // ---- W7: inbox/histórico (backfill do banco a partir do store do WhatsApp Web) ----
  // Lista os chats do store (inclui conversas anteriores à conexão do gateway). Devolve o id CRU do
  // store (@c.us/@g.us/@lid) para o fetchChatHistory reusar — a resolução @lid→telefone acontece por
  // mensagem lá (com cache), evitando um evaluate por chat aqui. getChats já vem por recência.
  async listChats(limit: number): Promise<ChatSummary[]> {
    const chats = await this.withStoreReady(() => this.req().getChats());
    return chats
      .filter((c) => {
        const raw = c.id?._serialized ?? '';
        return !!raw && raw !== 'status@broadcast';
      })
      .slice(0, Math.max(0, limit))
      .map((c) => ({
        chatJid: c.id._serialized,
        name: (c.name || '').trim() || null,
        isGroup: !!c.isGroup,
        unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : 0,
        timestamp: typeof c.timestamp === 'number' ? c.timestamp : 0,
        lastText: c.lastMessage?.body || null,
      }));
  }

  // Puxa o histórico (últimas `limit`) de um chat e normaliza. fetchMessages carrega do store,
  // buscando páginas anteriores até `limit`. Sem download de mídia (só metadados) — backfill leve.
  async fetchChatHistory(
    chatJid: string,
    limit: number,
  ): Promise<HistoryMessage[]> {
    const chat = await this.withStoreReady(() =>
      this.req().getChatById(this.toChatId(chatJid)),
    );
    const msgs = await chat.fetchMessages({ limit: Math.max(1, limit) });
    const out: HistoryMessage[] = [];
    for (const msg of msgs) {
      const h = await this.toHistoryMessage(msg);
      if (h) out.push(h);
    }
    return out;
  }

  // Normaliza uma Message do store para HistoryMessage. O chatJid é o outro lado (msg.to nas
  // enviadas, msg.from nas recebidas), com merge @lid→telefone (cacheado → ~1 resolução por chat).
  private async toHistoryMessage(msg: Message): Promise<HistoryMessage | null> {
    const keyId = msg.id?._serialized ?? '';
    if (!keyId) return null;
    const raw = (msg.fromMe ? msg.to : msg.from) ?? '';
    if (!raw || raw === 'status@broadcast') return null;
    const chatJid = await this.resolveNumberJid(raw);
    const isMedia = !!msg.hasMedia;
    const type = isMedia ? mapInboundMediaType(msg.type) : 'text';
    // author = participante real numa mensagem de grupo; em 1:1 é ausente.
    const author = (msg as unknown as { author?: string }).author;
    return {
      keyId,
      chatJid,
      senderJid: msg.fromMe
        ? (this.client?.info?.wid?._serialized ?? null)
        : (author ?? chatJid),
      fromMe: !!msg.fromMe,
      type,
      text: msg.body || null,
      timestamp:
        typeof msg.timestamp === 'number'
          ? msg.timestamp
          : Math.floor(Date.now() / 1000),
      mediaType: isMedia ? type : null,
      mimetype: null,
      fileName: null,
      fileSize: null,
    };
  }

  // W7 — gestão de chat. mute sem data = silenciar por tempo indeterminado (lib); unread=false
  // marca como lido via sendSeen (o markChatUnread só marca NÃO-lido). withStoreReady cobre o RACE
  // logo após o ready. Idempotente (arquivar já arquivado é no-op no WhatsApp Web).
  async setChatFlag(
    chatJid: string,
    flag: ChatFlag,
    enabled: boolean,
  ): Promise<void> {
    const id = this.toChatId(chatJid);
    const c = this.req();
    await this.withStoreReady(async () => {
      switch (flag) {
        case 'archive':
          await (enabled ? c.archiveChat(id) : c.unarchiveChat(id));
          return;
        case 'pin':
          await (enabled ? c.pinChat(id) : c.unpinChat(id));
          return;
        case 'mute':
          await (enabled ? c.muteChat(id) : c.unmuteChat(id));
          return;
        case 'unread':
          await (enabled ? c.markChatUnread(id) : c.sendSeen(id));
          return;
      }
    });
  }

  // ---- Grupos: extração de leads (nome + número via Store oficial do WhatsApp Web) ----
  // Lista os grupos da conta (só metadados; os participantes são resolvidos sob demanda no
  // groupInfo, porque resolver nome/número de cada membro custa uma consulta ao Store).
  async listGroups(): Promise<GroupInfo[]> {
    const chats = await this.withStoreReady(() => this.req().getChats());
    return chats
      .filter((c) => c.isGroup)
      .map((c) => {
        const g = c as unknown as GroupChat;
        return {
          id: g.id._serialized,
          subject: g.name ?? '',
          owner: g.owner?._serialized ?? null,
          desc: g.description || null,
          size: g.participants?.length ?? 0,
          ...groupFlags(g),
          participants: [],
        };
      });
  }

  // Resolve o GroupChat (com o Store pronto) e valida que o id é mesmo de um grupo.
  private async getGroupChat(jid: string): Promise<GroupChat> {
    const chat = await this.withStoreReady(() =>
      this.req().getChatById(this.toGroupId(jid)),
    );
    if (!chat.isGroup) throw new Error('O id informado não é um grupo');
    return chat as unknown as GroupChat;
  }

  // Detalha um grupo com os participantes já resolvidos (telefone + nome salvo na agenda).
  async groupInfo(jid: string): Promise<GroupInfo> {
    const g = await this.getGroupChat(jid);
    const participants = await this.resolveParticipantsBatch(
      g.participants ?? [],
    );
    return {
      id: g.id._serialized,
      subject: g.name ?? '',
      owner: g.owner?._serialized ?? null,
      desc: g.description || null,
      size: g.participants?.length ?? participants.length,
      ...groupFlags(g),
      participants,
    };
  }

  // Tamanho do chunk da resolução LID→telefone em lote (1 round-trip CDP por chunk).
  private static readonly LID_BATCH = 50;

  // Resolve número + nome de TODOS os participantes — a extração de leads é a razão de existir
  // desta engine. P-014 (14/08): o `getContacts()` em lote que enriquecia nomes aqui é EXATAMENTE
  // a chamada que TRAVA o event loop da página nesta build (funciona só imediatamente após login
  // fresco — evidência: agenda 1696 ok às 00:43 UTC; qualquer chamada tardia pendura para sempre,
  // inclusive em perfil virgem). E o fallback getContactById um-a-um eram N round-trips CDP numa
  // página já doente. AMBOS REMOVIDOS: o telefone (o dado que importa) nunca veio deles — vem do
  // `p.id` (c.us), do cache LID→PN e do lote oficial `getContactLidAndPhone` (1 evaluate por 50,
  // inofensivo). Os NOMES agora vêm do diretório persistente (`deps.contacts.resolveNames`, banco
  // — populado pelo syncAddressBook pós-login, quando o getContacts é seguro). Zero CDP extra.
  private async resolveParticipantsBatch(
    list: GroupParticipant[],
  ): Promise<GroupParticipantInfo[]> {
    if (!list.length) return [];
    type Row = {
      id: string;
      role: GroupParticipantRole;
      lid: string | null;
      phone: string | null;
    };
    const rows: Row[] = [];
    for (const p of list) {
      const id = p.id._serialized;
      const role: GroupParticipantRole = p.isSuperAdmin
        ? 'superadmin'
        : p.isAdmin
          ? 'admin'
          : 'member';
      const lid = p.id.server === 'lid' || id.endsWith('@lid') ? id : null;
      let phone = p.id.server === 'c.us' ? p.id.user : null;
      if (!phone && lid) {
        const cached = this.lidToPnCache.get(lid);
        if (cached) phone = cached.replace(/\D/g, '');
      }
      rows.push({ id, role, lid, phone });
    }
    await this.resolvePendingLids(rows.filter((r) => !r.phone && r.lid));
    // Nomes do BANCO (agenda sincronizada pelo syncAddressBook) — sem tocar o Store.
    const nameKeys = rows.flatMap((r) =>
      [r.id, r.lid, r.phone].filter((k): k is string => !!k),
    );
    const names =
      (await this.deps.contacts?.resolveNames(nameKeys).catch(() => null)) ??
      new Map<string, never>();
    return rows.map((r) => {
      const known =
        names.get(r.id) ??
        (r.lid ? names.get(r.lid) : undefined) ??
        (r.phone ? names.get(r.phone) : undefined);
      const savedName = known?.name ?? null;
      const pushName = known?.pushName ?? null;
      if (r.phone || savedName || pushName) {
        this.deps.contacts?.record({
          waId: r.id,
          jid: r.phone ? `${r.phone}@s.whatsapp.net` : null,
          lid: r.lid,
          phone: r.phone,
          name: savedName,
          pushName,
          source: 'wwebjs-group',
        });
      }
      return {
        id: r.id,
        role: r.role,
        phone: r.phone,
        name: savedName ?? pushName,
      };
    });
  }

  // Resolve @lid pendentes em chunks pela via OFICIAL em lote (getContactLidAndPhone força o par
  // LID↔PN no Store para o array inteiro num único evaluate; a ordem do retorno espelha a entrada).
  // Se o lote falhar, cai no resolveLidToPhone artesanal um a um (o mecanismo pré-existente).
  // Muta `rows` no lugar e alimenta o cache LID→telefone.
  private async resolvePendingLids(
    rows: { lid: string | null; phone: string | null }[],
  ): Promise<void> {
    for (let i = 0; i < rows.length; i += WWebJSEngine.LID_BATCH) {
      const chunk = rows.slice(i, i + WWebJSEngine.LID_BATCH);
      const lids = chunk.map((r) => r.lid ?? '');
      // Runtime pode devolver lid/pn undefined (d.ts otimista) — daí o tipo frouxo + guards.
      let resolved: ({ lid?: string; pn?: string } | undefined)[] | null = null;
      try {
        resolved = await this.req().getContactLidAndPhone(lids);
      } catch (e) {
        this.deps.logger.warn(
          { err: (e as Error)?.message, count: lids.length },
          'wwebjs: lote LID→telefone falhou — resolvendo um a um',
        );
      }
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j]!;
        const lid = row.lid ?? '';
        let num: string | null = null;
        const pn = resolved?.[j]?.pn;
        if (pn?.endsWith('@c.us')) num = pn.replace(/\D/g, '');
        if (!num && !resolved) num = await this.resolveLidToPhone(lid);
        const lidNum = lid.replace(/\D/g, '');
        if (num && num !== lidNum) {
          row.phone = num;
          this.cacheLidPn(lid, `${num}@c.us`);
        }
      }
    }
  }

  private toGroupId(jid: string): string {
    return jid.includes('@') ? jid : `${jid}@g.us`;
  }
  // Cria um grupo e devolve o GroupInfo já detalhado (participantes resolvidos).
  async createGroup(
    subject: string,
    participants: string[],
  ): Promise<GroupInfo> {
    const ids = participants.map((p) => this.toChatId(p));
    const res = await this.withStoreReady(() =>
      this.req().createGroup(subject, ids),
    );
    // A lib devolve string quando falha (ex.: nenhum participante válido).
    if (typeof res === 'string') {
      throw new Error(`Falha ao criar grupo: ${res}`);
    }
    return this.groupInfo(res.gid._serialized);
  }

  async updateParticipants(
    jid: string,
    action: GroupParticipantAction,
    participants: string[],
  ): Promise<void> {
    const g = await this.getGroupChat(jid);
    const ids = participants.map((p) => this.toChatId(p));
    if (action === 'add') await g.addParticipants(ids);
    else if (action === 'remove') await g.removeParticipants(ids);
    else if (action === 'promote') await g.promoteParticipants(ids);
    else await g.demoteParticipants(ids);
  }

  async leaveGroup(jid: string): Promise<void> {
    await (await this.getGroupChat(jid)).leave();
  }

  async setGroupSubject(jid: string, subject: string): Promise<void> {
    await (await this.getGroupChat(jid)).setSubject(subject);
  }

  async setGroupDescription(jid: string, description: string): Promise<void> {
    await (await this.getGroupChat(jid)).setDescription(description);
  }

  async groupInviteCode(jid: string): Promise<string> {
    return (await this.getGroupChat(jid)).getInviteCode();
  }

  async groupRevokeInvite(jid: string): Promise<string> {
    const g = await this.getGroupChat(jid);
    // revokeInvite() da lib devolve void — buscamos o código NOVO para casar o contrato (string).
    await g.revokeInvite();
    return g.getInviteCode();
  }

  // W8 — fila de entrada do grupo (membership requests). `t` é o unix seconds do pedido.
  async groupMembershipRequests(jid: string): Promise<MembershipRequest[]> {
    const g = await this.getGroupChat(jid);
    const reqs = await g.getGroupMembershipRequests();
    return reqs.map((r) => {
      const id =
        (r.id as { _serialized?: string })?._serialized ?? String(r.id ?? '');
      const num = id.endsWith('@c.us') ? id.replace(/\D/g, '') : null;
      return {
        id,
        phone: num || null,
        requestedAt: typeof r.t === 'number' ? r.t : null,
      };
    });
  }

  // W8 — aprova/rejeita pedidos (todos, se participants vazio). `sleep` = anti-flood da lib entre
  // um requester e o próximo (default [250,500] ms) — obrigatório para não disparar flag na moderação
  // em massa. `requesterIds: null` = a lib age sobre TODA a fila.
  async groupMembershipAction(
    jid: string,
    action: MembershipAction,
    participants?: string[],
  ): Promise<void> {
    const g = await this.getGroupChat(jid);
    const requesterIds = participants?.length
      ? participants.map((p) => this.toChatId(p))
      : null;
    const opts = { requesterIds, sleep: [250, 500] as [number, number] };
    if (action === 'approve') await g.approveGroupMembershipRequests(opts);
    else await g.rejectGroupMembershipRequests(opts);
  }

  // W8 — announce (só admin envia) / restrict (só admin edita a info) do grupo.
  async setGroupSetting(
    jid: string,
    setting: GroupSettingKey,
    enabled: boolean,
  ): Promise<void> {
    const g = await this.getGroupChat(jid);
    if (setting === 'announce') await g.setMessagesAdminsOnly(enabled);
    else await g.setInfoAdminsOnly(enabled);
  }

  // W8 — foto do grupo.
  async setGroupPhoto(
    jid: string,
    image: Buffer,
    mimetype: string,
  ): Promise<void> {
    const g = await this.getGroupChat(jid);
    await g.setPicture(new MessageMedia(mimetype, image.toString('base64')));
  }

  // Verifica se cada número tem WhatsApp e devolve o JID canônico (getNumberId corrige o 9º dígito BR).
  // Sequencial de propósito: getNumberId consulta o Store (Puppeteer) — paralelizar trava o Chromium.
  async checkNumbers(numbers: string[]): Promise<ContactCheck[]> {
    const c = this.req();
    const out: ContactCheck[] = [];
    for (const n of numbers) {
      const digits = n.replace(/[^0-9]/g, '');
      const id = await this.withStoreReady(() => c.getNumberId(digits));
      out.push({ number: n, exists: !!id, jid: id?._serialized ?? null });
    }
    return out;
  }

  async profilePicture(jid: string): Promise<string | null> {
    try {
      const url = await this.withStoreReady(() =>
        this.req().getProfilePicUrl(this.toChatId(jid)),
      );
      return url || null;
    } catch {
      return null; // sem foto ou perfil privado
    }
  }

  async setBlock(jid: string, action: 'block' | 'unblock'): Promise<void> {
    const contact = await this.withStoreReady(() =>
      this.req().getContactById(this.toChatId(jid)),
    );
    if (action === 'block') await contact.block();
    else await contact.unblock();
  }
  // wwebjs suporta a agenda nativamente (WAWebSaveContactAction). phoneNumber = só dígitos (país+DDD).
  async saveContact(jid: string, input: SaveContactInput): Promise<void> {
    const phone = jid.replace(/[^0-9]/g, '');
    await this.withStoreReady(() =>
      this.req().saveOrEditAddressbookContact(
        phone,
        input.firstName,
        input.lastName ?? '',
        input.syncToPhone ?? false,
      ),
    );
  }
  async removeContact(jid: string): Promise<void> {
    const phone = jid.replace(/[^0-9]/g, '');
    await this.withStoreReady(() => this.req().deleteAddressbookContact(phone));
  }
  // ---- Canais (newsletter) — beta ----
  async createChannel(
    name: string,
    description?: string,
  ): Promise<ChannelInfo> {
    const res = await this.withStoreReady(() =>
      this.req().createChannel(name, description ? { description } : {}),
    );
    if (typeof res === 'string') {
      throw new Error(`Falha ao criar canal: ${res}`);
    }
    return {
      id: res.nid._serialized,
      name: res.title,
      description: description ?? null,
      subscribers: null, // recém-criado
    };
  }

  async channelInfo(jid: string): Promise<ChannelInfo> {
    const chat = await this.withStoreReady(() => this.req().getChatById(jid));
    const ch = chat as unknown as Channel;
    if (!ch.isChannel) throw new Error('O id informado não é um canal');
    return {
      id: ch.id._serialized,
      name: ch.name || '',
      description: ch.description || null,
      // A lib só expõe getSubscribers() (dos SEUS contatos), não a contagem total — deixamos null.
      subscribers: null,
    };
  }

  async followChannel(jid: string): Promise<void> {
    await this.withStoreReady(() => this.req().subscribeToChannel(jid));
  }

  async unfollowChannel(jid: string): Promise<void> {
    await this.withStoreReady(() => this.req().unsubscribeFromChannel(jid));
  }
}
