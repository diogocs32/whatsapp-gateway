import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { newId } from '../src/shared-kernel/ulid';
import {
  createTestApp,
  inject,
  login,
  removeSession,
  seedSession,
} from './setup-app';

// P-053 — efeito de ponta a ponta (R6): a gravação da auditoria é fire-and-forget, então o teste
// espera a LINHA no banco. `/%61pi/webhooks` casa a rota POST /api/webhooks (o router decodifica
// o %61) e antes escapava da trilha porque a decisão era por `req.url` cru.
describe('auditoria pela rota resolvida (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  const sessao = `e2e-aud-${newId().slice(-6).toLowerCase()}`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
    await seedSession(app, sessao);
  });
  afterAll(async () => {
    await removeSession(app, sessao);
    await app.close();
  });

  const auth = () => ({
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  });

  it('POST em /%61pi/webhooks grava linha de auditoria com o alvo cru; envio de mensagem não', async () => {
    const desde = new Date();
    // Corpo inválido → 400 no zod: nada é criado, mas a tentativa entra na trilha (catchError).
    const evasao = await inject(app, {
      method: 'POST',
      url: '/%61pi/webhooks',
      headers: auth(),
      payload: {},
    });
    expect(evasao.statusCode).toBe(400);
    const envio = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessao}/messages/text`,
      headers: auth(),
      payload: { to: '5511999999999', text: 'oi' },
    });
    expect(envio.statusCode).toBeLessThan(500);
    // Sentinela auditável DEPOIS do envio: quando ela aparece, o envio já teria aparecido também.
    const sentinela = await inject(app, {
      method: 'POST',
      url: '/api/webhooks',
      headers: auth(),
      payload: {},
    });
    expect(sentinela.statusCode).toBe(400);

    const doTeste = {
      createdAt: { gte: desde },
      actor: { startsWith: 'admin (' },
    };
    try {
      // As DUAS linhas (evasão e sentinela) — a gravação é fire-and-forget.
      await vi.waitFor(
        async () => {
          const n = await prisma.waAuditLog.count({
            where: {
              ...doTeste,
              path: { in: ['/%61pi/webhooks', '/api/webhooks'] },
            },
          });
          expect(n).toBeGreaterThanOrEqual(2);
        },
        { timeout: 5_000, interval: 50 },
      );
      const linhas = await prisma.waAuditLog.findMany({ where: doTeste });
      expect(linhas.find((l) => l.path === '/%61pi/webhooks')).toMatchObject({
        method: 'POST',
        statusCode: 400,
      });
      expect(linhas.some((l) => l.path.includes('/messages/'))).toBe(false);
    } finally {
      await prisma.waAuditLog.deleteMany({
        where: {
          ...doTeste,
          path: { in: ['/%61pi/webhooks', '/api/webhooks'] },
        },
      });
    }
  });
});
