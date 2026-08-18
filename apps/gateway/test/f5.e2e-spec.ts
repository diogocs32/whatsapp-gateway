import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  createTestApp,
  inject,
  login,
  removeSession,
  seedSession,
} from './setup-app';

describe('F5 grupos/contatos/canais (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await login(app);
    await seedSession(app, 's1');
  });
  afterAll(async () => {
    await removeSession(app, 's1');
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });
  const jsonAuth = () => ({ ...auth(), 'content-type': 'application/json' });

  it('GET groups sem auth → 401', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/s1/groups',
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET groups → 200 (lista, manager mockado)', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/s1/groups',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('criar grupo sem subject → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/groups',
      headers: jsonAuth(),
      payload: { participants: ['5511999999999'] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('criar grupo válido → 201', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/groups',
      headers: jsonAuth(),
      payload: { subject: 'Time', participants: ['5511999999999'] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().subject).toBe('Grupo Fake');
  });

  it('participants com ação inválida → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/groups/123-456@g.us/participants',
      headers: jsonAuth(),
      payload: { action: 'kick', participants: ['5511999999999'] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('invite link → 200 com code e url', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/s1/groups/123-456@g.us/invite',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toContain('chat.whatsapp.com/FAKEINVITE');
  });

  it('contacts check vazio → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/contacts/check',
      headers: jsonAuth(),
      payload: { numbers: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('contacts check válido → 200 array', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/contacts/check',
      headers: jsonAuth(),
      payload: { numbers: ['5511999999999'] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()[0].exists).toBe(true);
  });

  it('contacts save sem firstName → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/contacts/save',
      headers: jsonAuth(),
      payload: { number: '5511999999999' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('contacts save sem jid nem number → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/contacts/save',
      headers: jsonAuth(),
      payload: { firstName: 'João' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('contacts save válido → 201', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/contacts/save',
      headers: jsonAuth(),
      payload: {
        number: '5511999999999',
        firstName: 'João',
        syncToPhone: true,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
  });

  it('contacts remove válido → 201', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/contacts/remove',
      headers: jsonAuth(),
      payload: { number: '5511999999999' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
  });

  it('criar canal válido → 201', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/channels',
      headers: jsonAuth(),
      payload: { name: 'Meu Canal' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('Canal Fake');
  });

  // W8 — grupos avançados (membership requests / settings / foto)
  it('GET membership-requests → 200 array', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/s1/groups/123-456@g.us/membership-requests',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('membership action inválida → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/groups/123-456@g.us/membership-requests',
      headers: jsonAuth(),
      payload: { action: 'maybe' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('membership approve (fila toda) → 201 ok', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/groups/123-456@g.us/membership-requests',
      headers: jsonAuth(),
      payload: { action: 'approve' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
  });

  it('settings sem announce nem restrict → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/groups/123-456@g.us/settings',
      headers: jsonAuth(),
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('settings announce+restrict → 201 ok', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/groups/123-456@g.us/settings',
      headers: jsonAuth(),
      payload: { announce: true, restrict: false },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
  });

  it('group photo com url inválida → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/s1/groups/123-456@g.us/photo',
      headers: jsonAuth(),
      payload: { url: 'não-é-url' },
    });
    expect(res.statusCode).toBe(400);
  });
});
