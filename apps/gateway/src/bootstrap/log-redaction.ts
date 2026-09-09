import { stdSerializers } from 'pino';

// Redação de segredos no log HTTP (auditoria 09/2026, ABE-08 / P-032).
//
// O serializer padrão do pino-http copia `req.headers` e `req.query` por REFERÊNCIA — sem
// tratamento, o cookie da sessão do painel (`token` + `refresh_token`), `?token=` do SSE/metrics
// e `set-cookie` das respostas de login iam parar no log em texto claro. A lista `redact` do pino
// só cobre caminhos fixos de objeto; a URL (string) precisa de mascaramento próprio.
//
// Regra: NUNCA mutar o request (as cópias abaixo são rasas e novas) e NUNCA lançar — falha de
// serialização não pode derrubar o log nem a request.

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-webhook-signature',
]);

const SENSITIVE_QUERY_KEYS =
  /^(token|access_token|refresh_token|api_key|apikey|x-api-key|secret|password|signature|code|key)$/i;

export const REDACTED = '[Redacted]';

// Mascara o VALOR de parâmetros sensíveis na query string de uma URL (mantém a chave para
// diagnóstico: `?token=[Redacted]`). URL sem query volta intacta.
export function maskUrlSecrets(url: string | undefined): string | undefined {
  if (!url) return url;
  const qi = url.indexOf('?');
  if (qi < 0) return url;
  const base = url.slice(0, qi);
  const query = url.slice(qi + 1);
  const masked = query
    .split('&')
    .map((pair) => {
      if (!pair) return pair;
      const eq = pair.indexOf('=');
      const key = eq < 0 ? pair : pair.slice(0, eq);
      let decoded = key;
      try {
        decoded = decodeURIComponent(key);
      } catch {
        /* chave malformada: compara crua */
      }
      if (eq >= 0 && SENSITIVE_QUERY_KEYS.test(decoded)) {
        return `${key}=${REDACTED}`;
      }
      return pair;
    })
    .join('&');
  return `${base}?${masked}`;
}

export function redactHeaders<T extends Record<string, unknown> | undefined>(
  headers: T,
): T {
  if (!headers || typeof headers !== 'object') return headers;
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(headers)) {
    out[name] = SENSITIVE_HEADERS.has(name.toLowerCase()) ? REDACTED : value;
  }
  return out as T;
}

export function redactQuery<T extends Record<string, unknown> | undefined>(
  query: T,
): T {
  if (!query || typeof query !== 'object') return query;
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(query)) {
    out[name] = SENSITIVE_QUERY_KEYS.test(name) ? REDACTED : value;
  }
  return out as T;
}

interface SerializedReq {
  url?: string;
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
  [k: string]: unknown;
}

interface SerializedRes {
  headers?: Record<string, unknown>;
  [k: string]: unknown;
}

// Serializers para o `pinoHttp.serializers` do nestjs-pino: devolvem CÓPIAS redigidas.
// Tolerantes: qualquer erro cai no objeto original mínimo.
//
// ATENÇÃO (P-041): o pino-http EMBRULHA serializers customizados de req/res
// (`wrapRequestSerializer`/`wrapResponseSerializer` do pino-std-serializers) — o valor que chega
// aqui JÁ passou pelo serializer padrão ({ id, method, url, headers, query, ..., raw }). Reaplicar
// o `stdSerializers.res` nesse objeto devolvia `statusCode: null` e apagava os headers (100% dos
// `request completed` em produção sem status entre 09/09 16:41 e o hotfix). Só o objeto já
// serializado tem `raw`; um IncomingMessage/ServerResponse cru não tem.
function alreadySerialized(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'raw' in value;
}

export function httpLogSerializers() {
  return {
    req: (req: unknown) => {
      try {
        const r = (alreadySerialized(req)
          ? req
          : stdSerializers.req(
              req as Parameters<typeof stdSerializers.req>[0],
            )) as unknown as SerializedReq;
        return {
          ...r,
          url: maskUrlSecrets(r.url),
          headers: redactHeaders(r.headers),
          query: redactQuery(r.query),
        };
      } catch {
        return { method: (req as { method?: string })?.method };
      }
    },
    res: (res: unknown) => {
      try {
        const r = (alreadySerialized(res)
          ? res
          : stdSerializers.res(
              res as Parameters<typeof stdSerializers.res>[0],
            )) as unknown as SerializedRes;
        return { ...r, headers: redactHeaders(r.headers) };
      } catch {
        return { statusCode: (res as { statusCode?: number })?.statusCode };
      }
    },
  };
}

// O pino só serializa Error (message + stack) na chave `err`. Um `logger.error({ e }, ...)` vira
// `"e":{}` no JSON — a mensagem do erro some (visto em produção: `syncAddressBook falhou e={}`).
// Aliases comuns apontam para o MESMO serializer; valor que não é Error passa intacto (strings de
// `error` continuam strings). É a rede de segurança — a convenção continua sendo `{ err }`.
export function errorAliasSerializers() {
  // Tipado como `unknown` de propósito: as chaves-alias recebem qualquer valor (string, objeto),
  // e o serializer do pino devolve não-Error intacto.
  const alias = stdSerializers.err as unknown as (value: unknown) => unknown;
  return {
    err: stdSerializers.err,
    e: alias,
    error: alias,
    cause: alias,
    exception: alias,
  };
}

// Conjunto completo para `pinoHttp.serializers`.
export function logSerializers() {
  return { ...httpLogSerializers(), ...errorAliasSerializers() };
}

// Caminhos fixos redigidos pelo próprio pino (2ª camada — vale mesmo se um log manual passar o
// request inteiro como objeto).
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers["proxy-authorization"]',
  'req.headers["x-api-key"]',
  'req.headers.cookie',
  'req.query.token',
  'res.headers["set-cookie"]',
];
