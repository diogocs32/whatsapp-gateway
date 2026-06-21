import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { createTestApp, inject, login } from './setup-app';

describe('Sessions (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
  });
  afterAll(async () => {
    await prisma.waSession.deleteMany({
      where: { name: { startsWith: 'e2e-' } },
    });
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });

  it('GET /api/sessions sem auth → 401', async () => {
    const res = await inject(app, { method: 'GET', url: '/api/sessions' });
    expect(res.statusCode).toBe(401);
  });

  // Regressão do bug FST_ERR_CTP_EMPTY_JSON_BODY (botões davam 400):
  // POST sem body + Content-Type application/json deve seguir para o handler.
  it('POST /start com body vazio + content-type json NÃO retorna 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/nao-existe/start',
      headers: { ...auth(), 'content-type': 'application/json' },
    });
    expect(res.statusCode).not.toBe(400);
    expect(res.statusCode).toBe(404); // ensure() → sessão não encontrada
  });

  it('cria sessão (201) e ela aparece na listagem', async () => {
    const name = 'e2e-' + Math.random().toString(36).slice(2, 8);
    const create = await inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { name, engine: 'BAILEYS' },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().name).toBe(name);

    const list = await inject(app, {
      method: 'GET',
      url: '/api/sessions',
      headers: auth(),
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().some((s: { name: string }) => s.name === name)).toBe(
      true,
    );
  });

  it('nome inválido → 400 (validação zod)', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { name: 'nome com espaço!' },
    });
    expect(res.statusCode).toBe(400);
  });
});
