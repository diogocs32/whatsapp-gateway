import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import { RetentionService } from '../src/modules/observability/retention.service';
import {
  REACTION_REPOSITORY,
  type ReactionRepository,
} from '../src/modules/messaging/domain/reaction.repository';
import type {
  EngineEventName,
  MessagePayload,
  ReactionPayload,
} from '../src/modules/sessions/application/engine.port';
import { createTestApp, inject, login, removeSession } from './setup-app';

// P-066 / P-072 (etapa E22, Onda 8) — efeitos de ponta a ponta pelo EventBus real (R6):
// reação grava / troca / remove (lápide) em wa_message_reactions e aparece no GET /messages;
// reação antiga fora de ordem não ressuscita; @lid × telefone e aparelho do participante não
// duplicam; selo "Encaminhada" persistido; reply-rate conta reação do contato (D-028); feed da
// caixa única traz o ACK (`status`) das enviadas.
describe('Conversas fiéis — reações, encaminhada, reply-rate e feed (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  const sessionId = 'e22-conversas';
  const peer = '5511987654321@s.whatsapp.net';
  const peerLid = '99887766554433@lid';
  const group = '120363000000000001@g.us';
  const nowSec = () => Math.floor(Date.now() / 1000);
  const hAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

  const publish = (event: EngineEventName, payload: unknown, sid = sessionId) =>
    app.get(EventBus).publish({
      name: 'wa.event',
      occurredAt: new Date(),
      payload: {
        id: `e22-${Math.random().toString(36).slice(2, 10)}`,
        timestamp: Date.now(),
        event,
        sessionId: sid,
        session: sid,
        payload,
        engine: 'baileys',
      },
    });
  const react = (p: Partial<ReactionPayload> & { keyId: string }) =>
    publish('message.reaction', {
      chatJid: peer,
      senderJid: peer,
      emoji: '👍',
      fromMe: false,
      timestamp: nowSec(),
      ...p,
    } satisfies ReactionPayload);

  // Persistência é fire-and-forget (como o MessagePersister) — espera o efeito por polling curto.
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
  const rowsOf = (targetKeyId: string) =>
    prisma.messageReaction.findMany({
      where: { sessionId, targetKeyId },
      orderBy: { senderKey: 'asc' },
    });
  const auth = () => ({ authorization: `Bearer ${token}` });
  const listChat = async (chat: string) => {
    const res = await inject(app, {
      method: 'GET',
      url: `/api/sessions/${sessionId}/messages?chatId=${encodeURIComponent(chat)}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    return res.json() as Array<{
      keyId: string;
      type: string;
      text: string | null;
      isForwarded: boolean;
      forwardingScore: number | null;
      reactions: Array<{ emoji: string; fromMe: boolean; senderJid: string }>;
    }>;
  };
  const seedMsg = (
    keyId: string,
    chatJid: string,
    fromMe: boolean,
    extra: Record<string, unknown> = {},
  ) =>
    prisma.waMessage.create({
      data: {
        id: `e22-${keyId}`,
        sessionId,
        keyId,
        chatJid,
        fromMe,
        type: 'text',
        text: fromMe ? 'nossa' : 'deles',
        timestamp: new Date(),
        ...extra,
      },
    });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    token = await login(app);
    await removeSession(app, sessionId); // cascade limpa mensagens e reações de uma rodada anterior
    await prisma.waSession.create({ data: { id: sessionId, name: sessionId } });
  });
  afterAll(async () => {
    await removeSession(app, sessionId);
    await app.close();
  });

  describe('reação grava, troca e remove', () => {
    it('reação do contato grava UMA linha e aparece no GET /messages da mensagem-alvo', async () => {
      await seedMsg('R1', peer, true);
      const t0 = nowSec();
      react({ keyId: 'R1', emoji: '👍', timestamp: t0 });
      const rows = await until(
        () => rowsOf('R1'),
        (r) => r.length === 1,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        chatJid: peer,
        senderKey: 'peer',
        emoji: '👍',
        fromMe: false,
      });

      const [msg] = (await listChat(peer)).filter((m) => m.keyId === 'R1');
      expect(msg.reactions).toEqual([
        expect.objectContaining({
          emoji: '👍',
          fromMe: false,
          senderJid: peer,
        }),
      ]);
    });

    it('trocar o emoji substitui (não duplica); a nossa reação convive com a do contato', async () => {
      const t0 = nowSec();
      react({ keyId: 'R1', emoji: '❤️', timestamp: t0 + 5 });
      react({
        keyId: 'R1',
        emoji: '😂',
        fromMe: true,
        senderJid: '5511000000000:7@s.whatsapp.net',
        timestamp: t0 + 6,
      });
      const rows = await until(
        () => rowsOf('R1'),
        (r) => r.length === 2 && r.some((x) => x.emoji === '❤️'),
      );
      expect(rows.map((r) => [r.senderKey, r.emoji, r.fromMe])).toEqual([
        ['me', '😂', true],
        ['peer', '❤️', false],
      ]);
      const [msg] = (await listChat(peer)).filter((m) => m.keyId === 'R1');
      expect(msg.reactions.map((r) => r.emoji).sort()).toEqual(
        ['❤️', '😂'].sort(),
      );
    });

    it('emoji vazio REMOVE: some do GET /messages (lápide guarda o horário)', async () => {
      const t0 = nowSec();
      react({ keyId: 'R1', emoji: '', timestamp: t0 + 20 });
      const rows = await until(
        () => rowsOf('R1'),
        (r) => r.some((x) => x.senderKey === 'peer' && x.emoji === ''),
      );
      expect(rows.find((r) => r.senderKey === 'peer')?.emoji).toBe('');
      const [msg] = (await listChat(peer)).filter((m) => m.keyId === 'R1');
      expect(msg.reactions.map((r) => r.emoji)).toEqual(['😂']);
    });

    it('reação ANTIGA reprocessada fora de ordem não ressuscita a removida', async () => {
      // Determinístico: espera o statement que o evento disparou (spy no repositório singleton que
      // o ReactionPersister usa) em vez de um sleep — com a guarda o UPDATE não muda nada visível.
      const repo = app.get<ReactionRepository>(REACTION_REPOSITORY);
      const spy = vi.spyOn(repo, 'upsert');
      react({ keyId: 'R1', emoji: '👍', timestamp: nowSec() - 3600 });
      expect(spy).toHaveBeenCalledTimes(1);
      await spy.mock.results[0].value;
      spy.mockRestore();
      const peerRow = (await rowsOf('R1')).find((r) => r.senderKey === 'peer');
      expect(peerRow?.emoji).toBe('');
    });

    it('mesmo contato como @lid e como telefone numa conversa 1:1 → uma linha só (senderKey peer)', async () => {
      await seedMsg('R2', peer, true);
      const t0 = nowSec();
      react({
        keyId: 'R2',
        chatJid: peerLid,
        senderJid: peerLid,
        emoji: '👍',
        timestamp: t0,
      });
      await until(
        () => rowsOf('R2'),
        (r) => r.length === 1,
      );
      react({ keyId: 'R2', emoji: '🙏', timestamp: t0 + 1 });
      const rows = await until(
        () => rowsOf('R2'),
        (r) => r[0]?.emoji === '🙏',
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].emoji).toBe('🙏');
      // ordem @lid → telefone: prova a dedup por senderKey 'peer' (a precedência é o caso R3)
      expect(rows[0].chatJid).toBe(peer);
    });

    it('telefone NÃO volta para @lid quando uma reação @lid mais nova chega depois do merge', async () => {
      await seedMsg('R3', peer, true);
      const t0 = nowSec();
      react({ keyId: 'R3', emoji: '👍', timestamp: t0 });
      await until(
        () => rowsOf('R3'),
        (r) => r[0]?.chatJid === peer,
      );
      react({
        keyId: 'R3',
        chatJid: peerLid,
        senderJid: peerLid,
        emoji: '🙏',
        timestamp: t0 + 1,
      });
      const rows = await until(
        () => rowsOf('R3'),
        (r) => r[0]?.emoji === '🙏',
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        emoji: '🙏', // o UPDATE rodou (não foi barrado pela guarda de horário)
        senderJid: peerLid,
        chatJid: peer, // só o chatJid ficou preso ao telefone (CASE do upsert)
      });
    });

    it('grupo: cada participante tem a sua; aparelho (:NN) não duplica', async () => {
      await seedMsg('G1', group, true);
      const t0 = nowSec();
      react({
        keyId: 'G1',
        chatJid: group,
        senderJid: '5511911111111:3@s.whatsapp.net',
        emoji: '👍',
        timestamp: t0,
      });
      react({
        keyId: 'G1',
        chatJid: group,
        senderJid: '5511922222222@s.whatsapp.net',
        emoji: '🔥',
        timestamp: t0,
      });
      await until(
        () => rowsOf('G1'),
        (r) => r.length === 2,
      );
      react({
        keyId: 'G1',
        chatJid: group,
        senderJid: '5511911111111:9@s.whatsapp.net',
        emoji: '🎉',
        timestamp: t0 + 1,
      });
      const rows = await until(
        () => rowsOf('G1'),
        (r) => r.some((x) => x.emoji === '🎉'),
      );
      expect(rows.map((r) => [r.senderKey, r.emoji])).toEqual([
        ['5511911111111@s.whatsapp.net', '🎉'],
        ['5511922222222@s.whatsapp.net', '🔥'],
      ]);
    });

    it('evento sem mensagem-alvo não grava nada', async () => {
      react({ keyId: '', emoji: '👍' });
      await new Promise((r) => setTimeout(r, 200));
      expect(
        await prisma.messageReaction.count({
          where: { sessionId, targetKeyId: '' },
        }),
      ).toBe(0);
    });
  });

  it('selo "Encaminhada": o evento message grava isForwarded/forwardingScore e o GET /messages devolve', async () => {
    const chat = '5511955555555@s.whatsapp.net';
    publish('message', {
      keyId: 'F1',
      chatJid: chat,
      senderJid: chat,
      fromMe: false,
      type: 'text',
      text: 'corrente',
      timestamp: nowSec(),
      source: null,
      isForwarded: true,
      forwardingScore: 7,
    } satisfies MessagePayload);
    const row = await until(
      () => prisma.waMessage.findFirst({ where: { sessionId, keyId: 'F1' } }),
      (r) => !!r,
    );
    expect(row).toMatchObject({ isForwarded: true, forwardingScore: 7 });
    const [msg] = await listChat(chat);
    expect(msg).toMatchObject({
      keyId: 'F1',
      isForwarded: true,
      forwardingScore: 7,
      reactions: [],
    });
  });

  describe('reply-rate conta reação do contato (D-028)', () => {
    const replySession = 'e22-reply';
    const cold = (keyId: string, chatJid: string, hoursAgo: number) =>
      prisma.waMessage.create({
        data: {
          id: `e22r-${keyId}`,
          sessionId: replySession,
          keyId,
          chatJid,
          fromMe: true,
          isCold: true,
          source: 'api',
          type: 'text',
          text: 'primeiro contato',
          timestamp: hAgo(hoursAgo),
        },
      });
    const reaction = (
      targetKeyId: string,
      chatJid: string,
      hoursAgo: number,
      extra: Record<string, unknown> = {},
    ) =>
      prisma.messageReaction.create({
        data: {
          id: `e22x-${targetKeyId}-${hoursAgo}`,
          sessionId: replySession,
          chatJid,
          targetKeyId,
          senderKey: 'peer',
          senderJid: chatJid,
          fromMe: false,
          emoji: '👍',
          timestamp: hAgo(hoursAgo),
          ...extra,
        },
      });

    beforeAll(async () => {
      await removeSession(app, replySession);
      await prisma.waSession.create({
        data: { id: replySession, name: replySession },
      });
      // A: só reagiu ao cold (reação com chat @lid — casa pela mensagem-alvo)
      await cold('cA', '5511100000001@s.whatsapp.net', 96);
      await reaction('cA', '11122233344455@lid', 95);
      // B: reagiu a OUTRA mensagem do mesmo chat depois do cold (casa pelo chat)
      await cold('cB', '5511100000002@s.whatsapp.net', 96);
      await reaction('outra', '5511100000002@s.whatsapp.net', 94);
      // C: reagiu e REMOVEU (lápide) — interagiu, conta
      await cold('cC', '5511100000003@s.whatsapp.net', 96);
      await reaction('cC', '5511100000003@s.whatsapp.net', 90, { emoji: '' });
      // D: reação fora das 72h — não conta
      await cold('cD', '5511100000004@s.whatsapp.net', 100);
      await reaction('cD', '5511100000004@s.whatsapp.net', 20);
      // E: só a NOSSA reação — não é resposta
      await cold('cE', '5511100000005@s.whatsapp.net', 96);
      await reaction('cE', '5511100000005@s.whatsapp.net', 95, {
        fromMe: true,
        senderKey: 'me',
      });
      // F: reação a outra mensagem ANTES do cold (conversa antiga) — não conta
      await cold('cF', '5511100000006@s.whatsapp.net', 96);
      await reaction('velha', '5511100000006@s.whatsapp.net', 97);
      // G: reação com chatJid @lid NÃO resolvido a um follow-up NOSSO (não-cold) do chat → conta
      await cold('cG', '5511100000007@s.whatsapp.net', 96);
      await prisma.waMessage.create({
        data: {
          id: 'e22r-fuG',
          sessionId: replySession,
          keyId: 'fuG',
          chatJid: '5511100000007@s.whatsapp.net',
          fromMe: true,
          source: 'api',
          type: 'text',
          text: 'follow-up',
          timestamp: hAgo(90),
        },
      });
      await reaction('fuG', '77766655544433@lid', 89);
      // H: reagiu nas 72h e REMOVEU depois (timestamp reescrito para fora; createdAt dentro) → conta
      await cold('cH', '5511100000008@s.whatsapp.net', 96);
      await reaction('cH', '5511100000008@s.whatsapp.net', 10, {
        emoji: '',
        createdAt: hAgo(90),
      });
      // K: reação a mensagem ANTIGA (linha nasceu antes do cold) trocada só depois das 72h → não conta
      await cold('cK', '5511100000011@s.whatsapp.net', 96);
      await reaction('antigaK', '5511100000011@s.whatsapp.net', 10, {
        createdAt: hAgo(200),
      });
      // I e J pelo caminho de produção (EventBus → ReactionPersister → INSERT … ON CONFLICT):
      // I = reação do contato ao cold → conta; J = a NOSSA reação ao cold → não conta.
      await cold('cI', '5511100000009@s.whatsapp.net', 96);
      await cold('cJ', '5511100000010@s.whatsapp.net', 96);
      const secAgo = (h: number) => Math.floor(hAgo(h).getTime() / 1000);
      publish(
        'message.reaction',
        {
          keyId: 'cI',
          chatJid: '5511100000009@s.whatsapp.net',
          senderJid: '5511100000009@s.whatsapp.net',
          emoji: '👍',
          fromMe: false,
          timestamp: secAgo(95),
        } satisfies ReactionPayload,
        replySession,
      );
      publish(
        'message.reaction',
        {
          keyId: 'cJ',
          chatJid: '5511100000010@s.whatsapp.net',
          senderJid: '5511000000000:7@s.whatsapp.net',
          emoji: '👍',
          fromMe: true,
          timestamp: secAgo(95),
        } satisfies ReactionPayload,
        replySession,
      );
      await until(
        () =>
          prisma.messageReaction.count({
            where: {
              sessionId: replySession,
              targetKeyId: { in: ['cI', 'cJ'] },
            },
          }),
        (n) => n === 2,
      );
    });
    afterAll(() => removeSession(app, replySession));

    it('responded = A + B + C + G + H + I (ao cold, no chat, lápide, @lid a follow-up, removida depois, via EventBus)', async () => {
      const res = await inject(app, {
        method: 'GET',
        url: `/api/observability/reply-rate/${replySession}?window=7`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      const m = res.json();
      expect(m.coldMature).toBe(11);
      expect(m.responded).toBe(6);
      expect(m.replyRate).toBeCloseTo(6 / 11, 5);
    });
  });

  it('retenção: reação mais velha que RETENTION_MESSAGES_DAYS (90) é purgada; a recente fica', async () => {
    const mk = (id: string, daysAgo: number) =>
      prisma.messageReaction.create({
        data: {
          id,
          sessionId,
          chatJid: peer,
          targetKeyId: id,
          senderKey: 'peer',
          senderJid: peer,
          emoji: '👍',
          timestamp: new Date(Date.now() - daysAgo * 86_400_000),
          createdAt: new Date(Date.now() - daysAgo * 86_400_000),
        },
      });
    await mk('ret-velha', 91);
    await mk('ret-nova', 10);
    await app.get(RetentionService).sweep();
    const left = await prisma.messageReaction.findMany({
      where: { sessionId, targetKeyId: { in: ['ret-velha', 'ret-nova'] } },
      select: { targetKeyId: true },
    });
    expect(left.map((r) => r.targetKeyId)).toEqual(['ret-nova']);
  });

  it('feed da caixa única traz o status (ACK) das enviadas — P-072', async () => {
    const chat = '5511977777777@s.whatsapp.net';
    publish('message', {
      keyId: 'K1',
      chatJid: chat,
      senderJid: null,
      fromMe: true,
      type: 'text',
      text: 'enviada pela API',
      timestamp: nowSec(),
      source: 'api',
    } satisfies MessagePayload);
    await until(
      () => prisma.waMessage.findFirst({ where: { sessionId, keyId: 'K1' } }),
      (r) => !!r,
    );
    publish('message.ack', {
      keyId: 'K1',
      chatJid: chat,
      fromMe: true,
      status: 'delivered',
      timestamp: nowSec(),
    });
    await until(
      () => prisma.waMessage.findFirst({ where: { sessionId, keyId: 'K1' } }),
      (r) => r?.status === 'delivered',
    );
    const res = await inject(app, {
      method: 'GET',
      url: `/api/inbox/messages?sessions=${sessionId}&limit=300`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    const item = (res.json() as Array<Record<string, unknown>>).find(
      (i) => i.keyId === 'K1',
    );
    expect(item).toMatchObject({
      fromMe: true,
      status: 'delivered',
      isForwarded: false,
      forwardingScore: null,
    });
  });
});
