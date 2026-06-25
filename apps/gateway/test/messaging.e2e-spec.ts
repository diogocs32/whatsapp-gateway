import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  createTestApp,
  inject,
  login,
  removeSession,
  seedSession,
} from './setup-app';

describe('Messaging (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await login(app);
    await seedSession(app, 'x');
  });
  afterAll(async () => {
    await removeSession(app, 'x');
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

  // G1 — cold + idempotencyKey. Manager mockado (não persiste), então não há hit de dedup:
  // valida só que o contrato novo é aceito e que a resposta traz `deduped: false`.
  it('send-text com cold e idempotencyKey → 201, deduped:false', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/text',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: {
        to: '5511999999999',
        text: 'primeiro contato',
        cold: true,
        idempotencyKey: 'g1-contract-check-key',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe('fake-key');
    expect(res.json().deduped).toBe(false);
  });

  it('send-text com idempotencyKey vazio → 400 (validação)', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/text',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { to: '5511999999999', text: 'oi', idempotencyKey: '' },
    });
    expect(res.statusCode).toBe(400);
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
