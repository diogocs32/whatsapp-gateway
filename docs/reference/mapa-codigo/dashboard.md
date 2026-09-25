<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Dashboard (React)

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `dashboard/App.tsx` | 196 |
| `dashboard/lib/api.ts` | 516 |
| `dashboard/lib/auth.tsx` | 60 |
| `dashboard/lib/branding.tsx` | 129 |
| `dashboard/lib/error-boundary.tsx` | 74 |
| `dashboard/main.tsx` | 23 |
| `dashboard/routes/ApiKeys.tsx` | 247 |
| `dashboard/routes/Atendimento.tsx` | 655 |
| `dashboard/routes/Audit.tsx` | 113 |
| `dashboard/routes/Branding.tsx` | 130 |
| `dashboard/routes/Campaigns.tsx` | 408 |
| `dashboard/routes/Contacts.tsx` | 420 |
| `dashboard/routes/Dashboard.tsx` | 261 |
| `dashboard/routes/Groups.tsx` | 412 |
| `dashboard/routes/Health.tsx` | 251 |
| `dashboard/routes/Inbox.tsx` | 503 |
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
  - chama: `useAuth` (auth.tsx:55)
- `App()` · L56

**Código de topo**
- `(módulo:L11)` · L11
  - chama: `installPreloadErrorHandler` (error-boundary.tsx:9)

## `dashboard/lib/api.ts`

516 linhas · caminho: `apps/dashboard/src/lib/api.ts`
- importa (interno): `contracts/index.ts`
- importado por: `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Branding.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Monitor.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**class `ApiError`** L53 · `extends Error`
- injeta (construtor): `status: number` · `message: string (param)`
- `constructor(status, message)` · L54
  - chamado por: `parseError` L118

**Funções e constantes de topo**
- `BASE` = `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'` · L51
  - env: `VITE_API_URL`
- `setUnauthorizedHandler(fn)` · L72
  - chamado por: `AuthProvider` (auth.tsx:20)
- `isAuthEndpoint(path)` · L77
  - chamado por: `coreFetch` L101
- `tryRefresh()` · L85
  - chamado por: `coreFetch` L101
- `coreFetch(path, init, allowRefresh)` · L101 · async
  - chama: `isAuthEndpoint` L77, `tryRefresh` L85
  - chamado por: `request` L129, `requestForm` L146
- `parseError(res)` · L118 · async
  - chama: `constructor` L54
  - chamado por: `request` L129, `requestForm` L146
- `request(path, init)` · L129 · async
  - chama: `coreFetch` L101, `parseError` L118
  - chamado por: `api` L154
- `requestForm(path, form)` · L146 · async
  - chama: `coreFetch` L101, `parseError` L118
  - chamado por: `api` L154
- `api` = `{ health: () => request<HealthResponse>('/health'), login: (username:…` · L154
  - chama: `request` L129, `requestForm` L146
  - HTTP: `request /api/api-keys`, `request /api/api-keys/${id}`, `request /api/audit?limit=${limit}&offset=${offset}`, `request /api/auth/login`, `request /api/auth/logout`, `request /api/auth/me`, `request /api/branding`, `request /api/campaigns`, `request /api/campaigns${sessionId ? `?sessionId=${sessionId}` : ''}`, `request /api/campaigns/${id}`, `request /api/campaigns/${id}/cancel`, `request /api/campaigns/${id}/pause`, `request /api/campaigns/${id}/resume`, `request /api/campaigns/${id}/start`, `request /api/inbox/conversations${qs ? `?${qs}` : ''}`, `request /api/inbox/messages${qs ? `?${qs}` : ''}`, `request /api/inbox/sessions/${encodeURIComponent(sessionId)}/triage`, `request /api/license`, `request /api/observability/summary`, `request /api/observability/timeline/${sessionId}?limit=${limit}`, `request /api/proxies`, `request /api/proxies/${id}`, `request /api/proxies/${id}/disable`, `request /api/proxies/${id}/enable`, `request /api/proxies/${id}/test`, `request /api/proxies/available`, `request /api/proxies/bulk`, `request /api/proxies/test-all`, `request /api/proxies/webshare/status`, `request /api/proxies/webshare/sync`, `request /api/sessions`, `request /api/sessions/${id}`, `request /api/sessions/${id}/logout`, `request /api/sessions/${id}/messages/conversations?limit=${limit}`, `request /api/sessions/${id}/messages/text`, `request /api/sessions/${id}/messages?chatId=${encodeURIComponent(chat…`, `request /api/sessions/${id}/new-qr`, `request /api/sessions/${id}/pairing-code`, `request /api/sessions/${id}/qr`, `request /api/sessions/${id}/restart`, `request /api/sessions/${id}/start`, `request /api/sessions/${id}/stop`, `request /api/sessions/${sessionId}/proxy`, `request /api/sessions/${sid}/channels`, `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}`, `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}/foll…`, `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}/unfo…`, `request /api/sessions/${sid}/contacts/${encodeURIComponent(jid)}/prof…`, `request /api/sessions/${sid}/contacts/block`, `request /api/sessions/${sid}/contacts/check`, `request /api/sessions/${sid}/contacts/directory?limit=${limit}&offset…`, `request /api/sessions/${sid}/groups`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/descri…`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/invite`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/invite…`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/leave`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/partic…`, `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/subject`, `request /api/users`, `request /api/users/${id}`, `request /api/users/${id}/password`, `request /api/webhooks`, `request /api/webhooks/${id}`, `request /api/webhooks/${id}/disable`, `request /api/webhooks/${id}/enable`, `request /api/webhooks/${id}/test`, `request /health`, `requestForm /api/sessions/${id}/messages/media`

**Tipos**
- type `Ok` L152

## `dashboard/lib/auth.tsx`

60 linhas · caminho: `apps/dashboard/src/lib/auth.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`
- importado por: `dashboard/App.tsx`, `dashboard/main.tsx`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Branding.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Login.tsx`, `dashboard/routes/Monitor.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `AuthContext` = `createContext<AuthState | null>(null)` · L18
- `AuthProvider({ children })` · L20
  - chama: `setUnauthorizedHandler` (api.ts:72)
- `useAuth()` · L55
  - chamado por: `Protected` (App.tsx:48), `ApiKeys` (ApiKeys.tsx:13), `Atendimento` (Atendimento.tsx:94), `Audit` (Audit.tsx:15), `Branding` (Branding.tsx:7), `Campaigns` (Campaigns.tsx:15), `Contacts` (Contacts.tsx:12), `Dashboard` (Dashboard.tsx:16), `Groups` (Groups.tsx:7), `Health` (Health.tsx:37), `Inbox` (Inbox.tsx:13), `License` (License.tsx:11), `Login` (Login.tsx:6), `Monitor` (Monitor.tsx:14), `Proxies` (Proxies.tsx:37), `Sessions` (Sessions.tsx:226), `Users` (Users.tsx:16), `Webhooks` (Webhooks.tsx:7)

**Tipos**
- interface `AuthState` L11 · 4 propriedade(s)

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
  - chama: `useAuth` (auth.tsx:55), `fmt` L7

## `dashboard/routes/Atendimento.tsx`

655 linhas · caminho: `apps/dashboard/src/routes/Atendimento.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `convKey(c)` · L40
  - chamado por: `Atendimento` L94
- `numberFromJid(jid)` · L43
  - chamado por: `Atendimento` L94, `displayName` L71, `sendTarget` L48
- `sendTarget(chatJid)` · L48
  - chama: `numberFromJid` L43
  - chamado por: `Atendimento` L94
- `mediaLabel(type)` · L54
  - chamado por: `Atendimento` L94, `preview` L75
- `displayName(c)` · L71
  - chama: `numberFromJid` L43
  - chamado por: `Atendimento` L94
- `preview(c)` · L75
  - chama: `mediaLabel` L54
  - chamado por: `Atendimento` L94
- `since(iso)` · L81
  - chamado por: `Atendimento` L94
- `hhmm(iso)` · L91
  - chamado por: `Atendimento` L94
- `Atendimento()` · L94
  - chama: `useAuth` (auth.tsx:55), `convKey` L40, `displayName` L71, `hhmm` L91, `mediaLabel` L54, `numberFromJid` L43, `preview` L75, `sendTarget` L48, `since` L81

**Tipos**
- type `StatusFilter` L23

## `dashboard/routes/Audit.tsx`

113 linhas · caminho: `apps/dashboard/src/routes/Audit.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `statusColor(code)` · L9
  - chamado por: `Audit` L15
- `Audit()` · L15
  - chama: `useAuth` (auth.tsx:55), `statusColor` L9

## `dashboard/routes/Branding.tsx`

130 linhas · caminho: `apps/dashboard/src/routes/Branding.tsx`
- importa (interno): `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`

**Funções e constantes de topo**
- `Branding()` · L7
  - chama: `useAuth` (auth.tsx:55), `useBranding` (branding.tsx:126)

## `dashboard/routes/Campaigns.tsx`

408 linhas · caminho: `apps/dashboard/src/routes/Campaigns.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Campaigns()` · L15
  - chama: `useAuth` (auth.tsx:55)
- `Btn({ children, onClick, danger, })` · L369
- `BtnEmerald({ children, onClick, })` · L392

## `dashboard/routes/Contacts.tsx`

420 linhas · caminho: `apps/dashboard/src/routes/Contacts.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Contacts()` · L12
  - chama: `useAuth` (auth.tsx:55)

## `dashboard/routes/Dashboard.tsx`

261 linhas · caminho: `apps/dashboard/src/routes/Dashboard.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`

**Funções e constantes de topo**
- `Dot({ up })` · L8
- `Dashboard()` · L16
  - chama: `useAuth` (auth.tsx:55), `useBranding` (branding.tsx:126)

## `dashboard/routes/Groups.tsx`

412 linhas · caminho: `apps/dashboard/src/routes/Groups.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Groups()` · L7
  - chama: `useAuth` (auth.tsx:55)
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
  - chama: `useAuth` (auth.tsx:55), `mb` L20, `statusColor` L24

## `dashboard/routes/Inbox.tsx`

503 linhas · caminho: `apps/dashboard/src/routes/Inbox.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Inbox()` · L13
  - chama: `useAuth` (auth.tsx:55), `displayName` L404, `formatTime` L432, `previewText` L426, `sendTarget` L397
- `numberFromJid(jid)` · L391
  - chamado por: `displayName` L404, `sendTarget` L397
- `sendTarget(chat)` · L397
  - chama: `numberFromJid` L391
  - chamado por: `Inbox` L13
- `displayName(conv)` · L404
  - chama: `numberFromJid` L391
  - chamado por: `Avatar` L441, `Inbox` L13
- `mediaLabel(type)` · L409
  - chamado por: `previewText` L426
- `previewText(conv)` · L426
  - chama: `mediaLabel` L409
  - chamado por: `Inbox` L13
- `formatTime(iso)` · L432
  - chamado por: `Inbox` L13
- `Avatar({ conv })` · L441
  - chama: `displayName` L404
- `MediaBubble({ m })` · L460

## `dashboard/routes/License.tsx`

157 linhas · caminho: `apps/dashboard/src/routes/License.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `fmtDate(s)` · L7
  - chamado por: `License` L11
- `License()` · L11
  - chama: `useAuth` (auth.tsx:55), `fmtDate` L7

## `dashboard/routes/Login.tsx`

81 linhas · caminho: `apps/dashboard/src/routes/Login.tsx`
- importa (interno): `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`

**Funções e constantes de topo**
- `Login()` · L6
  - chama: `useAuth` (auth.tsx:55), `useBranding` (branding.tsx:126)

## `dashboard/routes/Monitor.tsx`

137 linhas · caminho: `apps/dashboard/src/routes/Monitor.tsx`
- importa (interno): `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Monitor()` · L14
  - chama: `useAuth` (auth.tsx:55)

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
  - chama: `useAuth` (auth.tsx:55), `statusBadge` L28
- `Field({ label, children, })` · L472
- `AssignmentRow({ session, proxies, assignment, onSaved, onError, })` · L487

## `dashboard/routes/Sessions.tsx`

482 linhas · caminho: `apps/dashboard/src/routes/Sessions.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `StatusBadge({ status })` · L23
- `ConnectModal({ session, onClose, })` · L32
- `Sessions()` · L226
  - chama: `useAuth` (auth.tsx:55)

## `dashboard/routes/Users.tsx`

259 linhas · caminho: `apps/dashboard/src/routes/Users.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `fmt(s)` · L9
  - chamado por: `Users` L16
- `Users()` · L16
  - chama: `useAuth` (auth.tsx:55), `fmt` L9

## `dashboard/routes/Webhooks.tsx`

257 linhas · caminho: `apps/dashboard/src/routes/Webhooks.tsx`
- importa (interno): `contracts/index.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`

**Funções e constantes de topo**
- `Webhooks()` · L7
  - chama: `useAuth` (auth.tsx:55)
