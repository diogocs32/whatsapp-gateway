import { describe, expect, it, vi } from 'vitest';
import { proto, type WAMessage } from '@whiskeysockets/baileys';
import { reactionSenderKey } from '../../../messaging/application/reaction-key';
import { BaileysEngine } from './baileys.engine';

// P-066 (E22) — efeito no ponto de saída da engine (onEvent), com a lib REAL e um socket falso:
// a reação que a rc14 entrega TAMBÉM em `messages.upsert` não vira mais evento `message` (nem a
// do contato — 🔴/reply-rate por engano — nem a nossa pelo celular — handoff falso); os tipos que
// viravam "…" saem com tipo/texto; o LID aprendido de uma reação vale para a reação seguinte; o
// remetente de reação em grupo é quem reagiu.
type Ev = { name: string; payload: Record<string, unknown> };
const OUR = '5511000000000:7@s.whatsapp.net';
const PEER = '5511988887777@s.whatsapp.net';
const PEER_LID = '99887766554433@lid';
const GROUP = '120363000000000001@g.us';

// `warm` = pares LID↔telefone já persistidos no diretório (o que o warmLidCache carrega no open).
function makeEngine(warm: Array<{ lid: string; jid: string }> = []) {
  const events: Ev[] = [];
  const prisma = {
    waMessage: {
      updateMany: vi.fn(async () => ({ count: 0 })),
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
    },
    messageReaction: { updateMany: vi.fn(async () => ({ count: 0 })) },
  };
  const contacts = {
    record: vi.fn(),
    recordMany: vi.fn(),
    loadLidMap: vi.fn(async () => warm),
  };
  const engine = new BaileysEngine({
    sessionId: 'sess-e22',
    deviceName: 'test',
    prisma,
    logger: { info() {}, warn() {}, error() {}, debug() {}, trace() {} },
    onEvent: (name: string, payload: unknown) =>
      events.push({ name, payload: payload as Record<string, unknown> }),
    resolveAgent: async () => null,
    resolveProxyConfig: async () => null,
    contacts,
  } as never);
  (engine as unknown as { sock: unknown }).sock = {
    user: { id: OUR, name: 'Diogo' },
  };
  const upsert = (messages: Partial<WAMessage>[], type = 'notify') =>
    (
      engine as unknown as {
        onMessagesUpsert: (u: {
          messages: WAMessage[];
          type: string;
        }) => Promise<void>;
      }
    ).onMessagesUpsert({ messages: messages as WAMessage[], type });
  const reactions = (
    rs: { key: proto.IMessageKey; reaction: proto.IReaction }[],
  ) =>
    (engine as unknown as { onReactions: (r: typeof rs) => void }).onReactions(
      rs,
    );
  const warmLidCache = () =>
    (engine as unknown as { warmLidCache: () => Promise<void> }).warmLidCache();
  return { engine, events, prisma, contacts, upsert, reactions, warmLidCache };
}

const msg = (
  id: string,
  remoteJid: string,
  message: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Partial<WAMessage> => ({
  key: { id, remoteJid, fromMe: false, ...extra },
  message: proto.Message.fromObject(message),
  messageTimestamp: 1_727_280_000,
});

describe('BaileysEngine.onMessagesUpsert (P-047)', () => {
  it('lote misto decide por mensagem, preserva remetente de grupo e raw; repetições não emitem', async () => {
    const { events, upsert, prisma } = makeEngine();
    const now = Math.floor(Date.now() / 1000);
    const offline = {
      ...msg('OFF1', PEER, { conversation: 'cheguei offline' }),
      messageTimestamp: now - 3600,
    };
    await upsert(
      [
        offline,
        {
          ...msg('ECO', PEER, { conversation: 'nosso' }, { fromMe: true }),
          messageTimestamp: now,
        },
        {
          ...msg('NEWS', '123@newsletter', { conversation: 'canal' }),
          messageTimestamp: now,
        },
        {
          ...msg('STATUS', 'status@broadcast', { conversation: 'status' }),
          messageTimestamp: now,
        },
        {
          ...msg('OLD', PEER, { conversation: 'antiga' }),
          messageTimestamp: now - 49 * 3600,
        },
        {
          ...msg('REA', PEER, {
            reactionMessage: {
              key: { id: 'ALVO', remoteJid: PEER },
              text: '👍',
            },
          }),
          messageTimestamp: now,
        },
        {
          ...msg(
            'GRUPO',
            GROUP,
            { conversation: 'grupo' },
            { participant: PEER },
          ),
          messageTimestamp: now,
        },
        offline,
      ],
      'append',
    );
    await upsert([offline], 'notify');
    const messages = events.filter((e) => e.name === 'message');
    expect(messages.map((e) => e.payload.keyId)).toEqual(['OFF1', 'GRUPO']);
    expect(messages[0].payload).toMatchObject({
      text: 'cheguei offline',
      timestamp: now - 3600,
      fromMe: false,
      source: null,
      raw: { conversation: 'cheguei offline' },
    });
    expect(messages[1].payload).toMatchObject({
      senderJid: PEER,
      chatJid: GROUP,
    });
    expect(prisma.waMessage.findFirst).toHaveBeenCalledTimes(2);
  });

  it('após restart, keyId já persistido é barrado antes do webhook', async () => {
    const { events, upsert, prisma } = makeEngine();
    prisma.waMessage.findFirst.mockResolvedValueOnce({ id: 'saved' } as never);
    await upsert(
      [
        {
          ...msg('REPLAY', PEER, { conversation: 'replay' }),
          messageTimestamp: Math.floor(Date.now() / 1000),
        },
      ],
      'append',
    );
    expect(events).toHaveLength(0);
  });
});

describe('BaileysEngine.onMessagesUpsert (P-066)', () => {
  it('reação do contato no upsert NÃO vira evento message', async () => {
    const { events, upsert } = makeEngine();
    await upsert([
      msg('R1', PEER, {
        reactionMessage: {
          key: { remoteJid: PEER, fromMe: true, id: 'ALVO' },
          text: '👍',
        },
      }),
    ]);
    expect(events.filter((e) => e.name === 'message')).toHaveLength(0);
  });

  it('reação NOSSA pelo celular (fromMe) também não — sem handoff falso', async () => {
    const { events, upsert } = makeEngine();
    await upsert([
      msg(
        'R2',
        PEER,
        {
          reactionMessage: {
            key: { remoteJid: PEER, fromMe: false, id: 'ALVO' },
            text: '❤️',
          },
        },
        { fromMe: true },
      ),
    ]);
    expect(events).toHaveLength(0);
  });

  it('localização encaminhada sai como message type location com texto e selo', async () => {
    const { events, upsert } = makeEngine();
    await upsert([
      msg('L1', PEER, {
        locationMessage: {
          degreesLatitude: -23.5,
          degreesLongitude: -46.6,
          name: 'Praça',
          contextInfo: { isForwarded: true, forwardingScore: 5 },
        },
      }),
    ]);
    expect(events).toEqual([
      {
        name: 'message',
        payload: expect.objectContaining({
          keyId: 'L1',
          chatJid: PEER,
          fromMe: false,
          type: 'location',
          text: 'Praça\nhttps://maps.google.com/?q=-23.5,-46.6',
          isForwarded: true,
          forwardingScore: 5,
        }),
      },
    ]);
  });

  it('texto comum segue igual (fromMe do celular = source phone, não encaminhada)', async () => {
    const { events, upsert } = makeEngine();
    await upsert([
      msg('T1', PEER, { conversation: 'oi 😀' }, { fromMe: true }),
    ]);
    expect(events[0].payload).toMatchObject({
      type: 'text',
      text: 'oi 😀',
      fromMe: true,
      source: 'phone',
      isForwarded: false,
      forwardingScore: null,
    });
  });

  it('voto do contato numa enquete → message poll_vote (continua contando como resposta)', async () => {
    const { events, upsert } = makeEngine();
    await upsert([
      msg('V1', PEER, {
        pollUpdateMessage: {
          pollCreationMessageKey: { remoteJid: PEER, fromMe: true, id: 'P' },
          vote: { encPayload: Buffer.from('x'), encIv: Buffer.from('y') },
        },
      }),
    ]);
    expect(events[0].payload).toMatchObject({ type: 'poll_vote', text: null });
  });

  it('o par LID↔telefone de uma reação ignorada ainda é aprendido (e funde a conversa)', async () => {
    const { events, upsert, reactions, prisma } = makeEngine();
    await upsert([
      msg(
        'R3',
        PEER_LID,
        {
          reactionMessage: {
            key: { remoteJid: PEER_LID, fromMe: true, id: 'ALVO' },
            text: '👍',
          },
        },
        { remoteJidAlt: PEER },
      ),
    ]);
    await new Promise((r) => setTimeout(r, 0)); // merge é fire-and-forget (2 updateMany em série)
    expect(prisma.waMessage.updateMany).toHaveBeenCalledWith({
      where: { sessionId: 'sess-e22', chatJid: PEER_LID },
      data: { chatJid: PEER },
    });
    expect(prisma.messageReaction.updateMany).toHaveBeenCalledWith({
      where: { sessionId: 'sess-e22', chatJid: PEER_LID },
      data: { chatJid: PEER },
    });
    reactions([
      {
        key: { id: 'ALVO', remoteJid: PEER_LID, fromMe: true, participant: '' },
        reaction: {
          text: '👍',
          key: {
            id: 'R3',
            remoteJid: PEER_LID,
            fromMe: false,
            participant: '',
          },
          senderTimestampMs: 1_727_280_000_000,
        },
      },
    ]);
    const r = events.find((e) => e.name === 'message.reaction');
    expect(r?.payload).toMatchObject({
      keyId: 'ALVO',
      chatJid: PEER, // antes saía o @lid cru
      senderJid: PEER, // antes saía '' (participant vazio do cleanMessage)
      emoji: '👍',
      fromMe: false,
      timestamp: 1_727_280_000,
    });
  });
});

describe('BaileysEngine.onReactions — grupo (E22)', () => {
  it('remetente é QUEM REAGIU (reaction.key.participant), não o autor da mensagem-alvo', async () => {
    const { events, reactions } = makeEngine();
    const alvo = {
      id: 'G-ALVO',
      remoteJid: GROUP,
      fromMe: false,
      participant: '5511911111111@s.whatsapp.net', // autor da mensagem
    };
    reactions([
      {
        key: alvo,
        reaction: {
          text: '🔥',
          key: {
            id: 'RX1',
            remoteJid: GROUP,
            fromMe: false,
            participant: '5511922222222:4@s.whatsapp.net',
          },
        },
      },
      {
        key: alvo,
        reaction: {
          text: '🎉',
          key: {
            id: 'RX2',
            remoteJid: GROUP,
            fromMe: false,
            participant: '44556677@lid',
            participantAlt: '5511933333333@s.whatsapp.net',
          } as proto.IMessageKey,
        },
      },
    ]);
    expect(events.map((e) => [e.payload.chatJid, e.payload.senderJid])).toEqual(
      [
        [GROUP, '5511922222222@s.whatsapp.net'],
        [GROUP, '5511933333333@s.whatsapp.net'],
      ],
    );
  });
});

describe('BaileysEngine.onReactions — endereçamento por TELEFONE (modo PN: o *Alt é o @lid)', () => {
  it('1:1: remetente e chat saem com o telefone (não o @lid do remoteJidAlt) e o par é aprendido', async () => {
    const { events, reactions, prisma } = makeEngine();
    reactions([
      {
        key: { id: 'ALVO', remoteJid: PEER, fromMe: true, participant: '' },
        reaction: {
          text: '👍',
          key: {
            id: 'RP1',
            remoteJid: PEER,
            remoteJidAlt: PEER_LID,
            fromMe: false,
            participant: '',
          } as proto.IMessageKey,
        },
      },
    ]);
    expect(events[0].payload).toMatchObject({ chatJid: PEER, senderJid: PEER });
    await new Promise((r) => setTimeout(r, 0));
    // aprendeu PEER_LID → PEER (a conversa dividida em @lid é fundida)
    expect(prisma.waMessage.updateMany).toHaveBeenCalledWith({
      where: { sessionId: 'sess-e22', chatJid: PEER_LID },
      data: { chatJid: PEER },
    });
  });

  it('grupo: participant telefone + participantAlt @lid → telefone; a mesma pessoa mantém o senderKey depois de o par ser aprendido', async () => {
    const { events, reactions } = makeEngine();
    const alvo = { id: 'G2', remoteJid: GROUP, fromMe: true, participant: '' };
    const antes = {
      id: 'RG1',
      remoteJid: GROUP,
      fromMe: false,
      participant: '5511922222222@s.whatsapp.net',
      participantAlt: '44556677@lid',
    } as proto.IMessageKey;
    // 2ª reação da MESMA pessoa chega endereçada por LID (participant @lid, Alt telefone)
    const depois = {
      id: 'RG2',
      remoteJid: GROUP,
      fromMe: false,
      participant: '44556677@lid',
    } as proto.IMessageKey;
    reactions([
      { key: alvo, reaction: { text: '❤️', key: antes } },
      { key: alvo, reaction: { text: '', key: depois } },
    ]);
    const keys = events.map((e) =>
      reactionSenderKey(
        e.payload as {
          chatJid: string;
          senderJid: string | null;
          fromMe: boolean;
        },
      ),
    );
    expect(keys).toEqual([
      '5511922222222@s.whatsapp.net',
      '5511922222222@s.whatsapp.net',
    ]);
  });

  it('reação NOSSA: o *Alt (pode ser o nosso LID) não é aprendido como par de ninguém', async () => {
    const { reactions, prisma } = makeEngine();
    reactions([
      {
        key: { id: 'ALVO', remoteJid: PEER, fromMe: false, participant: '' },
        reaction: {
          text: '👍',
          key: {
            id: 'RP2',
            remoteJid: PEER,
            remoteJidAlt: '11112222333344@lid',
            fromMe: true,
          } as proto.IMessageKey,
        },
      },
    ]);
    await new Promise((r) => setTimeout(r, 0));
    expect(prisma.waMessage.updateMany).not.toHaveBeenCalled();
  });
});

describe('BaileysEngine.onMessagesUpsert — mídia em invólucro que a lib não abre (E22)', () => {
  const B64 = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
  const sticker = {
    url: 'https://mmg.whatsapp.net/v/x.enc',
    mediaKey: B64,
    directPath: '/v/x.enc',
    mimetype: 'application/was',
  };
  it('figurinha lottie: o download recebe o conteúdo DESEMBRULHADO, com a key original (reupload)', async () => {
    const { engine, upsert } = makeEngine();
    const spy = vi
      .spyOn(
        engine as unknown as {
          handleIncomingMedia: (...a: unknown[]) => Promise<void>;
        },
        'handleIncomingMedia',
      )
      .mockResolvedValue(undefined);
    const m = msg('LT1', PEER, {
      lottieStickerMessage: { message: { stickerMessage: sticker } },
    });
    await upsert([m]);
    const [arg, , media] = spy.mock.calls[0] as unknown as [
      WAMessage,
      unknown,
      { mediaType: string },
    ];
    expect(arg.key).toBe(m.key);
    // proto.Message tem todos os campos no protótipo (null) — confere o VALOR, não a presença.
    expect(arg.message?.stickerMessage?.mimetype).toBe('application/was');
    expect(arg.message?.lottieStickerMessage).toBeFalsy();
    expect(media).toMatchObject({ mediaType: 'sticker' });
  });
  it('imagem comum: o download recebe a MESMA mensagem (identidade)', async () => {
    const { engine, upsert } = makeEngine();
    const spy = vi
      .spyOn(
        engine as unknown as {
          handleIncomingMedia: (...a: unknown[]) => Promise<void>;
        },
        'handleIncomingMedia',
      )
      .mockResolvedValue(undefined);
    const m = msg('IM1', PEER, {
      imageMessage: { ...sticker, mimetype: 'image/jpeg' },
    });
    await upsert([m]);
    expect(spy.mock.calls[0][0]).toBe(m);
  });
});

// E23 (P-074) — remetente de mensagem RECEBIDA em grupo = o PARTICIPANTE (antes saía o jid do
// grupo). Formas de key conferidas com as funções REAIS da rc14 (decodeMessageNode + cleanMessage):
// modo LID → participant @lid + participantAlt telefone; modo PN → participant telefone +
// participantAlt @lid (Utils/decode-wa-message.js:73-92, :187).
describe('BaileysEngine.onMessagesUpsert — remetente em grupo (E23 · P-074)', () => {
  const PN = '5511933333333@s.whatsapp.net';
  const LID = '44556677@lid';
  const text = { conversation: 'oi grupo' };
  const tick = () => new Promise((r) => setTimeout(r, 0)); // merge é fire-and-forget
  const sent = (events: Ev[]) =>
    events
      .filter((e) => e.name === 'message')
      .map((e) => [e.payload.chatJid, e.payload.senderJid]);

  it('modo LID: senderJid = telefone do participant_pn; par aprendido (merge) e gravado no diretório 1× com o pushName', async () => {
    const { events, upsert, prisma, contacts } = makeEngine();
    await upsert([
      {
        ...msg('G1', GROUP, text, {
          participant: LID,
          participantAlt: PN,
          addressingMode: 'lid',
        }),
        pushName: 'Fulano',
      },
    ]);
    // 2ª mensagem da MESMA pessoa sem o Alt → telefone pelo cache, sem gravar o par de novo
    await upsert([
      {
        ...msg('G2', GROUP, text, { participant: LID, addressingMode: 'lid' }),
        pushName: 'Fulano',
      },
    ]);
    expect(sent(events)).toEqual([
      [GROUP, PN],
      [GROUP, PN],
    ]);
    expect(contacts.record).toHaveBeenCalledTimes(1);
    expect(contacts.record).toHaveBeenCalledWith({
      waId: PN,
      jid: PN,
      lid: LID,
      pushName: 'Fulano',
      source: 'message',
    });
    await tick();
    expect(prisma.waMessage.updateMany).toHaveBeenCalledWith({
      where: { sessionId: 'sess-e22', chatJid: LID },
      data: { chatJid: PN },
    });
  });

  it('modo PN (participantAlt = @lid): senderJid = TELEFONE — trava a fórmula `participantAlt ?? participant`, que daria o @lid', async () => {
    const { events, upsert, contacts } = makeEngine();
    await upsert([
      {
        ...msg('G3', GROUP, text, {
          participant: '5511922222222@s.whatsapp.net',
          participantAlt: '88776655@lid',
          addressingMode: 'pn',
        }),
        pushName: 'Ciclano',
      },
    ]);
    expect(sent(events)).toEqual([[GROUP, '5511922222222@s.whatsapp.net']]);
    expect(contacts.record).toHaveBeenCalledWith({
      waId: '5511922222222@s.whatsapp.net',
      jid: '5511922222222@s.whatsapp.net',
      lid: '88776655@lid',
      pushName: 'Ciclano',
      source: 'message',
    });
  });

  it('LID sem Alt e sem par conhecido (número oculto): fica o @lid, sem diretório nem merge', async () => {
    const { events, upsert, prisma, contacts } = makeEngine();
    await upsert([
      msg('G4', GROUP, text, {
        participant: '99990000@lid',
        addressingMode: 'lid',
      }),
    ]);
    expect(sent(events)).toEqual([[GROUP, '99990000@lid']]);
    expect(contacts.record).not.toHaveBeenCalled();
    await tick();
    expect(prisma.waMessage.updateMany).not.toHaveBeenCalled();
  });

  it('aparelho (:NN) some do participant e do participantAlt', async () => {
    const { events, upsert, contacts } = makeEngine();
    await upsert([
      msg('G5', GROUP, text, {
        participant: '44556677:3@lid',
        participantAlt: '5511933333333:5@s.whatsapp.net',
      }),
      msg('G6', GROUP, text, {
        participant: '5511944444444:12@s.whatsapp.net',
      }),
    ]);
    expect(sent(events)).toEqual([
      [GROUP, PN],
      [GROUP, '5511944444444@s.whatsapp.net'],
    ]);
    expect(contacts.record).toHaveBeenCalledWith(
      expect.objectContaining({ waId: PN, jid: PN, lid: LID }),
    );
  });

  it('1:1 inalterado (participant vazio do cleanMessage; @lid com remoteJidAlt)', async () => {
    const { events, upsert } = makeEngine();
    await upsert([
      msg('D1', PEER, text, { participant: '' }),
      msg('D2', PEER_LID, text, { remoteJidAlt: PEER }),
    ]);
    expect(sent(events)).toEqual([
      [PEER, PEER],
      [PEER, PEER],
    ]);
  });

  it('fromMe em grupo (celular): senderJid = a conta, source phone; o *Alt (nosso LID) não é aprendido', async () => {
    const { events, upsert, prisma, contacts } = makeEngine();
    await upsert([
      msg('G7', GROUP, text, {
        fromMe: true,
        participant: '5511000000000@s.whatsapp.net',
        participantAlt: '11112222333344@lid',
      }),
    ]);
    expect(events[0].payload).toMatchObject({
      chatJid: GROUP,
      senderJid: OUR,
      fromMe: true,
      source: 'phone',
    });
    expect(contacts.record).not.toHaveBeenCalled();
    await tick();
    expect(prisma.waMessage.updateMany).not.toHaveBeenCalled();
  });

  it('grupo sem participant: mantém o jid do grupo (comportamento antigo)', async () => {
    const { events, upsert } = makeEngine();
    await upsert([msg('G8', GROUP, text)]);
    expect(sent(events)).toEqual([[GROUP, GROUP]]);
  });

  it('reação de grupo no upsert (ignorada) ainda ensina o par do participante', async () => {
    const { events, upsert, contacts } = makeEngine();
    await upsert([
      msg(
        'G9',
        GROUP,
        {
          reactionMessage: {
            key: { remoteJid: GROUP, fromMe: true, id: 'ALVO' },
            text: '👍',
          },
        },
        { participant: LID, participantAlt: PN },
      ),
      msg('G10', GROUP, text, { participant: LID }),
    ]);
    expect(sent(events)).toEqual([[GROUP, PN]]);
    expect(contacts.record).toHaveBeenCalledTimes(1);
  });

  it('mídia em grupo: o download recebe o base com o senderJid do participante', async () => {
    const { engine, upsert } = makeEngine();
    const spy = vi
      .spyOn(
        engine as unknown as {
          handleIncomingMedia: (...a: unknown[]) => Promise<void>;
        },
        'handleIncomingMedia',
      )
      .mockResolvedValue(undefined);
    await upsert([
      msg(
        'G11',
        GROUP,
        {
          imageMessage: {
            url: 'https://mmg.whatsapp.net/v/x.enc',
            mediaKey: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=',
            directPath: '/v/x.enc',
            mimetype: 'image/jpeg',
          },
        },
        { participant: LID, participantAlt: PN },
      ),
    ]);
    const base = spy.mock.calls[0][1] as { chatJid: string; senderJid: string };
    expect(base).toMatchObject({ chatJid: GROUP, senderJid: PN });
  });
});

// Revisão E23 (E23-ENG-1): o pushName do participante ia ao diretório SÓ quando o par LID↔telefone
// era NOVO — o nome congelava no 1º valor (ou ficava null), e depois de um restart (par vindo do
// warmLidCache) ou de um par aprendido por reação nunca mais era gravado. O contacts.update da lib
// grava o nome novo na linha do ENDEREÇO da chave (Socket/chats.js:917-924 — no modo LID, a linha
// @lid sem telefone), que o senderName por telefone não alcança.
describe('BaileysEngine.onMessagesUpsert — pushName do participante no diretório (revisão E23)', () => {
  const PN = '5511933333333@s.whatsapp.net';
  const LID = '44556677@lid';
  const text = { conversation: 'oi grupo' };
  const gmsg = (
    id: string,
    pushName: string | undefined,
    extra: Record<string, unknown>,
  ) => ({
    ...msg(id, GROUP, text, extra),
    ...(pushName === undefined ? {} : { pushName }),
  });
  const rec = (pushName: string | null, lid: string | null = LID) => ({
    waId: PN,
    jid: PN,
    lid,
    pushName,
    source: 'message',
  });

  it('par vindo do diretório (restart) + pushName → grava 1×; repetido → 0×; nome novo → grava de novo', async () => {
    const { upsert, contacts, warmLidCache } = makeEngine([
      { lid: LID, jid: PN },
    ]);
    await warmLidCache();
    await upsert([
      gmsg('W1', 'Fulano', { participant: LID, participantAlt: PN }),
    ]);
    await upsert([
      gmsg('W2', 'Fulano', { participant: LID, participantAlt: PN }),
    ]);
    expect(contacts.record).toHaveBeenCalledTimes(1);
    expect(contacts.record).toHaveBeenLastCalledWith(rec('Fulano'));
    await upsert([
      gmsg('W3', 'Fulano Silva', { participant: LID, participantAlt: PN }),
    ]);
    expect(contacts.record).toHaveBeenCalledTimes(2);
    expect(contacts.record).toHaveBeenLastCalledWith(rec('Fulano Silva'));
  });

  it('sem par NESTA mensagem (só o @lid, telefone pelo cache) → grava o nome no telefone, com o @lid', async () => {
    const { events, upsert, contacts, warmLidCache } = makeEngine([
      { lid: LID, jid: PN },
    ]);
    await warmLidCache();
    await upsert([
      gmsg('W4', 'Fulano', { participant: LID, addressingMode: 'lid' }),
    ]);
    expect(events[0].payload.senderJid).toBe(PN);
    expect(contacts.record).toHaveBeenCalledExactlyOnceWith(rec('Fulano'));
  });

  it('1ª mensagem sem pushName e 2ª com → grava só na 2ª', async () => {
    const { upsert, contacts, warmLidCache } = makeEngine([
      { lid: LID, jid: PN },
    ]);
    await warmLidCache();
    await upsert([
      gmsg('W5', undefined, { participant: LID, participantAlt: PN }),
    ]);
    expect(contacts.record).not.toHaveBeenCalled();
    await upsert([
      gmsg('W6', 'Fulano', { participant: LID, participantAlt: PN }),
    ]);
    expect(contacts.record).toHaveBeenCalledExactlyOnceWith(rec('Fulano'));
  });

  it('par NOVO sem pushName grava o par; o nome que chega depois também é gravado', async () => {
    const { upsert, contacts } = makeEngine();
    await upsert([
      gmsg('W7', undefined, { participant: LID, participantAlt: PN }),
    ]);
    await upsert([gmsg('W8', 'Fulano', { participant: LID })]);
    expect(contacts.record.mock.calls).toEqual([[rec(null)], [rec('Fulano')]]);
  });

  it('par aprendido por REAÇÃO (fica só no cache) → a mensagem seguinte grava o nome', async () => {
    const { upsert, reactions, contacts } = makeEngine();
    reactions([
      {
        key: { id: 'ALVO', remoteJid: GROUP, fromMe: true, participant: '' },
        reaction: {
          text: '👍',
          key: {
            id: 'RX',
            remoteJid: GROUP,
            fromMe: false,
            participant: LID,
            participantAlt: PN,
          } as proto.IMessageKey,
        },
      },
    ]);
    await upsert([
      gmsg('W9', 'Fulano', { participant: LID, participantAlt: PN }),
    ]);
    expect(contacts.record).toHaveBeenCalledExactlyOnceWith(rec('Fulano'));
  });

  it('só telefone (sem @lid na chave) + pushName → grava 1× sem lid', async () => {
    const { upsert, contacts } = makeEngine();
    await upsert([
      gmsg('W10', 'Fulano', { participant: PN, addressingMode: 'pn' }),
    ]);
    await upsert([
      gmsg('W11', 'Fulano', { participant: PN, addressingMode: 'pn' }),
    ]);
    expect(contacts.record).toHaveBeenCalledExactlyOnceWith(
      rec('Fulano', null),
    );
  });

  it('@lid sem telefone conhecido → não grava (o contacts.update da lib já guarda o nome no @lid)', async () => {
    const { upsert, contacts } = makeEngine();
    await upsert([gmsg('W12', 'Anon', { participant: '99990000@lid' })]);
    expect(contacts.record).not.toHaveBeenCalled();
  });

  it('memória do último nome gravado tem teto (FIFO de 5000): o mais antigo é esquecido', async () => {
    const { engine, upsert, contacts } = makeEngine();
    const memo = (engine as unknown as { groupPushName: Map<string, string> })
      .groupPushName;
    for (let i = 0; i < 5000; i++) memo.set(`55119${i}@s.whatsapp.net`, 'x');
    await upsert([gmsg('W13', 'Fulano', { participant: PN })]);
    expect(memo.size).toBe(5000);
    expect(memo.has('551190@s.whatsapp.net')).toBe(false); // o mais antigo saiu
    expect(memo.get(PN)).toBe('Fulano');
    // o esquecido volta a ser gravado na próxima mensagem dele
    await upsert([gmsg('W14', 'x', { participant: '551190@s.whatsapp.net' })]);
    expect(contacts.record).toHaveBeenCalledTimes(2);
  });
});
