<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `observability`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/observability/metrics.controller.ts` | 41 |
| `modules/observability/metrics.service.ts` | 165 |
| `modules/observability/new-recipients.service.ts` | 160 |
| `modules/observability/observability.controller.ts` | 54 |
| `modules/observability/observability.module.ts` | 24 |
| `modules/observability/reply-rate.service.ts` | 252 |
| `modules/observability/retention.service.spec.ts` | 39 |
| `modules/observability/retention.service.ts` | 115 |
| `modules/observability/session-event.logger.ts` | 53 |

## `modules/observability/metrics.controller.ts`

41 linhas · caminho: `apps/gateway/src/modules/observability/metrics.controller.ts`
- importa (interno): `modules/observability/metrics.service.ts`
- importado por: `modules/observability/observability.module.ts`

**class `MetricsController`** L18 · @Controller('metrics')
- injeta (construtor): `metrics: MetricsService`
- `constructor(metrics)` · L20
- `scrape(req, token, reply)` · L22 · async · @Get
  - chama: `MetricsService.collect` (metrics.service.ts:74)
  - env: `METRICS_TOKEN`

## `modules/observability/metrics.service.ts`

165 linhas · caminho: `apps/gateway/src/modules/observability/metrics.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/redis/redis.service.ts`, `shared-kernel/memory.ts`, `shared-kernel/process-errors.ts`, `shared-kernel/disconnect-stats.ts`
- importado por: `modules/observability/metrics.controller.ts`, `modules/observability/observability.controller.ts`, `modules/observability/observability.module.ts`, `gateway/test/baileys-disconnect.e2e-spec.ts`

**class `MetricsService`** L19 · @Injectable · `implements OnModuleInit`
- injeta (construtor): `prisma: PrismaService` · `redis: RedisService`
- `registry` · L21 · campo
- `logger` · L22 · private · campo
- `COUNTERS_TTL_S` · L32 · private · static · campo
- `COUNTERS_KEY` · L33 · private · static · campo
- `countersInFlight` · L34 · private · campo
- `constructor(prisma, redis)` · L36
- `onModuleInit()` · L41
- `collect()` · L74 · async
  - chama: `refresh` L112
  - chamado por: `MetricsController.scrape` (metrics.controller.ts:22)
- `summary()` · L80 · async
  - chama: `counters` L128, `memoryStats` (memory.ts:93)
  - chamado por: `ObservabilityController.summary` (observability.controller.ts:19)
- `timeline(sessionId, limit)` · L97 · async
  - chamado por: `ObservabilityController.timeline` (observability.controller.ts:24)
  - banco: `waSessionEvent.findMany`
- `refresh()` · L112 · private · async
  - chama: `counters` L128, `disconnectTotals` (disconnect-stats.ts:18), `processErrorTotals` (process-errors.ts:13)
  - chamado por: `collect` L74
- `counters()` · L128 · private · async
  - chamado por: `refresh` L112, `summary` L80
  - banco: `waMessage.count`, `waSession.groupBy`

**Tipos**
- interface `Counters` L11 · 3 propriedade(s)

## `modules/observability/new-recipients.service.ts`

160 linhas · caminho: `apps/gateway/src/modules/observability/new-recipients.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`
- importado por: `modules/observability/observability.controller.ts`, `modules/observability/observability.module.ts`, `gateway/test/new-recipients.e2e-spec.ts`

**class `NewRecipientsService`** L14 · @Injectable
- injeta (construtor): `prisma: PrismaService`
- `constructor(prisma)` · L16
- `compute(ref, computedAt)` · L18 · async
  - chamado por: `ObservabilityController.newRecipientMetrics` (observability.controller.ts:49)
  - banco: `waSession.findUnique`

**Tipos**
- interface `RawMetric` L5 · 3 propriedade(s)

## `modules/observability/observability.controller.ts`

54 linhas · caminho: `apps/gateway/src/modules/observability/observability.controller.ts`
- importa (interno): `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/observability/metrics.service.ts`, `modules/observability/reply-rate.service.ts`, `modules/observability/new-recipients.service.ts`
- importado por: `modules/observability/observability.module.ts`

**class `ObservabilityController`** L10 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('observability')
- injeta (construtor): `metrics: MetricsService` · `replyRate: ReplyRateService` · `newRecipients: NewRecipientsService`
- `constructor(metrics, replyRate, newRecipients)` · L13
- `summary()` · L19 · @Get('summary')
  - chama: `MetricsService.summary` (metrics.service.ts:80)
- `timeline(sessionId, limit)` · L24 · @Get('timeline/:sessionId')
  - chama: `MetricsService.timeline` (metrics.service.ts:97)
- `replyRateMetrics(sessionId, window)` · L35 · @Get('reply-rate/:sessionId')
  - chama: `ReplyRateService.compute` (reply-rate.service.ts:69), `ReplyRateService.snapshot` (reply-rate.service.ts:74)
- `newRecipientMetrics(sessionId)` · L49 · @Get('new-recipients/:sessionId')
  - chama: `NewRecipientsService.compute` (new-recipients.service.ts:18)

## `modules/observability/observability.module.ts`

24 linhas · caminho: `apps/gateway/src/modules/observability/observability.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/observability/metrics.controller.ts`, `modules/observability/metrics.service.ts`, `modules/observability/observability.controller.ts`, `modules/observability/reply-rate.service.ts`, `modules/observability/retention.service.ts`, `modules/observability/session-event.logger.ts`, `modules/observability/new-recipients.service.ts`
- importado por: `app.module.ts`, `modules/guardrail/guardrail.module.ts`

**@Module `ObservabilityModule`** L11
- imports: `[IamModule]`
- controllers: `[MetricsController, ObservabilityController]`
- providers: `[ MetricsService, SessionEventLogger, ReplyRateService, RetentionService, NewRecipientsService, ]`
- exports: `[ReplyRateService]`

**class `ObservabilityModule`** L11 · @Module({ imports: [IamModule], // JwtAuthGuard / JwtModule control…)

## `modules/observability/reply-rate.service.ts`

252 linhas · caminho: `apps/gateway/src/modules/observability/reply-rate.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`
- importado por: `modules/guardrail/guardrail.service.ts`, `modules/observability/observability.controller.ts`, `modules/observability/observability.module.ts`, `gateway/test/ack-persistence.e2e-spec.ts`, `gateway/test/reply-rate-identity.e2e-spec.ts`

**class `ReplyRateService`** L30 · @Injectable
- injeta (construtor): `prisma: PrismaService` · `config: ConfigService<Env, true>`
- `nminCache` · L32 · private · campo
- `constructor(prisma, config)` · L34
- `nmin()` · L40 · private · async
  - chamado por: `computeFor` L82
  - banco: `guardrailConfig.findUnique`
- `resolveSessionId(ref)` · L60 · private · async
  - chamado por: `compute` L69, `snapshot` L74
  - banco: `waSession.findFirst`
- `compute(ref, windowDays)` · L69 · async
  - chama: `computeFor` L82, `resolveSessionId` L60
  - chamado por: `GuardrailService.evaluate` (guardrail.service.ts:249), `GuardrailService.health` (guardrail.service.ts:595), `ObservabilityController.replyRateMetrics` (observability.controller.ts:35)
- `snapshot(ref)` · L74 · async
  - chama: `computeFor` L82, `resolveSessionId` L60
  - chamado por: `ObservabilityController.replyRateMetrics` (observability.controller.ts:35)
- `computeFor(sessionId, windowDays)` · L82 · private · async
  - chama: `nmin` L40, `newId` (ulid.ts:4)
  - chamado por: `compute` L69, `snapshot` L74
  - banco: `sessionMetric.upsert`

**Tipos**
- type `ReplyRateResult` L12
- interface `RawRow` L21 · 6 propriedade(s)

## `modules/observability/retention.service.spec.ts`

39 linhas · caminho: `apps/gateway/src/modules/observability/retention.service.spec.ts`
- importa (interno): `modules/observability/retention.service.ts`

- describe “RetentionService.sweep — invariante D-038” · L8
  - it “não acessa session_proxy_assignments (modelo nem SQL cru)” · L11

## `modules/observability/retention.service.ts`

115 linhas · caminho: `apps/gateway/src/modules/observability/retention.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`
- importado por: `modules/observability/observability.module.ts`, `modules/observability/retention.service.spec.ts`, `gateway/test/ack-persistence.e2e-spec.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`

**class `RetentionService`** L12 · @Injectable · `implements OnApplicationBootstrap`
- injeta (construtor): `prisma: PrismaService`
- `logger` · L14 · private · campo
- `constructor(prisma)` · L16
- `onApplicationBootstrap()` · L18
  - chama: `sweep` L30
  - env: `NODE_ENV`, `RETENTION_SWEEP_HOURS`
- `sweep()` · L30 · async
  - chama: `purge` L95, `stripOldRaw` L80
  - chamado por: `onApplicationBootstrap` L18
  - banco: `messageReaction.deleteMany`, `pendingMessageAck.deleteMany`, `sendIntent.deleteMany`, `waAuditLog.deleteMany`, `waMessage.deleteMany`, `waSessionEvent.deleteMany`
- `cutoff(envName, defDays)` · L72 · private
  - chamado por: `purge` L95, `stripOldRaw` L80
- `stripOldRaw()` · L80 · private · async
  - chama: `cutoff` L72
  - chamado por: `sweep` L30
- `purge(label, envName, defDays, del)` · L95 · private · async
  - chama: `cutoff` L72
  - chamado por: `sweep` L30

## `modules/observability/session-event.logger.ts`

53 linhas · caminho: `apps/gateway/src/modules/observability/session-event.logger.ts`
- importa (interno): `shared-kernel/domain-event.ts`, `shared-kernel/event-bus/event-bus.ts`, `shared-kernel/ulid.ts`, `infra/prisma/prisma.service.ts`, `modules/sessions/application/engine.port.ts`
- importado por: `modules/observability/observability.module.ts`

**class `SessionEventLogger`** L13 · @Injectable · `implements OnModuleInit`
- injeta (construtor): `eventBus: EventBus` · `prisma: PrismaService`
- `logger` · L15 · private · campo
- `constructor(eventBus, prisma)` · L17
- `onModuleInit()` · L22
  - chama: `EventBus.subscribe` (event-bus.ts:26), `newId` (ulid.ts:4)
  - banco: `waSessionEvent.create`
  - assina evento: `'wa.event'`
