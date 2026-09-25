<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — bootstrap (config, logs, adapter)

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `bootstrap/config.ts` | 180 |
| `bootstrap/console-bridge.spec.ts` | 81 |
| `bootstrap/console-bridge.ts` | 71 |
| `bootstrap/fastify-adapter.ts` | 39 |
| `bootstrap/log-redaction.pino-http.spec.ts` | 91 |
| `bootstrap/log-redaction.spec.ts` | 183 |
| `bootstrap/log-redaction.ts` | 169 |
| `bootstrap/logging-exception.filter.spec.ts` | 74 |
| `bootstrap/logging-exception.filter.ts` | 128 |

## `bootstrap/config.ts`

180 linhas · caminho: `apps/gateway/src/bootstrap/config.ts`
- importado por: `app.module.ts`, `infra/prisma/prisma.service.ts`, `infra/redis/redis-connection.ts`, `infra/redis/redis.service.ts`, `infra/storage/media-storage.service.ts`, `main.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/guardrail/guardrail.service.ts`, `modules/iam/application/auth-session.service.ts`, `modules/iam/application/license.service.ts`, `modules/iam/application/token.service.ts`, `modules/iam/iam.module.ts`, `modules/iam/infrastructure/admin-seeder.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/auth.controller.ts`, `modules/iam/interface/auth.guard.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/reply-rate.service.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`, `modules/proxies/infrastructure/webshare.client.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `gateway/test/config.e2e-spec.ts`

**Funções e constantes de topo**
- `TRUE_WORDS` = `new Set(['true', '1', 'yes', 'on'])` · L16
- `FALSE_WORDS` = `new Set(['false', '0', 'no', 'off'])` · L17
- `envBool(def)` · L18
  - chamado por: `base` L33
- `envStr()` · L30
  - chamado por: `base` L33
- `base` = `z.object({ NODE_ENV: z .enum(['development', 'production', 'test']) .…` · L33
  - chama: `envBool` L18, `envStr` L30
  - env: `API_KEY`, `CORS_ORIGIN`, `DASHBOARD_PASSWORD`, `DASHBOARD_USERNAME`, `DATABASE_URL`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_POOL_CONNECT_TIMEOUT_MS`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_MAX`, `DB_PORT`, `DB_SSL`, `DB_SSL_CA`, `DB_SSL_REJECT_UNAUTHORIZED`, `DB_USER`, `EGRESS_ALLOW_HOSTS`, `EGRESS_ALLOW_PRIVATE`, `GUARDRAIL_COOLDOWN_HOURS`, `GUARDRAIL_ENFORCE`, `GUARDRAIL_NMIN`, `GUARDRAIL_QUARANTINE_MULT`, `GUARDRAIL_TARGET_REPLY_RATE`, `GUARDRAIL_THROTTLE_MULT`, `JWT_ACCESS_TTL`, `JWT_EXPIRES_IN`, `JWT_REFRESH_TTL`, `JWT_SECRET`, `LICENSE_KEY`, `MAX_SEATS`, `MAX_SESSIONS`, `MEDIA_MAX_BYTES`, `MEDIA_URL_TTL`, `NODE_ENV`, `PASSWORD_SCRYPT_LOG2N`, `PORT`, `PROXY_TEST_ECHO_URL`, `REDIS_DB`, `REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_PORT`, `REDIS_TLS`, `REDIS_URL`, `REDIS_USERNAME`, `S3_ACCESS_KEY`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`, `S3_REGION`, `S3_SECRET_KEY`, `WA_LOG_LEVEL`, `WA_REQUIRE_PROXY`, `WEBHOOK_CONCURRENCY`, `WEBSHARE_API_KEY`, `WWEBJS_CHROME_PATH`, `WWEBJS_DATA_PATH`, `WWEBJS_INIT_TIMEOUT_MS`, `WWEBJS_USER_AGENT`, `WWEBJS_WEB_VERSION`
- `envSchema` = `base.superRefine((env, ctx) => { const hasDbParts = !!(env.DB_HOST &&…` · L149
- `validateEnv(config)` · L170

**Tipos**
- type `Env` L168

## `bootstrap/console-bridge.spec.ts`

81 linhas · caminho: `apps/gateway/src/bootstrap/console-bridge.spec.ts`
- importa (interno): `bootstrap/console-bridge.ts`

- describe “console-bridge” · L18
  - it “console.info com objeto (dump do libsignal) vira UMA chamada de debug, texto único” · L25
  - it “warn/error mapeiam para o nível equivalente; log/debug/trace para debug” · L40
  - it “trunca textos gigantes e informa quanto cortou” · L56
  - it “logger que lança não propaga para quem chamou console.*” · L63
  - it “restaura o console original” · L72

## `bootstrap/console-bridge.ts`

71 linhas · caminho: `apps/gateway/src/bootstrap/console-bridge.ts`
- importado por: `bootstrap/console-bridge.spec.ts`, `main.ts`

**Funções e constantes de topo**
- `CONSOLE_BRIDGE_MAX_CHARS` = `4_000` · L15
- `renderConsoleArgs(args, max)` · L28
  - chamado por: `bridgeConsoleToLogger` L42
- `bridgeConsoleToLogger(logger, max)` · L42
  - chama: `renderConsoleArgs` L28
  - chamado por: `bootstrap` (main.ts:16)

**Tipos**
- type `ConsoleMethod` L18

## `bootstrap/fastify-adapter.ts`

39 linhas · caminho: `apps/gateway/src/bootstrap/fastify-adapter.ts`
- importado por: `main.ts`, `gateway/test/setup-app.ts`

**Funções e constantes de topo**
- `buildFastifyAdapter(maxFileBytes)` · L10
  - chamado por: `bootstrap` (main.ts:16), `createTestApp` (setup-app.ts:82)

## `bootstrap/log-redaction.pino-http.spec.ts`

91 linhas · caminho: `apps/gateway/src/bootstrap/log-redaction.pino-http.spec.ts`
- importa (interno): `bootstrap/log-redaction.ts`

- describe “logSerializers com pino-http de verdade” · L11
  - it “request completed traz statusCode e redige todos os segredos; alias { e } sai com stack” · L12

## `bootstrap/log-redaction.spec.ts`

183 linhas · caminho: `apps/gateway/src/bootstrap/log-redaction.spec.ts`
- importa (interno): `bootstrap/log-redaction.ts`

- describe “maskUrlSecrets” · L13
  - it “mascara token/api_key/secret na query e preserva o resto” · L14
  - it “URL sem query, vazia ou undefined volta intacta” · L26
  - it “não toca em parâmetros inofensivos nem em chave sem valor” · L32
- describe “redactHeaders / redactQuery” · L39
  - it “redige cookie, set-cookie, authorization e x-api-key (case-insensitive) sem mutar a origem” · L40
  - it “redige token na query parseada” · L57
- describe “httpLogSerializers” · L66
  - it “serializa request com url/headers/query redigidos” · L67
  - it “serializa response com set-cookie redigido” · L89
  - it “nunca lança: objeto inesperado vira serialização mínima” · L103
- describe “httpLogSerializers sob o embrulho do pino-http” · L112
  - it “response já serializada mantém statusCode e headers (redigidos)” · L113
  - it “request já serializada mantém método/id e redige cookie e ?token=” · L135
- describe “errorAliasSerializers” · L163
  - it “Error sob e/error/cause sai com mensagem e stack; não-Error passa intacto” · L164
  - it “logSerializers junta http + aliases” · L176

## `bootstrap/log-redaction.ts`

169 linhas · caminho: `apps/gateway/src/bootstrap/log-redaction.ts`
- importado por: `app.module.ts`, `bootstrap/log-redaction.pino-http.spec.ts`, `bootstrap/log-redaction.spec.ts`, `bootstrap/logging-exception.filter.ts`

**Funções e constantes de topo**
- `SENSITIVE_HEADERS` = `new Set([ 'authorization', 'proxy-authorization', 'cookie', 'set-cook…` · L13
- `SENSITIVE_QUERY_KEYS` = `/^(token|access_token|refresh_token|api_key|apikey|x-api-key|secret|p…` · L22
- `REDACTED` = `'[Redacted]'` · L25
- `maskUrlSecrets(url)` · L29
  - chamado por: `httpLogSerializers` L103, `LoggingExceptionFilter.record` (logging-exception.filter.ts:100)
- `redactHeaders(headers)` · L56
  - chamado por: `httpLogSerializers` L103
- `redactQuery(query)` · L67
  - chamado por: `httpLogSerializers` L103
- `alreadySerialized(value)` · L99
  - chamado por: `httpLogSerializers` L103
- `httpLogSerializers()` · L103
  - chama: `alreadySerialized` L99, `maskUrlSecrets` L29, `redactHeaders` L56, `redactQuery` L67
  - chamado por: `logSerializers` L155
- `errorAliasSerializers()` · L141
  - chamado por: `logSerializers` L155
- `logSerializers()` · L155
  - chama: `errorAliasSerializers` L141, `httpLogSerializers` L103
- `LOG_REDACT_PATHS` = `[ 'req.headers.authorization', 'req.headers["proxy-authorization"]', …` · L161

**Tipos**
- interface `SerializedReq` L78 · 3 propriedade(s)
- interface `SerializedRes` L85 · 1 propriedade(s)

## `bootstrap/logging-exception.filter.spec.ts`

74 linhas · caminho: `apps/gateway/src/bootstrap/logging-exception.filter.spec.ts`
- importa (interno): `bootstrap/logging-exception.filter.ts`

- describe “describeException” · L10
  - it “HttpException com corpo objeto: status, mensagem e código” · L11
  - it “validação com lista de mensagens vira uma string; `error` do Nest vira code” · L30
  - it “HttpException com corpo string” · L41
  - it “erro estilo http-errors (statusCode + message) é tratado como deliberado” · L49
  - it “erro inesperado (ou lixo) vira 500 não-deliberado” · L63

## `bootstrap/logging-exception.filter.ts`

128 linhas · caminho: `apps/gateway/src/bootstrap/logging-exception.filter.ts`
- importa (interno): `bootstrap/log-redaction.ts`
- importado por: `bootstrap/logging-exception.filter.spec.ts`, `main.ts`, `gateway/test/setup-app.ts`

**class `LoggingExceptionFilter`** L87 · @Catch · `extends BaseExceptionFilter`
- `logger` · L89 · private · campo
- `catch(exception, host)` · L91
  - chama: `record` L100
- `record(exception, host)` · L100 · private
  - chama: `maskUrlSecrets` (log-redaction.ts:29), `describeException` L30, `pathOnly` L81
  - chamado por: `catch` L91

**Funções e constantes de topo**
- `describeException(exception)` · L30
  - chamado por: `record` L100
- `pathOnly(url)` · L81
  - chamado por: `record` L100

**Tipos**
- interface `ExceptionSummary` L13 · 4 propriedade(s)
- interface `ErrorLike` L21 · 5 propriedade(s)
- interface `RequestLike` L71 · 7 propriedade(s)
