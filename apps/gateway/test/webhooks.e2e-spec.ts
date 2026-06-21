import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { createTestApp, inject, login } from './setup-app';

describe('Webhooks (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
  });
  afterAll(async () => {
    await prisma.webhook.deleteMany({
      where: { url: { contains: 'e2e-webhook.test' } },
    });
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });

  it('GET /api/webhooks sem auth → 401', async () => {
    const res = await inject(app, { method: 'GET', url: '/api/webhooks' });
    expect(res.statusCode).toBe(401);
  });

  it('url inválida → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { url: 'nao-eh-url', events: ['*'] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('cria webhook → 201, não vaza o secret e aparece na listagem', async () => {
    const url = 'https://e2e-webhook.test/hook';
    const create = await inject(app, {
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: {
        url,
        events: ['message'],
        secret: 'segredo-super-secreto-123',
      },
    });
    expect(create.statusCode).toBe(201);
    const dto = create.json();
    expect(dto.hasSecret).toBe(true);
    expect(JSON.stringify(dto)).not.toContain('segredo-super-secreto-123');

    const list = await inject(app, {
      method: 'GET',
      url: '/api/webhooks',
      headers: auth(),
    });
    expect(list.json().some((w: { url: string }) => w.url === url)).toBe(true);

    await inject(app, {
      method: 'DELETE',
      url: `/api/webhooks/${dto.id}`,
      headers: auth(),
    });
  });
});
