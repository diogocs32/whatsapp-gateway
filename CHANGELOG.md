# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/).
Histórico anterior a 10/07/2026 (F1–F9 do blueprint + auditoria 07/2026) está no `git log` e em
[docs/auditoria-2026-07.md](docs/auditoria-2026-07.md) — este arquivo passa a valer a partir da onda M0.

## [Unreleased]

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

- **W8 — grupos avançados: fila de entrada, travas admin-only e foto** (sessão
  `2026-08-12-2043-wwebjs-qualidade-max`, P-011): recurso NOVO aditivo nas DUAS engines.
  `GET /api/sessions/{s}/groups/{g}/membership-requests` (fila de entrada pendente),
  `POST …/membership-requests` (`{action: approve|reject, participants?}` — sem `participants`
  age sobre toda a fila, com **anti-flood** de 250–500 ms entre pedidos),
  `POST …/settings` (`{announce?, restrict?}` — travar envio/edição para admins) e
  `POST …/photo` (`{url}` — foto do grupo, o gateway baixa a imagem ≤10 MB). wwebjs via
  `getGroupMembershipRequests`/`approve`/`reject` + `setMessagesAdminsOnly`/`setInfoAdminsOnly`
  + `setPicture`; Baileys via `groupRequestParticipantsList`/`Update` + `groupSettingUpdate`
  + `updateProfilePicture`. Sem migration/env/breaking. Documentado em `INTEGRACAO.md` §9.2;
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
