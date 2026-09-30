import type {
  SendReactionRequest,
  SendTextRequest,
} from '@whatsapp-gateway/contracts';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { newId } from '../src/shared-kernel/ulid';
import { createTestApp, fakeSessionManager, inject, login } from './setup-app';

// Schemas privados REAIS via HTTP. SQL sintético STOPPED/autostart=false; só manager falso.
// n8n0.4.1 envia to/text/cold/idempotencyKey, sem mentions/reaction; não importa contracts.
describe('E21/P-013 — pedidos W5 compatíveis com as rotas existentes', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let apiKey: string;
  const sessionId = newId();
  const sessionName = `e21-contracts-${sessionId.toLowerCase()}`;
  const to = '5511999999999';
  const jid = `${to}@s.whatsapp.net`;
  const keyId = 'E21-CONTRACTS-TARGET';
  const manager = {
    ...fakeSessionManager,
    start: vi.fn(async () => undefined),
    sendText: vi.fn(async () => ({ keyId: 'E21-CONTRACTS-SENT', jid })),
    sendReaction: vi.fn(async () => undefined),
  };
  const panel = () => ({ authorization: `Bearer ${token}` });
  const text = (
    payload: unknown,
    ref = sessionId,
    headers: Record<string, string> = panel(),
  ) =>
    inject(app, {
      method: 'POST',
      url: `/api/sessions/${ref}/messages/text`,
      headers: { ...headers, 'content-type': 'application/json' },
      payload,
    });
  const reaction = (payload: unknown, ref = keyId) =>
    inject(app, {
      method: 'POST',
      url: `/api/sessions/${sessionId}/messages/${ref}/reaction`,
      headers: { ...panel(), 'content-type': 'application/json' },
      payload,
    });

  beforeAll(async () => {
    app = await createTestApp(manager);
    prisma = app.get(PrismaService);
    token = await login(app);
    await prisma.waSession.create({
      data: {
        id: sessionId,
        name: sessionName,
        status: 'STOPPED',
        autostart: false,
      },
    });
    await prisma.waMessage.create({
      data: {
        id: newId(),
        sessionId,
        keyId,
        chatJid: jid,
        fromMe: false,
        text: 'alvo sintético',
        timestamp: new Date(),
      },
    });
    const key = await inject(app, {
      method: 'POST',
      url: '/api/api-keys',
      headers: panel(),
      payload: { name: sessionName },
    });
    expect(key.statusCode).toBe(201);
    apiKey = key.json().key;
  });

  beforeEach(() => {
    manager.sendText.mockClear();
    manager.sendReaction.mockClear();
  });

  afterAll(async () => {
    try {
      expect(manager.start).not.toHaveBeenCalled();
      expect(
        await prisma.waSession.findUnique({ where: { id: sessionId } }),
      ).toMatchObject({ status: 'STOPPED', autostart: false });
    } finally {
      try {
        await prisma.waApiKey.deleteMany({ where: { name: sessionName } });
        await prisma.waSession.deleteMany({ where: { id: sessionId } });
      } finally {
        await app.close();
      }
    }
  });

  it.each([
    ['omitido', { to, text: 'legado' }],
    ['vazio', { to, text: 'menções', mentions: [] }],
    [
      'número/JID/duplicado',
      { to, text: 'menções', mentions: [to, '12345@lid', to] },
    ],
    [
      'limite50 e strings5/40',
      {
        to,
        text: 'menções',
        mentions: ['a'.repeat(5), ...Array<string>(49).fill('a'.repeat(40))],
      },
    ],
  ] satisfies [string, SendTextRequest][])(
    'texto: mentions %s preserva201 e opções do transporte',
    async (_name, payload) => {
      const res = await text(payload);
      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({
        id: 'E21-CONTRACTS-SENT',
        to: jid,
        deduped: false,
      });
      expect(manager.sendText).toHaveBeenCalledExactlyOnceWith(
        sessionId,
        to,
        payload.text,
        {
          cold: undefined,
          idempotencyKey: undefined,
          mentions: 'mentions' in payload ? payload.mentions : undefined,
        },
      );
    },
  );

  it('fixture n8n0.4.1 por nome/ID mantém X-Api-Key, cold e replay da mesma chave', async () => {
    const payload = {
      to,
      text: 'fixture n8n',
      cold: false,
      idempotencyKey: 'e21-n8n-fixture',
    };
    const headers = { 'X-Api-Key': apiKey };
    const first = await text(payload, sessionName, headers);
    const replay = await text(payload, sessionId, headers);
    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(201);
    expect(first.json()).toEqual({
      id: 'E21-CONTRACTS-SENT',
      to: jid,
      deduped: false,
    });
    expect(replay.json()).toEqual({ ...first.json(), deduped: true });
    expect(manager.sendText).toHaveBeenCalledExactlyOnceWith(
      sessionId,
      to,
      payload.text,
      {
        cold: false,
        idempotencyKey: payload.idempotencyKey,
        mentions: undefined,
      },
    );
  });

  it.each([
    ['null', null],
    ['string', to],
    ['número', [12345]],
    ['curta4', ['a'.repeat(4)]],
    ['longa41', ['a'.repeat(41)]],
    ['lista51', Array<string>(51).fill(to)],
  ])(
    'mentions inválido (%s) mantém400 sem transporte',
    async (_name, mentions) => {
      const res = await text({ to, text: 'fixture', mentions });
      expect(res.statusCode).toBe(400);
      expect(manager.sendText).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['emoji', { emoji: '👍' }],
    ['remoção', { emoji: '' }],
    ['string comum', { emoji: 'qualquer texto' }],
    ['limite20', { emoji: 'a'.repeat(20) }],
  ] satisfies [string, SendReactionRequest][])(
    'reação %s mantém201 e string intacta',
    async (_name, payload) => {
      const res = await reaction(payload);
      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({ ok: true });
      expect(manager.sendReaction).toHaveBeenCalledExactlyOnceWith(
        sessionId,
        jid,
        keyId,
        false,
        payload.emoji,
      );
    },
  );

  it.each([{}, { emoji: null }, { emoji: 1 }, { emoji: 'a'.repeat(21) }])(
    'reação inválida %j mantém400 sem transporte',
    async (payload) => {
      expect((await reaction(payload)).statusCode).toBe(400);
      expect(manager.sendReaction).not.toHaveBeenCalled();
    },
  );

  it('alvo inexistente mantém404 sem transporte', async () => {
    expect(
      (await reaction({ emoji: '' } satisfies SendReactionRequest, 'missing'))
        .statusCode,
    ).toBe(404);
    expect(manager.sendReaction).not.toHaveBeenCalled();
  });
});
