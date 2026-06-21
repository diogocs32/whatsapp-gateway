import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp, inject, login } from './setup-app';

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
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
});
