import { afterEach, describe, expect, it, vi } from 'vitest';
import { BASE } from './api';
import {
  GET_TIMEOUT_MS,
  fetchConnectState,
  requestConnectNewQr,
} from './public-connect';

// E27/P-086 — cliente das rotas públicas: sem cookie, sem cache, token só no Authorization, erros
// com status/code/retryAfterSeconds e rede = status 0. Nunca reaproveita o request() do painel.

const TOKEN = 'AbC_-xyz0123456789AbC_-xyz0123456789AbC_-xy';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function stub(res: Response | (() => never)) {
  const fn = vi.fn(async (..._args: unknown[]) =>
    typeof res === 'function' ? res() : res,
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// fetch que nunca responde, mas respeita o signal (como o do navegador): rejeita com AbortError.
function hangingFetch() {
  const fn = vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const abort = () => reject(new DOMException('aborted', 'AbortError'));
        if (init?.signal?.aborted) abort(); // signal já abortado: rejeita na hora
        init?.signal?.addEventListener('abort', abort);
      }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('fetchConnectState', () => {
  it('GET sem cookie, sem cache, Bearer no header e token fora da URL', async () => {
    const body = {
      state: 'ACTIVE',
      phase: 'IDLE',
      qr: null,
      expiresAt: '2026-09-28T00:00:00.000Z',
      expectedPhoneHint: null,
      newQr: { available: true, remaining: 5, max: 5, retryAfterSeconds: 0 },
    };
    const fetchMock = stub(json(200, body));
    const r = await fetchConnectState(TOKEN);
    expect(r).toEqual({ ok: true, data: body });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/api/public/connect`);
    expect(url).not.toContain(TOKEN);
    expect(init).toMatchObject({
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
    });
    expect(init.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });

  it('CONNECTED passa', async () => {
    stub(json(200, { state: 'CONNECTED', connectedAt: 'x' }));
    const r = await fetchConnectState(TOKEN);
    expect(r).toEqual({
      ok: true,
      data: { state: 'CONNECTED', connectedAt: 'x' },
    });
  });

  it('410 com code conhecido; code desconhecido é descartado', async () => {
    stub(
      json(410, {
        statusCode: 410,
        error: 'Gone',
        code: 'CONNECT_LINK_EXPIRED',
        message: 'Link expirado',
      }),
    );
    expect(await fetchConnectState(TOKEN)).toEqual({
      ok: false,
      error: {
        status: 410,
        code: 'CONNECT_LINK_EXPIRED',
        message: 'Link expirado',
      },
    });
    stub(json(410, { code: 'OUTRA_COISA', message: 'x' }));
    const r = await fetchConnectState(TOKEN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBeUndefined();
  });

  it('429 do teto por IP (sem code) e corpo não-JSON', async () => {
    stub(
      json(429, {
        statusCode: 429,
        message: 'Rate limit exceeded, retry in 1 minute',
      }),
    );
    expect(await fetchConnectState(TOKEN)).toEqual({
      ok: false,
      error: { status: 429, message: 'Rate limit exceeded, retry in 1 minute' },
    });
    stub(new Response('<html>', { status: 502, statusText: 'Bad Gateway' }));
    expect(await fetchConnectState(TOKEN)).toEqual({
      ok: false,
      error: { status: 502, message: 'Bad Gateway' },
    });
  });

  it('rede fora ou resposta 200 sem o formato esperado = status 0', async () => {
    stub(() => {
      throw new TypeError('Failed to fetch');
    });
    expect(await fetchConnectState(TOKEN)).toEqual({
      ok: false,
      error: { status: 0, message: 'Sem conexão' },
    });
    stub(json(200, { state: 'WORKING' }));
    const r = await fetchConnectState(TOKEN);
    expect(r).toEqual({
      ok: false,
      error: { status: 0, message: 'Resposta inválida' },
    });
  });
});

describe('requestConnectNewQr', () => {
  it('POST sem corpo e sem Content-Type', async () => {
    const newQr = {
      available: true,
      remaining: 4,
      max: 5,
      retryAfterSeconds: 30,
    };
    const fetchMock = stub(json(200, { ok: true, newQr }));
    expect(await requestConnectNewQr(TOKEN)).toEqual({
      ok: true,
      data: { ok: true, newQr },
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/api/public/connect/new-qr`);
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBe('omit');
    expect(init.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });

  it('429 COOLDOWN traz retryAfterSeconds; valor inválido é ignorado', async () => {
    stub(
      json(429, {
        statusCode: 429,
        code: 'CONNECT_LINK_NEW_QR_COOLDOWN',
        message: 'Aguarde',
        retryAfterSeconds: 12,
      }),
    );
    expect(await requestConnectNewQr(TOKEN)).toEqual({
      ok: false,
      error: {
        status: 429,
        code: 'CONNECT_LINK_NEW_QR_COOLDOWN',
        message: 'Aguarde',
        retryAfterSeconds: 12,
      },
    });
    stub(
      json(409, {
        code: 'CONNECT_LINK_BUSY',
        message: 'x',
        retryAfterSeconds: -1,
      }),
    );
    const r = await requestConnectNewQr(TOKEN);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('CONNECT_LINK_BUSY');
      expect(r.error.retryAfterSeconds).toBeUndefined();
    }
  });
});

describe('prazo das chamadas públicas', () => {
  it('GET pendurado vira falha de rede (status 0) em 8 s', async () => {
    vi.useFakeTimers();
    const fetchMock = hangingFetch();
    let settled = false;
    const p = fetchConnectState(TOKEN).then((r) => {
      settled = true;
      return r;
    });
    await vi.advanceTimersByTimeAsync(GET_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await p).toEqual({
      ok: false,
      error: { status: 0, message: 'Sem conexão' },
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal?.aborted).toBe(true);
    expect(GET_TIMEOUT_MS).toBe(8000);
  });

  it('GET repassa o abort de quem chama (desmontar a página)', async () => {
    const fetchMock = hangingFetch();
    const outer = new AbortController();
    const p = fetchConnectState(TOKEN, outer.signal);
    outer.abort();
    expect(await p).toEqual({
      ok: false,
      error: { status: 0, message: 'Sem conexão' },
    });
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(
      true,
    );
    // Já abortado antes de chamar: nem espera.
    const again = await fetchConnectState(TOKEN, outer.signal);
    expect(again.ok).toBe(false);
  });

  it('POST new-qr NÃO tem prazo no cliente (o servidor pode levar ~25 s)', async () => {
    vi.useFakeTimers();
    const fetchMock = hangingFetch();
    let settled = false;
    void requestConnectNewQr(TOKEN).then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(false);
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBeUndefined();
  });
});
