import { ForbiddenException } from '@nestjs/common';

// Defesa CSRF para autenticação por COOKIE (auditoria 09/2026, ABE-12 / P-033).
//
// O painel autentica com cookie httpOnly (`token`). Cookies são enviados automaticamente pelo
// browser, então uma página de terceiros (ou uma origem "irmã" *.conexozenvo.cloud não listada)
// poderia disparar POST/PUT/PATCH/DELETE com a sessão da vítima. CORS NÃO impede a requisição de
// sair — só bloqueia a leitura da resposta. `SameSite=Lax` cobre o cross-site clássico, mas não
// same-site.
//
// Regra (só para métodos com efeito e só quando a credencial veio de cookie):
//   1. `Origin` presente → precisa estar na allowlist (CORS_ORIGIN). Origin `null` = rejeitado.
//   2. Sem `Origin`, mas com `Sec-Fetch-Site` (todo browser moderno manda) → só `same-origin`
//      ou `none` (navegação direta) passam; `cross-site`/`same-site` são rejeitados.
//   3. Sem nenhum dos dois → cliente não-browser (curl/e2e/integração) — não há CSRF sem browser;
//      passa. Integrações reais usam X-Api-Key/Bearer, que nem entram aqui.
// Bearer e X-Api-Key não são enviados automaticamente pelo browser → isentos por construção.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type CsrfVerdict = 'ok' | 'origin-not-allowed' | 'cross-site';

export function normalizeOrigin(origin: string): string {
  return origin.trim().toLowerCase().replace(/\/+$/, '');
}

export function parseAllowedOrigins(corsOrigin: string | undefined): string[] {
  return (corsOrigin ?? '')
    .split(',')
    .map((o) => normalizeOrigin(o))
    .filter((o) => o.length > 0);
}

export interface CsrfInput {
  method: string | undefined;
  origin: string | string[] | undefined;
  secFetchSite: string | string[] | undefined;
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function csrfVerdict(
  input: CsrfInput,
  allowedOrigins: string[],
): CsrfVerdict {
  const method = (input.method ?? 'GET').toUpperCase();
  if (SAFE_METHODS.has(method)) return 'ok';

  const origin = first(input.origin);
  if (origin !== undefined && origin !== '') {
    const norm = normalizeOrigin(origin);
    if (norm === 'null') return 'origin-not-allowed';
    return allowedOrigins.includes(norm) ? 'ok' : 'origin-not-allowed';
  }

  const site = first(input.secFetchSite)?.trim().toLowerCase();
  if (site && site !== 'same-origin' && site !== 'none') return 'cross-site';
  return 'ok';
}

interface HeaderCarrier {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

// Lança 403 quando a requisição (autenticada por cookie) não passa na verificação acima.
export function assertCsrfSafe(
  req: HeaderCarrier,
  allowedOrigins: string[],
): void {
  const verdict = csrfVerdict(
    {
      method: req.method,
      origin: req.headers.origin,
      secFetchSite: req.headers['sec-fetch-site'],
    },
    allowedOrigins,
  );
  if (verdict === 'ok') return;
  throw new ForbiddenException(
    verdict === 'origin-not-allowed'
      ? 'Origem não autorizada para requisição autenticada por cookie (CSRF)'
      : 'Requisição cross-site autenticada por cookie bloqueada (CSRF)',
  );
}
