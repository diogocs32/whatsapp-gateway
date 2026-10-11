import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, BASE, api } from './api';

// Cliente HTTP (E25): o `code` e o corpo do erro chegam a quem chama (o encaminhar precisa do
// `results[]` do 423 e do `code` dos 400); o `forward` monta a rota e o corpo certos.

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api.sessions.forward', () => {
  it('POST na rota da mensagem com o corpo do pedido e cookie', async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) =>
      json(201, { results: [{ target: 'a', ok: true }] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const out = await api.sessions.forward('sess 1', '01K/ID', {
      to: ['5511988887777@s.whatsapp.net', '120363025246125486@g.us'],
      idempotencyKey: 'painel-fwd-x',
    });
    expect(out.results).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/api/sessions/sess%201/messages/01K%2FID/forward`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body as string)).toEqual({
      to: ['5511988887777@s.whatsapp.net', '120363025246125486@g.us'],
      idempotencyKey: 'painel-fwd-x',
    });
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('423 chega com status, code, mensagem e o results[] do corpo', async () => {
    const body = {
      code: 'SESSION_QUARANTINED',
      state: 'quarentena',
      message: 'Sessão em quarentena',
      results: [{ target: 'a', ok: false, status: 423, cold: true }],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(423, body)),
    );
    const err = await api.sessions
      .forward('s', 'm', { to: ['a'] })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 423,
      code: 'SESSION_QUARANTINED',
      message: 'Sessão em quarentena',
      body,
    });
  });
});

describe('parseError (todas as rotas)', () => {
  it('sem code no corpo: code undefined, mensagem do corpo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(400, { statusCode: 400, message: 'to inválido' })),
    );
    const err = (await api.sessions
      .sendText('s', 'x', 'oi')
      .catch((e: unknown) => e)) as ApiError;
    expect(err.status).toBe(400);
    expect(err.message).toBe('to inválido');
    expect(err.code).toBeUndefined();
  });

  it('corpo não-JSON: statusText; mensagem em lista vira uma linha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('<html>', { status: 502, statusText: 'Bad Gateway' }),
      ),
    );
    const e1 = (await api.sessions.list().catch((e: unknown) => e)) as ApiError;
    expect(e1).toMatchObject({ status: 502, message: 'Bad Gateway' });
    expect(e1.body).toBeUndefined();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(400, { message: ['a obrigatório', 'b curto'] })),
    );
    const e2 = (await api.sessions.list().catch((e: unknown) => e)) as ApiError;
    expect(e2.message).toBe('a obrigatório; b curto');
  });

  it('code que não é string é ignorado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(409, { message: 'em andamento', code: 7 })),
    );
    const err = (await api.sessions
      .list()
      .catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBeUndefined();
    expect(err.message).toBe('em andamento');
  });
});

// E27/P-086 — link de conexão (rotas autenticadas por cookie do painel).
describe('api.sessions.connectLink', () => {
  it('get/create/revoke: rota com o id codificado, método e corpo certos, cookie', async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) =>
      json(200, { link: null }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await api.sessions.connectLink.get('vendas 1');
    await api.sessions.connectLink.create('vendas 1', {
      ttlMinutes: 60,
      expectedPhone: '5511988887777',
    });
    await api.sessions.connectLink.revoke('vendas 1');
    const calls = fetchMock.mock.calls as [string, RequestInit][];
    const path = `${BASE}/api/sessions/vendas%201/connect-link`;
    expect(calls.map(([u, i]) => [u, i.method ?? 'GET'])).toEqual([
      [path, 'GET'],
      [path, 'POST'],
      [path, 'DELETE'],
    ]);
    expect(calls.every(([, i]) => i.credentials === 'include')).toBe(true);
    expect(JSON.parse(calls[1][1].body as string)).toEqual({
      ttlMinutes: 60,
      expectedPhone: '5511988887777',
    });
    // DELETE sem corpo → sem Content-Type (o Fastify recusa JSON vazio).
    expect(
      (calls[2][1].headers as Record<string, string>)['Content-Type'],
    ).toBeUndefined();
  });

  it('409 do criar chega com o code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(409, {
          statusCode: 409,
          error: 'Conflict',
          code: 'CONNECT_LINK_SESSION_PAIRED',
          message: 'Sessão com login salvo',
        }),
      ),
    );
    const err = await api.sessions.connectLink
      .create('s', {})
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 409,
      code: 'CONNECT_LINK_SESSION_PAIRED',
    });
  });
});

// E26/P-084 — sugestão de proxy na criação de sessão.
describe('api.proxies.suggestion', () => {
  it('GET com o nome codificado na query, cookie, sem Content-Type e com o signal de quem chama', async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) =>
      json(200, { suggestion: null }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const ctrl = new AbortController();
    const out = await api.proxies.suggestion('Vendas_01 &x', {
      signal: ctrl.signal,
    });
    expect(out).toEqual({ suggestion: null });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `${BASE}/api/proxies/suggestion?sessionName=Vendas_01%20%26x`,
    );
    expect(init.method ?? 'GET').toBe('GET');
    expect(init.credentials).toBe('include');
    expect(init.signal).toBe(ctrl.signal);
    // Sem cache HTTP (o GET do "Criar" segurado não fica atrás do GET do debounce).
    expect(init.cache).toBe('no-store');
    expect(
      (init.headers as Record<string, string>)['Content-Type'],
    ).toBeUndefined();
  });

  it('sem init: no-store do mesmo jeito; init do chamador pode sobrescrever', async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) =>
      json(200, { suggestion: null }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await api.proxies.suggestion('vendas');
    await api.proxies.suggestion('vendas', { cache: 'default' });
    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(calls.map(([, i]) => i.cache)).toEqual(['no-store', 'default']);
  });

  it('403 (OPERATOR) chega como ApiError para quem chama engolir', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(403, { statusCode: 403, message: 'Forbidden' })),
    );
    const err = await api.proxies.suggestion('vendas').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403 });
  });
});

// E28/P-107 — exclusão em lote e compartilhamento explícito do proxy.
describe('api.proxies (E28)', () => {
  it('bulkRemove: POST na rota de lote com os ids no corpo, JSON e cookie', async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) =>
      json(200, { deleted: 2, notFound: [] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const out = await api.proxies.bulkRemove({ ids: ['01A', '01B'] });
    expect(out).toEqual({ deleted: 2, notFound: [] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/api/proxies/bulk-delete`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body as string)).toEqual({ ids: ['01A', '01B'] });
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('setAssignment e sessions.create levam allowSharedProxy quando quem chama manda', async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) => json(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    await api.proxies.setAssignment('01SESSAO', {
      mode: 'SINGLE',
      proxyId: 'P1',
      allowSharedProxy: true,
    });
    await api.sessions.create({
      name: 'vendas',
      proxyId: 'P1',
      allowSharedProxy: true,
    });
    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(calls[0][0]).toBe(`${BASE}/api/sessions/01SESSAO/proxy`);
    expect(calls[0][1].method).toBe('PUT');
    expect(JSON.parse(calls[0][1].body as string)).toEqual({
      mode: 'SINGLE',
      proxyId: 'P1',
      allowSharedProxy: true,
    });
    expect(calls[1][0]).toBe(`${BASE}/api/sessions`);
    expect(JSON.parse(calls[1][1].body as string)).toEqual({
      name: 'vendas',
      proxyId: 'P1',
      allowSharedProxy: true,
    });
  });
});
