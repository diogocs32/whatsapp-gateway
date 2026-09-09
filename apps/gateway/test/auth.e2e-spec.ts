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

  // ABE-12 (auditoria 09/2026): requisição com efeito autenticada por COOKIE precisa de Origin na
  // allowlist (CORS_ORIGIN) ou Sec-Fetch-Site same-origin/none. Bearer/X-Api-Key ficam de fora.
  describe('CSRF em autenticação por cookie', () => {
    it('POST com cookie + Origin fora da allowlist → 403 (guard) e no logout', async () => {
      const loginRes = await loginRaw(app);
      const access = readSetCookie(loginRes, 'token')!;
      const rt = readSetCookie(loginRes, 'refresh_token')!;

      const guarded = await inject(app, {
        method: 'POST',
        url: '/api/webhooks',
        headers: {
          cookie: `token=${access}`,
          origin: 'https://evil.example',
          'content-type': 'application/json',
        },
        payload: {},
      });
      expect(guarded.statusCode).toBe(403);

      const logout = await inject(app, {
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          cookie: `refresh_token=${rt}`,
          origin: 'https://evil.example',
        },
      });
      expect(logout.statusCode).toBe(403);
      // O refresh continua válido: o logout forjado NÃO revogou a família.
      const still = await refreshWith(app, rt);
      expect(still.statusCode).toBeLessThan(300);
    });

    it('POST com cookie + Sec-Fetch-Site cross-site (sem Origin) → 403', async () => {
      const loginRes = await loginRaw(app);
      const access = readSetCookie(loginRes, 'token')!;
      const res = await inject(app, {
        method: 'POST',
        url: '/api/webhooks',
        headers: {
          cookie: `token=${access}`,
          'sec-fetch-site': 'cross-site',
          'content-type': 'application/json',
        },
        payload: {},
      });
      expect(res.statusCode).toBe(403);
    });

    it('POST com cookie + Origin da allowlist passa pelo guard (cai na validação: 400)', async () => {
      const loginRes = await loginRaw(app);
      const access = readSetCookie(loginRes, 'token')!;
      const origin = (
        app.get(ConfigService).get<string>('CORS_ORIGIN') ?? ''
      ).split(',')[0];
      const res = await inject(app, {
        method: 'POST',
        url: '/api/webhooks',
        headers: {
          cookie: `token=${access}`,
          origin,
          'content-type': 'application/json',
        },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('Bearer com Origin estranha NÃO é bloqueado (não há CSRF sem cookie)', async () => {
      const token = await login(app);
      const res = await inject(app, {
        method: 'POST',
        url: '/api/webhooks',
        headers: {
          authorization: `Bearer ${token}`,
          origin: 'https://evil.example',
          'content-type': 'application/json',
        },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('GET com cookie e Origin estranha continua permitido (método seguro)', async () => {
      const loginRes = await loginRaw(app);
      const access = readSetCookie(loginRes, 'token')!;
      const res = await inject(app, {
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie: `token=${access}`, origin: 'https://evil.example' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ABE-09: reset de senha revoga as famílias de refresh do usuário.
  describe('revogação de sessão', () => {
    it('reset de senha pelo OWNER invalida o refresh do usuário', async () => {
      const owner = await login(app);
      const prisma = app.get(PrismaService);
      await prisma.user.deleteMany({ where: { username: 'reset-alvo' } });
      const created = await inject(app, {
        method: 'POST',
        url: '/api/users',
        headers: {
          authorization: `Bearer ${owner}`,
          'content-type': 'application/json',
        },
        payload: {
          username: 'reset-alvo',
          name: 'Alvo',
          password: 'senha-inicial-8',
          role: 'VIEWER',
        },
      });
      expect(created.statusCode).toBe(201);
      const userId = created.json().id as string;

      const victimLogin = await inject(app, {
        method: 'POST',
        url: '/api/auth/login',
        headers: { 'content-type': 'application/json' },
        payload: { username: 'reset-alvo', password: 'senha-inicial-8' },
      });
      expect(victimLogin.statusCode).toBeLessThan(300);
      const rt = readSetCookie(victimLogin, 'refresh_token')!;

      const reset = await inject(app, {
        method: 'POST',
        url: `/api/users/${userId}/password`,
        headers: {
          authorization: `Bearer ${owner}`,
          'content-type': 'application/json',
        },
        payload: { password: 'senha-nova-12345' },
      });
      expect(reset.statusCode).toBeLessThan(300);

      const after = await refreshWith(app, rt);
      expect(after.statusCode).toBe(401);

      await prisma.user.deleteMany({ where: { username: 'reset-alvo' } });
    });

    it('senha nova curta (<8) é rejeitada com 400', async () => {
      const owner = await login(app);
      const res = await inject(app, {
        method: 'POST',
        url: '/api/users',
        headers: {
          authorization: `Bearer ${owner}`,
          'content-type': 'application/json',
        },
        payload: {
          username: 'curta',
          name: 'Curta',
          password: '1234567',
          role: 'VIEWER',
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
