<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `guardrail`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/guardrail/guardrail.controller.ts` | 56 |
| `modules/guardrail/guardrail.module.ts` | 16 |
| `modules/guardrail/guardrail.service.spec.ts` | 529 |
| `modules/guardrail/guardrail.service.ts` | 505 |
| `modules/guardrail/session-quarantined.exception.ts` | 19 |

## `modules/guardrail/guardrail.controller.ts`

56 linhas · caminho: `apps/gateway/src/modules/guardrail/guardrail.controller.ts`
- importa (interno): `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.decorator.ts`, `modules/iam/interface/roles.guard.ts`, `modules/guardrail/guardrail.service.ts`
- importado por: `modules/guardrail/guardrail.module.ts`

**class `GuardrailController`** L25 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('guardrail')
- injeta (construtor): `guardrail: GuardrailService`
- `constructor(guardrail)` · L28
- `config()` · L32 · @Get('config')
  - chama: `GuardrailService.getConfig` (guardrail.service.ts:160)
- `updateConfig(body)` · L37 · @Patch('config') · @MinRole('ADMIN')
  - chama: `GuardrailService.updateConfig` (guardrail.service.ts:164), `MinRole` (roles.decorator.ts:8)
- `evaluate(sessionId)` · L51 · @Get(':sessionId')
  - chama: `GuardrailService.evaluate` (guardrail.service.ts:236)

**Funções e constantes de topo**
- `updateConfigSchema` = `z.object({ nmin: z.number().int().positive().optional(), throttleMult…` · L16

## `modules/guardrail/guardrail.module.ts`

16 linhas · caminho: `apps/gateway/src/modules/guardrail/guardrail.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/observability/observability.module.ts`, `modules/guardrail/guardrail.controller.ts`, `modules/guardrail/guardrail.service.ts`
- importado por: `app.module.ts`, `modules/campaigns/campaigns.module.ts`, `modules/messaging/messaging.module.ts`, `modules/sessions/sessions.module.ts`

**@Module `GuardrailModule`** L9
- imports: `[IamModule, ObservabilityModule]`
- controllers: `[GuardrailController]`
- providers: `[GuardrailService]`
- exports: `[GuardrailService]`

**class `GuardrailModule`** L9 · @Module({ imports: [IamModule, ObservabilityModule], controllers: […)

## `modules/guardrail/guardrail.service.spec.ts`

529 linhas · caminho: `apps/gateway/src/modules/guardrail/guardrail.service.spec.ts`
- importa (interno): `modules/guardrail/guardrail.service.ts`, `modules/guardrail/guardrail.service.ts`

- describe “GuardrailService.evaluate — tabela de decisão G5” · L187
  - it “amostra < Nmin → alvo aquecimento (sem veredito)” · L188
  - it “reply < baseline×quarantineMult → alvo quarentena” · L196
  - it “reply entre quarantine e throttle → alvo throttled” · L203
  - it “reply na faixa de histerese mantém o estado atual (não oscila)” · L209
  - it “reply >= baseline → alvo ativa” · L218
  - it “estado sticky (banida/pausa_manual) nunca é sobrescrito pela avaliação” · L224
  - it “mediana da frota vira o baseline quando há >= 2 sessões reliable” · L241
  - it “modo observação (enforce=false): transição calculada mas NUNCA aplicada” · L252
  - it “enforce=true: aplica a transição, seta cooldown e emite session.quarantined” · L262
- describe “GuardrailService.apply — idempotência C10” · L287
  - it “evento mais antigo que o último aplicado é ignorado” · L288
  - it “evento mais novo aplica e sair da quarentena para ativa limpa cooldown” · L299
- describe “GuardrailService.canSendCold — hard-gate” · L314
- describe “GuardrailService.fleetMedianReplyRate” · L342
  - it “frota pequena (< 2 reliable) → null (baseline cai no fallback)” · L351
  - it “quantidade ímpar → elemento central” · L356
  - it “quantidade par → média dos dois centrais” · L365
  - it “mediana ZERO não vira baseline (frota inteira sem resposta → null → alvo configurado)” · L376
  - it “snapshot com amostra abaixo do Nmin em vigor não entra na mediana” · L381
- describe “GuardrailService — cooldown e quarentena manual (WA-04)” · L391
  - it “quarentena com cooldown ativo NÃO sobe para ativa mesmo com taxa boa” · L392
  - it “quarentena com cooldown VENCIDO e taxa boa volta a ativa” · L412
  - it “quarentena MANUAL só sai por override explícito (amostra pequena não "cura")” · L430
  - it “baseline indisponível é explicitado no motivo” · L452
- describe “GuardrailService.recordHardSignal — taxonomia (WA-03)” · L460
  - it “401/loggedOut NÃO vira banida: só registra o último sinal” · L461
  - it “ban/restriction → banida; 463 → quarentena (com enforce)” · L471
  - it “sem enforce nenhum sinal muda o estado” · L486
- describe “GuardrailService.apply — CAS (WA-07)” · L496
  - it “cria a linha quando não existe e aplica com evento mais novo” · L497
  - it “duas transições concorrentes: a que perde a corrida relê e não grava por cima de evento mais novo” · L505

## `modules/guardrail/guardrail.service.ts`

505 linhas · caminho: `apps/gateway/src/modules/guardrail/guardrail.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/process-errors.ts`, `shared-kernel/ulid.ts`, `modules/sessions/application/engine.port.ts`, `modules/observability/reply-rate.service.ts`
- importado por: `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/guardrail/guardrail.controller.ts`, `modules/guardrail/guardrail.module.ts`, `modules/guardrail/guardrail.service.spec.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/sessions/interface/sessions.controller.ts`, `gateway/test/g5.e2e-spec.ts`, `gateway/test/g6.e2e-spec.ts`

**class `GuardrailService`** L113 · @Injectable
- injeta (construtor): `prisma: PrismaService` · `replyRate: ReplyRateService` · `eventBus: EventBus` · `config: ConfigService<Env, true> (param)`
- `logger` · L115 · private · campo
- `cfgCache` · L118 · private · campo
- `constructor(prisma, replyRate, eventBus, config)` · L120
- `isEnforcing()` · L138
- `cfg()` · L144 · private · async
  - chamado por: `apply` L316, `evaluate` L236, `fleetMedianReplyRate` L217, `getConfig` L160
  - banco: `guardrailConfig.findUnique`
- `getConfig()` · L160 · async
  - chama: `cfg` L144
  - chamado por: `GuardrailController.config` (guardrail.controller.ts:32), `updateConfig` L164
- `updateConfig(patch)` · L164 · async
  - chama: `getConfig` L160
  - chamado por: `GuardrailController.updateConfig` (guardrail.controller.ts:37)
  - banco: `guardrailConfig.upsert`
- `emit(sessionId, event, payload)` · L177 · private · async
  - chama: `EventBus.publish` (event-bus.ts:21), `newId` (ulid.ts:4)
  - chamado por: `apply` L316, `canSendCold` L406, `recordHardSignal` L427
  - banco: `waSession.findUnique`
  - publica evento: `'wa.event'`
- `getState(sessionId)` · L203 · async
  - chama: `newId` (ulid.ts:4)
  - chamado por: `canSendCold` L406, `evaluate` L236, `health` L473, `SessionsController.getConfig` (sessions.controller.ts:188), `SessionsController.patchConfig` (sessions.controller.ts:195)
  - banco: `sessionGuardrail.upsert`
- `fleetMedianReplyRate()` · L217 · async
  - chama: `cfg` L144
  - chamado por: `evaluate` L236
  - banco: `sessionMetric.findMany`
- `evaluate(ref)` · L236 · async
  - chama: `apply` L316, `cfg` L144, `fleetMedianReplyRate` L217, `getState` L203, `ReplyRateService.compute` (reply-rate.service.ts:80)
  - chamado por: `GuardrailController.evaluate` (guardrail.controller.ts:51)
- `apply(sessionId, state, reason, eventTs, ctx, attempt)` · L316 · async
  - chama: `cfg` L144, `emit` L177, `emitFailed` L396, `newId` (ulid.ts:4)
  - chamado por: `evaluate` L236, `recordHardSignal` L427, `setManualState` L457
  - banco: `sessionGuardrail.create`, `sessionGuardrail.findUnique`, `sessionGuardrail.updateMany`
- `emitFailed(event, sessionId, e)` · L396 · private
  - chama: `recordProcessError` (process-errors.ts:9)
  - chamado por: `apply` L316, `canSendCold` L406, `recordHardSignal` L427
- `canSendCold(sessionId)` · L406 · async
  - chama: `emit` L177, `emitFailed` L396, `getState` L203
  - chamado por: `CampaignQueue.process` (campaign-queue.ts:138), `MessagesController.assertColdAllowed` (messages.controller.ts:258)
- `recordHardSignal(sessionId, signal)` · L427 · async
  - chama: `apply` L316, `emit` L177, `emitFailed` L396, `newId` (ulid.ts:4)
  - banco: `sessionGuardrail.upsert`
- `setManualState(ref, action)` · L457 · async
  - chama: `apply` L316
  - chamado por: `SessionsController.override` (sessions.controller.ts:315)
  - banco: `waSession.findFirst`
- `health(ref)` · L473 · async
  - chama: `getState` L203, `ReplyRateService.compute` (reply-rate.service.ts:80)
  - chamado por: `SessionsController.health` (sessions.controller.ts:179)
- `statesFor(sessionIds)` · L495 · async
  - chamado por: `SessionsController.list` (sessions.controller.ts:153)
  - banco: `sessionGuardrail.findMany`

**Funções e constantes de topo**
- `STICKY` = `new Set(['banida', 'pausa_manual'])` · L37
- `BLOCKS_COLD` = `new Set([ 'quarentena', 'banida', 'pausa_manual', ])` · L39

**Tipos**
- type `GuardrailState` L19
- type `ManualAction` L27
- interface `GuardrailEvaluation` L55 · 11 propriedade(s)
- interface `ColdGate` L69 · 3 propriedade(s)
- interface `SessionHealth` L76 · 14 propriedade(s)
- interface `GuardrailTunables` L94 · 5 propriedade(s)
- type `GuardrailRow` L103

## `modules/guardrail/session-quarantined.exception.ts`

19 linhas · caminho: `apps/gateway/src/modules/guardrail/session-quarantined.exception.ts`
- importado por: `modules/messaging/interface/messages.controller.ts`

**class `SessionQuarantinedException`** L5 · `extends HttpException`
- injeta (construtor): `state: string (param)` · `reason: string | null (param)`
- `constructor(state, reason)` · L6
  - chamado por: `MessagesController.assertColdAllowed` (messages.controller.ts:258)
