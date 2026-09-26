import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ContactDirectory } from '../src/infra/directory/contact-directory.service';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import type {
  EngineEventName,
  MessagePayload,
} from '../src/modules/sessions/application/engine.port';
import { createTestApp, inject, login, removeSession } from './setup-app';

// P-074 (etapa E23, Onda 8) — efeito de ponta a ponta pelo EventBus real (R6): a mensagem RECEBIDA
// em grupo é gravada com o senderJid do PARTICIPANTE (o que as engines passam a emitir) e o GET
// /messages (e o /search) devolve `senderName` resolvido no diretório (wa_contacts) numa consulta
// por página — agenda > pushName; @s.whatsapp.net (Baileys), @c.us (WWEBJS) e @lid. Fora de grupo,
// fromMe e linha antiga (senderJid = o grupo) → null. Falha do diretório não derruba o GET.
describe('Conversas — remetente de grupo e senderName (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  const sessionId = 'e23-grupo';
  const group = '120363000000000023@g.us';
  const pn = '5511933333333@s.whatsapp.net'; // Baileys, modo LID com participant_pn
  const lid = '44556677@lid'; // número oculto — só o pushName do contacts.update
  const cus = '5511944444444@c.us'; // WWEBJS — contato da agenda
  const unknown = '5511955550000@s.whatsapp.net'; // participante sem registro
  const peer = '5511987650000@s.whatsapp.net'; // 1:1 com contato conhecido
  const nowSec = () => Math.floor(Date.now() / 1000);

  const publish = (event: EngineEventName, payload: unknown) =>
    app.get(EventBus).publish({
      name: 'wa.event',
      occurredAt: new Date(),
      payload: {
        id: `e23-${Math.random().toString(36).slice(2, 10)}`,
        timestamp: Date.now(),
        event,
        sessionId,
        session: sessionId,
        payload,
        engine: 'baileys',
      },
    });
  const message = (keyId: string, p: Partial<MessagePayload>) =>
    publish('message', {
      keyId,
      chatJid: group,
      senderJid: null,
      fromMe: false,
      type: 'text',
      text: `msg ${keyId}`,
      timestamp: nowSec(),
      source: null,
      ...p,
    } satisfies MessagePayload);

  // Persistência é fire-and-forget (MessagePersister) — espera o efeito por polling curto.
  async function until<T>(
    read: () => Promise<T>,
    ok: (v: T) => boolean,
  ): Promise<T> {
    let v = await read();
    for (let i = 0; i < 40 && !ok(v); i++) {
      await new Promise((r) => setTimeout(r, 50));
      v = await read();
    }
    return v;
  }
  const auth = () => ({ authorization: `Bearer ${token}` });
  type Dto = {
    keyId: string;
    senderJid: string | null;
    senderName: string | null;
  };
  const get = async (url: string) => {
    const res = await inject(app, { method: 'GET', url, headers: auth() });
    expect(res.statusCode).toBe(200);
    return res.json() as Dto[];
  };
  const listChat = (chat: string) =>
    get(
      `/api/sessions/${sessionId}/messages?chatId=${encodeURIComponent(chat)}`,
    );
  const byKey = (list: Dto[]) =>
    Object.fromEntries(list.map((m) => [m.keyId, m.senderName]));

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
    await removeSession(app, sessionId); // cascade limpa mensagens e contatos de uma rodada anterior
    await prisma.waSession.create({ data: { id: sessionId, name: sessionId } });
    // Diretório como as engines o deixam: par LID↔telefone gravado pela P-074 (Baileys), linha só
    // @lid com o pushName (contacts.update da lib) e contato da agenda do WWEBJS.
    await prisma.waContact.createMany({
      data: [
        {
          id: 'e23c-pn',
          sessionId,
          waId: pn,
          jid: pn,
          lid,
          phone: '5511933333333',
          pushName: 'Fulano',
        },
        {
          id: 'e23c-lid',
          sessionId,
          waId: '99990000@lid',
          lid: '99990000@lid',
          pushName: 'Anônimo',
        },
        {
          id: 'e23c-cus',
          sessionId,
          waId: cus,
          jid: '5511944444444@s.whatsapp.net',
          phone: '5511944444444',
          name: 'Beltrano da Agenda',
          pushName: 'Beltrano',
        },
        {
          id: 'e23c-peer',
          sessionId,
          waId: peer,
          jid: peer,
          phone: '5511987650000',
          name: 'Contato 1:1',
        },
      ],
    });
    // Linha de grupo gravada ANTES da E23: senderJid = o próprio grupo.
    await prisma.waMessage.create({
      data: {
        id: 'e23-old',
        sessionId,
        keyId: 'OLD',
        chatJid: group,
        senderJid: group,
        fromMe: false,
        type: 'text',
        text: 'antiga',
        timestamp: new Date(Date.now() - 60_000),
      },
    });
    message('P1', { senderJid: pn });
    message('P2', { senderJid: '99990000@lid' });
    message('P3', { senderJid: cus });
    message('P4', { senderJid: unknown });
    message('ME', {
      senderJid: '5511000000000:7@s.whatsapp.net',
      fromMe: true,
      source: 'phone',
    });
    message('DM', { chatJid: peer, senderJid: peer });
    await until(
      () => prisma.waMessage.count({ where: { sessionId } }),
      (n) => n === 7,
    );
  });
  afterAll(async () => {
    await removeSession(app, sessionId);
    await app.close();
  });

  it('a mensagem de grupo é gravada com o senderJid do participante', async () => {
    const row = await prisma.waMessage.findFirst({
      where: { sessionId, keyId: 'P1' },
    });
    expect(row).toMatchObject({ chatJid: group, senderJid: pn, fromMe: false });
  });

  it('GET /messages do grupo: senderName do diretório (agenda > pushName) por telefone, @lid e @c.us', async () => {
    const list = await listChat(group);
    expect(list.find((m) => m.keyId === 'P1')?.senderJid).toBe(pn);
    expect(byKey(list)).toEqual({
      P1: 'Fulano', // pushName, casado pelo jid/telefone
      P2: 'Anônimo', // só @lid (número oculto)
      P3: 'Beltrano da Agenda', // WWEBJS @c.us: o nome da agenda vence o pushName
      P4: null, // participante sem registro
      ME: null, // nossa
      OLD: null, // linha antiga (senderJid = grupo)
    });
  });

  it('1:1: senderName null mesmo com o contato conhecido (o nome da conversa já vem da lista)', async () => {
    expect(byKey(await listChat(peer))).toEqual({ DM: null });
  });

  it('/search traz o mesmo senderName', async () => {
    const list = await get(
      `/api/sessions/${sessionId}/messages/search?q=msg&chatId=${encodeURIComponent(group)}`,
    );
    expect(byKey(list)).toMatchObject({
      P1: 'Fulano',
      P3: 'Beltrano da Agenda',
    });
  });

  it('falha na consulta ao diretório → 200 sem nome (não derruba o GET)', async () => {
    const spy = vi
      .spyOn(app.get(ContactDirectory), 'namesFor')
      .mockRejectedValueOnce(new Error('banco fora'));
    try {
      const list = await listChat(group);
      expect(list).toHaveLength(6);
      expect(list.every((m) => m.senderName === null)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1); // UMA consulta por página
    } finally {
      spy.mockRestore();
    }
  });
});
