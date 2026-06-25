import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { createTestApp, inject, login, removeSession } from './setup-app';

// G4 — reply-rate por sessão. Cenário determinístico para validar a correção C2:
// 3 cold-sends maduros (>72h) em chats distintos, 1 respondido; + 1 cold imaturo (1h) que NÃO
// pode entrar no denominador. Esperado: coldMature=3, responded=1, replyRate=1/3, sample=3.
describe('G4 reply-rate (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let prisma: PrismaService;
  const sessionId = 'g4';

  const hAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
  const cold = (id: string, chat: string, hoursAgo: number) =>
    prisma.waMessage.create({
      data: {
        id,
        sessionId,
        keyId: id,
        chatJid: chat,
        fromMe: true,
        isCold: true,
        source: 'api',
        type: 'text',
        text: 'primeiro contato',
        timestamp: hAgo(hoursAgo),
      },
    });
  const inbound = (id: string, chat: string, hoursAgo: number) =>
    prisma.waMessage.create({
      data: {
        id,
        sessionId,
        keyId: id,
        chatJid: chat,
        fromMe: false,
        isCold: false,
        type: 'text',
        text: 'resposta',
        timestamp: hAgo(hoursAgo),
      },
    });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
    await removeSession(app, sessionId); // limpa eventual lixo (cascade nas mensagens)
    await prisma.waSession.create({ data: { id: sessionId, name: sessionId } });

    await cold('g4-cA', '11111@s.whatsapp.net', 96); // madura, respondida
    await cold('g4-cB', '22222@s.whatsapp.net', 96); // madura, sem resposta
    await cold('g4-cC', '33333@s.whatsapp.net', 96); // madura, sem resposta
    await cold('g4-cD', '44444@s.whatsapp.net', 1); // IMATURA (1h) — C2 exclui
    await inbound('g4-rA', '11111@s.whatsapp.net', 95); // responde A 1h depois (dentro de 72h)
  });
  afterAll(async () => {
    await removeSession(app, sessionId);
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });

  it('reply-rate (7d) exclui cold <72h (C2) e calcula corretamente', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/observability/reply-rate/g4?window=7',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const m = res.json();
    expect(m.coldTotal).toBe(4); // A,B,C,D
    expect(m.coldMature).toBe(3); // C2: D (1h) NÃO entra no denominador
    expect(m.responded).toBe(1); // só A
    expect(m.sample).toBe(3);
    expect(m.replyRate).toBeCloseTo(1 / 3, 5);
    expect(m.reliable).toBe(false); // 3 < Nmin(20)
  });

  it('snapshot (sem window) devolve 7d e 30d', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/observability/reply-rate/g4',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const arr = res.json() as Array<{ windowDays: number }>;
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.map((x) => x.windowDays).sort((a, b) => a - b)).toEqual([7, 30]);
  });

  it('persiste o snapshot em session_metrics', async () => {
    await inject(app, {
      method: 'GET',
      url: '/api/observability/reply-rate/g4?window=7',
      headers: auth(),
    });
    const row = await prisma.sessionMetric.findUnique({
      where: { sessionId_windowDays: { sessionId, windowDays: 7 } },
    });
    expect(row?.coldMature).toBe(3);
    expect(row?.responded).toBe(1);
  });
});
