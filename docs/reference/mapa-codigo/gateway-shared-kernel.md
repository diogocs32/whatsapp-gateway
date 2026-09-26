<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — shared-kernel

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `shared-kernel/clock.ts` | 13 |
| `shared-kernel/crypto.spec.ts` | 96 |
| `shared-kernel/crypto.ts` | 157 |
| `shared-kernel/disconnect-stats.ts` | 28 |
| `shared-kernel/domain-event.ts` | 7 |
| `shared-kernel/event-bus/event-bus.ts` | 38 |
| `shared-kernel/local-day.spec.ts` | 40 |
| `shared-kernel/local-day.ts` | 48 |
| `shared-kernel/memory.ts` | 119 |
| `shared-kernel/process-errors.ts` | 16 |
| `shared-kernel/query-int.spec.ts` | 19 |
| `shared-kernel/query-int.ts` | 14 |
| `shared-kernel/result.ts` | 8 |
| `shared-kernel/safe-fetch.spec.ts` | 392 |
| `shared-kernel/safe-fetch.ts` | 303 |
| `shared-kernel/shared-kernel.module.ts` | 12 |
| `shared-kernel/ulid.ts` | 5 |

## `shared-kernel/clock.ts`

13 linhas · caminho: `apps/gateway/src/shared-kernel/clock.ts`
- importado por: `shared-kernel/shared-kernel.module.ts`

**class `SystemClock`** L6 · `implements Clock`
- `now()` · L7
  - implementa: `Clock.now` L3

**Funções e constantes de topo**
- `CLOCK` = `Symbol('CLOCK')` · L12

**Tipos**
- interface `Clock` L2
  - `Clock.now()` · L3
    - implementado por: `now` L7

## `shared-kernel/crypto.spec.ts`

96 linhas · caminho: `apps/gateway/src/shared-kernel/crypto.spec.ts`
- importa (interno): `shared-kernel/crypto.ts`

- describe “hashPassword / verifyPassword (scrypt)” · L16
  - it “roundtrip: senha correta verifica (formato versionado s2$N$r$p$salt$hash)” · L17
  - it “hash LEGADO (salt:hash, custo default do Node) continua verificando e pede re-hash” · L24
  - it “custo diferente do corrente pede re-hash; custo igual não” · L36
  - it “verifyPasswordDummy roda sem lançar (equalização de tempo)” · L43
  - it “senha errada não verifica” · L47
  - it “mesma senha gera hashes diferentes (salt aleatório)” · L52
  - it “valor armazenado malformado devolve false (sem lançar)” · L60
- describe “hmacSha512 — assinatura de webhook (vetor fixo = contrato com integradores)” · L69
  - it “produz o hex conhecido para secret+payload de referência” · L70
  - it “secrets diferentes → assinaturas diferentes” · L78
- describe “sha512 — hash de API key (vetor fixo = contrato)” · L83
  - it “produz o hex conhecido para a key de referência” · L84
  - it “é determinístico e sensível a 1 caractere” · L91

## `shared-kernel/crypto.ts`

157 linhas · caminho: `apps/gateway/src/shared-kernel/crypto.ts`
- importado por: `modules/iam/application/api-key.service.ts`, `modules/iam/application/auth-session.service.ts`, `modules/iam/application/token.service.ts`, `modules/iam/application/user.service.ts`, `modules/iam/infrastructure/admin-seeder.ts`, `shared-kernel/crypto.spec.ts`

**Funções e constantes de topo**
- `scryptAsync` = `promisify< string, string, number, { N: number; r: number; p: number;…` · L18
  - chamado por: `derive` L51
- `currentScryptCost()` · L39
  - chamado por: `hashPassword` L59, `passwordNeedsRehash` L125, `verifyPasswordDummy` L142
  - env: `PASSWORD_SCRYPT_LOG2N`
- `maxmemFor(cost)` · L46
  - chamado por: `derive` L51
- `derive(plain, salt, cost)` · L51 · async
  - chama: `maxmemFor` L46, `scryptAsync` L18
  - chamado por: `hashPassword` L59, `verifyPassword` L111, `verifyPasswordDummy` L142
- `hashPassword(plain, cost)` · L59 · async
  - chama: `currentScryptCost` L39, `derive` L51
  - chamado por: `AuthSessionService.login` (auth-session.service.ts:57), `UserService.create` (user.service.ts:50), `UserService.resetPassword` (user.service.ts:89), `AdminSeeder.onApplicationBootstrap` (admin-seeder.ts:26)
- `parseStored(stored)` · L75
  - chamado por: `passwordNeedsRehash` L125, `verifyPassword` L111
- `verifyPassword(plain, stored)` · L111 · async
  - chama: `derive` L51, `parseStored` L75
  - chamado por: `AuthSessionService.login` (auth-session.service.ts:57)
- `passwordNeedsRehash(stored, cost)` · L125
  - chama: `currentScryptCost` L39, `parseStored` L75
  - chamado por: `AuthSessionService.login` (auth-session.service.ts:57)
- `verifyPasswordDummy(cost)` · L142 · async
  - chama: `currentScryptCost` L39, `derive` L51
  - chamado por: `AuthSessionService.login` (auth-session.service.ts:57)
- `hmacSha512(secret, payload)` · L149
- `sha512(text)` · L154
  - chamado por: `ApiKeyService.create` (api-key.service.ts:25), `ApiKeyService.validate` (api-key.service.ts:42), `TokenService.hashRefresh` (token.service.ts:33), `TokenService.newRefresh` (token.service.ts:28)

**Tipos**
- interface `ScryptCost` L32 · 3 propriedade(s)
- interface `ParsedHash` L68 · 4 propriedade(s)

## `shared-kernel/disconnect-stats.ts`

28 linhas · caminho: `apps/gateway/src/shared-kernel/disconnect-stats.ts`
- importado por: `modules/observability/metrics.service.ts`, `modules/sessions/infrastructure/baileys/baileys.disconnect.spec.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`

**Funções e constantes de topo**
- `knownCodes` = `new Set([401, 403, 405, 408, 411, 428, 440, 500, 503, 515])` · L3
- `totals` = `new Map<string, number>()` · L4
- `disconnectCodeLabel(code)` · L6
  - chamado por: `recordDisconnect` L10
- `recordDisconnect(engine, code)` · L10
  - chama: `disconnectCodeLabel` L6
  - chamado por: `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:876)
- `disconnectTotals()` · L18
  - chamado por: `MetricsService.refresh` (metrics.service.ts:112)

## `shared-kernel/domain-event.ts`

7 linhas · caminho: `apps/gateway/src/shared-kernel/domain-event.ts`
- importado por: `infra/redis/event-fanout.ts`, `modules/events/interface/events.controller.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/observability/session-event.logger.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `shared-kernel/event-bus/event-bus.ts`

**Tipos**
- interface `DomainEvent` L2 · 3 propriedade(s)

## `shared-kernel/event-bus/event-bus.ts`

38 linhas · caminho: `apps/gateway/src/shared-kernel/event-bus/event-bus.ts`
- importa (interno): `shared-kernel/domain-event.ts`
- importado por: `infra/redis/event-fanout.ts`, `modules/events/interface/events.controller.ts`, `modules/guardrail/guardrail.service.ts`, `modules/messaging/application/message-persister.service.ts`, `modules/messaging/application/reaction-persister.service.ts`, `modules/observability/session-event.logger.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/application/session-status-order.spec.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `shared-kernel/shared-kernel.module.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`, `gateway/test/baileys-offline.e2e-spec.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/conversas-grupo.e2e-spec.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/session-status-dedup.e2e-spec.ts`, `gateway/test/webhooks.e2e-spec.ts`

**class `EventBus`** L9 · @Injectable
- `logger` · L11 · private · campo
- `emitter` · L12 · private · campo
- `constructor()` · L14
- `publish(event)` · L21
  - chamado por: `EventFanout.onRemote` (event-fanout.ts:73), `GuardrailService.emit` (guardrail.service.ts:190), `SessionManager.handleEngineEvent` (session-manager.service.ts:274)
- `subscribe(name, handler)` · L26
  - chamado por: `EventFanout.onModuleInit` (event-fanout.ts:48), `EventsController.stream` (events.controller.ts:14), `MessagePersister.onModuleInit` (message-persister.service.ts:24), `ReactionPersister.onModuleInit` (reaction-persister.service.ts:27), `SessionEventLogger.onModuleInit` (session-event.logger.ts:22), `WebhookDispatcher.onModuleInit` (webhook-dispatcher.service.ts:31)
- `unsubscribe(name, handler)` · L30
  - chamado por: `EventsController.stream` (events.controller.ts:14)
- `subscribeAll(handler)` · L34

**Tipos**
- type `EventHandler` L5

## `shared-kernel/local-day.spec.ts`

40 linhas · caminho: `apps/gateway/src/shared-kernel/local-day.spec.ts`
- importa (interno): `shared-kernel/local-day.ts`

- describe “startOfLocalDay” · L4
  - it “America/Sao_Paulo (UTC-3): 01:30Z de 10/09 ainda é 09/09 local → meia-noite local = 03:00Z de 09/09” · L5
  - it “America/Sao_Paulo: 12:00Z de 10/09 → meia-noite local = 03:00Z de 10/09” · L12
  - it “UTC: meia-noite UTC do próprio dia” · L19
  - it “fuso positivo (Asia/Tokyo, UTC+9): 20:00Z de 10/09 já é 11/09 local → 15:00Z de 10/09” · L26
  - it “fuso inválido cai no dia UTC (não lança)” · L33

## `shared-kernel/local-day.ts`

48 linhas · caminho: `apps/gateway/src/shared-kernel/local-day.ts`
- importado por: `modules/campaigns/infrastructure/campaign.repository.ts`, `shared-kernel/local-day.spec.ts`

**Funções e constantes de topo**
- `startOfLocalDay(timeZone, now)` · L8
  - chamado por: `CampaignRepository.reserveRecipient` (campaign.repository.ts:128)

## `shared-kernel/memory.ts`

119 linhas · caminho: `apps/gateway/src/shared-kernel/memory.ts`
- importado por: `modules/health/health.service.ts`, `modules/observability/metrics.service.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`

**Funções e constantes de topo**
- `chromiumProcessTree(rootPid)` · L17
  - chamado por: `WWebJSEngine.destroyWithTimeout` (wwebjs.engine.ts:1403), `chromiumTreePss` L43
- `chromiumTreePss(rootPid)` · L43
  - chama: `chromiumProcessTree` L17
  - chamado por: `WWebJSEngine.recordMemoryProfile` (wwebjs.engine.ts:481)
- `round2(n)` · L63
  - chamado por: `memoryStats` L93
- `readCgroupWorkingSet()` · L70
  - chamado por: `memoryStats` L93
- `memoryStats()` · L93
  - chama: `readCgroupWorkingSet` L70, `round2` L63
  - chamado por: `HealthService.check` (health.service.ts:53), `MetricsService.summary` (metrics.service.ts:80)

**Tipos**
- interface `MemoryStats` L5 · 7 propriedade(s)

## `shared-kernel/process-errors.ts`

16 linhas · caminho: `apps/gateway/src/shared-kernel/process-errors.ts`
- importado por: `main.ts`, `modules/guardrail/guardrail.service.ts`, `modules/iam/interface/audit.interceptor.ts`, `modules/observability/metrics.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/baileys.restriction.spec.ts`

**Funções e constantes de topo**
- `totals` = `new Map<string, number>()` · L7
- `recordProcessError(kind)` · L9
  - chamado por: `bootstrap` (main.ts:16), `GuardrailService.emitFailed` (guardrail.service.ts:409), `AuditInterceptor.record` (audit.interceptor.ts:66), `BaileysEngine.fetchReachoutTimelock` (baileys.engine.ts:1342), `BaileysEngine.onConnectionUpdate` (baileys.engine.ts:876), `BaileysEngine.onMessageCapping` (baileys.engine.ts:1316), `BaileysEngine.onMessagesUpdate` (baileys.engine.ts:1254)
- `processErrorTotals()` · L13
  - chamado por: `MetricsService.refresh` (metrics.service.ts:112)

## `shared-kernel/query-int.spec.ts`

19 linhas · caminho: `apps/gateway/src/shared-kernel/query-int.spec.ts`
- importa (interno): `shared-kernel/query-int.ts`

- describe “clampInt” · L4
  - it “ausente ou inválido → default” · L5
  - it “clampa em [min, max] e arredonda para baixo” · L11

## `shared-kernel/query-int.ts`

14 linhas · caminho: `apps/gateway/src/shared-kernel/query-int.ts`
- importado por: `modules/contacts/interface/contacts.controller.ts`, `modules/iam/interface/audit.controller.ts`, `modules/messaging/interface/inbox.controller.ts`, `modules/messaging/interface/messages.controller.ts`, `shared-kernel/query-int.spec.ts`

**Funções e constantes de topo**
- `clampInt(raw, def, min, max)` · L4
  - chamado por: `ContactsController.listDirectory` (contacts.controller.ts:58), `AuditController.list` (audit.controller.ts:15), `InboxController.conversations` (inbox.controller.ts:111), `InboxController.messages` (inbox.controller.ts:148), `MessagesController.conversations` (messages.controller.ts:266), `MessagesController.list` (messages.controller.ts:276), `MessagesController.search` (messages.controller.ts:359)

## `shared-kernel/result.ts`

8 linhas · caminho: `apps/gateway/src/shared-kernel/result.ts`

**Funções e constantes de topo**
- `ok(value)` · L6
- `err(error)` · L7

**Tipos**
- type `Result` L2

## `shared-kernel/safe-fetch.spec.ts`

392 linhas · caminho: `apps/gateway/src/shared-kernel/safe-fetch.spec.ts`
- importa (interno): `shared-kernel/safe-fetch.ts`

- describe “isPrivateAddress” · L17
  - it “reconhece faixas privadas/reservadas v4” · L18
  - it “reconhece v6 loopback/ULA/link-local e v4 mapeado” · L38
  - it “string que não é IP conta como bloqueada” · L55
  - it “IPv4-mapeado em hexa e em qualquer grafia segue as faixas IPv4” · L64
  - it “bloqueia v6 que embute IPv4 ou está fora do unicast global (2000::/3)” · L83
  - it “faixas IPv4 de documentação/6to4 bloqueadas; limites vizinhos seguem públicos” · L118
  - it “guarda: IPv4 público segue liberado (nenhuma regra v6 engole o IPv4 inteiro)” · L141
- describe “parseEgressUrl / assertEgressAllowed” · L154
  - it “rejeita esquemas fora de http/https e credenciais na URL” · L155
  - it “bloqueia IP literal privado, localhost e metadata; libera com allowlist” · L169
  - it “IP público literal passa sem DNS” · L193
  - it “P-065: IPv6 que embute loopback/metadata/privado é recusado depois da normalização do URL” · L205
  - it “host que não resolve: bloqueado por default, aceito com dnsFailure=allow (cadastro)” · L222
  - it “egressPolicyFromEnv lê EGRESS_ALLOW_PRIVATE e EGRESS_ALLOW_HOSTS” · L232
- describe “safeFetch — corpo em fluxo com teto e redirects validados” · L246
  - it “baixa um corpo pequeno (e segue redirect same-host validado)” · L313
  - it “corpo chunked acima do teto é abortado sem bufferizar tudo” · L323
  - it “content-length declarado acima do teto é recusado antes de ler” · L329
  - it “redirect para destino privado é bloqueado (política estrita) e loop de redirect é cortado” · L335
  - it “política estrita bloqueia o próprio servidor local (loopback)” · L352
  - it “loopback escrito como IPv6 v4-mapeado é recusado sem tocar o servidor” · L360
  - it “fetchImageByUrl: baixa com a política, recusa destino privado e repassa HTTP de erro” · L375

## `shared-kernel/safe-fetch.ts`

303 linhas · caminho: `apps/gateway/src/shared-kernel/safe-fetch.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/groups/interface/groups.controller.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `modules/webhooks/interface/webhooks.controller.ts`, `shared-kernel/safe-fetch.spec.ts`

**class `EgressBlockedError`** L38 · `extends Error`
- injeta (construtor): `message: string (param)`
- `constructor(message)` · L39
  - chamado por: `assertEgressAllowed` L133, `parseEgressUrl` L104, `safeFetch` L235

**class `BodyTooLargeError`** L191 · `extends Error`
- injeta (construtor): `maxBytes: number (param)`
- `constructor(maxBytes)` · L192
  - chamado por: `safeFetch` L235

**Funções e constantes de topo**
- `egressPolicyFromEnv(env)` · L23
  - chamado por: `fetchMedia` (campaign-queue.ts:42), `MessagesController.sendMediaUrl` (messages.controller.ts:715), `WebhookQueue.deliver` (webhook-queue.ts:151), `WebhooksController.create` (webhooks.controller.ts:60), `fetchImageByUrl` L204
- `BLOCKED_V4` = `[ ['0.0.0.0', 8], // "this network" ['10.0.0.0', 8], // RFC 1918 ['10…` · L51
- `BLOCKED_V6` = `[ ['100::', 8], // 0100::/8 (inclui 100::/64 discard, RFC 6666) ['200…` · L72
- `BLOCKED` = `new BlockList()` · L86
- `isPrivateAddress(ip)` · L96
  - chamado por: `assertEgressAllowed` L133
- `parseEgressUrl(raw)` · L104
  - chama: `constructor` L39
  - chamado por: `WebhookQueue.deliver` (webhook-queue.ts:151), `WebhooksController.create` (webhooks.controller.ts:60), `safeFetch` L235
- `assertEgressAllowed(url, policy, opts)` · L133 · async
  - chama: `constructor` L39, `isPrivateAddress` L96
  - chamado por: `WebhookQueue.deliver` (webhook-queue.ts:151), `WebhooksController.create` (webhooks.controller.ts:60), `safeFetch` L235
- `PHOTO_MAX_BYTES` = `10 * 1024 * 1024` · L202
- `fetchImageByUrl(raw, policy)` · L204 · async
  - chama: `egressPolicyFromEnv` L23, `safeFetch` L235
  - chamado por: `GroupsController.photo` (groups.controller.ts:213), `SessionsController.profilePhoto` (sessions.controller.ts:270)
- `safeFetch(raw, opts)` · L235 · async
  - chama: `assertEgressAllowed` L133, `constructor` L192, `constructor` L39, `parseEgressUrl` L104
  - chamado por: `fetchMedia` (campaign-queue.ts:42), `MessagesController.sendMediaUrl` (messages.controller.ts:715), `fetchImageByUrl` L204

**Tipos**
- interface `EgressPolicy` L18 · 2 propriedade(s)
- interface `EgressCheckOptions` L125 · 1 propriedade(s)
- interface `SafeFetchOptions` L174 · 7 propriedade(s)
- interface `SafeFetchResult` L184 · 4 propriedade(s)

## `shared-kernel/shared-kernel.module.ts`

12 linhas · caminho: `apps/gateway/src/shared-kernel/shared-kernel.module.ts`
- importa (interno): `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/clock.ts`
- importado por: `app.module.ts`

**@Module `SharedKernelModule`** L6
- providers: `[EventBus, { provide: CLOCK, useClass: SystemClock }]`
- exports: `[EventBus, CLOCK]`

**class `SharedKernelModule`** L6 · @Global · @Module({ providers: [EventBus, { provide: CLOCK, useClass: SystemC…)

## `shared-kernel/ulid.ts`

5 linhas · caminho: `apps/gateway/src/shared-kernel/ulid.ts`
- importado por: `infra/directory/contact-directory.service.ts`, `infra/redis/event-fanout.ts`, `modules/campaigns/infrastructure/campaign.repository.ts`, `modules/guardrail/guardrail.service.ts`, `modules/iam/application/api-key.service.ts`, `modules/iam/application/auth-session.service.ts`, `modules/iam/application/user.service.ts`, `modules/iam/infrastructure/admin-seeder.ts`, `modules/iam/infrastructure/prisma-audit.repository.ts`, `modules/messaging/application/send-intent.service.ts`, `modules/messaging/infrastructure/prisma-inbox.repository.ts`, `modules/messaging/infrastructure/prisma-message.repository.ts`, `modules/messaging/infrastructure/prisma-reaction.repository.ts`, `modules/observability/reply-rate.service.ts`, `modules/observability/session-event.logger.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/sessions/application/session-config.service.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/sessions.controller.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `modules/webhooks/interface/webhooks.controller.ts`, `gateway/test/audit.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`

**Funções e constantes de topo**
- `newId()` · L4
  - chamado por: `ContactDirectory.record` (contact-directory.service.ts:34), `ContactDirectory.upsertChunk` (contact-directory.service.ts:115), `EventFanout.instanceId` (event-fanout.ts:40), `CampaignRepository.create` (campaign.repository.ts:37), `GuardrailService.apply` (guardrail.service.ts:329), `GuardrailService.emit` (guardrail.service.ts:190), `GuardrailService.getState` (guardrail.service.ts:216), `GuardrailService.recordHardSignal` (guardrail.service.ts:549), `ApiKeyService.create` (api-key.service.ts:25), `AuthSessionService.issue` (auth-session.service.ts:123), `AuthSessionService.login` (auth-session.service.ts:57), `AuthSessionService.refresh` (auth-session.service.ts:85), `UserService.create` (user.service.ts:50), `AdminSeeder.onApplicationBootstrap` (admin-seeder.ts:26), `PrismaAuditRepository.create` (prisma-audit.repository.ts:14), `SendIntentService.reserve` (send-intent.service.ts:26), `PrismaInboxRepository.markIgnored` (prisma-inbox.repository.ts:174), `PrismaMessageRepository.save` (prisma-message.repository.ts:42), `PrismaMessageRepository.saveHistorical` (prisma-message.repository.ts:84), `PrismaReactionRepository.upsert` (prisma-reaction.repository.ts:19), `ReplyRateService.computeFor` (reply-rate.service.ts:93), `SessionEventLogger.onModuleInit` (session-event.logger.ts:22), `PrismaProxyRepository.create` (prisma-proxy.repository.ts:85), `SessionConfigService.get` (session-config.service.ts:20), `SessionConfigService.update` (session-config.service.ts:28), `SessionManager.handleEngineEvent` (session-manager.service.ts:274), `SessionsController.create` (sessions.controller.ts:99), `WebhookQueue.toDeadLetter` (webhook-queue.ts:191), `WebhooksController.create` (webhooks.controller.ts:60), `WebhooksController.test` (webhooks.controller.ts:133)
