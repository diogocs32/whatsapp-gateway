import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp, inject, login } from './setup-app';

describe('Messaging (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await login(app);
  });
  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });

  it('send-text sem texto → 400 (validação)', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/text',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { to: '5511999999999' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('send-text válido → 201 com id e to (manager mockado)', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/text',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { to: '5511999999999', text: 'olá' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe('fake-key');
  });

  it('list sem chatId → 400', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages',
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
  });

  it('list com chatId → 200 e array', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages?chatId=5511999999999',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('send-text sem auth → 401', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/text',
      headers: { 'content-type': 'application/json' },
      payload: { to: '5511999999999', text: 'oi' },
    });
    expect(res.statusCode).toBe(401);
  });
});
