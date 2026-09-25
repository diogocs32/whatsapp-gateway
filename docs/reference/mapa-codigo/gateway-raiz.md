<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — raiz (main.ts, app.module.ts)

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `app.module.ts` | 82 |
| `main.ts` | 107 |

## `app.module.ts`

82 linhas · caminho: `apps/gateway/src/app.module.ts`
- importa (interno): `bootstrap/config.ts`, `bootstrap/log-redaction.ts`, `shared-kernel/shared-kernel.module.ts`, `infra/prisma/prisma.module.ts`, `infra/redis/redis.module.ts`, `infra/storage/storage.module.ts`, `infra/directory/directory.module.ts`, `modules/health/health.module.ts`, `modules/observability/observability.module.ts`, `modules/iam/iam.module.ts`, `modules/sessions/sessions.module.ts`, `modules/messaging/messaging.module.ts`, `modules/events/events.module.ts`, `modules/webhooks/webhooks.module.ts`, `modules/proxies/proxies.module.ts`, `modules/groups/groups.module.ts`, `modules/contacts/contacts.module.ts`, `modules/channels/channels.module.ts`, `modules/campaigns/campaigns.module.ts`, `modules/guardrail/guardrail.module.ts`
- importado por: `main.ts`, `gateway/test/setup-app.ts`

**@Module `AppModule`** L25
- imports: `[ ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), // Logs estruturados da app inteira (item 18 da auditoria 07/2026): JSON em produção // (grep/Loki-ready — a engine Baileys já logava JSON via pino; isto unifica), pretty em dev, // silencioso nos e2e. Request-log só para mutações e erros — GET 2xx é silencioso (o polling // do dashboard inundaria o console); /health e /metrics nu…`

**class `AppModule`** L25 · @Module({ imports: [ ConfigModule.forRoot({ isGlobal: true, validat…)

## `main.ts`

107 linhas · caminho: `apps/gateway/src/main.ts`
- importa (interno): `app.module.ts`, `bootstrap/console-bridge.ts`, `bootstrap/fastify-adapter.ts`, `bootstrap/logging-exception.filter.ts`, `bootstrap/config.ts`, `shared-kernel/process-errors.ts`

**Funções e constantes de topo**
- `bootstrap()` · L16 · async
  - chama: `bridgeConsoleToLogger` (console-bridge.ts:42), `buildFastifyAdapter` (fastify-adapter.ts:10), `new LoggingExceptionFilter` (logging-exception.filter.ts), `recordProcessError` (process-errors.ts:9)
  - chamado por: `(módulo:L106)` L106
  - env: `RATE_LIMIT_MAX`

**Código de topo**
- `(módulo:L106)` · L106
  - chama: `bootstrap` L16
