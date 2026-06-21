import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { createTestApp, inject, login } from './setup-app';

describe('F6 campanhas (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let prisma: PrismaService;
  const sessionId = 'e2e-camp-session';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
    // Campaign.sessionId tem FK para WaSession — cria uma sessão de teste.
    await prisma.waSession.create({
      data: { id: sessionId, name: 'e2e-camp-session' },
    });
  });
  afterAll(async () => {
    await prisma.campaign.deleteMany({
      where: { name: { contains: 'e2e-camp' } },
    });
    await prisma.waSession.delete({ where: { id: sessionId } }).catch(() => {});
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });
  const jsonAuth = () => ({ ...auth(), 'content-type': 'application/json' });

  it('POST campaigns sem auth → 401', async () => {
    const res = await inject(app, { method: 'POST', url: '/api/campaigns' });
    expect(res.statusCode).toBe(401);
  });

  it('texto sem text → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/campaigns',
      headers: jsonAuth(),
      payload: { sessionId, name: 'e2e-camp-1', recipients: ['5511999999999'] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('maxDelay < minDelay → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/campaigns',
      headers: jsonAuth(),
      payload: {
        sessionId,
        name: 'e2e-camp-2',
        text: 'oi',
        recipients: ['5511999999999'],
        minDelaySec: 30,
        maxDelaySec: 10,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('cria campanha de texto (DRAFT) → 201 com total e dedup', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/campaigns',
      headers: jsonAuth(),
      payload: {
        sessionId,
        name: 'e2e-camp-ok',
        text: 'Olá {{nome}}',
        recipients: ['5511999999999', '5511999999999', '5511988887777'],
        minDelaySec: 5,
        maxDelaySec: 9,
      },
    });
    expect(res.statusCode).toBe(201);
    const dto = res.json();
    expect(dto.status).toBe('DRAFT');
    expect(dto.total).toBe(2); // deduplicado
    expect(dto.typingPreview).toBe(true);

    const list = await inject(app, {
      method: 'GET',
      url: '/api/campaigns',
      headers: auth(),
    });
    expect(list.json().some((c: { id: string }) => c.id === dto.id)).toBe(true);

    const cancel = await inject(app, {
      method: 'POST',
      url: `/api/campaigns/${dto.id}/cancel`,
      headers: auth(),
    });
    expect(cancel.statusCode).toBe(201);
  });
});
