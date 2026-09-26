import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import {
  createTestApp,
  inject,
  login,
  removeSession,
  seedSession,
} from './setup-app';

// G8 — config por sessão + presence + markRead.
describe('G8 config / presence / markRead (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let prisma: PrismaService;
  const sessionId = 'g8';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
    await removeSession(app, sessionId);
    await seedSession(app, sessionId);
  });
  afterAll(async () => {
    await removeSession(app, sessionId);
    await app.close();
  });

  const auth = () => ({
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  });
  const bearer = () => ({ authorization: `Bearer ${token}` });

  it('GET /sessions/:id/config → defaults + cap derivado', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}/config`,
      headers: bearer(),
    });
    expect(res.statusCode).toBe(200);
    const c = res.json();
    expect(c.capBase).toBe(20);
    expect(c.modo).toBe('cold_ok');
    expect(c.cap_base).toBe(20);
    expect(c.cap_atual).toBe(20); // sessão ativa → cap_atual = cap_base
    expect(c.wwebjsWebVersion).toBeNull();
  });

  it('override WWEBJS persiste por sessão e null devolve ao modo global', async () => {
    const url = `/api/sessions/${sessionId}/config`;
    const invalid = await inject(app, {
      method: 'PATCH',
      url,
      headers: auth(),
      payload: { wwebjsWebVersion: '../segredo' },
    });
    expect(invalid.statusCode).toBe(400);

    const set = await inject(app, {
      method: 'PATCH',
      url,
      headers: auth(),
      payload: { wwebjsWebVersion: '2.3000.1046934385-alpha' },
    });
    expect(set.statusCode).toBe(200);
    expect(set.json().wwebjsWebVersion).toBe('2.3000.1046934385-alpha');
    const persisted = await inject(app, {
      method: 'GET',
      url,
      headers: bearer(),
    });
    expect(persisted.json().wwebjsWebVersion).toBe('2.3000.1046934385-alpha');

    const reset = await inject(app, {
      method: 'PATCH',
      url,
      headers: auth(),
      payload: { wwebjsWebVersion: null },
    });
    expect(reset.statusCode).toBe(200);
    expect(reset.json().wwebjsWebVersion).toBeNull();
  });

  it('PATCH /sessions/:id/config muda o cap SEM redeploy', async () => {
    const p = await inject(app, {
      method: 'PATCH',
      url: `/api/sessions/${sessionId}/config`,
      headers: auth(),
      payload: { capBase: 50, modo: 'inbound_only', warmupCurve: [3, 6, 12] },
    });
    expect(p.statusCode).toBe(200);
    expect(p.json().capBase).toBe(50);
    expect(p.json().cap_atual).toBe(50);

    const g = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}/config`,
      headers: bearer(),
    });
    expect(g.json().capBase).toBe(50);
    expect(g.json().modo).toBe('inbound_only');
  });

  it('GET /sessions/:id/health agora traz cap_base/cap_atual', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}/health`,
      headers: bearer(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().cap_base).toBe(50);
    expect(res.json().cap_atual).toBe(50); // ativa
  });

  it('POST /sessions/:id/presence → 201 (manager mockado)', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionId}/presence`,
      headers: auth(),
      payload: { to: '5511999999999', type: 'composing' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
  });

  it('POST /sessions/:id/messages/:msgId/read → 201', async () => {
    await prisma.waMessage.create({
      data: {
        id: 'g8-msg',
        sessionId,
        keyId: 'g8-msg',
        chatJid: '5511999999999@s.whatsapp.net',
        fromMe: false,
        type: 'text',
        text: 'oi',
        timestamp: new Date(),
      },
    });
    const res = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionId}/messages/g8-msg/read`,
      headers: bearer(),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
  });
});
