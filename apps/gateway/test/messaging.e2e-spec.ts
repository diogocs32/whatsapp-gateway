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

  // W7 — backfill do inbox (manager mockado devolve [] p/ listChats/fetchChatHistory).
  it('sync (todos os chats) → 201 com {chats, fetched, imported}', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/sync',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ chats: 0, fetched: 0, imported: 0 });
  });

  it('sync de um chat específico → 201', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/sync',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { chatId: '5511999999999', limit: 20 },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().chats).toBe(1);
  });

  it('sync com maxChats fora do range → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/sync',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { maxChats: 9999 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('sync sem auth → 401', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/sync',
      headers: { 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  // W7 — gestão de chat (manager mockado: setChatFlag resolve void).
  it('chat flag válido → 201 {ok:true}', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/5511999999999/flag',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { flag: 'pin', enabled: true },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
  });

  it('chat flag inválido → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/5511999999999/flag',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { flag: 'delete', enabled: true },
    });
    expect(res.statusCode).toBe(400);
  });

  it('chat flag sem enabled → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/5511999999999/flag',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { flag: 'archive' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('chat flag sem auth → 401', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/5511999999999/flag',
      headers: { 'content-type': 'application/json' },
      payload: { flag: 'pin', enabled: true },
    });
    expect(res.statusCode).toBe(401);
  });

  // W7 — busca no banco (repo real; DB de teste vazio → array vazio, mas o contrato responde 200).
  it('search com q → 200 e array', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages/search?q=oi',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('search sem q → 400', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages/search',
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
  });

  it('search com q só espaços → 400', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages/search?q=%20%20',
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
  });

  it('search sem auth → 401', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages/search?q=oi',
      headers: {},
    });
    expect(res.statusCode).toBe(401);
  });
});
