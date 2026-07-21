import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { createTestApp, inject, login, readSetCookie } from './setup-app';

const CREDS = { username: 'admin', password: 'admin123' };

async function loginRaw(app: NestFastifyApplication) {
  return inject(app, {
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'content-type': 'application/json' },
    payload: CREDS,
  });
}

function refreshWith(app: NestFastifyApplication, rawRefresh: string) {
  return inject(app, {
    method: 'POST',
    url: '/api/auth/refresh',
    headers: { cookie: `refresh_token=${rawRefresh}` },
  });
}

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    // Cada teste começa sem refresh tokens de testes anteriores (famílias isoladas).
    await app.get(PrismaService).refreshToken.deleteMany({});
  });

  it('login com credenciais erradas → 401', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: { username: 'admin', password: 'errado' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('login correto → token; /me retorna o usuário', async () => {
    const token = await login(app);
    expect(typeof token).toBe('string');

    const me = await inject(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().username).toBe('admin');
  });

  it('/me sem token → 401', async () => {
    const res = await inject(app, { method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('login seta 2 cookies: token (Path=/) e refresh_token (Path=/api/auth), ambos HttpOnly', async () => {
    const res = await loginRaw(app);
    expect(res.statusCode).toBeLessThan(300);
    const cookies = ([] as string[]).concat(
      res.headers['set-cookie'] as string | string[],
    );
    expect(
      cookies.some(
        (c) =>
          /^token=/.test(c) && /HttpOnly/i.test(c) && /Path=\/(;|$)/.test(c),
      ),
    ).toBe(true);
    expect(
      cookies.some(
        (c) =>
          /^refresh_token=/.test(c) &&
          /HttpOnly/i.test(c) &&
          /Path=\/api\/auth(;|$)/.test(c),
      ),
    ).toBe(true);
  });

  it('refresh rotaciona: novo refresh != antigo e o antigo deixa de valer', async () => {
    const loginRes = await loginRaw(app);
    const rt1 = readSetCookie(loginRes, 'refresh_token');
    expect(rt1).toBeDefined();

    const r1 = await refreshWith(app, rt1!);
    expect(r1.statusCode).toBeLessThan(300);
    const rt2 = readSetCookie(r1, 'refresh_token');
    expect(rt2).toBeDefined();
    expect(rt2).not.toBe(rt1);
    expect(typeof r1.json().token).toBe('string');

    // rt1 já foi rotacionado → reapresentar falha (reuso).
    const reuse = await refreshWith(app, rt1!);
    expect(reuse.statusCode).toBe(401);
  });

  it('reuso de refresh revoga a família inteira (o token de boa-fé também cai)', async () => {
    const loginRes = await loginRaw(app);
    const rt1 = readSetCookie(loginRes, 'refresh_token')!;

    const r1 = await refreshWith(app, rt1);
    const rt2 = readSetCookie(r1, 'refresh_token')!; // válido "de boa-fé"

    // REUSO do rt1 (antigo já rotacionado) → deve revogar a família.
    const breach = await refreshWith(app, rt1);
    expect(breach.statusCode).toBe(401);

    // como a família foi revogada, o rt2 (que estava OK) também morre.
    const afterBreach = await refreshWith(app, rt2);
    expect(afterBreach.statusCode).toBe(401);
  });

  it('access expirado + refresh válido → refresh renova e /me volta 200', async () => {
    const loginRes = await loginRaw(app);
    const rt = readSetCookie(loginRes, 'refresh_token')!;

    // access "já expirado": assina manualmente com expiresIn negativo (secret do módulo).
    const jwt = app.get(JwtService);
    const config = app.get(ConfigService);
    const expired = await jwt.signAsync(
      { sub: 'x', username: 'admin', role: 'ADMIN' },
      { secret: config.get<string>('JWT_SECRET'), expiresIn: -10 },
    );
    const me401 = await inject(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${expired}` },
    });
    expect(me401.statusCode).toBe(401);

    const r = await refreshWith(app, rt);
    expect(r.statusCode).toBeLessThan(300);
    const newAccess = r.json().token as string;

    const me200 = await inject(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${newAccess}` },
    });
    expect(me200.statusCode).toBe(200);
    expect(me200.json().username).toBe('admin');
  });

  it('logout revoga o refresh: usar o token pós-logout falha', async () => {
    const loginRes = await loginRaw(app);
    const rt = readSetCookie(loginRes, 'refresh_token')!;

    const out = await inject(app, {
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: `refresh_token=${rt}` },
    });
    expect(out.statusCode).toBeLessThan(300);

    const after = await refreshWith(app, rt);
    expect(after.statusCode).toBe(401);
  });
});
