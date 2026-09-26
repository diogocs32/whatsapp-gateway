import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  BufferJSON,
  generateForwardMessageContent,
  proto,
  WAMessageStubType,
  type WAMessage,
  type WAMessageUpdate,
} from '@whiskeysockets/baileys';
import { Prisma, PrismaService } from '../src/infra/prisma/prisma.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import { newId } from '../src/shared-kernel/ulid';
import { GuardrailService } from '../src/modules/guardrail/guardrail.service';
import {
  ForwardService,
  type ForwardResult,
} from '../src/modules/messaging/application/forward.service';
import {
  ForwardSourceError,
  type EngineEventName,
  type ForwardSource,
  type MessagePayload,
  type PreparedForward,
  type SendOptions,
} from '../src/modules/sessions/application/engine.port';
import { BaileysEngine } from '../src/modules/sessions/infrastructure/baileys/baileys.engine';
import {
  createTestApp,
  fakeSessionManager,
  inject,
  login,
  removeSession,
} from './setup-app';

// P-068 (etapa E24) — encaminhar mensagem: rota HTTP + banco real (wa_messages, wa_send_intents,
// guard-rail) com a engine trocada por um fake que registra cada envio (destino, opts,
// concorrência). A espera anti-ban (1–3 s) é zerada pelo spy no `sleep` do ForwardService. No fim,
// os efeitos (R6) pelo EventBus real e a cadeia completa com um BaileysEngine de verdade (socket
// falso que usa o generateForwardMessageContent da lib) — engine → EventBus → persistência.

const S = 'e24-fwd';
const OUTRA = 'e24-fwd-outra';
const MOTOR = 'e24-fwd-motor';
const RITMO_1 = 'e24-fwd-ritmo-1';
const RITMO_2 = 'e24-fwd-ritmo-2';
const SESSIONS = [S, OUTRA, MOTOR, RITMO_1, RITMO_2];

const jid = (n: string) => `${n}@s.whatsapp.net`;
const SRC_CHAT = jid('5511900000001'); // chat onde as originais chegaram
const PEER = '5511987650001'; // tem conversa: mensagem RECEBIDA nesta sessão
const PEER9_STORED = '551187650002'; // conversa gravada SEM o 9º dígito (P-023)
const PEER9 = '5511987650002';
const PEER_OUT = '5511987650003'; // só mensagens NOSSAS — não conta como conversa
const PEER_CUS = '5511987650004'; // conversa gravada pelo wwebjs (@c.us)
const NEW = '5511987650009'; // nada gravado
const NEW_OUTRA = '5511987650008'; // conversa só na OUTRA sessão
const GROUP = '120363000000000077@g.us'; // grupo com mensagem recebida
const ORIG_ID = newId(); // id interno (ULID) da original — o que o GET /messages devolve

type PrepareFn = (
  sessionId: string,
  src: ForwardSource,
) => Promise<PreparedForward>;
interface SendCall {
  sessionId: string;
  keyId: string;
  to: string;
  opts: SendOptions;
}

// Troca a engine do fakeSessionManager (restaurada no afterEach).
const mgr = fakeSessionManager as unknown as { prepareForward: PrepareFn };
const fake = {
  prepares: [] as Array<{ sessionId: string; src: ForwardSource }>,
  sends: [] as SendCall[],
  timeline: [] as string[], // envios e pausas, na ordem em que aconteceram
  inFlight: 0,
  maxInFlight: 0,
  delayMs: 0,
  prepareError: null as Error | null,
  liveScore: null as number | null,
  failTo: new Set<string>(),
};
function resetFake(): void {
  fake.prepares = [];
  fake.sends = [];
  fake.timeline = [];
  fake.inFlight = 0;
  fake.maxInFlight = 0;
  fake.delayMs = 0;
  fake.prepareError = null;
  fake.liveScore = null;
  fake.failTo = new Set();
}
const fakePrepare: PrepareFn = async (sessionId, src) => {
  fake.prepares.push({ sessionId, src });
  if (fake.prepareError) throw fake.prepareError;
  return {
    forwardingScore: fake.liveScore,
    send: async (to, opts) => {
      fake.inFlight++;
      fake.maxInFlight = Math.max(fake.maxInFlight, fake.inFlight);
      const n = fake.sends.push({
        sessionId,
        keyId: src.keyId,
        to,
        opts: { ...opts },
      });
      fake.timeline.push(`envio:${to}`);
      try {
        if (fake.delayMs) await new Promise((r) => setTimeout(r, fake.delayMs));
        if (fake.failTo.has(to)) throw new Error(`destino ${to} recusou`);
        return {
          keyId: `FWD-${n}`,
          jid: `${to}@s.whatsapp.net`,
          isForwarded: true,
          forwardingScore: (src.forwardingScore ?? 0) + 1,
        };
      } finally {
        fake.inFlight--;
      }
    },
  };
};

// Mesmo formato do encodeProto do engine (toJSON do protobufjs: bytes em base64, enum pelo nome).
const rawOf = (m: Record<string, unknown>) =>
  JSON.parse(
    JSON.stringify(proto.Message.fromObject(m), BufferJSON.replacer),
  ) as Prisma.InputJsonValue;
const nowSec = () => Math.floor(Date.now() / 1000);

describe('Encaminhar mensagem — P-068 (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let guardrail: GuardrailService;
  let token: string;
  let originalPrepare: PrepareFn;
  let sleepSpy: MockInstance<(ms: number) => Promise<void>>;
  let gapSpy: MockInstance<() => number>;

  const fwd = (msgId: string, body: unknown, sid = S) =>
    inject(app, {
      method: 'POST',
      url: `/api/sessions/${sid}/messages/${msgId}/forward`,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: body,
    });
  const resultsOf = (res: { json: () => any }) =>
    res.json().results as ForwardResult[];
  const intentCount = (sid = S) =>
    prisma.sendIntent.count({ where: { sessionId: sid } });
  const intentOf = (idempotencyKey: string, sid = S) =>
    prisma.sendIntent.findUnique({
      where: { sessionId_idempotencyKey: { sessionId: sid, idempotencyKey } },
    });
  const seedRow = (
    sid: string,
    keyId: string,
    chatJid: string,
    extra: Partial<Prisma.WaMessageUncheckedCreateInput> = {},
  ) =>
    prisma.waMessage.create({
      data: {
        id: `${sid}-${keyId}`,
        sessionId: sid,
        keyId,
        chatJid,
        senderJid: chatJid,
        fromMe: false,
        type: 'text',
        text: 'texto',
        timestamp: new Date(),
        ...extra,
      },
    });
  const publish = (sid: string, event: EngineEventName, payload: unknown) =>
    app.get(EventBus).publish({
      name: 'wa.event',
      occurredAt: new Date(),
      payload: {
        id: newId(),
        timestamp: Date.now(),
        event,
        sessionId: sid,
        session: sid,
        payload,
        engine: 'baileys',
      },
    });
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
  // setManualState ignora evento com eventTs <= o gravado (C10): 5 ms garantem a ordem.
  async function guard(action: 'quarantine' | 'activate', sid = S) {
    await new Promise((r) => setTimeout(r, 5));
    const row = await guardrail.setManualState(sid, action);
    expect(row.state).toBe(action === 'quarantine' ? 'quarentena' : 'ativa');
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    guardrail = app.get(GuardrailService);
    token = await login(app);
    for (const sid of SESSIONS) {
      await removeSession(app, sid); // cascade: mensagens, intenções e guard-rail da rodada anterior
      await prisma.waSession.create({ data: { id: sid, name: sid } });
    }
    await seedRow(S, 'E24-ORIG', SRC_CHAT, {
      id: ORIG_ID,
      text: 'oferta da semana',
    });
    await seedRow(S, 'E24-S5', SRC_CHAT, {
      isForwarded: true,
      forwardingScore: 5,
    });
    await seedRow(S, 'E24-S4', SRC_CHAT, {
      isForwarded: true,
      forwardingScore: 4,
    });
    await seedRow(S, 'E24-POLL', SRC_CHAT, {
      type: 'poll',
      text: 'Qual horário?\n• Manhã\n• Tarde',
    });
    await seedRow(S, 'E24-REV', SRC_CHAT, { revokedAt: new Date() });
    await seedRow(S, 'E24-EDIT', SRC_CHAT, { editedAt: new Date() });
    await seedRow(S, 'E24-IMG', SRC_CHAT, {
      type: 'image',
      text: null,
      mediaType: 'image',
      mimetype: 'image/jpeg',
      fileName: 'foto.jpg',
      fileSize: 1234,
      mediaKey: 'e24-fwd/E24-IMG.jpg',
    });
    // conversas (e "não conversas") dos destinos
    await seedRow(S, 'E24-PEER-IN', jid(PEER));
    await seedRow(S, 'E24-PEER9-IN', jid(PEER9_STORED));
    await seedRow(S, 'E24-PEEROUT', jid(PEER_OUT), {
      fromMe: true,
      source: 'api',
      isCold: true,
    });
    await seedRow(S, 'E24-PEERCUS-IN', `${PEER_CUS}@c.us`);
    await seedRow(S, 'E24-GROUP-IN', GROUP, {
      senderJid: jid('5511911112222'),
    });
    await seedRow(OUTRA, 'E24-OUTRA', SRC_CHAT, { id: 'e24-outra-1' });
    await seedRow(OUTRA, 'E24-OUTRA-NEW', jid(NEW_OUTRA));
    await seedRow(RITMO_1, 'R-ORIG', SRC_CHAT);
    await seedRow(RITMO_2, 'R-ORIG', SRC_CHAT);

    originalPrepare = mgr.prepareForward;
    const paced = app.get(ForwardService) as unknown as {
      sleep: (ms: number) => Promise<void>;
      gapMs: () => number;
    };
    // Sem espera real (1–3 s por envio); a pausa vira um marco na linha do tempo dos envios.
    sleepSpy = vi.spyOn(paced, 'sleep').mockImplementation(async () => {
      fake.timeline.push('pausa');
    });
    gapSpy = vi.spyOn(paced, 'gapMs'); // chama o real (1–3 s sorteado)
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    for (const sid of SESSIONS) await removeSession(app, sid);
    await app.close();
  });
  beforeEach(() => {
    resetFake();
    mgr.prepareForward = fakePrepare;
    sleepSpy.mockClear();
    gapSpy.mockClear();
  });
  afterEach(() => {
    mgr.prepareForward = originalPrepare;
  });

  describe('recusas sem efeito (F0) — nada é reservado nem enviado', () => {
    it('6 destinos → 400; nenhuma intenção, engine nem é chamada', async () => {
      const before = await intentCount();
      const res = await fwd('E24-ORIG', {
        to: [PEER, NEW, PEER_OUT, PEER_CUS, PEER9, '5511987650005'],
        idempotencyKey: 'e24-seis',
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe(
        'to: no máximo 5 destinos por encaminhamento',
      );
      expect(fake.prepares).toHaveLength(0);
      expect(fake.sends).toHaveLength(0);
      expect(await intentCount()).toBe(before);
    });

    it('5 destinos (o teto) passa → 201 com 5 envios', async () => {
      const res = await fwd('E24-ORIG', {
        to: [PEER, NEW, PEER_OUT, PEER_CUS, PEER9],
      });
      expect(res.statusCode).toBe(201);
      expect(fake.sends).toHaveLength(5);
    });

    it('to vazio, ausente ou fora de lista → 400', async () => {
      const vazio = await fwd('E24-ORIG', { to: [] });
      expect(vazio.statusCode).toBe(400);
      expect(vazio.json().message).toBe('to: informe ao menos 1 destino');
      const ausente = await fwd('E24-ORIG', {});
      expect(ausente.statusCode).toBe(400);
      expect(ausente.json().message).toBe(
        'to é obrigatório (lista de 1 a 5 destinos)',
      );
      const texto = await fwd('E24-ORIG', { to: PEER });
      expect(texto.statusCode).toBe(400);
      expect(fake.prepares).toHaveLength(0);
    });

    it('destinos repetidos (formatação e 9º dígito) → 400 sem reservar', async () => {
      const before = await intentCount();
      for (const to of [
        ['5511912345678', '+55 (11) 91234-5678'],
        ['5511912345678', '551112345678'], // mesmo número sem o 9º dígito
        ['5511912345678@s.whatsapp.net', '5511912345678:7@s.whatsapp.net'],
      ]) {
        const res = await fwd('E24-ORIG', { to, idempotencyKey: 'e24-dup' });
        expect(res.statusCode).toBe(400);
        expect(res.json().message).toContain('Destinos repetidos');
      }
      expect(fake.prepares).toHaveLength(0);
      expect(await intentCount()).toBe(before);
    });

    it('canal (@newsletter), status (@broadcast) e número inválido → 400', async () => {
      const canal = await fwd('E24-ORIG', {
        to: ['120363000000000001@newsletter'],
      });
      expect(canal.statusCode).toBe(400);
      expect(canal.json().message).toContain('@newsletter');
      const status = await fwd('E24-ORIG', { to: ['status@broadcast'] });
      expect(status.statusCode).toBe(400);
      const curto = await fwd('E24-ORIG', { to: ['12345'] });
      expect(curto.statusCode).toBe(400);
      expect(curto.json().message).toContain('Destino inválido');
      expect(fake.prepares).toHaveLength(0);
    });

    it('msgId desconhecido → 404', async () => {
      const res = await fwd('NAO-EXISTE', { to: [PEER] });
      expect(res.statusCode).toBe(404);
      expect(fake.prepares).toHaveLength(0);
    });

    it('mensagem da OUTRA sessão → 404 (pelo keyId e pelo id interno)', async () => {
      for (const ref of ['E24-OUTRA', 'e24-outra-1']) {
        const res = await fwd(ref, { to: [PEER] });
        expect(res.statusCode).toBe(404);
      }
      expect(fake.prepares).toHaveLength(0);
    });

    it('aceita o id interno (ULID) e o keyId — a engine recebe a mesma original', async () => {
      for (const ref of [ORIG_ID, 'E24-ORIG']) {
        const res = await fwd(ref, { to: [PEER] });
        expect(res.statusCode).toBe(201);
      }
      expect(fake.prepares.map((p) => [p.sessionId, p.src.keyId])).toEqual([
        [S, 'E24-ORIG'],
        [S, 'E24-ORIG'],
      ]);
    });

    it('"encaminhada com frequência" (score 5): 2 destinos → 400 FORWARD_LIMIT sem intenção; 1 destino → 201', async () => {
      const res = await fwd('E24-S5', {
        to: [PEER, NEW],
        idempotencyKey: 'e24-s5-lim',
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('FORWARD_LIMIT');
      expect(fake.prepares).toHaveLength(0);
      expect(await intentOf('e24-s5-lim')).toBeNull();
      const um = await fwd('E24-S5', { to: [PEER] });
      expect(um.statusCode).toBe(201);
      expect(fake.sends).toHaveLength(1);
    });

    it('score 4 (abaixo do limiar) com 2 destinos → 201', async () => {
      const res = await fwd('E24-S4', { to: [PEER, NEW] });
      expect(res.statusCode).toBe(201);
      expect(resultsOf(res).every((r) => r.ok)).toBe(true);
      expect(fake.sends).toHaveLength(2);
    });

    it('enquete → 400 FORWARD_UNSUPPORTED mesmo em quarentena com destino cold (não 423), sem intenção', async () => {
      await guard('quarantine');
      try {
        const res = await fwd('E24-POLL', {
          to: [NEW],
          idempotencyKey: 'e24-poll-k',
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().code).toBe('FORWARD_UNSUPPORTED');
        expect(res.json().message).toContain('enquete');
        expect(await intentOf('e24-poll-k')).toBeNull();
        expect(fake.prepares).toHaveLength(0);
      } finally {
        await guard('activate');
      }
    });

    it('apagada e editada → 400 FORWARD_UNSUPPORTED (a original guardada é a versão velha)', async () => {
      const apagada = await fwd('E24-REV', { to: [PEER] });
      expect(apagada.statusCode).toBe(400);
      expect(apagada.json()).toMatchObject({ code: 'FORWARD_UNSUPPORTED' });
      expect(apagada.json().message).toContain('apagada');
      const editada = await fwd('E24-EDIT', { to: [PEER] });
      expect(editada.statusCode).toBe(400);
      expect(editada.json()).toMatchObject({ code: 'FORWARD_UNSUPPORTED' });
      expect(editada.json().message).toContain('editada');
      expect(fake.prepares).toHaveLength(0);
    });

    it('sem token → 401', async () => {
      const res = await inject(app, {
        method: 'POST',
        url: `/api/sessions/${S}/messages/E24-ORIG/forward`,
        headers: { 'content-type': 'application/json' },
        payload: { to: [PEER] },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('cold, transporte e chave por destino', () => {
    it('[PEER, NEW] sem cold → cold só no destino sem conversa; sem chave → idempotencyKey null e nenhuma intenção', async () => {
      const before = await intentCount();
      const res = await fwd('E24-ORIG', { to: [PEER, NEW] });
      expect(res.statusCode).toBe(201);
      const [a, b] = resultsOf(res);
      expect(a).toMatchObject({
        target: PEER,
        to: jid(PEER),
        ok: true,
        deduped: false,
        cold: false,
        idempotencyKey: null,
        isForwarded: true,
        forwardingScore: 1,
      });
      expect(a.id).toMatch(/^FWD-/);
      expect(b).toMatchObject({ target: NEW, ok: true, cold: true });
      expect(fake.sends.map((s) => [s.to, s.opts])).toEqual([
        [PEER, { cold: false, idempotencyKey: null }],
        [NEW, { cold: true, idempotencyKey: null }],
      ]);
      expect(await intentCount()).toBe(before);
    });

    it('cold:false não tira o cold de quem não tem conversa; cold:true sobe o de quem tem', async () => {
      const semConversa = await fwd('E24-ORIG', { to: [NEW], cold: false });
      expect(resultsOf(semConversa)[0].cold).toBe(true);
      const comConversa = await fwd('E24-ORIG', { to: [PEER], cold: true });
      expect(resultsOf(comConversa)[0].cold).toBe(true);
      expect(fake.sends.map((s) => s.opts.cold)).toEqual([true, true]);
    });

    it('só mensagens NOSSAS no chat, ou conversa só em OUTRA sessão, não é conversa → cold à força', async () => {
      const res = await fwd('E24-ORIG', { to: [PEER_OUT, NEW_OUTRA] });
      expect(res.statusCode).toBe(201);
      expect(resultsOf(res).map((r) => r.cold)).toEqual([true, true]);
    });

    // Revisão da E24: o transporte é SEMPRE o número pedido e a conversa só vale no número EXATO —
    // o "gêmeo" do 9º dígito pode ser outra pessoa (11 9 4123-4567 × fixo 11 4123-4567): casar com
    // ele mandaria para o número errado e pularia a trava cold. Sem conversa no número exato = cold.
    it('transporte = o número pedido; conversa só no número EXATO (@c.us e grupo quentes; 9º dígito = cold)', async () => {
      const res = await fwd('E24-ORIG', { to: [PEER9, PEER_CUS, GROUP] });
      expect(res.statusCode).toBe(201);
      expect(fake.sends.map((s) => [s.to, s.opts.cold])).toEqual([
        [PEER9, true], // conversa gravada só na forma sem o 9 → não conta (pode ser outra pessoa)
        [PEER_CUS.split('@')[0], false], // @c.us exato: quente, transporte em dígitos
        [GROUP, false],
      ]);
      expect(resultsOf(res).map((r) => r.target)).toEqual([
        PEER9,
        PEER_CUS,
        GROUP,
      ]);
    });

    it('jid com aparelho vale como o número; @lid sem conversa vai como está e é cold', async () => {
      const res = await fwd('E24-ORIG', {
        to: [`${PEER}:12@s.whatsapp.net`, '99887766554433@lid'],
      });
      expect(res.statusCode).toBe(201);
      expect(fake.sends.map((s) => [s.to, s.opts.cold])).toEqual([
        [PEER, false],
        ['99887766554433@lid', true],
      ]);
    });

    it('com idempotencyKey: cada envio leva `<chave>:<destino>`, results também; intenções sent', async () => {
      const res = await fwd('E24-ORIG', {
        to: [PEER, '+55 (11) 98765-0009'],
        idempotencyKey: 'e24-k',
      });
      expect(res.statusCode).toBe(201);
      const keys = [`e24-k:${PEER}`, `e24-k:${NEW}`];
      expect(fake.sends.map((s) => s.opts.idempotencyKey)).toEqual(keys);
      const results = resultsOf(res);
      expect(results.map((r) => r.idempotencyKey)).toEqual(keys);
      expect((await intentOf('e24-k'))?.status).toBe('sent');
      for (const [i, key] of keys.entries()) {
        expect(await intentOf(key)).toMatchObject({
          status: 'sent',
          keyId: results[i].id,
          chatJid: results[i].to,
        });
      }
    });

    it('a engine recebe a original como gravada (tipo, mídia do S3, score)', async () => {
      const res = await fwd('E24-IMG', { to: [PEER] });
      expect(res.statusCode).toBe(201);
      expect(fake.prepares).toEqual([
        {
          sessionId: S,
          src: {
            keyId: 'E24-IMG',
            chatJid: SRC_CHAT,
            fromMe: false,
            type: 'image',
            text: null,
            mediaType: 'image',
            mimetype: 'image/jpeg',
            fileName: 'foto.jpg',
            fileSize: 1234,
            mediaKey: 'e24-fwd/E24-IMG.jpg',
            forwardingScore: null,
            timestamp: expect.any(Number),
          },
        },
      ]);
    });
  });

  describe('revisão da E24 — replay antes da recusa e limpeza em erro inesperado', () => {
    // O lote foi entregue mas a resposta se perdeu; o contato apagou a original depois. A repetição
    // tem de ser 201 `deduped` (senão o n8n registra falha e o operador reencaminha à mão).
    it('repetir um lote já entregue depois que a original foi apagada → 201 deduped; pedido novo → 400', async () => {
      await seedRow(S, 'E24-LATE', SRC_CHAT);
      const first = await fwd('E24-LATE', {
        to: [PEER],
        idempotencyKey: 'e24-late',
      });
      expect(first.statusCode).toBe(201);
      await prisma.waMessage.updateMany({
        where: { sessionId: S, keyId: 'E24-LATE' },
        data: { revokedAt: new Date() },
      });
      const again = await fwd('E24-LATE', {
        to: [PEER],
        idempotencyKey: 'e24-late',
      });
      expect(again.statusCode).toBe(201);
      expect(resultsOf(again)[0]).toMatchObject({ ok: true, deduped: true });
      expect(fake.sends).toHaveLength(1);
      const novo = await fwd('E24-LATE', {
        to: [NEW],
        idempotencyKey: 'e24-late-2',
      });
      expect(novo.statusCode).toBe(400);
      expect(novo.json()).toMatchObject({ code: 'FORWARD_UNSUPPORTED' });
      expect(fake.sends).toHaveLength(1);
      // a intenção do destino recusado fica `failed` (não presa em pending)
      expect((await intentOf(`e24-late-2:${NEW}`))?.status).toBe('failed');
    });

    // Exceção que não é HTTP (banco fora, guard-rail lançando) depois de reservar: sem limpeza as
    // intenções ficavam `pending` e o retry levava 409 "em andamento" por 2 min.
    it('erro inesperado depois da reserva → 500 e intenções failed; o retry envia (sem 409 falso)', async () => {
      const spy = vi
        .spyOn(guardrail, 'canSendCold')
        .mockRejectedValueOnce(new Error('pg fora'));
      try {
        const boom = await fwd('E24-ORIG', {
          to: [NEW],
          idempotencyKey: 'e24-boom',
        });
        expect(boom.statusCode).toBe(500);
        expect((await intentOf('e24-boom'))?.status).toBe('failed');
        expect((await intentOf(`e24-boom:${NEW}`))?.status).toBe('failed');
        expect(fake.sends).toHaveLength(0);
      } finally {
        spy.mockRestore();
      }
      const retry = await fwd('E24-ORIG', {
        to: [NEW],
        idempotencyKey: 'e24-boom',
      });
      expect(retry.statusCode).toBe(201);
      expect(fake.sends).toHaveLength(1);
    });
  });

  describe('idempotência do lote (reserva do lote + chave por destino)', () => {
    it('repetir o mesmo pedido (outra ordem, outra formatação) → 201 tudo deduped, na ordem do novo `to`, sem reenviar', async () => {
      const first = await fwd('E24-ORIG', {
        to: [PEER, NEW],
        idempotencyKey: 'e24-rep',
      });
      expect(first.statusCode).toBe(201);
      const [a, b] = resultsOf(first);
      const again = await fwd('E24-ORIG', {
        to: ['+55 (11) 98765-0009', PEER],
        idempotencyKey: 'e24-rep',
      });
      expect(again.statusCode).toBe(201);
      expect(
        resultsOf(again).map((r) => [r.target, r.ok, r.deduped, r.id]),
      ).toEqual([
        ['+55 (11) 98765-0009', true, true, b.id],
        [PEER, true, true, a.id],
      ]);
      expect(fake.sends).toHaveLength(2);
    });

    it('mesma chave com outro conjunto de destinos → 409 e nada sai', async () => {
      const first = await fwd('E24-ORIG', {
        to: [PEER],
        idempotencyKey: 'e24-409-set',
      });
      expect(first.statusCode).toBe(201);
      const other = await fwd('E24-ORIG', {
        to: [PEER, NEW],
        idempotencyKey: 'e24-409-set',
      });
      expect(other.statusCode).toBe(409);
      expect(fake.sends).toHaveLength(1);
      expect(await intentOf(`e24-409-set:${NEW}`)).toBeNull();
    });

    it('mesma chave com outra original → 409 e nada sai', async () => {
      const first = await fwd('E24-ORIG', {
        to: [PEER],
        idempotencyKey: 'e24-409-orig',
      });
      expect(first.statusCode).toBe(201);
      const other = await fwd('E24-S4', {
        to: [PEER],
        idempotencyKey: 'e24-409-orig',
      });
      expect(other.statusCode).toBe(409);
      expect(fake.sends).toHaveLength(1);
    });

    it('replay DEPOIS de a sessão entrar em quarentena → 201 deduped (nada a enviar, não 423)', async () => {
      const first = await fwd('E24-ORIG', {
        to: [NEW],
        idempotencyKey: 'e24-rep-q',
      });
      expect(first.statusCode).toBe(201);
      await guard('quarantine');
      try {
        const again = await fwd('E24-ORIG', {
          to: [NEW],
          idempotencyKey: 'e24-rep-q',
        });
        expect(again.statusCode).toBe(201);
        expect(resultsOf(again)[0]).toMatchObject({ ok: true, deduped: true });
        expect(fake.sends).toHaveLength(1);
      } finally {
        await guard('activate');
      }
    });

    it('falha parcial → 201 misto; repetir com a mesma chave retoma SÓ o destino que falhou', async () => {
      fake.failTo.add(NEW);
      const first = await fwd('E24-ORIG', {
        to: [PEER, NEW],
        idempotencyKey: 'e24-parcial',
      });
      expect(first.statusCode).toBe(201);
      const [a, b] = resultsOf(first);
      expect(a).toMatchObject({ ok: true, deduped: false });
      expect(b).toMatchObject({ ok: false, status: 400, to: null, id: null });
      expect(b.error).toContain('recusou');
      expect((await intentOf('e24-parcial'))?.status).toBe('failed');
      expect((await intentOf(`e24-parcial:${PEER}`))?.status).toBe('sent');
      expect((await intentOf(`e24-parcial:${NEW}`))?.status).toBe('failed');

      fake.failTo.clear();
      const again = await fwd('E24-ORIG', {
        to: [PEER, NEW],
        idempotencyKey: 'e24-parcial',
      });
      expect(again.statusCode).toBe(201);
      const [a2, b2] = resultsOf(again);
      expect(a2).toMatchObject({ ok: true, deduped: true, id: a.id });
      expect(b2).toMatchObject({ ok: true, deduped: false });
      expect(fake.sends.map((s) => s.to)).toEqual([PEER, NEW, NEW]);
      expect((await intentOf('e24-parcial'))?.status).toBe('sent');
    });

    it('dois pedidos simultâneos com a mesma chave → um envio por destino; o outro é replay', async () => {
      fake.delayMs = 20;
      const body = { to: [PEER, NEW], idempotencyKey: 'e24-conc' };
      const [x, y] = await Promise.all([
        fwd('E24-ORIG', body),
        fwd('E24-ORIG', body),
      ]);
      expect([x.statusCode, y.statusCode]).toEqual([201, 201]);
      expect(fake.sends).toHaveLength(2);
      const deduped = [x, y].map((r) => resultsOf(r).every((i) => i.deduped));
      expect(deduped.sort()).toEqual([false, true]);
    });

    it('chave derivada já usada com outro conteúdo (ex.: /text com `<chave>:<destino>`) → 409 no item; nenhum ok → 409 com results', async () => {
      await prisma.sendIntent.create({
        data: {
          id: newId(),
          sessionId: S,
          idempotencyKey: `e24-col:${PEER}`,
          fingerprint: 'outro-envio',
          status: 'sent',
          keyId: 'OUTRO',
          chatJid: jid(PEER),
        },
      });
      const res = await fwd('E24-ORIG', {
        to: [PEER],
        idempotencyKey: 'e24-col',
      });
      expect(res.statusCode).toBe(409);
      expect(resultsOf(res)[0]).toMatchObject({
        ok: false,
        status: 409,
        id: null,
      });
      expect(fake.prepares).toHaveLength(0); // nada pendente → engine nem é chamada
      expect((await intentOf('e24-col'))?.status).toBe('failed');
    });

    it('eco já gravado com a chave derivada (intenção expurgada) → deduped pelo wa_messages, sem reenviar', async () => {
      await seedRow(S, 'E24-ECO-LEGADO', jid(PEER), {
        fromMe: true,
        source: 'api',
        idempotencyKey: `e24-leg:${PEER}`,
      });
      const res = await fwd('E24-ORIG', {
        to: [PEER],
        idempotencyKey: 'e24-leg',
      });
      expect(res.statusCode).toBe(201);
      expect(resultsOf(res)[0]).toMatchObject({
        ok: true,
        deduped: true,
        id: 'E24-ECO-LEGADO',
        to: jid(PEER),
      });
      expect(fake.sends).toHaveLength(0);
    });
  });

  describe('engine recusa ou falha (F2/F3)', () => {
    it('FORWARD_SOURCE_UNAVAILABLE → 400 com o code e intenções failed; depois a mesma chave envia (takeover)', async () => {
      fake.prepareError = new ForwardSourceError(
        'FORWARD_SOURCE_UNAVAILABLE',
        'A original desta mensagem não está mais guardada no gateway.',
      );
      const res = await fwd('E24-ORIG', {
        to: [PEER, NEW],
        idempotencyKey: 'e24-src',
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({
        code: 'FORWARD_SOURCE_UNAVAILABLE',
        message: 'A original desta mensagem não está mais guardada no gateway.',
      });
      expect(resultsOf(res)).toEqual([
        expect.objectContaining({
          ok: false,
          status: 400,
          code: 'FORWARD_SOURCE_UNAVAILABLE',
        }),
        expect.objectContaining({
          ok: false,
          status: 400,
          code: 'FORWARD_SOURCE_UNAVAILABLE',
        }),
      ]);
      expect(fake.sends).toHaveLength(0);
      expect((await intentOf(`e24-src:${PEER}`))?.status).toBe('failed');
      expect((await intentOf(`e24-src:${NEW}`))?.status).toBe('failed');
      expect((await intentOf('e24-src'))?.status).toBe('failed');

      fake.prepareError = null;
      const retry = await fwd('E24-ORIG', {
        to: [PEER, NEW],
        idempotencyKey: 'e24-src',
      });
      expect(retry.statusCode).toBe(201);
      expect(resultsOf(retry).map((r) => [r.ok, r.deduped])).toEqual([
        [true, false],
        [true, false],
      ]);
      expect(fake.sends).toHaveLength(2);
    });

    it('sessão desconectada (erro comum da engine) → 400 com a mensagem; nada sai', async () => {
      fake.prepareError = new Error('Sessão não está conectada');
      const res = await fwd('E24-ORIG', { to: [PEER] });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe('Sessão não está conectada');
      expect(resultsOf(res)[0]).toMatchObject({ ok: false, status: 400 });
      expect(fake.sends).toHaveLength(0);
    });

    it('todos os destinos falham no envio → 400 FORWARD_FAILED com results', async () => {
      fake.failTo = new Set([PEER, NEW]);
      const res = await fwd('E24-ORIG', { to: [PEER, NEW] });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({
        code: 'FORWARD_FAILED',
        message: 'Nenhum destino recebeu o encaminhamento — veja results[]',
      });
      expect(resultsOf(res).map((r) => [r.ok, r.status])).toEqual([
        [false, 400],
        [false, 400],
      ]);
    });

    it('score VIVO ≥ 5 da engine (coluna null) com 2 destinos → 400 FORWARD_LIMIT, 0 envios, intenções failed', async () => {
      fake.liveScore = 5;
      const res = await fwd('E24-ORIG', {
        to: [PEER, NEW],
        idempotencyKey: 'e24-vivo',
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('FORWARD_LIMIT');
      expect(fake.prepares).toHaveLength(1);
      expect(fake.sends).toHaveLength(0);
      expect((await intentOf(`e24-vivo:${PEER}`))?.status).toBe('failed');
      const um = await fwd('E24-ORIG', { to: [PEER] });
      expect(um.statusCode).toBe(201);
    });
  });

  describe('guard-rail: gate cold uma vez, 423 no lote inteiro', () => {
    beforeEach(() => guard('quarantine'));
    afterEach(() => guard('activate'));

    it('quarentena + [NEW] → 423 SESSION_QUARANTINED com results, 0 envios', async () => {
      const res = await fwd('E24-ORIG', { to: [NEW] });
      expect(res.statusCode).toBe(423);
      expect(res.json()).toMatchObject({
        code: 'SESSION_QUARANTINED',
        state: 'quarentena',
      });
      expect(resultsOf(res)).toEqual([
        expect.objectContaining({
          target: NEW,
          ok: false,
          cold: true,
          status: 423,
          code: 'SESSION_QUARANTINED',
        }),
      ]);
      expect(fake.sends).toHaveLength(0);
    });

    it('quarentena + [PEER, NEW] → 423 no lote inteiro (nem quem tem conversa recebe)', async () => {
      const res = await fwd('E24-ORIG', { to: [PEER, NEW] });
      expect(res.statusCode).toBe(423);
      expect(resultsOf(res).map((r) => [r.ok, r.cold, r.status])).toEqual([
        [false, false, 423],
        [false, true, 423],
      ]);
      expect(fake.sends).toHaveLength(0);
    });

    it('quarentena + [PEER] (só conversa aberta) → 201', async () => {
      const res = await fwd('E24-ORIG', { to: [PEER] });
      expect(res.statusCode).toBe(201);
      expect(fake.sends).toHaveLength(1);
    });

    it('423 com chave não prende a chave: liberada a sessão, a mesma chave envia', async () => {
      const blocked = await fwd('E24-ORIG', {
        to: [PEER, NEW],
        idempotencyKey: 'e24-q-k',
      });
      expect(blocked.statusCode).toBe(423);
      expect((await intentOf(`e24-q-k:${PEER}`))?.status).toBe('failed');
      await guard('activate');
      const res = await fwd('E24-ORIG', {
        to: [PEER, NEW],
        idempotencyKey: 'e24-q-k',
      });
      expect(res.statusCode).toBe(201);
      expect(resultsOf(res).map((r) => [r.ok, r.deduped])).toEqual([
        [true, false],
        [true, false],
      ]);
      expect(fake.sends).toHaveLength(2);
    });
  });

  describe('ritmo anti-ban: um destino por vez, 1–3 s entre envios efetivos', () => {
    const A = '5511987650021';
    const B = '5511987650022';
    const C = '5511987650023';

    it('lote novo: pausa só ENTRE envios (to.length-1), com o intervalo sorteado de 1–3 s', async () => {
      fake.delayMs = 15;
      const res = await fwd('R-ORIG', { to: [A, B, C] }, RITMO_1);
      expect(res.statusCode).toBe(201);
      expect(fake.maxInFlight).toBe(1);
      expect(fake.timeline).toEqual([
        `envio:${A}`,
        'pausa',
        `envio:${B}`,
        'pausa',
        `envio:${C}`,
      ]);
      expect(gapSpy).toHaveBeenCalledTimes(2);
      expect(sleepSpy).toHaveBeenCalledTimes(2);
      for (const [i, r] of gapSpy.mock.results.entries()) {
        const gap = r.value as number;
        expect(gap).toBeGreaterThanOrEqual(1000);
        expect(gap).toBeLessThanOrEqual(3000);
        const ms = sleepSpy.mock.calls[i][0];
        expect(ms).toBeGreaterThan(0);
        expect(ms).toBeLessThanOrEqual(gap); // desconta o tempo já passado desde o último envio
      }
    });

    it('o intervalo vale entre pedidos da mesma sessão (o 1º envio do novo pedido também espera)', async () => {
      const res = await fwd('R-ORIG', { to: [A] }, RITMO_1);
      expect(res.statusCode).toBe(201);
      expect(fake.timeline).toEqual(['pausa', `envio:${A}`]);
    });

    it('envio que falhou não conta para o intervalo', async () => {
      fake.failTo.add(A);
      const res = await fwd('R-ORIG', { to: [A, B] }, RITMO_2);
      expect(res.statusCode).toBe(201);
      expect(fake.timeline).toEqual([`envio:${A}`, `envio:${B}`]);
      expect(gapSpy).not.toHaveBeenCalled();
      const next = await fwd('R-ORIG', { to: [C] }, RITMO_2);
      expect(next.statusCode).toBe(201);
      expect(fake.timeline.slice(2)).toEqual(['pausa', `envio:${C}`]); // B foi efetivo
    });

    it('dois pedidos simultâneos na MESMA sessão → nunca dois envios ao mesmo tempo, sem intercalar', async () => {
      fake.delayMs = 25;
      const [x, y] = await Promise.all([
        fwd('E24-ORIG', { to: [PEER, NEW] }),
        fwd('E24-S4', { to: [PEER9, GROUP] }),
      ]);
      expect([x.statusCode, y.statusCode]).toEqual([201, 201]);
      expect(fake.maxInFlight).toBe(1);
      const order = fake.sends.map((s) => s.keyId);
      expect(order).toHaveLength(4);
      expect(order[0]).toBe(order[1]);
      expect(order[2]).toBe(order[3]);
      expect(order[0]).not.toBe(order[2]);
    });
  });

  describe('efeito pelo EventBus real (R6)', () => {
    it('eco do encaminhar → linha com source api, selo, score, cold, chave derivada e raw', async () => {
      const chat = jid('5511987650055');
      const raw = {
        extendedTextMessage: {
          text: 'oferta da semana',
          contextInfo: { forwardingScore: 2, isForwarded: true },
        },
      };
      publish(S, 'message', {
        keyId: 'E24-ECO-1',
        chatJid: chat,
        senderJid: '5511000000000:3@s.whatsapp.net',
        fromMe: true,
        type: 'text',
        text: 'oferta da semana',
        timestamp: nowSec(),
        source: 'api',
        isForwarded: true,
        forwardingScore: 2,
        isCold: true,
        idempotencyKey: 'e24-eco:5511987650055',
        raw,
      } satisfies MessagePayload);
      const row = await until(
        () =>
          prisma.waMessage.findFirst({
            where: { sessionId: S, keyId: 'E24-ECO-1' },
          }),
        (r) => !!r,
      );
      expect(row).toMatchObject({
        chatJid: chat,
        fromMe: true,
        source: 'api',
        type: 'text',
        text: 'oferta da semana',
        isForwarded: true,
        forwardingScore: 2,
        isCold: true,
        idempotencyKey: 'e24-eco:5511987650055',
      });
      expect(row?.raw).toEqual(raw);
    });

    it('NUL (\\u0000) no texto, nome/tipo do arquivo e dentro do raw → a linha é gravada sem o NUL', async () => {
      const chat = jid('5511900000077');
      publish(S, 'message', {
        keyId: 'E24-NUL-1',
        chatJid: chat,
        senderJid: chat,
        fromMe: false,
        type: 'document',
        text: 'rela\u0000tório',
        timestamp: nowSec(),
        source: null,
        mediaType: 'document',
        mimetype: 'application/pdf\u0000',
        fileName: 'rel\u0000.pdf',
        fileSize: 10,
        raw: {
          documentMessage: {
            fileName: 'rel\u0000.pdf',
            caption: 'rela\u0000tório',
            'ti\u0000tle': ['a\u0000', { b: 'c\u0000' }],
          },
        },
      } satisfies MessagePayload);
      const row = await until(
        () =>
          prisma.waMessage.findFirst({
            where: { sessionId: S, keyId: 'E24-NUL-1' },
          }),
        (r) => !!r,
      );
      expect(row).toMatchObject({
        text: 'relatório',
        mimetype: 'application/pdf',
        fileName: 'rel.pdf',
      });
      expect(row?.raw).toEqual({
        documentMessage: {
          fileName: 'rel.pdf',
          caption: 'relatório',
          title: ['a', { b: 'c' }],
        },
      });
    });

    it('controle: texto com surrogate solto e SEM raw é gravado (o driver troca por U+FFFD)', async () => {
      const chat = jid('5511900000078');
      publish(S, 'message', {
        keyId: 'E24-UTF-SEM-RAW',
        chatJid: chat,
        senderJid: chat,
        fromMe: false,
        type: 'text',
        text: 'a\ud800b',
        timestamp: nowSec(),
        source: null,
      } satisfies MessagePayload);
      const row = await until(
        () =>
          prisma.waMessage.findFirst({
            where: { sessionId: S, keyId: 'E24-UTF-SEM-RAW' },
          }),
        (r) => !!r,
      );
      expect(row).not.toBeNull();
    });
  });

  describe('ponta a ponta com o BaileysEngine real (engine → EventBus → wa_messages)', () => {
    const OUR = '5511000000000:3@s.whatsapp.net';
    const PEER_M = '5511987650011';
    const NEW_M = '5511987650019';
    const GROUP_M = '120363000000000088@g.us';
    const MEDIA_KEY = Buffer.alloc(32, 7);
    let engine: BaileysEngine;
    // O que o socket falso recebeu e o que "saiu no fio" (cálculo real da lib para o forward).
    const wire: Array<{
      jid: string;
      content: { forward?: WAMessage; force?: boolean };
      message: proto.IMessage | undefined;
    }> = [];
    const events: Array<{ name: EngineEventName; keyId: unknown }> = [];
    const storeMedia = vi.fn(async () => undefined);
    const priv = () =>
      engine as unknown as {
        onMessagesUpsert: (u: {
          messages: WAMessage[];
          type: string;
        }) => Promise<void>;
        onMessagesUpdate: (u: WAMessageUpdate[]) => void;
      };
    const useEngine = () => {
      mgr.prepareForward = (_sid, src) => engine.prepareForward(src);
    };
    const rowByKey = (keyId: string | null) =>
      until(
        () =>
          prisma.waMessage.findFirst({
            where: { sessionId: MOTOR, keyId: keyId ?? '' },
          }),
        (r) => !!r,
      );

    beforeAll(() => {
      engine = new BaileysEngine({
        sessionId: MOTOR,
        deviceName: 'e2e',
        prisma,
        logger: { info() {}, warn() {}, error() {}, debug() {}, trace() {} },
        // Mesmo envelope do SessionManager.handleEngineEvent.
        onEvent: (name: EngineEventName, payload: unknown) => {
          events.push({
            name,
            keyId: (payload as { keyId?: unknown }).keyId,
          });
          publish(MOTOR, name, payload);
        },
        storeMedia,
        contacts: {
          record() {},
          recordMany() {},
          loadLidMap: async () => [],
          resolveNames: async () => new Map(),
        },
      } as never);
      let seq = 0;
      (engine as unknown as { sock: unknown }).sock = {
        user: { id: OUR, name: 'Gateway' },
        sendMessage: async (
          to: string,
          content: { forward?: WAMessage; force?: boolean },
        ) => {
          const message = content.forward
            ? generateForwardMessageContent(content.forward, content.force)
            : undefined;
          wire.push({ jid: to, content, message });
          return {
            key: { remoteJid: to, fromMe: true, id: `E24-MOTOR-${++seq}` },
            message,
          };
        },
      };
    });
    beforeEach(() => {
      wire.length = 0;
      events.length = 0;
      storeMedia.mockClear();
      useEngine();
    });

    it('recebida pelo engine grava o raw; a rota encaminha e o eco é gravado (source api, selo 1, cold, chave derivada); repetir não reenvia', async () => {
      await priv().onMessagesUpsert({
        type: 'notify',
        messages: [
          {
            key: { id: 'M-IN-1', remoteJid: jid(PEER_M), fromMe: false },
            message: proto.Message.fromObject({ conversation: 'promo 10%' }),
            messageTimestamp: nowSec(),
          } as WAMessage,
        ],
      });
      const orig = await rowByKey('M-IN-1');
      expect(orig?.raw).toEqual({ conversation: 'promo 10%' });

      const body = { to: [PEER_M, NEW_M], idempotencyKey: 'e24-motor' };
      const res = await fwd('M-IN-1', body, MOTOR);
      expect(res.statusCode).toBe(201);
      const results = resultsOf(res);
      expect(wire.map((w) => w.jid)).toEqual([jid(PEER_M), jid(NEW_M)]);
      expect(wire[0].content.forward?.key).toEqual({
        remoteJid: jid(PEER_M),
        id: 'M-IN-1',
        fromMe: false,
      });
      expect(
        results.map((r) => [r.ok, r.cold, r.isForwarded, r.forwardingScore]),
      ).toEqual([
        [true, false, true, 1],
        [true, true, true, 1],
      ]);

      for (const [i, dest] of [PEER_M, NEW_M].entries()) {
        const row = await rowByKey(results[i].id);
        expect(row).toMatchObject({
          chatJid: jid(dest),
          senderJid: OUR,
          fromMe: true,
          source: 'api',
          type: 'text',
          text: 'promo 10%',
          isForwarded: true,
          forwardingScore: 1,
          isCold: i === 1,
          idempotencyKey: `e24-motor:${dest}`,
        });
        expect(row?.raw).toEqual({
          extendedTextMessage: {
            text: 'promo 10%',
            contextInfo: { forwardingScore: 1, isForwarded: true },
          },
        });
      }

      const again = await fwd('M-IN-1', body, MOTOR);
      expect(again.statusCode).toBe(201);
      expect(resultsOf(again).map((r) => [r.deduped, r.id])).toEqual(
        results.map((r) => [true, r.id]),
      );
      expect(wire).toHaveLength(2);
    });

    it('grupo: SKDM, citação e menções da original NÃO vão para o destino; o selo cai no nó do texto', async () => {
      await seedRow(MOTOR, 'M-GRP-1', GROUP_M, {
        text: 'olha isso',
        forwardingScore: 2,
        isForwarded: true,
        raw: rawOf({
          senderKeyDistributionMessage: {
            groupId: GROUP_M,
            axolotlSenderKeyDistributionMessage: Buffer.from([1, 2, 3]),
          },
          extendedTextMessage: {
            text: 'olha isso',
            contextInfo: {
              stanzaId: 'Q1',
              participant: jid('5511911112222'),
              quotedMessage: { conversation: 'citada' },
              mentionedJid: [jid('5511911112222')],
              forwardingScore: 2,
              isForwarded: true,
            },
          },
          messageContextInfo: { messageSecret: Buffer.alloc(32, 9) },
        }),
      });
      const res = await fwd('M-GRP-1', { to: [NEW_M] }, MOTOR);
      expect(res.statusCode).toBe(201);
      expect(Object.keys(wire[0].content.forward?.message ?? {})).toEqual([
        'extendedTextMessage',
      ]);
      expect(Object.keys(wire[0].message ?? {})).toEqual([
        'extendedTextMessage',
      ]);
      expect(wire[0].message?.extendedTextMessage?.contextInfo).toEqual({
        forwardingScore: 3,
        isForwarded: true,
      });
      const row = await rowByKey(resultsOf(res)[0].id);
      expect(row).toMatchObject({ isForwarded: true, forwardingScore: 3 });
    });

    it('mídia: a mesma do WhatsApp (sem upload), o mediaKey S3 da original no eco e o enum do proto preservado', async () => {
      await seedRow(MOTOR, 'M-GIF-1', jid(PEER_M), {
        type: 'video',
        text: 'kkk',
        mediaType: 'video',
        mimetype: 'video/mp4',
        fileSize: 5000,
        mediaKey: 'e24-motor/M-GIF-1.mp4',
        raw: rawOf({
          videoMessage: {
            url: 'https://mmg.whatsapp.net/v/t62/gif.enc',
            directPath: '/v/t62/gif.enc',
            mediaKey: MEDIA_KEY,
            mimetype: 'video/mp4',
            fileLength: 5000,
            seconds: 3,
            gifPlayback: true,
            gifAttribution: proto.Message.VideoMessage.Attribution.GIPHY,
            caption: 'kkk',
          },
        }),
      });
      const res = await fwd('M-GIF-1', { to: [NEW_M] }, MOTOR);
      expect(res.statusCode).toBe(201);
      const video = wire[0].message?.videoMessage;
      // raw guarda o enum pelo NOME ("GIPHY"); sem o fromObject na volta ele virava 0 (NONE)
      expect(video?.gifAttribution).toBe(
        proto.Message.VideoMessage.Attribution.GIPHY,
      );
      expect(Buffer.from(video?.mediaKey ?? [])).toEqual(MEDIA_KEY);
      expect(video?.url).toBe('https://mmg.whatsapp.net/v/t62/gif.enc');
      expect(storeMedia).not.toHaveBeenCalled();
      const row = await rowByKey(resultsOf(res)[0].id);
      expect(row).toMatchObject({
        type: 'video',
        text: 'kkk',
        mediaType: 'video',
        mimetype: 'video/mp4',
        fileSize: 5000,
        mediaKey: 'e24-motor/M-GIF-1.mp4',
        isForwarded: true,
        forwardingScore: 1,
        isCold: true,
      });
    });

    it('original NOSSA sai sem selo (isForwarded false), como no app', async () => {
      await seedRow(MOTOR, 'M-OUR-1', jid(PEER_M), {
        fromMe: true,
        source: 'api',
        text: 'nossa oferta',
        raw: rawOf({ extendedTextMessage: { text: 'nossa oferta' } }),
      });
      const res = await fwd('M-OUR-1', { to: [NEW_M] }, MOTOR);
      expect(res.statusCode).toBe(201);
      expect(wire[0].content.forward?.key?.fromMe).toBe(true);
      expect(resultsOf(res)[0]).toMatchObject({
        isForwarded: false,
        forwardingScore: null,
      });
      const row = await rowByKey(resultsOf(res)[0].id);
      expect(row).toMatchObject({ isForwarded: false, forwardingScore: null });
    });

    it('score vivo no raw (coluna null) ≥ 5 com 2 destinos → 400 FORWARD_LIMIT sem tocar o socket; com 1 → sai com score+1', async () => {
      await seedRow(MOTOR, 'M-HOT-1', jid(PEER_M), {
        text: 'corrente',
        raw: rawOf({
          extendedTextMessage: {
            text: 'corrente',
            contextInfo: { isForwarded: true, forwardingScore: 6 },
          },
        }),
      });
      const res = await fwd('M-HOT-1', { to: [NEW_M, PEER_M] }, MOTOR);
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('FORWARD_LIMIT');
      expect(wire).toHaveLength(0);
      const um = await fwd('M-HOT-1', { to: [NEW_M] }, MOTOR);
      expect(um.statusCode).toBe(201);
      const row = await rowByKey(resultsOf(um)[0].id);
      expect(row?.forwardingScore).toBe(7);
    });

    it('sem raw: texto remonta fiel; mídia → 400 FORWARD_SOURCE_UNAVAILABLE', async () => {
      await seedRow(MOTOR, 'M-OLD-TXT', jid(PEER_M), {
        text: 'antiga',
        isForwarded: true,
        forwardingScore: 2,
      });
      const txt = await fwd('M-OLD-TXT', { to: [NEW_M] }, MOTOR);
      expect(txt.statusCode).toBe(201);
      // a cópia saiu da coluna `text` + score gravado (+1), com o selo no nó do texto
      const ext = wire[0].message?.extendedTextMessage;
      expect(ext?.text).toBe('antiga');
      expect(ext?.contextInfo).toEqual({
        forwardingScore: 3,
        isForwarded: true,
      });
      await seedRow(MOTOR, 'M-OLD-IMG', jid(PEER_M), {
        type: 'image',
        text: null,
        mediaType: 'image',
        mimetype: 'image/jpeg',
        mediaKey: 'e24-motor/M-OLD-IMG.jpg',
      });
      const img = await fwd('M-OLD-IMG', { to: [NEW_M] }, MOTOR);
      expect(img.statusCode).toBe(400);
      expect(img.json().code).toBe('FORWARD_SOURCE_UNAVAILABLE');
      expect(wire).toHaveLength(1);
    });

    it('raw ilegível (não é um proto.Message) → 400 FORWARD_SOURCE_UNAVAILABLE, nada sai', async () => {
      await seedRow(MOTOR, 'M-LIXO-1', jid(PEER_M), {
        raw: { imageMessage: 'lixo' },
      });
      const res = await fwd('M-LIXO-1', { to: [NEW_M] }, MOTOR);
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('FORWARD_SOURCE_UNAVAILABLE');
      expect(wire).toHaveLength(0);
    });

    it('visualização única (gravada como image) → 400 FORWARD_UNSUPPORTED pela engine', async () => {
      await seedRow(MOTOR, 'M-VO-1', jid(PEER_M), {
        type: 'image',
        text: null,
        mediaType: 'image',
        raw: rawOf({
          viewOnceMessageV2: {
            message: {
              imageMessage: {
                url: 'https://mmg.whatsapp.net/v/t62/vo.enc',
                mimetype: 'image/jpeg',
                mediaKey: MEDIA_KEY,
                viewOnce: true,
              },
            },
          },
        }),
      });
      const res = await fwd('M-VO-1', { to: [NEW_M] }, MOTOR);
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('FORWARD_UNSUPPORTED');
      expect(res.json().message).toContain('visualização única');
      expect(wire).toHaveLength(0);
    });

    it('apagada/editada no WhatsApp (messages.update) marca SÓ esta sessão e o encaminhar recusa', async () => {
      await seedRow(MOTOR, 'M-REV-1', jid(PEER_M), {
        raw: rawOf({ conversation: 'vou apagar' }),
      });
      await seedRow(OUTRA, 'M-REV-1', jid(PEER_M)); // mesmo keyId na outra ponta
      await seedRow(MOTOR, 'M-EDIT-1', jid(PEER_M), {
        raw: rawOf({ conversation: 'versão velha' }),
      });
      priv().onMessagesUpdate([
        {
          key: { id: 'M-REV-1', remoteJid: jid(PEER_M), fromMe: false },
          update: { message: null, messageStubType: WAMessageStubType.REVOKE },
        },
        {
          key: { id: 'M-EDIT-1', remoteJid: jid(PEER_M), fromMe: false },
          update: {
            message: proto.Message.fromObject({
              editedMessage: { message: { conversation: 'versão nova' } },
            }),
          },
        },
      ]);
      const rev = await until(
        () =>
          prisma.waMessage.findFirst({
            where: { sessionId: MOTOR, keyId: 'M-REV-1' },
          }),
        (r) => !!r?.revokedAt,
      );
      expect(rev?.revokedAt).toBeInstanceOf(Date);
      const edit = await until(
        () =>
          prisma.waMessage.findFirst({
            where: { sessionId: MOTOR, keyId: 'M-EDIT-1' },
          }),
        (r) => !!r?.editedAt,
      );
      expect(edit?.editedAt).toBeInstanceOf(Date);
      const outra = await prisma.waMessage.findFirst({
        where: { sessionId: OUTRA, keyId: 'M-REV-1' },
      });
      expect(outra?.revokedAt).toBeNull();
      // apagar/editar não é ACK
      expect(events.filter((e) => e.name === 'message.ack')).toHaveLength(0);

      const apagada = await fwd('M-REV-1', { to: [NEW_M] }, MOTOR);
      expect(apagada.statusCode).toBe(400);
      expect(apagada.json().code).toBe('FORWARD_UNSUPPORTED');
      const editada = await fwd('M-EDIT-1', { to: [NEW_M] }, MOTOR);
      expect(editada.statusCode).toBe(400);
      expect(editada.json().code).toBe('FORWARD_UNSUPPORTED');
      expect(wire).toHaveLength(0);
    });

    it('P-077: eco de localização e enquete enviadas pela API grava o texto no formato da recebida', async () => {
      const loc = await engine.sendLocation(NEW_M, {
        latitude: -23.5,
        longitude: -46.6,
        name: 'Praça',
        address: 'Rua X, 10',
      });
      const poll = await engine.sendPoll(NEW_M, {
        name: 'Qual horário?',
        options: ['Manhã', 'Tarde'],
      });
      expect(await rowByKey(loc.keyId)).toMatchObject({
        type: 'location',
        source: 'api',
        text: 'Praça — Rua X, 10\nhttps://maps.google.com/?q=-23.5,-46.6',
      });
      expect(await rowByKey(poll.keyId)).toMatchObject({
        type: 'poll',
        source: 'api',
        text: 'Qual horário?\n• Manhã\n• Tarde',
      });
    });

    it('recebida com UTF-8 malformado (a lib decodifica em surrogate solto) continua sendo gravada com o raw da E24', async () => {
      // conversation = 'a' + ED A0 80 + 'b'. O Baileys decodifica de Uint8Array
      // (unpadRandomMax16 → decode-wa-message.js:266), e o leitor do protobufjs fora do Buffer
      // devolve U+D800 solto — o jsonb do PostgreSQL recusa ("Unicode low surrogate must follow a
      // high surrogate"), igual ao NUL que a E24 limpa.
      const message = proto.Message.decode(
        new Uint8Array([0x0a, 0x05, 0x61, 0xed, 0xa0, 0x80, 0x62]),
      );
      expect(message.conversation).toBe('a\ud800b');
      await priv().onMessagesUpsert({
        type: 'notify',
        messages: [
          {
            key: {
              id: 'M-UTF-1',
              remoteJid: jid('5511987650033'),
              fromMe: false,
            },
            message,
            messageTimestamp: nowSec(),
          } as WAMessage,
        ],
      });
      const row = await rowByKey('M-UTF-1');
      expect(row).not.toBeNull();
    });
  });
});
