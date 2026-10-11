<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Dashboard (React)

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `dashboard/App.tsx` | 199 |
| `dashboard/components/chat/ChatThread.tsx` | 267 |
| `dashboard/components/chat/forward-context.ts` | 21 |
| `dashboard/components/chat/ForwardDialog.tsx` | 683 |
| `dashboard/components/chat/ForwardedTag.tsx` | 21 |
| `dashboard/components/chat/icons.tsx` | 153 |
| `dashboard/components/chat/MediaView.tsx` | 486 |
| `dashboard/components/chat/MessageBubble.tsx` | 272 |
| `dashboard/components/chat/MessageMenu.tsx` | 179 |
| `dashboard/components/chat/Reactions.tsx` | 50 |
| `dashboard/components/chat/SelectionBar.tsx` | 47 |
| `dashboard/components/chat/thread-context.ts` | 16 |
| `dashboard/components/chat/Ticks.tsx` | 29 |
| `dashboard/components/chat/use-media.ts` | 66 |
| `dashboard/components/proxies/ProxyPicker.tsx` | 349 |
| `dashboard/components/sessions/ConnectLinkDialog.tsx` | 505 |
| `dashboard/lib/api.spec.ts` | 261 |
| `dashboard/lib/api.ts` | 599 |
| `dashboard/lib/auth.tsx` | 90 |
| `dashboard/lib/branding.tsx` | 129 |
| `dashboard/lib/combobox-keys.spec.ts` | 132 |
| `dashboard/lib/combobox-keys.ts` | 69 |
| `dashboard/lib/connect-link-memory.spec.ts` | 53 |
| `dashboard/lib/connect-link-memory.ts` | 46 |
| `dashboard/lib/connect-link.spec.ts` | 781 |
| `dashboard/lib/connect-link.ts` | 705 |
| `dashboard/lib/connect-path.ts` | 8 |
| `dashboard/lib/error-boundary.tsx` | 74 |
| `dashboard/lib/forward-memory.spec.ts` | 122 |
| `dashboard/lib/forward-memory.ts` | 118 |
| `dashboard/lib/forward.spec.ts` | 1111 |
| `dashboard/lib/forward.ts` | 730 |
| `dashboard/lib/jid.spec.ts` | 102 |
| `dashboard/lib/jid.ts` | 86 |
| `dashboard/lib/live-events.spec.ts` | 510 |
| `dashboard/lib/live-events.ts` | 472 |
| `dashboard/lib/media-cache.spec.ts` | 272 |
| `dashboard/lib/media-cache.ts` | 302 |
| `dashboard/lib/media.ts` | 32 |
| `dashboard/lib/message-format.spec.ts` | 440 |
| `dashboard/lib/message-format.ts` | 426 |
| `dashboard/lib/proxy-suggestion.spec.ts` | 504 |
| `dashboard/lib/proxy-suggestion.ts` | 256 |
| `dashboard/lib/proxy-usage.spec.ts` | 415 |
| `dashboard/lib/proxy-usage.ts` | 335 |
| `dashboard/lib/public-connect.spec.ts` | 243 |
| `dashboard/lib/public-connect.ts` | 133 |
| `dashboard/lib/send-feedback.spec.ts` | 61 |
| `dashboard/lib/send-feedback.ts` | 49 |
| `dashboard/lib/session-filter.spec.ts` | 150 |
| `dashboard/lib/session-filter.ts` | 142 |
| `dashboard/lib/time-format.spec.ts` | 25 |
| `dashboard/lib/time-format.ts` | 40 |
| `dashboard/lib/use-live-stream.ts` | 73 |
| `dashboard/main.tsx` | 23 |
| `dashboard/routes/ApiKeys.tsx` | 247 |
| `dashboard/routes/Atendimento.tsx` | 698 |
| `dashboard/routes/Audit.tsx` | 113 |
| `dashboard/routes/Branding.tsx` | 130 |
| `dashboard/routes/Campaigns.tsx` | 408 |
| `dashboard/routes/Conectar.tsx` | 440 |
| `dashboard/routes/Contacts.tsx` | 420 |
| `dashboard/routes/Dashboard.tsx` | 261 |
| `dashboard/routes/Groups.tsx` | 412 |
| `dashboard/routes/Health.tsx` | 251 |
| `dashboard/routes/Inbox.tsx` | 420 |
| `dashboard/routes/License.tsx` | 157 |
| `dashboard/routes/Login.tsx` | 81 |
| `dashboard/routes/Monitor.tsx` | 137 |
| `dashboard/routes/Proxies.tsx` | 942 |
| `dashboard/routes/Sessions.tsx` | 1051 |
| `dashboard/routes/Users.tsx` | 259 |
| `dashboard/routes/Webhooks.tsx` | 257 |

## `dashboard/App.tsx`

199 linhas · caminho: `apps/dashboard/src/App.tsx`
- importa (interno): `dashboard/lib/auth.tsx`, `dashboard/lib/error-boundary.tsx`
- importado por: `dashboard/main.tsx`

**Funções e constantes de topo**
- `page(load, name)` · L17
  - chamado por: `ApiKeys` L29, `Atendimento` L26, `Audit` L33, `Branding` L32, `Campaigns` L37, `Conectar` L40, `Contacts` L36, `Dashboard` L23, `Groups` L35, `Health` L38, `Inbox` L25, `License` L31, `Login` L22, `Monitor` L27, `Proxies` L34, `Sessions` L24, `Users` L30, `Webhooks` L28
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
- `Conectar` = `page(() => import('./routes/Conectar'), 'Conectar')` · L40
  - chama: `page` L17
- `Loading()` · L42
- `Protected({ children })` · L50
  - chama: `useAuth` (auth.tsx:85)
- `App()` · L58

**Código de topo**
- `(módulo:L11)` · L11
  - chama: `installPreloadErrorHandler` (error-boundary.tsx:9)

## `dashboard/components/chat/ChatThread.tsx`

267 linhas · caminho: `apps/dashboard/src/components/chat/ChatThread.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/jid.ts`, `dashboard/components/chat/forward-context.ts`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/icons.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/SelectionBar.tsx`, `dashboard/components/chat/thread-context.ts`
- importado por: `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Inbox.tsx`

**Funções e constantes de topo**
- `ChatThread({ messages, chatJid, empty, stickKey = 0, forward, footer, })` · L39
  - chama: `canForward` (forward.ts:37), `forwardedNotice` (forward.ts:723), `isGroupJid` (jid.ts:18), `stripDevice` (jid.ts:6)

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

683 linhas · caminho: `apps/dashboard/src/components/chat/ForwardDialog.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/forward-memory.ts`, `dashboard/lib/message-format.ts`, `dashboard/components/chat/icons.tsx`
- importado por: `dashboard/components/chat/ChatThread.tsx`

**Funções e constantes de topo**
- `FROZEN_TEXT` = `'O pedido anterior ficou sem resposta — tente de novo o MESMO pedido …` · L55
- `ForwardDialog({ msg, sessionId, deviceName, blockedReason, onClose, })` · L58
  - chama: `ForwardMemory.delete` (forward-memory.ts:43), `ForwardMemory.get` (forward-memory.ts:41), `ForwardMemory.set` (forward-memory.ts:42), `memoryKey` (forward-memory.ts:37), `allClean` (forward.ts:434), `attemptSummary` (forward.ts:452), `forwardFailure` (forward.ts:558), `forwardTargets` (forward.ts:174), `maxGroupsFor` (forward.ts:75), `maxTargetsFor` (forward.ts:66), `mergeOutcomes` (forward.ts:418), `planAttempt` (forward.ts:281), `refusalText` (forward.ts:258), `resultsVerdict` (forward.ts:704), `searchTargets` (forward.ts:204), `summarizeOutcomes` (forward.ts:461), `toggleTarget` (forward.ts:227), `willBecomeFrequent` (forward.ts:86), `labelText` (message-format.ts:61), `messagePreview` (message-format.ts:101)
- `TargetRow({ t, checked, outcome, sending, disabled, onToggle, })` · L600
- `Avatar({ t })` · L660

**Tipos**
- type `Phase` L52

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

179 linhas · caminho: `apps/dashboard/src/components/chat/MessageMenu.tsx`
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
  - chama: `who` L8, `reactionChips` (live-events.ts:337)

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
  - chama: `tickFor` (live-events.ts:201)

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

## `dashboard/components/proxies/ProxyPicker.tsx`

349 linhas · caminho: `apps/dashboard/src/components/proxies/ProxyPicker.tsx`
- importa (interno): `dashboard/lib/combobox-keys.ts`
- importado por: `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`

**Funções e constantes de topo**
- `Dot({ tone })` · L55
- `Badge({ tone, text })` · L64
- `ProxyPicker({ value, options, onChange, labelledBy, describedBy, placeh…)` · L74
  - chama: `comboKey` (combobox-keys.ts:39), `initialActive` (combobox-keys.ts:30)

**Tipos**
- type `ProxyPickerTone` L24
- interface `ProxyPickerOption` L26 · 7 propriedade(s)

## `dashboard/components/sessions/ConnectLinkDialog.tsx`

505 linhas · caminho: `apps/dashboard/src/components/sessions/ConnectLinkDialog.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/connect-link.ts`, `dashboard/lib/connect-link-memory.ts`, `dashboard/lib/jid.ts`
- importado por: `dashboard/routes/Sessions.tsx`

**Funções e constantes de topo**
- `CONNECT_LINK_WWEBJS_REASON` = `'Disponível só para sessões Baileys nesta versão'` · L37
- `ConnectLinkDialog({ session, onClose, onChanged, })` · L55
  - chama: `useAuth` (auth.tsx:85), `useBranding` (branding.tsx:126), `forgetLinkUrl` (connect-link-memory.ts:38), `recallLinkUrl` (connect-link-memory.ts:24), `rememberLinkUrl` (connect-link-memory.ts:13), `buildConnectUrl` (connect-link.ts:39), `buildShareText` (connect-link.ts:61), `createLinkError` (connect-link.ts:681), `defaultExpectedPhone` (connect-link.ts:579), `describeLink` (connect-link.ts:630), `expectedPhoneError` (connect-link.ts:606), `formatPhone` (jid.ts:42)

## `dashboard/lib/api.spec.ts`

261 linhas · caminho: `apps/dashboard/src/lib/api.spec.ts`
- importa (interno): `dashboard/lib/api.ts`

- describe “api.sessions.forward” · L17
  - it “POST na rota da mensagem com o corpo do pedido e cookie” · L18
  - it “423 chega com status, code, mensagem e o results[] do corpo” · L41
- describe “parseError (todas as rotas)” · L65
  - it “sem code no corpo: code undefined, mensagem do corpo” · L66
  - it “corpo não-JSON: statusText; mensagem em lista vira uma linha” · L79
  - it “code que não é string é ignorado” · L98
- describe “api.sessions.connectLink” · L112
  - it “get/create/revoke: rota com o id codificado, método e corpo certos, cookie” · L113
  - it “409 do criar chega com o code” · L142
- describe “api.proxies.suggestion” · L166
  - it “GET com o nome codificado na query, cookie, sem Content-Type e com o signal de quem chama” · L167
  - it “sem init: no-store do mesmo jeito; init do chamador pode sobrescrever” · L191
  - it “403 (OPERATOR) chega como ApiError para quem chama engolir” · L202
- describe “api.proxies (E28)” · L214
  - it “bulkRemove: POST na rota de lote com os ids no corpo, JSON e cookie” · L215
  - it “setAssignment e sessions.create levam allowSharedProxy quando quem chama manda” · L232

## `dashboard/lib/api.ts`

599 linhas · caminho: `apps/dashboard/src/lib/api.ts`
- importa (interno): `contracts/index.ts`
- importado por: `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/sessions/ConnectLinkDialog.tsx`, `dashboard/lib/api.spec.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/media.ts`, `dashboard/lib/public-connect.spec.ts`, `dashboard/lib/public-connect.ts`, `dashboard/lib/use-live-stream.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Branding.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Monitor.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**class `ApiError`** L66 · `extends Error`
- injeta (construtor): `status: number` · `message: string (param)` · `code: string` · `body: unknown`
- `constructor(status, message, code, body)` · L67
  - chamado por: `parseError` L133

**Funções e constantes de topo**
- `BASE` = `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'` · L61
  - env: `VITE_API_URL`
- `setUnauthorizedHandler(fn)` · L87
  - chamado por: `AuthProvider` (auth.tsx:24)
- `isAuthEndpoint(path)` · L92
  - chamado por: `coreFetch` L116
- `tryRefresh()` · L100
  - chamado por: `coreFetch` L116
- `coreFetch(path, init, allowRefresh)` · L116 · async
  - chama: `isAuthEndpoint` L92, `tryRefresh` L100
  - chamado por: `request` L150, `requestBlob` L169, `requestForm` L176
- `parseError(res)` · L133 · async
  - chama: `constructor` L67
  - chamado por: `request` L150, `requestBlob` L169, `requestForm` L176
- `request(path, init)` · L150 · async
  - chama: `coreFetch` L116, `parseError` L133
  - chamado por: `api` L184
- `requestBlob(path, signal)` · L169 · async
  - chama: `coreFetch` L116, `parseError` L133
  - chamado por: `api` L184
- `requestForm(path, form)` · L176 · async
  - chama: `coreFetch` L116, `parseError` L133
  - chamado por: `api` L184
- `api` = `{ health: () => request<HealthResponse>('/health'), login: (username:…` · L184
  - chama: `request` L150, `requestBlob` L169, `requestForm` L176
  - HTTP: `request /api/api-keys`, `request /api/api-keys/${id}`, `request /api/audit?limit=${limit}&offset=${offset}`, `request /api/auth/login`, `request /api/auth/logout`, `request /api/auth/me`, `request /api/branding`, `request /api/campaigns`, `request /api/campaigns${sessionId ? `?sessionId=${sessionId}` : ''}`, `request /api/campaigns/${id}`, `request /api/campaigns/${id}/cancel`, `request /api/campaigns/${id}/pause`, `request /api/campaigns/${id}/resume`, `request /api/campaigns/${id}/start`, `request /api/inbox/conversations${qs ? `?${qs}` : ''}`, `request /api/inbox/messages${qs ? `?${qs}` : ''}`, `request /api/inbox/sessions/${encodeURIComponent(sessionId)}/triage`, `request /api/license`, `request /api/observability/summary`, `request /api/observability/timeline/${sessionId}?limit=${limit}`, `request /api/proxies`, `request /api/proxies/${id}`, `request /api/proxies/${id}/disable`, `request /api/proxies/${id}/enable`, `request /api/proxies/${id}/test`, `request /api/proxies/available`, `request /api/proxies/bulk`, `request /api/proxies/bulk-delete`, `request /api/proxies/suggestion?sessionName=${encodeURIComponent(sess…`, `request /api/proxies/test-all`, `request /api/proxies/webshare/status`, `request /api/proxies/webshare/sync`, `request /api/sessions`, `request /api/sessions/${encodeURIComponent(id)}/connect-link`, `request /api/sessions/${encodeURIComponent(id)}/messages/${encodeURIC…`, `request /api/sessions/${id}`, `request /api/sessions/${id}/logout`, `request /api/sessions/${id}/messages/conversations?limit=${limit}`, `request /api/sessions/${id}/messages/text`, `request /api/sessions/${id}/messages?chatId=${encodeURIComponent(chat…`, `request /api/sessions/${id}/new-qr`, `request /api/sessions/${id}/pairing-code`, `request /api/sessions/${id}/qr`, `request /api/sessions/${id}/restart`, `request /api/sessions/${id}/start`, `request /api/sessions/${id}/stop`, `request /api/sessions/${sessionId}/proxy`, `request /api/sessions/${sid}/channels`, `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}`, `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}/foll…`, `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}/unfo…`, `request /api/sessions/${sid}/contacts/${encodeURIComponent(jid)}/prof…`, `request /api/sessions/${sid}/contacts/block`, `request /api/sessions/${sid}/contacts/check`, `request /api/sessions/${sid}/contacts/directory?limit=${limit}&offset…`, `request /api/sessions/${sid}/groups`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/descri…`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/invite`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/invite…`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/leave`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/partic…`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/subject`, `request /api/users`, `request /api/users/${id}`, `request /api/users/${id}/password`, `request /api/webhooks`, `request /api/webhooks/${id}`, `request /api/webhooks/${id}/disable`, `request /api/webhooks/${id}/enable`, `request /api/webhooks/${id}/test`, `request /health`, `requestForm /api/sessions/${id}/messages/media`

**Tipos**
- type `Ok` L182

## `dashboard/lib/auth.tsx`

90 linhas · caminho: `apps/dashboard/src/lib/auth.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/connect-link-memory.ts`, `dashboard/lib/connect-path.ts`, `dashboard/lib/media.ts`
- importado por: `dashboard/App.tsx`, `dashboard/components/sessions/ConnectLinkDialog.tsx`, `dashboard/main.tsx`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Branding.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Login.tsx`, `dashboard/routes/Monitor.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `AuthContext` = `createContext<AuthState | null>(null)` · L22
- `AuthProvider({ children })` · L24
  - chama: `setUnauthorizedHandler` (api.ts:87), `clearRememberedLinkUrls` (connect-link-memory.ts:43), `isPublicPath` (connect-path.ts:5), `MediaCache.clear` (media-cache.ts:51)
- `useAuth()` · L85
  - chamado por: `Protected` (App.tsx:50), `ConnectLinkDialog` (ConnectLinkDialog.tsx:55), `ApiKeys` (ApiKeys.tsx:13), `Atendimento` (Atendimento.tsx:73), `Audit` (Audit.tsx:15), `Branding` (Branding.tsx:7), `Campaigns` (Campaigns.tsx:15), `Contacts` (Contacts.tsx:12), `Dashboard` (Dashboard.tsx:16), `Groups` (Groups.tsx:7), `Health` (Health.tsx:37), `Inbox` (Inbox.tsx:19), `License` (License.tsx:11), `Login` (Login.tsx:6), `Monitor` (Monitor.tsx:14), `Proxies` (Proxies.tsx:87), `Sessions` (Sessions.tsx:321), `Users` (Users.tsx:16), `Webhooks` (Webhooks.tsx:7)

**Tipos**
- interface `AuthState` L15 · 4 propriedade(s)

## `dashboard/lib/branding.tsx`

129 linhas · caminho: `apps/dashboard/src/lib/branding.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`
- importado por: `dashboard/components/sessions/ConnectLinkDialog.tsx`, `dashboard/main.tsx`, `dashboard/routes/Branding.tsx`, `dashboard/routes/Conectar.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Login.tsx`

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
  - chamado por: `ConnectLinkDialog` (ConnectLinkDialog.tsx:55), `Branding` (Branding.tsx:7), `Conectar` (Conectar.tsx:65), `Dashboard` (Dashboard.tsx:16), `Login` (Login.tsx:6)

**Tipos**
- interface `BrandingState` L90 · 2 propriedade(s)

## `dashboard/lib/combobox-keys.spec.ts`

132 linhas · caminho: `apps/dashboard/src/lib/combobox-keys.spec.ts`
- importa (interno): `dashboard/lib/combobox-keys.ts`

- describe “initialActive” · L39
  - it “a escolha atual se habilitada; senão a 1ª habilitada; -1 sem nenhuma” · L40
- describe “comboKey — fechado” · L48
  - it “Alt+↓ também abre na escolha atual” · L53
  - it “↓ sem escolha (ou escolha desabilitada) abre na 1ª habilitada” · L57
  - it “↑ e Home abrem na 1ª; End abre na última (pulando desabilitadas)” · L65
  - it “outras teclas (Tab, Esc, letras) não fazem nada com a lista fechada” · L77
- describe “comboKey — aberto” · L84
  - it “Alt+↑ escolhe a destacada; ↑ sozinho só move” · L89
  - it “Enter sem destaque (ou em desabilitada) só fecha” · L94
  - it “setas, Home/End e PageUp/PageDown movem pulando desabilitadas” · L102
  - it “↓ na última fica na última (sem dar a volta)” · L119
  - it “Esc fecha com preventDefault; Tab fecha SEM escolher e deixa o foco seguir” · L123
  - it “letras não fazem nada (sem busca por digitação)” · L128

## `dashboard/lib/combobox-keys.ts`

69 linhas · caminho: `apps/dashboard/src/lib/combobox-keys.ts`
- importa (interno): `dashboard/lib/proxy-usage.ts`
- importado por: `dashboard/components/proxies/ProxyPicker.tsx`, `dashboard/lib/combobox-keys.spec.ts`

**Funções e constantes de topo**
- `initialActive(items, selectedIndex)` · L30
  - chama: `moveActive` (proxy-usage.ts:287)
  - chamado por: `ProxyPicker` (ProxyPicker.tsx:74), `comboKey` L39
- `comboKey(input)` · L39
  - chama: `initialActive` L30, `moveActive` (proxy-usage.ts:287)
  - chamado por: `ProxyPicker` (ProxyPicker.tsx:74)

**Tipos**
- type `ComboKeyResult` L13

## `dashboard/lib/connect-link-memory.spec.ts`

53 linhas · caminho: `apps/dashboard/src/lib/connect-link-memory.spec.ts`
- importa (interno): `dashboard/lib/connect-link-memory.ts`

- describe “connect-link-memory” · L19
  - it “devolve a URL só para o mesmo link, ativo, e o mesmo usuário” · L20
  - it “revogar apaga a sessão; logout apaga tudo” · L34
  - it “criar outro link na mesma sessão substitui a URL guardada” · L44

## `dashboard/lib/connect-link-memory.ts`

46 linhas · caminho: `apps/dashboard/src/lib/connect-link-memory.ts`
- importa (interno): `contracts/index.ts`
- importado por: `dashboard/components/sessions/ConnectLinkDialog.tsx`, `dashboard/lib/auth.tsx`, `dashboard/lib/connect-link-memory.spec.ts`

**Funções e constantes de topo**
- `remembered` = `new Map< string, { linkId: string; url: string; userId: string } >()` · L7
- `rememberLinkUrl(sessionId, linkId, url, userId)` · L13
  - chamado por: `ConnectLinkDialog` (ConnectLinkDialog.tsx:55)
- `recallLinkUrl(sessionId, link, userId)` · L24
  - chamado por: `ConnectLinkDialog` (ConnectLinkDialog.tsx:55)
- `forgetLinkUrl(sessionId)` · L38
  - chamado por: `ConnectLinkDialog` (ConnectLinkDialog.tsx:55)
- `clearRememberedLinkUrls()` · L43
  - chamado por: `AuthProvider` (auth.tsx:24)

## `dashboard/lib/connect-link.spec.ts`

781 linhas · caminho: `apps/dashboard/src/lib/connect-link.spec.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/connect-link.ts`

- describe “token no fragmento” · L81
  - it “readTokenFromHash: tira o #, aceita t=, valida 43 chars base64url” · L82
  - it “pickToken: # manda; hash vazio (recarregou) usa o guardado; # inválido não cai no guardado” · L93
  - it “buildConnectUrl e isPublicPath” · L102
  - it “isQrDataUrl: só PNG base64” · L112
- describe “buildShareText” · L120
  - it “começa pela instrução de abrir em outra tela; URL sozinha numa linha” · L123
  - it “nome da marca configurado entra na instrução” · L140
- describe “mesmo celular” · L152
  - it “uaSaysMobile: UA-CH quando existe; senão o token "Mobi"” · L160
  - it “isLikelyPhone: celular sim; tablet, desktop com toque e janela estreita não” · L168
- describe “view model da página /conectar” · L186
  - it “sem token = link inválido (texto do 404), terminal” · L187
  - it “antes da 1ª resposta: carregando, sem anúncio” · L195
  - it “PREPARING explica a espera e o "acabei de ler"” · L262
  - it “fase QR com qr que não é PNG base64 não mostra nada (fica "preparando")” · L269
  - it “IDLE sem tentativas → esgotado, sem botão, sem parar de consultar” · L277
  - it “IDLE: "restam N" só com ≤ 2; intervalo entre pedidos segura o botão” · L299
  - it “CONNECTED → sucesso com a hora, terminal” · L319
  - it “410 USED: sucesso se esta aba já viu o link ativo; senão "já usado"” · L334
  - it “sem rede: mantém o QR por até 15 s, depois esconde; backoff 2→4→8→10 s” · L404
  - it “com falha registrada, o QR some no re-render dos 15 s (refreshAt)” · L440
  - it “SEM falha (GET pendurado, aba que volta): QR com mais de 15 s vira "Atualizando o código…"” · L445
  - it “429 sem code (teto por IP): 30 s; 5xx conta como falha transitória” · L474
  - it “"Mostrar QR": mostra preparando até o servidor sair do IDLE ou 45 s” · L495
  - it “"Mostrar QR" com limite/falha/rede: aviso, sem retry; 410 é terminal” · L569
  - it “expiryInfo: validade dd/mm às hh:mm e aviso com menos de 10 min” · L599
- describe “diálogo do painel” · L612
  - it “defaultExpectedPhone: último número > atual > informado; LID não é telefone” · L630
  - it “defaultExpectedPhone: phoneNumber sem DDI ganha o 55” · L650
  - it “looksLikeBrNational: DDD + celular/fixo sem o 55” · L675
  - it “isValidExpectedPhone / expectedPhoneError: 10 a 15 dígitos e com DDI” · L686
  - it “lastSeenLabel” · L701
  - it “describeLink ACTIVE: validade, aberto, QR pedidos e número esperado” · L712
  - it “describeLink CONNECTED/USED: hora e número conectado agora” · L725
  - it “describeLink EXPIRED” · L758
  - it “createLinkError: textos dos 409 e oferta de QR novo só no PAIRED” · L764

## `dashboard/lib/connect-link.ts`

705 linhas · caminho: `apps/dashboard/src/lib/connect-link.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/connect-path.ts`, `dashboard/lib/jid.ts`, `dashboard/lib/time-format.ts`
- importado por: `dashboard/components/sessions/ConnectLinkDialog.tsx`, `dashboard/lib/connect-link.spec.ts`, `dashboard/lib/public-connect.ts`, `dashboard/routes/Conectar.tsx`

**Funções e constantes de topo**
- `TOKEN_RE` = `/^[A-Za-z0-9_-]{43}$/` · L19
- `TOKEN_STORAGE_KEY` = `'cz-connect-token'` · L21
- `DEFAULT_PRODUCT_NAME` = `'WhatsApp Gateway'` · L23
- `readTokenFromHash(hash)` · L26
  - chamado por: `pickToken` L34
- `pickToken(hash, stored)` · L34
  - chama: `readTokenFromHash` L26
  - chamado por: `Conectar` (Conectar.tsx:65)
- `buildConnectUrl(origin, token)` · L39
  - chamado por: `ConnectLinkDialog` (ConnectLinkDialog.tsx:55), `Conectar` (Conectar.tsx:65)
- `dayTime(iso)` · L44
  - chama: `clock` (time-format.ts:5)
  - chamado por: `buildShareText` L61, `describeLink` L630, `expiryInfo` L549
- `isDefaultProductName(name)` · L53
  - chamado por: `buildShareText` L61, `Conectar` (Conectar.tsx:65)
- `buildShareText({ url, expiresAt, productName, })` · L61
  - chama: `dayTime` L44, `isDefaultProductName` L53
  - chamado por: `ConnectLinkDialog` (ConnectLinkDialog.tsx:55)
- `uaSaysMobile(uaDataMobile, userAgent)` · L82
  - chamado por: `detectPhone` (Conectar.tsx:45)
- `isLikelyPhone({ uaMobile, coarse, width, })` · L92
  - chamado por: `detectPhone` (Conectar.tsx:45)
- `isQrDataUrl(s)` · L104
  - chamado por: `activeView` L381
- `STEPS_ANDROID` = `'WhatsApp → ⋮ (três pontinhos) → Aparelhos conectados → Conectar um a…` · L107
- `STEPS_IPHONE` = `'WhatsApp → Configurações → Aparelhos conectados → Conectar um aparel…` · L109
- `REQUEST_WINDOW_MS` = `45_000` · L138
- `STALE_QR_MS` = `15_000` · L139
- `IP_LIMIT_BACKOFF_MS` = `30_000` · L140
- `POLL_QR_MS` = `2_000` · L141
- `POLL_PREPARING_MS` = `3_000` · L142
- `POLL_IDLE_MS` = `5_000` · L143
- `POLL_SLOW_MS` = `10_000` · L144
- `initialConnectState(now)` · L146
  - chamado por: `Conectar` (Conectar.tsx:65)
- `isTerminalFailure(f)` · L160
  - chamado por: `applyNewQr` L202, `applyPoll` L171, `rawView` L506
- `retryDelayMs(f, failures)` · L165
  - chamado por: `rawView` L506
- `applyPoll(s, r, now)` · L171
  - chama: `isTerminalFailure` L160
  - chamado por: `Conectar` (Conectar.tsx:65)
- `applyNewQr(s, r, now)` · L202
  - chama: `isTerminalFailure` L160
  - chamado por: `Conectar` (Conectar.tsx:65)
- `base(kind, tone, title, body, pollMs)` · L280
  - chamado por: `activeView` L381, `rawView` L506, `successView` L308, `terminalView` L320
- `successView(connectedAt)` · L308
  - chama: `base` L280, `clock` (time-format.ts:5)
  - chamado por: `rawView` L506, `terminalView` L320
- `terminalView(f, sawActive)` · L320
  - chama: `base` L280, `successView` L308
  - chamado por: `rawView` L506
- `transientNotice(f)` · L374
  - chamado por: `rawView` L506
- `activeView(s, d)` · L381
  - chama: `base` L280, `isQrDataUrl` L104, `newQrFailureNotice` L482
  - chamado por: `rawView` L506
- `newQrFailureNotice(f)` · L482
  - chamado por: `activeView` L381
- `connectView(s, hasToken)` · L492
  - chama: `rawView` L506
  - chamado por: `Conectar` (Conectar.tsx:65)
- `rawView(s, hasToken)` · L506
  - chama: `activeView` L381, `base` L280, `isTerminalFailure` L160, `retryDelayMs` L165, `successView` L308, `terminalView` L320, `transientNotice` L374
  - chamado por: `connectView` L492
- `expiryInfo(expiresAt, now)` · L549
  - chama: `dayTime` L44
  - chamado por: `Conectar` (Conectar.tsx:65)
- `looksLikeBrNational(digits)` · L569
  - chamado por: `defaultExpectedPhone` L579, `expectedPhoneError` L606, `isValidExpectedPhone` L601
- `defaultExpectedPhone(s)` · L579
  - chama: `looksLikeBrNational` L569, `isLidJid` (jid.ts:19), `numberFromJid` (jid.ts:11)
  - chamado por: `ConnectLinkDialog` (ConnectLinkDialog.tsx:55)
- `TTL_OPTIONS` = `[ { minutes: 60, label: '1 hora' }, { minutes: 1440, label: '24 horas…` · L593
- `DEFAULT_TTL_MINUTES` = `1440` · L598
- `isValidExpectedPhone(digits)` · L601
  - chama: `looksLikeBrNational` L569
  - chamado por: `expectedPhoneError` L606
- `expectedPhoneError(digits)` · L606
  - chama: `isValidExpectedPhone` L601, `looksLikeBrNational` L569
  - chamado por: `ConnectLinkDialog` (ConnectLinkDialog.tsx:55)
- `lastSeenLabel(lastSeenAt, now)` · L615
  - chama: `since` (time-format.ts:32)
  - chamado por: `describeLink` L630
- `describeLink(link, session, now)` · L630
  - chama: `dayTime` L44, `lastSeenLabel` L615, `formatPhone` (jid.ts:42), `isLidJid` (jid.ts:19), `numberFromJid` (jid.ts:11)
  - chamado por: `ConnectLinkDialog` (ConnectLinkDialog.tsx:55)
- `createLinkError(code, message)` · L681
  - chamado por: `ConnectLinkDialog` (ConnectLinkDialog.tsx:55)

**Tipos**
- interface `ConnectFailure` L116 · 4 propriedade(s)
- type `ConnectResult` L123
- interface `ConnectPageState` L126 · 8 propriedade(s)
- type `ConnectViewKind` L238
- interface `ConnectView` L256 · 16 propriedade(s)

## `dashboard/lib/connect-path.ts`

8 linhas · caminho: `apps/dashboard/src/lib/connect-path.ts`
- importado por: `dashboard/lib/auth.tsx`, `dashboard/lib/connect-link.ts`

**Funções e constantes de topo**
- `CONNECT_PATH` = `'/conectar'` · L3
- `isPublicPath(pathname)` · L5
  - chamado por: `AuthProvider` (auth.tsx:24)

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

## `dashboard/lib/forward-memory.spec.ts`

122 linhas · caminho: `apps/dashboard/src/lib/forward-memory.spec.ts`
- importa (interno): `dashboard/lib/forward-memory.ts`

- describe “forward-memory” · L59
  - it “ida e volta pelo storage (outra instância = recarga da página), com o Map de desfechos” · L60
  - it “apaga no sucesso e vence em 24 h” · L76
  - it “storage corrompido, ausente ou que lança não quebra (fica só em memória)” · L106

## `dashboard/lib/forward-memory.ts`

118 linhas · caminho: `apps/dashboard/src/lib/forward-memory.ts`
- importa (interno): `dashboard/lib/forward.ts`
- importado por: `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/lib/forward-memory.spec.ts`

**Funções e constantes de topo**
- `MEMORY_KEY` = `'cz:fwd-memory:v1'` · L33
- `MEMORY_TTL_MS` = `24 * 60 * 60 * 1000` · L34
- `MEMORY_MAX` = `50` · L35
- `memoryKey(sessionId, msgId)` · L37
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
- `createForwardMemory(storage, now)` · L46
  - chamado por: `forwardMemory` L115
- `sessionStorageOrNull()` · L106
  - chamado por: `forwardMemory` L115
- `forwardMemory` = `createForwardMemory( sessionStorageOrNull(), )` · L115
  - chama: `createForwardMemory` L46, `sessionStorageOrNull` L106

**Tipos**
- type `ForwardBanner` L13
- interface `ForwardSnapshot` L15 · 8 propriedade(s)
- interface `Stored` L26 · 2 propriedade(s)
- type `StorageLike` L31
- interface `ForwardMemory` L40
  - `ForwardMemory.get(key)` · L41
    - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
  - `ForwardMemory.set(key, snap)` · L42
    - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
  - `ForwardMemory.delete(key)` · L43
    - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)

## `dashboard/lib/forward.spec.ts`

1111 linhas · caminho: `apps/dashboard/src/lib/forward.spec.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/forward.ts`

- describe “regras espelhadas do gateway (ida e volta)” · L84
  - it “tipos encaminháveis e limites iguais aos do gateway” · L85
  - it “destinationOf aceita e recusa o mesmo que o canonicalDestination” · L114
  - it “sameDestination bate com o findDuplicate (9º dígito, sufixos, aparelho)” · L131
- describe “canForward / canQuickForward” · L152
  - it “só os tipos que o gateway encaminha” · L153
  - it “texto vazio ou miniatura legada = "não suportada" → sem ação” · L173
  - it “wwebjs `other` com arquivo continua fora (o gateway decide pelo type)” · L182
  - it “mídia sem legenda e vCard legado entram” · L188
  - it “atalho ↪ como o do WhatsApp Web: mídia, localização e contato — sem voz/figurinha/"com frequência"” · L197
- describe “maxGroupsFor / willBecomeFrequent (regras do WhatsApp)” · L235
  - it “mensagem que já veio encaminhada: só 1 grupo” · L236
  - it “aviso quando a cópia vai virar "com frequência" (terceiro com contador 4)” · L242
- describe “maxTargetsFor” · L259
  - it “5; 1 quando a original tem forwardingScore ≥ 5” · L260
- describe “forwardTargets” · L269
  - it “descarta o que o gateway recusa e a mesma conversa repetida, mantendo a ordem” · L280
  - it “rótulos: nome + telefone; sem nome = telefone formatado; grupo; lid” · L289
  - it “busca sem acento, por nome ou por número (com ou sem formatação)” · L306
- describe “toggleTarget” · L330
  - it “marca e desmarca na ordem” · L340
  - it “recusa o gêmeo do 9º dígito (o gateway daria 400)” · L349
  - it “respeita o limite (5, ou 1 com "encaminhada com frequência")” · L358
  - it “mensagem já encaminhada: o 2º grupo é recusado” · L380
- describe “planAttempt (idempotencyKey por clique)” · L392
  - it “mesmo pedido (mesma mensagem e conjunto, em qualquer ordem) reaproveita a chave” · L401
  - it “conjunto ou mensagem diferente → chave nova” · L411
  - it “newForwardKey cabe na chave derivada do gateway (≤ 200 com o destino)” · L422
- describe “outcomeOf” · L431
  - it “enviada, repetição, sem confirmação e tempo esgotado ficam travadas (nunca reenviar)” · L432
  - it “423: 1º contato × pedido inteiro bloqueado” · L461
  - it “409 num destino: "em andamento" trava como pode-ter-saído; conflito de chave falha sem retry” · L474
  - it “recusas da MENSAGEM: motivo curto na linha, sem retry” · L495
  - it “falha de envio genérica mostra o motivo do servidor e deixa tentar de novo” · L540
- describe “attemptSummary” · L553
  - it “tudo ok, parcial, sem confirmação e nada” · L554
- describe “forwardFailure” · L595
  - it “sem status (rede): tentar de novo não duplica” · L596
  - it “423 conta os destinos de 1º contato e não oferece retry” · L606
  - it “aparelho desconectado (as 3 grafias do gateway)” · L635
  - it “recusas antes de enviar (code) e 404: travam o ➤ (final) ou limitam a 1” · L653
  - it “409 de conflito de chave pede chave nova (a mesma daria 409 para sempre)” · L738
  - it “409, 429 e 5xx deixam tentar o mesmo pedido” · L760
  - it “400 genérico: motivo do servidor; retry só se algum item permite” · L766
  - it “resultsFromError valida o corpo” · L790
- describe “forwardedNotice” · L801
  - it “1, 2 e muitos” · L802
- describe “resultsVerdict” · L814
  - it “recusa da mensagem, limite vivo e o que vale repetir” · L815
- describe “mergeOutcomes / allClean” · L850
  - it “casa cada resultado pelo target (ordem trocada não confunde) e soma ao que já se sabia” · L857
  - it “target desconhecido cai na posição; sem conversa marcada não é "limpo"” · L887
- describe “revisão E25” · L911
  - it “423 diz o estado real do guard-rail (quarentena, banida, pausa manual)” · L915
  - it “desfecho incerto congela o pedido (sem resposta, 5xx, 409 em andamento); 429 não” · L934
  - it “falha com results[] resume destino a destino — nunca "Não encaminhada" sobre um "pode ter saído"” · L961
  - it “allClean nunca aceita "pode ter saído"” · L1007
  - it “attemptSummary com "pode ter saído" sozinho e junto de enviada” · L1024
  - it “busca só com dígitos também acha pelo nome ("Turma 2024")” · L1037
- describe “revisão E25 — 2ª rodada” · L1049
  - it “409 num destino: textos (em andamento × conflito)” · L1050
  - it “409 do pedido COM results[] resume destino a destino (não "em andamento" genérico) e marca summary” · L1075
  - it “summarizeOutcomes: singular sem "nenhuma das 1" e o histórico do diálogo inteiro” · L1097

## `dashboard/lib/forward.ts`

730 linhas · caminho: `apps/dashboard/src/lib/forward.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/jid.ts`, `dashboard/lib/message-format.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/lib/forward-memory.ts`, `dashboard/lib/forward.spec.ts`

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
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58), `canQuickForward` L55
- `maxGroupsFor(m)` · L75
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
- `willBecomeFrequent(m)` · L86
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
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
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
- `searchTargets(targets, query)` · L204
  - chama: `foldText` L168
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
- `toggleTarget(selected, target, max, maxGroups)` · L227
  - chama: `sameDestination` L160
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
- `FREQUENT_LIMIT_TEXT` = `'As mensagens encaminhadas com frequência podem ser compartilhadas co…` · L255
- `refusalText(r)` · L258
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
- `planAttempt(prev, msgId, targets, newKey)` · L281
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
- `newForwardKey()` · L301
- `outcomeOf(r)` · L324
  - chamado por: `mergeOutcomes` L418, `resultsVerdict` L704
- `mergeOutcomes(prev, results, att)` · L418
  - chama: `outcomeOf` L324
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
- `allClean(keys, outcomes)` · L434
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
- `withPeriod(s)` · L447
  - chamado por: `forwardFailure` L558
- `attemptSummary(results)` · L452
  - chama: `summarizeOutcomes` L461
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58), `forwardFailure` L558
- `summarizeOutcomes(outs)` · L461
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58), `attemptSummary` L452
- `resultsFromError(err)` · L516
  - chamado por: `forwardFailure` L558
- `forwardFailure(err, deviceName)` · L558
  - chama: `attemptSummary` L452, `resultsFromError` L516, `resultsVerdict` L704, `withPeriod` L447
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58)
- `resultsVerdict(results)` · L704
  - chama: `outcomeOf` L324
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58), `forwardFailure` L558
- `forwardedNotice(names)` · L723
  - chamado por: `ChatThread` (ChatThread.tsx:39)

**Tipos**
- type `Forwardable` L30
- type `TargetKind` L100
- interface `ForwardTarget` L102 · 9 propriedade(s)
- type `ToggleRefusal` L222
- interface `ForwardAttempt` L274 · 4 propriedade(s)
- type `OutcomeKind` L305
- interface `TargetOutcome` L308 · 4 propriedade(s)
- interface `ForwardErrorLike` L507 · 4 propriedade(s)
- interface `ForwardFailure` L532 · 8 propriedade(s)

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
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/components/sessions/ConnectLinkDialog.tsx`, `dashboard/lib/connect-link.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/jid.spec.ts`, `dashboard/lib/session-filter.ts`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/Sessions.tsx`

**Funções e constantes de topo**
- `stripDevice(jid)` · L6
  - chamado por: `ChatThread` (ChatThread.tsx:39), `forwardTargets` (forward.ts:174), `groupSenderLabel` L54
- `numberFromJid(jid)` · L11
  - chamado por: `who` (Reactions.tsx:8), `defaultExpectedPhone` (connect-link.ts:579), `describeLink` (connect-link.ts:630), `displayName` L27, `groupSenderLabel` L54, `sendTarget` L22, `sessionNumbers` (session-filter.ts:100), `Atendimento` (Atendimento.tsx:73), `Sessions` (Sessions.tsx:321)
- `isPhoneJid(jid)` · L16
  - chamado por: `who` (Reactions.tsx:8), `groupSenderLabel` L54, `sendTarget` L22
- `isGroupJid(jid)` · L18
  - chamado por: `ChatThread` (ChatThread.tsx:39), `groupSenderLabel` L54, `Inbox` (Inbox.tsx:19)
- `isLidJid(jid)` · L19
  - chamado por: `defaultExpectedPhone` (connect-link.ts:579), `describeLink` (connect-link.ts:630)
- `sendTarget(chatJid)` · L22
  - chama: `isPhoneJid` L16, `numberFromJid` L11
  - chamado por: `Atendimento` (Atendimento.tsx:73), `Inbox` (Inbox.tsx:19)
- `displayName(c)` · L27
  - chama: `numberFromJid` L11
  - chamado por: `forwardTargets` (forward.ts:174), `Atendimento` (Atendimento.tsx:73), `Avatar` (Inbox.tsx:403), `Inbox` (Inbox.tsx:19)
- `isTriageExcludedChat(jid)` · L36
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `formatPhone(digits)` · L42
  - chamado por: `who` (Reactions.tsx:8), `ConnectLinkDialog` (ConnectLinkDialog.tsx:55), `describeLink` (connect-link.ts:630), `forwardTargets` (forward.ts:174), `groupSenderLabel` L54
- `groupSenderLabel(m)` · L54
  - chama: `formatPhone` L42, `isGroupJid` L18, `isPhoneJid` L16, `numberFromJid` L11, `stripDevice` L6
  - chamado por: `MessageBubble` (MessageBubble.tsx:30)
- `senderColor(key)` · L81
  - chamado por: `MessageBubble` (MessageBubble.tsx:30)

## `dashboard/lib/live-events.spec.ts`

510 linhas · caminho: `apps/dashboard/src/lib/live-events.spec.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/live-events.ts`

- describe “parseLiveEvent” · L51
  - it “ack válido; status desconhecido, sem keyId e eventos alheios → null” · L52
  - it “reação (inclusive remoção com emoji "")” · L93
  - it “message → item do fluxo com selo e sem status” · L116
- describe “ACK (P-072 — só exibição)” · L150
  - it “ackRank: sent<delivered<read; resto = 0” · L151
  - it “applyAck: sobe, nunca regride, casa por sessionId+keyId, mesma referência sem mudança” · L166
  - it “AckMemory: ACK antes da mensagem e GET sem o status (no-op no banco)” · L183
  - it “tickFor: só fromMe; sem grupo/transmissão/canal; null/desconhecido = sem tique” · L206
- describe “reações ao vivo” · L240
  - it “reactionSenderKey é idêntico ao do gateway (48 combinações)” · L241
  - it “1:1: uma por pessoa, troca, remoção, @lid × telefone, fora de ordem, outra sessão” · L280
  - it “grupo: uma por participante (sem sufixo de aparelho), ordem por horário” · L311
  - it “reação de OUTRA pessoa com horário anterior entra na posição do horário (não no fim)” · L348
  - it “reactionChips: mais usado primeiro, empate = o que apareceu antes, "mine"” · L369
  - it “replayReactions: GET que saiu antes do evento não apaga a reação; o banco mais novo vence” · L390
  - it “replayReactions: margem de 2 s para o persister assíncrono do gateway (limite exato)” · L406
  - it “replayReactions: não ressuscita reação removida enquanto o SSE esteve fora” · L421
- describe “fluxo ao vivo e recarga estável” · L432
  - it “upsertFeedItem: dedup por sessionId+keyId (não só keyId) e sem regredir status” · L433
  - it “mergeFeed: GET que leu o banco antes do INSERT não apaga o item recebido pelo SSE” · L452
  - it “stabilize: ignora a mediaUrl que muda a cada leitura; reaproveita objetos” · L484

## `dashboard/lib/live-events.ts`

472 linhas · caminho: `apps/dashboard/src/lib/live-events.ts`
- importa (interno): `contracts/index.ts`
- importado por: `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/Ticks.tsx`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/use-live-stream.ts`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Inbox.tsx`

**Funções e constantes de topo**
- `ackRank(status)` · L21
  - chamado por: `applyAck` L142, `overlayAcks` L182, `parseLiveEvent` L70, `rememberAck` L166, `upsertFeedItem` L384
- `str(v)` · L65
  - chamado por: `parseLiveEvent` L70
- `num(v)` · L67
  - chamado por: `parseLiveEvent` L70
- `parseLiveEvent(data, nowSec)` · L70
  - chama: `ackRank` L21, `num` L67, `str` L65
  - chamado por: `useLiveStream` (use-live-stream.ts:11)
- `applyAck(list, ev)` · L142
  - chama: `ackRank` L21
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `memKey(sessionId, keyId)` · L164
  - chamado por: `overlayAcks` L182, `rememberAck` L166
- `rememberAck(mem, ev, max)` · L166
  - chama: `ackRank` L21, `memKey` L164
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `overlayAcks(list, mem)` · L182
  - chama: `ackRank` L21, `memKey` L164
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `NO_TICK_CHAT` = `/@(g\.us|broadcast|newsletter)$/` · L199
- `tickFor(m)` · L201
  - chamado por: `Ticks` (Ticks.tsx:6)
- `TICK_LABEL` = `{ sent: 'Enviada', delivered: 'Entregue', read: 'Lida', }` · L221
- `reactionSenderKey(p)` · L238
  - chamado por: `applyReaction` L253
- `tsMs(iso)` · L248
  - chamado por: `applyReaction` L253
- `applyReaction(list, ev)` · L253
  - chama: `reactionSenderKey` L238, `tsMs` L248
  - chamado por: `replayReactions` L321, `Atendimento` (Atendimento.tsx:73)
- `REACTION_REPLAY_MARGIN_MS` = `2000` · L309
- `rememberReaction(mem, ev, receivedAt, max)` · L311
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `replayReactions(list, mem, requestedAt)` · L321
  - chama: `applyReaction` L253
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `reactionChips(reactions)` · L337
  - chamado por: `Reactions` (Reactions.tsx:15)
- `feedItemFromEvent(ev)` · L365
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `upsertFeedItem(feed, item, max)` · L384
  - chama: `ackRank` L21
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `rememberFeedItem(mem, item, receivedAt, max)` · L407
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `mergeFeed(rows, mem, requestedAt, max)` · L419
  - chamado por: `Atendimento` (Atendimento.tsx:73)
- `sameIgnoringMediaUrl(a, b)` · L447
  - chamado por: `stabilize` L458
- `stabilize(prev, next)` · L458
  - chama: `sameIgnoringMediaUrl` L447
  - chamado por: `Atendimento` (Atendimento.tsx:73), `Inbox` (Inbox.tsx:19)

**Tipos**
- type `AckStatus` L11
- interface `LiveAck` L30 · 4 propriedade(s)
- interface `LiveReaction` L37 · 8 propriedade(s)
- interface `LiveMessage` L48 · 12 propriedade(s)
- type `LiveEvent` L63
- interface `Ackable` L134 · 3 propriedade(s)
- type `AckMemory` L162
- type `Tick` L197
- interface `Reactable` L229 · 4 propriedade(s)
- interface `ReactionMemoryItem` L303 · 2 propriedade(s)
- type `ReactionMemory` L307
- interface `FeedMemoryItem` L401 · 2 propriedade(s)
- type `FeedMemory` L405
- type `WithId` L445

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
    - chamado por: `AuthProvider` (auth.tsx:24)
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
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58), `MessageBubble` (MessageBubble.tsx:30), `bubbleContent` L265, `messagePreview` L101
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
  - chamado por: `ForwardDialog` (ForwardDialog.tsx:58), `MessageBubble` (MessageBubble.tsx:30), `conversationPreview` L141, `Atendimento` (Atendimento.tsx:73)
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

## `dashboard/lib/proxy-suggestion.spec.ts`

504 linhas · caminho: `apps/dashboard/src/lib/proxy-suggestion.spec.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/proxy-suggestion.ts`, `dashboard/lib/time-format.ts`

- describe “isValidSessionName (mesma regex do create no gateway)” · L69
  - it “aceita letras, números, _ e -, de 1 a 64” · L70
  - it “recusa vazio, >64, espaço, acento e outros símbolos” · L76
- describe “suggestionView (E26)” · L83
  - it “sem sugestão: só a lista, sem proxy, sem aviso” · L84
  - it “disponível e na lista: pré-seleciona com o texto de sugestão” · L95
  - it “lista chegando DEPOIS da sugestão: pré-seleciona do mesmo jeito” · L108
  - it “available fora da lista (lista velha): vira opção extra, na ordem de posição, pré-selecionada” · L118
  - it “nome mudando desfaz a pré-seleção (resposta de outro nome é ignorada)” · L125
  - it “forName diferente ignorado mesmo com o proxy fora da lista (sem opção extra)” · L133
  - it “escolha manual preservada: sugerido livre vira aviso + "Usar este proxy"” · L144
  - it “choice '' (dono escolheu Sem proxy) é preservada” · L156
  - it “dono aplicou a sugestão (choice = sugerido): fica selecionado, sem botão” · L165
  - it “manualChoiceLost: escolha manual saiu da lista → Sem proxy + aviso” · L172
  - it “manualChoiceLost com sugerido livre: os dois avisos e o botão” · L182
  - it “IN_USE: cita a sessão que está com o proxy; sem nome, "outra sessão"” · L192
  - it “IN_USE com o proxy na lista (vermelho): avisa que dá para escolher, sem pré-selecionar” · L218
  - it “DEAD/DISABLED nunca ganham a dica de compartilhar (só IN_USE na lista)” · L240
  - it “DEAD e DISABLED: avisam sem pré-selecionar” · L249
  - it “REMOVED com proxy null: frase sem #N (nunca lê proxy.*)” · L274
  - it “proxy null mesmo com available:true (defensivo) não quebra nem pré-seleciona” · L288
  - it “label null: só "#N"” · L296
  - it “diferença de caixa: pré-seleciona, cita o nome como foi apagado e avisa” · L307
  - it “create segurado (held): pede para conferir e criar de novo” · L318
  - it “tempo: "agora", horas e, depois de 24 h, data e hora” · L325
  - it “data null (sem memória ou erro): nada muda” · L339
- describe “mustHoldCreate (E26)” · L346
  - it “segura: automático, nome válido e a sugestão desse nome ainda não chegou” · L349
  - it “não segura com escolha do dono (manual ou Sem proxy)” · L354
  - it “não segura se a sugestão já resolveu para esse nome” · L359
  - it “não segura com nome inválido ou já em uso” · L363
- describe “decideAfterHold (E26 — "Criar" segurado depois da consulta)” · L370
  - it “sugestão pré-selecionável (via "Sem proxy" no clique) → segura” · L393
  - it “sugestão null, indisponível ou REMOVED → cria com ""” · L397
  - it “erro ou teto SEM mudança na tela → cria com o que está na tela” · L409
  - it “erro ou teto COM mudança (o debounce pré-selecionou na espera) → segura” · L420
  - it “o dono via o sugerido (resposta velha) e agora está IN_USE → segura” · L426
  - it “pré-seleção igual à vista no clique → cria com ela” · L435
  - it “escolha manual feita durante a espera → cria com a escolha” · L442
  - it “nome mudado durante a espera → não cria” · L452
- describe “suggestionView — sugerido livre que a lista mostra em uso (E28)” · L465
  - it “não pré-seleciona, sem "sugerido"/botão, e avisa quem usa” · L468
  - it “o "Criar" segurado recalcula com a lista: o valor final continua vazio (não cria com o vermelho)” · L480
  - it “a lista sem ninguém no sugerido mantém a pré-seleção da E26” · L494
  - it “sem `inUseBy` (chamador antigo) o comportamento da E26 não muda” · L500

## `dashboard/lib/proxy-suggestion.ts`

256 linhas · caminho: `apps/dashboard/src/lib/proxy-suggestion.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/time-format.ts`
- importado por: `dashboard/lib/proxy-suggestion.spec.ts`, `dashboard/routes/Sessions.tsx`

**Funções e constantes de topo**
- `SESSION_NAME_RE` = `/^[a-zA-Z0-9_-]{1,64}$/` · L16
- `isValidSessionName(trimmed)` · L18
  - chamado por: `mustHoldCreate` L211, `Sessions` (Sessions.tsx:321)
- `proxyShortLabel(p)` · L73
  - chamado por: `suggestionView` L128, `unavailableText` L101
- `releasedText(releasedAt, now)` · L80
  - chama: `fullDateTime` (time-format.ts:13), `since` (time-format.ts:32)
  - chamado por: `sessionRef` L87
- `sessionRef(data, trimmedName, now)` · L87
  - chama: `releasedText` L80
  - chamado por: `suggestionView` L128
- `unavailableText(data, ref, pickable)` · L101
  - chama: `proxyShortLabel` L73
  - chamado por: `suggestionView` L128
- `suggestionView(input)` · L128
  - chama: `proxyShortLabel` L73, `sessionRef` L87, `unavailableText` L101
  - chamado por: `Sessions` (Sessions.tsx:321)
- `mustHoldCreate(input)` · L211
  - chama: `isValidSessionName` L18
  - chamado por: `Sessions` (Sessions.tsx:321)
- `decideAfterHold(input)` · L238
  - chamado por: `Sessions` (Sessions.tsx:321)

**Tipos**
- interface `SuggestionState` L23 · 2 propriedade(s)
- type `SuggestionTone` L28
- interface `SuggestionNote` L30 · 2 propriedade(s)
- interface `SuggestionViewInput` L35 · 7 propriedade(s)
- interface `SuggestionView` L51 · 7 propriedade(s)
- type `HoldDecision` L233

## `dashboard/lib/proxy-usage.spec.ts`

415 linhas · caminho: `apps/dashboard/src/lib/proxy-usage.spec.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/proxy-usage.ts`

- describe “proxyUsageView — criação (sem sessão própria)” · L53
  - it “sem sessões → verde "livre"” · L54
  - it “1 sessão → vermelho "em uso por 1 sessão" com o nome na dica” · L64
  - it “3 sessões → plural e todos os nomes na ordem do gateway” · L74
- describe “proxyUsageView — sessão já criada (conta só as OUTRAS)” · L87
  - it “ninguém usa → "livre"” · L88
  - it “só a própria usa → verde "só esta sessão"” · L96
  - it “outra usa → vermelho "em uso por 1 outra sessão"” · L106
  - it “a própria + 2 outras → "2 outras sessões" e a dica cita esta sessão” · L112
- describe “isSelectableProxy / unavailableText” · L131
  - it “habilitado e ALIVE/UNTESTED pode; desativado ou DEAD não” · L132
  - it “motivo: desativado tem prioridade sobre DEAD; elegível → null” · L141
- describe “proxyOptionLabel” · L155
  - it “rótulo quando existe; senão host:porta; país e status” · L156
- describe “needsShareConsent / consentimento na escolha / sharedNote” · L166
  - it “só pede compartilhar quando o proxy está vermelho para quem escolhe” · L167
  - it “consentFromPick: só uma opção vermelha escolhida conta; vazio não vira consentimento” · L177
  - it “shareFromConsent: compartilha só o MESMO proxy que foi escolhido vermelho” · L185
  - it “inUseErrorText: o 400 "em uso" ganha a dica de como compartilhar; o resto passa igual” · L197
  - it “aviso de compartilhado: nomes, quantidade e o sujeito certo” · L206
- describe “seleção para excluir em lote” · L227
  - it “visibleSelection: só os que ainda existem, na ordem da lista” · L230
  - it “selectAllState: none / some / all (ids que sumiram não contam)” · L237
  - it “toggleOne marca e desmarca sem mutar o conjunto original” · L245
  - it “toggleAll: parcial ou vazio → todos; todos → nenhum” · L252
- describe “confirmação da exclusão em lote” · L259
  - it “resumo: ids na ordem da lista, os em uso com sessões e as sessões afetadas sem repetir” · L269
  - it “pergunta com plural certo” · L281
  - it “sem nenhum em uso → sem aviso” · L290
  - it “aviso nomeia proxies e sessões e explica o efeito (fixo × faixa/global)” · L296
  - it “resultado: singular/plural e os que já não existiam” · L309
- describe “moveActive (teclado do seletor, APG select-only)” · L322
  - it “sem opção habilitada → -1” · L326
  - it “first/last pulam desabilitadas nas pontas” · L332
  - it “sem ativa (-1) → primeira habilitada para qualquer movimento relativo” · L337
  - it “next/prev pulam desabilitadas e não dão a volta” · L343
  - it “nas pontas com a atual desabilitada, vai para a ponta habilitada” · L350
  - it “pageDown/pageUp saltam até 10 ou até a ponta” · L356
  - it “pageDown/pageUp com o alvo desabilitado ficam na mais longe habilitada dentro do salto” · L364
  - it “sem habilitada dentro do salto, vai à primeira depois dele (no sentido do salto)” · L371
- describe “gateway anterior à E28 (sem `sessions` no item)” · L382
  - it “hasUsageInfo distingue item com e sem uso” · L388
  - it “vira "uso indisponível" (neutro), não pede compartilhar nem avisa” · L393
  - it “confirmação do lote avisa que não deu para conferir o uso” · L404

## `dashboard/lib/proxy-usage.ts`

335 linhas · caminho: `apps/dashboard/src/lib/proxy-usage.ts`
- importa (interno): `contracts/index.ts`
- importado por: `dashboard/lib/combobox-keys.ts`, `dashboard/lib/proxy-usage.spec.ts`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`

**Funções e constantes de topo**
- `plural(n, one, many)` · L27
  - chamado por: `bulkDeleteQuestion` L250, `bulkDeleteWarning` L256, `proxyUsageView` L41, `sharedNote` L159
- `hasUsageInfo(p)` · L32
  - chamado por: `bulkDeleteSummary` L223, `proxyUsageView` L41, `sessionsOf` L36, `Sessions` (Sessions.tsx:321)
- `sessionsOf(p)` · L36
  - chama: `hasUsageInfo` L32
  - chamado por: `bulkDeleteSummary` L223, `proxyUsageView` L41
- `proxyUsageView(p, ownSessionId)` · L41
  - chama: `hasUsageInfo` L32, `plural` L27, `sessionsOf` L36
  - chamado por: `needsShareConsent` L120, `sharedNote` L159, `assignmentOptions` (Proxies.tsx:726), `UsageCell` (Proxies.tsx:63), `Sessions` (Sessions.tsx:321)
- `isSelectableProxy(p)` · L92
  - chamado por: `assignmentOptions` (Proxies.tsx:726)
- `unavailableText(p)` · L99
  - chamado por: `assignmentOptions` (Proxies.tsx:726)
- `proxyOptionLabel(p)` · L108
  - chamado por: `assignmentOptions` (Proxies.tsx:726), `Sessions` (Sessions.tsx:321)
- `needsShareConsent(p, ownSessionId)` · L120
  - chama: `proxyUsageView` L41
- `consentFromPick(id, tone)` · L136
  - chamado por: `AssignmentRow` (Proxies.tsx:758), `Sessions` (Sessions.tsx:321)
- `shareFromConsent(proxyId, consent)` · L143
  - chamado por: `AssignmentRow` (Proxies.tsx:758), `Sessions` (Sessions.tsx:321)
- `inUseErrorText(message)` · L151
  - chamado por: `AssignmentRow` (Proxies.tsx:758), `Sessions` (Sessions.tsx:321)
- `sharedNote(p, ownSessionId)` · L159
  - chama: `plural` L27, `proxyUsageView` L41
  - chamado por: `AssignmentRow` (Proxies.tsx:758), `Sessions` (Sessions.tsx:321)
- `visibleSelection(selected, proxies)` · L179
  - chamado por: `selectAllState` L186
- `selectAllState(selected, proxies)` · L186
  - chama: `visibleSelection` L179
  - chamado por: `toggleAll` L206, `Proxies` (Proxies.tsx:87)
- `toggleOne(selected, id)` · L195
  - chamado por: `Proxies` (Proxies.tsx:87)
- `toggleAll(selected, proxies)` · L206
  - chama: `selectAllState` L186
  - chamado por: `Proxies` (Proxies.tsx:87)
- `bulkDeleteSummary(selected, proxies)` · L223
  - chama: `hasUsageInfo` L32, `sessionsOf` L36
  - chamado por: `Proxies` (Proxies.tsx:87)
- `bulkDeleteQuestion(n)` · L250
  - chama: `plural` L27
  - chamado por: `Proxies` (Proxies.tsx:87)
- `bulkDeleteWarning(s)` · L256
  - chama: `plural` L27
  - chamado por: `Proxies` (Proxies.tsx:87)
- `bulkDeleteResultText(r)` · L271
  - chamado por: `Proxies` (Proxies.tsx:87)
- `moveActive(items, from, move)` · L287
  - chamado por: `comboKey` (combobox-keys.ts:39), `initialActive` (combobox-keys.ts:30)

**Tipos**
- type `ProxyUsageTone` L15
- interface `ProxyUsageView` L17 · 5 propriedade(s)
- interface `ShareConsent` L131 · 2 propriedade(s)
- type `SelectAllState` L176
- interface `BulkDeleteSummary` L215 · 4 propriedade(s)
- type `PickerMove` L281

## `dashboard/lib/public-connect.spec.ts`

243 linhas · caminho: `apps/dashboard/src/lib/public-connect.spec.ts`
- importa (interno): `dashboard/lib/api.ts`, `dashboard/lib/public-connect.ts`

- describe “fetchConnectState” · L47
  - it “GET sem cookie, sem cache, Bearer no header e token fora da URL” · L48
  - it “CONNECTED passa” · L71
  - it “410 com code conhecido; code desconhecido é descartado” · L80
  - it “429 do teto por IP (sem code) e corpo não-JSON” · L103
  - it “rede fora ou resposta 200 sem o formato esperado = status 0” · L121
- describe “requestConnectNewQr” · L138
  - it “POST sem corpo e sem Content-Type” · L139
  - it “429 COOLDOWN traz retryAfterSeconds; valor inválido é ignorado” · L159
- describe “prazo das chamadas públicas” · L193
  - it “GET pendurado vira falha de rede (status 0) em 8 s” · L194
  - it “GET repassa o abort de quem chama (desmontar a página)” · L214
  - it “POST new-qr NÃO tem prazo no cliente (o servidor pode levar ~25 s)” · L231

## `dashboard/lib/public-connect.ts`

133 linhas · caminho: `apps/dashboard/src/lib/public-connect.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/connect-link.ts`
- importado por: `dashboard/lib/public-connect.spec.ts`, `dashboard/routes/Conectar.tsx`

**Funções e constantes de topo**
- `isKnownCode(v)` · L16
  - chamado por: `failureFrom` L22
- `failureFrom(res)` · L22 · async
  - chama: `isKnownCode` L16
  - chamado por: `call` L44
- `call(path, token, method, isValid, signal)` · L44 · async
  - chama: `failureFrom` L22
  - chamado por: `fetchConnectState` L95, `requestConnectNewQr` L121
- `isConnectResponse(b)` · L74
- `isNewQrResponse(b)` · L82
- `GET_TIMEOUT_MS` = `8_000` · L89
- `fetchConnectState(token, signal)` · L95 · async
  - chama: `call` L44
  - chamado por: `Conectar` (Conectar.tsx:65)
- `requestConnectNewQr(token, signal)` · L121
  - chama: `call` L44
  - chamado por: `Conectar` (Conectar.tsx:65)

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

## `dashboard/lib/session-filter.spec.ts`

150 linhas · caminho: `apps/dashboard/src/lib/session-filter.spec.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/session-filter.ts`

- describe “session-filter (P-089)” · L37
  - it “sem filtro devolve tudo (cópia, na ordem)” · L59
  - it “nome: contém, sem diferenciar caixa nem acento” · L66
  - it “status: exato, e "desconectadas" = tudo que não está WORKING” · L73
  - it “número: só dígitos, casa com meJid sem aparelho e com phoneNumber” · L82
  - it “número: 9º dígito BR presente ou ausente nos dois sentidos” · L90
  - it “número sem dígitos não filtra; LID não é telefone” · L99
  - it “sessão caída acha pelo lastMeJid (meJid zerado), LID ignorado” · L106
  - it “combina os três filtros (E)” · L125
  - it “URL: ida e volta em pt-BR, vazios saem, outros parâmetros ficam” · L131
  - it “URL: status desconhecido vira "todos"” · L144

## `dashboard/lib/session-filter.ts`

142 linhas · caminho: `apps/dashboard/src/lib/session-filter.ts`
- importa (interno): `contracts/index.ts`, `dashboard/lib/jid.ts`
- importado por: `dashboard/lib/session-filter.spec.ts`, `dashboard/routes/Sessions.tsx`

**Funções e constantes de topo**
- `SESSION_STATUSES` = `[ 'WORKING', 'SCAN_QR_CODE', 'PAIRING_CODE', 'STARTING', 'STOPPED', '…` · L8
- `EMPTY_SESSION_FILTER` = `{ name: '', status: '', number: '', }` · L27
- `isStatusFilter(v)` · L36
  - chamado por: `parseSessionFilter` L44
- `parseSessionFilter(params)` · L44
  - chama: `isStatusFilter` L36
  - chamado por: `Sessions` (Sessions.tsx:321)
- `sessionFilterToParams(filter, base)` · L56
  - chamado por: `Sessions` (Sessions.tsx:321)
- `isSessionFilterActive(filter)` · L71
  - chama: `digitsOf` L82
  - chamado por: `filterSessions` L135, `Sessions` (Sessions.tsx:321)
- `fold(text)` · L78
  - chamado por: `matchesSessionFilter` L114
- `digitsOf(text)` · L82
  - chamado por: `isSessionFilterActive` L71, `matchesSessionFilter` L114, `sessionNumbers` L100
- `numberVariants(digits)` · L88
  - chamado por: `sessionNumbers` L100
- `sessionNumbers(s)` · L100
  - chama: `numberFromJid` (jid.ts:11), `digitsOf` L82, `numberVariants` L88
  - chamado por: `matchesSessionFilter` L114
- `matchesSessionFilter(s, filter)` · L114
  - chama: `digitsOf` L82, `fold` L78, `sessionNumbers` L100
  - chamado por: `filterSessions` L135
- `filterSessions(sessions, filter)` · L135
  - chama: `isSessionFilterActive` L71, `matchesSessionFilter` L114
  - chamado por: `Sessions` (Sessions.tsx:321)

**Tipos**
- type `SessionStatusFilter` L19
- interface `SessionFilter` L21 · 3 propriedade(s)

## `dashboard/lib/time-format.spec.ts`

25 linhas · caminho: `apps/dashboard/src/lib/time-format.spec.ts`
- importa (interno): `dashboard/lib/time-format.ts`

- describe “time-format” · L4
  - it “clock: HH:mm sem segundos” · L5
  - it “since: agora / min / h / d” · L8
  - it “listTime: hora se hoje, dd/mm se não” · L15

## `dashboard/lib/time-format.ts`

40 linhas · caminho: `apps/dashboard/src/lib/time-format.ts`
- importado por: `dashboard/components/chat/MessageBubble.tsx`, `dashboard/lib/connect-link.ts`, `dashboard/lib/proxy-suggestion.spec.ts`, `dashboard/lib/proxy-suggestion.ts`, `dashboard/lib/time-format.spec.ts`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Inbox.tsx`

**Funções e constantes de topo**
- `clock(iso)` · L5
  - chamado por: `MessageBubble` (MessageBubble.tsx:30), `dayTime` (connect-link.ts:44), `successView` (connect-link.ts:308), `listTime` L24, `Atendimento` (Atendimento.tsx:73)
- `fullDateTime(iso)` · L13
  - chamado por: `MessageBubble` (MessageBubble.tsx:30), `releasedText` (proxy-suggestion.ts:80)
- `listTime(iso, now)` · L24
  - chama: `clock` L5
  - chamado por: `Inbox` (Inbox.tsx:19)
- `since(iso, now)` · L32
  - chamado por: `lastSeenLabel` (connect-link.ts:615), `releasedText` (proxy-suggestion.ts:80), `Atendimento` (Atendimento.tsx:73)

## `dashboard/lib/use-live-stream.ts`

73 linhas · caminho: `apps/dashboard/src/lib/use-live-stream.ts`
- importa (interno): `dashboard/lib/api.ts`, `dashboard/lib/live-events.ts`
- importado por: `dashboard/routes/Atendimento.tsx`

**Funções e constantes de topo**
- `useLiveStream(onEvent, onResync)` · L11
  - chama: `parseLiveEvent` (live-events.ts:70)
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
  - chama: `useAuth` (auth.tsx:85), `fmt` L7

## `dashboard/routes/Atendimento.tsx`

698 linhas · caminho: `apps/dashboard/src/routes/Atendimento.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardedTag.tsx`, `dashboard/components/chat/Ticks.tsx`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/jid.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/time-format.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/lib/use-live-stream.ts`

**Funções e constantes de topo**
- `convKey(c)` · L70
  - chamado por: `Atendimento` L73
- `Atendimento()` · L73
  - chama: `useAuth` (auth.tsx:85), `displayName` (jid.ts:27), `isTriageExcludedChat` (jid.ts:36), `numberFromJid` (jid.ts:11), `sendTarget` (jid.ts:22), `applyAck` (live-events.ts:142), `applyReaction` (live-events.ts:253), `feedItemFromEvent` (live-events.ts:365), `mergeFeed` (live-events.ts:419), `overlayAcks` (live-events.ts:182), `rememberAck` (live-events.ts:166), `rememberFeedItem` (live-events.ts:407), `rememberReaction` (live-events.ts:311), `replayReactions` (live-events.ts:321), `stabilize` (live-events.ts:458), `upsertFeedItem` (live-events.ts:384), `conversationPreview` (message-format.ts:141), `messagePreview` (message-format.ts:101), `deviceBlockReason` (send-feedback.ts:16), `sendErrorMessage` (send-feedback.ts:29), `clock` (time-format.ts:5), `since` (time-format.ts:32), `useLiveStream` (use-live-stream.ts:11), `convKey` L70

**Tipos**
- type `StatusFilter` L53

## `dashboard/routes/Audit.tsx`

113 linhas · caminho: `apps/dashboard/src/routes/Audit.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `statusColor(code)` · L9
  - chamado por: `Audit` L15
- `Audit()` · L15
  - chama: `useAuth` (auth.tsx:85), `statusColor` L9

## `dashboard/routes/Branding.tsx`

130 linhas · caminho: `apps/dashboard/src/routes/Branding.tsx`
- importa (interno): `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`

**Funções e constantes de topo**
- `Branding()` · L7
  - chama: `useAuth` (auth.tsx:85), `useBranding` (branding.tsx:126)

## `dashboard/routes/Campaigns.tsx`

408 linhas · caminho: `apps/dashboard/src/routes/Campaigns.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Campaigns()` · L15
  - chama: `useAuth` (auth.tsx:85)
- `Btn({ children, onClick, danger, })` · L369
- `BtnEmerald({ children, onClick, })` · L392

## `dashboard/routes/Conectar.tsx`

440 linhas · caminho: `apps/dashboard/src/routes/Conectar.tsx`
- importa (interno): `dashboard/lib/branding.tsx`, `dashboard/lib/connect-link.ts`, `dashboard/lib/public-connect.ts`

**Funções e constantes de topo**
- `readStoredToken()` · L27
  - chamado por: `Conectar` L65
- `storeToken(token)` · L35
  - chamado por: `Conectar` L65
- `detectPhone()` · L45
  - chama: `isLikelyPhone` (connect-link.ts:92), `uaSaysMobile` (connect-link.ts:82)
- `Conectar()` · L65
  - chama: `useBranding` (branding.tsx:126), `applyNewQr` (connect-link.ts:202), `applyPoll` (connect-link.ts:171), `buildConnectUrl` (connect-link.ts:39), `connectView` (connect-link.ts:492), `expiryInfo` (connect-link.ts:549), `initialConnectState` (connect-link.ts:146), `isDefaultProductName` (connect-link.ts:53), `pickToken` (connect-link.ts:34), `fetchConnectState` (public-connect.ts:95), `requestConnectNewQr` (public-connect.ts:121), `readStoredToken` L27, `storeToken` L35

## `dashboard/routes/Contacts.tsx`

420 linhas · caminho: `apps/dashboard/src/routes/Contacts.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Contacts()` · L12
  - chama: `useAuth` (auth.tsx:85)

## `dashboard/routes/Dashboard.tsx`

261 linhas · caminho: `apps/dashboard/src/routes/Dashboard.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`

**Funções e constantes de topo**
- `Dot({ up })` · L8
- `Dashboard()` · L16
  - chama: `useAuth` (auth.tsx:85), `useBranding` (branding.tsx:126)

## `dashboard/routes/Groups.tsx`

412 linhas · caminho: `apps/dashboard/src/routes/Groups.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Groups()` · L7
  - chama: `useAuth` (auth.tsx:85)
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
  - chama: `useAuth` (auth.tsx:85), `mb` L20, `statusColor` L24

## `dashboard/routes/Inbox.tsx`

420 linhas · caminho: `apps/dashboard/src/routes/Inbox.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/components/chat/ChatThread.tsx`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/jid.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/lib/time-format.ts`

**Funções e constantes de topo**
- `Inbox()` · L19
  - chama: `useAuth` (auth.tsx:85), `displayName` (jid.ts:27), `isGroupJid` (jid.ts:18), `sendTarget` (jid.ts:22), `stabilize` (live-events.ts:458), `conversationPreview` (message-format.ts:141), `deviceBlockReason` (send-feedback.ts:16), `sendErrorMessage` (send-feedback.ts:29), `listTime` (time-format.ts:24)
- `Avatar({ conv })` · L403
  - chama: `displayName` (jid.ts:27)

## `dashboard/routes/License.tsx`

157 linhas · caminho: `apps/dashboard/src/routes/License.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `fmtDate(s)` · L7
  - chamado por: `License` L11
- `License()` · L11
  - chama: `useAuth` (auth.tsx:85), `fmtDate` L7

## `dashboard/routes/Login.tsx`

81 linhas · caminho: `apps/dashboard/src/routes/Login.tsx`
- importa (interno): `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`

**Funções e constantes de topo**
- `Login()` · L6
  - chama: `useAuth` (auth.tsx:85), `useBranding` (branding.tsx:126)

## `dashboard/routes/Monitor.tsx`

137 linhas · caminho: `apps/dashboard/src/routes/Monitor.tsx`
- importa (interno): `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Monitor()` · L14
  - chama: `useAuth` (auth.tsx:85)

**Tipos**
- interface `EventItem` L6 · 5 propriedade(s)

## `dashboard/routes/Proxies.tsx`

942 linhas · caminho: `apps/dashboard/src/routes/Proxies.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/components/proxies/ProxyPicker.tsx`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/proxy-usage.ts`

**Funções e constantes de topo**
- `MODES` = `[ { value: 'NONE', label: 'Sem proxy' }, { value: 'SINGLE', label: 'P…` · L40
- `statusBadge(status)` · L53
  - chamado por: `Proxies` L87
- `UsageCell({ proxy })` · L63
  - chama: `proxyUsageView` (proxy-usage.ts:41)
- `Proxies()` · L87
  - chama: `useAuth` (auth.tsx:85), `bulkDeleteQuestion` (proxy-usage.ts:250), `bulkDeleteResultText` (proxy-usage.ts:271), `bulkDeleteSummary` (proxy-usage.ts:223), `bulkDeleteWarning` (proxy-usage.ts:256), `selectAllState` (proxy-usage.ts:186), `toggleAll` (proxy-usage.ts:206), `toggleOne` (proxy-usage.ts:195), `statusBadge` L53
- `Field({ label, children, })` · L708
- `assignmentOptions(proxies, sessionId, currentId)` · L726
  - chama: `isSelectableProxy` (proxy-usage.ts:92), `proxyOptionLabel` (proxy-usage.ts:108), `proxyUsageView` (proxy-usage.ts:41), `unavailableText` (proxy-usage.ts:99)
  - chamado por: `AssignmentRow` L758
- `AssignmentRow({ session, proxies, assignment, onSaved, onError, onPickerO…)` · L758
  - chama: `consentFromPick` (proxy-usage.ts:136), `inUseErrorText` (proxy-usage.ts:151), `sharedNote` (proxy-usage.ts:159), `shareFromConsent` (proxy-usage.ts:143), `assignmentOptions` L726

## `dashboard/routes/Sessions.tsx`

1051 linhas · caminho: `apps/dashboard/src/routes/Sessions.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/components/proxies/ProxyPicker.tsx`, `dashboard/components/sessions/ConnectLinkDialog.tsx`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/jid.ts`, `dashboard/lib/proxy-usage.ts`, `dashboard/lib/proxy-suggestion.ts`, `dashboard/lib/session-filter.ts`

**Funções e constantes de topo**
- `suggestionWithCap(sessionName)` · L85 · async
  - chamado por: `Sessions` L321
- `StatusBadge({ status })` · L102
- `ConnectModal({ session, onClose, onOpenLink, })` · L111
- `Sessions()` · L321
  - chama: `useAuth` (auth.tsx:85), `numberFromJid` (jid.ts:11), `decideAfterHold` (proxy-suggestion.ts:238), `isValidSessionName` (proxy-suggestion.ts:18), `mustHoldCreate` (proxy-suggestion.ts:211), `suggestionView` (proxy-suggestion.ts:128), `consentFromPick` (proxy-usage.ts:136), `hasUsageInfo` (proxy-usage.ts:32), `inUseErrorText` (proxy-usage.ts:151), `proxyOptionLabel` (proxy-usage.ts:108), `proxyUsageView` (proxy-usage.ts:41), `sharedNote` (proxy-usage.ts:159), `shareFromConsent` (proxy-usage.ts:143), `filterSessions` (session-filter.ts:135), `isSessionFilterActive` (session-filter.ts:71), `parseSessionFilter` (session-filter.ts:44), `sessionFilterToParams` (session-filter.ts:56), `suggestionWithCap` L85

## `dashboard/routes/Users.tsx`

259 linhas · caminho: `apps/dashboard/src/routes/Users.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `fmt(s)` · L9
  - chamado por: `Users` L16
- `Users()` · L16
  - chama: `useAuth` (auth.tsx:85), `fmt` L9

## `dashboard/routes/Webhooks.tsx`

257 linhas · caminho: `apps/dashboard/src/routes/Webhooks.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Webhooks()` · L7
  - chama: `useAuth` (auth.tsx:85)
