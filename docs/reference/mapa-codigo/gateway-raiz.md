<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — raiz (main.ts, app.module.ts)

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `app.module.ts` | 53 |
| `main.ts` | 100 |

## `app.module.ts`

53 linhas · caminho: `apps/gateway/src/app.module.ts`
- importa (interno): `bootstrap/config.ts`, `bootstrap/http-logger.ts`, `shared-kernel/shared-kernel.module.ts`, `infra/prisma/prisma.module.ts`, `infra/redis/redis.module.ts`, `infra/storage/storage.module.ts`, `infra/directory/directory.module.ts`, `modules/health/health.module.ts`, `modules/observability/observability.module.ts`, `modules/iam/iam.module.ts`, `modules/sessions/sessions.module.ts`, `modules/messaging/messaging.module.ts`, `modules/events/events.module.ts`, `modules/webhooks/webhooks.module.ts`, `modules/proxies/proxies.module.ts`, `modules/groups/groups.module.ts`, `modules/contacts/contacts.module.ts`, `modules/channels/channels.module.ts`, `modules/campaigns/campaigns.module.ts`, `modules/guardrail/guardrail.module.ts`
- importado por: `main.ts`, `gateway/test/setup-app.ts`

**@Module `AppModule`** L25
- imports: `[ ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), // Logs estruturados da app inteira (item 18 da auditoria 07/2026): JSON em produção // (grep/Loki-ready — a engine Baileys já logava JSON via pino; isto unifica). Regras do // request-log (níveis, /health e /metrics, redação) em bootstrap/http-logger.ts. LoggerModule.forRoot({ pinoHttp: httpLoggerOptions() }), SharedKernelModule,…`

**class `AppModule`** L25 · @Module({ imports: [ ConfigModule.forRoot({ isGlobal: true, validat…)

## `main.ts`

100 linhas · caminho: `apps/gateway/src/main.ts`
- importa (interno): `app.module.ts`, `bootstrap/console-bridge.ts`, `bootstrap/fastify-adapter.ts`, `bootstrap/logging-exception.filter.ts`, `bootstrap/rate-limit.ts`, `bootstrap/config.ts`, `shared-kernel/process-errors.ts`

**Funções e constantes de topo**
- `bootstrap()` · L16 · async
  - chama: `bridgeConsoleToLogger` (console-bridge.ts:42), `buildFastifyAdapter` (fastify-adapter.ts:11), `new LoggingExceptionFilter` (logging-exception.filter.ts), `rateLimitMaxFromEnv` (rate-limit.ts:6), `registerRateLimit` (rate-limit.ts:23), `recordProcessError` (process-errors.ts:9)
  - chamado por: `(módulo:L99)` L99

**Código de topo**
- `(módulo:L99)` · L99
  - chama: `bootstrap` L16
