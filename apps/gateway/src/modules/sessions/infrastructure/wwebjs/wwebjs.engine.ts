import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import type {
  Message,
  GroupChat,
  GroupParticipant,
  Contact,
} from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import type { BaileysEngineDeps } from '../baileys/baileys.engine';
import type { ContactRecord } from '../../../../infra/directory/contact-directory.service';
import type {
  ChannelInfo,
  ContactCheck,
  AckStatus,
  GroupInfo,
  GroupParticipantInfo,
  GroupParticipantRole,
  IEngine,
  MessageSource,
  PresenceState,
  SaveContactInput,
  SendMediaInput,
  SendOptions,
} from '../../application/engine.port';
import type { SessionStatus } from '../../domain/session-status';

// Caminho do Chrome do sistema (no WSL já existe /usr/bin/google-chrome-stable). Configurável por env.
const CHROME_PATH =
  process.env.WWEBJS_CHROME_PATH ?? '/usr/bin/google-chrome-stable';
const AUTH_PATH = process.env.WWEBJS_DATA_PATH ?? 'auth/wwebjs';

// Versão do WhatsApp Web a FIXAR. Sem fixar, o wwebjs baixa a versão "ao vivo" do web.whatsapp.com a
// cada conexão e a renegocia (é o "fica atualizando muito tempo") — e uma build ruim do WhatsApp Web
// quebra getChats/getContacts (o wwebjs depende do Store interno). Fixar acelera e estabiliza.
// Fonte: wppconnect-team/wa-version. ATENÇÃO: a Meta expira versões antigas (~2 meses) → revisar o
// default periodicamente, ou setar WWEBJS_WEB_VERSION. Use 'live' para não fixar (comportamento antigo).
const WEB_VERSION = process.env.WWEBJS_WEB_VERSION ?? '2.3000.1042271047-alpha';
const PIN_WEB_VERSION = !!WEB_VERSION && WEB_VERSION !== 'live';
const WEB_VERSION_REMOTE =
  'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html';
// UA alinhado ao Chromium real (Linux/146). O default do wwebjs é Chrome/101 (2022), que pode disparar
// o aviso de "navegador desatualizado" do WhatsApp Web. Configurável por env.
const USER_AGENT =
  process.env.WWEBJS_USER_AGENT ??
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

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
  // keyId das mensagens enviadas PELO painel (sendText/sendMedia) — para o handler message_create
  // não duplicá-las (já são emitidas no envio). Sobra capturar as enviadas pelo próprio celular.
  private readonly sentByPanel = new Set<string>();
  // Mutex de ciclo de vida: serializa start/stop/logout da MESMA sessão. Sem isto, um restart
  // (stop→start) ou cliques/polling repetidos podem lançar 2 Chromium no mesmo userDataDir — entre o
  // `puppeteer.launch` (whatsapp-web.js Client.js:462) e o `this.pupBrowser = browser` (Client.js:477)
  // há uma janela em que `destroy()` (Client.js:1277, olha `this.pupBrowser`) NÃO enxerga o browser, que
  // fica órfão segurando o ProcessSingleton do perfil → "browser already running" (puppeteer
  // BrowserLauncher.js:175). Serializar fecha essa janela: nunca há dois ciclos concorrentes.
  private lifecycle: Promise<unknown> = Promise.resolve();

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
    extra?: { meJid?: string | null; mePushName?: string | null; error?: string | null },
  ): void {
    this.status = status;
    this.deps.onEvent('session.status', { status, ...extra });
  }

  start(): Promise<void> {
    return this.serialize(() => this.doStart());
  }

  private async doStart(): Promise<void> {
    if (this.client) return;
    this.stopped = false;

    // Proxy atribuído à sessão (se houver): aplicado ao Chromium via --proxy-server, com a auth nativa
    // do wwebjs (proxyAuthentication). Sem isto, a engine browser ignorava o proxy (só o Baileys usava).
    const proxy = (await this.deps.resolveProxyConfig?.()) ?? null;
    if (proxy) {
      this.deps.logger.info(
        { server: proxy.server, auth: !!proxy.username },
        'wwebjs: usando proxy',
      );
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: this.deps.sessionId,
        dataPath: AUTH_PATH,
      }),
      // Fixa a versão do WhatsApp Web (acelera/estabiliza o carregamento e evita quebra do Store).
      ...(PIN_WEB_VERSION
        ? {
            webVersion: WEB_VERSION,
            webVersionCache: {
              type: 'remote' as const,
              remotePath: WEB_VERSION_REMOTE,
            },
          }
        : {}),
      userAgent: USER_AGENT,
      // Credenciais do proxy (o Chromium não aceita user:pass na URL do --proxy-server; o wwebjs faz
      // o page.authenticate por baixo).
      ...(proxy?.username && proxy.password
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
          ...(proxy ? [`--proxy-server=${proxy.server}`] : []),
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
    this.setStatus('STARTING');

    // Progresso da sincronização offline — torna visível o "demora muito" (em vez de ficar cego no
    // STARTING). Útil para diagnosticar carregamento lento (ex.: via proxy).
    client.on('loading_screen', (percent: number, message: string) => {
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
      // Puxa a agenda (nomes salvos) para o diretório. withStoreReady cobre o Store ainda injetando.
      setTimeout(() => void this.syncAddressBook(), 3000);
    });
    client.on('auth_failure', (m: string) =>
      this.setStatus('FAILED', { error: `auth_failure: ${m}` }),
    );
    client.on('disconnected', (reason: unknown) => {
      this.setStatus(this.stopped ? 'STOPPED' : 'DEGRADED', {
        error: this.stopped ? null : `desconectado: ${String(reason)}`,
      });
    });
    // message_create capta recebidas E enviadas de QUALQUER device (inclusive do celular). As enviadas
    // pelo painel já são emitidas no sendText/sendMedia (com telefone + metadados) e deduplicadas aqui
    // via sentByPanel; resta capturar as enviadas pelo celular. O @lid é resolvido para telefone (merge).
    client.on('message_create', (msg: Message) => void this.onMessageCreate(msg));
    // G3 — ACK de entrega/leitura. O wwebjs entrega o ack como número (MessageAck).
    client.on('message_ack', (msg: Message, ack: number) =>
      this.onMessageAck(msg, ack),
    );

    // Aguarda o initialize (já serializado pelo mutex de ciclo de vida) para garantir cleanup
    // determinístico: quando o `goto` falha (proxy), `this.pupBrowser` já foi setado (Client.js:477)
    // e o `destroy()` fecha o Chromium — não fica órfão. A falha NÃO propaga como HTTP 500: vira
    // status FAILED com mensagem acionável; o painel acompanha via status/QR.
    try {
      await client.initialize();
    } catch (e) {
      await this.handleInitFailure(e);
    }
  }

  // Trata falha do client.initialize() (Puppeteer/WhatsApp Web). Em vez de propagar (500), registra,
  // limpa o client e marca a sessão como FAILED com um diagnóstico — com destaque para erros de proxy
  // (credencial rejeitada no CONNECT do Chromium) e para o lock de perfil órfão.
  private async handleInitFailure(e: unknown): Promise<void> {
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
    if (this.stopped) return; // stop()/logout() pediu parada — não sobrescreve o STOPPED
    const error = isProxyAuth
      ? `Proxy rejeitou a autenticação (ERR_INVALID_AUTH_CREDENTIALS): credencial do proxy desta sessão está incorreta. Sincronize o pool (Webshare) ou troque/remova o proxy.`
      : isProxyTunnel
        ? `Não foi possível conectar pelo proxy (${msg.split(' at ')[0]}): proxy indisponível ou exigindo auth. Troque/remova o proxy desta sessão.`
        : isBrowserLock
          ? `Instância anterior do navegador ainda ativa para esta sessão (perfil bloqueado). Pare a sessão e tente novamente; se persistir, reinicie o serviço.`
          : `Falha ao iniciar a sessão: ${msg}`;
    this.setStatus('FAILED', { error });
  }

  stop(): Promise<void> {
    return this.serialize(() => this.doStop());
  }

  private async doStop(): Promise<void> {
    this.stopped = true;
    try {
      await this.client?.destroy();
    } catch {
      /* noop */
    }
    this.client = null;
    this.setStatus('STOPPED');
  }

  logout(): Promise<void> {
    return this.serialize(() => this.doLogout());
  }

  private async doLogout(): Promise<void> {
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
    opts?: SendOptions,
  ): Promise<{ keyId: string; jid: string }> {
    const c = this.req();
    const jid = this.toChatId(to);
    const sent = await c.sendMessage(jid, text);
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
    const sent = await c.sendMessage(jid, media, {
      caption: input.caption ?? undefined,
      sendAudioAsVoice: input.ptt,
    });
    const keyId = sent.id?._serialized ?? '';
    if (keyId) this.rememberPanel(keyId);
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
      timestamp: Math.floor(Date.now() / 1000),
    });
    return { keyId, jid };
  }

  async sendPresence(to: string, state: PresenceState): Promise<void> {
    const chat = await this.req().getChatById(this.toChatId(to));
    if (state === 'composing') await chat.sendStateTyping();
    else if (state === 'recording') await chat.sendStateRecording();
    // paused/available/unavailable: o wwebjs não tem presença global por chat → limpa o estado.
    else await chat.clearState();
  }

  // G8 — wwebjs marca o CHAT como visto (não há read por msgId); msgId é ignorado.
  async markRead(chatJid: string, _msgId: string): Promise<void> {
    const chat = await this.req().getChatById(this.toChatId(chatJid));
    await chat.sendSeen();
  }

  // Handler do message_create: capta recebidas E enviadas de qualquer device. As enviadas pelo painel
  // já foram emitidas no sendText/sendMedia (sentByPanel) — aqui são ignoradas após uma janela curta
  // (o keyId só é conhecido quando o sendMessage resolve). Resta capturar as enviadas pelo CELULAR.
  // O "chat" é o outro lado (msg.to nas enviadas, msg.from nas recebidas), com merge @lid→telefone.
  private async onMessageCreate(msg: Message): Promise<void> {
    try {
      const keyId = msg.id?._serialized ?? '';
      if (msg.fromMe) {
        await new Promise((r) => setTimeout(r, 3000));
        if (this.sentByPanel.has(keyId)) return; // enviada pelo painel: já emitida
      }
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
        // G2: as enviadas pelo painel já saíram filtradas (sentByPanel, acima). Um fromMe aqui
        // foi digitado no celular = phone; recebida do contato = sem origem nossa (null).
        source: (msg.fromMe ? 'phone' : null) as MessageSource | null,
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

  // Sincroniza a AGENDA do WhatsApp Web para o diretório: getContacts() traz o nome SALVO (name) e o
  // público (pushname) de cada contato — é o que faltava para o diretório mostrar nomes (antes só vinham
  // telefones de mensagens recebidas, sem nome). Roda no 'ready' (fire-and-forget).
  private async syncAddressBook(): Promise<void> {
    try {
      const contacts = await this.withStoreReady(() => this.req().getContacts());
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

  private nope(op: string): never {
    throw new Error(`${op} ainda não suportado na engine WWEBJS (use BAILEYS)`);
  }

  // Executa uma operação que depende do Store interno do WhatsApp Web, tolerando o RACE do wwebjs
  // 1.34.7: logo após o `ready` o Store (window.WWebJS) pode ainda não estar injetado, e getChats/
  // getChatById estouram "Cannot read properties of undefined (reading 'getChats')". Em vez de falhar,
  // aguarda e tenta de novo (o Store fica pronto em segundos). Ver issue wwebjs #3505.
  private async withStoreReady<T>(
    fn: () => Promise<T>,
    attempts = 8,
    delayMs = 1500,
  ): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
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
          announce: false,
          restrict: false,
          participants: [],
        };
      });
  }

  // Detalha um grupo com os participantes já resolvidos (telefone + nome salvo na agenda).
  async groupInfo(jid: string): Promise<GroupInfo> {
    const chat = await this.withStoreReady(() =>
      this.req().getChatById(this.toGroupId(jid)),
    );
    if (!chat.isGroup) throw new Error('O id informado não é um grupo');
    const g = chat as unknown as GroupChat;
    const participants: GroupParticipantInfo[] = [];
    // Sequencial de propósito: paralelizar dezenas de consultas ao Puppeteer trava o Chromium.
    for (const p of g.participants ?? []) {
      participants.push(await this.resolveGroupParticipant(p));
    }
    return {
      id: g.id._serialized,
      subject: g.name ?? '',
      owner: g.owner?._serialized ?? null,
      desc: g.description || null,
      size: g.participants?.length ?? participants.length,
      announce: false,
      restrict: false,
      participants,
    };
  }

  // Resolve número + nome de um participante via Store oficial — a força do motor browser.
  // `Contact.name` é o nome salvo na SUA agenda; `pushname` é o nome público. O @lid é
  // resolvido para telefone (mesmo mecanismo do merge). Acumula no diretório como lead.
  private async resolveGroupParticipant(
    p: GroupParticipant,
  ): Promise<GroupParticipantInfo> {
    const id = p.id._serialized;
    const role: GroupParticipantRole = p.isSuperAdmin
      ? 'superadmin'
      : p.isAdmin
        ? 'admin'
        : 'member';
    const lid = p.id.server === 'lid' || id.endsWith('@lid') ? id : null;
    let phone = p.id.server === 'c.us' ? p.id.user : null;
    let savedName: string | null = null;
    let pushName: string | null = null;
    try {
      const contact = await this.req().getContactById(id);
      savedName = (contact.name || '').trim() || null;
      pushName = (contact.pushname || '').trim() || null;
      if (!phone) {
        const num = (contact.number || '').replace(/\D/g, '');
        const idNum = p.id.user.replace(/\D/g, '');
        // contact.number de um @lid às vezes devolve o próprio LID — só aceita se diferir.
        if (num && num !== idNum) phone = num;
      }
    } catch {
      /* contato pode não ser resolvível pelo Store — segue com o que já temos */
    }
    if (!phone && lid) phone = await this.resolveLidToPhone(lid);
    const name = savedName ?? pushName;
    if (phone || name) {
      this.deps.contacts?.record({
        waId: id,
        jid: phone ? `${phone}@s.whatsapp.net` : null,
        lid,
        phone,
        name: savedName,
        pushName,
        source: 'wwebjs-group',
      });
    }
    return { id, role, phone, name };
  }

  private toGroupId(jid: string): string {
    return jid.includes('@') ? jid : `${jid}@g.us`;
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
