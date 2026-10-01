<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — Gateway — bootstrap (config, logs, adapter)

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `bootstrap/config.ts` | 233 |
| `bootstrap/console-bridge.spec.ts` | 81 |
| `bootstrap/console-bridge.ts` | 71 |
| `bootstrap/fastify-adapter.absolute-form.spec.ts` | 90 |
| `bootstrap/fastify-adapter.ts` | 45 |
| `bootstrap/http-logger.spec.ts` | 180 |
| `bootstrap/http-logger.ts` | 45 |
| `bootstrap/log-redaction.pino-http.spec.ts` | 91 |
| `bootstrap/log-redaction.spec.ts` | 183 |
| `bootstrap/log-redaction.ts` | 169 |
| `bootstrap/logging-exception.filter.spec.ts` | 117 |
| `bootstrap/logging-exception.filter.ts` | 154 |
| `bootstrap/rate-limit.spec.ts` | 355 |
| `bootstrap/rate-limit.ts` | 48 |
| `bootstrap/route-url.ts` | 54 |

## `bootstrap/config.ts`

233 linhas · caminho: `apps/gateway/src/bootstrap/config.ts`
- importado por: `app.module.ts`, `infra/prisma/prisma.service.ts`, `infra/redis/redis-connection.ts`, `infra/redis/redis.service.ts`, `infra/storage/media-storage.service.ts`, `main.ts`, `modules/campaigns/infrastructure/campaign-queue.ts`, `modules/contacts/application/contact-check-quota.service.spec.ts`, `modules/contacts/application/contact-check-quota.service.ts`, `modules/guardrail/guardrail.service.ts`, `modules/guardrail/undelivered-detector.service.ts`, `modules/iam/application/auth-session.service.ts`, `modules/iam/application/license.service.spec.ts`, `modules/iam/application/license.service.ts`, `modules/iam/application/token.service.ts`, `modules/iam/iam.module.ts`, `modules/iam/infrastructure/admin-seeder.ts`, `modules/iam/interface/api-key-auth.guard.ts`, `modules/iam/interface/auth.controller.ts`, `modules/iam/interface/auth.guard.ts`, `modules/messaging/interface/messages.controller.ts`, `modules/observability/reply-rate.service.ts`, `modules/proxies/infrastructure/proxy-health-tester.ts`, `modules/proxies/infrastructure/webshare.client.ts`, `modules/sessions/application/session-manager.service.ts`, `modules/webhooks/infrastructure/webhook-queue.ts`, `gateway/test/ack-persistence.e2e-spec.ts`, `gateway/test/bullmq-redis-compat.e2e-spec.ts`, `gateway/test/bullmq-shutdown-pending.e2e-spec.ts`, `gateway/test/campaign-bullmq6.e2e-spec.ts`, `gateway/test/campaign-recovery.e2e-spec.ts`, `gateway/test/config.e2e-spec.ts`, `gateway/test/guardrail-c10.e2e-spec.ts`, `gateway/test/guardrail-default.e2e-spec.ts`, `gateway/test/nest12-shutdown.e2e-spec.ts`, `gateway/test/refresh-token-purge.e2e-spec.ts`, `gateway/test/webhook-bullmq6.e2e-spec.ts`

**Funções e constantes de topo**
- `TRUE_WORDS` = `new Set(['true', '1', 'yes', 'on'])` · L16
- `FALSE_WORDS` = `new Set(['false', '0', 'no', 'off'])` · L17
- `envBool(def)` · L18
  - chamado por: `base` L33
- `envStr()` · L30
  - chamado por: `base` L33
- `base` = `z.object({ NODE_ENV: z .enum(['development', 'production', 'test']) .…` · L33
  - chama: `envBool` L18, `envStr` L30
  - env: `API_KEY`, `BAILEYS_PROTOCOL_CANARY_SESSION_ID`, `BAILEYS_PROTOCOL_VERSION`, `CONTACT_CHECK_MAX_PER_WINDOW`, `CONTACT_CHECK_WINDOW_SECONDS`, `CORS_ORIGIN`, `DASHBOARD_PASSWORD`, `DASHBOARD_USERNAME`, `DATABASE_URL`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_POOL_CONNECT_TIMEOUT_MS`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_MAX`, `DB_PORT`, `DB_SSL`, `DB_SSL_CA`, `DB_SSL_REJECT_UNAUTHORIZED`, `DB_USER`, `EGRESS_ALLOW_HOSTS`, `EGRESS_ALLOW_PRIVATE`, `GUARDRAIL_COOLDOWN_HOURS`, `GUARDRAIL_ENFORCE`, `GUARDRAIL_NMIN`, `GUARDRAIL_QUARANTINE_MULT`, `GUARDRAIL_TARGET_REPLY_RATE`, `GUARDRAIL_THROTTLE_MULT`, `JWT_ACCESS_TTL`, `JWT_EXPIRES_IN`, `JWT_REFRESH_TTL`, `JWT_SECRET`, `LICENSE_KEY`, `MAX_SEATS`, `MAX_SESSIONS`, `MEDIA_MAX_BYTES`, `MEDIA_URL_TTL`, `NODE_ENV`, `PASSWORD_SCRYPT_LOG2N`, `PORT`, `PROXY_TEST_ECHO_URL`, `REDIS_DB`, `REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_PORT`, `REDIS_TLS`, `REDIS_URL`, `REDIS_USERNAME`, `S3_ACCESS_KEY`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`, `S3_REGION`, `S3_SECRET_KEY`, `UNDELIVERED_MIN_CHATS`, `UNDELIVERED_MIN_MSGS`, `UNDELIVERED_STUCK_MIN`, `UNDELIVERED_SWEEP_MIN`, `WA_LOG_LEVEL`, `WA_REQUIRE_PROXY`, `WEBHOOK_CONCURRENCY`, `WEBSHARE_API_KEY`, `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA`, `WWEBJS_CHROME_PATH`, `WWEBJS_DATA_PATH`, `WWEBJS_INIT_TIMEOUT_MS`, `WWEBJS_USER_AGENT`, `WWEBJS_WEB_VERSION`
- `envSchema` = `base.superRefine((env, ctx) => { if ( env.BAILEYS_PROTOCOL_VERSION &&…` · L179
- `validateEnv(config)` · L223

**Tipos**
- type `Env` L221

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

## `bootstrap/fastify-adapter.absolute-form.spec.ts`

90 linhas · caminho: `apps/gateway/src/bootstrap/fastify-adapter.absolute-form.spec.ts`
- importa (interno): `bootstrap/fastify-adapter.ts`

- describe “GHSA-9c5c-9qcx-q35q — middleware por rota com alvo em forma absoluta” · L61
  - it “origin-form: o middleware roda” · L79
  - it “forma absoluta: o middleware também roda (falhava no platform-fastify < 11.2.4)” · L84

## `bootstrap/fastify-adapter.ts`

45 linhas · caminho: `apps/gateway/src/bootstrap/fastify-adapter.ts`
- importa (interno): `bootstrap/route-url.ts`
- importado por: `bootstrap/fastify-adapter.absolute-form.spec.ts`, `bootstrap/http-logger.spec.ts`, `bootstrap/rate-limit.spec.ts`, `main.ts`, `modules/iam/interface/audit.interceptor.spec.ts`, `gateway/test/nest12-shutdown.e2e-spec.ts`, `gateway/test/setup-app.ts`

**Funções e constantes de topo**
- `buildFastifyAdapter(maxFileBytes)` · L11
  - chama: `rejectAmbiguousAbsoluteForm` (route-url.ts:39), `stampRouteUrl` (route-url.ts:20)
  - chamado por: `bootstrap` (main.ts:16), `createTestApp` (setup-app.ts:103)

## `bootstrap/http-logger.spec.ts`

180 linhas · caminho: `apps/gateway/src/bootstrap/http-logger.spec.ts`
- importa (interno): `bootstrap/fastify-adapter.ts`, `bootstrap/http-logger.ts`

- describe “request-log: sondagens pela rota resolvida (P-053)” · L115
  - it “/health e /metrics não geram linha em nenhuma grafia (2xx, 4xx, HEAD, %-encoding, forma absoluta)” · L143
  - it “503 do /health continua visível (único rastro de unhealthy no log)” · L163
  - it “demais rotas seguem a regra: mutação em info, GET 2xx silencioso” · L170

## `bootstrap/http-logger.ts`

45 linhas · caminho: `apps/gateway/src/bootstrap/http-logger.ts`
- importa (interno): `bootstrap/log-redaction.ts`, `bootstrap/route-url.ts`
- importado por: `app.module.ts`, `bootstrap/http-logger.spec.ts`

**Funções e constantes de topo**
- `PROBE_ROUTES` = `new Set(['/health', '/metrics'])` · L6
- `httpLoggerOptions(env)` · L17
  - chama: `logSerializers` (log-redaction.ts:155), `routeUrlOf` (route-url.ts:27)

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
- importado por: `bootstrap/http-logger.ts`, `bootstrap/log-redaction.pino-http.spec.ts`, `bootstrap/log-redaction.spec.ts`, `bootstrap/logging-exception.filter.ts`, `bootstrap/route-url.ts`

**Funções e constantes de topo**
- `SENSITIVE_HEADERS` = `new Set([ 'authorization', 'proxy-authorization', 'cookie', 'set-cook…` · L13
- `SENSITIVE_QUERY_KEYS` = `/^(token|access_token|refresh_token|api_key|apikey|x-api-key|secret|p…` · L22
- `REDACTED` = `'[Redacted]'` · L25
- `maskUrlSecrets(url)` · L29
  - chamado por: `httpLogSerializers` L103, `LoggingExceptionFilter.record` (logging-exception.filter.ts:126), `rejectAmbiguousAbsoluteForm` (route-url.ts:39)
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
  - chamado por: `httpLoggerOptions` (http-logger.ts:17)
- `LOG_REDACT_PATHS` = `[ 'req.headers.authorization', 'req.headers["proxy-authorization"]', …` · L161

**Tipos**
- interface `SerializedReq` L78 · 3 propriedade(s)
- interface `SerializedRes` L85 · 1 propriedade(s)

## `bootstrap/logging-exception.filter.spec.ts`

117 linhas · caminho: `apps/gateway/src/bootstrap/logging-exception.filter.spec.ts`
- importa (interno): `bootstrap/logging-exception.filter.ts`

- describe “describeException” · L13
  - it “HttpException com corpo objeto: status, mensagem e código” · L14
  - it “validação com lista de mensagens vira uma string; `error` do Nest vira code” · L33
  - it “HttpException com corpo string” · L44
  - it “erro estilo http-errors (statusCode + message) é tratado como deliberado” · L52
  - it “erro inesperado (ou lixo) vira 500 não-deliberado” · L66
- describe “clientErrorAsHttpException” · L78
  - it “4xx estilo http-errors vira HttpException com o mesmo corpo do BaseExceptionFilter” · L79
  - it “não converte 5xx, HttpException, erro sem statusCode nem mensagem vazia” · L94

## `bootstrap/logging-exception.filter.ts`

154 linhas · caminho: `apps/gateway/src/bootstrap/logging-exception.filter.ts`
- importa (interno): `bootstrap/log-redaction.ts`
- importado por: `bootstrap/logging-exception.filter.spec.ts`, `bootstrap/rate-limit.spec.ts`, `main.ts`, `gateway/test/setup-app.ts`

**class `LoggingExceptionFilter`** L113 · @Catch · `extends BaseExceptionFilter`
- `logger` · L115 · private · campo
- `catch(exception, host)` · L117
  - chama: `clientErrorAsHttpException` L76, `record` L126
- `record(exception, host)` · L126 · private
  - chama: `maskUrlSecrets` (log-redaction.ts:29), `describeException` L30, `pathOnly` L107
  - chamado por: `catch` L117

**Funções e constantes de topo**
- `describeException(exception)` · L30
  - chamado por: `record` L126
- `clientErrorAsHttpException(exception)` · L76
  - chamado por: `catch` L117
- `pathOnly(url)` · L107
  - chamado por: `record` L126

**Tipos**
- interface `ExceptionSummary` L13 · 4 propriedade(s)
- interface `ErrorLike` L21 · 5 propriedade(s)
- interface `RequestLike` L97 · 7 propriedade(s)

## `bootstrap/rate-limit.spec.ts`

355 linhas · caminho: `apps/gateway/src/bootstrap/rate-limit.spec.ts`
- importa (interno): `modules/iam/interface/auth.controller.ts`, `modules/sessions/application/connect-link.service.ts`, `modules/sessions/interface/public-connect.controller.ts`, `bootstrap/fastify-adapter.ts`, `bootstrap/logging-exception.filter.ts`, `bootstrap/rate-limit.ts`

- describe “rate-limit pela rota resolvida (P-053)” · L85
  - it “o 11º login em 1 min é 429 mesmo alternando %-encoding e forma absoluta” · L115
  - it “o login tem contador próprio: tráfego do mesmo IP não o esgota (D-025)” · L141
  - it “/health fica fora do rate-limit em qualquer grafia; 404 não passa pelo limitador” · L158
  - it “forma absoluta com ? ou # antes do caminho → 400 antes de qualquer rota (nem conta no limitador)” · L184
- describe “rateLimitMaxFromEnv” · L199
  - it “default 600; 0/negativo/inválido desligam” · L200
- describe “rate-limit das rotas públicas do link de conexão (E27 · P-086)” · L213
  - it “os tetos são 120/min (consulta) e 10/min (gerar QR)” · L260
  - it “GET /api/public/connect: 121ª consulta em 1 min é 429; não gasta o balde do new-qr nem o global” · L271
  - it “POST /api/public/connect/new-qr: 11º pedido em 1 min é 429; a consulta segue no próprio balde” · L302
  - it “token inválido (404 no guard) também conta no balde da rota — o limitador roda antes do guard” · L325
  - it “HEAD /api/public/connect → 405 sem chegar ao serviço (não vira 2º balde de leitura)” · L341

## `bootstrap/rate-limit.ts`

48 linhas · caminho: `apps/gateway/src/bootstrap/rate-limit.ts`
- importado por: `bootstrap/rate-limit.spec.ts`, `main.ts`, `modules/iam/interface/auth.controller.ts`, `modules/sessions/interface/public-connect.controller.ts`, `gateway/test/setup-app.ts`

**Funções e constantes de topo**
- `rateLimitMaxFromEnv(env)` · L6
  - chamado por: `bootstrap` (main.ts:16)
- `LOGIN_RATE_LIMIT` = `{ max: 10, timeWindow: '1 minute' } as const` · L19
- `PUBLIC_CONNECT_READ_RATE_LIMIT` = `{ max: 120, timeWindow: '1 minute', } as const` · L25
- `PUBLIC_CONNECT_NEW_QR_RATE_LIMIT` = `{ max: 10, timeWindow: '1 minute', } as const` · L29
- `registerRateLimit(app, max)` · L36 · async
  - chamado por: `bootstrap` (main.ts:16), `createTestApp` (setup-app.ts:103)

## `bootstrap/route-url.ts`

54 linhas · caminho: `apps/gateway/src/bootstrap/route-url.ts`
- importa (interno): `bootstrap/log-redaction.ts`
- importado por: `bootstrap/fastify-adapter.ts`, `bootstrap/http-logger.ts`

**Funções e constantes de topo**
- `ROUTE_URL` = `Symbol('conexozenvo.routeUrl')` · L12
- `stampRouteUrl(fastify)` · L20
  - chamado por: `buildFastifyAdapter` (fastify-adapter.ts:11)
- `routeUrlOf(req)` · L27
  - chamado por: `httpLoggerOptions` (http-logger.ts:17)
- `rejectAmbiguousAbsoluteForm(fastify)` · L39
  - chama: `maskUrlSecrets` (log-redaction.ts:29)
  - chamado por: `buildFastifyAdapter` (fastify-adapter.ts:11)

**Tipos**
- type `Stamped` L14
