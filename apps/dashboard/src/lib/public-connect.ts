// E27/P-086 — cliente das rotas PÚBLICAS do link de conexão (página /conectar). fetch próprio, de
// propósito fora do request()/coreFetch de lib/api.ts: sem cookie do painel (`credentials:'omit'`),
// sem renovação de sessão e sem onUnauthorized. `cache:'no-store'`: o QR muda a cada 20 s (MDN
// RequestInit). O token vai só no header Authorization — nunca na URL, nunca em log.
import {
  CONNECT_LINK_ERROR_CODES,
  type ConnectLinkErrorCode,
  type PublicConnectNewQrResponse,
  type PublicConnectResponse,
} from '@contracts';
import { BASE } from './api';
import type { ConnectFailure, ConnectResult } from './connect-link';

const KNOWN_CODES: readonly string[] = CONNECT_LINK_ERROR_CODES;

function isKnownCode(v: unknown): v is ConnectLinkErrorCode {
  return typeof v === 'string' && KNOWN_CODES.includes(v);
}

// Corpo de erro do gateway: {statusCode, error, code, message, retryAfterSeconds?}. O 429 do teto
// por IP (@fastify/rate-limit) vem sem `code` — quem chama faz backoff fixo.
async function failureFrom(res: Response): Promise<ConnectFailure> {
  const out: ConnectFailure = {
    status: res.status,
    message: res.statusText || `HTTP ${res.status}`,
  };
  try {
    const b = (await res.json()) as {
      code?: unknown;
      message?: unknown;
      retryAfterSeconds?: unknown;
    } | null;
    if (typeof b?.message === 'string' && b.message) out.message = b.message;
    if (isKnownCode(b?.code)) out.code = b.code;
    const ra = b?.retryAfterSeconds;
    if (typeof ra === 'number' && Number.isFinite(ra) && ra >= 0)
      out.retryAfterSeconds = ra;
  } catch {
    /* corpo não-JSON (proxy, 502 do deploy) */
  }
  return out;
}

async function call<T>(
  path: string,
  token: string,
  method: 'GET' | 'POST',
  isValid: (body: unknown) => body is T,
  signal?: AbortSignal,
): Promise<ConnectResult<T>> {
  let res: Response;
  try {
    // POST sem corpo e SEM Content-Type: o Fastify recusa (400) JSON vazio.
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'omit',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
  } catch {
    return { ok: false, error: { status: 0, message: 'Sem conexão' } };
  }
  if (!res.ok) return { ok: false, error: await failureFrom(res) };
  try {
    const body: unknown = await res.json();
    if (isValid(body)) return { ok: true, data: body };
  } catch {
    /* cai no erro abaixo */
  }
  return { ok: false, error: { status: 0, message: 'Resposta inválida' } };
}

function isConnectResponse(b: unknown): b is PublicConnectResponse {
  const r = b as { state?: unknown; phase?: unknown } | null;
  return (
    (r?.state === 'ACTIVE' && typeof r.phase === 'string') ||
    r?.state === 'CONNECTED'
  );
}

function isNewQrResponse(b: unknown): b is PublicConnectNewQrResponse {
  const r = b as { ok?: unknown; newQr?: unknown } | null;
  return r?.ok === true && typeof r.newQr === 'object' && r.newQr !== null;
}

// Prazo do GET (menor que os 15 s de vida do QR na tela): uma resposta pendurada vira falha
// transitória (status 0 → backoff e "Sem conexão") em vez de congelar a página num QR vencido.
export const GET_TIMEOUT_MS = 8_000;

// GET /api/public/connect — fase atual (QR só na fase QR) ou CONNECTED. Controller próprio com
// setTimeout + repasse do signal de quem chama, sem AbortSignal.any (ausente no Safari 16.4–17.3,
// dentro do alvo do Vite — compatibilidade do MDN apontada na revisão do diff da E27); o prazo
// cobre também a leitura do corpo.
export async function fetchConnectState(
  token: string,
  signal?: AbortSignal,
): Promise<ConnectResult<PublicConnectResponse>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GET_TIMEOUT_MS);
  const forward = () => ctrl.abort();
  if (signal?.aborted) ctrl.abort();
  else signal?.addEventListener('abort', forward, { once: true });
  try {
    return await call(
      '/api/public/connect',
      token,
      'GET',
      isConnectResponse,
      ctrl.signal,
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forward);
  }
}

// POST /api/public/connect/new-qr — "Mostrar QR" (só na fase IDLE; sem retry automático). SEM
// prazo no cliente: o servidor pode levar ~25 s (stop + start) e abortar aqui mostraria erro com a
// tentativa já gasta no servidor.
export function requestConnectNewQr(
  token: string,
  signal?: AbortSignal,
): Promise<ConnectResult<PublicConnectNewQrResponse>> {
  return call(
    '/api/public/connect/new-qr',
    token,
    'POST',
    isNewQrResponse,
    signal,
  );
}
