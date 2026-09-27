import type {
  ApiKeyDto,
  AuditLogDto,
  AuthUser,
  Branding,
  BulkImportProxiesRequest,
  BulkImportResult,
  CampaignDto,
  ChannelDto,
  ConnectLinkCreatedResponse,
  ConnectLinkCurrentResponse,
  ConnectLinkRevokeResponse,
  ContactCheckDto,
  ContactDirectoryDto,
  ConversationDto,
  CreateApiKeyRequest,
  CreateCampaignRequest,
  CreateConnectLinkRequest,
  CreateProxyRequest,
  CreateSessionRequest,
  CreateUserRequest,
  CreateWebhookRequest,
  CreatedApiKeyDto,
  ForwardMessageRequest,
  ForwardMessageResponse,
  GroupDto,
  GroupInviteDto,
  GroupParticipantAction,
  HealthResponse,
  InboxConversationsResponse,
  InboxFeedItemDto,
  InboxTriageRequest,
  InboxTriageResponse,
  InboxTriageStatus,
  LicenseStatus,
  LoginResponse,
  MessageDto,
  ObservabilitySummary,
  PairingCodeResponse,
  ProfilePictureDto,
  ProxyAssignmentDto,
  ProxyDto,
  ProxySuggestionResponse,
  ProxyTestResult,
  QrResponse,
  SendTextResponse,
  SessionDto,
  SetProxyAssignmentRequest,
  TimelineEvent,
  UpdateBrandingRequest,
  UpdateUserRequest,
  UserDto,
  UsersListResponse,
  WebhookDto,
  WebshareSyncResult,
} from '@contracts';

export const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// `code` e `body` (E25): o corpo de erro do gateway pode trazer um código de máquina (ex.: 423
// `SESSION_QUARANTINED`, 400 `FORWARD_UNSUPPORTED`) e dados (o `results[]` do encaminhar). Quem só
// usa `status`/`message` segue igual.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly body?: unknown,
  ) {
    super(message);
  }
}

// --- Silent refresh (refresh-token rotation) ---------------------------------
// A sessão do painel é access curto (cookie httpOnly `token`) + refresh longo (cookie restrito a
// /api/auth). Quando o access expira, um request qualquer leva 401; aqui renovamos a sessão UMA vez
// (POST /api/auth/refresh) e refazemos o request. Se o refresh falhar, avisamos o AuthProvider
// (limpa o usuário → o app redireciona pro /login) — nada de console cheio de 401 nem logout no meio.

let refreshInFlight: Promise<boolean> | null = null;
let onUnauthorized: (() => void) | null = null;

// Registrado pelo AuthProvider. Chamado quando a renovação falha (sessão realmente expirada).
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

// login/refresh não devem disparar refresh (401 no login = credencial errada; no refresh = loop).
function isAuthEndpoint(path: string): boolean {
  return (
    path.startsWith('/api/auth/login') || path.startsWith('/api/auth/refresh')
  );
}

// Uma única renovação por vez: requests concorrentes que levarem 401 compartilham a MESMA promise
// (anti-corrida) em vez de dispararem N refreshes.
function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => r.ok)
      .catch(() => false);
    void refreshInFlight.finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// fetch com credenciais + retry único pós-refresh. `allowRefresh=false` na 2ª tentativa (anti-loop).
async function coreFetch(
  path: string,
  init: RequestInit,
  allowRefresh = true,
): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
  });
  if (res.status === 401 && allowRefresh && !isAuthEndpoint(path)) {
    const renewed = await tryRefresh();
    if (renewed) return coreFetch(path, init, false); // refez a sessão → 1 retry
    onUnauthorized?.(); // expirou de vez → AuthProvider redireciona pro login
  }
  return res;
}

async function parseError(res: Response): Promise<never> {
  let message = res.statusText;
  let code: string | undefined;
  let body: unknown;
  try {
    body = await res.json();
    const b = body as { message?: unknown; code?: unknown } | null;
    if (typeof b?.message === 'string' && b.message) message = b.message;
    else if (Array.isArray(b?.message) && b.message.length)
      message = b.message.join('; '); // validação do Nest com várias mensagens
    if (typeof b?.code === 'string' && b.code) code = b.code;
  } catch {
    /* corpo não-JSON */
  }
  throw new ApiError(res.status, message, code, body);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Só envia Content-Type: application/json quando HÁ body — o Fastify rejeita
  // (400) um POST com esse content-type e body vazio (start/stop/restart/logout).
  const hasBody = init?.body !== undefined && init?.body !== null;
  const res = await coreFetch(path, {
    ...init,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) return parseError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// Download binário (E23 — mídia do chat): mesmo cookie + silent refresh do resto do painel, sem
// header nenhum (GET simples não gera preflight) e sem Range (o /media não atende). O Content-Type
// é legível cross-origin (safelisted); o Content-Disposition não — o nome vem do DTO.
async function requestBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const res = await coreFetch(path, { method: 'GET', signal });
  if (!res.ok) return parseError(res);
  return res.blob();
}

// Upload multipart (mídia): NÃO definir Content-Type — o browser põe o boundary.
async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const res = await coreFetch(path, { method: 'POST', body: form });
  if (!res.ok) return parseError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

type Ok = { ok: boolean };

export const api = {
  health: () => request<HealthResponse>('/health'),
  login: (username: string, password: string) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<Ok>('/api/auth/logout', { method: 'POST' }),
  me: () => request<AuthUser>('/api/auth/me'),

  apiKeys: {
    list: () => request<ApiKeyDto[]>('/api/api-keys'),
    create: (body: CreateApiKeyRequest) =>
      request<CreatedApiKeyDto>('/api/api-keys', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    revoke: (id: string) =>
      request<Ok>(`/api/api-keys/${id}`, { method: 'DELETE' }),
  },

  users: {
    list: () => request<UsersListResponse>('/api/users'),
    create: (body: CreateUserRequest) =>
      request<UserDto>('/api/users', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateUserRequest) =>
      request<UserDto>(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    resetPassword: (id: string, password: string) =>
      request<Ok>(`/api/users/${id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    remove: (id: string) =>
      request<Ok>(`/api/users/${id}`, { method: 'DELETE' }),
  },

  license: {
    status: () => request<LicenseStatus>('/api/license'),
    install: (token: string) =>
      request<LicenseStatus>('/api/license', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    remove: () => request<LicenseStatus>('/api/license', { method: 'DELETE' }),
  },

  branding: {
    get: () => request<Branding>('/api/branding'),
    update: (body: UpdateBrandingRequest) =>
      request<Branding>('/api/branding', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },

  audit: {
    list: (limit = 100, offset = 0) =>
      request<AuditLogDto[]>(`/api/audit?limit=${limit}&offset=${offset}`),
  },

  sessions: {
    list: () => request<SessionDto[]>('/api/sessions'),
    create: (body: CreateSessionRequest) =>
      request<SessionDto>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    get: (id: string) => request<SessionDto>(`/api/sessions/${id}`),
    start: (id: string) =>
      request<Ok>(`/api/sessions/${id}/start`, { method: 'POST' }),
    stop: (id: string) =>
      request<Ok>(`/api/sessions/${id}/stop`, { method: 'POST' }),
    restart: (id: string) =>
      request<Ok>(`/api/sessions/${id}/restart`, { method: 'POST' }),
    logout: (id: string) =>
      request<Ok>(`/api/sessions/${id}/logout`, { method: 'POST' }),
    remove: (id: string) =>
      request<Ok>(`/api/sessions/${id}`, { method: 'DELETE' }),
    qr: (id: string) => request<QrResponse>(`/api/sessions/${id}/qr`),
    // Limpa credenciais + reinicia o socket (recuperação de sessão deslogada pelo celular).
    newQr: (id: string) =>
      request<Ok>(`/api/sessions/${id}/new-qr`, { method: 'POST' }),
    pairingCode: (id: string, phoneNumber: string) =>
      request<PairingCodeResponse>(`/api/sessions/${id}/pairing-code`, {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      }),
    // E27/P-086 — link público para conectar de outro lugar. Só login do painel: criar/revogar
    // OPERATOR+, consultar VIEWER+. O `token` só vem na resposta do POST (o banco guarda o hash).
    connectLink: {
      // O link mais recente da sessão (qualquer estado) ou `link: null`.
      get: (id: string) =>
        request<ConnectLinkCurrentResponse>(
          `/api/sessions/${encodeURIComponent(id)}/connect-link`,
        ),
      // Criar outro revoga o anterior (motivo REPLACED). 409 com `code` CONNECT_LINK_SESSION_*.
      create: (id: string, body: CreateConnectLinkRequest) =>
        request<ConnectLinkCreatedResponse>(
          `/api/sessions/${encodeURIComponent(id)}/connect-link`,
          { method: 'POST', body: JSON.stringify(body) },
        ),
      revoke: (id: string) =>
        request<ConnectLinkRevokeResponse>(
          `/api/sessions/${encodeURIComponent(id)}/connect-link`,
          { method: 'DELETE' },
        ),
    },
    messages: (id: string, chatId: string, limit = 50) =>
      request<MessageDto[]>(
        `/api/sessions/${id}/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`,
      ),
    conversations: (id: string, limit = 100) =>
      request<ConversationDto[]>(
        `/api/sessions/${id}/messages/conversations?limit=${limit}`,
      ),
    // Bytes da mídia de uma mensagem (E23). `ref` = o `id` (ULID) do MessageDto — inequívoco e sem
    // encode; o keyId também é aceito pelo gateway, mas não é único por sessão.
    media: (id: string, ref: string, signal?: AbortSignal) =>
      requestBlob(
        `/api/sessions/${encodeURIComponent(id)}/messages/${encodeURIComponent(ref)}/media`,
        signal,
      ),
    // P-068 (E25): encaminhar a mensagem `msgId` (o `id` do MessageDto) para até 5 conversas da
    // MESMA sessão. Um destino por vez no gateway (1–3 s entre eles) — a resposta leva segundos.
    // `idempotencyKey` vale para o pedido: repetir o mesmo pedido não reenvia o que já saiu.
    forward: (id: string, msgId: string, body: ForwardMessageRequest) =>
      request<ForwardMessageResponse>(
        `/api/sessions/${encodeURIComponent(id)}/messages/${encodeURIComponent(msgId)}/forward`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    // UP-02: o painel manda idempotencyKey (o gateway reserva a intenção — retry não duplica).
    sendText: (
      id: string,
      to: string,
      text: string,
      opts?: { idempotencyKey?: string; cold?: boolean },
    ) =>
      request<SendTextResponse>(`/api/sessions/${id}/messages/text`, {
        method: 'POST',
        body: JSON.stringify({
          to,
          text,
          ...(opts?.idempotencyKey
            ? { idempotencyKey: opts.idempotencyKey }
            : {}),
          ...(opts?.cold !== undefined ? { cold: opts.cold } : {}),
        }),
      }),
    sendMedia: (
      id: string,
      to: string,
      file: File,
      opts?: {
        caption?: string;
        type?: string;
        ptt?: boolean;
        idempotencyKey?: string;
      },
    ) => {
      const fd = new FormData();
      fd.append('to', to); // campos antes do arquivo: desde a P-054 a ordem é livre (o gateway lê o corpo todo)
      if (opts?.idempotencyKey)
        fd.append('idempotencyKey', opts.idempotencyKey);
      if (opts?.type) fd.append('type', opts.type);
      if (opts?.caption) fd.append('caption', opts.caption);
      if (opts?.ptt) fd.append('ptt', 'true');
      fd.append('file', file);
      return requestForm<SendTextResponse>(
        `/api/sessions/${id}/messages/media`,
        fd,
      );
    },
  },

  // Caixa única de triagem (página Atendimento): tudo que chega de TODOS os aparelhos,
  // com o semáforo por conversa (🔴 responder · 🟢 respondido · 🟡 não preciso responder).
  inbox: {
    conversations: (opts?: {
      limit?: number;
      sessions?: string[];
      status?: InboxTriageStatus;
    }) => {
      const q = new URLSearchParams();
      if (opts?.limit) q.set('limit', String(opts.limit));
      if (opts?.sessions?.length) q.set('sessions', opts.sessions.join(','));
      if (opts?.status) q.set('status', opts.status);
      const qs = q.toString();
      return request<InboxConversationsResponse>(
        `/api/inbox/conversations${qs ? `?${qs}` : ''}`,
      );
    },
    feed: (opts?: { limit?: number; sessions?: string[] }) => {
      const q = new URLSearchParams();
      if (opts?.limit) q.set('limit', String(opts.limit));
      if (opts?.sessions?.length) q.set('sessions', opts.sessions.join(','));
      const qs = q.toString();
      return request<InboxFeedItemDto[]>(
        `/api/inbox/messages${qs ? `?${qs}` : ''}`,
      );
    },
    // `keyId` = a entrada que estava na tela: se chegou mensagem nova antes do clique, o gateway
    // NÃO marca e devolve status 'pending' (o amarelo nunca engole mensagem não lida).
    triage: (sessionId: string, body: InboxTriageRequest) =>
      request<InboxTriageResponse>(
        `/api/inbox/sessions/${encodeURIComponent(sessionId)}/triage`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
  },

  webhooks: {
    list: () => request<WebhookDto[]>('/api/webhooks'),
    create: (body: CreateWebhookRequest) =>
      request<WebhookDto>('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      request<Ok>(`/api/webhooks/${id}`, { method: 'DELETE' }),
    enable: (id: string) =>
      request<Ok>(`/api/webhooks/${id}/enable`, { method: 'POST' }),
    disable: (id: string) =>
      request<Ok>(`/api/webhooks/${id}/disable`, { method: 'POST' }),
    test: (id: string) =>
      request<Ok>(`/api/webhooks/${id}/test`, { method: 'POST' }),
  },

  proxies: {
    list: () => request<ProxyDto[]>('/api/proxies'),
    // Proxies livres p/ o dropdown da criação de sessão (D-008).
    listAvailable: () => request<ProxyDto[]>('/api/proxies/available'),
    // E26/P-084 — proxy que a sessão apagada com esse nome usava (sugestão na criação). ADMIN
    // (OPERATOR leva 403). `init` leva o `signal` (debounce e teto do "Criar"). `no-store`: sem
    // passar pelo cache HTTP — o GET do "Criar" segurado tem a mesma URL do GET do debounce e o
    // Chrome o enfileirava atrás dele (trava do cache), gastando o teto de 1,5 s. MDN
    // Request.cache: "fetches the resource from the remote server without first looking in the
    // cache"; sem preflight CORS (conferido no Chrome 146, cross-origin com credenciais).
    suggestion: (sessionName: string, init?: RequestInit) =>
      request<ProxySuggestionResponse>(
        `/api/proxies/suggestion?sessionName=${encodeURIComponent(sessionName)}`,
        { cache: 'no-store', ...init },
      ),
    create: (body: CreateProxyRequest) =>
      request<ProxyDto>('/api/proxies', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    bulk: (body: BulkImportProxiesRequest) =>
      request<BulkImportResult>('/api/proxies/bulk', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      request<Ok>(`/api/proxies/${id}`, { method: 'DELETE' }),
    enable: (id: string) =>
      request<Ok>(`/api/proxies/${id}/enable`, { method: 'POST' }),
    disable: (id: string) =>
      request<Ok>(`/api/proxies/${id}/disable`, { method: 'POST' }),
    test: (id: string) =>
      request<ProxyTestResult>(`/api/proxies/${id}/test`, { method: 'POST' }),
    testAll: () =>
      request<ProxyTestResult[]>('/api/proxies/test-all', { method: 'POST' }),
    webshareStatus: () =>
      request<{ configured: boolean }>('/api/proxies/webshare/status'),
    webshareSync: () =>
      request<WebshareSyncResult>('/api/proxies/webshare/sync', {
        method: 'POST',
      }),
    getAssignment: (sessionId: string) =>
      request<ProxyAssignmentDto>(`/api/sessions/${sessionId}/proxy`),
    setAssignment: (sessionId: string, body: SetProxyAssignmentRequest) =>
      request<ProxyAssignmentDto>(`/api/sessions/${sessionId}/proxy`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },

  groups: {
    list: (sid: string) => request<GroupDto[]>(`/api/sessions/${sid}/groups`),
    info: (sid: string, jid: string) =>
      request<GroupDto>(
        `/api/sessions/${sid}/groups/${encodeURIComponent(jid)}`,
      ),
    create: (sid: string, subject: string, participants: string[]) =>
      request<GroupDto>(`/api/sessions/${sid}/groups`, {
        method: 'POST',
        body: JSON.stringify({ subject, participants }),
      }),
    participants: (
      sid: string,
      jid: string,
      action: GroupParticipantAction,
      participants: string[],
    ) =>
      request<Ok>(
        `/api/sessions/${sid}/groups/${encodeURIComponent(jid)}/participants`,
        { method: 'POST', body: JSON.stringify({ action, participants }) },
      ),
    leave: (sid: string, jid: string) =>
      request<Ok>(
        `/api/sessions/${sid}/groups/${encodeURIComponent(jid)}/leave`,
        {
          method: 'POST',
        },
      ),
    setSubject: (sid: string, jid: string, subject: string) =>
      request<Ok>(
        `/api/sessions/${sid}/groups/${encodeURIComponent(jid)}/subject`,
        { method: 'POST', body: JSON.stringify({ subject }) },
      ),
    setDescription: (sid: string, jid: string, description: string) =>
      request<Ok>(
        `/api/sessions/${sid}/groups/${encodeURIComponent(jid)}/description`,
        { method: 'POST', body: JSON.stringify({ description }) },
      ),
    invite: (sid: string, jid: string) =>
      request<GroupInviteDto>(
        `/api/sessions/${sid}/groups/${encodeURIComponent(jid)}/invite`,
      ),
    revokeInvite: (sid: string, jid: string) =>
      request<GroupInviteDto>(
        `/api/sessions/${sid}/groups/${encodeURIComponent(jid)}/invite/revoke`,
        { method: 'POST' },
      ),
  },

  contacts: {
    check: (sid: string, numbers: string[]) =>
      request<ContactCheckDto[]>(`/api/sessions/${sid}/contacts/check`, {
        method: 'POST',
        body: JSON.stringify({ numbers }),
      }),
    directory: (sid: string, search?: string, limit = 1000, offset = 0) =>
      request<ContactDirectoryDto[]>(
        `/api/sessions/${sid}/contacts/directory?limit=${limit}&offset=${offset}${
          search ? `&search=${encodeURIComponent(search)}` : ''
        }`,
      ),
    profilePicture: (sid: string, jid: string) =>
      request<ProfilePictureDto>(
        `/api/sessions/${sid}/contacts/${encodeURIComponent(jid)}/profile-picture`,
      ),
    block: (sid: string, jid: string, action: 'block' | 'unblock') =>
      request<Ok>(`/api/sessions/${sid}/contacts/block`, {
        method: 'POST',
        body: JSON.stringify({ jid, action }),
      }),
  },

  channels: {
    create: (sid: string, name: string, description?: string) =>
      request<ChannelDto>(`/api/sessions/${sid}/channels`, {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      }),
    info: (sid: string, jid: string) =>
      request<ChannelDto>(
        `/api/sessions/${sid}/channels/${encodeURIComponent(jid)}`,
      ),
    follow: (sid: string, jid: string) =>
      request<Ok>(
        `/api/sessions/${sid}/channels/${encodeURIComponent(jid)}/follow`,
        {
          method: 'POST',
        },
      ),
    unfollow: (sid: string, jid: string) =>
      request<Ok>(
        `/api/sessions/${sid}/channels/${encodeURIComponent(jid)}/unfollow`,
        { method: 'POST' },
      ),
  },

  campaigns: {
    list: (sessionId?: string) =>
      request<CampaignDto[]>(
        `/api/campaigns${sessionId ? `?sessionId=${sessionId}` : ''}`,
      ),
    create: (body: CreateCampaignRequest) =>
      request<CampaignDto>('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    start: (id: string) =>
      request<Ok>(`/api/campaigns/${id}/start`, { method: 'POST' }),
    pause: (id: string) =>
      request<Ok>(`/api/campaigns/${id}/pause`, { method: 'POST' }),
    resume: (id: string) =>
      request<Ok>(`/api/campaigns/${id}/resume`, { method: 'POST' }),
    cancel: (id: string) =>
      request<Ok>(`/api/campaigns/${id}/cancel`, { method: 'POST' }),
    remove: (id: string) =>
      request<Ok>(`/api/campaigns/${id}`, { method: 'DELETE' }),
  },

  observability: {
    summary: () => request<ObservabilitySummary>('/api/observability/summary'),
    timeline: (sessionId: string, limit = 50) =>
      request<TimelineEvent[]>(
        `/api/observability/timeline/${sessionId}?limit=${limit}`,
      ),
  },
};
