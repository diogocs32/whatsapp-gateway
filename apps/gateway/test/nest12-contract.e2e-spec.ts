import { JwtService } from '@nestjs/jwt';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { sha512 } from '../src/shared-kernel/crypto';
import { newId } from '../src/shared-kernel/ulid';
import {
  createTestApp,
  fakeSessionManager,
  inject,
  readSetCookie,
} from './setup-app';

// E18: requests conferidos no pacote PUBLICADO n8n-nodes-conexozenvo-gateway@0.4.1
// (WhatsappGateway.node.js / WhatsappGatewayApi.credentials.js). O node usa /api, X-Api-Key,
// nome OU ID, POST 201 e 423 com code/message; não existe uma rota /api/n8n.
// AppModule, guards, pipes, filtro, limitador, interceptor e Postgres são reais; só o transporte
// WhatsApp é falso. Nenhum contato é consultado, conta conectada ou mensagem enviada pela rede.
describe('E18 — contrato /api consumido pelo n8n no runtime Nest 12', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let accessCookie: string;
  let apiKey: string;
  let apiKeyId: string;
  let refreshTokenHash: string;
  let startedAt: Date;
  let sessionId: string;
  let sessionName: string;
  const sessionIds: string[] = [];
  const keyName = `e18-n8n-${newId()}`;
  const ip = '192.0.2.18';
  const rateIp = '192.0.2.19';
  const to = '5511999999999';
  const jid = `${to}@s.whatsapp.net`;
  const manager = {
    ...fakeSessionManager,
    start: vi.fn(async () => undefined),
    sendText: vi.fn(async () => ({ keyId: 'E18-FAKE-KEY', jid })),
    markRead: vi.fn(async () => undefined),
  };
  const api = () => ({
    'X-Api-Key': apiKey,
    'content-type': 'application/json',
    'x-forwarded-for': ip,
  });
  const panel = () => ({
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-forwarded-for': ip,
  });

  beforeAll(async () => {
    startedAt = new Date();
    app = await createTestApp(manager, { rateLimitMax: 600 });
    prisma = app.get(PrismaService);
    const login = await inject(app, {
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      payload: { username: 'admin', password: 'admin123' },
    });
    expect(login.statusCode).toBe(201);
    expect(login.json()).toMatchObject({
      token: expect.any(String),
      user: { username: 'admin' },
    });
    token = login.json().token;
    accessCookie = readSetCookie(login, 'token')!;
    expect(accessCookie).toBe(token);
    const refreshToken = readSetCookie(login, 'refresh_token');
    expect(refreshToken).toBeTruthy();
    refreshTokenHash = sha512(refreshToken!);
    const cookies = ([] as string[]).concat(login.headers['set-cookie']);
    expect(cookies.some((c) => /^token=/.test(c) && /HttpOnly/i.test(c))).toBe(
      true,
    );
    expect(
      cookies.some(
        (c) => /^refresh_token=/.test(c) && /Path=\/api\/auth(;|$)/.test(c),
      ),
    ).toBe(true);

    const created = await inject(app, {
      method: 'POST',
      url: '/api/api-keys',
      headers: panel(),
      payload: { name: keyName },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toEqual({
      id: expect.any(String),
      name: keyName,
      prefix: expect.any(String),
      key: expect.any(String),
    });
    apiKey = created.json().key;
    apiKeyId = created.json().id;
  });

  beforeEach(async () => {
    manager.start.mockClear();
    manager.sendText.mockClear();
    manager.markRead.mockClear();
    sessionId = newId();
    sessionName = `e18-n8n-${sessionId.toLowerCase()}`;
    sessionIds.push(sessionId);
    await prisma.waSession.create({
      data: {
        id: sessionId,
        name: sessionName,
        autostart: false,
        creds: { secret: 'fixture-auth' },
        authEpoch: 42n,
        leaseOwner: 'fixture-owner',
      },
    });
  });

  afterAll(async () => {
    // A chave criada no teste de revogação também usa o prefixo exclusivo desta execução.
    await prisma.waApiKey.deleteMany({
      where: { name: { startsWith: keyName } },
    });
    await prisma.waSession.deleteMany({ where: { id: { in: sessionIds } } });
    await prisma.refreshToken.deleteMany({
      where: { tokenHash: refreshTokenHash },
    });
    await prisma.waAuditLog.deleteMany({
      where: { ip: { in: [ip, rateIp] }, createdAt: { gte: startedAt } },
    });
    await app.close();
  });

  it('teste da credential lista sessões; ID e nome devolvem o mesmo DTO sem auth/lease internos', async () => {
    const list = await inject(app, {
      method: 'GET',
      url: '/api/sessions',
      headers: api(),
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: sessionId,
          name: sessionName,
          guardrailState: 'ativa',
        }),
      ]),
    );
    const expected = {
      id: sessionId,
      name: sessionName,
      engine: 'BAILEYS',
      status: 'STOPPED',
      meJid: null,
      mePushName: null,
      lastMeJid: null,
      phoneNumber: null,
      autostart: false,
      lastError: null,
      lastErrorDetails: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    };
    for (const ref of [sessionName, sessionId]) {
      const get = await inject(app, {
        method: 'GET',
        url: `/api/sessions/${ref}`,
        headers: api(),
      });
      expect(get.statusCode).toBe(200);
      expect(get.json()).toEqual(expected);
      expect(Number.isNaN(Date.parse(get.json().createdAt))).toBe(false);
    }
    await vi.waitFor(async () => {
      expect(
        (await prisma.waApiKey.findUniqueOrThrow({ where: { id: apiKeyId } }))
          .lastUsedAt,
      ).not.toBeNull();
    });
  });

  it('texto por nome e replay por ID preservam 201, id/to/deduped e UMA intenção durável', async () => {
    const payload = {
      to,
      text: 'resposta sintética',
      cold: false,
      idempotencyKey: 'n8n-exec-18',
    };
    const first = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionName}/messages/text`,
      headers: api(),
      payload,
    });
    expect(first.statusCode).toBe(201);
    expect(first.json()).toEqual({
      id: 'E18-FAKE-KEY',
      to: jid,
      deduped: false,
    });
    const replay = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionId}/messages/text`,
      headers: api(),
      payload,
    });
    expect(replay.statusCode).toBe(201);
    expect(replay.json()).toEqual({
      id: 'E18-FAKE-KEY',
      to: jid,
      deduped: true,
    });
    const conflict = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionName}/messages/text`,
      headers: api(),
      payload: { ...payload, text: 'outro conteúdo' },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      message: expect.stringContaining('idempotencyKey'),
    });
    expect(manager.sendText).toHaveBeenCalledExactlyOnceWith(
      sessionId,
      to,
      payload.text,
      {
        cold: false,
        idempotencyKey: payload.idempotencyKey,
        mentions: undefined,
      },
    );
    const intents = await prisma.sendIntent.findMany({ where: { sessionId } });
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({
      idempotencyKey: payload.idempotencyKey,
      status: 'sent',
      keyId: 'E18-FAKE-KEY',
      chatJid: jid,
      attempts: 1,
      error: null,
    });
  });

  it('parser, schema, auth e resolução recusam 400/401/404 antes do transporte ou da reserva', async () => {
    const route = `/api/sessions/${sessionName}/messages/text`;
    const payload = { to, text: 'fixture', idempotencyKey: 'nao-reservar' };
    const cases = [
      { url: route, headers: api(), payload: '{"to":', status: 400 },
      {
        url: route,
        headers: api(),
        payload: { ...payload, cold: 'false' },
        status: 400,
      },
      {
        url: route,
        headers: api(),
        payload: { ...payload, idempotencyKey: '' },
        status: 400,
      },
      {
        url: route,
        headers: { 'content-type': 'application/json' },
        payload,
        status: 401,
      },
      {
        url: route,
        headers: { ...panel(), 'X-Api-Key': 'cz-invalida' },
        payload,
        status: 401,
      },
      {
        url: `/api/sessions/ausente-${sessionId}/messages/text`,
        headers: api(),
        payload,
        status: 404,
      },
    ];
    for (const test of cases) {
      const response = await inject(app, {
        method: 'POST',
        url: test.url,
        headers: test.headers,
        payload: test.payload,
      });
      expect(response.statusCode).toBe(test.status);
      expect(response.json()).toMatchObject({
        statusCode: test.status,
        message: expect.any(String),
      });
    }
    expect(manager.sendText).not.toHaveBeenCalled();
    expect(await prisma.sendIntent.count({ where: { sessionId } })).toBe(0);
  });

  it('pausa mantém 423 do n8n e libera a intenção para retry; cold=false continua 201', async () => {
    const pause = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionName}/pause`,
      headers: api(),
    });
    expect(pause.statusCode).toBe(201);
    expect(pause.json()).toMatchObject({ state: 'pausa_manual' });
    expect(
      (
        await prisma.sessionGuardrail.findUniqueOrThrow({
          where: { sessionId },
        })
      ).state,
    ).toBe('pausa_manual');
    const blockedPayload = {
      to,
      text: 'fixture bloqueada',
      cold: true,
      idempotencyKey: 'cold-bloqueado',
    };
    const blocked = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionName}/messages/text`,
      headers: api(),
      payload: blockedPayload,
    });
    expect(blocked.statusCode).toBe(423);
    expect(blocked.json()).toEqual({
      code: 'SESSION_QUARANTINED',
      state: 'pausa_manual',
      message: expect.any(String),
    });
    expect(manager.sendText).not.toHaveBeenCalled();
    // O contrato existente reserva ANTES do gate e marca failed ao bloquear: a chave não fica
    // pendente e pode ser retomada após o operador liberar a sessão (ABE-03).
    const blockedIntent = {
      sessionId_idempotencyKey: {
        sessionId,
        idempotencyKey: blockedPayload.idempotencyKey,
      },
    };
    expect(
      await prisma.sendIntent.findUniqueOrThrow({ where: blockedIntent }),
    ).toMatchObject({
      status: 'failed',
      keyId: null,
      attempts: 1,
      error: 'bloqueado pelo guard-rail',
    });
    const response = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionId}/messages/text`,
      headers: api(),
      payload: {
        to,
        text: 'resposta sintética',
        cold: false,
        idempotencyKey: 'resposta-permitida',
      },
    });
    expect(response.statusCode).toBe(201);
    expect(manager.sendText).toHaveBeenCalledOnce();
    expect(
      (
        await inject(app, {
          method: 'POST',
          url: `/api/sessions/${sessionName}/activate`,
          headers: api(),
        })
      ).statusCode,
    ).toBe(201);
    const retried = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionName}/messages/text`,
      headers: api(),
      payload: blockedPayload,
    });
    expect(retried.statusCode).toBe(201);
    expect(retried.json().deduped).toBe(false);
    expect(manager.sendText).toHaveBeenCalledTimes(2);
    expect(
      await prisma.sendIntent.findUniqueOrThrow({ where: blockedIntent }),
    ).toMatchObject({
      status: 'sent',
      keyId: 'E18-FAKE-KEY',
      attempts: 2,
      error: null,
    });
  });

  it('POST sem corpo JSON do node mantém 201 e resolve nome antes de start', async () => {
    const started = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionName}/start`,
      headers: api(),
    });
    expect(started.statusCode).toBe(201);
    expect(started.json()).toEqual({ ok: true });
    expect(manager.start).toHaveBeenCalledExactlyOnceWith(sessionId);
  });

  it('histórico preserva keyId, datas ISO, query e read receipt com chave do WhatsApp', async () => {
    const msgId = newId();
    const keyId = 'E18-INBOUND-KEY';
    const timestamp = new Date('2026-09-01T12:34:56.000Z');
    await prisma.waMessage.create({
      data: {
        id: msgId,
        sessionId,
        keyId,
        chatJid: jid,
        senderJid: jid,
        text: 'histórico sintético',
        timestamp,
      },
    });
    const list = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionName}/messages?chatId=${to}&limit=1`,
      headers: api(),
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toEqual([
      {
        id: msgId,
        keyId,
        sessionId,
        chatJid: jid,
        senderJid: jid,
        senderName: null,
        fromMe: false,
        type: 'text',
        text: 'histórico sintético',
        status: null,
        isCold: false,
        source: null,
        timestamp: timestamp.toISOString(),
        mediaType: null,
        mimetype: null,
        fileName: null,
        fileSize: null,
        mediaUrl: null,
        isForwarded: false,
        forwardingScore: null,
        reactions: [],
      },
    ]);
    const read = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionName}/messages/${keyId}/read`,
      headers: api(),
    });
    expect(read.statusCode).toBe(201);
    expect(read.json()).toEqual({ ok: true });
    expect(manager.markRead).toHaveBeenCalledExactlyOnceWith(
      sessionId,
      jid,
      keyId,
    );
  });

  it('cookie continua sujeito a CSRF; X-Api-Key e Bearer conservam acesso de integração', async () => {
    const route = `/api/sessions/${sessionName}/config`;
    const rejected = await inject(app, {
      method: 'PATCH',
      url: route,
      headers: {
        cookie: `token=${accessCookie}`,
        origin: 'https://outside.invalid',
        'content-type': 'application/json',
        'x-forwarded-for': ip,
      },
      payload: { capBase: 37 },
    });
    expect(rejected.statusCode).toBe(403);
    expect(await prisma.sessionConfig.count({ where: { sessionId } })).toBe(0);
    for (const headers of [api(), panel()]) {
      const accepted = await inject(app, {
        method: 'PATCH',
        url: route,
        headers: { ...headers, origin: 'https://outside.invalid' },
        payload: { capBase: 37 },
      });
      expect(accepted.statusCode).toBe(200);
      expect(accepted.json()).toMatchObject({ capBase: 37, cap_base: 37 });
    }
    expect(
      (await prisma.sessionConfig.findUniqueOrThrow({ where: { sessionId } }))
        .capBase,
    ).toBe(37);
  });

  it('papéis e rotas exclusivas do painel continuam fechados antes de qualquer efeito', async () => {
    const viewer = await app.get(JwtService).signAsync({
      sub: 'fixture-viewer',
      username: 'fixture-viewer',
      role: 'VIEWER',
    });
    const read = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionName}`,
      headers: { authorization: `Bearer ${viewer}` },
    });
    expect(read.statusCode).toBe(200);
    const send = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionName}/messages/text`,
      headers: {
        authorization: `Bearer ${viewer}`,
        'content-type': 'application/json',
      },
      payload: { to, text: 'fixture' },
    });
    expect(send.statusCode).toBe(403);
    for (const url of [
      '/api/api-keys',
      `/api/sessions/${sessionName}/connect-link`,
    ]) {
      const denied = await inject(app, {
        method: 'POST',
        url,
        headers: api(),
        payload: {},
      });
      expect(denied.statusCode).toBe(401);
    }
    expect(manager.sendText).not.toHaveBeenCalled();
    expect(await prisma.connectLink.count({ where: { sessionId } })).toBe(0);
  });

  it('PATCH do node gera efeito e auditoria por API key em sucesso/400 na rota codificada', async () => {
    const route = `/%61pi/sessions/${sessionName}/config`;
    const changed = await inject(app, {
      method: 'PATCH',
      url: `${route}?trace=fixture`,
      headers: api(),
      payload: { capBase: 31, modo: 'inbound_only' },
    });
    expect(changed.statusCode).toBe(200);
    const invalid = await inject(app, {
      method: 'PATCH',
      url: route,
      headers: api(),
      payload: { capBase: -1 },
    });
    expect(invalid.statusCode).toBe(400);
    expect(
      await prisma.sessionConfig.findUniqueOrThrow({ where: { sessionId } }),
    ).toMatchObject({ capBase: 31, modo: 'inbound_only' });
    await vi.waitFor(
      async () => {
        const records = await prisma.waAuditLog.findMany({
          where: { actor: `key:${keyName}`, path: route },
          orderBy: { createdAt: 'asc' },
        });
        expect(records).toHaveLength(2);
        expect(records).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              method: 'PATCH',
              path: route,
              statusCode: 200,
              ip,
            }),
            expect.objectContaining({
              method: 'PATCH',
              path: route,
              statusCode: 400,
              ip,
            }),
          ]),
        );
      },
      { timeout: 5_000, interval: 25 },
    );
  });

  it('revogar pelo painel invalida imediatamente a credential n8n no banco e no guard', async () => {
    const created = await inject(app, {
      method: 'POST',
      url: '/api/api-keys',
      headers: panel(),
      payload: { name: `${keyName}-revogada` },
    });
    expect(created.statusCode).toBe(201);
    const { id, key } = created.json() as { id: string; key: string };
    const headers = { ...api(), 'X-Api-Key': key };
    expect(
      (await inject(app, { method: 'GET', url: '/api/sessions', headers }))
        .statusCode,
    ).toBe(200);
    const revoked = await inject(app, {
      method: 'DELETE',
      url: `/api/api-keys/${id}`,
      headers: panel(),
    });
    expect(revoked.statusCode).toBe(200);
    expect(revoked.json()).toEqual({ ok: true });
    expect(
      (await prisma.waApiKey.findUniqueOrThrow({ where: { id } })).revokedAt,
    ).not.toBeNull();
    const denied = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionName}/start`,
      headers,
    });
    expect(denied.statusCode).toBe(401);
    expect(denied.json()).toEqual({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'API key inválida ou revogada',
    });
    expect(manager.start).not.toHaveBeenCalled();
  });

  it('baldes de API/login são independentes, 429 mantém headers/corpo e não executa start', async () => {
    const limited = await createTestApp(manager, { rateLimitMax: 3 });
    const headers = { ...api(), 'x-forwarded-for': rateIp };
    try {
      for (let i = 0; i < 3; i++) {
        const allowed = await inject(limited, {
          method: 'GET',
          url: '/api/sessions',
          headers,
        });
        expect(allowed.statusCode).toBe(200);
        expect(allowed.headers['x-ratelimit-remaining']).toBe(String(2 - i));
      }
      const blocked = await inject(limited, {
        method: 'POST',
        url: `/api/sessions/${sessionName}/start`,
        headers,
      });
      expect(blocked.statusCode).toBe(429);
      expect(blocked.json()).toMatchObject({
        statusCode: 429,
        message: expect.stringContaining('Rate limit exceeded'),
      });
      expect(blocked.json()).not.toHaveProperty('code');
      expect(blocked.headers['x-ratelimit-limit']).toBe('3');
      expect(blocked.headers['x-ratelimit-remaining']).toBe('0');
      expect(Number(blocked.headers['x-ratelimit-reset'])).toBeGreaterThan(0);
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
      expect(manager.start).not.toHaveBeenCalled();
      for (let i = 0; i < 10; i++) {
        const rejected = await inject(limited, {
          method: 'POST',
          url: i % 2 ? '/%61pi/auth/login' : '/api/auth/login',
          headers,
          payload: {},
        });
        expect(rejected.statusCode).toBe(401);
        expect(rejected.headers['x-ratelimit-limit']).toBe('10');
      }
      expect(
        (
          await inject(limited, {
            method: 'POST',
            url: '/api/auth/login',
            headers,
            payload: {},
          })
        ).statusCode,
      ).toBe(429);
      const health = await inject(limited, {
        method: 'GET',
        url: '/health?probe=e18',
        headers,
      });
      expect(health.statusCode).toBe(200);
      expect(health.headers['x-ratelimit-limit']).toBeUndefined();
    } finally {
      await limited.close();
    }
  });
});
