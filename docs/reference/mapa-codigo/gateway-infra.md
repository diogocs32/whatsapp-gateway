<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — infra (prisma, redis, storage, directory)

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `infra/directory/contact-directory.service.ts` | 222 |
| `infra/directory/directory.module.ts` | 10 |
| `infra/prisma/prisma.module.ts` | 10 |
| `infra/prisma/prisma.service.ts` | 81 |
| `infra/redis/event-fanout.ts` | 98 |
| `infra/redis/redis-connection.ts` | 60 |
| `infra/redis/redis.module.ts` | 11 |
| `infra/redis/redis.service.ts` | 30 |
| `infra/storage/media-storage.service.ts` | 152 |
| `infra/storage/storage.module.ts` | 10 |

## `infra/directory/contact-directory.service.ts`

222 linhas · caminho: `apps/gateway/src/infra/directory/contact-directory.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`
- importado por: `infra/directory/directory.module.ts`, `modules/contacts/interface/contacts.controller.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/wwebjs/wwebjs.engine.ts`, `gateway/test/baileys-qr-exhaustion.e2e-spec.ts`, `gateway/test/conversas-grupo.e2e-spec.ts`

**class `ContactDirectory`** L29 · @Injectable
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L31
- `record(sessionId, c)` · L34 · async
  - chama: `clean` L21, `newId` (ulid.ts:4)
  - chamado por: `recordMany` L69, `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
  - banco: `waContact.upsert`
- `recordMany(sessionId, list)` · L69 · async
  - chama: `record` L34, `upsertChunk` L115
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
- `upsertChunk(sessionId, chunk)` · L115 · private · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `recordMany` L69
- `namesFor(sessionId, keys)` · L150 · async
  - chamado por: `MessagesController.groupSenderNames` (messages.controller.ts:326), `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
  - banco: `waContact.findMany`
- `lidMap(sessionId)` · L190 · async
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
  - banco: `waContact.findMany`
- `list(sessionId, limit, search, offset)` · L202
  - chamado por: `ContactsController.listDirectory` (contacts.controller.ts:60)
  - banco: `waContact.findMany`

**Funções e constantes de topo**
- `clean(obj)` · L21
  - chamado por: `record` L34

**Tipos**
- interface `ContactRecord` L6 · 11 propriedade(s)

## `infra/directory/directory.module.ts`

10 linhas · caminho: `apps/gateway/src/infra/directory/directory.module.ts`
- importa (interno): `infra/directory/contact-directory.service.ts`
- importado por: `app.module.ts`

**@Module `DirectoryModule`** L4
- providers: `[ContactDirectory]`
- exports: `[ContactDirectory]`

**class `DirectoryModule`** L4 · @Global · @Module({ providers: [ContactDirectory], exports: [ContactDirectory…)

## `infra/prisma/prisma.module.ts`

10 linhas · caminho: `apps/gateway/src/infra/prisma/prisma.module.ts`
- importa (interno): `infra/prisma/prisma.service.ts`
- importado por: `app.module.ts`

**@Module `PrismaModule`** L4
- providers: `[PrismaService]`
- exports: `[PrismaService]`

**class `PrismaModule`** L4 · @Global · @Module({ providers: [PrismaService], exports: [PrismaService], })

## `infra/prisma/prisma.service.ts`

81 linhas · caminho: `apps/gateway/src/infra/prisma/prisma.service.ts`
- importa (interno): `bootstrap/config.ts`, `generated/prisma/client.ts`
- importado por: `infra/directory/contact-directory.service.ts`, `infra/prisma/prisma.module.ts`, `modules/campaigns/infrastructure/campaign.repository.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/undelivered-detector.service.ts`, `modules/health/health-memory.spec.ts`, `modules/health/health-probes.spec.ts`, `modules/health/health.service.ts`, `modules/iam/infrastructure/prisma-api-key.repository.ts`, `modules/iam/infrastructure/prisma-audit.repository.ts`, `modules/iam/infrastructure/prisma-branding.repository.ts`, `modules/iam/infrastructure/prisma-license.repository.ts`, `modules/iam/infrastructure/prisma-refresh-token.repository.ts`, `modules/iam/infrastructure/prisma-user.repository.ts`, `modules/messaging/application/send-intent.service.ts`, `modules/messaging/infrastructure/prisma-inbox.repository.ts`, `modules/messaging/infrastructure/prisma-message.repository.ts`, `modules/messaging/infrastructure/prisma-reaction.repository.ts`, `modules/observability/metrics-memory.spec.ts`, `modules/observability/metrics.service.ts`, `modules/observability/new-recipients.service.ts`, `modules/observability/reply-rate.service.ts`, `modules/observability/retention.service.ts`, `modules/observability/session-event.logger.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `modules/proxies/domain/proxy.repository.ts`, `modules/proxies/infrastructure/prisma-proxy.repository.ts`, `modules/sessions/application/session-account-inventory.service.spec.ts`, `modules/sessions/application/session-account-inventory.service.ts`, `modules/sessions/application/session-config.service.ts`, `modules/sessions/application/session-manager.lifecycle.spec.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/infrastructure/baileys/baileys-cache-observer.ts`, `modules/sessions/infrastructure/baileys/baileys.engine.ts`, `modules/sessions/infrastructure/baileys/postgres-auth-state.ts`, `modules/sessions/infrastructure/postgres-session-lease.ts`, `modules/sessions/infrastructure/prisma-connect-link.repository.ts`, `modules/sessions/infrastructure/prisma-session.repository.ts`, `modules/webhooks/infrastructure/prisma-webhook.repository.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `gateway/test/ack-persistence.e2e-spec.ts`, `gateway/test/audit.e2e-spec.ts`, `gateway/test/auth.e2e-spec.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`, `gateway/test/baileys-offline.e2e-spec.ts`, `gateway/test/baileys-qr-exhaustion.e2e-spec.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/campaign-bullmq6.e2e-spec.ts`, `gateway/test/campaign-recovery.e2e-spec.ts`, `gateway/test/connect-links.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/conversas-grupo.e2e-spec.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`, `gateway/test/f6.e2e-spec.ts`, `gateway/test/g4.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/g7.e2e-spec.ts`, `gateway/test/g8.e2e-spec.ts`, `gateway/test/guardrail-c10.e2e-spec.ts`, `gateway/test/guardrail-default.e2e-spec.ts`, `gateway/test/inbox-triage.e2e-spec.ts`, `gateway/test/media.e2e-spec.ts`, `gateway/test/messaging.e2e-spec.ts`, `gateway/test/nest12-contract.e2e-spec.ts`, `gateway/test/nest12-shutdown.e2e-spec.ts`, `gateway/test/new-recipients.e2e-spec.ts`, `gateway/test/proxies-lote-uso.e2e-spec.ts`, `gateway/test/proxies.e2e-spec.ts`, `gateway/test/proxy-affinity.e2e-spec.ts`, `gateway/test/proxy-create-session.e2e-spec.ts`, `gateway/test/proxy-suggestion.e2e-spec.ts`, `gateway/test/refresh-token-purge.e2e-spec.ts`, `gateway/test/reply-rate-identity.e2e-spec.ts`, `gateway/test/send-contracts.e2e-spec.ts`, `gateway/test/session-account-inventory.e2e-spec.ts`, `gateway/test/session-lease.e2e-spec.ts`, `gateway/test/sessions.e2e-spec.ts`, `gateway/test/setup-app.ts`, `gateway/test/undelivered-observer.e2e-spec.ts`, `gateway/test/webhook-bullmq6.e2e-spec.ts`, `gateway/test/webhooks.e2e-spec.ts`

**class `PrismaService`** L35 · @Injectable · `extends PrismaClient`, `implements OnModuleInit`, `implements OnModuleDestroy`
- injeta (construtor): `config: ConfigService<Env, true> (param)`
- `logger` · L40 · private · campo
- `constructor(config)` · L42
  - chama: `sslConfig` L22
- `onModuleInit()` · L72 · async
- `onModuleDestroy()` · L77 · async

**Funções e constantes de topo**
- `sslConfig(config)` · L22
  - chamado por: `constructor` L42

## `infra/redis/event-fanout.ts`

98 linhas · caminho: `apps/gateway/src/infra/redis/event-fanout.ts`
- importa (interno): `shared-kernel/domain-event.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/ulid.ts`, `infra/redis/redis.service.ts`
- importado por: `infra/redis/redis.module.ts`, `gateway/test/nest12-shutdown.e2e-spec.ts`

**class `EventFanout`** L37 · @Injectable · `implements OnModuleInit`, `implements OnModuleDestroy`
- injeta (construtor): `eventBus: EventBus` · `redis: RedisService`
- `logger` · L39 · private · campo
- `instanceId` · L40 · private · campo
  - chama: `newId` (ulid.ts:4)
- `sub` · L41 · private · campo
- `constructor(eventBus, redis)` · L43
- `onModuleInit()` · L48 · async
  - chama: `onRemote` L73, `withoutRaw` L19, `EventBus.subscribe` (event-bus.ts:26)
  - env: `EVENT_FANOUT`, `NODE_ENV`
  - assina evento: `'wa.event'`
- `onRemote(msg)` · L73 · private
  - chama: `EventBus.publish` (event-bus.ts:21)
  - chamado por: `onModuleInit` L48
  - publica evento: `'wa.event.remote'`
- `onModuleDestroy()` · L90 · async

**Funções e constantes de topo**
- `withoutRaw(e)` · L19
  - chamado por: `onModuleInit` L48

## `infra/redis/redis-connection.ts`

60 linhas · caminho: `apps/gateway/src/infra/redis/redis-connection.ts`
- importa (interno): `bootstrap/config.ts`
- importado por: `infra/redis/redis.service.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `gateway/test/bullmq-redis-compat.e2e-spec.ts`, `gateway/test/bullmq-shutdown-pending.e2e-spec.ts`, `gateway/test/campaign-bullmq6.e2e-spec.ts`, `gateway/test/campaign-recovery.e2e-spec.ts`, `gateway/test/nest12-shutdown.e2e-spec.ts`, `gateway/test/webhook-bullmq6.e2e-spec.ts`

**Funções e constantes de topo**
- `redisConnection(config)` · L21
  - chamado por: `RedisService.constructor` (redis.service.ts:12), `CampaignQueue.onModuleInit` (campaign-queue.ts:114), `WebhookQueue.onModuleInit` (webhook-queue.ts:77)

**Tipos**
- interface `RedisConnection` L11 · 7 propriedade(s)

## `infra/redis/redis.module.ts`

11 linhas · caminho: `apps/gateway/src/infra/redis/redis.module.ts`
- importa (interno): `infra/redis/event-fanout.ts`, `infra/redis/redis.service.ts`
- importado por: `app.module.ts`

**@Module `RedisModule`** L5
- providers: `[RedisService, EventFanout]`
- exports: `[RedisService]`

**class `RedisModule`** L5 · @Global · @Module({ providers: [RedisService, EventFanout], exports: [RedisSe…)

## `infra/redis/redis.service.ts`

30 linhas · caminho: `apps/gateway/src/infra/redis/redis.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/redis/redis-connection.ts`
- importado por: `infra/redis/event-fanout.ts`, `infra/redis/redis.module.ts`, `modules/contacts/application/contact-check-quota.service.spec.ts`, `modules/contacts/application/contact-check-quota.service.ts`, `modules/health/health-memory.spec.ts`, `modules/health/health-probes.spec.ts`, `modules/health/health.service.ts`, `modules/observability/metrics-memory.spec.ts`, `modules/observability/metrics.service.ts`, `modules/proxies/application/proxy-resolver.service.ts`, `gateway/test/contacts-quota.e2e-spec.ts`, `gateway/test/nest12-shutdown.e2e-spec.ts`, `gateway/test/proxy-affinity.e2e-spec.ts`

**class `RedisService`** L7 · @Injectable · `implements OnModuleDestroy`
- injeta (construtor): `config: ConfigService<Env, true> (param)`
- `logger` · L9 · private · campo
- `constructor(config)` · L12
  - chama: `redisConnection` (redis-connection.ts:21)
- `ping()` · L18 · async
  - chamado por: `HealthService.check` (health.service.ts:53)
- `onModuleDestroy()` · L26 · async

## `infra/storage/media-storage.service.ts`

152 linhas · caminho: `apps/gateway/src/infra/storage/media-storage.service.ts`
- importa (interno): `bootstrap/config.ts`
- importado por: `infra/storage/storage.module.ts`, `modules/health/health-memory.spec.ts`, `modules/health/health-probes.spec.ts`, `modules/health/health.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/application/session-manager.service.ts`, `gateway/test/media.e2e-spec.ts`

**class `StorageUnavailableError`** L17 · `extends Error`
- injeta (construtor): `cause: unknown (param)`
- `constructor(cause)` · L18
  - chamado por: `getObject` L118

**class `MediaStorage`** L36 · @Injectable · `implements OnModuleInit`
- injeta (construtor): `config: ConfigService<Env, true>`
- `logger` · L38 · private · campo
- `constructor(config)` · L43
- `onModuleInit()` · L58 · async
- `probeCache` · L78 · private · campo
- `probeWrite()` · L80 · async
  - chama: `put` L103
  - chamado por: `HealthService.check` (health.service.ts:53)
- `put(key, body, contentType)` · L103 · async
  - chamado por: `probeWrite` L80, `SessionManager.getOrCreateEngine` (session-manager.service.ts:392)
- `getObject(key)` · L118 · async
  - chama: `isNotFound` L25, `constructor` L18
  - chamado por: `MessagesController.downloadMedia` (messages.controller.ts:442)
- `presignedGetUrl(key)` · L144
  - chamado por: `MessagesController.toDtos` (messages.controller.ts:291), `SessionManager.handleEngineEvent` (session-manager.service.ts:610)

**Funções e constantes de topo**
- `isNotFound(e)` · L25
  - chamado por: `getObject` L118

## `infra/storage/storage.module.ts`

10 linhas · caminho: `apps/gateway/src/infra/storage/storage.module.ts`
- importa (interno): `infra/storage/media-storage.service.ts`
- importado por: `app.module.ts`

**@Module `StorageModule`** L4
- providers: `[MediaStorage]`
- exports: `[MediaStorage]`

**class `StorageModule`** L4 · @Global · @Module({ providers: [MediaStorage], exports: [MediaStorage], })
