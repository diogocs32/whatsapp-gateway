<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `guardrail`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/guardrail/guardrail.controller.ts` | 56 |
| `modules/guardrail/guardrail.module.ts` | 18 |
| `modules/guardrail/guardrail.service.spec.ts` | 776 |
| `modules/guardrail/guardrail.service.ts` | 627 |
| `modules/guardrail/session-quarantined.exception.ts` | 19 |
| `modules/guardrail/undelivered-detector.service.spec.ts` | 88 |
| `modules/guardrail/undelivered-detector.service.ts` | 113 |

## `modules/guardrail/guardrail.controller.ts`

56 linhas · caminho: `apps/gateway/src/modules/guardrail/guardrail.controller.ts`
- importa (interno): `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/guardrail/guardrail.service.ts`
- importado por: `modules/guardrail/guardrail.module.ts`

**class `GuardrailController`** L25 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('guardrail')
- injeta (construtor): `guardrail: GuardrailService`
- `constructor(guardrail)` · L28
- `config()` · L32 · @Get('config')
  - chama: `GuardrailService.getConfig` (guardrail.service.ts:173)
- `updateConfig(body)` · L37 · @Patch('config') · @MinRole('ADMIN')
  - chama: `GuardrailService.updateConfig` (guardrail.service.ts:177), `MinRole` (roles.decorator.ts:8)
- `evaluate(sessionId)` · L51 · @Get(':sessionId')
  - chama: `GuardrailService.evaluate` (guardrail.service.ts:249)

**Funções e constantes de topo**
- `updateConfigSchema` = `z.object({ nmin: z.number().int().positive().optional(), throttleMult…` · L16

## `modules/guardrail/guardrail.module.ts`

18 linhas · caminho: `apps/gateway/src/modules/guardrail/guardrail.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/observability/observability.module.ts`, `modules/guardrail/guardrail.controller.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/undelivered-detector.service.ts`
- importado por: `app.module.ts`, `modules/campaigns/campaigns.module.ts`, `modules/messaging/messaging.module.ts`, `modules/sessions/sessions.module.ts`

**@Module `GuardrailModule`** L11
- imports: `[IamModule, ObservabilityModule]`
- controllers: `[GuardrailController]`
- providers: `[GuardrailService, UndeliveredDetectorService]`
- exports: `[GuardrailService]`

**class `GuardrailModule`** L11 · @Module({ imports: [IamModule, ObservabilityModule], controllers: […)

## `modules/guardrail/guardrail.service.spec.ts`

776 linhas · caminho: `apps/gateway/src/modules/guardrail/guardrail.service.spec.ts`
- importa (interno): `modules/guardrail/guardrail.service.ts`, `modules/guardrail/guardrail.service.ts`

- describe “GuardrailService.evaluate — tabela de decisão G5” · L235
  - it “amostra < Nmin → alvo aquecimento (sem veredito)” · L236
  - it “reply < baseline×quarantineMult → alvo quarentena” · L244
  - it “reply entre quarantine e throttle → alvo throttled” · L251
  - it “reply na faixa de histerese mantém o estado atual (não oscila)” · L257
  - it “reply >= baseline → alvo ativa” · L266
  - it “estado sticky (banida/pausa_manual) nunca é sobrescrito pela avaliação” · L272
  - it “mediana da frota vira o baseline quando há >= 2 sessões reliable” · L289
  - it “modo observação (enforce=false): transição calculada mas NUNCA aplicada” · L300
  - it “enforce=true: aplica a transição, seta cooldown e emite session.quarantined” · L310
- describe “GuardrailService.apply — idempotência C10” · L335
  - it “evento mais antigo que o último aplicado é ignorado” · L336
  - it “evento mais novo aplica e sair da quarentena para ativa limpa cooldown” · L347
- describe “GuardrailService.canSendCold — hard-gate” · L362
- describe “GuardrailService.fleetMedianReplyRate” · L390
  - it “frota pequena (< 2 reliable) → null (baseline cai no fallback)” · L399
  - it “quantidade ímpar → elemento central” · L404
  - it “quantidade par → média dos dois centrais” · L413
  - it “mediana ZERO não vira baseline (frota inteira sem resposta → null → alvo configurado)” · L424
  - it “snapshot com amostra abaixo do Nmin em vigor não entra na mediana” · L429
- describe “GuardrailService — cooldown e quarentena manual (WA-04)” · L439
  - it “quarentena com cooldown ativo NÃO sobe para ativa mesmo com taxa boa” · L440
  - it “quarentena com cooldown VENCIDO e taxa boa volta a ativa” · L460
  - it “quarentena MANUAL só sai por override explícito (amostra pequena não "cura")” · L478
  - it “baseline indisponível é explicitado no motivo” · L500
- describe “GuardrailService.recordHardSignal — taxonomia (WA-03)” · L508
  - it “401/loggedOut NÃO vira banida: só registra o último sinal” · L509
  - it “ban/restriction → banida; 463 só registra sinal (prazo nativo separado)” · L519
  - it “sem enforce nenhum sinal muda o estado” · L534
- describe “GuardrailService — pausa nativa temporária (P-048)” · L544
  - it “bloqueia também chat aberto sem banir e libera pelo relógio” · L545
  - it “data da notificação é provisória; o RPC substitui pelo prazo confirmado menor” · L587
  - it “RPC ativo sem prazo remoto conserva pausa provisória e não anuncia prazo confirmado” · L630
  - it “capping só substitui prazo provisório quando amplia a pausa” · L658
  - it “463 começa com pausa curta e prazo confirmado a substitui; repetição não amplia” · L695
  - it “timeEnforcementEnds prevalece sobre cycle_end_timestamp do capping” · L713
- describe “GuardrailService.apply — CAS (WA-07)” · L743
  - it “cria a linha quando não existe e aplica com evento mais novo” · L744
  - it “duas transições concorrentes: a que perde a corrida relê e não grava por cima de evento mais novo” · L752

## `modules/guardrail/guardrail.service.ts`

627 linhas · caminho: `apps/gateway/src/modules/guardrail/guardrail.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/process-errors.ts`, `shared-kernel/ulid.ts`, `modules/sessions/application/engine.port.ts`, `modules/observability/reply-rate.service.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/guardrail/guardrail.controller.ts`, `modules/guardrail/guardrail.module.ts`, `modules/guardrail/guardrail.service.spec.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/sessions/interface/sessions.controller.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`, `gateway/test/conversas-encaminhar.e2e-spec.ts`, `gateway/test/g5.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`

**class `GuardrailService`** L126 · @Injectable
- injeta (construtor): `prisma: PrismaService` · `replyRate: ReplyRateService` · `eventBus: EventBus` · `config: ConfigService<Env, true> (param)`
- `logger` · L128 · private · campo
- `cfgCache` · L131 · private · campo
- `constructor(prisma, replyRate, eventBus, config)` · L133
- `isEnforcing()` · L151
- `cfg()` · L157 · private · async
  - chamado por: `apply` L329, `evaluate` L249, `fleetMedianReplyRate` L230, `getConfig` L173
  - banco: `guardrailConfig.findUnique`
- `getConfig()` · L173 · async
  - chama: `cfg` L157
  - chamado por: `GuardrailController.config` (guardrail.controller.ts:32), `updateConfig` L177
- `updateConfig(patch)` · L177 · async
  - chama: `getConfig` L173
  - chamado por: `GuardrailController.updateConfig` (guardrail.controller.ts:37)
  - banco: `guardrailConfig.upsert`
- `emit(sessionId, event, payload)` · L190 · private · async
  - chama: `EventBus.publish` (event-bus.ts:21), `newId` (ulid.ts:4)
  - chamado por: `apply` L329, `canSendCold` L419, `canSendMessage` L438, `recordHardSignal` L549, `recordReachoutRestriction` L456
  - banco: `waSession.findUnique`
  - publica evento: `'wa.event'`
- `getState(sessionId)` · L216 · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `canSendCold` L419, `evaluate` L249, `health` L591, `SessionsController.getConfig` (sessions.controller.ts:194), `SessionsController.patchConfig` (sessions.controller.ts:201)
  - banco: `sessionGuardrail.upsert`
- `fleetMedianReplyRate()` · L230 · async
  - chama: `cfg` L157
  - chamado por: `evaluate` L249
  - banco: `sessionMetric.findMany`
- `evaluate(ref)` · L249 · async
  - chama: `apply` L329, `cfg` L157, `fleetMedianReplyRate` L230, `getState` L216, `ReplyRateService.compute` (reply-rate.service.ts:80)
  - chamado por: `GuardrailController.evaluate` (guardrail.controller.ts:51)
- `apply(sessionId, state, reason, eventTs, ctx, attempt)` · L329 · async
  - chama: `cfg` L157, `emit` L190, `emitFailed` L409, `newId` (ulid.ts:4)
  - chamado por: `evaluate` L249, `recordHardSignal` L549, `setManualState` L575
  - banco: `sessionGuardrail.create`, `sessionGuardrail.findUnique`, `sessionGuardrail.updateMany`
- `emitFailed(event, sessionId, e)` · L409 · private
  - chama: `recordProcessError` (process-errors.ts:9)
  - chamado por: `apply` L329, `canSendCold` L419, `canSendMessage` L438, `recordHardSignal` L549, `recordReachoutRestriction` L456
- `canSendCold(sessionId)` · L419 · async
  - chama: `canSendMessage` L438, `emit` L190, `emitFailed` L409, `getState` L216
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:146), `ForwardService.runReserved` (forward.service.ts:170), `MessagesController.assertColdAllowed` (messages.controller.ts:257)
- `canSendMessage(sessionId)` · L438 · async
  - chama: `emit` L190, `emitFailed` L409
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:146), `canSendCold` L419, `ForwardService.runReserved` (forward.service.ts:170), `SessionManager.sending` (session-manager.service.ts:1365)
  - banco: `sessionGuardrail.findUnique`
- `recordReachoutRestriction(sessionId, signal, options)` · L456 · async
  - chama: `emit` L190, `emitFailed` L409, `recordHardSignal` L549
  - chamado por: `SessionManager.getOrCreateEngine` (session-manager.service.ts:367)
  - banco: `sessionGuardrail.updateMany`
- `recordHardSignal(sessionId, signal)` · L549 · async
  - chama: `apply` L329, `emit` L190, `emitFailed` L409, `newId` (ulid.ts:4)
  - chamado por: `recordReachoutRestriction` L456
  - banco: `sessionGuardrail.upsert`
- `setManualState(ref, action)` · L575 · async
  - chama: `apply` L329
  - chamado por: `SessionsController.override` (sessions.controller.ts:321)
  - banco: `waSession.findFirst`
- `health(ref)` · L591 · async
  - chama: `getState` L216, `ReplyRateService.compute` (reply-rate.service.ts:80)
  - chamado por: `SessionsController.health` (sessions.controller.ts:185)
- `statesFor(sessionIds)` · L617 · async
  - chamado por: `SessionsController.list` (sessions.controller.ts:159)
  - banco: `sessionGuardrail.findMany`

**Funções e constantes de topo**
- `STICKY` = `new Set(['banida', 'pausa_manual'])` · L38
- `BLOCKS_COLD` = `new Set([ 'quarentena', 'banida', 'pausa_manual', ])` · L40

**Tipos**
- type `GuardrailState` L20
- type `ManualAction` L28
- interface `GuardrailEvaluation` L56 · 11 propriedade(s)
- interface `ColdGate` L70 · 4 propriedade(s)
- interface `MessageGate` L77 · 4 propriedade(s)
- interface `SessionHealth` L85 · 15 propriedade(s)
- interface `GuardrailTunables` L104 · 5 propriedade(s)
- type `GuardrailRow` L113

## `modules/guardrail/session-quarantined.exception.ts`

19 linhas · caminho: `apps/gateway/src/modules/guardrail/session-quarantined.exception.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/campaigns/infrastructure/campaign-restriction.spec.ts`, `modules/messaging/application/forward.service.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/application/session-manager.service.ts`, `gateway/test/baileys-restriction.e2e-spec.ts`

**class `SessionQuarantinedException`** L5 · `extends HttpException`
- injeta (construtor): `state: string (param)` · `reason: string | null (param)`
- `constructor(state, reason)` · L6
  - chamado por: `MessagesController.assertColdAllowed` (messages.controller.ts:257), `SessionManager.sending` (session-manager.service.ts:1365)

## `modules/guardrail/undelivered-detector.service.spec.ts`

88 linhas · caminho: `apps/gateway/src/modules/guardrail/undelivered-detector.service.spec.ts`
- importa (interno): `modules/guardrail/undelivered-detector.service.ts`

- describe “observador de não-entrega” · L42
  - it “desligado não agenda consultas no boot” · L43
  - it “opt-in agenda sem sobrepor ciclos e cancela no shutdown” · L52
  - it “registra candidatos sem aplicar sinal ou mutar estado” · L64
  - it “erro na consulta não derruba o job” · L77

## `modules/guardrail/undelivered-detector.service.ts`

113 linhas · caminho: `apps/gateway/src/modules/guardrail/undelivered-detector.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`
- importado por: `modules/guardrail/guardrail.module.ts`, `modules/guardrail/undelivered-detector.service.spec.ts`, `gateway/test/undelivered-observer.e2e-spec.ts`

**class `UndeliveredDetectorService`** L23 · @Injectable · `implements OnApplicationBootstrap`, `implements OnApplicationShutdown`
- injeta (construtor): `prisma: PrismaService` · `config: ConfigService<Env, true> (param)`
- `logger` · L27 · private · campo
- `timer` · L32 · private · campo
- `stopped` · L33 · private · campo
- `constructor(prisma, config)` · L35
- `onApplicationBootstrap()` · L45
  - chama: `runScheduled` L65
  - env: `NODE_ENV`
- `onApplicationShutdown()` · L60
- `runScheduled()` · L65 · private · async
  - chama: `sweep` L77
  - chamado por: `onApplicationBootstrap` L45
- `sweep()` · L77 · async
  - chamado por: `runScheduled` L65

**Tipos**
- interface `StuckRow` L11 · 4 propriedade(s)
