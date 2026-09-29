<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `campaigns`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/campaigns/application/campaign.service.ts` | 127 |
| `modules/campaigns/campaigns.module.ts` | 17 |
| `modules/campaigns/infrastructure/campaign-queue.ts` | 426 |
| `modules/campaigns/infrastructure/campaign-restriction.spec.ts` | 169 |
| `modules/campaigns/infrastructure/campaign.repository.ts` | 300 |
| `modules/campaigns/interface/campaigns.controller.ts` | 200 |

## `modules/campaigns/application/campaign.service.ts`

127 linhas · caminho: `apps/gateway/src/modules/campaigns/application/campaign.service.ts`
- importa (interno): `modules/campaigns/infrastructure/campaign.repository.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`
- importado por: `modules/campaigns/campaigns.module.ts`, `modules/campaigns/interface/campaigns.controller.ts`, `gateway/test/campaign-bullmq6.e2e-spec.ts`, `gateway/test/campaign-recovery.e2e-spec.ts`

**class `CampaignService`** L12 · @Injectable
- injeta (construtor): `repo: CampaignRepository` · `queue: CampaignQueue`
- `logger` · L14 · private · campo
- `constructor(repo, queue)` · L16
- `list(sessionId)` · L21
  - chama: `CampaignRepository.list` (campaign.repository.ts:79)
  - chamado por: `CampaignsController.list` (campaigns.controller.ts:100)
- `get(id)` · L24
  - chama: `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:73)
  - chamado por: `CampaignsController.ensure` (campaigns.controller.ts:184)
- `recipients(id)` · L27
  - chama: `CampaignRepository.listRecipients` (campaign.repository.ts:87)
  - chamado por: `CampaignsController.recipients` (campaigns.controller.ts:145)
- `create(data, autostart)` · L31 · async
  - chama: `start` L40, `CampaignRepository.create` (campaign.repository.ts:41), `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:73)
  - chamado por: `CampaignsController.create` (campaigns.controller.ts:105)
- `start(id)` · L40 · async
  - chama: `scheduleOrPause` L80, `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:73), `CampaignRepository.transitionToRunning` (campaign.repository.ts:127)
  - chamado por: `create` L31, `CampaignsController.start` (campaigns.controller.ts:158)
- `schedulePending(id, c, epoch)` · L58 · private · async
  - chama: `randInt` L8, `CampaignQueue.enqueueSend` (campaign-queue.ts:168), `CampaignRepository.listPendingRecipients` (campaign.repository.ts:95)
  - chamado por: `scheduleOrPause` L80
- `scheduleOrPause(id, c, epoch)` · L80 · private · async
  - chama: `schedulePending` L58, `CampaignRepository.pauseIfRunning` (campaign.repository.ts:118)
  - chamado por: `resume` L103, `start` L40
- `pause(id)` · L95 · async
  - chama: `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:73), `CampaignRepository.updateStatus` (campaign.repository.ts:106)
  - chamado por: `CampaignsController.pause` (campaigns.controller.ts:163)
- `resume(id)` · L103 · async
  - chama: `scheduleOrPause` L80, `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:73), `CampaignRepository.transitionToRunning` (campaign.repository.ts:127)
  - chamado por: `CampaignsController.resume` (campaigns.controller.ts:168)
- `cancel(id)` · L117 · async
  - chama: `CampaignRepository.cancelPending` (campaign.repository.ts:258), `CampaignRepository.findByIdOrThrow` (campaign.repository.ts:73), `CampaignRepository.updateStatus` (campaign.repository.ts:106)
  - chamado por: `CampaignsController.cancel` (campaigns.controller.ts:173)
- `remove(id)` · L123 · async
  - chama: `CampaignRepository.delete` (campaign.repository.ts:265)
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

426 linhas · caminho: `apps/gateway/src/modules/campaigns/infrastructure/campaign-queue.ts`
- importa (interno): `bootstrap/config.ts`, `infra/redis/redis-connection.ts`, `shared-kernel/safe-fetch.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/session-quarantined.exception.ts`, `modules/sessions/application/session-lease.error.ts`, `modules/sessions/application/engine.port.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/campaigns/infrastructure/campaign.repository.ts`
- importado por: `modules/campaigns/application/campaign.service.ts`, `modules/campaigns/campaigns.module.ts`, `modules/campaigns/infrastructure/campaign-restriction.spec.ts`, `gateway/test/campaign-bullmq6.e2e-spec.ts`, `gateway/test/campaign-recovery.e2e-spec.ts`, `gateway/test/nest12-shutdown.e2e-spec.ts`

**class `SendSlotUnavailableError`** L89 · `extends Error`

**class `CampaignQueue`** L98 · @Injectable · `implements OnModuleInit`, `implements OnApplicationBootstrap`, `implements OnModuleDestroy`
- injeta (construtor): `config: ConfigService<Env, true>` · `repo: CampaignRepository` · `manager: SessionManager` · `guardrail: GuardrailService`
- `logger` · L102 · private · campo
- `closing` · L105 · private · campo
- `constructor(config, repo, manager, guardrail)` · L107
- `onModuleInit()` · L114 · async
  - chama: `redisConnection` (redis-connection.ts:21), `process` L235
- `onApplicationBootstrap()` · L150
  - chama: `SessionManager.whenRehydrated` (session-manager.service.ts:342)
- `enqueueSend(data, delayMs, jobId)` · L168
  - chamado por: `CampaignService.schedulePending` (campaign.service.ts:58)
  - enfileira: `this.queue.add('send')` L174 · jobId = `parâmetro jobId (montado pelos chamadores — ver tabela abaixo)`
- `delay(job, token, delayMs)` · L183 · private · async
  - chamado por: `process` L235, `retrySession` L195
- `retrySession(job, token)` · L195 · private · async
  - chama: `delay` L183, `randInt` L59
  - chamado por: `process` L235
- `waitForGlobalSendSlot()` · L207 · private · async
  - chama: `new SendSlotUnavailableError`, `sleep` L62
  - chamado por: `process` L235
- `process(job, token)` · L235 · private · async
  - chama: `delay` L183, `retrySession` L195, `waitForGlobalSendSlot` L207, `fetchMedia` L69, `randInt` L59, `sleep` L62, `CampaignRepository.findById` (campaign.repository.ts:69), `CampaignRepository.markRecipientFailed` (campaign.repository.ts:251), `CampaignRepository.markRecipientSent` (campaign.repository.ts:244), `CampaignRepository.pauseIfRunning` (campaign.repository.ts:118), `CampaignRepository.refreshCounts` (campaign.repository.ts:270), `CampaignRepository.releaseRecipient` (campaign.repository.ts:224), `CampaignRepository.reserveRecipient` (campaign.repository.ts:154), `GuardrailService.canSendCold` (guardrail.service.ts:419), `GuardrailService.canSendMessage` (guardrail.service.ts:438), `SessionManager.sendMedia` (session-manager.service.ts:1275), `SessionManager.sendPresence` (session-manager.service.ts:1299), `SessionManager.sendText` (session-manager.service.ts:1265)
  - chamado por: `onModuleInit` L114
- `onModuleDestroy()` · L408 · async

**Funções e constantes de topo**
- `SEND_SLOT_SCRIPT` = `` local now = tonumber(ARGV[1]) local interval = tonumber(ARGV[2]) lo…` · L47
- `randInt(min, max)` · L59
  - chamado por: `process` L235, `retrySession` L195
- `sleep(ms)` · L62
  - chamado por: `process` L235, `waitForGlobalSendSlot` L207
- `fetchMedia(url, fallbackMime, maxBytes)` · L69 · async
  - chama: `egressPolicyFromEnv` (safe-fetch.ts:23), `safeFetch` (safe-fetch.ts:235)
  - chamado por: `process` L235

**Tipos**
- interface `CampaignJob` L34 · 4 propriedade(s)

## `modules/campaigns/infrastructure/campaign-restriction.spec.ts`

169 linhas · caminho: `apps/gateway/src/modules/campaigns/infrastructure/campaign-restriction.spec.ts`
- importa (interno): `modules/guardrail/session-quarantined.exception.ts`, `modules/sessions/application/session-lease.error.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`

- describe “CampaignQueue — restrição temporária da sessão” · L89
  - it “reagenda sem PAUSED e retoma o mesmo destinatário quando o prazo vence” · L90
  - it “restrição entre a reserva e o envio libera o destinatário e reagenda” · L105
  - it “worker na réplica sem lease libera a reserva e reagenda sem FAILED” · L121
  - it “shutdown da réplica libera a reserva e reagenda sem FAILED” · L135
  - it “teto diário ocupado só por reserva transitória não pausa a campanha” · L148

## `modules/campaigns/infrastructure/campaign.repository.ts`

300 linhas · caminho: `apps/gateway/src/modules/campaigns/infrastructure/campaign.repository.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `shared-kernel/local-day.ts`, `shared-kernel/ulid.ts`
- importado por: `modules/campaigns/application/campaign.service.ts`, `modules/campaigns/campaigns.module.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`, `gateway/test/campaign-bullmq6.e2e-spec.ts`, `gateway/test/campaign-recovery.e2e-spec.ts`, `gateway/test/nest12-shutdown.e2e-spec.ts`

**class `CampaignRepository`** L37 · @Injectable
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L39
- `create(d)` · L41 · async
  - chama: `findByIdOrThrow` L73, `newId` (ulid.ts:4)
  - chamado por: `CampaignService.create` (campaign.service.ts:31)
  - banco: `campaign.create`
- `findById(id)` · L69
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:235), `findByIdOrThrow` L73
  - banco: `campaign.findUnique`
- `findByIdOrThrow(id)` · L73 · async
  - chama: `findById` L69
  - chamado por: `CampaignService.cancel` (campaign.service.ts:117), `CampaignService.create` (campaign.service.ts:31), `CampaignService.get` (campaign.service.ts:24), `CampaignService.pause` (campaign.service.ts:95), `CampaignService.resume` (campaign.service.ts:103), `CampaignService.start` (campaign.service.ts:40), `create` L41
- `list(sessionId)` · L79
  - chamado por: `CampaignService.list` (campaign.service.ts:21)
  - banco: `campaign.findMany`
- `listRecipients(campaignId, limit)` · L87
  - chamado por: `CampaignService.recipients` (campaign.service.ts:27)
  - banco: `campaignRecipient.findMany`
- `listPendingRecipients(campaignId)` · L95
  - chamado por: `CampaignService.schedulePending` (campaign.service.ts:58)
  - banco: `campaignRecipient.findMany`
- `findRecipient(id)` · L102
  - banco: `campaignRecipient.findUnique`
- `updateStatus(id, status, extra)` · L106
  - chamado por: `CampaignService.cancel` (campaign.service.ts:117), `CampaignService.pause` (campaign.service.ts:95)
  - banco: `campaign.update`
- `pauseIfRunning(id, scheduleEpoch)` · L118
  - chamado por: `CampaignService.scheduleOrPause` (campaign.service.ts:80), `CampaignQueue.process` (campaign-queue.ts:235)
  - banco: `campaign.updateMany`
- `transitionToRunning(id, startedAt)` · L127 · async
  - chamado por: `CampaignService.resume` (campaign.service.ts:103), `CampaignService.start` (campaign.service.ts:40)
  - banco: `campaign.findUniqueOrThrow`, `campaign.updateMany`
- `reserveRecipient(campaignId, recipientId, opts)` · L154 · async
  - chama: `sessionTimezone` L231, `startOfLocalDay` (local-day.ts:8)
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:235)
  - banco: `campaignRecipient.count`, `campaignRecipient.findUnique`, `campaignRecipient.update`
- `releaseRecipient(id, reservedAt)` · L224
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:235)
  - banco: `campaignRecipient.updateMany`
- `sessionTimezone(tx, campaignId)` · L231 · private · async
  - chamado por: `reserveRecipient` L154
  - banco: `campaign.findUnique`
- `markRecipientSent(id, keyId)` · L244
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:235)
  - banco: `campaignRecipient.update`
- `markRecipientFailed(id, error)` · L251
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:235)
  - banco: `campaignRecipient.update`
- `cancelPending(campaignId)` · L258
  - chamado por: `CampaignService.cancel` (campaign.service.ts:117)
  - banco: `campaignRecipient.updateMany`
- `delete(id)` · L265
  - chamado por: `CampaignService.remove` (campaign.service.ts:123)
  - banco: `campaign.delete`
- `refreshCounts(campaignId)` · L270 · async
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:235)
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
  - chama: `CampaignService.pause` (campaign.service.ts:95), `run` L192
- `resume(id)` · L168 · async · @Post(':id/resume')
  - chama: `CampaignService.resume` (campaign.service.ts:103), `run` L192
- `cancel(id)` · L173 · async · @Post(':id/cancel')
  - chama: `CampaignService.cancel` (campaign.service.ts:117), `run` L192
- `remove(id)` · L178 · async · @Delete(':id')
  - chama: `CampaignService.remove` (campaign.service.ts:123), `run` L192
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
