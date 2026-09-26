<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `webhooks`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/webhooks/application/webhook-dispatcher.service.ts` | 87 |
| `modules/webhooks/domain/webhook.entity.ts` | 14 |
| `modules/webhooks/domain/webhook.repository.ts` | 24 |
| `modules/webhooks/infrastructure/prisma-webhook.repository.ts` | 80 |
| `modules/webhooks/infrastructure/webhook-queue.ts` | 293 |
| `modules/webhooks/interface/dto.ts` | 12 |
| `modules/webhooks/interface/webhooks.controller.ts` | 164 |
| `modules/webhooks/webhooks.module.ts` | 19 |

## `modules/webhooks/application/webhook-dispatcher.service.ts`

87 linhas · caminho: `apps/gateway/src/modules/webhooks/application/webhook-dispatcher.service.ts`
- importa (interno): `shared-kernel/domain-event.ts`, `shared-kernel/event-bus/event-bus.ts`, `modules/sessions/application/engine.port.ts`, `modules/webhooks/domain/webhook.entity.ts`, `modules/webhooks/domain/webhook.repository.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`
- importado por: `modules/webhooks/interface/webhooks.controller.ts`, `modules/webhooks/webhooks.module.ts`, `gateway/test/baileys-offline.e2e-spec.ts`, `gateway/test/webhooks.e2e-spec.ts`

**class `WebhookDispatcher`** L20 · @Injectable · `implements OnModuleInit`
- injeta (construtor): `repo: @Inject(WEBHOOK_REPOSITORY) WebhookRepository` · `eventBus: EventBus` · `queue: WebhookQueue`
- `logger` · L22 · private · campo
- `webhooks` · L23 · private · campo
- `constructor(repo, eventBus, queue)` · L25
- `onModuleInit()` · L31 · async
  - chama: `handle` L46, `refresh` L42, `EventBus.subscribe` (event-bus.ts:26)
  - assina evento: `'wa.event'`, `'wa.event.remote'`
- `refresh()` · L42 · async
  - chama: `WebhookRepository.listEnabled` (webhook.repository.ts:17)
  - chamado por: `onModuleInit` L31, `WebhooksController.create` (webhooks.controller.ts:60), `WebhooksController.disable` (webhooks.controller.ts:117), `WebhooksController.enable` (webhooks.controller.ts:109), `WebhooksController.remove` (webhooks.controller.ts:125)
- `handle(env)` · L46 · private
  - chama: `stripRaw` L13, `WebhookQueue.enqueue` (webhook-queue.ts:135)
  - chamado por: `onModuleInit` L31

**Funções e constantes de topo**
- `stripRaw(payload)` · L13
  - chamado por: `handle` L46

## `modules/webhooks/domain/webhook.entity.ts`

14 linhas · caminho: `apps/gateway/src/modules/webhooks/domain/webhook.entity.ts`
- importado por: `modules/webhooks/application/webhook-dispatcher.service.ts`, `modules/webhooks/domain/webhook.repository.ts`, `modules/webhooks/infrastructure/prisma-webhook.repository.ts`, `modules/webhooks/interface/webhooks.controller.ts`

**class `Webhook`** L1
- injeta (construtor): `id: string` · `sessionId: string | null` · `url: string` · `events: string[]` · `secret: string | null` · `headers: Record<string, string> | null` · `enabled: boolean` · `maxAttempts: number` · `createdAt: Date`
- `constructor(id, sessionId, url, events, secret, headers, enabled, maxAt…)` · L2
  - chamado por: `PrismaWebhookRepository.toDomain` (prisma-webhook.repository.ts:25)

## `modules/webhooks/domain/webhook.repository.ts`

24 linhas · caminho: `apps/gateway/src/modules/webhooks/domain/webhook.repository.ts`
- importa (interno): `modules/webhooks/domain/webhook.entity.ts`
- importado por: `modules/webhooks/application/webhook-dispatcher.service.ts`, `modules/webhooks/infrastructure/prisma-webhook.repository.ts`, `modules/webhooks/interface/webhooks.controller.ts`, `modules/webhooks/webhooks.module.ts`

**Funções e constantes de topo**
- `WEBHOOK_REPOSITORY` = `Symbol('WEBHOOK_REPOSITORY')` · L23

**Tipos**
- interface `CreateWebhookInput` L3 · 8 propriedade(s)
- interface `WebhookRepository` L14
  - `WebhookRepository.create(input)` · L15
    - implementado por: `PrismaWebhookRepository.create` (prisma-webhook.repository.ts:39)
    - chamado por: `WebhooksController.create` (webhooks.controller.ts:60)
  - `WebhookRepository.list()` · L16
    - implementado por: `PrismaWebhookRepository.list` (prisma-webhook.repository.ts:55)
    - chamado por: `WebhooksController.list` (webhooks.controller.ts:55)
  - `WebhookRepository.listEnabled()` · L17
    - implementado por: `PrismaWebhookRepository.listEnabled` (prisma-webhook.repository.ts:62)
    - chamado por: `WebhookDispatcher.refresh` (webhook-dispatcher.service.ts:42)
  - `WebhookRepository.findById(id)` · L18
    - implementado por: `PrismaWebhookRepository.findById` (prisma-webhook.repository.ts:67)
    - chamado por: `WebhooksController.ensure` (webhooks.controller.ts:158)
  - `WebhookRepository.setEnabled(id, enabled)` · L19
    - implementado por: `PrismaWebhookRepository.setEnabled` (prisma-webhook.repository.ts:72)
    - chamado por: `WebhooksController.disable` (webhooks.controller.ts:117), `WebhooksController.enable` (webhooks.controller.ts:109)
  - `WebhookRepository.delete(id)` · L20
    - implementado por: `PrismaWebhookRepository.delete` (prisma-webhook.repository.ts:76)
    - chamado por: `WebhooksController.remove` (webhooks.controller.ts:125)

## `modules/webhooks/infrastructure/prisma-webhook.repository.ts`

80 linhas · caminho: `apps/gateway/src/modules/webhooks/infrastructure/prisma-webhook.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `modules/webhooks/domain/webhook.entity.ts`, `modules/webhooks/domain/webhook.repository.ts`
- importado por: `modules/webhooks/webhooks.module.ts`

**class `PrismaWebhookRepository`** L21 · @Injectable · `implements WebhookRepository`
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L23
- `toDomain(r)` · L25 · private
  - chama: `Webhook.constructor` (webhook.entity.ts:2)
  - chamado por: `create` L39, `findById` L67, `list` L55, `listEnabled` L62
- `create(input)` · L39 · async
  - implementa: `WebhookRepository.create` (webhook.repository.ts:15)
  - chama: `toDomain` L25
  - banco: `webhook.create`
- `list()` · L55 · async
  - implementa: `WebhookRepository.list` (webhook.repository.ts:16)
  - chama: `toDomain` L25
  - banco: `webhook.findMany`
- `listEnabled()` · L62 · async
  - implementa: `WebhookRepository.listEnabled` (webhook.repository.ts:17)
  - chama: `toDomain` L25
  - banco: `webhook.findMany`
- `findById(id)` · L67 · async
  - implementa: `WebhookRepository.findById` (webhook.repository.ts:18)
  - chama: `toDomain` L25
  - banco: `webhook.findUnique`
- `setEnabled(id, enabled)` · L72 · async
  - implementa: `WebhookRepository.setEnabled` (webhook.repository.ts:19)
  - banco: `webhook.update`
- `delete(id)` · L76 · async
  - implementa: `WebhookRepository.delete` (webhook.repository.ts:20)
  - banco: `webhook.delete`

**Tipos**
- interface `Row` L9 · 9 propriedade(s)

## `modules/webhooks/infrastructure/webhook-queue.ts`

293 linhas · caminho: `apps/gateway/src/modules/webhooks/infrastructure/webhook-queue.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `infra/redis/redis-connection.ts`, `shared-kernel/safe-fetch.ts`, `shared-kernel/ulid.ts`
- importado por: `modules/webhooks/application/webhook-dispatcher.service.ts`, `modules/webhooks/interface/webhooks.controller.ts`, `modules/webhooks/webhooks.module.ts`, `gateway/test/baileys-offline.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`, `gateway/test/webhooks.e2e-spec.ts`

**class `WebhookQueue`** L66 · @Injectable · `implements OnModuleInit`, `implements OnModuleDestroy`
- injeta (construtor): `config: ConfigService<Env, true>` · `prisma: PrismaService`
- `logger` · L68 · private · campo
- `constructor(config, prisma)` · L72
- `onModuleInit()` · L77 · async
  - chama: `redisConnection` (redis-connection.ts:21), `eventOf` L35, `deliver` L151, `toDeadLetter` L191
- `enqueue(data, attempts, jobId)` · L135 · async
  - chamado por: `WebhookDispatcher.handle` (webhook-dispatcher.service.ts:46), `redeliverDeadLetters` L219, `WebhooksController.test` (webhooks.controller.ts:133)
  - enfileira: `this.queue.add('deliver')` L140 · jobId = `parâmetro jobId (montado pelos chamadores — ver tabela abaixo)`
- `deliver(data)` · L151 · private · async
  - chama: `safeCustomHeaders` L54, `assertEgressAllowed` (safe-fetch.ts:133), `egressPolicyFromEnv` (safe-fetch.ts:23), `parseEgressUrl` (safe-fetch.ts:104)
  - chamado por: `onModuleInit` L77
- `toDeadLetter(data, error, attempts)` · L191 · private · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `onModuleInit` L77
  - banco: `webhookDeadLetter.create`
- `listDeadLetters(includeRedelivered)` · L209 · async
  - chamado por: `WebhooksController.deadLetters` (webhooks.controller.ts:98)
  - banco: `webhookDeadLetter.findMany`
- `redeliverDeadLetters(limit)` · L219 · async
  - chama: `enqueue` L135
  - chamado por: `WebhooksController.redeliver` (webhooks.controller.ts:104)
  - banco: `webhook.findUnique`, `webhookDeadLetter.findMany`, `webhookDeadLetter.update`, `webhookDeadLetter.updateMany`
- `onModuleDestroy()` · L276 · async

**Funções e constantes de topo**
- `eventOf(data)` · L35
  - chamado por: `onModuleInit` L77
- `RESERVED_HEADERS` = `new Set([ 'content-type', 'content-length', 'host', 'transfer-encodin…` · L45
- `safeCustomHeaders(headers)` · L54
  - chamado por: `deliver` L151

**Tipos**
- interface `WebhookJob` L26 · 5 propriedade(s)

## `modules/webhooks/interface/dto.ts`

12 linhas · caminho: `apps/gateway/src/modules/webhooks/interface/dto.ts`
- importado por: `modules/webhooks/interface/webhooks.controller.ts`

**Funções e constantes de topo**
- `createWebhookSchema` = `z.object({ sessionId: z.string().min(1).nullish(), url: z.string().ur…` · L3

## `modules/webhooks/interface/webhooks.controller.ts`

164 linhas · caminho: `apps/gateway/src/modules/webhooks/interface/webhooks.controller.ts`
- importa (interno): `shared-kernel/safe-fetch.ts`, `shared-kernel/ulid.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `modules/webhooks/domain/webhook.entity.ts`, `modules/webhooks/domain/webhook.repository.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `modules/webhooks/interface/dto.ts`
- importado por: `modules/webhooks/webhooks.module.ts`

**class `WebhooksController`** L45 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @MinRole('ADMIN') · @Controller('webhooks')
- injeta (construtor): `repo: @Inject(WEBHOOK_REPOSITORY) WebhookRepository` · `dispatcher: WebhookDispatcher` · `queue: WebhookQueue`
- `constructor(repo, dispatcher, queue)` · L49
- `list()` · L55 · async · @Get
  - chama: `WebhookRepository.list` (webhook.repository.ts:16)
- `create(body)` · L60 · async · @Post
  - chama: `WebhookDispatcher.refresh` (webhook-dispatcher.service.ts:42), `WebhookRepository.create` (webhook.repository.ts:15), `toDto` L32, `assertEgressAllowed` (safe-fetch.ts:133), `egressPolicyFromEnv` (safe-fetch.ts:23), `parseEgressUrl` (safe-fetch.ts:104), `newId` (ulid.ts:4)
- `deadLetters()` · L98 · async · @Get('dead-letters')
  - chama: `WebhookQueue.listDeadLetters` (webhook-queue.ts:209)
- `redeliver()` · L104 · async · @Post('dead-letters/redeliver')
  - chama: `WebhookQueue.redeliverDeadLetters` (webhook-queue.ts:219)
- `enable(id)` · L109 · async · @Post(':id/enable')
  - chama: `WebhookDispatcher.refresh` (webhook-dispatcher.service.ts:42), `WebhookRepository.setEnabled` (webhook.repository.ts:19), `ensure` L158
- `disable(id)` · L117 · async · @Post(':id/disable')
  - chama: `WebhookDispatcher.refresh` (webhook-dispatcher.service.ts:42), `WebhookRepository.setEnabled` (webhook.repository.ts:19), `ensure` L158
- `remove(id)` · L125 · async · @Delete(':id')
  - chama: `WebhookDispatcher.refresh` (webhook-dispatcher.service.ts:42), `WebhookRepository.delete` (webhook.repository.ts:20), `ensure` L158
- `test(id)` · L133 · async · @Post(':id/test')
  - chama: `WebhookQueue.enqueue` (webhook-queue.ts:135), `ensure` L158, `newId` (ulid.ts:4)
- `ensure(id)` · L158 · private · async
  - chama: `WebhookRepository.findById` (webhook.repository.ts:18)
  - chamado por: `disable` L117, `enable` L109, `remove` L125, `test` L133

**Funções e constantes de topo**
- `toDto(w)` · L32
  - chamado por: `create` L60

## `modules/webhooks/webhooks.module.ts`

19 linhas · caminho: `apps/gateway/src/modules/webhooks/webhooks.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/webhooks/application/webhook-dispatcher.service.ts`, `modules/webhooks/domain/webhook.repository.ts`, `modules/webhooks/infrastructure/prisma-webhook.repository.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `modules/webhooks/interface/webhooks.controller.ts`
- importado por: `app.module.ts`

**@Module `WebhooksModule`** L9
- imports: `[IamModule]`
- controllers: `[WebhooksController]`
- providers: `[ WebhookQueue, WebhookDispatcher, { provide: WEBHOOK_REPOSITORY, useClass: PrismaWebhookRepository }, ]`

**class `WebhooksModule`** L9 · @Module({ imports: [IamModule], controllers: [WebhooksController], …)
