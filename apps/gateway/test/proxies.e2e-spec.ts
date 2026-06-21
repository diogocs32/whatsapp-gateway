import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { createTestApp, inject, login } from './setup-app';

describe('Proxies (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let prisma: PrismaService;
  const sessionId = 'e2e-proxy-session';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
  });
  afterAll(async () => {
    await prisma.sessionProxyAssignment.deleteMany({ where: { sessionId } });
    await prisma.proxy.deleteMany({
      where: { host: { contains: 'e2e-proxy' } },
    });
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });
  const jsonAuth = () => ({ ...auth(), 'content-type': 'application/json' });

  it('GET /api/proxies sem auth → 401', async () => {
    const res = await inject(app, { method: 'GET', url: '/api/proxies' });
    expect(res.statusCode).toBe(401);
  });

  it('porta inválida → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/proxies',
      headers: jsonAuth(),
      payload: { host: 'e2e-proxy.test', port: 999999 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('cria proxy → 201, não vaza a senha, recebe posição e aparece na listagem', async () => {
    const create = await inject(app, {
      method: 'POST',
      url: '/api/proxies',
      headers: jsonAuth(),
      payload: {
        host: 'e2e-proxy.test',
        port: 8080,
        protocol: 'SOCKS5',
        username: 'usuario',
        password: 'senha-super-secreta-123',
      },
    });
    expect(create.statusCode).toBe(201);
    const dto = create.json();
    expect(dto.hasAuth).toBe(true);
    expect(typeof dto.position).toBe('number');
    expect(dto.status).toBe('UNTESTED');
    expect(JSON.stringify(dto)).not.toContain('senha-super-secreta-123');

    const list = await inject(app, {
      method: 'GET',
      url: '/api/proxies',
      headers: auth(),
    });
    expect(list.json().some((p: { id: string }) => p.id === dto.id)).toBe(true);
  });

  it('assignment RANGE sem rangeEnd → 400', async () => {
    const res = await inject(app, {
      method: 'PUT',
      url: `/api/sessions/${sessionId}/proxy`,
      headers: jsonAuth(),
      payload: { mode: 'RANGE', rangeStart: 1 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('assignment SINGLE sem proxyId → 400', async () => {
    const res = await inject(app, {
      method: 'PUT',
      url: `/api/sessions/${sessionId}/proxy`,
      headers: jsonAuth(),
      payload: { mode: 'SINGLE' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('define assignment RANGE válido e lê de volta', async () => {
    const set = await inject(app, {
      method: 'PUT',
      url: `/api/sessions/${sessionId}/proxy`,
      headers: jsonAuth(),
      payload: {
        mode: 'RANGE',
        rangeStart: 1,
        rangeEnd: 10,
        strategy: 'ROUND_ROBIN',
      },
    });
    expect(set.statusCode).toBe(200);
    expect(set.json().mode).toBe('RANGE');

    const get = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}/proxy`,
      headers: auth(),
    });
    const dto = get.json();
    expect(dto.mode).toBe('RANGE');
    expect(dto.rangeStart).toBe(1);
    expect(dto.rangeEnd).toBe(10);
    expect(dto.strategy).toBe('ROUND_ROBIN');
  });
});
