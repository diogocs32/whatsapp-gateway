import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import {
  PROXY_REPOSITORY,
  type ProxyRepository,
} from '../src/modules/proxies/domain/proxy.repository';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from '../src/modules/sessions/domain/session.repository';
import { createTestApp, fakeSessionManager, inject, login } from './setup-app';

// E26 · P-084 · D-038 — sugerir o proxy da sessão apagada ao recriar com o mesmo nome, de ponta a
// ponta (R6): DELETE /api/sessions/:id carimba a atribuição SINGLE órfã (releasedSessionName/
// releasedAt) DEPOIS de apagar e GET /api/proxies/suggestion?sessionName= devolve o proxy e se ele
// ainda pode ser escolhido. Postgres real; o SessionManager é o fake do setup-app, mas com `remove`
// que apaga de verdade a linha de wa_sessions (o fake padrão é no-op e a sessão continuaria "viva").
// Nomes únicos por execução (RUN) — o spec não depende de execução anterior.
describe('Sugestão de proxy ao recriar sessão com o mesmo nome (e2e, E26)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let sessionRepo: SessionRepository;
  let proxyRepo: ProxyRepository;
  let token: string;
  let operatorToken: string;

  const inicio = new Date();
  const RUN = Date.now().toString(36);
  const PREFIX = 'e2e-sug-';
  const HOST = `${PREFIX}${RUN}.test`;
  const OPERATOR = `${PREFIX}${RUN}-op`;
  const n = (suffix: string) => `${PREFIX}${RUN}-${suffix}`;
  // Ator do admin do fixture (login(app)) na auditoria.
  const ADMIN_ACTOR = 'admin (OWNER)';

  // Ids criados pelo spec — a limpeza apaga também as órfãs SEM carimbo (NONE/RANGE/falha).
  const sessionIds = new Set<string>();
  const proxyIds = new Set<string>();
  let port = 21000;

  const manager = {
    ...fakeSessionManager,
    remove: async (id: string) => {
      await sessionRepo.delete(id);
    },
  };

  beforeAll(async () => {
    app = await createTestApp(manager);
    prisma = app.get(PrismaService);
    sessionRepo = app.get<SessionRepository>(SESSION_REPOSITORY);
    proxyRepo = app.get<ProxyRepository>(PROXY_REPOSITORY);
    token = await login(app);

    await cleanupPrefix();
    const user = await inject(app, {
      method: 'POST',
      url: '/api/users',
      headers: jsonAuth(),
      payload: {
        username: OPERATOR,
        name: 'Operator E26',
        password: 'senha-operator-123',
        role: 'OPERATOR',
      },
    });
    expect(user.statusCode).toBe(201);
    const opLogin = await inject(app, {
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: { username: OPERATOR, password: 'senha-operator-123' },
    });
    operatorToken = opLogin.json().token as string;
    expect(operatorToken).toBeTruthy();
  });

  // Limpeza pelo PREFIXO (não pelo RUN): recupera sobras de uma execução interrompida (Ctrl+C,
  // hookTimeout) — o banco é o mesmo do `npm run dev`. A invariante D-038 (nada limpa as órfãs
  // carimbadas) vale para produção, não para o teste.
  async function cleanupPrefix(): Promise<void> {
    const [live, stale] = await Promise.all([
      prisma.waSession.findMany({
        where: { name: { startsWith: PREFIX } },
        select: { id: true },
      }),
      prisma.proxy.findMany({
        where: { host: { startsWith: PREFIX } },
        select: { id: true },
      }),
    ]);
    for (const s of live) sessionIds.add(s.id);
    await prisma.sessionProxyAssignment.deleteMany({
      where: {
        OR: [
          { sessionId: { in: [...sessionIds] } },
          { releasedSessionName: { startsWith: PREFIX } },
          { currentProxyId: { in: stale.map((p) => p.id) } },
        ],
      },
    });
    await prisma.waSession.deleteMany({
      where: { name: { startsWith: PREFIX } },
    });
    await prisma.proxy.deleteMany({ where: { host: { startsWith: PREFIX } } });
    await prisma.user.deleteMany({
      where: { username: { startsWith: PREFIX } },
    });
  }

  afterAll(async () => {
    await cleanupPrefix();
    const ids = [...sessionIds, ...proxyIds];
    // Só a trilha deste spec (atores do teste, na janela da execução) — o dono pode estar usando o
    // painel local ao mesmo tempo.
    await prisma.waAuditLog.deleteMany({
      where: {
        createdAt: { gte: inicio },
        OR: [
          { path: { contains: PREFIX } },
          { actor: { contains: PREFIX } },
          ...ids.map((id) => ({ path: { contains: id } })),
          {
            path: { in: ['/api/sessions', '/api/proxies', '/api/users'] },
            actor: { in: [ADMIN_ACTOR, `${OPERATOR} (OPERATOR)`] },
          },
        ],
      },
    });
    await app.close();
  });

  function auth(bearer = token) {
    return { authorization: `Bearer ${bearer}` };
  }
  function jsonAuth(bearer = token) {
    return { ...auth(bearer), 'content-type': 'application/json' };
  }

  async function mkProxy(): Promise<string> {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/proxies',
      headers: jsonAuth(),
      payload: { host: HOST, port: port++, protocol: 'HTTP' },
    });
    expect(res.statusCode).toBe(201);
    const id = res.json().id as string;
    proxyIds.add(id);
    return id;
  }

  async function createSession(name: string, proxyId?: string) {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: jsonAuth(),
      payload: proxyId ? { name, proxyId } : { name },
    });
    expect(res.statusCode).toBe(201);
    const id = res.json().id as string;
    sessionIds.add(id);
    return id;
  }

  function deleteSession(ref: string) {
    return inject(app, {
      method: 'DELETE',
      url: `/api/sessions/${ref}`,
      headers: auth(),
    });
  }

  async function createAndDelete(name: string, proxyId: string) {
    const id = await createSession(name, proxyId);
    const del = await deleteSession(name);
    expect(del.statusCode).toBe(200);
    return id;
  }

  function putAssignment(sessionId: string, payload: unknown) {
    return inject(app, {
      method: 'PUT',
      url: `/api/sessions/${sessionId}/proxy`,
      headers: jsonAuth(),
      payload,
    });
  }

  function suggest(name: string, headers: Record<string, string> = auth()) {
    return inject(app, {
      method: 'GET',
      url: `/api/proxies/suggestion?sessionName=${encodeURIComponent(name)}`,
      headers,
    });
  }

  async function suggestion(name: string) {
    const res = await suggest(name);
    expect(res.statusCode).toBe(200);
    return res.json().suggestion as {
      proxy: { id: string; host: string } | null;
      fromSession: string;
      releasedAt: string;
      available: boolean;
      reason: string | null;
      inUseBySession: string | null;
    } | null;
  }

  const row = (sessionId: string) =>
    prisma.sessionProxyAssignment.findUnique({ where: { sessionId } });

  describe('carimbo no DELETE /api/sessions/:id', () => {
    it('sessão SINGLE apagada → carimba releasedSessionName (nome exato) e releasedAt, preservando o proxy', async () => {
      const proxyId = await mkProxy();
      const name = n('Carimbo');
      const id = await createSession(name, proxyId);

      const before = Date.now();
      const del = await deleteSession(name);
      const after = Date.now();
      expect(del.statusCode).toBe(200);
      expect(del.json()).toEqual({ ok: true });

      expect(await prisma.waSession.findUnique({ where: { id } })).toBeNull();
      const r = await row(id);
      expect(r).toMatchObject({
        mode: 'SINGLE',
        currentProxyId: proxyId,
        releasedSessionName: name,
      });
      expect(r?.releasedAt).toBeInstanceOf(Date);
      expect(r!.releasedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(r!.releasedAt!.getTime()).toBeLessThanOrEqual(after);
    });

    it('sessão SEM proxy apagada → não há atribuição nem carimbo', async () => {
      const name = n('sem-proxy');
      const id = await createSession(name);
      expect((await deleteSession(name)).statusCode).toBe(200);

      expect(await row(id)).toBeNull();
      expect(
        await prisma.sessionProxyAssignment.count({
          where: { releasedSessionName: name },
        }),
      ).toBe(0);
      expect(await suggestion(name)).toBeNull();
    });

    it('sessão com mode NONE apagada → órfã sem carimbo e sem sugestão', async () => {
      const proxyId = await mkProxy();
      const name = n('modo-none');
      const id = await createSession(name, proxyId);
      const put = await putAssignment(id, { mode: 'NONE' });
      expect(put.statusCode).toBe(200);
      expect(put.json()).toMatchObject({ mode: 'NONE', currentProxyId: null });

      expect((await deleteSession(name)).statusCode).toBe(200);
      const r = await row(id);
      expect(r).toMatchObject({ mode: 'NONE', releasedSessionName: null });
      expect(r?.releasedAt).toBeNull();
      expect(await suggestion(name)).toBeNull();
    });

    it('sessão RANGE apagada (mesmo com currentProxyId herdado) → órfã sem carimbo e sem sugestão', async () => {
      const proxyId = await mkProxy();
      const name = n('modo-range');
      const id = await createSession(name, proxyId);
      const put = await putAssignment(id, {
        mode: 'RANGE',
        rangeStart: 1,
        rangeEnd: 10,
        strategy: 'ROUND_ROBIN',
      });
      expect(put.statusCode).toBe(200);
      expect(put.json().mode).toBe('RANGE');

      expect((await deleteSession(name)).statusCode).toBe(200);
      const r = await row(id);
      // RANGE não zera o currentProxyId (o resolver decide em runtime) — o filtro é o mode.
      expect(r).toMatchObject({
        mode: 'RANGE',
        currentProxyId: proxyId,
        releasedSessionName: null,
      });
      expect(await suggestion(name)).toBeNull();
    });

    it('exclusão que FALHA (manager.remove lança) → sessão segue viva e nada é carimbado', async () => {
      const proxyId = await mkProxy();
      const name = n('remove-falha');
      const id = await createSession(name, proxyId);
      const spy = vi
        .spyOn(manager, 'remove')
        .mockRejectedValueOnce(new Error('falha simulada no remove'));
      try {
        const del = await deleteSession(name);
        expect(del.statusCode).toBe(500);
      } finally {
        spy.mockRestore();
      }
      expect(
        await prisma.waSession.findUnique({ where: { id } }),
      ).not.toBeNull();
      expect(await row(id)).toMatchObject({
        mode: 'SINGLE',
        releasedSessionName: null,
        releasedAt: null,
      });
      expect(await suggestion(name)).toBeNull();
    });

    it('falha no carimbo (repo.markReleased rejeita) NÃO bloqueia o DELETE → 200 e sessão apagada', async () => {
      const proxyId = await mkProxy();
      const name = n('carimbo-falha');
      const id = await createSession(name, proxyId);
      const spy = vi
        .spyOn(proxyRepo, 'markReleased')
        .mockRejectedValueOnce(new Error('banco fora do ar (simulado)'));
      try {
        const del = await deleteSession(name);
        expect(del.statusCode).toBe(200);
        expect(del.json()).toEqual({ ok: true });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(id, name, expect.any(Date));
      } finally {
        spy.mockRestore();
      }
      expect(await prisma.waSession.findUnique({ where: { id } })).toBeNull();
      expect(await row(id)).toMatchObject({ releasedSessionName: null });
      expect(await suggestion(name)).toBeNull();
    });
  });

  describe('GET /api/proxies/suggestion', () => {
    it('devolve o proxy da sessão apagada com esse nome, disponível', async () => {
      const proxyId = await mkProxy();
      const name = n('basica');
      const id = await createAndDelete(name, proxyId);
      const r = await row(id);

      const s = await suggestion(name);
      expect(s).toEqual({
        proxy: expect.objectContaining({
          id: proxyId,
          host: HOST,
          enabled: true,
        }),
        fromSession: name,
        releasedAt: r!.releasedAt!.toISOString(),
        available: true,
        reason: null,
        inUseBySession: null,
      });
      // O DTO do proxy é o público (sem senha/usuário).
      expect(s!.proxy).not.toHaveProperty('password');
      // Espaços nas bordas são aparados pela validação.
      expect((await suggestion(`  ${name} `))?.proxy?.id).toBe(proxyId);
    });

    it('caixa diferente (pedido em MAIÚSCULAS) → mesma sugestão, fromSession com o nome original', async () => {
      const proxyId = await mkProxy();
      const name = n('Caixa-Mista');
      const id = await createAndDelete(name, proxyId);
      const r = await row(id);

      const s = await suggestion(name.toUpperCase());
      expect(s).toMatchObject({
        proxy: { id: proxyId },
        fromSession: name,
        releasedAt: r!.releasedAt!.toISOString(),
        available: true,
        reason: null,
      });
      expect((await suggestion(name.toLowerCase()))?.proxy?.id).toBe(proxyId);
    });

    it('entre nomes que só diferem na caixa, prefere a caixa idêntica; sem idêntica, a mais recente', async () => {
      const p1 = await mkProxy();
      const p2 = await mkProxy();
      const upper = n('Preferida');
      const lower = n('preferida');
      await createAndDelete(upper, p1); // mais antiga
      await createAndDelete(lower, p2); // mais recente

      expect(await suggestion(upper)).toMatchObject({
        proxy: { id: p1 },
        fromSession: upper,
      });
      expect(await suggestion(lower)).toMatchObject({
        proxy: { id: p2 },
        fromSession: lower,
      });
      expect(await suggestion(upper.toUpperCase())).toMatchObject({
        proxy: { id: p2 },
        fromSession: lower,
      });
    });

    it('sem curinga: apagar "…-a-1" e pedir "…-a_1" → {suggestion: null}', async () => {
      const proxyId = await mkProxy();
      const deleted = n('a-1');
      await createAndDelete(deleted, proxyId);

      expect((await suggestion(deleted))?.proxy?.id).toBe(proxyId);
      const res = await suggest(n('a_1'));
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ suggestion: null });
    });

    it('duas exclusões seguidas do mesmo nome com proxies diferentes → a mais recente', async () => {
      const p1 = await mkProxy();
      const p2 = await mkProxy();
      const name = n('duas-vezes');
      await createAndDelete(name, p1);
      const id2 = await createAndDelete(name, p2);
      const r2 = await row(id2);

      expect(await suggestion(name)).toMatchObject({
        proxy: { id: p2 },
        fromSession: name,
        releasedAt: r2!.releasedAt!.toISOString(),
        available: true,
      });
    });

    it('IN_USE: outra sessão viva criada com o proxy sugerido → available:false e inUseBySession', async () => {
      const proxyId = await mkProxy();
      const name = n('em-uso');
      await createAndDelete(name, proxyId);
      // A órfã não segura o proxy (D-008): outra sessão pode pegá-lo.
      const other = n('em-uso-outra');
      await createSession(other, proxyId);

      expect(await suggestion(name)).toEqual({
        proxy: expect.objectContaining({ id: proxyId }),
        fromSession: name,
        releasedAt: expect.any(String),
        available: false,
        reason: 'IN_USE',
        inUseBySession: other,
      });
    });

    it('DEAD: proxy sugerido marcado DEAD → available:false, reason DEAD', async () => {
      const proxyId = await mkProxy();
      const name = n('proxy-dead');
      await createAndDelete(name, proxyId);
      await prisma.proxy.update({
        where: { id: proxyId },
        data: { status: 'DEAD' },
      });

      expect(await suggestion(name)).toMatchObject({
        proxy: { id: proxyId, status: 'DEAD' },
        available: false,
        reason: 'DEAD',
        inUseBySession: null,
      });
    });

    it('DISABLED: proxy sugerido desabilitado → available:false, reason DISABLED', async () => {
      const proxyId = await mkProxy();
      const name = n('proxy-off');
      await createAndDelete(name, proxyId);
      const dis = await inject(app, {
        method: 'POST',
        url: `/api/proxies/${proxyId}/disable`,
        headers: auth(),
      });
      expect(dis.statusCode).toBe(201);

      expect(await suggestion(name)).toMatchObject({
        proxy: { id: proxyId, enabled: false },
        available: false,
        reason: 'DISABLED',
        inUseBySession: null,
      });
    });

    it('REMOVED: proxy sugerido excluído do pool → proxy null, reason REMOVED', async () => {
      const proxyId = await mkProxy();
      const name = n('proxy-removido');
      await createAndDelete(name, proxyId);
      const del = await inject(app, {
        method: 'DELETE',
        url: `/api/proxies/${proxyId}`,
        headers: auth(),
      });
      expect(del.statusCode).toBe(200);

      expect(await suggestion(name)).toEqual({
        proxy: null,
        fromSession: name,
        releasedAt: expect.any(String),
        available: false,
        reason: 'REMOVED',
        inUseBySession: null,
      });
    });

    it('PUT /api/sessions/<ULID apagado>/proxy numa órfã carimbada → 200, carimbo zerado e a sugestão some', async () => {
      const proxyId = await mkProxy();
      const name = n('put-orfa');
      const id = await createAndDelete(name, proxyId);
      expect((await suggestion(name))?.proxy?.id).toBe(proxyId);

      // Mesmo proxy e mesmo modo: só o carimbo zerado explica a sugestão sumir.
      const put = await putAssignment(id, { mode: 'SINGLE', proxyId });
      expect(put.statusCode).toBe(200);
      expect(await row(id)).toMatchObject({
        mode: 'SINGLE',
        currentProxyId: proxyId,
        releasedSessionName: null,
        releasedAt: null,
      });
      expect((await suggest(name)).json()).toEqual({ suggestion: null });
    });

    it('carimbo numa sessão AINDA viva é ignorado (só sessões que não existem mais)', async () => {
      const proxyId = await mkProxy();
      const id = await createSession(n('viva'), proxyId);
      const ghost = n('fantasma');
      await prisma.sessionProxyAssignment.update({
        where: { sessionId: id },
        data: { releasedSessionName: ghost, releasedAt: new Date() },
      });

      expect(await suggestion(ghost)).toBeNull();
    });

    it('nome sem histórico → {suggestion: null}', async () => {
      const res = await suggest(n('nunca-existiu'));
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ suggestion: null });
    });

    it('recriar com o proxy sugerido → 201; a linha antiga segue carimbada e a sugestão vira IN_USE pela própria sessão nova; apagar de novo volta a sugerir (a mais recente)', async () => {
      const proxyId = await mkProxy();
      const name = n('recriada');
      const oldId = await createAndDelete(name, proxyId);
      expect((await suggestion(name))?.available).toBe(true);

      const recreatedId = await createSession(name, proxyId);
      expect(recreatedId).not.toBe(oldId);
      // Comportamento real (documentado): a órfã antiga continua carimbada e continua sendo
      // encontrada (o filtro é "a sessão DAQUELA linha não existe"), e o dono do proxy agora é a
      // sessão recriada com o mesmo nome. O painel não consulta a sugestão quando já existe sessão
      // viva com o nome idêntico.
      expect(await row(oldId)).toMatchObject({ releasedSessionName: name });
      expect(await suggestion(name)).toMatchObject({
        proxy: { id: proxyId },
        fromSession: name,
        available: false,
        reason: 'IN_USE',
        inUseBySession: name,
      });

      expect((await deleteSession(name)).statusCode).toBe(200);
      const r = await row(recreatedId);
      expect(r).toMatchObject({ releasedSessionName: name });
      expect(await suggestion(name)).toMatchObject({
        proxy: { id: proxyId },
        releasedAt: r!.releasedAt!.toISOString(),
        available: true,
        reason: null,
        inUseBySession: null,
      });
    });
  });

  describe('validação e acesso', () => {
    it('sem sessionName → 400', async () => {
      const res = await inject(app, {
        method: 'GET',
        url: '/api/proxies/suggestion',
        headers: auth(),
      });
      expect(res.statusCode).toBe(400);
    });

    it.each([
      ['vazio', ''],
      ['só espaços', '   '],
      ['espaço no meio', 'e2e sug'],
      ['ponto', 'e2e.sug'],
      ['curinga %', 'e2e-sug-%'],
      ['barra', 'e2e/sug'],
      ['acima de 64', 'a'.repeat(65)],
    ])('sessionName inválido (%s) → 400', async (_label, value) => {
      const res = await suggest(value);
      expect(res.statusCode).toBe(400);
    });

    it('sessionName repetido na query (array) → 400', async () => {
      const res = await inject(app, {
        method: 'GET',
        url: `/api/proxies/suggestion?sessionName=${n('x')}&sessionName=${n('y')}`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(400);
    });

    it('sem login → 401', async () => {
      const res = await suggest(n('qualquer'), {});
      expect(res.statusCode).toBe(401);
    });

    it('OPERATOR → 403 (rota é ADMIN)', async () => {
      const res = await suggest(n('qualquer'), auth(operatorToken));
      expect(res.statusCode).toBe(403);
    });
  });
});
