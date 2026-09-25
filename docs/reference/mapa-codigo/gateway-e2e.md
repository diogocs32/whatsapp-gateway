<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — testes e2e (apps/gateway/test)

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `gateway/test/auth.e2e-spec.ts` | 335 |
| `gateway/test/baileys-reaction.e2e-spec.ts` | 59 |
| `gateway/test/browser-fingerprint.e2e-spec.ts` | 41 |
| `gateway/test/config.e2e-spec.ts` | 61 |
| `gateway/test/f5.e2e-spec.ts` | 228 |
| `gateway/test/f6.e2e-spec.ts` | 99 |
| `gateway/test/g4.e2e-spec.ts` | 107 |
| `gateway/test/g5.e2e-spec.ts` | 82 |
| `gateway/test/g6.e2e-spec.ts` | 95 |
| `gateway/test/g7.e2e-spec.ts` | 114 |
| `gateway/test/g8.e2e-spec.ts` | 115 |
| `gateway/test/health.e2e-spec.ts` | 24 |
| `gateway/test/inbox-triage.e2e-spec.ts` | 375 |
| `gateway/test/media.e2e-spec.ts` | 184 |
| `gateway/test/messaging.e2e-spec.ts` | 361 |
| `gateway/test/proxies.e2e-spec.ts` | 118 |
| `gateway/test/proxy-create-session.e2e-spec.ts` | 154 |
| `gateway/test/session-status-dedup.e2e-spec.ts` | 130 |
| `gateway/test/sessions.e2e-spec.ts` | 111 |
| `gateway/test/setup-app.ts` | 169 |
| `gateway/test/webhooks.e2e-spec.ts` | 167 |
| `gateway/test/wwebjs-engine.e2e-spec.ts` | 1031 |

## `gateway/test/auth.e2e-spec.ts`

335 linhas · caminho: `apps/gateway/test/auth.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Auth (e2e)” · L27
  - it “login com credenciais erradas → 401” · L41
  - it “login correto → token; /me retorna o usuário” · L51
  - it “/me sem token → 401” · L64
  - it “login seta 2 cookies: token (Path=/) e refresh_token (Path=/api/auth), ambos HttpOnly” · L69
  - it “refresh rotaciona: novo refresh != antigo e o antigo deixa de valer” · L91
  - it “reuso de refresh revoga a família inteira (o token de boa-fé também cai)” · L108
  - it “access expirado + refresh válido → refresh renova e /me volta 200” · L124
  - it “logout revoga o refresh: usar o token pós-logout falha” · L155
  - describe “CSRF em autenticação por cookie” · L172
    - it “POST com cookie + Origin fora da allowlist → 403 (guard) e no logout” · L173
    - it “POST com cookie + Sec-Fetch-Site cross-site (sem Origin) → 403” · L204
    - it “POST com cookie + Origin da allowlist passa pelo guard (cai na validação: 400)” · L220
    - it “Bearer com Origin estranha NÃO é bloqueado (não há CSRF sem cookie)” · L239
    - it “GET com cookie e Origin estranha continua permitido (método seguro)” · L254
  - describe “revogação de sessão” · L267
    - it “reset de senha pelo OWNER invalida o refresh do usuário” · L268
    - it “senha nova curta (<8) é rejeitada com 400” · L315

## `gateway/test/baileys-reaction.e2e-spec.ts`

59 linhas · caminho: `apps/gateway/test/baileys-reaction.e2e-spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “mapBaileysReaction (W6)” · L6
  - it “contato reage a uma mensagem nossa → fromMe=false, sender=chat” · L11
  - it “nós reagimos (reaction.key.fromMe) → fromMe=true, sender=ourJid” · L27
  - it “emoji vazio = reação removida” · L37
  - it “status@broadcast e key sem id → null (ignorado)” · L46

## `gateway/test/browser-fingerprint.e2e-spec.ts`

41 linhas · caminho: `apps/gateway/test/browser-fingerprint.e2e-spec.ts`
- importa (interno): `modules/sessions/infrastructure/baileys/browser-fingerprint.ts`

- describe “browserFingerprint” · L6
  - it “é determinístico por sessão (estável entre reconexões)” · L7
  - it “nunca contém o rótulo antigo "WhatsApp Gateway"” · L13
  - it “devolve [plataforma, navegador, versão] plausível” · L26
  - it “distribui entre sessões diferentes (não é tudo o mesmo valor)” · L33

## `gateway/test/config.e2e-spec.ts`

61 linhas · caminho: `apps/gateway/test/config.e2e-spec.ts`
- importa (interno): `bootstrap/config.ts`

- describe “validateEnv — booleans de env (D-007)” · L18
  - it “ausentes usam o default: enforce=false, ssl=false, pathStyle=true” · L19
  - it “"false" e "0" DESLIGAM (antes viravam true — a pegadinha)” · L26
  - it “"true"/"1"/"on" LIGAM, aceitando maiúsculas e espaços” · L38
  - it “string vazia cai no default (equivale a não definir)” · L50
  - it “valor não reconhecido derruba o boot citando a variável (fail-fast)” · L55

## `gateway/test/f5.e2e-spec.ts`

228 linhas · caminho: `apps/gateway/test/f5.e2e-spec.ts`
- importa (interno): `gateway/test/setup-app.ts`

- describe “F5 grupos/contatos/canais (e2e)” · L11
  - it “GET groups sem auth → 401” · L28
  - it “GET groups → 200 (lista, manager mockado)” · L36
  - it “criar grupo sem subject → 400” · L46
  - it “criar grupo válido → 201” · L56
  - it “participants com ação inválida → 400” · L67
  - it “invite link → 200 com code e url” · L77
  - it “contacts check vazio → 400” · L87
  - it “contacts check válido → 200 array” · L97
  - it “contacts save sem firstName → 400” · L108
  - it “contacts save sem jid nem number → 400” · L118
  - it “contacts save válido → 201” · L128
  - it “contacts remove válido → 201” · L143
  - it “criar canal válido → 201” · L154
  - it “GET membership-requests → 200 array” · L166
  - it “membership action inválida → 400” · L176
  - it “membership approve (fila toda) → 201 ok” · L186
  - it “settings sem announce nem restrict → 400” · L197
  - it “settings announce+restrict → 201 ok” · L207
  - it “group photo com url inválida → 400” · L218

## `gateway/test/f6.e2e-spec.ts`

99 linhas · caminho: `apps/gateway/test/f6.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “F6 campanhas (e2e)” · L6
  - it “POST campaigns sem auth → 401” · L32
  - it “texto sem text → 400” · L37
  - it “maxDelay < minDelay → 400” · L47
  - it “cria campanha de texto (DRAFT) → 201 com total e dedup” · L64

## `gateway/test/g4.e2e-spec.ts`

107 linhas · caminho: `apps/gateway/test/g4.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “G4 reply-rate (e2e)” · L9
  - it “reply-rate (7d) exclui cold <72h (C2) e calcula corretamente” · L66
  - it “snapshot (sem window) devolve 7d e 30d” · L82
  - it “persiste o snapshot em session_metrics” · L94

## `gateway/test/g5.e2e-spec.ts`

82 linhas · caminho: `apps/gateway/test/g5.e2e-spec.ts`
- importa (interno): `modules/guardrail/guardrail.service.ts`, `gateway/test/setup-app.ts`

- describe “G5 guard-rail (e2e)” · L16
  - it “observação: cold passa numa sessão nova (estado ativa) → 201” · L46
  - it “observação: evaluate calcula mas NÃO aplica (enforce=false, applied=false)” · L51
  - it “override manual quarentena bloqueia cold → 423 SESSION_QUARANTINED” · L57
  - it “cold=false (chat aberto) passa mesmo em quarentena → 201” · L64
  - it “apply é idempotente (C10): evento antigo não sobrescreve” · L69

## `gateway/test/g6.e2e-spec.ts`

95 linhas · caminho: `apps/gateway/test/g6.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/guardrail/guardrail.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `gateway/test/setup-app.ts`

- describe “G6 eventos guard-rail + dead-letter (e2e)” · L12
  - it “transição p/ quarentena emite session.quarantined com payload” · L49
  - it “cold bloqueado emite send.blocked” · L61
  - it “dead-letter: reconciliação reentrega pendentes e marca redeliveredAt” · L69

## `gateway/test/g7.e2e-spec.ts`

114 linhas · caminho: `apps/gateway/test/g7.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “G7 health / override / config (e2e)” · L13
  - it “GET /sessions/:id/health → objeto de saúde completo” · L37
  - it “POST /sessions/:id/quarantine força o estado; /health reflete” · L61
  - it “GET /sessions?state= filtra por estado guard-rail” · L78
  - it “PATCH /guardrail/config muda o limiar SEM redeploy” · L96

## `gateway/test/g8.e2e-spec.ts`

115 linhas · caminho: `apps/gateway/test/g8.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “G8 config / presence / markRead (e2e)” · L13
  - it “GET /sessions/:id/config → defaults + cap derivado” · L37
  - it “PATCH /sessions/:id/config muda o cap SEM redeploy” · L51
  - it “GET /sessions/:id/health agora traz cap_base/cap_atual” · L71
  - it “POST /sessions/:id/presence → 201 (manager mockado)” · L82
  - it “POST /sessions/:id/messages/:msgId/read → 201” · L93

## `gateway/test/health.e2e-spec.ts`

24 linhas · caminho: `apps/gateway/test/health.e2e-spec.ts`
- importa (interno): `gateway/test/setup-app.ts`

- describe “Health (e2e)” · L5
  - it “GET /health → 200 com status ok e checks verdes” · L15

## `gateway/test/inbox-triage.e2e-spec.ts`

375 linhas · caminho: `apps/gateway/test/inbox-triage.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Caixa única de triagem (e2e)” · L20
  - it “lista as conversas dos DOIS aparelhos numa tacada, sem escolher sessão” · L171
  - it “🔴 última mensagem do contato → pending, com a contagem de entradas esperando” · L178
  - it “🟢 respondido NO CELULAR (source=phone) → answered sem tocar no painel” · L185
  - it “grupo não aparece na caixa única (nem na lista, nem no fluxo)” · L193
  - it “🟡 marcação manual ancorada na entrada da tela → ignored” · L208
  - it “filtro por status devolve só as conversas daquela cor (contadores seguem inteiros)” · L219
  - it “REGRA DE OURO: entrada nova depois do amarelo → volta a pending (🔴)” · L227
  - it “anti-atropelo: marcar com keyId VELHO não grava nada — a conversa fica pending” · L240
  - it “marcar sem keyId ancora na entrada atual → ignored; desmarcar volta a pending” · L251
  - it “REGRA DE OURO: entrada nova depois de respondido (🟢) → pending” · L262
  - it “respondido vence a marca amarela: entrada nova + resposta → answered” · L272
  - it “filtro por aparelho devolve só as conversas daquele aparelho” · L285
  - it “filtro por NOME funciona com sessão cujo id ≠ name (cenário real de produção)” · L299
  - it “triagem de grupo → 400 · status inválido → 400 · sessão inexistente → 404” · L328
  - it “sem autenticação → 401 (tela de triagem não é pública)” · L352
  - it “fluxo cronológico traz as mensagens em sequência, da mais recente para a mais antiga” · L360

## `gateway/test/media.e2e-spec.ts`

184 linhas · caminho: `apps/gateway/test/media.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/storage/media-storage.service.ts`, `gateway/test/setup-app.ts`

- describe “Mídia (e2e)” · L13
  - it “POST media sem auth → 401” · L29
  - it “upload multipart → 201 (SessionManager mockado)” · L37
  - it “upload multipart sem o campo "to" → 400” · L65
  - it “media-url sem url → 400” · L88
  - describe “GET /messages/:msgId/media (GAP 2)” · L99
    - it “baixa os bytes pelo keyId do WhatsApp (o mesmo do webhook)” · L134
    - it “baixa os bytes pelo ULID interno (id do GET /messages)” · L149
    - it “mensagem sem mídia → 404 com motivo claro” · L159

## `gateway/test/messaging.e2e-spec.ts`

361 linhas · caminho: `apps/gateway/test/messaging.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Messaging (e2e)” · L13
  - it “send-text sem texto → 400 (validação)” · L29
  - it “send-text válido → 201 com id e to (manager mockado)” · L39
  - it “list sem chatId → 400” · L50
  - it “list com chatId → 200 e array” · L59
  - it “send-text com cold e idempotencyKey → 201, deduped:false” · L71
  - it “send-text com idempotencyKey vazio → 400 (validação)” · L88
  - it “send-text sem auth → 401” · L98
  - it “sync (todos os chats) → 201 com {chats, fetched, imported}” · L109
  - it “sync de um chat específico → 201” · L120
  - it “sync com maxChats fora do range → 400” · L131
  - it “sync sem auth → 401” · L141
  - it “chat flag válido → 201 {ok:true}” · L152
  - it “chat flag inválido → 400” · L163
  - it “chat flag sem enabled → 400” · L173
  - it “chat flag sem auth → 401” · L183
  - it “search com q → 200 e array” · L194
  - it “search sem q → 400” · L204
  - it “search com q só espaços → 400” · L213
  - it “search sem auth → 401” · L222
  - describe “idempotencyKey — reserva durável (ABE-03)” · L234
    - it “mesma key + mesmo payload → 2ª chamada é replay (deduped:true, mesmo id) sem novo envio” · L249
    - it “mesma key com destinatário/conteúdo diferente → 409 e nenhum envio” · L277
    - it “20 requisições concorrentes com a mesma key → UM envio; as demais replay ou 409 "em voo"” · L302
    - it “falha no transporte marca a intenção failed e a MESMA key pode ser retentada” · L332

## `gateway/test/proxies.e2e-spec.ts`

118 linhas · caminho: `apps/gateway/test/proxies.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Proxies (e2e)” · L6
  - it “GET /api/proxies sem auth → 401” · L28
  - it “porta inválida → 400” · L33
  - it “cria proxy → 201, não vaza a senha, recebe posição e aparece na listagem” · L43
  - it “assignment RANGE sem rangeEnd → 400” · L71
  - it “assignment SINGLE sem proxyId → 400” · L81
  - it “define assignment RANGE válido e lê de volta” · L91

## `gateway/test/proxy-create-session.e2e-spec.ts`

154 linhas · caminho: `apps/gateway/test/proxy-create-session.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Proxy na criação de sessão (e2e, D-008)” · L11
  - it “GET /api/proxies/available lista o livre e esconde o desabilitado” · L63
  - it “cria sessão COM proxyId → nasce com atribuição SINGLE/STICKY e o proxy sai dos livres” · L75
  - it “2ª sessão com o MESMO proxy → 400 "em uso" e a sessão NÃO fica criada” · L106
  - it “proxyId inexistente → 400 sem criar sessão” · L122
  - it “sessão SEM proxyId continua nascendo sem atribuição (comportamento antigo intacto)” · L136

## `gateway/test/session-status-dedup.e2e-spec.ts`

130 linhas · caminho: `apps/gateway/test/session-status-dedup.e2e-spec.ts`
- importa (interno): `modules/sessions/application/session-manager.service.ts`, `modules/sessions/domain/session.repository.ts`, `modules/sessions/domain/session-status.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/application/engine.port.ts`

- describe “SessionManager — dedup de session.status (alertas zap/telegram)” · L76
  - it “não republica WORKING repetido (reconexão transitória que não muda nada)” · L77
  - it “republica em transição real e volta a deduplicar no novo patamar” · L88
  - it “mesmo status com erro diferente é informação nova — republica” · L97
  - it “dedup é isolado por sessão — uma não silencia a outra” · L105
  - it “não deduplica eventos que não são session.status (message.ack sempre passa)” · L114

## `gateway/test/sessions.e2e-spec.ts`

111 linhas · caminho: `apps/gateway/test/sessions.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `gateway/test/setup-app.ts`

- describe “Sessions (e2e)” · L6
  - it “GET /api/sessions sem auth → 401” · L25
  - it “POST /start com body vazio + content-type json NÃO retorna 400” · L32
  - it “cria sessão (201) e ela aparece na listagem” · L42
  - it “POST /new-qr sem auth → 401” · L66
  - it “POST /new-qr de sessão inexistente → 404” · L74
  - it “POST /new-qr de sessão existente → 200 {ok:true}” · L83
  - it “nome inválido → 400 (validação zod)” · L101

## `gateway/test/setup-app.ts`

169 linhas · caminho: `apps/gateway/test/setup-app.ts`
- importa (interno): `app.module.ts`, `bootstrap/fastify-adapter.ts`, `bootstrap/logging-exception.filter.ts`, `infra/prisma/prisma.service.ts`, `modules/sessions/application/session-manager.service.ts`
- importado por: `gateway/test/auth.e2e-spec.ts`, `gateway/test/f5.e2e-spec.ts`, `gateway/test/f6.e2e-spec.ts`, `gateway/test/g4.e2e-spec.ts`, `gateway/test/g5.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/g7.e2e-spec.ts`, `gateway/test/g8.e2e-spec.ts`, `gateway/test/health.e2e-spec.ts`, `gateway/test/inbox-triage.e2e-spec.ts`, `gateway/test/media.e2e-spec.ts`, `gateway/test/messaging.e2e-spec.ts`, `gateway/test/proxies.e2e-spec.ts`, `gateway/test/proxy-create-session.e2e-spec.ts`, `gateway/test/sessions.e2e-spec.ts`, `gateway/test/webhooks.e2e-spec.ts`

**Funções e constantes de topo**
- `fakeSessionManager` = `{ start: async () => undefined, stop: async () => undefined, restart:…` · L12
- `createTestApp()` · L82 · async
  - chama: `buildFastifyAdapter` (fastify-adapter.ts:10), `new LoggingExceptionFilter` (logging-exception.filter.ts)
- `inject(app, opts)` · L116
  - chamado por: `login` L140
- `readSetCookie(res, name)` · L128
- `login(app)` · L140 · async
  - chama: `inject` L116
- `seedSession(app, name)` · L153 · async
  - banco: `waSession.create`, `waSession.deleteMany`
- `removeSession(app, name)` · L162 · async
  - banco: `waSession.deleteMany`

**Tipos**
- interface `InjectOpts` L102 · 4 propriedade(s)
- interface `InjectResponse` L109 · 4 propriedade(s)

## `gateway/test/webhooks.e2e-spec.ts`

167 linhas · caminho: `apps/gateway/test/webhooks.e2e-spec.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `gateway/test/setup-app.ts`

- describe “Webhooks (e2e)” · L9
  - it “GET /api/webhooks sem auth → 401” · L28
  - it “url inválida → 400” · L33
  - it “cria webhook → 201, não vaza o secret e aparece na listagem” · L43
  - it “evento no EventBus vira job na fila de webhooks (jobId de dedup válido)” · L77
  - it “POST /webhooks com URL privada/loopback/metadata → 400; host público sem DNS → 201” · L133

## `gateway/test/wwebjs-engine.e2e-spec.ts`

1031 linhas · caminho: `apps/gateway/test/wwebjs-engine.e2e-spec.ts`
- importa (interno): `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

- describe “WWebJSEngine — guard WA_REQUIRE_PROXY (P0-2)” · L51
  - it “recusa conectar sem proxy quando requireProxy=true (não vaza IP, não sobe Chromium)” · L52
  - it “não bloqueia por engano quando requireProxy é ausente (default seguro reverso)” · L70
- describe “WWebJSEngine — rótulo da engine (P1-1)” · L88
  - it “expõe engineName "wwebjs" (fonte do rótulo do envelope de webhook)” · L89
- describe “groupFlags — announce/restrict reais do grupo (P-012)” · L95
  - it “lê os valores reais de groupMetadata” · L99
  - it “metadata ausente → false (fallback sem regressão)” · L110
- describe “mapInboundMediaType — tipo de mídia recebida (P0-3)” · L118
  - it “mapeia os tipos do wwebjs para o mediaType público” · L119
  - it “mídia desconhecida cai em document (recuperável no GET /media)” · L128
- describe “WWebJSEngine.purgeAuthDir — limpeza do LocalAuth em disco (P1-2/P1-3)” · L134
  - it “remove o perfil do Chromium da sessão do disco” · L135
  - it “é no-op (não lança) para sessão sem perfil em disco” · L146
- describe “WWebJSEngine — grupos/contatos/canais implementados (W4/P-010)” · L153
  - it “createGroup vai à lib (sem client → "Sessão não conectada", não mais "não suportado")” · L158
  - it “checkNumbers e setBlock idem (implementados, não mais nope)” · L166
  - it “followChannel idem (canais beta implementados)” · L177
- describe “WWebJSEngine — mensagens ricas (W5): reações e menções” · L186
  - it “sendReaction vai à lib (sem client → "Sessão não conectada")” · L187
  - it “sendText com menções não quebra o caminho (sem client → "Sessão não conectada")” · L195
  - it “sendLocation vai à lib (sem client → "Sessão não conectada")” · L205
  - it “sendPoll vai à lib (sem client → "Sessão não conectada")” · L217
  - it “setProfileStatus/setProfileName vão à lib (sem client → "Sessão não conectada")” · L228
- describe “WWebJSEngine — W8 grupos avançados (membership/settings/foto)” · L243
  - it “groupMembershipRequests/Action e setGroupSetting/Photo vão à lib (sem client)” · L244
- describe “WWebJSEngine — W7 inbox/histórico (listChats/fetchChatHistory)” · L262
  - it “vão à lib (sem client → "Sessão não conectada", não são no-op)” · L263
- describe “WWebJSEngine — W7 gestão de chat (setChatFlag)” · L273
  - it “todos os flags vão à lib (sem client → "Sessão não conectada")” · L274
- describe “buildAuthProxyUrl — upstream do forwarder local (proxy autenticado)” · L285
  - it “injeta as credenciais na URL do proxy” · L286
  - it “percent-encoda credenciais com caracteres especiais (@ : /) sem quebrar a URL” · L296
- describe “proxy-chain — forwarder local p/ proxy autenticado (ERR_TUNNEL_CONNECTION_FAILED)” · L304
  - it “anonymizeProxy devolve URL local sem credencial e closeAnonymizedProxy libera a porta” · L309
- describe “userAgentFor — UA anti-flag estável por sessão (P-012)” · L320
  - it “é DETERMINÍSTICO por sessão (mesmo id → mesmo UA entre reconexões)” · L332
  - it “é um UA de Chrome/Linux plausível e recente (não o Chrome/101 default do wwebjs)” · L338
  - it “varia entre sessões diferentes (frota não usa UA idêntico)” · L348
  - it “WWEBJS_USER_AGENT força um override global explícito” · L357
- describe “raceStoreOp + withStoreReady com teto (P-014 — página do Store travada)” · L370
  - it “raceStoreOp: operação rápida passa; pendurada estoura com mensagem acionável + teto” · L386
  - it “raceStoreOp: rejeição TARDIA da promise órfã é engolida (sem unhandled rejection)” · L393
  - it “probe detecta página que não responde ANTES da operação pesada (fn nem é chamado)” · L402
  - it “operação pendurada estoura o teto próprio (não os 240s do CDP) SEM retry” · L424
  - it “retry do Store-ainda-injetando continua funcionando (regressão do fluxo original)” · L444
  - it “mensagem de erro inclui o percent do loading_screen quando houve progresso (diagnóstico)” · L467
  - it “sem client: comportamento antigo preservado (probe não roda, erro "Sessão não conectada")” · L477
- describe “resolveParticipantsBatch SEM getContacts + auto-heal (P-014, 14/08)” · L484
  - it “participantes resolvem phone/nome SEM chamar getContacts (getContacts ausente no client não explode)” · L508
  - it “probe de página morta dispara o auto-heal (pupPage.reload) com cooldown single-flight” · L537
- describe “WWebJSEngine — shutdown limpo do processo (P-015)” · L570
  - it “shutdown() fecha o Chromium POR FORA do mutex (fila de ciclo de vida presa não impede o destroy)” · L606
  - it “shutdown() com destroy pendurado estoura o teto próprio e RESOLVE (não pendura o grace period)” · L622
  - it “destroy limpo grava o marcador no perfil; o start seguinte o consome SEM warn de sujo” · L633
  - it “shutdown() sem client aberto NÃO grava o marcador (não mascara um fechamento sujo anterior)” · L664
  - it “logout() numa página travada estoura o teto do client.logout() e segue para destroy+purga” · L680
- describe “patch `$1` do WhatsApp Web aplicado na lib (B-002)” · L699
  - it “Utils.js instalado contém o helper getMsgKeyId e Puppeteer.js o guard de exposeFunction” · L704
- describe “P-016/P-017 — probe no envio, teto de mídia e heal em crash (14/08)” · L724
  - it “sendText numa página travada falha em segundos com erro acionável e dispara o heal (P-016)” · L750
  - it “mídia acima do teto NÃO baixa: emite metadados com fileSize e não toca downloadMedia (P-017)” · L780
  - it “mídia dentro do teto segue o fluxo normal de download (regressão)” · L809
  - it “crash do renderer no download dispara o heal imediato (P-017b)” · L837
- describe “P-017c — página CRASHADA (rejeita rápido) também dispara o heal” · L864
  - it “isPageCrashError reconhece as assinaturas de crash e ignora o resto” · L877
  - it “probe: getState rejeitando com Target crashed → erro + heal (antes o catch mascarava)” · L890
  - it “operação que morre com Target crashed dispara o heal (probe passou antes do crash)” · L924
- describe “P-019 — watchdog de sync: fim do WORKING falso” · L954
  - it “3 falhas seguidas do probe rebaixam WORKING → DEGRADED com instrução de re-scan + heal” · L967
  - it “página volta a responder → status retorna a WORKING sozinho” · L999
  - it “watchdog liga no WORKING e desliga no STOPPED (ciclo pelo setStatus)” · L1022
