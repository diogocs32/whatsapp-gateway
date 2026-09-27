import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Prisma, PrismaService } from '../src/infra/prisma/prisma.service';
import { WRONG_NUMBER_REASON } from '../src/modules/sessions/application/connect-link.service';
import { SessionBusyError } from '../src/modules/sessions/application/session-manager.service';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from '../src/modules/sessions/domain/session.repository';
import type { SessionStatus } from '../src/modules/sessions/domain/session-status';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import { newId } from '../src/shared-kernel/ulid';
import { createTestApp, fakeSessionManager, inject, login } from './setup-app';

// E27 · P-086 · D-037 — link público temporário para conectar uma sessão por QR, de ponta a ponta
// (R6): rotas autenticadas + rotas públicas + Postgres real + EventBus real. O SessionManager é o
// fake do setup-app (sem WhatsApp): o estado "vivo" da engine vem de spies em liveView/isBusy/…
describe('link de conexão por QR (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let repo: SessionRepository;
  let token: string;
  let viewerToken: string;
  let apiKeyId: string | null = null;
  let apiKey: string;
  const inicio = new Date();
  const VIEWER = 'e2e-cl-viewer';
  const QR = 'data:image/png;base64,AAAA';
  const ESPERADO = '5511988887777';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    repo = app.get<SessionRepository>(SESSION_REPOSITORY);
    token = await login(app);

    await prisma.user.deleteMany({ where: { username: VIEWER } });
    const user = await inject(app, {
      method: 'POST',
      url: '/api/users',
      headers: auth(),
      payload: {
        username: VIEWER,
        name: 'Viewer E27',
        password: 'senha-viewer-123',
        role: 'VIEWER',
      },
    });
    expect(user.statusCode).toBe(201);
    const viewerLogin = await inject(app, {
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: { username: VIEWER, password: 'senha-viewer-123' },
    });
    viewerToken = viewerLogin.json().token as string;

    const key = await inject(app, {
      method: 'POST',
      url: '/api/api-keys',
      headers: auth(),
      payload: { name: 'e2e-cl-key' },
    });
    expect(key.statusCode).toBe(201);
    apiKeyId = key.json().id as string;
    apiKey = key.json().key as string;
  });

  afterAll(async () => {
    // Cascade leva wa_connect_links e wa_session_events junto.
    await prisma.waSession.deleteMany({
      where: { name: { startsWith: 'e2e-cl-' } },
    });
    await prisma.user.deleteMany({ where: { username: VIEWER } });
    if (apiKeyId) {
      await prisma.waApiKey.deleteMany({ where: { id: apiKeyId } });
    }
    await prisma.waAuditLog.deleteMany({
      where: {
        createdAt: { gte: inicio },
        OR: [
          { path: { contains: 'e2e-cl-' } },
          { path: { startsWith: '/api/public/connect' } },
          { path: { in: ['/api/users', '/api/api-keys'] } },
          { actor: { contains: 'e2e-cl-' } },
          { path: '/api/auth/refresh', actor: 'anônimo' },
        ],
      },
    });
    await app.close();
  });

  function auth(bearer = token) {
    return {
      authorization: `Bearer ${bearer}`,
      'content-type': 'application/json',
    };
  }

  interface Seeded {
    id: string;
    name: string;
  }

  // Sessão direto no banco com id ≠ nome: as rotas usam o NOME (SessionRefPipe resolve para o id).
  async function seed(
    data: {
      engine?: 'BAILEYS' | 'WWEBJS';
      status?: SessionStatus;
      creds?: Prisma.InputJsonValue;
      meJid?: string | null;
      lastMeJid?: string | null;
    } = {},
  ): Promise<Seeded> {
    const id = newId();
    const name = `e2e-cl-${newId().slice(-8).toLowerCase()}`;
    await prisma.waSession.create({
      data: { id, name, autostart: false, ...data },
    });
    return { id, name };
  }

  function createLink(ref: string, payload?: unknown, bearer = token) {
    return inject(app, {
      method: 'POST',
      url: `/api/sessions/${ref}/connect-link`,
      headers:
        payload === undefined
          ? { authorization: `Bearer ${bearer}` }
          : auth(bearer),
      payload,
    });
  }

  async function newLink(
    ref: string,
    payload: unknown = {},
  ): Promise<{
    link: { id: string; [k: string]: unknown };
    token: string;
    path: string;
  }> {
    const res = await createLink(ref, payload);
    expect(res.statusCode).toBe(201);
    return res.json();
  }

  function pub(
    linkToken: string | null,
    method: 'GET' | 'POST' = 'GET',
    authorization?: string,
  ) {
    const headers: Record<string, string> = {};
    if (authorization !== undefined) headers.authorization = authorization;
    else if (linkToken !== null) headers.authorization = `Bearer ${linkToken}`;
    return inject(app, {
      method,
      url:
        method === 'GET' ? '/api/public/connect' : '/api/public/connect/new-qr',
      headers,
    });
  }

  function linkRow(id: string) {
    return prisma.connectLink.findUniqueOrThrow({ where: { id } });
  }

  // Ordem de PRODUÇÃO (SessionManager.handleEngineEvent): persiste o status (repositório real,
  // grava meJid/lastMeJid) e SÓ DEPOIS publica o envelope `wa.event` no EventBus.
  async function persistAndPublish(
    s: Seeded,
    status: SessionStatus,
    meJid: string | null,
  ): Promise<void> {
    await repo.updateStatus(s.id, status, {
      meJid,
      mePushName: meJid ? 'Fulano' : null,
      lastError: null,
    });
    app.get(EventBus).publish({
      name: 'wa.event',
      occurredAt: new Date(),
      payload: {
        id: `e2e-cl-${newId()}`,
        timestamp: Date.now(),
        event: 'session.status',
        sessionId: s.id,
        session: s.name,
        payload: { status, meJid },
        engine: 'baileys',
      },
    });
  }

  async function waitRow(
    id: string,
    ok: (row: Awaited<ReturnType<typeof linkRow>>) => boolean,
  ) {
    await vi.waitFor(
      async () => {
        expect(ok(await linkRow(id))).toBe(true);
      },
      { timeout: 5_000, interval: 50 },
    );
    return linkRow(id);
  }

  describe('autenticação e papéis', () => {
    it('POST/GET/DELETE sem login → 401', async () => {
      const s = await seed();
      for (const method of ['POST', 'GET', 'DELETE']) {
        const res = await inject(app, {
          method,
          url: `/api/sessions/${s.name}/connect-link`,
        });
        expect(res.statusCode, method).toBe(401);
      }
      expect(
        await prisma.connectLink.count({ where: { sessionId: s.id } }),
      ).toBe(0);
    });

    // D-037 §2: criar link é só pelo login do painel — API key/n8n fica para a P-093.
    it('X-Api-Key válida NÃO cria link (401), embora abra as rotas de API', async () => {
      const s = await seed();
      const list = await inject(app, {
        method: 'GET',
        url: '/api/sessions',
        headers: { 'x-api-key': apiKey },
      });
      expect(list.statusCode).toBe(200);
      const res = await inject(app, {
        method: 'POST',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
        payload: {},
      });
      expect(res.statusCode).toBe(401);
      expect(
        await prisma.connectLink.count({ where: { sessionId: s.id } }),
      ).toBe(0);
    });

    it('VIEWER consulta (200) mas não cria nem revoga (403)', async () => {
      const s = await seed();
      expect((await createLink(s.name, {}, viewerToken)).statusCode).toBe(403);
      const get = await inject(app, {
        method: 'GET',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(get.statusCode).toBe(200);
      expect(get.json()).toEqual({ link: null });
      const del = await inject(app, {
        method: 'DELETE',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(del.statusCode).toBe(403);
    });
  });

  describe('criar link (POST /api/sessions/:id/connect-link)', () => {
    it('Baileys STOPPED sem creds → 201 {link ACTIVE, token de 43, path /conectar#token}, TTL padrão 24 h', async () => {
      const s = await seed();
      const antes = Date.now();
      // Sem corpo: o painel pode mandar só o POST (ttl e número opcionais).
      const res = await createLink(s.name);
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(body.path).toBe(`/conectar#${body.token}`);
      expect(body.link).toMatchObject({
        sessionId: s.id,
        state: 'ACTIVE',
        expectedPhone: null,
        newQrCount: 0,
        newQrMax: 5,
        lastSeenAt: null,
        consumedAt: null,
        revokedAt: null,
        revokedReason: null,
      });
      expect(body.link.createdBy).toMatch(/^admin \(/);
      const ttl = Date.parse(body.link.expiresAt) - antes;
      expect(ttl).toBeGreaterThan(24 * 60 * 60_000 - 60_000);
      expect(ttl).toBeLessThan(24 * 60 * 60_000 + 60_000);
      // Só o hash vai para o banco.
      const row = await linkRow(body.link.id);
      expect(row.tokenHash).not.toContain(body.token);
      expect(row.tokenHash).toMatch(/^[0-9a-f]{128}$/);
      expect(JSON.stringify(body.link)).not.toContain('tokenHash');
    });

    it('normaliza expectedPhone para dígitos e respeita ttlMinutes', async () => {
      const s = await seed();
      const antes = Date.now();
      const { link } = await newLink(s.name, {
        ttlMinutes: 60,
        expectedPhone: '+55 (11) 98888-7777',
      });
      expect(link.expectedPhone).toBe(ESPERADO);
      const ttl = Date.parse(link.expiresAt as string) - antes;
      expect(Math.abs(ttl - 60 * 60_000)).toBeLessThan(60_000);
    });

    it.each([10, 4320])('ttlMinutes %i (limite) → 201', async (ttlMinutes) => {
      const s = await seed();
      const antes = Date.now();
      const { link } = await newLink(s.name, { ttlMinutes });
      const ttl = Date.parse(link.expiresAt as string) - antes;
      expect(Math.abs(ttl - ttlMinutes * 60_000)).toBeLessThan(60_000);
    });

    it.each([
      ['ttlMinutes 5 (abaixo de 10)', { ttlMinutes: 5 }],
      ['ttlMinutes 5000 (acima de 4320)', { ttlMinutes: 5000 }],
      ['ttlMinutes fracionário', { ttlMinutes: 60.5 }],
      ['expectedPhone curto', { expectedPhone: '123' }],
      ['expectedPhone longo', { expectedPhone: '1234567890123456' }],
      // Revisão do diff (E27): BR sem o 55 nunca casaria com o meJid (WRONG_NUMBER falso).
      ['expectedPhone sem DDI', { expectedPhone: '(11) 98888-7777' }],
    ])('%s → 400 sem criar link', async (_caso, payload) => {
      const s = await seed();
      const res = await createLink(s.name, payload);
      expect(res.statusCode).toBe(400);
      expect(
        await prisma.connectLink.count({ where: { sessionId: s.id } }),
      ).toBe(0);
    });

    // Regressão (E27): corrigido após o teste acusar o defeito.
    // que não é dígito e trata "sobrou vazio" como "sem número" — um valor NÃO vazio sem dígitos
    // ('abc', '+', '-') cria o link aceitando QUALQUER número (falha aberta), em vez de 400 como
    // pede o D-037 §5 ("só dígitos, 10..15"). O painel só manda dígitos, mas a rota é a borda.
    it('expectedPhone não vazio sem dígitos → 400 (não vira "qualquer número")', async () => {
      const s = await seed();
      const res = await createLink(s.name, { expectedPhone: 'abc' });
      expect(res.statusCode).toBe(400);
    });

    it('sessão WWEBJS → 409 CONNECT_LINK_ENGINE_UNSUPPORTED', async () => {
      const s = await seed({ engine: 'WWEBJS' });
      const res = await createLink(s.name, {});
      expect(res.statusCode).toBe(409);
      expect(res.json().code).toBe('CONNECT_LINK_ENGINE_UNSUPPORTED');
    });

    it('sessão WORKING no banco → 409 CONNECT_LINK_SESSION_WORKING', async () => {
      const s = await seed({ status: 'WORKING' });
      const res = await createLink(s.name, {});
      expect(res.statusCode).toBe(409);
      expect(res.json().code).toBe('CONNECT_LINK_SESSION_WORKING');
    });

    it('engine viva WORKING com banco STOPPED → 409 CONNECT_LINK_SESSION_WORKING', async () => {
      const s = await seed();
      const live = vi
        .spyOn(fakeSessionManager, 'liveView')
        .mockReturnValue({ status: 'WORKING', qr: null });
      try {
        const res = await createLink(s.name, {});
        expect(res.statusCode).toBe(409);
        expect(res.json().code).toBe('CONNECT_LINK_SESSION_WORKING');
      } finally {
        live.mockRestore();
      }
    });

    it('login salvo (creds.account) → 409 CONNECT_LINK_SESSION_PAIRED', async () => {
      const s = await seed({
        creds: {
          me: { id: `${ESPERADO}:1@s.whatsapp.net` },
          account: { details: 'x' },
        },
      });
      const res = await createLink(s.name, {});
      expect(res.statusCode).toBe(409);
      expect(res.json().code).toBe('CONNECT_LINK_SESSION_PAIRED');
    });

    // `creds.me` sem `account` = código de pareamento pedido e não concluído: NÃO é login salvo.
    it('creds só com `me` → 201', async () => {
      const s = await seed({
        creds: { me: { id: `${ESPERADO}:1@s.whatsapp.net` } },
      });
      const res = await createLink(s.name, {});
      expect(res.statusCode).toBe(201);
    });

    // A sessão conectou (ex.: pelo modal) entre a checagem e o insert: o link já nasce consumido.
    it('sessão fica WORKING entre a checagem e o insert → link nasce CONNECTED', async () => {
      const s = await seed();
      const live = vi
        .spyOn(fakeSessionManager, 'liveView')
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ status: 'WORKING', qr: null });
      try {
        const { link } = await newLink(s.name);
        expect(link.state).toBe('CONNECTED');
        expect(link.consumedAt).not.toBeNull();
        expect(live).toHaveBeenCalledTimes(2);
      } finally {
        live.mockRestore();
      }
    });

    it('sessão inexistente → 404', async () => {
      const res = await createLink('e2e-cl-nao-existe', {});
      expect(res.statusCode).toBe(404);
    });

    it('GET devolve o último link sem token; segundo create revoga o primeiro (REPLACED → 410)', async () => {
      const s = await seed();
      const vazio = await inject(app, {
        method: 'GET',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: auth(),
      });
      expect(vazio.json()).toEqual({ link: null });

      const primeiro = await newLink(s.name);
      const segundo = await newLink(s.name, { expectedPhone: ESPERADO });

      const atual = await inject(app, {
        method: 'GET',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: auth(),
      });
      expect(atual.statusCode).toBe(200);
      expect(atual.json().link).toMatchObject({
        id: segundo.link.id,
        state: 'ACTIVE',
        expectedPhone: ESPERADO,
      });
      expect(atual.body).not.toContain(segundo.token);
      expect(atual.body).not.toContain(primeiro.token);
      expect(atual.json()).not.toHaveProperty('token');
      expect(atual.json().link).not.toHaveProperty('tokenHash');

      expect(await linkRow(primeiro.link.id)).toMatchObject({
        revokedReason: 'REPLACED',
      });
      const velho = await pub(primeiro.token);
      expect(velho.statusCode).toBe(410);
      expect(velho.json().code).toBe('CONNECT_LINK_REVOKED');
      expect((await pub(segundo.token)).statusCode).toBe(200);
    });

    // FOR UPDATE na linha da sessão: dois "gerar link" simultâneos não deixam dois links ativos.
    it('dois creates simultâneos deixam UM link ativo', async () => {
      const s = await seed();
      const [a, b] = await Promise.all([
        createLink(s.name, {}),
        createLink(s.name, {}),
      ]);
      expect([a.statusCode, b.statusCode]).toEqual([201, 201]);
      const ativos = await prisma.connectLink.count({
        where: { sessionId: s.id, revokedAt: null, consumedAt: null },
      });
      expect(ativos).toBe(1);
      expect(
        await prisma.connectLink.count({
          where: { sessionId: s.id, revokedReason: 'REPLACED' },
        }),
      ).toBe(1);
      // O "link mais recente" do painel é o ativo (createdAt gravado depois da trava).
      const atual = await inject(app, {
        method: 'GET',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: auth(),
      });
      expect(atual.json().link.state).toBe('ACTIVE');
    });

    it('create apaga inativos da sessão com mais de 30 dias e preserva os recentes e os de outra sessão', async () => {
      const s = await seed();
      const outra = await seed();
      const dia = 24 * 60 * 60_000;
      const velho = (sessionId: string, extra: object) => ({
        id: newId(),
        sessionId,
        tokenHash: `e2e-cl-${newId()}`,
        createdBy: 'e2e',
        createdAt: new Date(Date.now() - 31 * dia),
        expiresAt: new Date(Date.now() - 30 * dia),
        ...extra,
      });
      const revogadoVelho = velho(s.id, {
        revokedAt: new Date(Date.now() - 31 * dia),
        revokedReason: 'MANUAL',
      });
      const expiradoVelho = velho(s.id, {});
      const revogadoRecente = velho(s.id, {
        createdAt: new Date(Date.now() - dia),
        expiresAt: new Date(Date.now() + dia),
        revokedAt: new Date(Date.now() - dia),
        revokedReason: 'MANUAL',
      });
      const daOutra = velho(outra.id, {});
      await prisma.connectLink.createMany({
        data: [revogadoVelho, expiradoVelho, revogadoRecente, daOutra],
      });

      await newLink(s.name);

      const ids = (
        await prisma.connectLink.findMany({
          where: { sessionId: { in: [s.id, outra.id] } },
          select: { id: true },
        })
      ).map((r) => r.id);
      expect(ids).not.toContain(revogadoVelho.id);
      expect(ids).not.toContain(expiradoVelho.id);
      expect(ids).toContain(revogadoRecente.id);
      expect(ids).toContain(daOutra.id);
    });

    it('DELETE revoga o link ativo (MANUAL) e o token passa a dar 410; sem link ativo revoga 0', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name);
      const del = await inject(app, {
        method: 'DELETE',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(del.statusCode).toBe(200);
      expect(del.json()).toEqual({ ok: true, revoked: 1 });
      expect(await linkRow(link.id)).toMatchObject({ revokedReason: 'MANUAL' });
      const res = await pub(t);
      expect(res.statusCode).toBe(410);
      expect(res.json().code).toBe('CONNECT_LINK_REVOKED');

      const again = await inject(app, {
        method: 'DELETE',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(again.json()).toEqual({ ok: true, revoked: 0 });
      const painel = await inject(app, {
        method: 'GET',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: auth(),
      });
      expect(painel.json().link).toMatchObject({
        id: link.id,
        state: 'REVOKED',
        revokedReason: 'MANUAL',
      });
    });
  });

  describe('rota pública — credencial do link', () => {
    it('sem header / Bearer lixo / esquema errado / JWT do painel → 404 CONNECT_LINK_NOT_FOUND', async () => {
      const cases: Array<string | undefined> = [
        undefined,
        'Bearer lixo',
        `Bearer ${'A'.repeat(43)}`,
        `Basic ${'A'.repeat(43)}`,
        `Bearer ${token}`,
      ];
      for (const authorization of cases) {
        const res =
          authorization === undefined
            ? await pub(null)
            : await pub(null, 'GET', authorization);
        expect(res.statusCode, authorization ?? 'sem header').toBe(404);
        expect(res.json().code).toBe('CONNECT_LINK_NOT_FOUND');
      }
      const post = await pub(null, 'POST');
      expect(post.statusCode).toBe(404);
    });

    it('corpo de erro nunca ecoa o token (404 desconhecido e 410 revogado)', async () => {
      const desconhecido = `${'x'.repeat(40)}Abc`;
      const nf = await pub(desconhecido);
      expect(nf.statusCode).toBe(404);
      expect(nf.body).not.toContain(desconhecido);

      const s = await seed();
      const { token: t } = await newLink(s.name);
      await inject(app, {
        method: 'DELETE',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: { authorization: `Bearer ${token}` },
      });
      for (const method of ['GET', 'POST'] as const) {
        const res = await pub(t, method);
        expect(res.statusCode).toBe(410);
        expect(res.body).not.toContain(t);
        expect(res.body).not.toContain(s.name);
        expect(res.body).not.toContain(s.id);
      }
    });

    it('token do link não abre rota autenticada (401)', async () => {
      const s = await seed();
      const { token: t } = await newLink(s.name);
      const res = await inject(app, {
        method: 'GET',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${t}` },
      });
      expect(res.statusCode).toBe(401);
    });

    it('link expirado → 410 CONNECT_LINK_EXPIRED', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name);
      await prisma.connectLink.update({
        where: { id: link.id },
        data: { expiresAt: new Date(Date.now() - 1_000) },
      });
      const res = await pub(t);
      expect(res.statusCode).toBe(410);
      expect(res.json().code).toBe('CONNECT_LINK_EXPIRED');
      const painel = await inject(app, {
        method: 'GET',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: auth(),
      });
      expect(painel.json().link.state).toBe('EXPIRED');
    });
  });

  describe('rota pública — fase ACTIVE', () => {
    it('QR vivo → phase QR com o data URL; resposta sem nome/número/status da sessão; no-store', async () => {
      const s = await seed({ lastMeJid: `${ESPERADO}@s.whatsapp.net` });
      const { token: t } = await newLink(s.name, { expectedPhone: ESPERADO });
      const live = vi
        .spyOn(fakeSessionManager, 'liveView')
        .mockReturnValue({ status: 'SCAN_QR_CODE', qr: QR });
      try {
        const res = await pub(t);
        expect(res.statusCode).toBe(200);
        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.json()).toEqual({
          state: 'ACTIVE',
          phase: 'QR',
          qr: QR,
          expiresAt: expect.any(String),
          expectedPhoneHint: '77',
          newQr: {
            available: false,
            remaining: 5,
            max: 5,
            retryAfterSeconds: 0,
          },
        });
        expect(live).toHaveBeenCalledWith(s.id);
        expect(res.body).not.toContain(s.name);
        expect(res.body).not.toContain(ESPERADO);
      } finally {
        live.mockRestore();
      }
    });

    it('sem engine e banco STOPPED → phase IDLE, qr null, newQr.available; grava lastSeenAt', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name);
      const res = await pub(t);
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        state: 'ACTIVE',
        phase: 'IDLE',
        qr: null,
        expectedPhoneHint: null,
        newQr: { available: true, remaining: 5, max: 5, retryAfterSeconds: 0 },
      });
      const atual = await inject(app, {
        method: 'GET',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: auth(),
      });
      expect(atual.json().link.id).toBe(link.id);
      expect(atual.json().link.lastSeenAt).not.toBeNull();
    });

    // Tabela de fases com o banco real + estado vivo do fake (a tabela completa está no unit).
    it.each<
      [
        string,
        {
          db: SessionStatus;
          live?: { status: string; qr: string | null };
          busy?: boolean;
          rehydrated?: boolean;
        },
        string,
      ]
    >([
      ['banco FAILED', { db: 'FAILED' }, 'UNAVAILABLE'],
      ['banco DEGRADED sem engine', { db: 'DEGRADED' }, 'IDLE'],
      ['STARTING velho após reidratação', { db: 'STARTING' }, 'IDLE'],
      [
        'STARTING antes da reidratação',
        { db: 'STARTING', rehydrated: false },
        'PREPARING',
      ],
      [
        'código de pareamento vivo',
        { db: 'PAIRING_CODE', live: { status: 'PAIRING_CODE', qr: null } },
        'PAIRING',
      ],
      [
        'SCAN vivo com QR que não é PNG data URL',
        { db: 'SCAN_QR_CODE', live: { status: 'SCAN_QR_CODE', qr: 'lixo' } },
        'PREPARING',
      ],
      [
        'operação de ciclo de vida em andamento',
        { db: 'STOPPED', busy: true },
        'PREPARING',
      ],
    ])('%s → phase %s', async (_caso, c, phase) => {
      const s = await seed();
      const { token: t } = await newLink(s.name);
      await prisma.waSession.update({
        where: { id: s.id },
        data: { status: c.db },
      });
      const spies = [
        vi
          .spyOn(fakeSessionManager, 'liveView')
          .mockReturnValue(c.live ?? null),
        vi.spyOn(fakeSessionManager, 'isBusy').mockReturnValue(c.busy ?? false),
        vi
          .spyOn(fakeSessionManager, 'isRehydrated')
          .mockReturnValue(c.rehydrated ?? true),
      ];
      try {
        const res = await pub(t);
        expect(res.statusCode).toBe(200);
        expect(res.json().phase).toBe(phase);
        expect(res.json().qr).toBeNull();
        expect(res.json().newQr.available).toBe(phase === 'IDLE');
      } finally {
        spies.forEach((sp) => sp.mockRestore());
      }
    });
  });

  describe('rota pública — gerar QR (POST /api/public/connect/new-qr)', () => {
    it('IDLE → 200, chama newQrForConnectLink e grava a cota; GET vira PREPARING; 2º pedido imediato → 429 COOLDOWN', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name);
      const spy = vi.spyOn(fakeSessionManager, 'newQrForConnectLink');
      try {
        const res = await pub(t, 'POST');
        expect(res.statusCode).toBe(200);
        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.json()).toMatchObject({
          ok: true,
          newQr: { available: false, remaining: 4, max: 5 },
        });
        expect(res.json().newQr.retryAfterSeconds).toBeGreaterThan(0);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(s.id, expect.any(Function));
        const row = await linkRow(link.id);
        expect(row.newQrCount).toBe(1);
        expect(row.lastNewQrAt).not.toBeNull();

        // Logo após pedir, o banco ainda está STOPPED: a página mostra "preparando", sem botão.
        const estado = await pub(t);
        expect(estado.json()).toMatchObject({
          phase: 'PREPARING',
          newQr: { available: false, remaining: 4 },
        });

        const again = await pub(t, 'POST');
        expect(again.statusCode).toBe(429);
        expect(again.json().code).toBe('CONNECT_LINK_NEW_QR_COOLDOWN');
        expect(again.json().retryAfterSeconds).toBeGreaterThan(0);
        expect(again.json().retryAfterSeconds).toBeLessThanOrEqual(30);
        expect((await linkRow(link.id)).newQrCount).toBe(1);
      } finally {
        spy.mockRestore();
      }
    });

    // CAS no banco (o fake não tem o lock do SessionManager): só um dos dois reserva a cota.
    it('dois pedidos simultâneos → um 200 e um 429, cota gasta uma vez', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name);
      const [a, b] = await Promise.all([pub(t, 'POST'), pub(t, 'POST')]);
      expect([a.statusCode, b.statusCode].sort()).toEqual([200, 429]);
      expect((await linkRow(link.id)).newQrCount).toBe(1);
    });

    it('cota esgotada → GET sem botão e POST 409 CONNECT_LINK_NEW_QR_LIMIT', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name);
      await prisma.connectLink.update({
        where: { id: link.id },
        data: {
          newQrCount: 5,
          lastNewQrAt: new Date(Date.now() - 60 * 60_000),
        },
      });
      const estado = await pub(t);
      expect(estado.json()).toMatchObject({
        phase: 'IDLE',
        newQr: { available: false, remaining: 0 },
      });
      const res = await pub(t, 'POST');
      expect(res.statusCode).toBe(409);
      expect(res.json().code).toBe('CONNECT_LINK_NEW_QR_LIMIT');
      expect((await linkRow(link.id)).newQrCount).toBe(5);
    });

    it('login salvo depois de criar o link → GET UNAVAILABLE e POST 409 NEW_QR_UNAVAILABLE sem gastar cota', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name);
      await prisma.waSession.update({
        where: { id: s.id },
        data: { creds: { account: { details: 'x' } } },
      });
      const estado = await pub(t);
      expect(estado.statusCode).toBe(200);
      expect(estado.json()).toMatchObject({
        phase: 'UNAVAILABLE',
        qr: null,
        newQr: { available: false, remaining: 5 },
      });
      const spy = vi.spyOn(fakeSessionManager, 'newQrForConnectLink');
      try {
        const res = await pub(t, 'POST');
        expect(res.statusCode).toBe(409);
        expect(res.json().code).toBe('CONNECT_LINK_NEW_QR_UNAVAILABLE');
        expect(spy).toHaveBeenCalledTimes(1); // a checagem roda dentro do "lock" e recusa
        expect(await linkRow(link.id)).toMatchObject({
          newQrCount: 0,
          lastNewQrAt: null,
        });
      } finally {
        spy.mockRestore();
      }
    });

    it('QR vivo na tela → POST 409 NEW_QR_UNAVAILABLE sem gastar cota', async () => {
      const s = await seed({ status: 'SCAN_QR_CODE' });
      const { link, token: t } = await newLink(s.name);
      const live = vi
        .spyOn(fakeSessionManager, 'liveView')
        .mockReturnValue({ status: 'SCAN_QR_CODE', qr: QR });
      try {
        const res = await pub(t, 'POST');
        expect(res.statusCode).toBe(409);
        expect(res.json().code).toBe('CONNECT_LINK_NEW_QR_UNAVAILABLE');
        expect((await linkRow(link.id)).newQrCount).toBe(0);
      } finally {
        live.mockRestore();
      }
    });

    it('sessão ocupada (SessionBusyError) → 409 CONNECT_LINK_BUSY sem gastar cota', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name);
      const spy = vi
        .spyOn(fakeSessionManager, 'newQrForConnectLink')
        .mockRejectedValueOnce(new SessionBusyError());
      try {
        const res = await pub(t, 'POST');
        expect(res.statusCode).toBe(409);
        expect(res.json().code).toBe('CONNECT_LINK_BUSY');
        expect((await linkRow(link.id)).newQrCount).toBe(0);
      } finally {
        spy.mockRestore();
      }
    });

    it('falha ao gerar o QR → 503 CONNECT_LINK_NEW_QR_FAILED com mensagem fixa (sem o erro interno)', async () => {
      const s = await seed();
      const { token: t } = await newLink(s.name);
      const spy = vi
        .spyOn(fakeSessionManager, 'newQrForConnectLink')
        .mockImplementationOnce(async (_id, check) => {
          await check();
          throw new Error('e2e-cl detalhe interno da engine');
        });
      try {
        const res = await pub(t, 'POST');
        expect(res.statusCode).toBe(503);
        expect(res.json().code).toBe('CONNECT_LINK_NEW_QR_FAILED');
        expect(res.body).not.toContain('detalhe interno');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('consumo pela conexão (evento WORKING no EventBus)', () => {
    it('número esperado conecta → link consumido; GET 200 CONNECTED sem qr; depois da graça de 15 min → 410 USED', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name, {
        expectedPhone: ESPERADO,
      });
      await persistAndPublish(s, 'WORKING', `${ESPERADO}:12@s.whatsapp.net`);
      const row = await waitRow(link.id, (r) => r.consumedAt !== null);
      expect(row.revokedAt).toBeNull();

      const res = await pub(t);
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        state: 'CONNECTED',
        connectedAt: row.consumedAt!.toISOString(),
      });

      const painel = await inject(app, {
        method: 'GET',
        url: `/api/sessions/${s.name}/connect-link`,
        headers: auth(),
      });
      expect(painel.json().link).toMatchObject({
        state: 'CONNECTED',
        consumedAt: row.consumedAt!.toISOString(),
      });

      // Link já usado não pede QR.
      const qr = await pub(t, 'POST');
      expect(qr.statusCode).toBe(410);
      expect(qr.json().code).toBe('CONNECT_LINK_USED');

      await prisma.connectLink.update({
        where: { id: link.id },
        data: { consumedAt: new Date(Date.now() - 16 * 60_000) },
      });
      const late = await pub(t);
      expect(late.statusCode).toBe(410);
      expect(late.json().code).toBe('CONNECT_LINK_USED');
    });

    it('tolera o 9º dígito BR (conta antiga conecta sem o 9)', async () => {
      const s = await seed();
      const { link } = await newLink(s.name, { expectedPhone: ESPERADO });
      await persistAndPublish(s, 'WORKING', '551188887777:3@s.whatsapp.net');
      const row = await waitRow(link.id, (r) => r.consumedAt !== null);
      expect(row.revokedReason).toBeNull();
    });

    it('sem número esperado → qualquer número consome', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name);
      await persistAndPublish(s, 'WORKING', '5521977776666@s.whatsapp.net');
      await waitRow(link.id, (r) => r.consumedAt !== null);
      expect((await pub(t)).json().state).toBe('CONNECTED');
    });

    it('número errado → revoga WRONG_NUMBER e GET 410; engine fora deste processo (hasEngine=false) não chama rejectConnectedAccount', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name, {
        expectedPhone: ESPERADO,
      });
      const has = vi.spyOn(fakeSessionManager, 'hasEngine');
      const reject = vi.spyOn(fakeSessionManager, 'rejectConnectedAccount');
      try {
        await persistAndPublish(s, 'WORKING', '5521977776666@s.whatsapp.net');
        const row = await waitRow(link.id, (r) => r.revokedAt !== null);
        expect(row).toMatchObject({
          revokedReason: 'WRONG_NUMBER',
          consumedAt: null,
        });
        await vi.waitFor(() => expect(has).toHaveBeenCalledWith(s.id), {
          timeout: 2_000,
        });
        expect(reject).not.toHaveBeenCalled();
      } finally {
        has.mockRestore();
        reject.mockRestore();
      }
      const res = await pub(t);
      expect(res.statusCode).toBe(410);
      expect(res.json().code).toBe('CONNECT_LINK_WRONG_NUMBER');
      expect(res.body).not.toContain('5521977776666');
    });

    it('número errado com a engine neste processo → rejectConnectedAccount(id, motivo, esperado@s.whatsapp.net)', async () => {
      const s = await seed();
      const { link } = await newLink(s.name, { expectedPhone: ESPERADO });
      const has = vi
        .spyOn(fakeSessionManager, 'hasEngine')
        .mockReturnValue(true);
      const reject = vi.spyOn(fakeSessionManager, 'rejectConnectedAccount');
      try {
        await persistAndPublish(s, 'WORKING', '5521977776666@s.whatsapp.net');
        await waitRow(link.id, (r) => r.revokedReason === 'WRONG_NUMBER');
        await vi.waitFor(
          () =>
            expect(reject).toHaveBeenCalledWith(
              s.id,
              WRONG_NUMBER_REASON,
              `${ESPERADO}@s.whatsapp.net`,
            ),
          { timeout: 2_000 },
        );
        expect(reject).toHaveBeenCalledTimes(1);
      } finally {
        has.mockRestore();
        reject.mockRestore();
      }
    });

    // Falha fechada: @lid não é telefone — com número esperado, não dá para confirmar a identidade.
    it('meJid @lid com número esperado → WRONG_NUMBER', async () => {
      const s = await seed();
      const { link } = await newLink(s.name, { expectedPhone: ESPERADO });
      await persistAndPublish(s, 'WORKING', '123456789012345@lid');
      const row = await waitRow(link.id, (r) => r.revokedAt !== null);
      expect(row.revokedReason).toBe('WRONG_NUMBER');
    });

    // Só a réplica dona reage: o eco do fan-out (`wa.event.remote`) não consome nem revoga.
    it('`wa.event.remote` WORKING é ignorado pelo link', async () => {
      const s = await seed();
      const { link } = await newLink(s.name, { expectedPhone: ESPERADO });
      const has = vi.spyOn(fakeSessionManager, 'hasEngine');
      try {
        app.get(EventBus).publish({
          name: 'wa.event.remote',
          occurredAt: new Date(),
          payload: {
            id: `e2e-cl-${newId()}`,
            timestamp: Date.now(),
            event: 'session.status',
            sessionId: s.id,
            session: s.name,
            payload: {
              status: 'WORKING',
              meJid: '5521977776666@s.whatsapp.net',
            },
            engine: 'baileys',
          },
        });
        await new Promise((r) => setTimeout(r, 300));
        expect(await linkRow(link.id)).toMatchObject({
          consumedAt: null,
          revokedAt: null,
        });
        expect(has).not.toHaveBeenCalled();
      } finally {
        has.mockRestore();
      }
    });

    // Quem perdeu o evento (ex.: conectou no container antigo do deploy): a leitura pública com o
    // banco WORKING aplica a MESMA regra de número.
    it('leitura pública com banco WORKING (sem evento) aplica a regra de número', async () => {
      const certo = await seed();
      const a = await newLink(certo.name, { expectedPhone: ESPERADO });
      await repo.updateStatus(certo.id, 'WORKING', {
        meJid: `${ESPERADO}:5@s.whatsapp.net`,
      });
      const ok = await pub(a.token);
      expect(ok.statusCode).toBe(200);
      expect(ok.json().state).toBe('CONNECTED');
      expect((await linkRow(a.link.id)).consumedAt).not.toBeNull();

      const errado = await seed();
      const b = await newLink(errado.name, { expectedPhone: ESPERADO });
      await repo.updateStatus(errado.id, 'WORKING', {
        meJid: '5521977776666@s.whatsapp.net',
      });
      // Réplica SEM a engine (fake: hasEngine=false): não decide — segue "preparando" até a
      // réplica dona tratar o evento (revogar sem desfazer deixaria a conta errada conectada).
      const pendente = await pub(b.token);
      expect(pendente.statusCode).toBe(200);
      expect(pendente.json()).toMatchObject({
        state: 'ACTIVE',
        phase: 'PREPARING',
        qr: null,
      });
      expect(await linkRow(b.link.id)).toMatchObject({
        revokedAt: null,
        consumedAt: null,
      });

      // Réplica dona (engine aqui): revoga, desfaz a conexão e responde 410.
      const hasEngine = vi
        .spyOn(fakeSessionManager, 'hasEngine')
        .mockReturnValue(true);
      const reject = vi.spyOn(fakeSessionManager, 'rejectConnectedAccount');
      try {
        const ko = await pub(b.token);
        expect(ko.statusCode).toBe(410);
        expect(ko.json().code).toBe('CONNECT_LINK_WRONG_NUMBER');
        expect(await linkRow(b.link.id)).toMatchObject({
          revokedReason: 'WRONG_NUMBER',
          consumedAt: null,
        });
        expect(reject).toHaveBeenCalledWith(
          errado.id,
          WRONG_NUMBER_REASON,
          `${ESPERADO}@s.whatsapp.net`,
        );
      } finally {
        hasEngine.mockRestore();
        reject.mockRestore();
      }
    });

    // Fallback do uso único: WORKING na timeline (wa_session_events, coluna SEM fuso) desde a
    // criação do link. Roda com o TZ local do processo (America/Sao_Paulo na máquina do dono) —
    // pega deslocamento de fuso entre a coluna naive e o createdAt timestamptz do link.
    it('fallback pela timeline: WORKING depois do link consome; WORKING anterior ao link não', async () => {
      const antes = await seed();
      await prisma.waSessionEvent.create({
        data: {
          id: newId(),
          sessionId: antes.id,
          status: 'WORKING',
          createdAt: new Date(Date.now() - 2 * 60_000),
        },
      });
      const a = await newLink(antes.name);
      const ativo = await pub(a.token);
      expect(ativo.statusCode).toBe(200);
      expect(ativo.json()).toMatchObject({ state: 'ACTIVE', phase: 'IDLE' });
      expect((await linkRow(a.link.id)).consumedAt).toBeNull();

      const depois = await seed();
      const b = await newLink(depois.name);
      await prisma.waSessionEvent.create({
        data: { id: newId(), sessionId: depois.id, status: 'WORKING' },
      });
      const conectado = await pub(b.token);
      expect(conectado.statusCode).toBe(200);
      expect(conectado.json().state).toBe('CONNECTED');
      expect((await linkRow(b.link.id)).consumedAt).not.toBeNull();
    });
  });

  describe('ciclo de vida da sessão', () => {
    it.each(['stop', 'logout'])(
      'POST /api/sessions/:id/%s revoga o link ativo (SESSION_STOPPED)',
      async (acao) => {
        const s = await seed();
        const { link, token: t } = await newLink(s.name);
        const res = await inject(app, {
          method: 'POST',
          url: `/api/sessions/${s.name}/${acao}`,
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBeLessThan(300);
        expect(await linkRow(link.id)).toMatchObject({
          revokedReason: 'SESSION_STOPPED',
        });
        const pubRes = await pub(t);
        expect(pubRes.statusCode).toBe(410);
        expect(pubRes.json().code).toBe('CONNECT_LINK_REVOKED');
      },
    );

    it('stop depois de consumido não mexe no link conectado', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name);
      await persistAndPublish(s, 'WORKING', `${ESPERADO}@s.whatsapp.net`);
      await waitRow(link.id, (r) => r.consumedAt !== null);
      await inject(app, {
        method: 'POST',
        url: `/api/sessions/${s.name}/stop`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect((await linkRow(link.id)).revokedAt).toBeNull();
      expect((await pub(t)).json().state).toBe('CONNECTED');
    });

    it('remover a sessão apaga os links em cascata (token vira 404)', async () => {
      const s = await seed();
      const { token: t } = await newLink(s.name);
      await prisma.waSession.delete({ where: { id: s.id } });
      expect(
        await prisma.connectLink.count({ where: { sessionId: s.id } }),
      ).toBe(0);
      const res = await pub(t);
      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe('CONNECT_LINK_NOT_FOUND');
    });
  });

  describe('auditoria e lastMeJid', () => {
    it('POST create auditado com o usuário; new-qr público auditado com ator link: e path sem token', async () => {
      const s = await seed();
      const { link, token: t } = await newLink(s.name);
      const qr = await pub(t, 'POST');
      expect(qr.statusCode).toBe(200);

      await vi.waitFor(
        async () => {
          const n = await prisma.waAuditLog.count({
            where: {
              createdAt: { gte: inicio },
              OR: [
                { path: `/api/sessions/${s.name}/connect-link` },
                { actor: { startsWith: `link:${link.id}` } },
              ],
            },
          });
          expect(n).toBeGreaterThanOrEqual(2);
        },
        { timeout: 5_000, interval: 50 },
      );
      const criar = await prisma.waAuditLog.findFirstOrThrow({
        where: {
          createdAt: { gte: inicio },
          path: `/api/sessions/${s.name}/connect-link`,
        },
      });
      expect(criar).toMatchObject({ method: 'POST', statusCode: 201 });
      expect(criar.actor).toMatch(/^admin \(/);

      const publico = await prisma.waAuditLog.findFirstOrThrow({
        where: {
          createdAt: { gte: inicio },
          actor: { startsWith: `link:${link.id}` },
        },
      });
      expect(publico).toMatchObject({
        method: 'POST',
        path: '/api/public/connect/new-qr',
        statusCode: 200,
      });
      expect(publico.actor).toBe(`link:${link.id} (de ${criar.actor})`);

      const vazou = await prisma.waAuditLog.count({
        where: {
          createdAt: { gte: inicio },
          OR: [{ path: { contains: t } }, { actor: { contains: t } }],
        },
      });
      expect(vazou).toBe(0);
    });

    // E27: `login:<username>` só na rota de login — antes, qualquer mutação anônima com `username`
    // no corpo forjava o ator da trilha.
    it('ator login: só em /api/auth/login; username no corpo de outra rota anônima não forja o ator', async () => {
      const forjado = `e2e-cl-${newId().slice(-6).toLowerCase()}`;
      const refresh = await inject(app, {
        method: 'POST',
        url: '/api/auth/refresh',
        headers: { 'content-type': 'application/json' },
        payload: { username: forjado },
      });
      expect(refresh.statusCode).toBeGreaterThanOrEqual(400);
      // Sentinela DEPOIS do refresh: quando ela aparece, a do refresh já teria aparecido.
      const tentativa = await inject(app, {
        method: 'POST',
        url: '/api/auth/login',
        headers: { 'content-type': 'application/json' },
        payload: { username: forjado, password: 'senha-errada-123' },
      });
      expect(tentativa.statusCode).toBe(401);
      await vi.waitFor(
        async () => {
          const n = await prisma.waAuditLog.count({
            where: { createdAt: { gte: inicio }, actor: `login:${forjado}` },
          });
          expect(n).toBeGreaterThanOrEqual(1);
        },
        { timeout: 5_000, interval: 50 },
      );
      const linhas = await prisma.waAuditLog.findMany({
        where: { createdAt: { gte: inicio }, actor: `login:${forjado}` },
      });
      expect(linhas).toHaveLength(1);
      expect(linhas[0]).toMatchObject({
        method: 'POST',
        path: '/api/auth/login',
        statusCode: 401,
      });
    });

    it('GET /api/sessions expõe lastMeJid (aditivo); updateStatus grava e mantém depois do meJid null', async () => {
      const s = await seed();
      await repo.updateStatus(s.id, 'WORKING', {
        meJid: `${ESPERADO}:9@s.whatsapp.net`,
      });
      await repo.updateStatus(s.id, 'STOPPED', { meJid: null });

      const list = await inject(app, {
        method: 'GET',
        url: '/api/sessions',
        headers: auth(),
      });
      expect(list.statusCode).toBe(200);
      const dto = (list.json() as Array<Record<string, unknown>>).find(
        (d) => d.id === s.id,
      );
      expect(dto).toMatchObject({
        meJid: null,
        lastMeJid: `${ESPERADO}:9@s.whatsapp.net`,
      });
      const one = await inject(app, {
        method: 'GET',
        url: `/api/sessions/${s.name}`,
        headers: auth(),
      });
      expect(one.json().lastMeJid).toBe(`${ESPERADO}:9@s.whatsapp.net`);
    });
  });
});
