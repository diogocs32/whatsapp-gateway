// Contratos compartilhados entre o gateway (backend) e o dashboard (frontend).
// Fonte única de verdade para os tipos que cruzam a fronteira HTTP/WS.

export type Role = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export type HealthStatus = 'ok' | 'degraded' | 'unhealthy';

export interface HealthResponse {
  status: HealthStatus;
  uptimeSeconds: number;
  checks: {
    database: boolean;
    redis: boolean;
    heapUsedPct: number; // pressão do heap V8 (used_heap_size / heap_size_limit)
    memoryUsedPct: number; // RAM real do container (cgroup) ou heap se não houver limite
    rssBytes: number;
  };
  version: string;
  timestamp: string;
}

// Observability (F7) — resumo JSON para a tela "Logs & saúde".
export interface ObservabilitySummary {
  uptimeSeconds: number;
  rssBytes: number;
  heapUsedBytes: number;
  heapUsedPct: number;
  heapLimitBytes: number;
  memoryUsedPct: number; // RAM real do container (cgroup) ou heap se não houver limite
  containerLimitBytes: number | null;
  sessions: Record<string, number>;
  messages: { out: number; in: number };
}

export interface TimelineEvent {
  id: string;
  type: string;
  status: string | null;
  detail: string | null;
  at: string;
}

// Envelope padronizado de evento (ver blueprint §10) — usado a partir da F2.
export interface EventEnvelope<P = unknown> {
  id: string;
  timestamp: number;
  event: string;
  session: string | null;
  payload: P;
  engine: 'baileys' | 'wwebjs' | null;
}

// ---- Sessões (F1) ----
export type Engine = 'BAILEYS' | 'WWEBJS';

export type SessionStatus =
  | 'STOPPED'
  | 'STARTING'
  | 'SCAN_QR_CODE'
  | 'PAIRING_CODE'
  | 'WORKING'
  | 'FAILED'
  | 'DEGRADED';

export type ConnectionMode = 'qr' | 'pairing';

export interface SessionDto {
  id: string;
  name: string;
  engine: Engine;
  status: SessionStatus;
  meJid: string | null;
  mePushName: string | null;
  // E27 (aditivo): último número que esteve conectado — o `meJid` zera quando o celular desconecta
  // (401), este não. Serve para achar a sessão caída pelo número e pré-preencher o link de conexão.
  lastMeJid: string | null;
  phoneNumber: string | null;
  autostart: boolean;
  lastError: string | null;
  // E9: diagnóstico estruturado aditivo. `lastError` textual permanece para clientes antigos.
  lastErrorDetails: SessionErrorDetails | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionErrorDetails {
  code: number | null; // código bruto de Boom.output.statusCode (405 inclusive)
  reason: string | null; // motivo bruto do Baileys, limitado a 500 caracteres
}

// E20: medições informativas; não participam do gate de envio.
export interface NewRecipientsMetricDto {
  sessionId: string;
  windowDays: 30;
  newRecipients: number;
  responded: number;
  withoutResponse: number;
  unresolvedLidRecipients: number;
  computedAt: string;
  windowStartedAt: string;
  basis: 'first-observed-outbound';
  coverage: 'retained-history';
}

export interface ContactCheckQuotaDto {
  enabled: boolean;
  mode: 'observe';
  limit: number;
  windowSeconds: number;
  available: boolean;
  used: number | null;
  remaining: number | null;
  exceeded: boolean | null;
  retryAfterSeconds: number | null;
}

export interface SessionAccountInventoryDto {
  sessions: {
    sessionId: string;
    name: string;
    engine: Engine;
    accountType: 'PERSONAL' | 'BUSINESS' | 'UNKNOWN';
    platform: string | null;
    source: 'baileys.creds.platform' | 'unavailable';
  }[];
  totals: { PERSONAL: number; BUSINESS: number; UNKNOWN: number };
}

// Webhook `session.client_too_old` (E9). O status público também vira FAILED.
export interface SessionClientTooOldEventPayload extends SessionErrorDetails {
  code: 405;
}

// GET/PATCH /api/sessions/:id/config. O override de build vale só para WWEBJS e é aplicado
// no próximo start da sessão; null herda a env WWEBJS_WEB_VERSION (ou o default do gateway).
export interface SessionConfigDto {
  capBase: number;
  warmupCurve: number[];
  regiaoDdd: string | null;
  modo: 'cold_ok' | 'inbound_only' | 'manual_first';
  janelaInicio: number;
  janelaFim: number;
  timezone: string;
  device: Record<string, unknown> | null;
  wwebjsWebVersion: string | null;
  cap_base: number;
  cap_atual: number;
}

export interface UpdateSessionConfigRequest {
  capBase?: number;
  warmupCurve?: number[];
  regiaoDdd?: string | null;
  modo?: SessionConfigDto['modo'];
  janelaInicio?: number;
  janelaFim?: number;
  timezone?: string;
  device?: Record<string, unknown>;
  wwebjsWebVersion?: string | null;
}

export interface CreateSessionRequest {
  name: string;
  engine?: Engine;
  mode?: ConnectionMode;
  phoneNumber?: string;
  autostart?: boolean;
  // D-008 (ADITIVO): id de um proxy LIVRE (GET /api/proxies/available) — a sessão nasce com
  // atribuição SINGLE/STICKY a ele. Ausente/undefined = sem proxy (comportamento anterior).
  proxyId?: string;
}

export interface QrResponse {
  status: SessionStatus;
  qr: string | null; // data URL base64 (image/png) ou null
  // Aditivo (09/2026): código de pareamento CORRENTE quando status = PAIRING_CODE — a engine
  // renova a cada ~3 min e o valor não vai mais para o log (WA-18).
  pairingCode?: string;
}

export interface PairingCodeResponse {
  code: string;
}

// ---- Link público de conexão por QR (E27 · P-086 · D-037) ----
// O operador (login do painel, OPERATOR+) cria um link temporário para outra pessoa conectar a
// sessão lendo o QR de outra tela. Só sessões BAILEYS nesta versão. O token aparece UMA vez e vai no
// FRAGMENTO da URL do painel (`/conectar#<token>`); a página o envia em `Authorization: Bearer`.
export type ConnectLinkState =
  | 'ACTIVE'
  | 'CONNECTED' // conectou pelo link há até 15 min (depois vira USED)
  | 'USED'
  | 'REVOKED'
  | 'EXPIRED';

export type ConnectLinkRevokedReason =
  | 'MANUAL'
  | 'REPLACED' // outro link foi criado para a mesma sessão
  | 'SESSION_STOPPED' // o operador parou/deslogou a sessão
  | 'WRONG_NUMBER'; // leram o QR com um WhatsApp diferente do número esperado

export interface ConnectLinkDto {
  id: string;
  sessionId: string;
  state: ConnectLinkState;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  expectedPhone: string | null; // só dígitos; null = qualquer número aceito
  lastSeenAt: string | null; // última vez que a página foi aberta (gravado no máx. 1×/min)
  newQrCount: number;
  newQrMax: number;
  consumedAt: string | null;
  revokedAt: string | null;
  revokedReason: ConnectLinkRevokedReason | null;
}

// POST /api/sessions/:id/connect-link
export interface CreateConnectLinkRequest {
  ttlMinutes?: number; // 10..4320 (72 h); padrão 1440 (24 h)
  expectedPhone?: string | null; // número que deve conectar (DDI+DDD+número); ausente = qualquer um
}

export interface ConnectLinkCreatedResponse {
  link: ConnectLinkDto;
  token: string; // mostrado só nesta resposta
  path: string; // '/conectar#<token>' — prefixar com a origem do painel
}

// GET /api/sessions/:id/connect-link — o link mais recente da sessão (ativo ou não).
export interface ConnectLinkCurrentResponse {
  link: ConnectLinkDto | null;
}

// DELETE /api/sessions/:id/connect-link
export interface ConnectLinkRevokeResponse {
  ok: true;
  revoked: number; // 0 = não havia link ativo
}

// Fase da página pública, calculada no servidor a partir do estado VIVO da engine.
export type PublicConnectPhase =
  | 'QR' // QR válido agora
  | 'PREPARING' // gerando/renovando o QR ou finalizando uma leitura — aguardar
  | 'IDLE' // sem QR: a pessoa pode pedir um (POST /api/public/connect/new-qr)
  | 'PAIRING' // conexão por código de pareamento em andamento
  | 'UNAVAILABLE'; // precisa de quem enviou o link (falha, login salvo, engine não suportada)

export interface PublicConnectNewQrState {
  available: boolean;
  remaining: number;
  max: number;
  retryAfterSeconds: number; // 0 = pode pedir já
}

// GET /api/public/connect (Authorization: Bearer <token do link>)
export type PublicConnectResponse =
  | {
      state: 'ACTIVE';
      phase: PublicConnectPhase;
      qr: string | null; // data URL PNG só quando phase = 'QR'
      expiresAt: string;
      expectedPhoneHint: string | null; // 2 últimos dígitos do número esperado
      newQr: PublicConnectNewQrState;
    }
  | { state: 'CONNECTED'; connectedAt: string };

// POST /api/public/connect/new-qr
export interface PublicConnectNewQrResponse {
  ok: true;
  newQr: PublicConnectNewQrState;
}

// `code` dos erros das rotas de link (corpo `{statusCode, error, code, message}`). O gateway tem a
// própria const (CommonJS não importa valor deste pacote); esta lista é só para o painel.
export const CONNECT_LINK_ERROR_CODES = [
  'CONNECT_LINK_NOT_FOUND', // 404: token ausente/inválido/desconhecido
  'CONNECT_LINK_USED', // 410
  'CONNECT_LINK_REVOKED', // 410
  'CONNECT_LINK_EXPIRED', // 410
  'CONNECT_LINK_WRONG_NUMBER', // 410: conectaram outro número; a conexão foi desfeita
  'CONNECT_LINK_SESSION_WORKING', // 409 (criar)
  'CONNECT_LINK_SESSION_PAIRED', // 409 (criar): sessão com login salvo — use Reiniciar
  'CONNECT_LINK_ENGINE_UNSUPPORTED', // 409 (criar): só Baileys nesta versão
  'CONNECT_LINK_NEW_QR_UNAVAILABLE', // 409: fase atual não permite pedir QR
  'CONNECT_LINK_NEW_QR_LIMIT', // 409: tentativas do link esgotadas
  'CONNECT_LINK_NEW_QR_COOLDOWN', // 429 com retryAfterSeconds
  'CONNECT_LINK_BUSY', // 409: outra operação na sessão em andamento
  'CONNECT_LINK_NEW_QR_FAILED', // 503
] as const;
export type ConnectLinkErrorCode = (typeof CONNECT_LINK_ERROR_CODES)[number];

// ---- Mensagens (F2) ----
// `type` da mensagem: text | image | video | audio | document | sticker | location | contact | poll |
// event | group_invite | poll_vote (só Baileys: voto do contato, cifrado → text null; conta no
// reply-rate) | other (mensagem visível sem cartão próprio — `text` traz um resumo legível quando
// houver, senão null). Fonte única: apps/gateway/src/modules/sessions/infrastructure/
// message-content.ts. Reação NÃO é mensagem — vem em `reactions` da mensagem-alvo (INTEGRACAO §3.2).

// P-066 (E22): reação a uma mensagem, como o WhatsApp mostra no balão (uma por pessoa).
export interface MessageReactionDto {
  emoji: string;
  senderJid: string | null; // quem reagiu (best-effort; em grupo, o participante)
  fromMe: boolean; // a reação é nossa (API ou celular)
  timestamp: string;
}

export interface MessageDto {
  id: string;
  sessionId: string;
  chatJid: string;
  // Quem mandou. 1:1 = o contato (= chatJid); fromMe = a conta da sessão. GRUPO (E23 · P-074):
  // o PARTICIPANTE que escreveu — telefone quando conhecido (@s.whatsapp.net no Baileys, @c.us no
  // WWEBJS), senão @lid. Linhas de grupo gravadas AO VIVO antes da E23 trazem o jid do GRUPO; as
  // importadas pelo /sync do WWEBJS já traziam o autor cru (pode ser @lid) — a mesma pessoa pode
  // aparecer com @lid nas linhas antigas e com telefone nas novas.
  senderJid: string | null;
  fromMe: boolean;
  type: string;
  text: string | null;
  status: string | null;
  timestamp: string;
  // E23 (P-074, aditivo — só GET /messages e /search, não vai no webhook): nome de quem mandou uma
  // mensagem RECEBIDA em GRUPO (agenda > pushName), null fora de grupo ou quando desconhecido.
  senderName?: string | null;
  // Campos que o GET /messages JÁ devolve e o DTO não declarava (drift corrigido em 15/09/2026,
  // aditivo): `keyId` é a chave real do WhatsApp (CP-149 — markRead e download de mídia aceitam);
  // `source` diz se um fromMe saiu pela API ou pelo CELULAR ('phone'); `isCold` é a marca G1.
  keyId?: string;
  source?: string | null;
  isCold?: boolean;
  // Mídia (F4) — presentes quando type é image|video|audio|document|sticker.
  mediaType?: string | null;
  mimetype?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mediaUrl?: string | null; // URL pré-assinada temporária para exibir/baixar
  // P-066 (E22, aditivo): selo "Encaminhada" (forwardingScore = quantas vezes já foi encaminhada;
  // o WhatsApp mostra "Encaminhada com frequência" a partir de 5) e reações vivas da mensagem.
  isForwarded?: boolean;
  forwardingScore?: number | null;
  reactions?: MessageReactionDto[];
}

// Resumo de conversa p/ a lista da inbox (1 por chatJid). Derivado das mensagens,
// com nome/foto do contato quando há match.
export interface ConversationDto {
  chatJid: string;
  name: string | null; // nome do contato (agenda/verificado/pushName) ou null
  imgUrl: string | null;
  lastText: string | null; // texto (ou legenda) da última msg; null sem texto — use lastType p/ rótulo
  lastType: string; // mesmo domínio do MessageDto.type
  lastFromMe: boolean;
  lastTimestamp: string;
}

// ---- Caixa única de triagem (página Atendimento) ----
// Visão AGREGADA de todos os aparelhos, sem escolher sessão. Só conversa 1:1 (grupo, lista de
// transmissão e canal ficam fora). O semáforo é derivado das mensagens — não há flag de "lido":
//   pending  🔴 a última mensagem é do contato → precisa de resposta humana
//   answered 🟢 a última mensagem é minha (inclusive respondida no CELULAR, lastSource='phone')
//   ignored  🟡 marcado à mão como "não preciso responder"
// Regra de ouro: mensagem NOVA de entrada devolve a conversa para `pending`, estivesse 🟡 ou 🟢.
export type InboxTriageStatus = 'pending' | 'answered' | 'ignored';

export interface InboxConversationDto {
  sessionId: string;
  sessionName: string; // nome do aparelho/sessão (etiqueta da linha)
  engine: string; // BAILEYS | WWEBJS
  chatJid: string;
  name: string | null;
  phone: string | null;
  imgUrl: string | null;
  lastText: string | null; // texto ou legenda; null sem texto — use lastType para o rótulo
  lastType: string;
  lastFromMe: boolean;
  lastSource: string | null; // 'phone' = respondi no aparelho · 'api' = pelo gateway/painel
  lastTimestamp: string;
  lastInboundKeyId: string | null; // âncora do amarelo (a entrada que está na tela)
  lastInboundTimestamp: string | null;
  pendingInbound: number; // entradas ainda não respondidas (0 quando respondido)
  status: InboxTriageStatus;
}

export interface InboxCounts {
  pending: number;
  answered: number;
  ignored: number;
  total: number;
}

export interface InboxConversationsResponse {
  counts: InboxCounts; // contagem ANTES do filtro de status (o painel mostra o total real)
  conversations: InboxConversationDto[];
}

// Uma linha do fluxo cronológico ("todas as mensagens em sequência", todos os aparelhos juntos).
export interface InboxFeedItemDto {
  id: string;
  keyId: string;
  sessionId: string;
  sessionName: string;
  chatJid: string;
  name: string | null;
  fromMe: boolean;
  source: string | null;
  type: string;
  text: string | null;
  timestamp: string;
  // Aditivos (E22): `status` = último ACK (sent|delivered|read; null sem recibo — e sempre null em
  // GRUPO no Baileys). Em ENTRADA (fromMe:false) pode vir `read` = lida no celular do operador →
  // tique ✓/✓✓ só em fromMe:true (P-072, só exibição). Selo "Encaminhada" (P-066).
  status?: string | null;
  isForwarded?: boolean;
  forwardingScore?: number | null;
}

// Triagem manual. `ignored` = amarelo (ancorado em `keyId`, quando informado: se chegou entrada
// mais nova que a vista na tela, a conversa segue vermelha). `pending` = desmarca (volta ao
// vermelho). Respondido (verde) NÃO se marca à mão — é consequência de ter respondido.
export interface InboxTriageRequest {
  chatJid: string;
  state: 'ignored' | 'pending';
  keyId?: string;
}

export interface InboxTriageResponse {
  sessionId: string;
  chatJid: string;
  status: InboxTriageStatus;
}

export interface SendTextRequest {
  to: string; // número (E.164 sem +) ou JID completo
  text: string;
  mentions?: string[]; // números/JIDs a mencionar; validação permanece na rota
}

// POST /api/sessions/:s/messages/:msgId/reaction — string vazia remove a reação.
export interface SendReactionRequest {
  emoji: string;
}

export interface SendTextResponse {
  id: string;
  to: string;
}

// ---- Encaminhar (P-068 · E24, aditivo) — POST /api/sessions/:s/messages/:msgId/forward ----
// `msgId` = id interno (GET /messages) ou keyId (webhook) de uma mensagem DA MESMA sessão.
// Até 5 destinos (só 1 se a original já é "encaminhada com frequência", forwardingScore ≥ 5).
// Destino sem conversa na sessão (nenhuma mensagem recebida dele, no número exato) vira cold à
// força (trava 423); `cold: true` só aumenta. `idempotencyKey` vale para o LOTE (a mesma chave com outra mensagem ou
// outro conjunto de destinos → 409); cada destino usa `<idempotencyKey>:<destino>` (vem em
// `results[i].idempotencyKey` e no webhook do eco).
export interface ForwardMessageRequest {
  to: string[]; // números (DDI+DDD+número), jid de contato, grupo (@g.us) ou @lid
  cold?: boolean;
  idempotencyKey?: string;
}

export interface ForwardResultDto {
  target: string; // o destino como veio em `to[i]`
  to: string | null; // jid usado no envio (null quando não saiu)
  ok: boolean;
  id: string | null; // keyId da cópia (null: não saiu, ou WWEBJS sem eco a tempo)
  deduped: boolean; // repetição com a mesma idempotencyKey (nada reenviado)
  cold: boolean; // cold efetivo (pedido ou destino sem conversa)
  idempotencyKey: string | null; // chave POR DESTINO
  // Selo que saiu: original de terceiro = score + 1; nossa = sem selo (ou o mesmo contador, se já era
  // encaminhada — o app não soma). Ausentes em item `deduped` e quando `confirmed:false`.
  isForwarded?: boolean;
  forwardingScore?: number | null;
  confirmed?: boolean; // false = WWEBJS encaminhou mas o id da cópia não chegou a tempo
  status?: number; // erro do item: 400 | 409 | 423
  code?: string; // FORWARD_UNSUPPORTED | FORWARD_SOURCE_UNAVAILABLE | FORWARD_LIMIT | SESSION_QUARANTINED
  error?: string;
}

export interface ForwardMessageResponse {
  results: ForwardResultDto[];
}

// ---- Webhooks (F2b) ----
export interface WebhookDto {
  id: string;
  sessionId: string | null;
  url: string;
  events: string[];
  hasSecret: boolean;
  enabled: boolean;
  maxAttempts: number;
  createdAt: string;
}

export interface CreateWebhookRequest {
  sessionId?: string | null;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  maxAttempts?: number;
}

// E8/P-048: alerta aditivo `session.restricted`. `pausedUntil` é sempre o prazo efetivo do
// gateway; `timeEnforcementEnds` só vem quando o RPC confirmou esse campo.
// A notificação da rc14 pode fabricar +60 s, então seu prazo é `temporary` até o RPC.
// O estado G5 da sessão não vira `banida` por este evento.
export interface SessionRestrictedPayload {
  signal: '463' | 'reachoutTimeLock' | 'message-capping';
  pausedUntil: string;
  timeEnforcementEnds: string | null;
  source: 'timeEnforcementEnds' | 'cycle_end_timestamp' | 'temporary';
  enforcementType: string | null;
}

// `message.ack` (E8): ERROR 463/479 passa a persistir como `error`; o painel não mostra tique.
export type MessageAckStatus = 'sent' | 'delivered' | 'read' | 'error';
export interface MessageAckEventPayload {
  keyId: string;
  chatJid: string;
  fromMe: boolean;
  status: MessageAckStatus;
  timestamp: number; // Unix seconds
}

// Eventos disponíveis para assinar (use '*' para todos). E22: `message.ack` e `message.reaction`
// entram na lista do painel — desde a E22 a reação sai SÓ como `message.reaction` (não mais como
// `message` tipo `other`). O painel não edita eventos: para incluir, remova e recrie o webhook — NÃO
// crie um 2º webhook com `message` para a mesma URL (entrega em dobro). Webhook do Trigger n8n 0.4.1:
// troque o Events do nó para "All Events (*)" (INTEGRACAO §3.2).
export const WEBHOOK_EVENTS = [
  '*',
  'message',
  'message.ack',
  'message.reaction',
  'session.status',
  'session.restricted',
  'session.client_too_old',
] as const;

// ---- API keys (F9.1) ----
export interface ApiKeyDto {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
}

// Resposta da criação: a chave em texto (`key`) é retornada UMA ÚNICA VEZ.
export interface CreatedApiKeyDto {
  id: string;
  name: string;
  prefix: string;
  key: string;
}

// ---- Usuários / assentos (F9.4) ----
export interface UserDto {
  id: string;
  username: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  name: string;
  password: string;
  role: Role;
}

export interface UpdateUserRequest {
  name?: string;
  role?: Role;
}

export interface UsersListResponse {
  users: UserDto[];
  usedSeats: number;
  maxSeats: number;
}

// ---- Licença (F9.5) ----
export interface LicenseStatus {
  valid: boolean; // true = licença assinada e válida
  community: boolean; // true = modo comunidade (sem licença válida)
  customer: string;
  maxSeats: number;
  maxSessions: number;
  features: string[];
  issuedAt: string | null;
  expiresAt: string | null;
  reason: string | null; // motivo quando em comunidade (expirada/assinatura/ausente)
}

export interface InstallLicenseRequest {
  token: string;
}

// ---- Branding white-label (F9.6) ----
export interface Branding {
  productName: string;
  logoUrl: string | null;
  primaryColor: string; // hex (#rrggbb)
  faviconUrl: string | null;
}

export interface UpdateBrandingRequest {
  productName: string;
  primaryColor: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

// ---- Audit log (F9.7) ----
export interface AuditLogDto {
  id: string;
  actor: string;
  method: string;
  path: string;
  statusCode: number;
  ip: string | null;
  at: string;
}

// ---- Proxies (F3) ----
export type ProxyProtocol = 'HTTP' | 'HTTPS' | 'SOCKS4' | 'SOCKS5';
export type ProxySource = 'MANUAL' | 'WEBSHARE';
export type ProxyStatus = 'UNTESTED' | 'ALIVE' | 'DEAD';
export type ProxyMode = 'NONE' | 'SINGLE' | 'RANGE' | 'GLOBAL_ROUND_ROBIN';
export type ProxyStrategy =
  'STICKY' | 'ROUND_ROBIN' | 'LEAST_LATENCY' | 'RANDOM';

export interface ProxyDto {
  id: string;
  position: number;
  label: string | null;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  hasAuth: boolean;
  source: ProxySource;
  country: string | null;
  exitIp: string | null;
  latencyMs: number | null;
  status: ProxyStatus;
  enabled: boolean;
}

// E26 (P-084, D-038) — GET /api/proxies/suggestion?sessionName=X: o proxy fixo (SINGLE) que a sessão
// apagada com esse nome usava (nome igual sem diferenciar caixa; prefere a mesma caixa e a exclusão
// mais recente). O painel pré-seleciona quando `available`; senão só avisa.
export type ProxySuggestionReason = 'IN_USE' | 'DEAD' | 'DISABLED' | 'REMOVED';

export interface ProxySuggestionDto {
  proxy: ProxyDto | null; // null só com reason REMOVED (proxy excluído do pool)
  fromSession: string; // nome como a sessão foi apagada
  releasedAt: string;
  available: boolean;
  reason: ProxySuggestionReason | null;
  inUseBySession: string | null; // com IN_USE: a sessão viva que está com o proxy
}

export interface ProxySuggestionResponse {
  suggestion: ProxySuggestionDto | null;
}

export interface CreateProxyRequest {
  label?: string;
  protocol?: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface ProxyAssignmentDto {
  sessionId: string;
  mode: ProxyMode;
  rangeStart: number | null;
  rangeEnd: number | null;
  strategy: ProxyStrategy;
  currentProxyId: string | null;
}

// E15: SINGLE exige proxy elegível/livre (o próprio pin é aceito); inválido -> 400.
// GET/PUT aceita id ou nome vivo; referências inexistentes mantêm o contrato legado.
export interface SetProxyAssignmentRequest {
  mode: ProxyMode;
  rangeStart?: number | null;
  rangeEnd?: number | null;
  strategy?: ProxyStrategy;
  proxyId?: string | null;
}

export interface ProxyTestResult {
  id: string;
  status: ProxyStatus;
  latencyMs: number | null;
  exitIp: string | null;
}

export interface BulkImportProxiesRequest {
  // Uma linha por proxy. Formatos aceitos: `host:port`, `host:port:user:pass`, `user:pass@host:port`.
  text: string;
  protocol?: ProxyProtocol;
}

export interface BulkImportResult {
  created: number;
  failed: number;
  errors: string[];
}

export interface WebshareSyncResult {
  configured: boolean;
  created: number;
  updated: number;
  total: number;
}

// ---- Grupos (F5) ----
export type GroupParticipantRole = 'admin' | 'superadmin' | 'member';
export type GroupParticipantAction = 'add' | 'remove' | 'promote' | 'demote';

export interface GroupParticipantDto {
  id: string; // identificador usado nas ações (pode ser LID em grupos novos)
  role: GroupParticipantRole;
  phone: string | null; // telefone resolvido (quando disponível)
  name: string | null; // nome do contato (quando disponível)
}

export interface GroupDto {
  id: string;
  subject: string;
  owner: string | null;
  desc: string | null;
  size: number;
  announce: boolean; // só admins escrevem
  restrict: boolean; // só admins editam infos
  participants: GroupParticipantDto[];
}

export interface CreateGroupRequest {
  subject: string;
  participants: string[]; // números (E.164 sem +) ou JIDs
}

export interface GroupParticipantsRequest {
  action: GroupParticipantAction;
  participants: string[];
}

export interface GroupSubjectRequest {
  subject: string;
}
export interface GroupDescriptionRequest {
  description: string;
}
export interface GroupInviteDto {
  code: string;
  url: string;
}

// ---- Contatos (F5) ----
export interface ContactCheckDto {
  number: string;
  exists: boolean;
  jid: string | null;
}
export interface ProfilePictureDto {
  jid: string;
  url: string | null;
}
export interface BlockRequest {
  jid: string;
  action: 'block' | 'unblock';
}

// Diretório de contatos persistente (LID↔telefone + metadados) — base para automações.
export interface ContactDirectoryDto {
  waId: string;
  jid: string | null;
  lid: string | null;
  phone: string | null;
  pushName: string | null;
  name: string | null;
  verifiedName: string | null;
  imgUrl: string | null;
  status: string | null;
  source: string | null;
  updatedAt: string;
}

// ---- Canais / Newsletter (F5 — beta) ----
export interface ChannelDto {
  id: string;
  name: string;
  description: string | null;
  subscribers: number | null;
}
export interface CreateChannelRequest {
  name: string;
  description?: string;
}

// ---- Campanhas em massa + anti-ban (F6) ----
export type CampaignStatus =
  'DRAFT' | 'RUNNING' | 'PAUSED' | 'DONE' | 'CANCELLED';
export type CampaignMessageType =
  'text' | 'image' | 'video' | 'audio' | 'document';
export type CampaignRecipientStatus =
  'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface CampaignDto {
  id: string;
  sessionId: string;
  name: string;
  messageType: CampaignMessageType;
  text: string | null;
  mediaUrl: string | null;
  status: CampaignStatus;
  total: number;
  sentCount: number;
  failedCount: number;
  minDelaySec: number;
  maxDelaySec: number;
  dailyCap: number | null;
  typingPreview: boolean;
  // Aditivo (09/2026, ABE-02): campanha de 1º contato passa pelo gate cold do guard-rail e
  // seus envios contam como cold no reply-rate. Default true.
  firstContact: boolean;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface CreateCampaignRequest {
  sessionId: string;
  name: string;
  messageType?: CampaignMessageType;
  text?: string;
  mediaUrl?: string; // mídia por URL (o gateway baixa e envia)
  mediaMime?: string;
  fileName?: string;
  recipients: string[]; // números (E.164 sem +) ou JIDs
  minDelaySec?: number;
  maxDelaySec?: number;
  dailyCap?: number;
  typingPreview?: boolean;
  firstContact?: boolean; // default true (gate de 1º contato); false = contatos que já conversam
  scheduledAt?: string; // ISO; futuro = agenda
  autostart?: boolean;
}

// G4/E21: não inferir ausência de resposta a partir de reação com alvo ambíguo.
export interface ReplyRateMetricDto {
  sessionId: string;
  windowDays: number;
  coldTotal: number;
  coldMature: number;
  responded: number;
  ambiguousMature: number; // maduros sem resposta certa e com reação de alvo inconclusivo
  replyRate: number; // responded/coldMature; ambíguos permanecem no denominador
  sample: number; // coldMature
  reliable: boolean; // sample >= Nmin e ambiguousMature = 0
  deliveryRate: number;
  readRate: number;
  scoreSaude: number;
  computedAt: string;
}

export interface CampaignRecipientDto {
  id: string;
  to: string;
  status: CampaignRecipientStatus;
  error: string | null;
  sentAt: string | null;
}
