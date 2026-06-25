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

// G7 — REST de saúde / override / config do guard-rail.
describe('G7 health / override / config (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let prisma: PrismaService;
  const sessionId = 'g7';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
    await removeSession(app, sessionId);
    await seedSession(app, sessionId);
  });
  afterAll(async () => {
    await prisma.guardrailConfig.deleteMany({}); // reset limiares globais
    await removeSession(app, sessionId);
    await app.close();
  });

  const auth = () => ({
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  });

  it('GET /sessions/:id/health → objeto de saúde completo', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}/health`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const h = res.json();
    expect(h.state).toBe('ativa'); // default
    for (const k of [
      'reply_rate',
      'amostra',
      'score',
      'cap_base',
      'cap_atual',
      'quarentena_desde',
      'cooldown_ate',
      'ultimos_sinais',
    ]) {
      expect(h).toHaveProperty(k);
    }
    expect(Array.isArray(h.ultimos_sinais)).toBe(true);
  });

  it('POST /sessions/:id/quarantine força o estado; /health reflete', async () => {
    const ov = await inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionId}/quarantine`,
      headers: auth(),
    });
    expect(ov.statusCode).toBe(201);
    expect(ov.json().state).toBe('quarentena');

    const h = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}/health`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(h.json().state).toBe('quarentena');
  });

  it('GET /sessions?state= filtra por estado guard-rail', async () => {
    const q = await inject(app, {
      method: 'GET',
      url: '/api/sessions?state=quarentena',
      headers: { authorization: `Bearer ${token}` },
    });
    const quar = q.json() as Array<{ id: string; guardrailState: string }>;
    expect(quar.some((s) => s.id === sessionId)).toBe(true);

    const a = await inject(app, {
      method: 'GET',
      url: '/api/sessions?state=ativa',
      headers: { authorization: `Bearer ${token}` },
    });
    const ativa = a.json() as Array<{ id: string }>;
    expect(ativa.some((s) => s.id === sessionId)).toBe(false);
  });

  it('PATCH /guardrail/config muda o limiar SEM redeploy', async () => {
    const p = await inject(app, {
      method: 'PATCH',
      url: '/api/guardrail/config',
      headers: auth(),
      payload: { nmin: 7 },
    });
    expect(p.statusCode).toBe(200);
    expect(p.json().nmin).toBe(7);

    const after = await inject(app, {
      method: 'GET',
      url: '/api/guardrail/config',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(after.json().nmin).toBe(7); // persistiu (cache invalidado)
  });
});
