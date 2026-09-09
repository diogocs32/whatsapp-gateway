import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import {
  createTestApp,
  fakeSessionManager,
  inject,
  login,
  removeSession,
  seedSession,
} from './setup-app';

describe('Messaging (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await login(app);
    await seedSession(app, 'x');
  });
  afterAll(async () => {
    await removeSession(app, 'x');
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });

  it('send-text sem texto → 400 (validação)', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/text',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { to: '5511999999999' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('send-text válido → 201 com id e to (manager mockado)', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/text',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { to: '5511999999999', text: 'olá' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe('fake-key');
  });

  it('list sem chatId → 400', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages',
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
  });

  it('list com chatId → 200 e array', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages?chatId=5511999999999',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  // G1 — cold + idempotencyKey. Manager mockado (não persiste), então não há hit de dedup:
  // valida só que o contrato novo é aceito e que a resposta traz `deduped: false`.
  it('send-text com cold e idempotencyKey → 201, deduped:false', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/text',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: {
        to: '5511999999999',
        text: 'primeiro contato',
        cold: true,
        idempotencyKey: 'g1-contract-check-key',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe('fake-key');
    expect(res.json().deduped).toBe(false);
  });

  it('send-text com idempotencyKey vazio → 400 (validação)', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/text',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { to: '5511999999999', text: 'oi', idempotencyKey: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('send-text sem auth → 401', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/text',
      headers: { 'content-type': 'application/json' },
      payload: { to: '5511999999999', text: 'oi' },
    });
    expect(res.statusCode).toBe(401);
  });

  // W7 — backfill do inbox (manager mockado devolve [] p/ listChats/fetchChatHistory).
  it('sync (todos os chats) → 201 com {chats, fetched, imported}', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/sync',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ chats: 0, fetched: 0, imported: 0 });
  });

  it('sync de um chat específico → 201', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/sync',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { chatId: '5511999999999', limit: 20 },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().chats).toBe(1);
  });

  it('sync com maxChats fora do range → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/sync',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { maxChats: 9999 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('sync sem auth → 401', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/sync',
      headers: { 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  // W7 — gestão de chat (manager mockado: setChatFlag resolve void).
  it('chat flag válido → 201 {ok:true}', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/5511999999999/flag',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { flag: 'pin', enabled: true },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
  });

  it('chat flag inválido → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/5511999999999/flag',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { flag: 'delete', enabled: true },
    });
    expect(res.statusCode).toBe(400);
  });

  it('chat flag sem enabled → 400', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/5511999999999/flag',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { flag: 'archive' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('chat flag sem auth → 401', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/api/sessions/x/messages/5511999999999/flag',
      headers: { 'content-type': 'application/json' },
      payload: { flag: 'pin', enabled: true },
    });
    expect(res.statusCode).toBe(401);
  });

  // W7 — busca no banco (repo real; DB de teste vazio → array vazio, mas o contrato responde 200).
  it('search com q → 200 e array', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages/search?q=oi',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('search sem q → 400', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages/search',
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
  });

  it('search com q só espaços → 400', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages/search?q=%20%20',
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
  });

  it('search sem auth → 401', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/api/sessions/x/messages/search?q=oi',
      headers: {},
    });
    expect(res.statusCode).toBe(401);
  });

  // ABE-03 (auditoria 09/2026) — intenção durável: a garantia de idempotência vale ANTES do
  // transporte, inclusive sob concorrência. O manager é o fake (não persiste em wa_messages), então
  // tudo o que dedupa aqui é a reserva em wa_send_intents.
  describe('idempotencyKey — reserva durável (ABE-03)', () => {
    const send = (payload: Record<string, unknown>) =>
      inject(app, {
        method: 'POST',
        url: '/api/sessions/x/messages/text',
        headers: { ...auth(), 'content-type': 'application/json' },
        payload,
      });

    beforeAll(async () => {
      await app
        .get(PrismaService)
        .sendIntent.deleteMany({ where: { sessionId: 'x' } });
    });

    it('mesma key + mesmo payload → 2ª chamada é replay (deduped:true, mesmo id) sem novo envio', async () => {
      const original = fakeSessionManager.sendText;
      let calls = 0;
      fakeSessionManager.sendText = async () => {
        calls++;
        return { keyId: `k-${calls}`, jid: '5511999999999@s.whatsapp.net' };
      };
      try {
        const a = await send({
          to: '5511999999999',
          text: 'oi',
          idempotencyKey: 'abe03-replay',
        });
        const b = await send({
          to: '5511999999999',
          text: 'oi',
          idempotencyKey: 'abe03-replay',
        });
        expect(a.statusCode).toBe(201);
        expect(a.json().deduped).toBe(false);
        expect(b.statusCode).toBe(201);
        expect(b.json()).toMatchObject({ id: a.json().id, deduped: true });
        expect(calls).toBe(1);
      } finally {
        fakeSessionManager.sendText = original;
      }
    });

    it('mesma key com destinatário/conteúdo diferente → 409 e nenhum envio', async () => {
      const original = fakeSessionManager.sendText;
      let calls = 0;
      fakeSessionManager.sendText = async () => {
        calls++;
        return { keyId: 'k', jid: 'j' };
      };
      try {
        await send({
          to: '5511999999999',
          text: 'oi',
          idempotencyKey: 'abe03-conflict',
        });
        const other = await send({
          to: '5511888888888',
          text: 'oi',
          idempotencyKey: 'abe03-conflict',
        });
        expect(other.statusCode).toBe(409);
        expect(calls).toBe(1);
      } finally {
        fakeSessionManager.sendText = original;
      }
    });

    it('20 requisições concorrentes com a mesma key → UM envio; as demais replay ou 409 "em voo"', async () => {
      const original = fakeSessionManager.sendText;
      let calls = 0;
      fakeSessionManager.sendText = async () => {
        calls++;
        await new Promise((r) => setTimeout(r, 150)); // transporte "lento": expõe a corrida
        return { keyId: 'k-conc', jid: '5511999999999@s.whatsapp.net' };
      };
      try {
        const results = await Promise.all(
          Array.from({ length: 20 }, () =>
            send({
              to: '5511999999999',
              text: 'oi',
              idempotencyKey: 'abe03-conc',
            }),
          ),
        );
        expect(calls).toBe(1);
        const codes = results.map((r) => r.statusCode);
        expect(codes.filter((c) => c === 201).length).toBeGreaterThanOrEqual(1);
        expect(codes.every((c) => c === 201 || c === 409)).toBe(true);
        for (const r of results) {
          if (r.statusCode === 201) expect(r.json().id).toBe('k-conc');
        }
      } finally {
        fakeSessionManager.sendText = original;
      }
    });

    it('falha no transporte marca a intenção failed e a MESMA key pode ser retentada', async () => {
      const original = fakeSessionManager.sendText;
      let calls = 0;
      fakeSessionManager.sendText = async () => {
        calls++;
        if (calls === 1) throw new Error('rede caiu');
        return { keyId: 'k-retry', jid: 'j' };
      };
      try {
        const first = await send({
          to: '5511999999999',
          text: 'oi',
          idempotencyKey: 'abe03-retry',
        });
        expect(first.statusCode).toBe(400);
        const second = await send({
          to: '5511999999999',
          text: 'oi',
          idempotencyKey: 'abe03-retry',
        });
        expect(second.statusCode).toBe(201);
        expect(second.json()).toMatchObject({ id: 'k-retry', deduped: false });
        expect(calls).toBe(2);
      } finally {
        fakeSessionManager.sendText = original;
      }
    });
  });
});
