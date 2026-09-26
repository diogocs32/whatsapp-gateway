<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Dashboard (React)

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `dashboard/App.tsx` | 196 |
| `dashboard/components/chat/ChatThread.tsx` | 246 |
| `dashboard/components/chat/forward-context.ts` | 21 |
| `dashboard/components/chat/ForwardDialog.tsx` | 629 |
| `dashboard/components/chat/ForwardedTag.tsx` | 21 |
| `dashboard/components/chat/icons.tsx` | 153 |
| `dashboard/components/chat/MediaView.tsx` | 486 |
| `dashboard/components/chat/MessageBubble.tsx` | 272 |
| `dashboard/components/chat/MessageMenu.tsx` | 178 |
| `dashboard/components/chat/Reactions.tsx` | 50 |
| `dashboard/components/chat/SelectionBar.tsx` | 47 |
| `dashboard/components/chat/thread-context.ts` | 16 |
| `dashboard/components/chat/Ticks.tsx` | 29 |
| `dashboard/components/chat/use-media.ts` | 66 |
| `dashboard/lib/api.spec.ts` | 110 |
| `dashboard/lib/api.ts` | 553 |
| `dashboard/lib/auth.tsx` | 66 |
| `dashboard/lib/branding.tsx` | 129 |
| `dashboard/lib/error-boundary.tsx` | 74 |
| `dashboard/lib/forward.spec.ts` | 1017 |
| `dashboard/lib/forward.ts` | 695 |
| `dashboard/lib/jid.spec.ts` | 102 |
| `dashboard/lib/jid.ts` | 86 |
| `dashboard/lib/live-events.spec.ts` | 507 |
| `dashboard/lib/live-events.ts` | 471 |
| `dashboard/lib/media-cache.spec.ts` | 272 |
| `dashboard/lib/media-cache.ts` | 302 |
| `dashboard/lib/media.ts` | 32 |
| `dashboard/lib/message-format.spec.ts` | 440 |
| `dashboard/lib/message-format.ts` | 426 |
| `dashboard/lib/send-feedback.spec.ts` | 61 |
| `dashboard/lib/send-feedback.ts` | 49 |
| `dashboard/lib/time-format.spec.ts` | 25 |
| `dashboard/lib/time-format.ts` | 40 |
| `dashboard/lib/use-live-stream.ts` | 73 |
| `dashboard/main.tsx` | 23 |
| `dashboard/routes/ApiKeys.tsx` | 247 |
| `dashboard/routes/Atendimento.tsx` | 698 |
| `dashboard/routes/Audit.tsx` | 113 |
| `dashboard/routes/Branding.tsx` | 130 |
| `dashboard/routes/Campaigns.tsx` | 408 |
| `dashboard/routes/Contacts.tsx` | 420 |
| `dashboard/routes/Dashboard.tsx` | 261 |
| `dashboard/routes/Groups.tsx` | 412 |
| `dashboard/routes/Health.tsx` | 251 |
| `dashboard/routes/Inbox.tsx` | 420 |
| `dashboard/routes/License.tsx` | 157 |
| `dashboard/routes/Login.tsx` | 81 |
| `dashboard/routes/Monitor.tsx` | 137 |
| `dashboard/routes/Proxies.tsx` | 635 |
| `dashboard/routes/Sessions.tsx` | 482 |
| `dashboard/routes/Users.tsx` | 259 |
| `dashboard/routes/Webhooks.tsx` | 257 |

## `dashboard/App.tsx`

196 linhas · caminho: `apps/dashboard/src/App.tsx`
- importa (interno): `dashboard/lib/auth.tsx`, `dashboard/lib/error-boundary.tsx`
- importado por: `dashboard/main.tsx`

**Funções e constantes de topo**
- `page(load, name)` · L17
  - chamado por: `ApiKeys` L29, `Atendimento` L26, `Audit` L33, `Branding` L32, `Campaigns` L37, `Contacts` L36, `Dashboard` L23, `Groups` L35, `Health` L38, `Inbox` L25, `License` L31, `Login` L22, `Monitor` L27, `Proxies` L34, `Sessions` L24, `Users` L30, `Webhooks` L28
- `Login` = `page(() => import('./routes/Login'), 'Login')` · L22
  - chama: `page` L17
- `Dashboard` = `page(() => import('./routes/Dashboard'), 'Dashboard')` · L23
  - chama: `page` L17
- `Sessions` = `page(() => import('./routes/Sessions'), 'Sessions')` · L24
  - chama: `page` L17
- `Inbox` = `page(() => import('./routes/Inbox'), 'Inbox')` · L25
  - chama: `page` L17
- `Atendimento` = `page(() => import('./routes/Atendimento'), 'Atendimento')` · L26
  - chama: `page` L17
- `Monitor` = `page(() => import('./routes/Monitor'), 'Monitor')` · L27
  - chama: `page` L17
- `Webhooks` = `page(() => import('./routes/Webhooks'), 'Webhooks')` · L28
  - chama: `page` L17
- `ApiKeys` = `page(() => import('./routes/ApiKeys'), 'ApiKeys')` · L29
  - chama: `page` L17
- `Users` = `page(() => import('./routes/Users'), 'Users')` · L30
  - chama: `page` L17
- `License` = `page(() => import('./routes/License'), 'License')` · L31
  - chama: `page` L17
- `Branding` = `page(() => import('./routes/Branding'), 'Branding')` · L32
  - chama: `page` L17
- `Audit` = `page(() => import('./routes/Audit'), 'Audit')` · L33
  - chama: `page` L17
- `Proxies` = `page(() => import('./routes/Proxies'), 'Proxies')` · L34
  - chama: `page` L17
- `Groups` = `page(() => import('./routes/Groups'), 'Groups')` · L35
  - chama: `page` L17
- `Contacts` = `page(() => import('./routes/Contacts'), 'Contacts')` · L36
  - chama: `page` L17
- `Campaigns` = `page(() => import('./routes/Campaigns'), 'Campaigns')` · L37
  - chama: `page` L17
- `Health` = `page(() => import('./routes/Health'), 'Health')` · L38
  - chama: `page` L17
- `Loading()` · L40
- `Protected({ children })` · L48
  - chama: `useAuth` (auth.tsx:61)
- `App()` · L56

**Código de topo**
- `(módulo:L11)` · L11
  - chama: `installPreloadErrorHandler` (error-boundary.tsx:9)

## `dashboard/components/chat/ChatThread.tsx`

246 linhas · caminho: `apps/dashboard/src/components/chat/ChatThread.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/jid.ts`, `dashboard/components/chat/forward-context.ts`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/icons.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/SelectionBar.tsx`, `dashboard/components/chat/thread-context.ts`
- importado por: `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Inbox.tsx`

**Funções e constantes de topo**
- `ChatThread({ messages, chatJid, empty, stickKey = 0, forward, footer, })` · L39
  - chama: `canForward` (forward.ts:37), `forwardedNotice` (forward.ts:688), `isGroupJid` (jid.ts:18), `stripDevice` (jid.ts:6)

**Tipos**
- interface `ForwardConfig` L33 · 3 propriedade(s)

## `dashboard/components/chat/forward-context.ts`

21 linhas · caminho: `apps/dashboard/src/components/chat/forward-context.ts`
- importa (interno): `contracts/index.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/MessageBubble.tsx`

**Funções e constantes de topo**
- `ForwardContext` = `createContext<ForwardActions | null>(null)` · L16
- `useForwardActions()` · L18
  - chamado por: `MessageBubble` (MessageBubble.tsx:30)

**Tipos**
- interface `ForwardActions` L7 · 3 propriedade(s)

## `dashboard/components/chat/ForwardDialog.tsx`

629 linhas · caminho: `apps/dashboard/src/components/chat/ForwardDialog.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/message-format.ts`, `dashboard/components/chat/icons.tsx`
- importado por: `dashboard/components/chat/ChatThread.tsx`

**Funções e constantes de topo**
- `FROZEN_TEXT` = `'O pedido anterior ficou sem resposta — tente de novo o MESMO pedido …` · L65
- `ForwardDialog({ msg, sessionId, deviceName, blockedReason, memory, onClos…)` · L68
  - chama: `allClean` (forward.ts:422), `attemptSummary` (forward.ts:440), `forwardFailure` (forward.ts:531), `forwardTargets` (forward.ts:174), `maxGroupsFor` (forward.ts:75), `maxTargetsFor` (forward.ts:66), `mergeOutcomes` (forward.ts:406), `planAttempt` (forward.ts:281), `refusalText` (forward.ts:258), `resultsVerdict` (forward.ts:663), `searchTargets` (forward.ts:204), `toggleTarget` (forward.ts:227), `willBecomeFrequent` (forward.ts:86), `labelText` (message-format.ts:61), `messagePreview` (message-format.ts:101)
- `TargetRow({ t, checked, outcome, sending, disabled, onToggle, })` · L546
- `Avatar({ t })` · L606

**Tipos**
- type `Phase` L46
- type `Banner` L47
- interface `ForwardSnapshot` L52 · 8 propriedade(s)

## `dashboard/components/chat/ForwardedTag.tsx`

21 linhas · caminho: `apps/dashboard/src/components/chat/ForwardedTag.tsx`
- importa (interno): `dashboard/lib/message-format.ts`, `dashboard/components/chat/icons.tsx`
- importado por: `dashboard/components/chat/MessageBubble.tsx`, `dashboard/routes/Atendimento.tsx`

**Funções e constantes de topo**
- `ForwardedTag(props)` · L5
  - chama: `forwardBadge` (message-format.ts:319)

## `dashboard/components/chat/icons.tsx`

153 linhas · caminho: `apps/dashboard/src/components/chat/icons.tsx`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/ForwardedTag.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/MessageMenu.tsx`, `dashboard/components/chat/SelectionBar.tsx`, `dashboard/components/chat/Ticks.tsx`

**Funções e constantes de topo**
- `CheckIcon({ className })` · L7
- `DoubleCheckIcon({ className })` · L24
- `ForwardIcon({ className, double, })` · L42
- `PlayIcon({ className })` · L64
- `DownloadIcon({ className })` · L75
- `ChevronDownIcon({ className })` · L93
- `CloseIcon({ className })` · L110
- `SendIcon({ className })` · L127
- `SpinnerIcon({ className })` · L138

**Tipos**
- type `IconProps` L5

## `dashboard/components/chat/MediaView.tsx`

486 linhas · caminho: `apps/dashboard/src/components/chat/MediaView.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/media-cache.ts`, `dashboard/lib/media.ts`, `dashboard/lib/message-format.ts`, `dashboard/components/chat/icons.tsx`, `dashboard/components/chat/thread-context.ts`, `dashboard/components/chat/use-media.ts`
- importado por: `dashboard/components/chat/MessageBubble.tsx`

**Funções e constantes de topo**
- `MediaView({ m, mediaType, label, })` · L27
- `MediaFile({ m, mediaType, label, })` · L42
  - chama: `useMedia` (use-media.ts:14), `mediaKey` (media.ts:15), `mediaLoader` (media.ts:20), `downloadName` (message-format.ts:412)
- `Unavailable({ label })` · L81
- `Failed({ media, label })` · L90
- `DownloadButton({ media, name })` · L110
- `ImageMedia({ media, sticker, label, name, alt, })` · L159
  - chama: `useThread` (thread-context.ts:13), `useInView` (use-media.ts:40), `isRenderableImage` (message-format.ts:378)
- `Lightbox({ url, alt, onClose, })` · L240
- `AudioMedia({ media, m, label, name, })` · L296
  - chama: `canPlay` (message-format.ts:383), `formatBytes` (message-format.ts:332)
- `VideoMedia({ media, m, label, name, })` · L377
  - chama: `useThread` (thread-context.ts:13), `formatBytes` (message-format.ts:332)
- `DocumentMedia({ media, m, label, name, })` · L456
  - chama: `formatBytes` (message-format.ts:332)

**Tipos**
- type `Media` L22

## `dashboard/components/chat/MessageBubble.tsx`

272 linhas · caminho: `apps/dashboard/src/components/chat/MessageBubble.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/jid.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/time-format.ts`, `dashboard/components/chat/forward-context.ts`, `dashboard/components/chat/ForwardedTag.tsx`, `dashboard/components/chat/icons.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageMenu.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/Ticks.tsx`
- importado por: `dashboard/components/chat/ChatThread.tsx`

**Funções e constantes de topo**
- `MessageBubble` = `memo(function MessageBubble({ m, isGroup, firstInRun, selecting = fal…` · L30
  - chama: `useForwardActions` (forward-context.ts:18), `canForward` (forward.ts:37), `canQuickForward` (forward.ts:55), `groupSenderLabel` (jid.ts:54), `senderColor` (jid.ts:81), `bubbleContent` (message-format.ts:265), `labelText` (message-format.ts:61), `messagePreview` (message-format.ts:101), `clock` (time-format.ts:5), `fullDateTime` (time-format.ts:13)
- `Body({ m, content })` · L170

## `dashboard/components/chat/MessageMenu.tsx`

178 linhas · caminho: `apps/dashboard/src/components/chat/MessageMenu.tsx`
- importa (interno): `dashboard/components/chat/icons.tsx`
- importado por: `dashboard/components/chat/MessageBubble.tsx`

**Funções e constantes de topo**
- `MessageMenu({ onForward, tone, })` · L20

## `dashboard/components/chat/Reactions.tsx`

50 linhas · caminho: `apps/dashboard/src/components/chat/Reactions.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/jid.ts`
- importado por: `dashboard/components/chat/MessageBubble.tsx`

**Funções e constantes de topo**
- `who(r)` · L8
  - chama: `formatPhone` (jid.ts:42), `isPhoneJid` (jid.ts:16), `numberFromJid` (jid.ts:11)
  - chamado por: `Reactions` L15
- `Reactions({ reactions, align, })` · L15
  - chama: `who` L8, `reactionChips` (live-events.ts:336)

## `dashboard/components/chat/SelectionBar.tsx`

47 linhas · caminho: `apps/dashboard/src/components/chat/SelectionBar.tsx`
- importa (interno): `dashboard/components/chat/icons.tsx`
- importado por: `dashboard/components/chat/ChatThread.tsx`

**Funções e constantes de topo**
- `SelectionBar({ count, onCancel, onForward, })` · L6

## `dashboard/components/chat/thread-context.ts`

16 linhas · caminho: `apps/dashboard/src/components/chat/thread-context.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/MediaView.tsx`

**Funções e constantes de topo**
- `ThreadContext` = `createContext<ThreadContextValue | null>(null)` · L11
- `useThread()` · L13
  - chamado por: `ImageMedia` (MediaView.tsx:159), `VideoMedia` (MediaView.tsx:377)

**Tipos**
- interface `ThreadContextValue` L6 · 2 propriedade(s)

## `dashboard/components/chat/Ticks.tsx`

29 linhas · caminho: `apps/dashboard/src/components/chat/Ticks.tsx`
- importa (interno): `dashboard/lib/live-events.ts`, `dashboard/components/chat/icons.tsx`
- importado por: `dashboard/components/chat/MessageBubble.tsx`, `dashboard/routes/Atendimento.tsx`

**Funções e constantes de topo**
- `Ticks(props)` · L6
  - chama: `tickFor` (live-events.ts:200)

## `dashboard/components/chat/use-media.ts`

66 linhas · caminho: `apps/dashboard/src/components/chat/use-media.ts`
- importa (interno): `dashboard/lib/media-cache.ts`, `dashboard/lib/media.ts`
- importado por: `dashboard/components/chat/MediaView.tsx`

**Funções e constantes de topo**
- `useMedia(key, makeLoader)` · L14
  - chama: `MediaCache.request` (media-cache.ts:50), `MediaCache.retain` (media-cache.ts:49), `MediaCache.snapshot` (media-cache.ts:47), `MediaCache.subscribe` (media-cache.ts:48)
  - chamado por: `MediaFile` (MediaView.tsx:42)
- `useInView(target, root, rootMargin)` · L40
  - chamado por: `ImageMedia` (MediaView.tsx:159)

## `dashboard/lib/api.spec.ts`

110 linhas · caminho: `apps/dashboard/src/lib/api.spec.ts`
- importa (interno): `dashboard/lib/api.ts`

- describe “api.sessions.forward” · L17
  - it “POST na rota da mensagem com o corpo do pedido e cookie” · L18
  - it “423 chega com status, code, mensagem e o results[] do corpo” · L41
- describe “parseError (todas as rotas)” · L65
  - it “sem code no corpo: code undefined, mensagem do corpo” · L66
  - it “corpo não-JSON: statusText; mensagem em lista vira uma linha” · L79
  - it “code que não é string é ignorado” · L98

## `dashboard/lib/api.ts`

553 linhas · caminho: `apps/dashboard/src/lib/api.ts`
- importa (interno): `contracts/index.ts`
- importado por: `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/lib/api.spec.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/media.ts`, `dashboard/lib/use-live-stream.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Branding.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Monitor.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**class `ApiError`** L58 · `extends Error`
- injeta (construtor): `status: number` · `message: string (param)` · `code: string` · `body: unknown`
- `constructor(status, message, code, body)` · L59
  - chamado por: `parseError` L125

**Funções e constantes de topo**
- `BASE` = `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'` · L53
  - env: `VITE_API_URL`
- `setUnauthorizedHandler(fn)` · L79
  - chamado por: `AuthProvider` (auth.tsx:21)
- `isAuthEndpoint(path)` · L84
  - chamado por: `coreFetch` L108
- `tryRefresh()` · L92
  - chamado por: `coreFetch` L108
- `coreFetch(path, init, allowRefresh)` · L108 · async
  - chama: `isAuthEndpoint` L84, `tryRefresh` L92
  - chamado por: `request` L142, `requestBlob` L161, `requestForm` L168
- `parseError(res)` · L125 · async
  - chama: `constructor` L59
  - chamado por: `request` L142, `requestBlob` L161, `requestForm` L168
- `request(path, init)` · L142 · async
  - chama: `coreFetch` L108, `parseError` L125
  - chamado por: `api` L176
- `requestBlob(path, signal)` · L161 · async
  - chama: `coreFetch` L108, `parseError` L125
  - chamado por: `api` L176
- `requestForm(path, form)` · L168 · async
  - chama: `coreFetch` L108, `parseError` L125
  - chamado por: `api` L176
- `api` = `{ health: () => request<HealthResponse>('/health'), login: (username:…` · L176
  - chama: `request` L142, `requestBlob` L161, `requestForm` L168
  - HTTP: `request /api/api-keys`, `request /api/api-keys/${id}`, `request /api/audit?limit=${limit}&offset=${offset}`, `request /api/auth/login`, `request /api/auth/logout`, `request /api/auth/me`, `request /api/branding`, `request /api/campaigns`, `request /api/campaigns${sessionId ? `?sessionId=${sessionId}` : ''}`, `request /api/campaigns/${id}`, `request /api/campaigns/${id}/cancel`, `request /api/campaigns/${id}/pause`, `request /api/campaigns/${id}/resume`, `request /api/campaigns/${id}/start`, `request /api/inbox/conversations${qs ? `?${qs}` : ''}`, `request /api/inbox/messages${qs ? `?${qs}` : ''}`, `request /api/inbox/sessions/${encodeURIComponent(sessionId)}/triage`, `request /api/license`, `request /api/observability/summary`, `request /api/observability/timeline/${sessionId}?limit=${limit}`, `request /api/proxies`, `request /api/proxies/${id}`, `request /api/proxies/${id}/disable`, `request /api/proxies/${id}/enable`, `request /api/proxies/${id}/test`, `request /api/proxies/available`, `request /api/proxies/bulk`, `request /api/proxies/test-all`, `request /api/proxies/webshare/status`, `request /api/proxies/webshare/sync`, `request /api/sessions`, `request /api/sessions/${encodeURIComponent(id)}/messages/${encodeURIC…`, `request /api/sessions/${id}`, `request /api/sessions/${id}/logout`, `request /api/sessions/${id}/messages/conversations?limit=${limit}`, `request /api/sessions/${id}/messages/text`, `request /api/sessions/${id}/messages?chatId=${encodeURIComponent(chat…`, `request /api/sessions/${id}/new-qr`, `request /api/sessions/${id}/pairing-code`, `request /api/sessions/${id}/qr`, `request /api/sessions/${id}/restart`, `request /api/sessions/${id}/start`, `request /api/sessions/${id}/stop`, `request /api/sessions/${sessionId}/proxy`, `request /api/sessions/${sid}/channels`, `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}`, `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}/foll…`, `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}/unfo…`, `request /api/sessions/${sid}/contacts/${encodeURIComponent(jid)}/prof…`, `request /api/sessions/${sid}/contacts/block`, `request /api/sessions/${sid}/contacts/check`, `request /api/sessions/${sid}/contacts/directory?limit=${limit}&offset…`, `request /api/sessions/${sid}/groups`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/descri…`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/invite`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/invite…`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/leave`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/partic…`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/subject`, `request /api/users`, `request /api/users/${id}`, `request /api/users/${id}/password`, `request /api/webhooks`, `request /api/webhooks/${id}`, `request /api/webhooks/${id}/disable`, `request /api/webhooks/${id}/enable`, `request /api/webhooks/${id}/test`, `request /health`, `requestForm /api/sessions/${id}/messages/media`

**Tipos**
- type `Ok` L174

## `dashboard/lib/auth.tsx`

66 linhas · caminho: `apps/dashboard/src/lib/auth.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/media.ts`
- importado por: `dashboard/App.tsx`, `dashboard/main.tsx`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Branding.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Login.tsx`, `dashboard/routes/Monitor.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `AuthContext` = `createContext<AuthState | null>(null)` · L19
- `AuthProvider({ children })` · L21
  - chama: `setUnauthorizedHandler` (api.ts:79), `MediaCache.clear` (media-cache.ts:51)
- `useAuth()` · L61
  - chamado por: `Protected` (App.tsx:48), `ApiKeys` (ApiKeys.tsx:13), `Atendimento` (Atendimento.tsx:73), `Audit` (Audit.tsx:15), `Branding` (Branding.tsx:7), `Campaigns` (Campaigns.tsx:15), `Contacts` (Contacts.tsx:12), `Dashboard` (Dashboard.tsx:16), `Groups` (Groups.tsx:7), `Health` (Health.tsx:37), `Inbox` (Inbox.tsx:19), `License` (License.tsx:11), `Login` (Login.tsx:6), `Monitor` (Monitor.tsx:14), `Proxies` (Proxies.tsx:37), `Sessions` (Sessions.tsx:226), `Users` (Users.tsx:16), `Webhooks` (Webhooks.tsx:7)

**Tipos**
- interface `AuthState` L12 · 4 propriedade(s)

## `dashboard/lib/branding.tsx`

129 linhas · caminho: `apps/dashboard/src/lib/branding.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`
- importado por: `dashboard/main.tsx`, `dashboard/routes/Branding.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Login.tsx`

**Funções e constantes de topo**
- `hexToHsl(hex)` · L19
  - chamado por: `applyPrimaryColor` L66
- `hslToHex(h, s, l)` · L41
  - chamado por: `applyPrimaryColor` L66
- `applyPrimaryColor(hex)` · L66
  - chama: `hexToHsl` L19, `hslToHex` L41
  - chamado por: `applyBranding` L76
- `applyBranding(b)` · L76
  - chama: `applyPrimaryColor` L66
  - chamado por: `BrandingProvider` L100
- `BrandingContext` = `createContext<BrandingState>({ branding: DEFAULT, refresh: () => {}, …` · L95
- `BrandingProvider({ children })` · L100
  - chama: `applyBranding` L76
- `useBranding()` · L126
  - chamado por: `Branding` (Branding.tsx:7), `Dashboard` (Dashboard.tsx:16), `Login` (Login.tsx:6)

**Tipos**
- interface `BrandingState` L90 · 2 propriedade(s)

## `dashboard/lib/error-boundary.tsx`

74 linhas · caminho: `apps/dashboard/src/lib/error-boundary.tsx`
- importado por: `dashboard/App.tsx`

**class `ErrorBoundary`** L24 · `extends Component`
- `state` · L25 · campo
- `getDerivedStateFromError(error)` · L27 · static
- `componentDidCatch(error, info)` · L31
- `render()` · L35

**Funções e constantes de topo**
- `installPreloadErrorHandler()` · L9
  - chamado por: `(módulo:L11)` (App.tsx:11)

**Tipos**
- interface `State` L20 · 1 propriedade(s)

## `dashboard/lib/forward.spec.ts`

1017 linhas · caminho: `apps/dashboard/src/lib/forward.spec.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/forward.ts`

- describe “regras espelhadas do gateway (ida e volta)” · L83
  - it “tipos encaminháveis e limites iguais aos do gateway” · L84
  - it “destinationOf aceita e recusa o mesmo que o canonicalDestination” · L113
  - it “sameDestination bate com o findDuplicate (9º dígito, sufixos, aparelho)” · L130
- describe “canForward / canQuickForward” · L151
  - it “só os tipos que o gateway encaminha” · L152
  - it “texto vazio ou miniatura legada = "não suportada" → sem ação” · L172
  - it “wwebjs `other` com arquivo continua fora (o gateway decide pelo type)” · L181
  - it “mídia sem legenda e vCard legado entram” · L187
  - it “atalho ↪ como o do WhatsApp Web: mídia, localização e contato — sem voz/figurinha/"com frequência"” · L196
- describe “maxGroupsFor / willBecomeFrequent (regras do WhatsApp)” · L234
  - it “mensagem que já veio encaminhada: só 1 grupo” · L235
  - it “aviso quando a cópia vai virar "com frequência" (terceiro com contador 4)” · L241
- describe “maxTargetsFor” · L258
  - it “5; 1 quando a original tem forwardingScore ≥ 5” · L259
- describe “forwardTargets” · L268
  - it “descarta o que o gateway recusa e a mesma conversa repetida, mantendo a ordem” · L279
  - it “rótulos: nome + telefone; sem nome = telefone formatado; grupo; lid” · L288
  - it “busca sem acento, por nome ou por número (com ou sem formatação)” · L305
- describe “toggleTarget” · L329
  - it “marca e desmarca na ordem” · L339
  - it “recusa o gêmeo do 9º dígito (o gateway daria 400)” · L348
  - it “respeita o limite (5, ou 1 com "encaminhada com frequência")” · L357
  - it “mensagem já encaminhada: o 2º grupo é recusado” · L379
- describe “planAttempt (idempotencyKey por clique)” · L391
  - it “mesmo pedido (mesma mensagem e conjunto, em qualquer ordem) reaproveita a chave” · L400
  - it “conjunto ou mensagem diferente → chave nova” · L410
  - it “newForwardKey cabe na chave derivada do gateway (≤ 200 com o destino)” · L421
- describe “outcomeOf” · L430
  - it “enviada, repetição, sem confirmação e tempo esgotado ficam travadas (nunca reenviar)” · L431
  - it “423: 1º contato × pedido inteiro bloqueado” · L460
  - it “409 em andamento pede espera e deixa tentar de novo” · L471
  - it “recusas da MENSAGEM: motivo curto na linha, sem retry” · L478
  - it “falha de envio genérica mostra o motivo do servidor e deixa tentar de novo” · L523
- describe “attemptSummary” · L536
  - it “tudo ok, parcial, sem confirmação e nada” · L537
- describe “forwardFailure” · L578
  - it “sem status (rede): tentar de novo não duplica” · L579
  - it “423 conta os destinos de 1º contato e não oferece retry” · L587
  - it “aparelho desconectado (as 3 grafias do gateway)” · L616
  - it “recusas antes de enviar (code) e 404: travam o ➤ (final) ou limitam a 1” · L634
  - it “409 de conflito de chave pede chave nova (a mesma daria 409 para sempre)” · L701
  - it “409, 429 e 5xx deixam tentar o mesmo pedido” · L723
  - it “400 genérico: motivo do servidor; retry só se algum item permite” · L729
  - it “resultsFromError valida o corpo” · L753
- describe “forwardedNotice” · L764
  - it “1, 2 e muitos” · L765
- describe “resultsVerdict” · L777
  - it “recusa da mensagem, limite vivo e o que vale repetir” · L778
- describe “mergeOutcomes / allClean” · L823
  - it “casa cada resultado pelo target (ordem trocada não confunde) e soma ao que já se sabia” · L830
  - it “target desconhecido cai na posição; sem conversa marcada não é "limpo"” · L856
- describe “revisão E25” · L880
  - it “423 diz o estado real do guard-rail (quarentena, banida, pausa manual)” · L884
  - it “desfecho incerto congela o pedido (sem resposta, 5xx, 409 em andamento); 429 não” · L903
  - it “falha com results[] resume destino a destino — nunca "Não encaminhada" sobre um "pode ter saído"” · L930
  - it “allClean nunca aceita "pode ter saído"” · L976
  - it “attemptSummary com "pode ter saído" sozinho e junto de enviada” · L993
  - it “busca só com dígitos também acha pelo nome ("Turma 2024")” · L1006

## `dashboard/lib/forward.ts`

695 linhas · caminho: `apps/dashboard/src/lib/forward.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/jid.ts`, `dashboard/lib/message-format.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/lib/forward.spec.ts`

**Funções e constantes de topo**
- `MAX_FORWARD_TARGETS` = `5` · L15
- `FORWARDABLE_TYPES` = `[ 'text', 'image', 'video', 'audio', 'document', 'sticker', 'location…` · L19
- `canForward(m)` · L37
  - chama: `bubbleContent` (message-format.ts:265)
  - chamado por: `ChatThread` (ChatThread.tsx:39), `MessageBubble` (MessageBubble.tsx:30), `canQuickForward` L55
- `QUICK_KINDS` = `new Set([ 'image', 'video', 'document', 'location', 'contact', ])` · L47
- `canQuickForward(m)` · L55
  - chama: `canForward` L37, `maxTargetsFor` L66, `bubbleContent` (message-format.ts:265)
  - chamado por: `MessageBubble` (MessageBubble.tsx:30)
- `maxTargetsFor(m)` · L66
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68), `canQuickForward` L55
- `maxGroupsFor(m)` · L75
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68)
- `willBecomeFrequent(m)` · L86
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68)
- `destinationOf(jid)` · L116
  - chama: `phoneCandidates` L143
  - chamado por: `forwardTargets` L174
- `phoneCandidates(digits)` · L143
  - chamado por: `destinationOf` L116
- `sameDestination(a, b)` · L160
  - chamado por: `toggleTarget` L227
- `foldText(s)` · L168
  - chamado por: `forwardTargets` L174, `searchTargets` L204
- `forwardTargets(convs)` · L174
  - chama: `destinationOf` L116, `foldText` L168, `displayName` (jid.ts:27), `formatPhone` (jid.ts:42), `stripDevice` (jid.ts:6)
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68)
- `searchTargets(targets, query)` · L204
  - chama: `foldText` L168
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68)
- `toggleTarget(selected, target, max, maxGroups)` · L227
  - chama: `sameDestination` L160
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68)
- `FREQUENT_LIMIT_TEXT` = `'As mensagens encaminhadas com frequência podem ser compartilhadas co…` · L255
- `refusalText(r)` · L258
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68)
- `planAttempt(prev, msgId, targets, newKey)` · L281
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68)
- `newForwardKey()` · L301
- `outcomeOf(r)` · L324
  - chamado por: `mergeOutcomes` L406, `resultsVerdict` L663
- `mergeOutcomes(prev, results, att)` · L406
  - chama: `outcomeOf` L324
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68)
- `allClean(keys, outcomes)` · L422
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68)
- `withPeriod(s)` · L435
  - chamado por: `forwardFailure` L531
- `attemptSummary(results)` · L440
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68), `forwardFailure` L531
- `resultsFromError(err)` · L493
  - chamado por: `forwardFailure` L531
- `forwardFailure(err, deviceName)` · L531
  - chama: `attemptSummary` L440, `resultsFromError` L493, `resultsVerdict` L663, `withPeriod` L435
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68)
- `resultsVerdict(results)` · L663
  - chama: `outcomeOf` L324
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68), `forwardFailure` L531
- `forwardedNotice(names)` · L688
  - chamado por: `ChatThread` (ChatThread.tsx:39)

**Tipos**
- type `Forwardable` L30
- type `TargetKind` L100
- interface `ForwardTarget` L102 · 9 propriedade(s)
- type `ToggleRefusal` L222
- interface `ForwardAttempt` L274 · 4 propriedade(s)
- type `OutcomeKind` L305
- interface `TargetOutcome` L308 · 4 propriedade(s)
- interface `ForwardErrorLike` L484 · 4 propriedade(s)
- interface `ForwardFailure` L509 · 7 propriedade(s)

## `dashboard/lib/jid.spec.ts`

102 linhas · caminho: `apps/dashboard/src/lib/jid.spec.ts`
- importa (interno): `dashboard/lib/jid.ts`

- describe “jid (consolidação Inbox × Atendimento)” · L13
  - it “numberFromJid tira domínio e aparelho” · L14
  - it “sendTarget: número só para telefone” · L20
  - it “displayName e caixa única” · L26
  - it “formatPhone: Brasil com máscara; outros com +” · L38
- describe “groupSenderLabel (P-074)” · L45
  - it “linha antiga (senderJid = grupo), fromMe e 1:1 → sem rótulo” · L47
  - it “nome (senderName) vence; telefone formatado; @lid vira "Participante"” · L69
  - it “cor estável por participante” · L89

## `dashboard/lib/jid.ts`

86 linhas · caminho: `apps/dashboard/src/lib/jid.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/lib/forward.ts`, `dashboard/lib/jid.spec.ts`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Inbox.tsx`

**Funções e constantes de topo**
- `stripDevice(jid)` · L6
  - chamado por: `ChatThread` (ChatThread.tsx:39), `forwardTargets` (forward.ts:174), `groupSenderLabel` L54
- `numberFromJid(jid)` · L11
  - chamado por: `who` (Reactions.tsx:8), `displayName` L27, `groupSenderLabel` L54, `sendTarget` L22, `Atendimento` (Atendimento.tsx:73)
- `isPhoneJid(jid)` · L16
  - chamado por: `who` (Reactions.tsx:8), `groupSenderLabel` L54, `sendTarget` L22
- `isGroupJid(jid)` · L18
  - chamado por: `ChatThread` (ChatThread.tsx:39), `groupSenderLabel` L54, `Inbox` (Inbox.tsx:19)
- `isLidJid(jid)` · L19
- `sendTarget(chatJid)` · L22
  - chama: `isPhoneJid` L16, `numberFromJid` L11
  - chamado por: `Atendimento` (Atendimento.tsx:73), `Inbox` (Inbox.tsx:19)
- `displayName(c)` · L27
  - chama: `numberFromJid` L11
  - chamado por: `forwardTargets` (forward.ts:174), `Atendimento` (Atendimento.tsx:73), `Avatar` (Inbox.tsx:403), `Inbox` (Inbox.tsx:19)
- `isTriageExcludedChat(jid)` · L36
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `formatPhone(digits)` · L42
  - chamado por: `who` (Reactions.tsx:8), `forwardTargets` (forward.ts:174), `groupSenderLabel` L54
- `groupSenderLabel(m)` · L54
  - chama: `formatPhone` L42, `isGroupJid` L18, `isPhoneJid` L16, `numberFromJid` L11, `stripDevice` L6
  - chamado por: `MessageBubble` (MessageBubble.tsx:30)
- `senderColor(key)` · L81
  - chamado por: `MessageBubble` (MessageBubble.tsx:30)

## `dashboard/lib/live-events.spec.ts`

507 linhas · caminho: `apps/dashboard/src/lib/live-events.spec.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/live-events.ts`

- describe “parseLiveEvent” · L51
  - it “ack válido; status desconhecido, sem keyId e eventos alheios → null” · L52
  - it “reação (inclusive remoção com emoji "")” · L90
  - it “message → item do fluxo com selo e sem status” · L113
- describe “ACK (P-072 — só exibição)” · L147
  - it “ackRank: sent<delivered<read; resto = 0” · L148
  - it “applyAck: sobe, nunca regride, casa por sessionId+keyId, mesma referência sem mudança” · L163
  - it “AckMemory: ACK antes da mensagem e GET sem o status (no-op no banco)” · L180
  - it “tickFor: só fromMe; sem grupo/transmissão/canal; null/desconhecido = sem tique” · L203
- describe “reações ao vivo” · L237
  - it “reactionSenderKey é idêntico ao do gateway (48 combinações)” · L238
  - it “1:1: uma por pessoa, troca, remoção, @lid × telefone, fora de ordem, outra sessão” · L277
  - it “grupo: uma por participante (sem sufixo de aparelho), ordem por horário” · L308
  - it “reação de OUTRA pessoa com horário anterior entra na posição do horário (não no fim)” · L345
  - it “reactionChips: mais usado primeiro, empate = o que apareceu antes, "mine"” · L366
  - it “replayReactions: GET que saiu antes do evento não apaga a reação; o banco mais novo vence” · L387
  - it “replayReactions: margem de 2 s para o persister assíncrono do gateway (limite exato)” · L403
  - it “replayReactions: não ressuscita reação removida enquanto o SSE esteve fora” · L418
- describe “fluxo ao vivo e recarga estável” · L429
  - it “upsertFeedItem: dedup por sessionId+keyId (não só keyId) e sem regredir status” · L430
  - it “mergeFeed: GET que leu o banco antes do INSERT não apaga o item recebido pelo SSE” · L449
  - it “stabilize: ignora a mediaUrl que muda a cada leitura; reaproveita objetos” · L481

## `dashboard/lib/live-events.ts`

471 linhas · caminho: `apps/dashboard/src/lib/live-events.ts`
- importa (interno): `contracts/index.ts`
- importado por: `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/Ticks.tsx`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/use-live-stream.ts`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Inbox.tsx`

**Funções e constantes de topo**
- `ackRank(status)` · L20
  - chamado por: `applyAck` L141, `overlayAcks` L181, `parseLiveEvent` L69, `rememberAck` L165, `upsertFeedItem` L383
- `str(v)` · L64
  - chamado por: `parseLiveEvent` L69
- `num(v)` · L66
  - chamado por: `parseLiveEvent` L69
- `parseLiveEvent(data, nowSec)` · L69
  - chama: `ackRank` L20, `num` L66, `str` L64
  - chamado por: `useLiveStream` (use-live-stream.ts:11)
- `applyAck(list, ev)` · L141
  - chama: `ackRank` L20
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `memKey(sessionId, keyId)` · L163
  - chamado por: `overlayAcks` L181, `rememberAck` L165
- `rememberAck(mem, ev, max)` · L165
  - chama: `ackRank` L20, `memKey` L163
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `overlayAcks(list, mem)` · L181
  - chama: `ackRank` L20, `memKey` L163
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `NO_TICK_CHAT` = `/@(g\.us|broadcast|newsletter)$/` · L198
- `tickFor(m)` · L200
  - chamado por: `Ticks` (Ticks.tsx:6)
- `TICK_LABEL` = `{ sent: 'Enviada', delivered: 'Entregue', read: 'Lida', }` · L220
- `reactionSenderKey(p)` · L237
  - chamado por: `applyReaction` L252
- `tsMs(iso)` · L247
  - chamado por: `applyReaction` L252
- `applyReaction(list, ev)` · L252
  - chama: `reactionSenderKey` L237, `tsMs` L247
  - chamado por: `replayReactions` L320, `Atendimento` (Atendimento.tsx:73)
- `REACTION_REPLAY_MARGIN_MS` = `2000` · L308
- `rememberReaction(mem, ev, receivedAt, max)` · L310
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `replayReactions(list, mem, requestedAt)` · L320
  - chama: `applyReaction` L252
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `reactionChips(reactions)` · L336
  - chamado por: `Reactions` (Reactions.tsx:15)
- `feedItemFromEvent(ev)` · L364
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `upsertFeedItem(feed, item, max)` · L383
  - chama: `ackRank` L20
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `rememberFeedItem(mem, item, receivedAt, max)` · L406
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `mergeFeed(rows, mem, requestedAt, max)` · L418
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `sameIgnoringMediaUrl(a, b)` · L446
  - chamado por: `stabilize` L457
- `stabilize(prev, next)` · L457
  - chama: `sameIgnoringMediaUrl` L446
  - chamado por: `Atendimento` (Atendimento.tsx:73), `Inbox` (Inbox.tsx:19)

**Tipos**
- type `AckStatus` L11
- interface `LiveAck` L29 · 4 propriedade(s)
- interface `LiveReaction` L36 · 8 propriedade(s)
- interface `LiveMessage` L47 · 12 propriedade(s)
- type `LiveEvent` L62
- interface `Ackable` L133 · 3 propriedade(s)
- type `AckMemory` L161
- type `Tick` L196
- interface `Reactable` L228 · 4 propriedade(s)
- interface `ReactionMemoryItem` L302 · 2 propriedade(s)
- type `ReactionMemory` L306
- interface `FeedMemoryItem` L400 · 2 propriedade(s)
- type `FeedMemory` L404
- type `WithId` L444

## `dashboard/lib/media-cache.spec.ts`

272 linhas · caminho: `apps/dashboard/src/lib/media-cache.spec.ts`
- importa (interno): `dashboard/lib/media-cache.ts`

- describe “media-cache (E23 · P-067)” · L55
  - it “um download por mensagem, compartilhado; pronto → object URL e aviso aos ouvintes” · L56
  - it “StrictMode (retain → release → retain logo em seguida) não revoga nem baixa de novo” · L83
  - it “a carência recomeça a cada saída (retain cancela o timer pendente)” · L104
  - it “saiu da tela durante o download → aborta depois da carência” · L121
  - it “teto de memória: revoga primeiro o que ninguém usa (mais antigo antes)” · L136
  - it “teto de memória: com várias sem uso, revoga do mais antigo e só o necessário” · L160
  - it “404 = sem arquivo, permanente: não pede de novo, nem depois de sair e voltar” · L183
  - it “erro (500/rede) → "tentar de novo" baixa outra vez” · L203
  - it “429 → pausa global: nada novo começa até passar a pausa” · L222
  - it “no máximo N downloads simultâneos (fila)” · L241
  - it “clear (saída do painel) revoga tudo e aborta o que está em voo” · L257

## `dashboard/lib/media-cache.ts`

302 linhas · caminho: `apps/dashboard/src/lib/media-cache.ts`
- importado por: `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/use-media.ts`, `dashboard/lib/media-cache.spec.ts`, `dashboard/lib/media.ts`

**Funções e constantes de topo**
- `IDLE` = `Object.freeze({ status: 'idle', url: null, type: null, message: null,…` · L55
- `httpStatus(err)` · L73
  - chamado por: `createMediaCache` L78
- `createMediaCache(deps)` · L78
  - chama: `httpStatus` L73
  - chamado por: `mediaCache` (media.ts:7)

**Tipos**
- type `MediaStatus` L21
- interface `MediaSnapshot` L24 · 4 propriedade(s)
- type `MediaLoader` L31
- interface `MediaCacheDeps` L33 · 10 propriedade(s)
- interface `MediaCache` L46
  - `MediaCache.snapshot(key)` · L47
    - chamado por: `useMedia` (use-media.ts:14)
  - `MediaCache.subscribe(key, cb)` · L48
    - chamado por: `useMedia` (use-media.ts:14)
  - `MediaCache.retain(key)` · L49
    - chamado por: `useMedia` (use-media.ts:14)
  - `MediaCache.request(key, load)` · L50
    - chamado por: `useMedia` (use-media.ts:14)
  - `MediaCache.clear()` · L51
    - chamado por: `AuthProvider` (auth.tsx:21)
  - `MediaCache.stats()` · L52
- interface `Entry` L62 · 8 propriedade(s)

## `dashboard/lib/media.ts`

32 linhas · caminho: `apps/dashboard/src/lib/media.ts`
- importa (interno): `dashboard/lib/api.ts`, `dashboard/lib/media-cache.ts`, `dashboard/lib/message-format.ts`
- importado por: `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/use-media.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `mediaCache` = `createMediaCache({ createObjectURL: (blob) => URL.createObjectURL(blo…` · L7
  - chama: `createMediaCache` (media-cache.ts:78)
- `mediaKey(sessionId, messageId)` · L15
  - chamado por: `MediaFile` (MediaView.tsx:42)
- `mediaLoader(m)` · L20
  - chama: `safeBlobType` (message-format.ts:356)
  - chamado por: `MediaFile` (MediaView.tsx:42)

## `dashboard/lib/message-format.spec.ts`

440 linhas · caminho: `apps/dashboard/src/lib/message-format.spec.ts`
- importa (interno): `dashboard/lib/message-format.ts`

- describe “prévia nunca é "…" nem vazia (P-067)” · L66
  - it “type desconhecido (novo no gateway) → aviso” · L75
- describe “rótulos por type” · L81
  - it “mídia sem legenda → ícone + rótulo; com legenda → ícone + legenda” · L82
  - it “other com resumo mostra o resumo; sem resumo → aviso” · L92
  - it “wwebjs: other + mediaType document sem texto → 📄 Documento” · L100
  - it “poll_vote → voto” · L106
  - it “texto: 1ª linha não vazia, espaços colapsados, emoji intacto” · L111
  - it “conversationPreview prefixa "Você: " só em fromMe” · L117
- describe “legado (antes da E22)” · L135
  - it “miniatura base64 gravada como text (wwebjs antigo) nunca aparece” · L138
  - it “texto humano curto que começa com /9j/ não é miniatura” · L147
  - it “vCard cru gravado como text vira contato” · L150
  - it “Baileys antigo (reação gravada como other+null) e wwebjs sem texto → aviso” · L159
  - it “localização enviada pela API (eco): só o nome, sem link” · L168
- describe “localização — link do mapa seguro” · L179
  - it “ida e volta com o formatLocation do gateway” · L180
  - it “só coordenadas (sem rótulo)” · L195
  - it “tempo real com legenda de várias linhas: a URL é a última linha” · L205
  - it “notação exponencial que o `${n}` do JS gera” · L217
  - it “coordenada fora da faixa (o gateway não valida) não vira link” · L224
  - it “a URL é reconstruída dos números (nunca o texto cru)” · L242
  - it “0,0 não vira link (o gateway também não gera)” · L250
- describe “contato / enquete / evento / convite — ida e volta” · L257
  - it “contato: vários, sem nome” · L258
  - it “enquete: pergunta + "• opção"; snapshot com contagem” · L271
  - it “evento e convite: título + corpo” · L288
- describe “bubbleContent — mídia decide por mediaType” · L308
  - it “imagem com legenda” · L309
  - it “wwebjs: other + mediaType document → documento, resumo como legenda” · L319
  - it “mídia sem mediaType (linha antiga/eco) usa o type” · L328
  - it “other com resumo → unsupported com o resumo” · L334
- describe “selo Encaminhada” · L342
- describe “mídia: tipo seguro do blob, tamanho, nome, formato tocável” · L358
  - it “documento vira octet-stream (nunca executa na origem do painel)” · L359
  - it “imagem só com tipo desenhável; SVG não” · L367
  - it “gateway genérico: vale o mimetype do DTO (só tipo/subtipo)” · L381
  - it “formatBytes pt-BR” · L407
  - it “downloadName: nome do DTO (UTF-8) ou derivado do tipo, sem barras” · L413
  - it “canPlay com sonda injetada ("" = não toca)” · L429

## `dashboard/lib/message-format.ts`

426 linhas · caminho: `apps/dashboard/src/lib/message-format.ts`
- importa (interno): `contracts/index.ts`
- importado por: `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/ForwardedTag.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/lib/forward.spec.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/media.ts`, `dashboard/lib/message-format.spec.ts`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Inbox.tsx`

**Funções e constantes de topo**
- `MEDIA_KINDS` = `[ 'image', 'video', 'audio', 'document', 'sticker', ] as const` · L11
- `isMediaKind(v)` · L19
  - chamado por: `bubbleContent` L265, `downloadName` L412, `messagePreview` L101, `typeLabel` L50
- `UNSUPPORTED_TEXT` = `'Mensagem não suportada — veja no celular'` · L22
- `MEDIA_MISSING_TEXT` = `'Arquivo indisponível — veja no celular'` · L23
- `TYPE_LABELS` = `{ image: { icon: '📷', label: 'Foto' }, video: { icon: '🎥', label: '…` · L34
- `typeLabel(type, mediaType)` · L50
  - chama: `isMediaKind` L19
  - chamado por: `labelText` L61
- `labelText(type, mediaType)` · L61
  - chama: `typeLabel` L50
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68), `MessageBubble` (MessageBubble.tsx:30), `bubbleContent` L265, `messagePreview` L101
- `isLegacyThumbnail(text)` · L70
  - chamado por: `bubbleContent` L265, `messagePreview` L101
- `isRawVcard(text)` · L76
  - chamado por: `bubbleContent` L265, `messagePreview` L101
- `vcardToLine(vcard)` · L81
  - chamado por: `bubbleContent` L265, `messagePreview` L101
- `firstLine(text)` · L92
  - chamado por: `messagePreview` L101
- `messagePreview(m)` · L101
  - chama: `firstLine` L92, `isLegacyThumbnail` L70, `isMediaKind` L19, `isRawVcard` L76, `labelText` L61, `parseContactsText` L197, `parseLocationText` L164, `vcardToLine` L81
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:68), `MessageBubble` (MessageBubble.tsx:30), `conversationPreview` L141, `Atendimento` (Atendimento.tsx:73)
- `conversationPreview(c)` · L141
  - chama: `messagePreview` L101
  - chamado por: `Atendimento` (Atendimento.tsx:73), `Inbox` (Inbox.tsx:19)
- `NUM` = `String.raw`-?\d+(?:\.\d+)?(?:e[+-]?\d+)?`` · L154
- `MAP_URL_RE` = `new RegExp( String.raw`^https://maps\.google\.com/\?q=(${NUM}),(${NUM…` · L155
- `parseLocationText(text)` · L164
  - chamado por: `bubbleContent` L265, `messagePreview` L101
- `PHONE_RE` = `/^\+?[\d\s().-]{3,}$/` · L194
- `parseContactsText(text)` · L197
  - chamado por: `bubbleContent` L265, `messagePreview` L101
- `parsePollText(text)` · L218
  - chamado por: `bubbleContent` L265
- `splitTitleBody(text)` · L234
  - chamado por: `bubbleContent` L265
- `bubbleContent(m)` · L265
  - chama: `isLegacyThumbnail` L70, `isMediaKind` L19, `isRawVcard` L76, `labelText` L61, `parseContactsText` L197, `parseLocationText` L164, `parsePollText` L218, `splitTitleBody` L234, `vcardToLine` L81
  - chamado por: `MessageBubble` (MessageBubble.tsx:30), `canForward` (forward.ts:37), `canQuickForward` (forward.ts:55)
- `FREQUENTLY_FORWARDED_MIN` = `5` · L317
- `forwardBadge(m)` · L319
  - chamado por: `ForwardedTag` (ForwardedTag.tsx:5)
- `formatBytes(n)` · L332
  - chamado por: `AudioMedia` (MediaView.tsx:296), `DocumentMedia` (MediaView.tsx:456), `VideoMedia` (MediaView.tsx:377)
- `baseMime(t)` · L349
  - chamado por: `downloadName` L412, `isRenderableImage` L378, `safeBlobType` L356
- `safeBlobType(mediaType, dtoMime, blobType)` · L356
  - chama: `baseMime` L349
  - chamado por: `mediaLoader` (media.ts:20)
- `isRenderableImage(blobType)` · L378
  - chama: `baseMime` L349
  - chamado por: `ImageMedia` (MediaView.tsx:159)
- `canPlay(mimetype, probe)` · L383
  - chamado por: `AudioMedia` (MediaView.tsx:296)
- `downloadName(m)` · L412
  - chama: `baseMime` L349, `isMediaKind` L19
  - chamado por: `MediaFile` (MediaView.tsx:42)

**Tipos**
- type `MediaKind` L18
- interface `TypeLabel` L25 · 2 propriedade(s)
- interface `LocationParts` L159 · 2 propriedade(s)
- interface `ContactCard` L190 · 2 propriedade(s)
- type `BubbleContent` L249

## `dashboard/lib/send-feedback.spec.ts`

61 linhas · caminho: `apps/dashboard/src/lib/send-feedback.spec.ts`
- importa (interno): `dashboard/lib/send-feedback.ts`

- describe “deviceBlockReason” · L4
  - it “trava a resposta quando o aparelho não consegue enviar” · L5
  - it “no encaminhar o texto diz "encaminhe" (E25)” · L18
  - it “WORKING, DEGRADED e aparelho desconhecido não travam” · L25
- describe “sendErrorMessage” · L33
  - it “"Sessão não iniciada" vira aparelho desconectado” · L34
  - it “quarentena (423), rate-limit (429), rede e genérico” · L44

## `dashboard/lib/send-feedback.ts`

49 linhas · caminho: `apps/dashboard/src/lib/send-feedback.ts`
- importa (interno): `contracts/index.ts`
- importado por: `dashboard/lib/send-feedback.spec.ts`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Inbox.tsx`

**Funções e constantes de topo**
- `deviceBlockReason(device, action)` · L16
  - chamado por: `Atendimento` (Atendimento.tsx:73), `Inbox` (Inbox.tsx:19)
- `sendErrorMessage(err, deviceName)` · L29
  - chamado por: `Atendimento` (Atendimento.tsx:73), `Inbox` (Inbox.tsx:19)

## `dashboard/lib/time-format.spec.ts`

25 linhas · caminho: `apps/dashboard/src/lib/time-format.spec.ts`
- importa (interno): `dashboard/lib/time-format.ts`

- describe “time-format” · L4
  - it “clock: HH:mm sem segundos” · L5
  - it “since: agora / min / h / d” · L8
  - it “listTime: hora se hoje, dd/mm se não” · L15

## `dashboard/lib/time-format.ts`

40 linhas · caminho: `apps/dashboard/src/lib/time-format.ts`
- importado por: `dashboard/components/chat/MessageBubble.tsx`, `dashboard/lib/time-format.spec.ts`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Inbox.tsx`

**Funções e constantes de topo**
- `clock(iso)` · L5
  - chamado por: `MessageBubble` (MessageBubble.tsx:30), `listTime` L24, `Atendimento` (Atendimento.tsx:73)
- `fullDateTime(iso)` · L13
  - chamado por: `MessageBubble` (MessageBubble.tsx:30)
- `listTime(iso, now)` · L24
  - chama: `clock` L5
  - chamado por: `Inbox` (Inbox.tsx:19)
- `since(iso, now)` · L32
  - chamado por: `Atendimento` (Atendimento.tsx:73)

## `dashboard/lib/use-live-stream.ts`

73 linhas · caminho: `apps/dashboard/src/lib/use-live-stream.ts`
- importa (interno): `dashboard/lib/api.ts`, `dashboard/lib/live-events.ts`
- importado por: `dashboard/routes/Atendimento.tsx`

**Funções e constantes de topo**
- `useLiveStream(onEvent, onResync)` · L11
  - chama: `parseLiveEvent` (live-events.ts:69)
  - chamado por: `Atendimento` (Atendimento.tsx:73)

## `dashboard/main.tsx`

23 linhas · caminho: `apps/dashboard/src/main.tsx`
- importa (interno): `dashboard/App.tsx`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`

**Funções e constantes de topo**
- `root` = `document.getElementById('root')` · L9

## `dashboard/routes/ApiKeys.tsx`

247 linhas · caminho: `apps/dashboard/src/routes/ApiKeys.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `fmt(s)` · L7
  - chamado por: `ApiKeys` L13
- `ApiKeys()` · L13
  - chama: `useAuth` (auth.tsx:61), `fmt` L7

## `dashboard/routes/Atendimento.tsx`

698 linhas · caminho: `apps/dashboard/src/routes/Atendimento.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardedTag.tsx`, `dashboard/components/chat/Ticks.tsx`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/jid.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/time-format.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/lib/use-live-stream.ts`

**Funções e constantes de topo**
- `convKey(c)` · L70
  - chamado por: `Atendimento` L73
- `Atendimento()` · L73
  - chama: `useAuth` (auth.tsx:61), `displayName` (jid.ts:27), `isTriageExcludedChat` (jid.ts:36), `numberFromJid` (jid.ts:11), `sendTarget` (jid.ts:22), `applyAck` (live-events.ts:141), `applyReaction` (live-events.ts:252), `feedItemFromEvent` (live-events.ts:364), `mergeFeed` (live-events.ts:418), `overlayAcks` (live-events.ts:181), `rememberAck` (live-events.ts:165), `rememberFeedItem` (live-events.ts:406), `rememberReaction` (live-events.ts:310), `replayReactions` (live-events.ts:320), `stabilize` (live-events.ts:457), `upsertFeedItem` (live-events.ts:383), `conversationPreview` (message-format.ts:141), `messagePreview` (message-format.ts:101), `deviceBlockReason` (send-feedback.ts:16), `sendErrorMessage` (send-feedback.ts:29), `clock` (time-format.ts:5), `since` (time-format.ts:32), `useLiveStream` (use-live-stream.ts:11), `convKey` L70

**Tipos**
- type `StatusFilter` L53

## `dashboard/routes/Audit.tsx`

113 linhas · caminho: `apps/dashboard/src/routes/Audit.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `statusColor(code)` · L9
  - chamado por: `Audit` L15
- `Audit()` · L15
  - chama: `useAuth` (auth.tsx:61), `statusColor` L9

## `dashboard/routes/Branding.tsx`

130 linhas · caminho: `apps/dashboard/src/routes/Branding.tsx`
- importa (interno): `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`

**Funções e constantes de topo**
- `Branding()` · L7
  - chama: `useAuth` (auth.tsx:61), `useBranding` (branding.tsx:126)

## `dashboard/routes/Campaigns.tsx`

408 linhas · caminho: `apps/dashboard/src/routes/Campaigns.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Campaigns()` · L15
  - chama: `useAuth` (auth.tsx:61)
- `Btn({ children, onClick, danger, })` · L369
- `BtnEmerald({ children, onClick, })` · L392

## `dashboard/routes/Contacts.tsx`

420 linhas · caminho: `apps/dashboard/src/routes/Contacts.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Contacts()` · L12
  - chama: `useAuth` (auth.tsx:61)

## `dashboard/routes/Dashboard.tsx`

261 linhas · caminho: `apps/dashboard/src/routes/Dashboard.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`

**Funções e constantes de topo**
- `Dot({ up })` · L8
- `Dashboard()` · L16
  - chama: `useAuth` (auth.tsx:61), `useBranding` (branding.tsx:126)

## `dashboard/routes/Groups.tsx`

412 linhas · caminho: `apps/dashboard/src/routes/Groups.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Groups()` · L7
  - chama: `useAuth` (auth.tsx:61)
- `ActionBtn({ children, onClick, danger, })` · L390

## `dashboard/routes/Health.tsx`

251 linhas · caminho: `apps/dashboard/src/routes/Health.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Dot({ up })` · L12
- `mb(bytes)` · L20
  - chamado por: `Health` L37
- `statusColor(s)` · L24
  - chamado por: `Health` L37
- `Health()` · L37
  - chama: `useAuth` (auth.tsx:61), `mb` L20, `statusColor` L24

## `dashboard/routes/Inbox.tsx`

420 linhas · caminho: `apps/dashboard/src/routes/Inbox.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/components/chat/ChatThread.tsx`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/jid.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/lib/time-format.ts`

**Funções e constantes de topo**
- `Inbox()` · L19
  - chama: `useAuth` (auth.tsx:61), `displayName` (jid.ts:27), `isGroupJid` (jid.ts:18), `sendTarget` (jid.ts:22), `stabilize` (live-events.ts:457), `conversationPreview` (message-format.ts:141), `deviceBlockReason` (send-feedback.ts:16), `sendErrorMessage` (send-feedback.ts:29), `listTime` (time-format.ts:24)
- `Avatar({ conv })` · L403
  - chama: `displayName` (jid.ts:27)

## `dashboard/routes/License.tsx`

157 linhas · caminho: `apps/dashboard/src/routes/License.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `fmtDate(s)` · L7
  - chamado por: `License` L11
- `License()` · L11
  - chama: `useAuth` (auth.tsx:61), `fmtDate` L7

## `dashboard/routes/Login.tsx`

81 linhas · caminho: `apps/dashboard/src/routes/Login.tsx`
- importa (interno): `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`

**Funções e constantes de topo**
- `Login()` · L6
  - chama: `useAuth` (auth.tsx:61), `useBranding` (branding.tsx:126)

## `dashboard/routes/Monitor.tsx`

137 linhas · caminho: `apps/dashboard/src/routes/Monitor.tsx`
- importa (interno): `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Monitor()` · L14
  - chama: `useAuth` (auth.tsx:61)

**Tipos**
- interface `EventItem` L6 · 5 propriedade(s)

## `dashboard/routes/Proxies.tsx`

635 linhas · caminho: `apps/dashboard/src/routes/Proxies.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `MODES` = `[ { value: 'NONE', label: 'Sem proxy' }, { value: 'SINGLE', label: 'P…` · L15
- `statusBadge(status)` · L28
  - chamado por: `Proxies` L37
- `Proxies()` · L37
  - chama: `useAuth` (auth.tsx:61), `statusBadge` L28
- `Field({ label, children, })` · L472
- `AssignmentRow({ session, proxies, assignment, onSaved, onError, })` · L487

## `dashboard/routes/Sessions.tsx`

482 linhas · caminho: `apps/dashboard/src/routes/Sessions.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `StatusBadge({ status })` · L23
- `ConnectModal({ session, onClose, })` · L32
- `Sessions()` · L226
  - chama: `useAuth` (auth.tsx:61)

## `dashboard/routes/Users.tsx`

259 linhas · caminho: `apps/dashboard/src/routes/Users.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `fmt(s)` · L9
  - chamado por: `Users` L16
- `Users()` · L16
  - chama: `useAuth` (auth.tsx:61), `fmt` L9

## `dashboard/routes/Webhooks.tsx`

257 linhas · caminho: `apps/dashboard/src/routes/Webhooks.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Webhooks()` · L7
  - chama: `useAuth` (auth.tsx:61)
