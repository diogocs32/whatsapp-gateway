import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { NewRecipientsService } from '../src/modules/observability/new-recipients.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import type {
  EngineEventName,
  MessagePayload,
  ReactionPayload,
} from '../src/modules/sessions/application/engine.port';
import { createTestApp, inject, login } from './setup-app';

// SQL/Postgres e persistidores reais; SessionManager falso impede qualquer conta/rede WhatsApp.
describe('E20 — novos destinatários sem resposta em 30 dias (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let metric: NewRecipientsService;
  let token: string;
  const sessionId = 'e20-new-recipients';
  const otherSession = 'e20-new-recipients-other';
  const sessionName = 'E20 métrica fixtures';
  const computedAt = new Date();
  const day = 86_400_000;
  const ago = (days: number) => new Date(computedAt.getTime() - days * day);
  const pn = (id: string) => `${id}@s.whatsapp.net`;
  const read = () => metric.compute(sessionId, computedAt);
  const message = (
    keyId: string,
    chatJid: string,
    timestamp: Date,
    fromMe = true,
    sid = sessionId,
    extra: { isCold?: boolean; source?: string; createdAt?: Date } = {},
  ) =>
    prisma.waMessage.create({
      data: {
        id: `${sid}-${keyId}`,
        sessionId: sid,
        keyId,
        chatJid,
        fromMe,
        timestamp,
        type: 'text',
        text: 'fixture',
        source: fromMe ? 'api' : null,
        ...extra,
      },
    });
  const reaction = (
    id: string,
    targetKeyId: string,
    chatJid: string,
    timestamp: Date,
    extra: { fromMe?: boolean; emoji?: string; createdAt?: Date } = {},
  ) =>
    prisma.messageReaction.create({
      data: {
        id,
        sessionId,
        targetKeyId,
        chatJid,
        senderKey: extra.fromMe ? 'me' : 'peer',
        fromMe: false,
        emoji: '👍',
        timestamp,
        createdAt: timestamp,
        ...extra,
      },
    });
  const mapping = (id: string, lid: string, jid: string) =>
    prisma.waContact.create({
      data: { id, sessionId, waId: id, lid, jid },
    });
  const publish = (event: EngineEventName, payload: unknown) =>
    app.get(EventBus).publish({
      name: 'wa.event',
      occurredAt: new Date(),
      payload: {
        id: `e20-${event}`,
        event,
        sessionId,
        session: sessionName,
        engine: 'baileys',
        timestamp: Date.now(),
        payload,
      },
    });
  const auth = () => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    metric = app.get(NewRecipientsService);
    token = await login(app);
  });
  beforeEach(async () => {
    await prisma.waSession.deleteMany({
      where: { id: { in: [sessionId, otherSession] } },
    });
    await prisma.waSession.createMany({
      data: [
        { id: sessionId, name: sessionName },
        { id: otherSession, name: otherSession },
      ],
    });
  });
  afterAll(async () => {
    await prisma.waSession.deleteMany({
      where: { id: { in: [sessionId, otherSession] } },
    });
    await app.close();
  });

  it('conta destinatários únicos de qualquer origem/isCold, sem duplicar follow-up/eco', async () => {
    await message('first', pn('1001'), ago(10), true, sessionId, {
      isCold: false,
    });
    await message('repeat', pn('1001'), ago(5), true, sessionId, {
      isCold: true,
      source: 'phone',
    });
    await message('repeat-echo', pn('1001'), ago(5));
    await message('second', pn('1002'), ago(1), true, sessionId, {
      source: 'phone',
    });
    expect(await read()).toMatchObject({
      newRecipients: 2,
      responded: 0,
      withoutResponse: 2,
      windowDays: 30,
      basis: 'first-observed-outbound',
      coverage: 'retained-history',
      unresolvedLidRecipients: 0,
    });
  });

  it('usa primeiro outbound do histórico retido e exclui relação inbound anterior', async () => {
    await message('old', pn('1001'), ago(31));
    await message('recent', pn('1001'), ago(1));
    await message('prior-inbound', pn('1002'), ago(40), false);
    await message('new-outbound', pn('1002'), ago(10));
    await message('only-inbound', pn('1003'), ago(1), false);
    expect(await read()).toMatchObject({
      newRecipients: 0,
      withoutResponse: 0,
    });
  });

  it('janela [computedAt−30d, computedAt] inclui limites e exclui passado/futuro', async () => {
    await message('lower', pn('1001'), ago(30));
    await message('older', pn('1002'), new Date(ago(30).getTime() - 1));
    await message('upper', pn('1003'), computedAt);
    await message('future', pn('1004'), new Date(computedAt.getTime() + 1));
    const result = await read();
    expect(result).toMatchObject({ newRecipients: 2, withoutResponse: 2 });
    expect(result.windowStartedAt).toBe(ago(30).toISOString());
    expect(result.computedAt).toBe(computedAt.toISOString());
  });

  it('resposta depois de 72h conta; entrada futura não conta; G4 continua em 72h', async () => {
    await message('late', pn('1001'), ago(20), true, sessionId, {
      isCold: true,
    });
    await message('late-response', pn('1001'), ago(1), false);
    await message('no-answer', pn('1002'), ago(10));
    await message(
      'future-response',
      pn('1002'),
      new Date(computedAt.getTime() + day),
      false,
    );
    expect(await read()).toMatchObject({
      newRecipients: 2,
      responded: 1,
      withoutResponse: 1,
    });
    const g4 = await inject(app, {
      method: 'GET',
      url: `/api/observability/reply-rate/${sessionId}?window=30`,
      headers: auth(),
    });
    expect(g4.statusCode).toBe(200);
    expect(g4.json()).toMatchObject({
      coldTotal: 1,
      coldMature: 1,
      responded: 0,
    });
  });

  it('exclui grupos, status, broadcasts, newsletters e JIDs inválidos', async () => {
    for (const [index, jid] of [
      '100@g.us',
      'status@broadcast',
      '100@broadcast',
      '100@newsletter',
      'abc@s.whatsapp.net',
      '1001',
    ].entries()) {
      await message(`excluded-${index}`, jid, ago(1));
    }
    expect(await read()).toMatchObject({ newRecipients: 0 });
  });

  it('exclui self-chat de meJid/lastMeJid, inclusive device e vínculo LID local', async () => {
    await prisma.waSession.update({
      where: { id: sessionId },
      data: { meJid: '1001:7@s.whatsapp.net', lastMeJid: pn('1002') },
    });
    await mapping('e20-self-map', '9001@lid', pn('1001'));
    await message('self-pn', '1001@c.us', ago(10));
    await message('self-lid', '9001@lid', ago(10));
    await message('self-last', '1002:3@s.whatsapp.net', ago(10));
    await message('peer', pn('1003'), ago(10));
    expect(await read()).toMatchObject({
      newRecipients: 1,
      withoutResponse: 1,
    });
  });

  it('une @c.us, PN/device e LID só com vínculo local unívoco', async () => {
    await mapping('e20-map', '9001:2@lid', pn('1001'));
    await message('phone', '1001:7@c.us', ago(10));
    await message('lid-repeat', '9001@lid', ago(5));
    await message('lid-response', '9001:4@lid', ago(1), false);
    expect(await read()).toMatchObject({
      newRecipients: 1,
      responded: 1,
      unresolvedLidRecipients: 0,
    });
  });

  it('LID antigo mapeado impede recontar PN recente como novo', async () => {
    await mapping('e20-old-map', '9001@lid', pn('1001'));
    await message('old-lid', '9001@lid', ago(40));
    await message('new-pn', pn('1001'), ago(1));
    expect(await read()).toMatchObject({ newRecipients: 0 });
  });

  it('LID desconhecido/conflitante fica separado e não infere 9º dígito BR', async () => {
    await mapping('e20-conflict-1', '9001@lid', pn('1001'));
    await mapping('e20-conflict-2', '9001@lid', pn('1002'));
    await message('conflict-lid', '9001@lid', ago(10));
    await message('unknown-lid', '9002@lid', ago(10));
    await message('with-nine', pn('5511999990001'), ago(10));
    await message('without-nine', pn('551199990001'), ago(10));
    expect(await read()).toMatchObject({
      newRecipients: 4,
      withoutResponse: 4,
      unresolvedLidRecipients: 2,
    });
  });

  it('não cruza mensagens nem mapeamentos de outra sessão', async () => {
    await message('old-other', pn('1001'), ago(40), true, otherSession);
    await message('answer-other', pn('1001'), ago(1), false, otherSession);
    await prisma.waContact.create({
      data: {
        id: 'e20-other-map',
        sessionId: otherSession,
        waId: '9001@lid',
        lid: '9001@lid',
        jid: pn('1001'),
      },
    });
    await message('ours-pn', pn('1001'), ago(10));
    await message('ours-lid', '9001@lid', ago(10));
    expect(await read()).toMatchObject({
      newRecipients: 2,
      responded: 0,
      unresolvedLidRecipients: 1,
    });
  });

  it('conta reação/lápide do contato ao outbound ou follow-up, mesmo com LID não resolvido', async () => {
    await message('first', pn('1001'), ago(10));
    await message('follow-up', pn('1001'), ago(5));
    // Relógio de quem reagiu anterior ao envio: o alvo prova a ordem causal.
    await reaction('e20-target-lid', 'follow-up', '9001@lid', ago(20), {
      emoji: '',
      createdAt: ago(4),
    });
    await message('second', pn('1002'), ago(10));
    await reaction('e20-removed', 'second', pn('1002'), ago(1), {
      emoji: '',
      createdAt: ago(9),
    });
    expect(await read()).toMatchObject({ newRecipients: 2, responded: 2 });
  });

  it('reação no mesmo chat sem alvo retido é resposta; reação anterior exclui nova relação', async () => {
    await message('first', pn('1001'), ago(10));
    await reaction('e20-missing-target', 'missing', pn('1001'), ago(1));
    await reaction('e20-prior-reaction', 'purged', pn('1002'), ago(20));
    await message('existing-relation', pn('1002'), ago(10));
    expect(await read()).toMatchObject({ newRecipients: 1, responded: 1 });
  });

  it('reação LID sem vínculo não atribui alvo com keyId colidido entre dois destinatários', async () => {
    await message('collision-first', pn('1001'), ago(10));
    await message('collision-second', pn('1002'), ago(10));
    await prisma.waMessage.updateMany({
      where: { sessionId },
      data: { keyId: 'same-target' },
    });
    await reaction('e20-collision-reaction', 'same-target', '9001@lid', ago(1));
    expect(await read()).toMatchObject({
      newRecipients: 2,
      responded: 0,
      withoutResponse: 2,
    });
  });

  it('keyId duplicado no mesmo destinatário continua unívoco para reação LID', async () => {
    await message('same-chat-first', pn('1001'), ago(10));
    await message('same-chat-echo', '1001:7@c.us', ago(10));
    await prisma.waMessage.updateMany({
      where: { sessionId },
      data: { keyId: 'same-target' },
    });
    await reaction('e20-same-chat-reaction', 'same-target', '9001@lid', ago(1));
    expect(await read()).toMatchObject({
      newRecipients: 1,
      responded: 1,
      withoutResponse: 0,
    });
  });

  it('keyId colidido ainda permite resposta com PN do chat conhecido', async () => {
    await message('known-first', pn('1001'), ago(10));
    await message('known-second', pn('1002'), ago(10));
    await prisma.waMessage.updateMany({
      where: { sessionId },
      data: { keyId: 'same-target' },
    });
    await reaction('e20-known-collision', 'same-target', pn('1001'), ago(1));
    expect(await read()).toMatchObject({
      newRecipients: 2,
      responded: 1,
      withoutResponse: 1,
    });
  });

  it('colisão do keyId com inbound de outro destinatário impede atribuir reação LID', async () => {
    await message('collision-outbound', pn('1001'), ago(10));
    await message('collision-inbound', pn('1002'), ago(9), false);
    await prisma.waMessage.updateMany({
      where: { sessionId },
      data: { keyId: 'same-target' },
    });
    await reaction('e20-inbound-collision', 'same-target', '9001@lid', ago(1));
    expect(await read()).toMatchObject({
      newRecipients: 1,
      responded: 0,
      withoutResponse: 1,
    });
  });

  it('colisão do keyId com self-chat também impede atribuir reação LID', async () => {
    await prisma.waSession.update({
      where: { id: sessionId },
      data: { meJid: pn('1002') },
    });
    await message('collision-peer', pn('1001'), ago(10));
    await message('collision-self', pn('1002'), ago(10));
    await prisma.waMessage.updateMany({
      where: { sessionId },
      data: { keyId: 'same-target' },
    });
    await reaction('e20-self-collision', 'same-target', '9001@lid', ago(1));
    expect(await read()).toMatchObject({
      newRecipients: 1,
      responded: 0,
      withoutResponse: 1,
    });
  });

  it.each([-1, 0, 1])(
    'inbound no mesmo segundo conta interação com createdAt deslocado %s segundo',
    async (offset) => {
      const at = new Date(Math.floor(ago(10).getTime() / 1000) * 1000);
      await message('same-second-outbound', pn('1001'), at, true, sessionId, {
        createdAt: at,
      });
      await message('same-second-inbound', pn('1001'), at, false, sessionId, {
        createdAt: new Date(at.getTime() + offset * 1000),
      });
      expect(await read()).toMatchObject({
        newRecipients: 1,
        responded: 1,
        withoutResponse: 0,
      });
    },
  );

  it('inbound em segundo anterior continua excluindo relação prévia mesmo com ingestão posterior', async () => {
    const at = new Date(Math.floor(ago(10).getTime() / 1000) * 1000);
    await message('prior-outbound', pn('1001'), at, true, sessionId, {
      createdAt: at,
    });
    await message(
      'prior-inbound',
      pn('1001'),
      new Date(at.getTime() - 1000),
      false,
      sessionId,
      { createdAt: new Date(at.getTime() + 1000) },
    );
    expect(await read()).toMatchObject({
      newRecipients: 0,
      responded: 0,
      withoutResponse: 0,
    });
  });

  it('reação nossa, de outro PN ou inteiramente futura não é resposta', async () => {
    await message('first', pn('1001'), ago(10));
    await reaction('e20-own', 'first', pn('1001'), ago(1), { fromMe: true });
    await reaction('e20-wrong-chat', 'first', pn('1002'), ago(1));
    await message('future-target', pn('1003'), ago(10));
    await reaction(
      'e20-future',
      'future-target',
      pn('1003'),
      new Date(computedAt.getTime() + day),
    );
    expect(await read()).toMatchObject({ newRecipients: 2, responded: 0 });
  });

  it('endpoint autenticado aceita nome/id, não expõe contatos e não grava estado/snapshot', async () => {
    await message('first', pn('1001'), ago(1));
    const url = `/api/observability/new-recipients/${encodeURIComponent(sessionName)}`;
    expect((await inject(app, { method: 'GET', url })).statusCode).toBe(401);
    const response = await inject(app, { method: 'GET', url, headers: auth() });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ sessionId, newRecipients: 1 });
    expect(response.json()).not.toHaveProperty('recipients');
    expect(JSON.stringify(response.json())).not.toContain(pn('1001'));
    expect(
      (
        await inject(app, {
          method: 'GET',
          url: '/api/observability/new-recipients/does-not-exist',
          headers: auth(),
        })
      ).statusCode,
    ).toBe(404);
    expect(await prisma.sessionMetric.count({ where: { sessionId } })).toBe(0);
    expect(await prisma.sessionGuardrail.count({ where: { sessionId } })).toBe(
      0,
    );
    expect(await prisma.sendIntent.count({ where: { sessionId } })).toBe(0);
  });

  it('EventBus → MessagePersister preserva resposta recebida no mesmo segundo do envio', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    publish('message', {
      keyId: 'same-second-event-outbound',
      chatJid: pn('1001'),
      fromMe: true,
      type: 'text',
      text: 'fixture envio',
      timestamp,
      source: 'api',
    } satisfies MessagePayload);
    await expect
      .poll(() => prisma.waMessage.count({ where: { sessionId } }))
      .toBe(1);
    expect(await metric.compute(sessionId)).toMatchObject({
      withoutResponse: 1,
    });
    publish('message', {
      keyId: 'same-second-event-inbound',
      chatJid: pn('1001'),
      fromMe: false,
      type: 'text',
      text: 'fixture resposta',
      timestamp,
    } satisfies MessagePayload);
    await expect
      .poll(() => prisma.waMessage.count({ where: { sessionId } }))
      .toBe(2);
    expect(await metric.compute(sessionId)).toMatchObject({
      newRecipients: 1,
      responded: 1,
      withoutResponse: 0,
    });
  });

  it('EventBus → MessagePersister/ReactionPersister muda a métrica sem criar mensagem de reação', async () => {
    const at = Math.floor(Date.now() / 1000);
    publish('message', {
      keyId: 'event-first',
      chatJid: pn('1001'),
      fromMe: true,
      type: 'text',
      text: 'fixture',
      timestamp: at,
      source: 'phone',
    } satisfies MessagePayload);
    await expect
      .poll(() => prisma.waMessage.count({ where: { sessionId } }))
      .toBe(1);
    expect(await metric.compute(sessionId)).toMatchObject({
      withoutResponse: 1,
    });
    publish('message.reaction', {
      keyId: 'event-first',
      chatJid: pn('1001'),
      senderJid: pn('1001'),
      fromMe: false,
      emoji: '👍',
      timestamp: at + 1,
    } satisfies ReactionPayload);
    await expect
      .poll(() => prisma.messageReaction.count({ where: { sessionId } }))
      .toBe(1);
    expect(await metric.compute(sessionId)).toMatchObject({
      newRecipients: 1,
      responded: 1,
      withoutResponse: 0,
    });
    expect(await prisma.waMessage.count({ where: { sessionId } })).toBe(1);
    expect(await prisma.sessionGuardrail.count({ where: { sessionId } })).toBe(
      0,
    );
  });
});
