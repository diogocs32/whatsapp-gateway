<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — módulo `observability`

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `modules/observability/metrics.controller.ts` | 41 |
| `modules/observability/metrics.service.ts` | 154 |
| `modules/observability/observability.controller.ts` | 45 |
| `modules/observability/observability.module.ts` | 22 |
| `modules/observability/reply-rate.service.ts` | 205 |
| `modules/observability/retention.service.ts` | 105 |
| `modules/observability/session-event.logger.ts` | 53 |

## `modules/observability/metrics.controller.ts`

41 linhas · caminho: `apps/gateway/src/modules/observability/metrics.controller.ts`
- importa (interno): `modules/observability/metrics.service.ts`
- importado por: `modules/observability/observability.module.ts`

**class `MetricsController`** L18 · @Controller('metrics')
- injeta (construtor): `metrics: MetricsService`
- `constructor(metrics)` · L20
- `scrape(req, token, reply)` · L22 · async · @Get
  - chama: `MetricsService.collect` (metrics.service.ts:66)
  - env: `METRICS_TOKEN`

## `modules/observability/metrics.service.ts`

154 linhas · caminho: `apps/gateway/src/modules/observability/metrics.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`, `infra/redis/redis.service.ts`, `shared-kernel/memory.ts`, `shared-kernel/process-errors.ts`
- importado por: `modules/observability/metrics.controller.ts`, `modules/observability/observability.controller.ts`, `modules/observability/observability.module.ts`

**class `MetricsService`** L18 · @Injectable · `implements OnModuleInit`
- injeta (construtor): `prisma: PrismaService` · `redis: RedisService`
- `registry` · L20 · campo
- `logger` · L21 · private · campo
- `COUNTERS_TTL_S` · L30 · private · static · campo
- `COUNTERS_KEY` · L31 · private · static · campo
- `countersInFlight` · L32 · private · campo
- `constructor(prisma, redis)` · L34
- `onModuleInit()` · L39
- `collect()` · L66 · async
  - chama: `refresh` L104
  - chamado por: `MetricsController.scrape` (metrics.controller.ts:22)
- `summary()` · L72 · async
  - chama: `counters` L117, `memoryStats` (memory.ts:93)
  - chamado por: `ObservabilityController.summary` (observability.controller.ts:17)
- `timeline(sessionId, limit)` · L89 · async
  - chamado por: `ObservabilityController.timeline` (observability.controller.ts:22)
  - banco: `waSessionEvent.findMany`
- `refresh()` · L104 · private · async
  - chama: `counters` L117, `processErrorTotals` (process-errors.ts:13)
  - chamado por: `collect` L66
- `counters()` · L117 · private · async
  - chamado por: `refresh` L104, `summary` L72
  - banco: `waMessage.count`, `waSession.groupBy`

**Tipos**
- interface `Counters` L10 · 3 propriedade(s)

## `modules/observability/observability.controller.ts`

45 linhas · caminho: `apps/gateway/src/modules/observability/observability.controller.ts`
- importa (interno): `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/roles.guard.ts`, `modules/observability/metrics.service.ts`, `modules/observability/reply-rate.service.ts`
- importado por: `modules/observability/observability.module.ts`

**class `ObservabilityController`** L9 · @UseGuards(ApiKeyAuthGuard, RolesGuard) · @Controller('observability')
- injeta (construtor): `metrics: MetricsService` · `replyRate: ReplyRateService`
- `constructor(metrics, replyRate)` · L12
- `summary()` · L17 · @Get('summary')
  - chama: `MetricsService.summary` (metrics.service.ts:72)
- `timeline(sessionId, limit)` · L22 · @Get('timeline/:sessionId')
  - chama: `MetricsService.timeline` (metrics.service.ts:89)
- `replyRateMetrics(sessionId, window)` · L33 · @Get('reply-rate/:sessionId')
  - chama: `ReplyRateService.compute` (reply-rate.service.ts:80), `ReplyRateService.snapshot` (reply-rate.service.ts:85)

## `modules/observability/observability.module.ts`

22 linhas · caminho: `apps/gateway/src/modules/observability/observability.module.ts`
- importa (interno): `modules/iam/iam.module.ts`, `modules/observability/metrics.controller.ts`, `modules/observability/metrics.service.ts`, `modules/observability/observability.controller.ts`, `modules/observability/reply-rate.service.ts`, `modules/observability/retention.service.ts`, `modules/observability/session-event.logger.ts`
- importado por: `app.module.ts`, `modules/guardrail/guardrail.module.ts`

**@Module `ObservabilityModule`** L10
- imports: `[IamModule]`
- controllers: `[MetricsController, ObservabilityController]`
- providers: `[ MetricsService, SessionEventLogger, ReplyRateService, RetentionService, ]`
- exports: `[ReplyRateService]`

**class `ObservabilityModule`** L10 · @Module({ imports: [IamModule], // JwtAuthGuard / JwtModule control…)

## `modules/observability/reply-rate.service.ts`

205 linhas · caminho: `apps/gateway/src/modules/observability/reply-rate.service.ts`
- importa (interno): `bootstrap/config.ts`, `infra/prisma/prisma.service.ts`, `shared-kernel/ulid.ts`
- importado por: `modules/guardrail/guardrail.service.ts`, `modules/observability/observability.controller.ts`, `modules/observability/observability.module.ts`

**class `ReplyRateService`** L41 · @Injectable
- injeta (construtor): `prisma: PrismaService` · `config: ConfigService<Env, true>`
- `nminCache` · L43 · private · campo
- `constructor(prisma, config)` · L45
- `nmin()` · L51 · private · async
  - chamado por: `computeFor` L93
  - banco: `guardrailConfig.findUnique`
- `resolveSessionId(ref)` · L71 · private · async
  - chamado por: `compute` L80, `snapshot` L85
  - banco: `waSession.findFirst`
- `compute(ref, windowDays)` · L80 · async
  - chama: `computeFor` L93, `resolveSessionId` L71
  - chamado por: `GuardrailService.evaluate` (guardrail.service.ts:249), `GuardrailService.health` (guardrail.service.ts:591), `ObservabilityController.replyRateMetrics` (observability.controller.ts:33)
- `snapshot(ref)` · L85 · async
  - chama: `computeFor` L93, `resolveSessionId` L71
  - chamado por: `ObservabilityController.replyRateMetrics` (observability.controller.ts:33)
- `computeFor(sessionId, windowDays)` · L93 · private · async
  - chama: `nmin` L51, `newId` (ulid.ts:4)
  - chamado por: `compute` L80, `snapshot` L85
  - banco: `sessionMetric.upsert`

**Tipos**
- interface `ReplyRateResult` L11 · 12 propriedade(s)
- interface `RawRow` L33 · 5 propriedade(s)

## `modules/observability/retention.service.ts`

105 linhas · caminho: `apps/gateway/src/modules/observability/retention.service.ts`
- importa (interno): `infra/prisma/prisma.service.ts`
- importado por: `modules/observability/observability.module.ts`, `gateway/test/conversas-reacoes.e2e-spec.ts`

**class `RetentionService`** L12 · @Injectable · `implements OnApplicationBootstrap`
- injeta (construtor): `prisma: PrismaService`
- `logger` · L14 · private · campo
- `constructor(prisma)` · L16
- `onApplicationBootstrap()` · L18
  - chama: `sweep` L30
  - env: `NODE_ENV`, `RETENTION_SWEEP_HOURS`
- `sweep()` · L30 · async
  - chama: `purge` L85, `stripOldRaw` L70
  - chamado por: `onApplicationBootstrap` L18
  - banco: `messageReaction.deleteMany`, `sendIntent.deleteMany`, `waAuditLog.deleteMany`, `waMessage.deleteMany`, `waSessionEvent.deleteMany`
- `cutoff(envName, defDays)` · L62 · private
  - chamado por: `purge` L85, `stripOldRaw` L70
- `stripOldRaw()` · L70 · private · async
  - chama: `cutoff` L62
  - chamado por: `sweep` L30
- `purge(label, envName, defDays, del)` · L85 · private · async
  - chama: `cutoff` L62
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
