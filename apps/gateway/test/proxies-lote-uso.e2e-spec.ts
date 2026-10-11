import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { newId } from '../src/shared-kernel/ulid';
import { createTestApp, inject, login } from './setup-app';

// E28 · P-107 · D-051 — de ponta a ponta com Postgres real (R6):
// - GET /api/proxies traz `sessionCount`/`sessions` pela régua do "em uso" (D-008: currentProxyId de
//   atribuição mode ≠ NONE de sessão viva; RANGE/GLOBAL contam pela afinidade);
// - `allowSharedProxy` (opt-in) no POST /api/sessions e no PUT SINGLE aceita proxy de outra sessão;
//   sem ele a exclusividade continua (400 "em uso"); nunca libera desabilitado/DEAD;
// - POST /api/proxies/bulk-delete apaga vários de uma vez, 200 com {deleted, notFound}, ADMIN.
// SessionManager é o fake do setup-app (start no-op): nenhuma engine/conta/rede. Nomes únicos por
// execução (RUN); a limpeza é pelo PREFIXO (recupera sobras de uma execução interrompida).
describe('Proxies em lote e uso por proxy (e2e, E28)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let operatorToken: string;

  const inicio = new Date();
  const RUN = Date.now().toString(36);
  const PREFIX = 'e2e-lote-';
  const HOST = `${PREFIX}${RUN}.test`;
  const OPERATOR = `${PREFIX}${RUN}-op`;
  const n = (suffix: string) => `${PREFIX}${RUN}-${suffix}`;
  const ADMIN_ACTOR = 'admin (OWNER)';
  let port = 23000;

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
    return res.json().id as string;
  }

  async function createSession(
    suffix: string,
    payload: Record<string, unknown> = {},
  ) {
    return inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: jsonAuth(),
      payload: { name: n(suffix), ...payload },
    });
  }

  async function putProxy(sessionId: string, payload: Record<string, unknown>) {
    return inject(app, {
      method: 'PUT',
      url: `/api/sessions/${sessionId}/proxy`,
      headers: jsonAuth(),
      payload,
    });
  }

  type Item = {
    id: string;
    sessionCount: number;
    sessions: Array<{ id: string; name: string }>;
  };
  async function listed(id: string): Promise<Item | undefined> {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/proxies',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    return (res.json() as Item[]).find((p) => p.id === id);
  }

  async function bulkDelete(payload: unknown, headers = jsonAuth()) {
    return inject(app, {
      method: 'POST',
      url: '/api/proxies/bulk-delete',
      headers,
      payload,
    });
  }

  async function cleanupPrefix(): Promise<void> {
    const [sessions, proxies] = await Promise.all([
      prisma.waSession.findMany({
        where: { name: { startsWith: PREFIX } },
        select: { id: true },
      }),
      prisma.proxy.findMany({
        where: { host: { startsWith: PREFIX } },
        select: { id: true },
      }),
    ]);
    await prisma.sessionProxyAssignment.deleteMany({
      where: {
        OR: [
          { sessionId: { in: sessions.map((s) => s.id) } },
          { sessionId: { startsWith: PREFIX } },
          { currentProxyId: { in: proxies.map((p) => p.id) } },
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

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
    await cleanupPrefix();

    const user = await inject(app, {
      method: 'POST',
      url: '/api/users',
      headers: jsonAuth(),
      payload: {
        username: OPERATOR,
        name: 'Operator E28',
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

  afterAll(async () => {
    // A atribuição órfã criada à mão usa sessionId com o PREFIXO; o resto sai pelo nome/host.
    await cleanupPrefix();
    await prisma.waAuditLog.deleteMany({
      where: {
        createdAt: { gte: inicio },
        OR: [
          { path: { contains: PREFIX } },
          { actor: { contains: PREFIX } },
          {
            path: {
              in: [
                '/api/sessions',
                '/api/proxies',
                '/api/proxies/bulk-delete',
                '/api/users',
              ],
            },
            actor: { in: [ADMIN_ACTOR, `${OPERATOR} (OPERATOR)`] },
          },
        ],
      },
    });
    await app.close();
  });

  describe('uso por proxy + compartilhamento opt-in', () => {
    let shared: string; // usado por 3 sessões ao fim
    let s1: string;
    let s2: string;
    let s3: string;

    beforeAll(async () => {
      shared = await mkProxy();
    });

    it('proxy sem sessão → sessionCount 0 e sessions [] (campos aditivos no GET /api/proxies)', async () => {
      const item = await listed(shared);
      expect(item).toMatchObject({ sessionCount: 0, sessions: [] });
      // o DTO de sempre continua lá (contrato aditivo)
      expect(item).toHaveProperty('position');
      expect(item).toHaveProperty('hasAuth', false);
      expect(item).not.toHaveProperty('password');
    });

    it('sessão criada com o proxy → contado com id e nome', async () => {
      const res = await createSession('zeta', { proxyId: shared });
      expect(res.statusCode).toBe(201);
      s1 = res.json().id as string;
      expect(await listed(shared)).toMatchObject({
        sessionCount: 1,
        sessions: [{ id: s1, name: n('zeta') }],
      });
    });

    it('sem allowSharedProxy a 2ª sessão com o mesmo proxy → 400 "em uso" e nenhuma sessão órfã (D-008)', async () => {
      const res = await createSession('sem-flag', { proxyId: shared });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('em uso');
      expect(
        await prisma.waSession.findUnique({ where: { name: n('sem-flag') } }),
      ).toBeNull();
    });

    it('allowSharedProxy:false se comporta como ausente (400)', async () => {
      const res = await createSession('flag-false', {
        proxyId: shared,
        allowSharedProxy: false,
      });
      expect(res.statusCode).toBe(400);
      expect(
        await prisma.waSession.findUnique({
          where: { name: n('flag-false') },
        }),
      ).toBeNull();
    });

    it('allowSharedProxy:true cria a 2ª sessão SINGLE/STICKY no mesmo proxy', async () => {
      const res = await createSession('alfa', {
        proxyId: shared,
        allowSharedProxy: true,
      });
      expect(res.statusCode).toBe(201);
      s2 = res.json().id as string;
      const a = await inject(app, {
        method: 'GET',
        url: `/api/sessions/${s2}/proxy`,
        headers: auth(),
      });
      expect(a.json()).toMatchObject({
        mode: 'SINGLE',
        strategy: 'STICKY',
        currentProxyId: shared,
      });
      // ordem por nome: alfa antes de zeta
      expect(await listed(shared)).toMatchObject({
        sessionCount: 2,
        sessions: [
          { id: s2, name: n('alfa') },
          { id: s1, name: n('zeta') },
        ],
      });
    });

    it('/proxies/available continua escondendo o proxy em uso (semântica D-008 intacta)', async () => {
      const res = await inject(app, {
        method: 'GET',
        url: '/api/proxies/available',
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      const ids = (res.json() as Array<{ id: string }>).map((p) => p.id);
      expect(ids).not.toContain(shared);
    });

    it('PUT SINGLE de sessão existente: sem flag 400; com flag 200 e passa a contar', async () => {
      const res = await createSession('meio');
      expect(res.statusCode).toBe(201);
      s3 = res.json().id as string;

      const sem = await putProxy(s3, { mode: 'SINGLE', proxyId: shared });
      expect(sem.statusCode).toBe(400);
      expect(sem.json().message).toContain('em uso');
      const depoisDoNao = await prisma.sessionProxyAssignment.findUnique({
        where: { sessionId: s3 },
      });
      expect(depoisDoNao?.currentProxyId ?? null).toBeNull();

      const com = await putProxy(s3, {
        mode: 'SINGLE',
        proxyId: shared,
        allowSharedProxy: true,
      });
      expect(com.statusCode).toBe(200);
      expect(com.json()).toMatchObject({
        mode: 'SINGLE',
        currentProxyId: shared,
      });
      const item = await listed(shared);
      expect(item?.sessionCount).toBe(3);
      expect(item?.sessions.map((s) => s.name)).toEqual([
        n('alfa'),
        n('meio'),
        n('zeta'),
      ]);
    });

    it('PUT pelo NOME da sessão viva com a flag também grava (P-097 preservado)', async () => {
      const outro = await mkProxy();
      const res = await putProxy(n('meio'), {
        mode: 'SINGLE',
        proxyId: outro,
        allowSharedProxy: true,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        sessionId: s3,
        currentProxyId: outro,
      });
      expect((await listed(shared))?.sessionCount).toBe(2);
      expect(await listed(outro)).toMatchObject({
        sessionCount: 1,
        sessions: [{ id: s3, name: n('meio') }],
      });
    });

    // Revisão E28: depois de compartilhado, cada sessão continua podendo repetir o PRÓPRIO SINGLE
    // sem a flag ("repetir o próprio proxy é permitido") — não é compartilhar de novo.
    it('repetir o próprio SINGLE já compartilhado, sem a flag → 200 nas duas sessões', async () => {
      for (const sid of [s1, s2]) {
        const res = await putProxy(sid, { mode: 'SINGLE', proxyId: shared });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toMatchObject({
          mode: 'SINGLE',
          currentProxyId: shared,
        });
      }
      expect((await listed(shared))?.sessionCount).toBe(2);
    });

    it('sessão em RANGE com afinidade no proxy compartilhado: passar a SINGLE nele exige a flag', async () => {
      const res = await createSession('faixa-vira-fixo');
      expect(res.statusCode).toBe(201);
      const sid = res.json().id as string;
      expect(
        (
          await putProxy(sid, {
            mode: 'RANGE',
            rangeStart: 1,
            rangeEnd: 999999,
          })
        ).statusCode,
      ).toBe(200);
      await prisma.sessionProxyAssignment.update({
        where: { sessionId: sid },
        data: { currentProxyId: shared },
      });
      const sem = await putProxy(sid, { mode: 'SINGLE', proxyId: shared });
      expect(sem.statusCode).toBe(400);
      expect(sem.json().message).toContain('em uso');
      const com = await putProxy(sid, {
        mode: 'SINGLE',
        proxyId: shared,
        allowSharedProxy: true,
      });
      expect(com.statusCode).toBe(200);
      // volta a NONE para não pesar na contagem dos próximos casos
      expect((await putProxy(sid, { mode: 'NONE' })).statusCode).toBe(200);
    });

    it('RANGE/GLOBAL ignoram allowSharedProxy (gravam o modo pedido)', async () => {
      const res = await createSession('faixa-com-flag');
      const sid = res.json().id as string;
      const range = await putProxy(sid, {
        mode: 'RANGE',
        rangeStart: 1,
        rangeEnd: 5,
        allowSharedProxy: true,
      });
      expect(range.statusCode).toBe(200);
      expect(range.json()).toMatchObject({ mode: 'RANGE', rangeStart: 1 });
      const global = await putProxy(sid, {
        mode: 'GLOBAL_ROUND_ROBIN',
        allowSharedProxy: true,
      });
      expect(global.statusCode).toBe(200);
      expect(global.json().mode).toBe('GLOBAL_ROUND_ROBIN');
    });

    it.each([
      ['desabilitado', 'desabilitado'],
      ['DEAD', 'DEAD'],
    ])(
      'allowSharedProxy não libera proxy %s (PUT e POST → 400, sem sessão órfã)',
      async (estado, mensagem) => {
        const px = await mkProxy();
        if (estado === 'desabilitado') {
          const dis = await inject(app, {
            method: 'POST',
            url: `/api/proxies/${px}/disable`,
            headers: auth(),
          });
          expect(dis.statusCode).toBe(201);
        } else {
          await prisma.proxy.update({
            where: { id: px },
            data: { status: 'DEAD' },
          });
        }
        const put = await putProxy(s1, {
          mode: 'SINGLE',
          proxyId: px,
          allowSharedProxy: true,
        });
        expect(put.statusCode).toBe(400);
        expect(put.json().message).toContain(mensagem);

        const post = await createSession(`inelegivel-${estado}`, {
          proxyId: px,
          allowSharedProxy: true,
        });
        expect(post.statusCode).toBe(400);
        expect(
          await prisma.waSession.findUnique({
            where: { name: n(`inelegivel-${estado}`) },
          }),
        ).toBeNull();
      },
    );

    it('allowSharedProxy não-booleano → 400 no PUT e no POST (sem sessão órfã)', async () => {
      const res = await putProxy(s1, {
        mode: 'SINGLE',
        proxyId: shared,
        allowSharedProxy: 'sim',
      });
      expect(res.statusCode).toBe(400);
      const post = await createSession('flag-texto', {
        proxyId: shared,
        allowSharedProxy: 'sim',
      });
      expect(post.statusCode).toBe(400);
      expect(
        await prisma.waSession.findUnique({ where: { name: n('flag-texto') } }),
      ).toBeNull();
    });

    it('régua do "em uso": RANGE conta pela afinidade; NONE com sobra e atribuição órfã não contam', async () => {
      const px = await mkProxy();
      const range = await createSession('faixa');
      const none = await createSession('nenhum');
      expect(range.statusCode).toBe(201);
      expect(none.statusCode).toBe(201);
      const rangeId = range.json().id as string;
      const noneId = none.json().id as string;

      expect(
        (
          await putProxy(rangeId, {
            mode: 'RANGE',
            rangeStart: 1,
            rangeEnd: 999999,
          })
        ).statusCode,
      ).toBe(200);
      // afinidade gravada pelo resolver em runtime (D-041) — aqui direto no banco
      await prisma.sessionProxyAssignment.update({
        where: { sessionId: rangeId },
        data: { currentProxyId: px },
      });
      expect((await putProxy(noneId, { mode: 'NONE' })).statusCode).toBe(200);
      await prisma.sessionProxyAssignment.update({
        where: { sessionId: noneId },
        data: { currentProxyId: px },
      });
      // atribuição de sessão que não existe mais (sem FK) apontando para o proxy
      await prisma.sessionProxyAssignment.create({
        data: {
          sessionId: `${PREFIX}${RUN}-orfa-${newId()}`,
          mode: 'SINGLE',
          strategy: 'STICKY',
          currentProxyId: px,
        },
      });

      expect(await listed(px)).toMatchObject({
        sessionCount: 1,
        sessions: [{ id: rangeId, name: n('faixa') }],
      });
    });
  });

  describe('POST /api/proxies/bulk-delete', () => {
    it('sem autenticação → 401', async () => {
      const res = await inject(app, {
        method: 'POST',
        url: '/api/proxies/bulk-delete',
        headers: { 'content-type': 'application/json' },
        payload: { ids: ['x'] },
      });
      expect(res.statusCode).toBe(401);
    });

    it('OPERATOR → 403 e nada é apagado (rota é ADMIN)', async () => {
      const px = await mkProxy();
      const res = await bulkDelete({ ids: [px] }, jsonAuth(operatorToken));
      expect(res.statusCode).toBe(403);
      expect(
        await prisma.proxy.findUnique({ where: { id: px } }),
      ).not.toBeNull();
    });

    it.each([
      ['lista vazia', { ids: [] }],
      ['sem ids', {}],
      ['ids não é lista', { ids: 'abc' }],
      ['id vazio', { ids: [''] }],
      ['id longo demais', { ids: ['x'.repeat(65)] }],
      [
        'id com byte NUL (o Postgres recusaria → seria 500)',
        { ids: ['\u0000'] },
      ],
      ['id com espaço', { ids: ['a b'] }],
      [
        'acima do teto',
        { ids: Array.from({ length: 1001 }, (_, i) => `id${i}`) },
      ],
    ])('%s → 400', async (_label, payload) => {
      const res = await bulkDelete(payload);
      expect(res.statusCode).toBe(400);
    });

    it('apaga os marcados (200, não 201), ignora repetidos, devolve inexistentes e preserva o resto', async () => {
      const a = await mkProxy();
      const b = await mkProxy();
      const fica = await mkProxy();

      const res = await bulkDelete({ ids: [a, 'nao-existe', b, a] });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ deleted: 2, notFound: ['nao-existe'] });
      const restantes = await prisma.proxy.findMany({
        where: { id: { in: [a, b, fica] } },
        select: { id: true },
      });
      expect(restantes.map((p) => p.id)).toEqual([fica]);
      expect(await listed(a)).toBeUndefined();
      expect(await listed(fica)).toBeDefined();
    });

    it('repetir o mesmo lote (outra aba) → 200 com tudo em notFound', async () => {
      const a = await mkProxy();
      expect((await bulkDelete({ ids: [a] })).json()).toEqual({
        deleted: 1,
        notFound: [],
      });
      const again = await bulkDelete({ ids: [a] });
      expect(again.statusCode).toBe(200);
      expect(again.json()).toEqual({ deleted: 0, notFound: [a] });
    });

    // Revisão E28: o lote trava as linhas (FOR UPDATE) e só então lê quem usa — quem gravou uma
    // atribuição segurando o lock do proxy aparece no aviso. Sem o lock (ou lendo o uso antes),
    // o lote leria a foto velha e o aviso sairia sem a sessão.
    it('lote espera quem segura o lock do proxy e o aviso enxerga a atribuição gravada nesse meio', async () => {
      const px = await mkProxy();
      const s = await createSession('trava');
      expect(s.statusCode).toBe(201);
      const sid = s.json().id as string;
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      let release!: () => void;
      const released = new Promise<void>((r) => (release = r));
      let markLocked!: () => void;
      const locked = new Promise<void>((r) => (markLocked = r));
      const holder = prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM proxies WHERE id = ${px} FOR UPDATE`;
          markLocked();
          await released;
          await tx.sessionProxyAssignment.create({
            data: {
              sessionId: sid,
              mode: 'SINGLE',
              strategy: 'STICKY',
              currentProxyId: px,
            },
          });
        },
        { timeout: 20_000 },
      );
      try {
        await locked;
        let settled = false;
        const pending = bulkDelete({ ids: [px] }).then((r) => {
          settled = true;
          return r;
        });
        await new Promise((r) => setTimeout(r, 500));
        expect(settled).toBe(false); // esperando o lock
        expect(
          await prisma.proxy.findUnique({ where: { id: px } }),
        ).not.toBeNull();
        release();
        await holder;
        const res = await pending;
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ deleted: 1, notFound: [] });
        const msgs = warn.mock.calls.map((c) => String(c[0]));
        expect(
          msgs.some(
            (m) => m.includes('apagou proxy em uso') && m.includes(n('trava')),
          ),
        ).toBe(true);
      } finally {
        release();
        await holder.catch(() => undefined);
        warn.mockRestore();
      }
    });

    it('apagar proxy em uso: a atribuição da sessão fica pendurada (sem FK) e o PUT nele passa a 400', async () => {
      const px = await mkProxy();
      const s = await createSession('perde-proxy', { proxyId: px });
      expect(s.statusCode).toBe(201);
      const sid = s.json().id as string;

      const res = await bulkDelete({ ids: [px] });
      expect(res.json()).toEqual({ deleted: 1, notFound: [] });

      // a sessão continua viva e a atribuição SINGLE continua apontando para o id apagado — no
      // próximo connect o resolver falha explicitamente (E15), como no DELETE unitário
      const a = await prisma.sessionProxyAssignment.findUnique({
        where: { sessionId: sid },
      });
      expect(a).toMatchObject({ mode: 'SINGLE', currentProxyId: px });
      expect(
        await prisma.waSession.findUnique({ where: { id: sid } }),
      ).not.toBeNull();

      const put = await putProxy(sid, {
        mode: 'SINGLE',
        proxyId: px,
        allowSharedProxy: true,
      });
      expect(put.statusCode).toBe(400);
      expect(put.json().message).toContain('não encontrado');
    });
  });
});
