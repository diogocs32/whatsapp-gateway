import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { createTestApp, inject, login } from './setup-app';

// D-008 — escolha de proxy livre na criação de sessão: GET /proxies/available lista só os
// livres (enabled, não-DEAD, sem sessão usando) e POST /sessions aceita proxyId opcional,
// nascendo com atribuição SINGLE/STICKY exclusiva (2ª sessão com o mesmo proxy → 400 sem
// deixar sessão órfã).

describe('Proxy na criação de sessão (e2e, D-008)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let prisma: PrismaService;
  let proxyA: string; // livre
  let proxyB: string; // desabilitado (não pode aparecer em available)

  const HOST = 'e2e-proxy-create.test';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);

    const mk = async (port: number) => {
      const res = await inject(app, {
        method: 'POST',
        url: '/api/proxies',
        headers: jsonAuth(),
        payload: { host: HOST, port, protocol: 'HTTP' },
      });
      expect(res.statusCode).toBe(201);
      return res.json().id as string;
    };
    proxyA = await mk(18080);
    proxyB = await mk(18081);
    const dis = await inject(app, {
      method: 'POST',
      url: `/api/proxies/${proxyB}/disable`,
      headers: auth(),
    });
    expect(dis.statusCode).toBe(201);
  });

  afterAll(async () => {
    const sessions = await prisma.waSession.findMany({
      where: { name: { startsWith: 'e2e-pxs-' } },
      select: { id: true },
    });
    await prisma.sessionProxyAssignment.deleteMany({
      where: { sessionId: { in: sessions.map((s) => s.id) } },
    });
    await prisma.waSession.deleteMany({
      where: { name: { startsWith: 'e2e-pxs-' } },
    });
    await prisma.proxy.deleteMany({ where: { host: HOST } });
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });
  const jsonAuth = () => ({ ...auth(), 'content-type': 'application/json' });

  it('GET /api/proxies/available lista o livre e esconde o desabilitado', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/proxies/available',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const ids = (res.json() as Array<{ id: string }>).map((p) => p.id);
    expect(ids).toContain(proxyA);
    expect(ids).not.toContain(proxyB);
  });

  it('cria sessão COM proxyId → nasce com atribuição SINGLE/STICKY e o proxy sai dos livres', async () => {
    const create = await inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: jsonAuth(),
      payload: { name: 'e2e-pxs-com-proxy', proxyId: proxyA },
    });
    expect(create.statusCode).toBe(201);
    const sessionId = create.json().id as string;

    const assignment = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}/proxy`,
      headers: auth(),
    });
    expect(assignment.statusCode).toBe(200);
    expect(assignment.json()).toMatchObject({
      mode: 'SINGLE',
      strategy: 'STICKY',
      currentProxyId: proxyA,
    });

    const available = await inject(app, {
      method: 'GET',
      url: '/api/proxies/available',
      headers: auth(),
    });
    const ids = (available.json() as Array<{ id: string }>).map((p) => p.id);
    expect(ids).not.toContain(proxyA);
  });

  it('2ª sessão com o MESMO proxy → 400 "em uso" e a sessão NÃO fica criada', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: jsonAuth(),
      payload: { name: 'e2e-pxs-duplicada', proxyId: proxyA },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('em uso');

    const orphan = await prisma.waSession.findUnique({
      where: { name: 'e2e-pxs-duplicada' },
    });
    expect(orphan).toBeNull();
  });

  it('proxyId inexistente → 400 sem criar sessão', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: jsonAuth(),
      payload: { name: 'e2e-pxs-inexistente', proxyId: 'nao-existe' },
    });
    expect(res.statusCode).toBe(400);
    const orphan = await prisma.waSession.findUnique({
      where: { name: 'e2e-pxs-inexistente' },
    });
    expect(orphan).toBeNull();
  });

  it('sessão SEM proxyId continua nascendo sem atribuição (comportamento antigo intacto)', async () => {
    const create = await inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: jsonAuth(),
      payload: { name: 'e2e-pxs-sem-proxy' },
    });
    expect(create.statusCode).toBe(201);
    const sessionId = create.json().id as string;

    const assignment = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}/proxy`,
      headers: auth(),
    });
    expect(assignment.json().mode).toBe('NONE');
  });
});
