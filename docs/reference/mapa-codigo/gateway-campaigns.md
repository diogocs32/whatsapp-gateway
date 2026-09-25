<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `campaigns`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/campaigns/application/campaign.service.ts` | 116 |
| `modules/campaigns/campaigns.module.ts` | 17 |
| `modules/campaigns/infrastructure/campaign-queue.ts` | 259 |
| `modules/campaigns/infrastructure/campaign.repository.ts` | 263 |
| `modules/campaigns/interface/campaigns.controller.ts` | 200 |

## `modules/campaigns/application/campaign.service.ts`

116 linhas · caminho: `apps/gateway/src/modules/campaigns/application/campaign.service.ts`
- importa (interno): `modules/campaigns/infrastructure/campaign.repository.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`
- importado por: `modules/campaigns/campaigns.module.ts`, `modules/campaigns/interface/campaigns.controller.ts`

**class `CampaignService`** L12 · @Injectable
- injeta (construtor): `repo: CampaignRepository` · `queue: CampaignQueue`
- `logger` · L14 · private · campo
- `constructor(repo, queue)` · L16
- `list(sessionId)` · L21
  - chama: `CampaignRepository.list` (campaign.repository.ts:75)
  - chamado por: `CampaignsController.list` (campaigns.controller.ts:100)
- `get(id)` · L24
  - chama: `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:69)
  - chamado por: `CampaignsController.ensure` (campaigns.controller.ts:184)
- `recipients(id)` · L27
  - chama: `CampaignRepository.listRecipients` (campaign.repository.ts:83)
  - chamado por: `CampaignsController.recipients` (campaigns.controller.ts:145)
- `create(data, autostart)` · L31 · async
  - chama: `start` L40, `CampaignRepository.create` (campaign.repository.ts:37), `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:69)
  - chamado por: `CampaignsController.create` (campaigns.controller.ts:105)
- `start(id)` · L40 · async
  - chama: `schedulePending` L58, `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:69), `CampaignRepository.transitionToRunning` (campaign.repository.ts:115)
  - chamado por: `create` L31, `CampaignsController.start` (campaigns.controller.ts:158)
- `schedulePending(id, c, jobPrefix)` · L58 · private · async
  - chama: `randInt` L8, `CampaignQueue.enqueueSend` (campaign-queue.ts:114), `CampaignRepository.listPendingRecipients` (campaign.repository.ts:91)
  - chamado por: `resume` L88, `start` L40
- `pause(id)` · L80 · async
  - chama: `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:69), `CampaignRepository.updateStatus` (campaign.repository.ts:102)
  - chamado por: `CampaignsController.pause` (campaigns.controller.ts:163)
- `resume(id)` · L88 · async
  - chama: `schedulePending` L58, `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:69), `CampaignRepository.transitionToRunning` (campaign.repository.ts:115)
  - chamado por: `CampaignsController.resume` (campaigns.controller.ts:168)
- `cancel(id)` · L106 · async
  - chama: `CampaignRepository.cancelPending` (campaign.repository.ts:221), `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:69), `CampaignRepository.updateStatus` (campaign.repository.ts:102)
  - chamado por: `CampaignsController.cancel` (campaigns.controller.ts:173)
- `remove(id)` · L112 · async
  - chama: `CampaignRepository.delete` (campaign.repository.ts:228)
  - chamado por: `CampaignsController.remove` (campaigns.controller.ts:178)

**Funções e constantes de topo**
- `randInt(min, max)` · L8
  - chamado por: `schedulePending` L58

## `modules/campaigns/campaigns.module.ts`

17 linhas · caminho: `apps/gateway/src/modules/campaigns/campaigns.module.ts`
- importa (interno): `modules/guardrail/guardrail.module.ts`, `modules/iam/iam.module.ts`, `modules/sessions/sessions.module.ts`, `modules/campaigns/application/campaign.service.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/campaigns/infrastructure/campaign.repository.ts`, `modules/campaigns/interface/campaigns.controller.ts`
- importado por: `app.module.ts`

**@Module `CampaignsModule`** L10
- imports: `[IamModule, SessionsModule, GuardrailModule]`
- controllers: `[CampaignsController]`
- providers: `[CampaignRepository, CampaignQueue, CampaignService]`

**class `CampaignsModule`** L10 · @Module({ // JwtAuthGuard + SessionManager (envio) + GuardrailServi…)

## `modules/campaigns/infrastructure/campaign-queue.ts`

259 linhas · caminho: `apps/gateway/src/modules/campaigns/infrastructure/campaign-queue.ts`
- importa (interno): `bootstrap/config.ts`, `infra/redis/redis-connection.ts`, `shared-kernel/safe-fetch.ts`, `modules/guardrail/guardrail.service.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/campaigns/infrastructure/campaign.repository.ts`
- importado por: `modules/campaigns/application/campaign.service.ts`, `modules/campaigns/campaigns.module.ts`

**class `CampaignQueue`** L68 · @Injectable · `implements OnModuleInit`, `implements OnModuleDestroy`
- injeta (construtor): `config: ConfigService<Env, true>` · `repo: CampaignRepository` · `manager: SessionManager` · `guardrail: GuardrailService`
- `logger` · L70 · private · campo
- `constructor(config, repo, manager, guardrail)` · L74
- `onModuleInit()` · L81 · async
  - chama: `redisConnection` (redis-connection.ts:21), `process` L138
- `enqueueSend(data, delayMs, jobId)` · L114
  - chamado por: `CampaignService.schedulePending` (campaign.service.ts:58)
  - enfileira: `this.queue.add('send')` L120 · jobId = `parâmetro jobId (montado pelos chamadores — ver tabela abaixo)`
- `requeue(data)` · L129 · private · async
  - chamado por: `process` L138
  - enfileira: `this.queue.add('send')` L130 · sem jobId explícito
- `process(data)` · L138 · private · async
  - chama: `requeue` L129, `fetchMedia` L41, `randInt` L31, `sleep` L34, `CampaignRepository.findById` (campaign.repository.ts:65), `CampaignRepository.markRecipientFailed` (campaign.repository.ts:214), `CampaignRepository.markRecipientSent` (campaign.repository.ts:207), `CampaignRepository.refreshCounts` (campaign.repository.ts:233), `CampaignRepository.releaseRecipient` (campaign.repository.ts:187), `CampaignRepository.reserveRecipient` (campaign.repository.ts:128), `CampaignRepository.updateStatus` (campaign.repository.ts:102), `GuardrailService.canSendCold` (guardrail.service.ts:406), `SessionManager.sendMedia` (session-manager.service.ts:480), `SessionManager.sendPresence` (session-manager.service.ts:504), `SessionManager.sendText` (session-manager.service.ts:466)
  - chamado por: `onModuleInit` L81
- `onModuleDestroy()` · L242 · async

**Funções e constantes de topo**
- `randInt(min, max)` · L31
  - chamado por: `process` L138
- `sleep(ms)` · L34
  - chamado por: `process` L138
- `fetchMedia(url, fallbackMime, maxBytes)` · L41 · async
  - chama: `egressPolicyFromEnv` (safe-fetch.ts:23), `safeFetch` (safe-fetch.ts:186)
  - chamado por: `process` L138

**Tipos**
- interface `CampaignJob` L20 · 2 propriedade(s)

## `modules/campaigns/infrastructure/campaign.repository.ts`

263 linhas · caminho: `apps/gateway/src/modules/campaigns/infrastructure/campaign.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/local-day.ts`, `shared-kernel/ulid.ts`
- importado por: `modules/campaigns/application/campaign.service.ts`, `modules/campaigns/campaigns.module.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`

**class `CampaignRepository`** L33 · @Injectable
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L35
- `create(d)` · L37 · async
  - chama: `findByIdOrThrow` L69, `newId` (ulid.ts:4)
  - chamado por: `CampaignService.create` (campaign.service.ts:31)
  - banco: `campaign.create`
- `findById(id)` · L65
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `findByIdOrThrow` L69
  - banco: `campaign.findUnique`
- `findByIdOrThrow(id)` · L69 · async
  - chama: `findById` L65
  - chamado por: `CampaignService.cancel` (campaign.service.ts:106), `CampaignService.create` (campaign.service.ts:31), `CampaignService.get` (campaign.service.ts:24), `CampaignService.pause` (campaign.service.ts:80), `CampaignService.resume` (campaign.service.ts:88), `CampaignService.start` (campaign.service.ts:40), `create` L37
- `list(sessionId)` · L75
  - chamado por: `CampaignService.list` (campaign.service.ts:21)
  - banco: `campaign.findMany`
- `listRecipients(campaignId, limit)` · L83
  - chamado por: `CampaignService.recipients` (campaign.service.ts:27)
  - banco: `campaignRecipient.findMany`
- `listPendingRecipients(campaignId)` · L91
  - chamado por: `CampaignService.schedulePending` (campaign.service.ts:58)
  - banco: `campaignRecipient.findMany`
- `findRecipient(id)` · L98
  - banco: `campaignRecipient.findUnique`
- `updateStatus(id, status, extra)` · L102
  - chamado por: `CampaignService.cancel` (campaign.service.ts:106), `CampaignService.pause` (campaign.service.ts:80), `CampaignQueue.process` (campaign-queue.ts:138)
  - banco: `campaign.update`
- `transitionToRunning(id, startedAt)` · L115 · async
  - chamado por: `CampaignService.resume` (campaign.service.ts:88), `CampaignService.start` (campaign.service.ts:40)
  - banco: `campaign.updateMany`
- `reserveRecipient(campaignId, recipientId, opts)` · L128 · async
  - chama: `sessionTimezone` L194, `startOfLocalDay` (local-day.ts:8)
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138)
  - banco: `campaignRecipient.count`, `campaignRecipient.findUnique`, `campaignRecipient.update`
- `releaseRecipient(id)` · L187
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138)
  - banco: `campaignRecipient.updateMany`
- `sessionTimezone(tx, campaignId)` · L194 · private · async
  - chamado por: `reserveRecipient` L128
  - banco: `campaign.findUnique`
- `markRecipientSent(id, keyId)` · L207
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138)
  - banco: `campaignRecipient.update`
- `markRecipientFailed(id, error)` · L214
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138)
  - banco: `campaignRecipient.update`
- `cancelPending(campaignId)` · L221
  - chamado por: `CampaignService.cancel` (campaign.service.ts:106)
  - banco: `campaignRecipient.updateMany`
- `delete(id)` · L228
  - chamado por: `CampaignService.remove` (campaign.service.ts:112)
  - banco: `campaign.delete`
- `refreshCounts(campaignId)` · L233 · async
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138)
  - banco: `campaign.findUnique`, `campaign.update`, `campaignRecipient.groupBy`

**Tipos**
- interface `CreateCampaignData` L6 · 14 propriedade(s)
- type `ReserveRecipientResult` L24

## `modules/campaigns/interface/campaigns.controller.ts`

200 linhas · caminho: `apps/gateway/src/modules/campaigns/interface/campaigns.controller.ts`
- importa (interno): `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/campaigns/application/campaign.service.ts`
- importado por: `modules/campaigns/campaigns.module.ts`

**class `CampaignsController`** L95 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('campaigns')
- injeta (construtor): `service: CampaignService`
- `constructor(service)` · L98
- `list(sessionId)` · L100 · async · @Get
  - chama: `CampaignService.list` (campaign.service.ts:21)
- `create(body)` · L105 · async · @Post
  - chama: `CampaignService.create` (campaign.service.ts:31), `toDto` L71
- `get(id)` · L140 · async · @Get(':id')
  - chama: `ensure` L184, `toDto` L71
- `recipients(id)` · L145 · async · @Get(':id/recipients')
  - chama: `CampaignService.recipients` (campaign.service.ts:27), `ensure` L184
- `start(id)` · L158 · async · @Post(':id/start')
  - chama: `CampaignService.start` (campaign.service.ts:40), `run` L192
- `pause(id)` · L163 · async · @Post(':id/pause')
  - chama: `CampaignService.pause` (campaign.service.ts:80), `run` L192
- `resume(id)` · L168 · async · @Post(':id/resume')
  - chama: `CampaignService.resume` (campaign.service.ts:88), `run` L192
- `cancel(id)` · L173 · async · @Post(':id/cancel')
  - chama: `CampaignService.cancel` (campaign.service.ts:106), `run` L192
- `remove(id)` · L178 · async · @Delete(':id')
  - chama: `CampaignService.remove` (campaign.service.ts:112), `run` L192
- `ensure(id)` · L184 · private · async
  - chama: `CampaignService.get` (campaign.service.ts:24)
  - chamado por: `get` L140, `recipients` L145
- `run(fn)` · L192 · private · async
  - chamado por: `cancel` L173, `pause` L163, `remove` L178, `resume` L168, `start` L158

**Funções e constantes de topo**
- `createCampaignSchema` = `z .object({ sessionId: z.string().min(1), name: z.string().min(1).max…` · L18
- `toDto(c)` · L71
  - chamado por: `create` L105, `get` L140

**Tipos**
- type `CampaignRow` L49
