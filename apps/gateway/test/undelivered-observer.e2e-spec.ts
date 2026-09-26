import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { UndeliveredDetectorService } from '../src/modules/guardrail/undelivered-detector.service';
import { createTestApp } from './setup-app';

// Nenhuma sessão WhatsApp é iniciada: setup-app substitui o SessionManager. Os registros abaixo
// são sintéticos no Postgres local/CI e a varredura é chamada manualmente com o timer desligado.
describe('observador de não-entrega (SQL real, sem sinal)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let observer: UndeliveredDetectorService;
  const wwebjsId = 'undelivered-observer-wwebjs';
  const baileysId = 'undelivered-observer-baileys';
  const oneChatId = 'undelivered-observer-one-chat';
  const ids = [wwebjsId, baileysId, oneChatId];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    observer = app.get(UndeliveredDetectorService);
    await prisma.waSession.deleteMany({ where: { id: { in: ids } } });
    await prisma.waSession.createMany({
      data: [
        { id: wwebjsId, name: wwebjsId, engine: 'WWEBJS', status: 'WORKING' },
        {
          id: baileysId,
          name: baileysId,
          engine: 'BAILEYS',
          status: 'WORKING',
        },
        { id: oneChatId, name: oneChatId, engine: 'WWEBJS', status: 'WORKING' },
      ],
    });
    const timestamp = new Date(Date.now() - 30 * 60_000);
    await prisma.waMessage.createMany({
      data: [
        ...ids.flatMap((sessionId) =>
          Array.from({ length: 5 }, (_, i) => ({
            id: `${sessionId}-${i}`,
            sessionId,
            keyId: `fake-${i}`,
            chatJid: `${sessionId === oneChatId ? 0 : i % 3}@s.whatsapp.net`,
            fromMe: true,
            isCold: true,
            status: 'sent',
            timestamp,
          })),
        ),
        ...[
          { key: 'delivered', status: 'delivered', isCold: true, timestamp },
          { key: 'warm', status: 'sent', isCold: false, timestamp },
          {
            key: 'stale',
            status: 'sent',
            isCold: true,
            timestamp: new Date(Date.now() - 25 * 60 * 60_000),
          },
        ].map((item) => ({
          id: `${wwebjsId}-${item.key}`,
          sessionId: wwebjsId,
          keyId: `fake-${item.key}`,
          chatJid: `${item.key}@s.whatsapp.net`,
          fromMe: true,
          isCold: item.isCold,
          status: item.status,
          timestamp: item.timestamp,
        })),
      ],
    });
  });

  afterAll(async () => {
    if (prisma)
      await prisma.waSession.deleteMany({ where: { id: { in: ids } } });
    if (app) await app.close();
  });

  it('só observa WWEBJS com 5 mensagens em 3 chats e nunca marca banida', async () => {
    const rows = await observer.sweep();
    expect(rows.find((row) => row.sessionId === wwebjsId)).toMatchObject({
      stuckMsgs: 5,
      stuckChats: 3,
    });
    expect(rows.some((row) => row.sessionId === baileysId)).toBe(false);
    expect(rows.some((row) => row.sessionId === oneChatId)).toBe(false);

    await observer.sweep();
    const state = await prisma.sessionGuardrail.findUnique({
      where: { sessionId: wwebjsId },
    });
    expect(state).toBeNull();
  });
});
