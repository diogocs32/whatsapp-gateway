# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/).
Histórico anterior a 10/07/2026 (F1–F9 do blueprint + auditoria 07/2026) está no `git log` e em
[docs/auditoria-2026-07.md](docs/auditoria-2026-07.md) — este arquivo passa a valer a partir da onda M0.

## [Unreleased]

### Corrigido (16/08 — hotfix pós-deploy da sessão `otimizacao-deps-hotpaths`)

- **Imagem do gateway sem deps ANINHADAS do workspace → boot morria com `Cannot find module
'zod'`** (deploy de 22:11 UTC: build Done, migration aplicada, mas o container novo saía com
  Exited(1) e o Swarm segurava o antigo — produção nunca ficou fora). Causa: o `npm update`
  levou o `eslint-plugin-react-hooks` (devDep da RAIZ) a exigir **zod@4**, que tomou o slot da
  raiz; o **zod@3 do gateway** foi aninhado em `apps/gateway/node_modules` — que o Dockerfile
  NÃO copiava (só `/app/node_modules`), e o `npm prune --omit=dev` ainda removia o zod@4 da raiz
  por ser dev. Fix: o estágio runtime agora copia TAMBÉM `apps/gateway/node_modules` (cobre
  qualquer dep nessa situação; `mkdir -p` no build garante a pasta mesmo com hoisting total).
  Validado com **build local da imagem real** + smoke de require do grafo completo do dist.

### Alterado (16/08 — sessão `otimizacao-deps-hotpaths`)

- **Dependências atualizadas dentro da compatibilidade (D-016)**: NestJS 11.1.27→11.2.1 (fixes de
  SSE: teardown no disconnect e abort — o gateway TEM endpoint SSE), Prisma 7.8→7.9.1 (fix oficial
  de **connection leak em transações interativas no adapter Postgres**), fastify 5.8.5→**5.11.3**
  (o exato que o `@nestjs/platform-fastify@11.2.1` declara — mesma regra do pin de ca0629d; traz
  "reduced per-request overhead" do 5.10 e cache de content-type na serialização do 5.11),
  Baileys rc13→**rc14** (8 commits de bugfix, sem breaking; validar reconexão da frota no deploy),
  BullMQ 5.79→5.81.3 (**dedupa o ioredis** — antes havia 5.10.1 aninhada + 5.11.1 raiz),
  pino 9→**10.3.1** (único breaking = drop de Node 18; **unifica as cópias** — o pino-http@11 exige
  pino 10 e mantinha uma segunda cópia aninhada), pg 8.23, @fastify/* minors, aws-sdk 3.1111,
  vitest 4.1.10, react 19.2.8, react-router 7.18.2, vite 8.2.1, tailwind 4.3.3. Majors deferidos
  com motivo documentado → P-021.
- **Pool do Postgres com tuning explícito**: o driver adapter do Prisma 7 herda os defaults do
  node-postgres — connect timeout **0** (espera infinita na aquisição com o pool saturado; o
  Prisma 6 usava 5s). Novos envs `DB_POOL_MAX` (default 10), `DB_POOL_CONNECT_TIMEOUT_MS` (5000)
  e `DB_POOL_IDLE_TIMEOUT_MS` (300000) — defaults = paridade Prisma 6 conforme a doc oficial.
- **`recordMany` (diretório de contatos) em LOTE**: sync de agenda/leads fazia 1 upsert POR
  contato em série; agora `INSERT ... ON CONFLICT (sessionId, waId) DO UPDATE SET col =
COALESCE(EXCLUDED.col, atual)` em chunks de 200 (round-trips O(N)→O(N/200)), mesma semântica
  de merge (nunca sobrescreve dado conhecido com null); fallback por registro se um chunk falhar.
- **ACK de mensagem atômico**: `updateStatusByKey` (hot path — todo delivered/read) era
  findFirst+update (2 round-trips + corrida read-modify-write entre ACKs concorrentes); virou UM
  UPDATE com a guarda de ranking no SQL (um `delivered` atrasado não sobrescreve mais um `read`).
- **Worker de webhooks com concorrência** (`WEBHOOK_CONCURRENCY`, default 8): o default 1 do
  BullMQ fazia um endpoint lento (teto 10s) segurar TODAS as entregas (head-of-line blocking).
- **Teto de mídia nas campanhas**: `fetchMedia` do worker baixava a URL sem limite de tamanho;
  agora aplica `MEDIA_MAX_BYTES` (content-length antes + tamanho real depois).
- **Índice `wa_contacts (sessionId, phone)`** (migration `indice_wa_contacts_phone`, aditiva):
  `namesFor` (hot path de leads/grupos) busca por OR em waId/lid/jid/**phone** — phone era a única
  chave sem índice; a busca de contatos por telefone no painel também usa.
- **Dashboard com code-splitting por rota** (`React.lazy` + `Suspense`): as 16 telas viram chunks
  próprios do Vite (Login 1,9 kB; vendor 241 kB) em vez de um bundle único; `gzip_vary on` no
  nginx (`Vary: Accept-Encoding` com Traefik/CDN na frente).

### Alterado (16/08 — sessão `dedup-status-alertas`)

- **Dedup de `session.status` na fonte (P-020, D-015)**: o gateway só publica um evento
  `session.status` (webhook + SSE + timeline) quando o par `(status, error)` MUDA. As engines
  reemitiam `WORKING` sem mudança real (Baileys em todo `connection 'open'` → cada reconexão
  transitória; wwebjs no `ready` a cada heal), e o notificador n8n repassava cada uma como alerta
  no zap/telegram — o "muitos alertas, mas nada mudou". `persistStatus` (status atual + detecção de
  engine órfã) segue rodando sempre, antes do gate. Contrato preservado (nota C6 em `INTEGRACAO.md`):
  um status idêntico não é uma transição. `wa_session_events` também para de acumular linhas
  repetidas. 5/5 testes novos (`session-status-dedup.e2e-spec.ts`).

### Adicionado (14/08 — sessão `wwebjs-p015-shutdown-limpo`)

- **Patch `$1` do WA Web** (`patches/whatsapp-web.js+1.34.7.patch`, patch-package no postinstall +
  Dockerfiles + teste que acusa ausência): builds ≥2.3000.104x deixam de quebrar
  sendMessage/getChats/downloadMedia. Build pinada `2.3000.1045101284-alpha` validada em produção
  (leads 99/99 com phone); default do código atualizado. Expira 13/10 (D-013).
- **Shutdown limpo do processo (P-015)**: `shutdown()` na engine wwebjs fecha o Chromium POR FORA
  do mutex de ciclo de vida (teto 7s < grace de 10s do Docker), teto de 8s no `logout()`,
  `stopped` síncrono, marcador `.gateway-clean-shutdown` no perfil (diagnóstico de encerramento
  sujo no boot) e log de duração/estouro no `onModuleDestroy`.
- **Blindagem contra mídia pesada (P-017)**: teto de 24MB para baixar mídia recebida
  (`WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES`; acima segue só metadados) + heal imediato quando o renderer
  crasha (`Target crashed`) em QUALQUER caminho (probe, operações, mídia) + retry da build pinada
  antes do fallback live no init.
- **Probe no caminho de envio (P-016)**: sendText/sendMedia/sendLocation/sendPoll falham em ~10s
  com erro acionável (e disparam o heal) quando a página está travada — fim do envio que "não faz
  nada" no painel.
- **Watchdog de sync (P-019 — na main, AGUARDA DEPLOY)**: sonda a página a cada 60s; 3 falhas →
  status DEGRADED com "re-escaneie o QR" (fim do WORKING falso); recupera WORKING sozinho.

### Corrigido / Operação (14/08)

- **P-015 (QR a cada deploy) — causa raiz**: o app no Dokploy estava SEM volume; criado
  `gateway-wwebjs` → `/data/wwebjs` (perfil persiste; validado: 2 trocas de container sem QR).
  Runbook `deploy-dokploy.md` revisado: mount = passo crítico; Update Config **stop-first**
  (start-first com volume compartilhado corrompe o perfil). Memory Limit 2GB → **4GB** (D-014).
- **Regra operacional registrada**: re-sincronização de RECONEXÃO empaca em 99% nas builds atuais
  (bootstrap pós-QR completa sempre) ⇒ deploys do gateway em lote, janela com re-scan aceitável.

### Desempenho

- **wwebjs — extração de leads em LOTE** (sessão `2026-08-12-2043-wwebjs-qualidade-max`): `GET
/groups/{id}` (e `/leads`) resolvia número+nome com **1 round-trip CDP por participante** +
  1 `evaluate` por `@lid` — grupo de 500 levava minutos. Agora usa **1 `getContacts()`** (mapa
  id→contato) + **`getContactLidAndPhone` em blocos de 50** (via oficial da lib para o par
  LID↔telefone). Round-trips O(N) → O(N/50); nomes, telefones e o registro no diretório saem
  idênticos. Fallback um-a-um preservado quando o lote falha.

### Corrigido

- **wwebjs — presença global `available`/`unavailable` real** (sessão `…-2043-wwebjs-qualidade-max`):
  esses dois estados degradavam para `clearState` do chat (respondiam `ok` sem alterar a presença
  online/offline da conta). Agora usam `sendPresenceAvailable`/`sendPresenceUnavailable` (paridade
  com o Baileys). `composing`/`recording`/`paused` inalterados.
- **wwebjs — `PAIRING_CODE` + diagnóstico de queda** (sessão `…-2043-wwebjs-qualidade-max`):
  `requestPairingCode` agora seta o status `PAIRING_CODE` (paridade com o Baileys — o painel/n8n
  distingue "esperando código" de "esperando QR"); listeners `code` (renovação do pairing a cada
  ~3 min) e `change_state` (CONFLICT/UNPAIRED/TIMEOUT **antes** do disconnect) logam o porquê da
  queda. Guard de Chromium ausente (`WWEBJS_CHROME_PATH` errado) falha com erro acionável em vez
  de ENOENT críptico. Higiene: `clearTimeout` no `destroy`, dedup do eco sem `sleep` de 3 s à toa.

- **wwebjs — `announce`/`restrict` reais nos grupos** (sessão `2026-08-12-1959-wwebjs-p012-announce-restrict`,
  P-012): `GET /groups` e `GET /groups/{id}` da engine wwebjs devolviam sempre
  `announce:false`/`restrict:false` (valores fixos — a API mentia). Agora leem os flags reais do
  `groupMetadata` (announce = só admin envia · restrict = só admin edita info). Fallback `false`
  quando a metadata não está carregada (sem regressão). O Baileys já devolvia os valores reais.

### Adicionado

- **W7 — inbox: busca de mensagens** (sessão `2026-08-13-0810-wwebjs-w7c-search`, P-011): recurso
  NOVO aditivo. `GET /api/sessions/{s}/messages/search?q=termo` (opcional `&chatId=&limit=`) busca o
  termo no texto das mensagens (case-insensitive, mais recente primeiro), mesmo formato do
  `GET /messages`. Servida do **banco** → funciona nas **2 engines** e alcança o histórico importado
  pelo backfill. Sem migration/env/breaking. Documentado em `INTEGRACAO.md` §12; contracts em P-013.
  **Fecha o W7** (backfill + gestão de chat + busca — todos os itens entregues).
- **W7 — inbox: gestão de chat** (sessão `2026-08-13-0744-wwebjs-w7b-chat-mgmt`, P-011): recurso
  NOVO aditivo. `POST /api/sessions/{s}/messages/{chatId}/flag` (`{flag, enabled}`) arquiva/fixa/
  silencia/marca-não-lido uma conversa (`flag` ∈ archive|pin|mute|unread; `unread` com
  `enabled:false` marca como lido). Só **WWEBJS**; numa **Baileys** responde **501** (archive/
  markRead exigem app-state sync com o histórico — fora do escopo, e falha silenciosa é vetada pelo
  R6). Idempotente. Sem migration/env/breaking. Documentado em `INTEGRACAO.md` §12; contracts em
  P-013. Fecha o W7 exceto `searchMessages`.
- **W7 — inbox: backfill de histórico** (sessão `2026-08-13-0726-wwebjs-w7-inbox`, P-011):
  recurso NOVO aditivo. `POST /api/sessions/{s}/messages/sync` (`{chatId?, limit?, maxChats?}`)
  puxa o histórico da engine e grava no banco, populando a inbox de leitura que já existia
  (`GET /messages/conversations` + `GET /messages`) com conversas **anteriores à conexão**.
  Só **WWEBJS** (via `getChats`/`Chat.fetchMessages`); numa sessão **Baileys** responde **501**
  (sem store de histórico — a inbox ao vivo dele segue funcionando). O backfill grava DIRETO no
  banco (dedup por mensagem), **não** dispara webhook nem conta no reply-rate. Mídia histórica sem
  binário (`mediaKey` null → `GET /media` 404). Sem migration/env/breaking. Documentado em
  `INTEGRACAO.md` §12; contracts em P-013. Gestão de chat (archive/pin/mute) e `searchMessages` =
  próximos incrementos do W7.
- **W8 — grupos avançados: fila de entrada, travas admin-only e foto** (sessão
  `2026-08-12-2043-wwebjs-qualidade-max`, P-011): recurso NOVO aditivo nas DUAS engines.
  `GET /api/sessions/{s}/groups/{g}/membership-requests` (fila de entrada pendente),
  `POST …/membership-requests` (`{action: approve|reject, participants?}` — sem `participants`
  age sobre toda a fila, com **anti-flood** de 250–500 ms entre pedidos),
  `POST …/settings` (`{announce?, restrict?}` — travar envio/edição para admins) e
  `POST …/photo` (`{url}` — foto do grupo, o gateway baixa a imagem ≤10 MB). wwebjs via
  `getGroupMembershipRequests`/`approve`/`reject` + `setMessagesAdminsOnly`/`setInfoAdminsOnly`
  - `setPicture`; Baileys via `groupRequestParticipantsList`/`Update` + `groupSettingUpdate`
  - `updateProfilePicture`. Sem migration/env/breaking. Documentado em `INTEGRACAO.md` §9.2;
    contracts em P-013.
- **Anti-flag wwebjs — User-Agent realista e estável por sessão** (sessão
  `…-2043-wwebjs-qualidade-max`, P-012): o UA do Chromium passa a variar por sessão de forma
  **determinística** (paridade com o `browser-fingerprint` do Baileys) — estável entre reconexões,
  distinto entre sessões (frota inteira com UA idêntico denuncia automação). `WWEBJS_USER_AGENT`
  segue como override global. Variáveis `WWEBJS_*` agora validadas no zod do boot (vazio = ausente).

- **W8 — perfil da conta: status, nome e foto** (sessões `…-1941-wwebjs-w8-perfil-conta`
  e `…-1947-wwebjs-w8b-foto-perfil`, P-011): recurso NOVO aditivo nas DUAS engines.
  `POST /api/sessions/{s}/profile/status` (`{status}` — recado/"about", ≤139),
  `POST …/profile/name` (`{name}` — nome de exibição, ≤25) e `POST …/profile/photo`
  (`{url}` — o gateway baixa a imagem, ≤10 MB). wwebjs via `setStatus`/`setDisplayName`/
  `setProfilePicture`, Baileys via `updateProfileStatus`/`updateProfileName`/
  `updateProfilePicture`. Sem migration/env/breaking. Documentado em `INTEGRACAO.md`;
  contracts em P-013.
- **W6 — webhook mais rico: reações recebidas** (sessão `2026-08-12-1921-wwebjs-w6-webhook-reacoes`,
  P-011): novo evento **`message.reaction`** no webhook — quando o contato (ou você, em outro device)
  reage a uma mensagem. Payload `{ keyId (msg-alvo), chatJid, senderJid, emoji ('' = reação removida),
fromMe, timestamp }`. Capturado nas DUAS engines (wwebjs `message_reaction`, Baileys
  `messages.reaction`) e roteado ao webhook pelo fluxo existente (dedup por id de envelope, filtro por
  nome de evento — assine `*` ou `message.reaction`). Completa o round-trip de reações da W5. Sem
  migration/env/breaking. Documentado em `INTEGRACAO.md`; contracts em P-013. Edição/revogação/votos
  (vote_update) recebidos = incrementos futuros (Baileys exige inspeção de protocolMessage/decifrar).
- **W5b — mensagens ricas: localização e enquete** (sessão `2026-08-12-1902-wwebjs-w5b-location-poll`,
  P-011): recurso NOVO aditivo nas DUAS engines. **Localização**: `POST /api/sessions/{s}/messages/location`
  (`{to, latitude, longitude, name?, address?}`). **Enquete/poll**: `POST /api/sessions/{s}/messages/poll`
  (`{to, name, options[2..12], multi?}`). Ambos com `cold`/`idempotencyKey` e o mesmo hard-gate do
  guard-rail. Sem migration/env/breaking (rotas novas). Documentado em `INTEGRACAO.md`; contracts em
  P-013. **Reply/quote deferido** (o Baileys só persiste `raw` de mensagens enviadas, não das recebidas);
  captura de votos (`vote_update`) e vCard = incrementos futuros.
- **W5 — mensagens ricas: reações e menções** (sessão `2026-08-12-1746-wwebjs-w5-mensagens-ricas`,
  P-011 1º incremento): recurso NOVO **aditivo** nas DUAS engines (Baileys + wwebjs). **Reações**:
  `POST /api/sessions/{s}/messages/{msgId}/reaction` com `{ emoji }` (emoji vazio remove a reação).
  **Menções**: `text` e `media-url` aceitam `mentions: [números/JIDs]` (marca @, até 50). Sem
  migration, sem env, sem breaking (campos opcionais; rota nova). Contrato documentado em
  `INTEGRACAO.md`; formalização em `packages/contracts` adiada (P-013 — o arquivo está no escopo
  da sessão ativa `auth-refresh`, R9). location/poll/reply/vCard ficam para o próximo incremento.

- **wwebjs W4 — paridade funcional do motor** (sessão `2026-08-12-1736-wwebjs-w4-superficie`,
  P-010): os 14 métodos que a engine whatsapp-web.js respondia como "não suportado" (HTTP 501)
  passam a **funcionar de verdade** — a API já existia na lib 1.34.7. Grupos: `createGroup`,
  `updateParticipants` (add/remove/promover/rebaixar), `leaveGroup`, `setGroupSubject`,
  `setGroupDescription`, `groupInviteCode`, `groupRevokeInvite`. Contatos: `checkNumbers`
  (checa se o número tem WhatsApp + JID canônico), `profilePicture`, `setBlock`
  (bloquear/desbloquear). Canais/newsletter (beta): `createChannel`, `channelInfo`,
  `followChannel`, `unfollowChannel`. O motor wwebjs passa a ter **paridade com o Baileys** no
  contrato IEngine. Sem mudança de contrato (as rotas já existiam; deixaram de responder 501). O
  mecanismo `UnsupportedEngineOperationError`→501 permanece como contrato de capacidade de engine
  (dormante — sem operações não suportadas hoje; previsto para a futura engine META_CLOUD).

### Corrigido

- **wwebjs W3 — ciclo de vida e recuperação** (sessão `2026-08-12-1723-wwebjs-w3-ciclo-vida`,
  P-009): as credenciais do wwebjs vivem em disco (LocalAuth em `{WWEBJS_DATA_PATH}/session-<id>`),
  não no Postgres — agora `logout`/`new-qr`/`DELETE` **limpam o perfil do Chromium do disco**
  (`WWebJSEngine.purgeAuthDir`). Fim de dois defeitos: (a) `DELETE /api/sessions/:id` deixava o
  perfil (dezenas–centenas de MB) órfão no volume para sempre a cada sessão WWEBJS removida;
  (b) `POST /api/sessions/:id/new-qr` era no-op para wwebjs (limpava só o Postgres → o LocalAuth
  restaurava o mesmo perfil e a sessão voltava sem QR novo) — agora recupera de verdade. Robustez:
  `destroy()` do Chromium com **teto de 12s** (um Chromium travado não pendura mais o mutex de ciclo
  de vida da sessão), `qrBase64` zerado no `stop` (não serve QR morto) e teto FIFO no cache
  LID→telefone. Operações não suportadas pelo wwebjs (grupos de escrita, canais, checkNumbers,
  profilePicture, setBlock) passam a responder **HTTP 501** (Not Implemented) em vez de 400, via
  `UnsupportedEngineOperationError` — o integrador distingue "engine não faz isso" de "payload
  inválido". Sem migration/env/contrato.
- **wwebjs W2 — mídia no S3 + rótulo de engine no webhook** (sessão
  `2026-08-12-1715-wwebjs-w2-midia`, P-008): a engine whatsapp-web.js passa a **baixar a
  mídia recebida** (`msg.downloadMedia`) e persisti-la no S3 — antes toda mídia inbound
  virava `type:'other'` sem download e o `GET /api/sessions/:id/messages/:msgId/media`
  respondia 404 para 100% das mídias WWEBJS. A **mídia enviada** também sobe ao S3
  (`mediaKey` no evento → o webhook recebe a `mediaUrl` e o Inbox mostra o binário).
  Envio ganhou fidelidade de tipo (`sendMediaAsDocument`/`sendMediaAsSticker` — antes um
  sticker ia como imagem) e guard contra retorno null do `sendMessage`. O **envelope de
  eventos (webhook OUT) passa a rotular a engine REAL da sessão**: uma sessão WWEBJS
  reporta `engine:"wwebjs"` (antes TODO evento saía como `baileys`, inclusive de sessões
  WWEBJS — o node n8n recebia o campo errado); implementado via `engineName` na interface
  `IEngine`, derivado no `SessionManager`. Sem mudança de contrato (o campo `engine` já
  existia no envelope). Falha de download/upload emite os metadados sem binário (a
  conversa não some), como no Baileys.
- **wwebjs W1 — estabilidade e segurança do motor** (sessão `2026-08-12-1702-wwebjs-w1-estabilidade`,
  P-007): (P0-1) **reconexão automática** da engine whatsapp-web.js com backoff exponencial + jitter
  (espelha o Baileys, teto `MAX_RECONNECT=5` → `DEGRADED`), e **fim do `start` no-op**: o handler
  `disconnected` agora zera `this.client` — antes a lib destruía o Chromium mas mantinha a instância,
  e `doStart` (`if (this.client) return`) fazia todo `POST /start`/`/restart` responder 200 sem
  reconectar (sessão caía no meio de campanha e não voltava). (P0-2) o guard **`WA_REQUIRE_PROXY`
  agora vale no wwebjs**: sem proxy vivo e com o guard ligado, a engine RECUSA conectar em vez de
  vazar o IP do datacenter (o `1525e4e` injetava `requireProxy` mas o motor browser nunca o lia) +
  log WARN ao conectar sem proxy (paridade com o Baileys). Primeiro teste que instancia a engine
  wwebjs real (`test/wwebjs-engine.e2e-spec.ts`, prova por mutação do guard) — antes a cobertura do
  caminho wwebjs era zero. Sem mudança de contrato. **Ação operacional pendente do dono (P0-4):**
  revalidar/pinar `WWEBJS_WEB_VERSION` no Dokploy antes de a atual expirar (~fim de agosto/2026).

### Adicionado

- **Hardening anti-flag do WhatsApp** (sessão `2026-07-22-1700-hardening-antiban`): fingerprint
  de browser realista e ESTÁVEL por sessão no Baileys (`browser-fingerprint.ts` — pick
  determinístico por sessionId entre 6 fingerprints desktop reais), substituindo o antigo
  `['WhatsApp Gateway','Chrome','1.0.0']` que aparecia como "WhatsApp Gateway" em Aparelhos
  Conectados e denunciava automação. Log WARN quando uma sessão conecta SEM proxy (fim do ponto
  cego — antes a conexão direta pelo IP do servidor era silenciosa). Nova env `WA_REQUIRE_PROXY`
  (default false): quando ligada, a engine recusa conectar sessão sem proxy vivo em vez de vazar
  o IP do servidor/datacenter. Efeito de fingerprint só aparece após RE-VÍNCULO da sessão.
- **P0 estabilidade de sessão** (sessão `2026-07-21-1730-estabilidade-sessoes`): rota
  `POST /api/sessions/:id/new-qr` — limpa as credenciais persistidas e reinicia o socket
  (recuperação de sessão desconectada pelo celular; aditiva — R0/R4, sem tipo novo no contracts).
  O botão "Gerar novo QR" do painel passa a usá-la (antes fazia restart com credenciais mortas
  e a sessão voltava a FAILED sem nunca gerar QR).
- Base universal **v3.2** adotada (D-010): `BASE_CONEXOZENVO.md` (raiz, R0–R18), `docs/MAPA.md`,
  `docs/AUDITORIAS.md`, `docs/ADOCAO.md` (diagnóstico com evidências + ondas A1–A7).

- **M0 · Doc viva**: `docs/ESTADO.md`, `docs/SESSOES.md`, `docs/DECISOES.md`, `docs/ARQUITETURA.md`
  (tabelas donas validadas contra o schema.prisma — divergências em D-002/D-003), `docs/PROJETO.md`,
  `docs/sessions/`, `CLAUDE.md` (raiz) e este `CHANGELOG.md`.
- `DOCUMENTO_CONEXOZENVO_NESTJS.md` (processo de ondas M0–M6) adicionado ao versionamento.
- **Proxy livre na criação de sessão (D-008)**: `GET /api/proxies/available` (proxies enabled,
  não-DEAD e sem sessão usando) e campo OPCIONAL `proxyId` no `POST /api/sessions` — a sessão
  nasce com atribuição `SINGLE`/`STICKY` exclusiva (1 proxy = 1 sessão), ou sem proxy se omitido.
  Dropdown "Proxy (só os livres aparecem)" no formulário de nova sessão do painel; contrato em
  `packages/contracts` (`CreateSessionRequest.proxyId?`) e docs/INTEGRACAO.md §11. Sem migration.

### Alterado

- `docs/auditoria-2026-07.md`: item O4 (S3 em prod) marcado ✅ — resolvido em 04/07/2026
  (Cloudflare R2, bucket `conexozenvo-wa-media`, `storage: true` confirmado no `/health`).
- **M1 · Destravar produção (10/07/2026)**: O1 (re-sync Webshare — todos os proxies ALIVE,
  sessões WORKING), O2 (Memory Limit no Dokploy — `memoryUsedPct` 0→0.27 no `/health`) e
  O3 (Validate DNS verde) concluídos → **auditoria 07/2026 100% encerrada (código + operacional)**.
  Sem mudança de código — onda operacional; produção roda `808c175` desde 13:28 UTC.

### Corrigido

- **Engine Baileys sem mutex de ciclo de vida**: dois `start()` próximos (duplo clique,
  restart sobre start, create + autostart) criavam DOIS sockets — o primeiro ficava órfão e os
  dois brigavam pela sessão (conflito 440 em loop até esgotar as reconexões, QR nunca
  estabilizava). start/stop/logout/reconexão agora serializados por sessão (espelha o mutex que
  a engine wwebjs já tinha).
- **`loggedOut` (desconectado pelo celular) deixava credenciais mortas**: agora limpa
  `wa_auth_keys` + `creds` e para em STOPPED com `lastError` claro — o próximo start gera QR
  novo direto (antes ficava FAILED e todo restart reconectava com as creds inválidas).
- **Painel "logado" após o JWT de 12h expirar**: qualquer 401 de `/api/*` agora desloga e
  redireciona ao `/login` (antes o polling repetia 401 no console indefinidamente com a UI
  aparentando sessão ativa).

- **Booleans de env** (`DB_SSL`, `GUARDRAIL_ENFORCE`, `S3_FORCE_PATH_STYLE`): trocado o
  `z.coerce.boolean()` (que fazia `Boolean(texto)` — `"false"`/`"0"` viravam TRUE) por parser
  explícito `envBool`: `true/1/yes/on` liga · `false/0/no/off` desliga · valor inválido derruba
  o boot com o nome da variável (D-007). Regressão coberta por `test/config.e2e-spec.ts` (suíte 74).
