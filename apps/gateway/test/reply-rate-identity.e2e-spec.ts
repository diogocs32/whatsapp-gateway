import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { GuardrailService } from '../src/modules/guardrail/guardrail.service';
import type { GuardrailState } from '../src/modules/guardrail/guardrail.service';
import { ReplyRateService } from '../src/modules/observability/reply-rate.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import type { EventHandler } from '../src/shared-kernel/event-bus/event-bus';
import { createTestApp, fakeSessionManager, inject, login } from './setup-app';

// SQL/Postgres, persistência, HTTP e decisão G5 reais. Sessões criadas somente pelo Prisma,
// STOPPED/autostart=false; o SessionManager falso não inicia engine nem consulta o WhatsApp.
describe('E21/P-103 — identidade da reação e evidência ambígua no G4/G5', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let metric: ReplyRateService;
  let guardrail: GuardrailService;
  let token: string;
  let originalEnforce: boolean;
  let cohortSize: number;
  let seq = 0;
  const sessionId = 'e21-reply-identity';
  const sessionName = 'E21 reply-rate fixtures';
  const otherSession = 'e21-reply-identity-other';
  const fleetSession = 'e21-reply-identity-fleet';
  const ids = [sessionId, otherSession, fleetSession];
  const pnA = '1001@s.whatsapp.net';
  const pnB = '1002@s.whatsapp.net';
  const lid = '8001@lid';
  const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000);
  const auth = () => ({
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  });
  const sendText = vi.fn(async () => ({ keyId: 'e21-fake-send', jid: pnA }));
  let events: Array<{ sessionId: string; event: string }> = [];
  const onEvent: EventHandler = ({ payload }) => {
    const envelope = payload as { sessionId: string; event: string };
    if (ids.includes(envelope.sessionId)) events.push(envelope);
  };

  const message = (
    keyId: string,
    chatJid: string,
    hoursAgo = 96,
    extra: {
      sessionId?: string;
      fromMe?: boolean;
      isCold?: boolean;
      status?: string;
    } = {},
  ) =>
    prisma.waMessage.create({
      data: {
        id: `e21-message-${++seq}`,
        sessionId,
        keyId,
        chatJid,
        fromMe: true,
        isCold: false,
        source: 'api',
        type: 'text',
        text: 'fixture',
        timestamp: ago(hoursAgo),
        ...extra,
      },
    });
  const cold = (keyId: string, chatJid: string, sid = sessionId) =>
    message(keyId, chatJid, 96, { isCold: true, sessionId: sid });
  const reaction = (
    targetKeyId: string,
    chatJid = lid,
    hoursAgo = 95,
    extra: {
      sessionId?: string;
      fromMe?: boolean;
      emoji?: string;
      createdAt?: Date;
    } = {},
  ) =>
    prisma.messageReaction.create({
      data: {
        id: `e21-reaction-${++seq}`,
        sessionId,
        targetKeyId,
        chatJid,
        senderKey: extra.fromMe ? 'me' : 'peer',
        senderJid: chatJid,
        fromMe: false,
        emoji: '👍',
        timestamp: ago(hoursAgo),
        createdAt: ago(hoursAgo),
        ...extra,
      },
    });
  const alias = (jid: string, lidJid = lid, sid = sessionId) =>
    prisma.waContact.create({
      data: {
        id: `e21-contact-${++seq}`,
        sessionId: sid,
        waId: `e21-contact-${seq}`,
        lid: lidJid,
        jid,
      },
    });
  const read = () => metric.compute(sessionId, 7);
  const httpMetric = async (ref = sessionId, window = 7) => {
    const res = await inject(app, {
      method: 'GET',
      url: `/api/observability/reply-rate/${encodeURIComponent(ref)}?window=${window}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    return res.json();
  };
  const seedState = (
    state: GuardrailState,
    extra: { reason?: string; cooldownAte?: Date } = {},
  ) =>
    prisma.sessionGuardrail.create({
      data: {
        id: `e21-guardrail-${++seq}`,
        sessionId,
        state,
        reason: 'fixture de estado anterior',
        eventTs: ago(200),
        ...extra,
      },
    });
  const ambiguousPair = async (branch: 'direct' | 'followup' = 'direct') => {
    await cold(branch === 'direct' ? 'shared' : 'cold-a', pnA);
    await cold(branch === 'direct' ? 'shared' : 'cold-b', pnB);
    if (branch === 'followup') {
      await message('shared', pnA, 94);
      await message('shared', pnB, 94);
    }
    await reaction('shared', lid, 93);
  };
  const cohort = async (confirmed: number, sid = sessionId) => {
    for (let i = 0; i < cohortSize; i++) {
      const chat = `${2000 + i}@s.whatsapp.net`;
      await cold(`cohort-${i}`, chat, sid);
      if (i < confirmed) {
        await message(`inbound-${i}`, chat, 95, {
          fromMe: false,
          sessionId: sid,
        });
      }
    }
  };
  const settleEvents = () =>
    new Promise<void>((resolve) => setImmediate(resolve));

  beforeAll(async () => {
    app = await createTestApp({ ...fakeSessionManager, sendText });
    prisma = app.get(PrismaService);
    metric = app.get(ReplyRateService);
    guardrail = app.get(GuardrailService);
    token = await login(app);
    originalEnforce = guardrail.isEnforcing();
    (guardrail as unknown as { enforce: boolean }).enforce = true;
    cohortSize = Math.max(20, (await guardrail.getConfig()).nmin);
    app.get(EventBus).subscribe('wa.event', onEvent);
  });
  beforeEach(async () => {
    await prisma.waSession.deleteMany({ where: { id: { in: ids } } });
    await prisma.waSession.createMany({
      data: ids.map((id) => ({
        id,
        name: id === sessionId ? sessionName : id,
        meJid: '9999@s.whatsapp.net',
        status: 'STOPPED',
        autostart: false,
      })),
    });
    events = [];
    sendText.mockClear();
  });
  afterAll(async () => {
    if (app) app.get(EventBus).unsubscribe('wa.event', onEvent);
    if (guardrail)
      (guardrail as unknown as { enforce: boolean }).enforce = originalEnforce;
    if (prisma)
      await prisma.waSession.deleteMany({ where: { id: { in: ids } } });
    if (app) await app.close();
  });

  it.each(['direct', 'followup'] as const)(
    '%s: dois chats e uma reação LID não autorizam duas respostas',
    async (branch) => {
      await ambiguousPair(branch);
      for (const window of [7, 30]) {
        expect(await httpMetric(sessionName, window)).toMatchObject({
          sessionId,
          coldMature: 2,
          responded: 0,
          ambiguousMature: 2,
          replyRate: 0,
          reliable: false,
        });
      }
      expect(await prisma.messageReaction.count({ where: { sessionId } })).toBe(
        1,
      );
    },
  );

  it.each(['direct', 'followup'] as const)(
    '%s: chat PN explícito desambigua a chave e responde somente seu cold',
    async (branch) => {
      await ambiguousPair(branch);
      await prisma.messageReaction.updateMany({
        where: { sessionId },
        data: { chatJid: '1001:7@c.us' },
      });
      expect(await read()).toMatchObject({
        coldMature: 2,
        responded: 1,
        ambiguousMature: 0,
      });
    },
  );

  it.each(['direct', 'followup'] as const)(
    '%s: LID sem alias aceita alvo com um único chat na sessão',
    async (branch) => {
      await cold('cold', pnA);
      if (branch === 'followup') await message('followup', pnA, 94);
      await reaction(branch === 'direct' ? 'cold' : 'followup');
      expect(await read()).toMatchObject({
        coldMature: 1,
        responded: 1,
        ambiguousMature: 0,
      });
    },
  );

  it('duplicatas do mesmo alvo/chat normalizado não criam colisão', async () => {
    await cold('same', pnA);
    await message('same', '1001:7@c.us', 120);
    await message('same', '1001:8@s.whatsapp.net', 120, { fromMe: false });
    await reaction('same');
    expect(await read()).toMatchObject({ responded: 1, ambiguousMature: 0 });
  });

  it.each(['7001@g.us', '7001@newsletter'])(
    'alvo único em %s não autoriza inferência de resposta LID',
    async (chat) => {
      // Um registro legado pode carregar cold em grupo/canal. A chave única desses chats
      // não é evidência de identidade pessoal para uma reação que chegou com chat LID.
      await cold('unique-non-personal', chat);
      await reaction('unique-non-personal');
      expect(await read()).toMatchObject({
        coldMature: 1,
        responded: 0,
        ambiguousMature: 1,
      });
    },
  );

  it('alias LID unívoco normaliza device/@c.us e ignora duplicatas do mesmo PN', async () => {
    await ambiguousPair();
    await alias('1001:7@c.us', '8001:2@lid');
    await alias(pnA);
    expect(await read()).toMatchObject({ responded: 1, ambiguousMature: 0 });
  });

  it('aliases conflitantes não autorizam inferência nem uma resposta artificial', async () => {
    await ambiguousPair();
    await alias(pnA);
    await alias(pnB);
    expect(await read()).toMatchObject({ responded: 0, ambiguousMature: 2 });
  });

  it('alias PN inequívoco divergente não é ignorado por keyId único', async () => {
    await cold('unique', pnA);
    await alias(pnB);
    await reaction('unique');
    // Vínculo local unívoco identifica outro chat: é a mesma evidência do PN explícito.
    expect(await read()).toMatchObject({ responded: 0, ambiguousMature: 0 });
  });

  it('PN explícito divergente não muda de conversa pelo alvo', async () => {
    await cold('unique', pnA);
    await reaction('unique', pnB);
    expect(await read()).toMatchObject({ responded: 0, ambiguousMature: 0 });
  });

  it.each([
    { kind: 'inbound', chat: pnB, fromMe: false },
    { kind: 'self-chat', chat: '9999@s.whatsapp.net', fromMe: true },
    { kind: 'grupo', chat: '7001@g.us', fromMe: false },
  ])(
    'colisão com $kind fora da janela também invalida o alvo LID',
    async ({ chat, fromMe }) => {
      await cold('shared', pnA);
      // Fora inclusive da janela 30d: a unicidade não pode filtrar origem/tempo/tipo de chat.
      await message('shared', chat, 1000, { fromMe });
      await reaction('shared');
      expect(await read()).toMatchObject({ responded: 0, ambiguousMature: 1 });
    },
  );

  it('chaves e aliases de outra sessão não contaminam a inferência local', async () => {
    await cold('shared', pnA);
    await cold('shared', pnB, otherSession);
    await alias(pnB, lid, otherSession);
    await reaction('shared');
    await reaction('shared', pnB, 95, { sessionId: otherSession });
    expect(await read()).toMatchObject({ responded: 1, ambiguousMature: 0 });
  });

  it('reação no chat explícito após cold conta mesmo sem mensagem-alvo retida', async () => {
    await cold('cold', pnA);
    await reaction('unavailable', '1001:4@c.us');
    expect(await read()).toMatchObject({ responded: 1, ambiguousMature: 0 });
  });

  it.each([
    { kind: 'nossa reação', hours: 95, fromMe: true },
    { kind: 'reação após 72h', hours: 20, fromMe: false },
  ])('$kind não cria resposta nem ambiguidade', async ({ hours, fromMe }) => {
    await ambiguousPair();
    await prisma.messageReaction.deleteMany({ where: { sessionId } });
    await reaction('shared', lid, hours, { fromMe });
    expect(await read()).toMatchObject({ responded: 0, ambiguousMature: 0 });
  });

  it.each([100, 20])(
    'follow-up fora das 72h (%i horas atrás) não autoriza inferência LID',
    async (hours) => {
      await cold('cold', pnA);
      await message('followup', pnA, hours);
      await reaction('followup', lid, 95);
      expect(await read()).toMatchObject({ responded: 0, ambiguousMature: 0 });
    },
  );

  it('alvo inbound não pode virar follow-up nosso pela chave', async () => {
    // O ramo inbound conserva o casamento literal legado. Representações distintas isolam
    // aqui o ramo por alvo: mesmo normalizando para um só chat, t.fromMe deve ser true.
    await cold('cold', '1001:7@c.us');
    await message('inbound-target', pnA, 95, { fromMe: false });
    await reaction('inbound-target', lid, 94);
    expect(await read()).toMatchObject({ responded: 0, ambiguousMature: 0 });
  });

  it('reação ao cold único tolera relógio do contato anterior ao envio', async () => {
    await cold('cold', pnA);
    await reaction('cold', lid, 100);
    expect(await read()).toMatchObject({ responded: 1, ambiguousMature: 0 });
  });

  it('remoção tardia preserva interação original; reação antiga alterada tarde não conta', async () => {
    await cold('removed', pnA);
    await cold('old', pnB);
    await reaction('removed', pnA, 10, { emoji: '', createdAt: ago(90) });
    await reaction('missing-old-target', pnB, 10, { createdAt: ago(200) });
    expect(await read()).toMatchObject({
      coldMature: 2,
      responded: 1,
      ambiguousMature: 0,
    });
  });

  it('inbound confirmado resolve somente os colds que realmente responderam', async () => {
    await ambiguousPair();
    await message('inbound-a', pnA, 95, { fromMe: false });
    expect(await read()).toMatchObject({ responded: 1, ambiguousMature: 1 });
    await message('inbound-b', pnB, 95, { fromMe: false });
    expect(await read()).toMatchObject({ responded: 2, ambiguousMature: 0 });
  });

  it.each(['ativa', 'throttled', 'quarentena'] as const)(
    'enforce=true mantém %s e a linha/eventTs sem evento quando há evidência ambígua',
    async (state) => {
      await ambiguousPair();
      // Quarentena antiga tem taxa alta: sem a proteção seria liberada. As demais têm taxa
      // zero: sem a proteção seriam colocadas em quarentena. A amostra satisfaz Nmin.
      await cohort(state === 'quarentena' ? cohortSize : 0);
      const before = await seedState(state);
      const res = await inject(app, {
        method: 'GET',
        url: `/api/guardrail/${sessionId}`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        enforce: true,
        currentState: state,
        targetState: state,
        applied: false,
        reliable: false,
        sample: cohortSize + 2,
      });
      expect(res.json().reason).toMatch(/amb[ií]gu/i);
      expect(
        await prisma.sessionGuardrail.findUnique({ where: { sessionId } }),
      ).toEqual(before);
      const saved = await prisma.sessionMetric.findUniqueOrThrow({
        where: { sessionId_windowDays: { sessionId, windowDays: 7 } },
      });
      expect(saved.sample).toBeGreaterThanOrEqual(20);
      expect(saved.reliable).toBe(false);
      await settleEvents();
      expect(events).toEqual([]);
    },
  );

  it('snapshots ambíguos persistidos não entram na mediana da frota', async () => {
    await ambiguousPair();
    await cohort(0);
    await read();
    await cohort(Math.floor(cohortSize * 0.4), otherSession);
    await cohort(Math.floor(cohortSize * 0.8), fleetSession);
    const first = await metric.compute(otherSession, 7);
    const second = await metric.compute(fleetSession, 7);
    expect(first.reliable).toBe(true);
    expect(second.reliable).toBe(true);

    // Apenas limita o universo ao trio deste spec, sem mudar nenhuma condição da consulta
    // G5 e sem tocar snapshots de outras sessões do DB de desenvolvimento.
    const findMany = prisma.sessionMetric.findMany.bind(prisma.sessionMetric);
    const scopeFleet = vi
      .spyOn(prisma.sessionMetric, 'findMany')
      .mockImplementation((args) =>
        findMany({
          ...args,
          where: { ...args?.where, sessionId: { in: ids } },
        }),
      );
    try {
      expect(await guardrail.fleetMedianReplyRate()).toBeCloseTo(
        (first.replyRate + second.replyRate) / 2,
      );
    } finally {
      scopeFleet.mockRestore();
    }
  });

  it.each([
    { state: 'banida', reason: 'fixo' },
    { state: 'pausa_manual', reason: 'fixo' },
    { state: 'quarentena', reason: 'manual' },
    { state: 'quarentena', reason: 'cooldown' },
  ] as const)(
    '$state/$reason conserva prioridade sobre evidência ambígua',
    async ({ state, reason }) => {
      await ambiguousPair();
      await cohort(cohortSize);
      const before = await seedState(state, {
        ...(reason === 'manual'
          ? { reason: 'override manual: quarantine' }
          : {}),
        ...(reason === 'cooldown' ? { cooldownAte: ago(-12) } : {}),
      });
      const evaluated = await guardrail.evaluate(sessionId);
      expect(evaluated).toMatchObject({
        enforce: true,
        currentState: state,
        targetState: state,
        applied: false,
      });
      expect(evaluated.reason).toContain(reason);
      expect(
        await prisma.sessionGuardrail.findUnique({ where: { sessionId } }),
      ).toEqual(before);
      await settleEvents();
      expect(events).toEqual([]);
    },
  );

  it('amostra abaixo do Nmin mantém a decisão existente de aquecimento', async () => {
    const { nmin } = await guardrail.getConfig();
    if (nmin <= 2) return;
    await ambiguousPair();
    await seedState('ativa');
    expect(await guardrail.evaluate(sessionId)).toMatchObject({
      enforce: true,
      targetState: 'aquecimento',
      applied: true,
    });
    expect(
      (
        await prisma.sessionGuardrail.findUniqueOrThrow({
          where: { sessionId },
        })
      ).state,
    ).toBe('aquecimento');
    await vi.waitFor(() => {
      expect(events.filter((e) => e.event === 'session.warming')).toHaveLength(
        1,
      );
    });
  });

  it('coorte madura sem resposta e sem ambiguidade continua gerando quarentena/evento', async () => {
    await cohort(0);
    await seedState('ativa');
    expect(await guardrail.evaluate(sessionId)).toMatchObject({
      enforce: true,
      targetState: 'quarentena',
      applied: true,
      reliable: true,
      sample: cohortSize,
    });
    const persisted = await prisma.sessionGuardrail.findUniqueOrThrow({
      where: { sessionId },
    });
    expect(persisted.state).toBe('quarentena');
    expect(persisted.cooldownAte).not.toBeNull();
    await vi.waitFor(() => {
      expect(
        events.filter((e) => e.event === 'session.quarantined'),
      ).toHaveLength(1);
    });
  });

  it('sinal duro e override manual continuam efetivos; cold=false segue permitido em quarentena', async () => {
    await ambiguousPair();
    await cohort(0);
    await seedState('ativa');
    await guardrail.recordHardSignal(sessionId, 'ban');
    expect(
      (
        await prisma.sessionGuardrail.findUniqueOrThrow({
          where: { sessionId },
        })
      ).state,
    ).toBe('banida');
    await guardrail.setManualState(sessionId, 'quarantine');

    const postText = (isCold: boolean) =>
      inject(app, {
        method: 'POST',
        url: `/api/sessions/${sessionId}/messages/text`,
        headers: auth(),
        payload: {
          to: '15555550101',
          text: 'fixture sem envio real',
          cold: isCold,
        },
      });
    const blocked = await postText(true);
    expect(blocked.statusCode, JSON.stringify(blocked.json())).toBe(423);
    expect(blocked.json().code).toBe('SESSION_QUARANTINED');
    expect(sendText).not.toHaveBeenCalled();
    expect((await postText(false)).statusCode).toBe(201);
    expect(sendText).toHaveBeenCalledTimes(1);
  });
});
