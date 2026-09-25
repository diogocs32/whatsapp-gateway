import type { Options } from 'pino-http';
import { LOG_REDACT_PATHS, logSerializers } from './log-redaction';
import { routeUrlOf } from './route-url';

// Sondagens: healthcheck do Docker/Swarm/Traefik e scrape do Prometheus batem o tempo todo.
const PROBE_ROUTES = new Set(['/health', '/metrics']);

// Opções do pino-http (request-log) da app inteira — item 18 da auditoria 07/2026. JSON em
// produção, pretty em dev, silencioso nos e2e. Request-log só para mutações e erros — GET 2xx é
// silencioso (o polling do dashboard inundaria o console). /health e /metrics só aparecem quando
// dão 5xx (o 503 do /health é o único rastro de "unhealthy" no log; 4xx do /metrics já sai numa
// linha do LoggingExceptionFilter). Nível via LOG_LEVEL.
//
// P-053: a rota vem do carimbo `routeUrlOf` (rota resolvida pelo router), não de `req.url` — no
// middleware do pino-http `req.url` chega reduzido a '/' e o alvo cru aceita forma absoluta e
// %-encoding. O antigo `autoLogging.ignore` por req.url nunca casava (removido).
export function httpLoggerOptions(
  env: NodeJS.ProcessEnv = process.env,
): Options {
  return {
    level:
      env.LOG_LEVEL ??
      (env.NODE_ENV === 'test'
        ? 'silent'
        : env.NODE_ENV === 'production'
          ? 'info'
          : 'debug'),
    // Segredos fora do log (ABE-08): cookie da sessão, set-cookie do login, ?token= do
    // SSE/metrics, Authorization/X-Api-Key. Serializers redigem cópias (URL inclusa); a
    // lista `redact` é a 2ª camada para caminhos fixos.
    redact: LOG_REDACT_PATHS,
    serializers: logSerializers(),
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { singleLine: true } }
        : undefined,
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (PROBE_ROUTES.has(routeUrlOf(req) ?? '')) return 'silent';
      if (res.statusCode >= 400) return 'warn';
      return req.method === 'GET' ? 'silent' : 'info';
    },
  };
}
