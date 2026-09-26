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

function makeEngine() {
  const events: Ev[] = [];
  const prisma = {
    waMessage: { updateMany: vi.fn(async () => ({ count: 0 })) },
    messageReaction: { updateMany: vi.fn(async () => ({ count: 0 })) },
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
    contacts: { record: vi.fn(), recordMany: vi.fn() },
  } as never);
  (engine as unknown as { sock: unknown }).sock = {
    user: { id: OUR, name: 'Diogo' },
  };
  const upsert = (messages: Partial<WAMessage>[]) =>
    (
      engine as unknown as {
        onMessagesUpsert: (u: { messages: WAMessage[]; type: string }) => void;
      }
    ).onMessagesUpsert({ messages: messages as WAMessage[], type: 'notify' });
  const reactions = (
    rs: { key: proto.IMessageKey; reaction: proto.IReaction }[],
  ) =>
    (engine as unknown as { onReactions: (r: typeof rs) => void }).onReactions(
      rs,
    );
  return { engine, events, prisma, upsert, reactions };
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

describe('BaileysEngine.onMessagesUpsert (P-066)', () => {
  it('reação do contato no upsert NÃO vira evento message', () => {
    const { events, upsert } = makeEngine();
    upsert([
      msg('R1', PEER, {
        reactionMessage: {
          key: { remoteJid: PEER, fromMe: true, id: 'ALVO' },
          text: '👍',
        },
      }),
    ]);
    expect(events.filter((e) => e.name === 'message')).toHaveLength(0);
  });

  it('reação NOSSA pelo celular (fromMe) também não — sem handoff falso', () => {
    const { events, upsert } = makeEngine();
    upsert([
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

  it('localização encaminhada sai como message type location com texto e selo', () => {
    const { events, upsert } = makeEngine();
    upsert([
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

  it('texto comum segue igual (fromMe do celular = source phone, não encaminhada)', () => {
    const { events, upsert } = makeEngine();
    upsert([msg('T1', PEER, { conversation: 'oi 😀' }, { fromMe: true })]);
    expect(events[0].payload).toMatchObject({
      type: 'text',
      text: 'oi 😀',
      fromMe: true,
      source: 'phone',
      isForwarded: false,
      forwardingScore: null,
    });
  });

  it('voto do contato numa enquete → message poll_vote (continua contando como resposta)', () => {
    const { events, upsert } = makeEngine();
    upsert([
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
    upsert([
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
  it('remetente é QUEM REAGIU (reaction.key.participant), não o autor da mensagem-alvo', () => {
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

  it('grupo: participant telefone + participantAlt @lid → telefone; a mesma pessoa mantém o senderKey depois de o par ser aprendido', () => {
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
  it('figurinha lottie: o download recebe o conteúdo DESEMBRULHADO, com a key original (reupload)', () => {
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
    upsert([m]);
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
  it('imagem comum: o download recebe a MESMA mensagem (identidade)', () => {
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
    upsert([m]);
    expect(spy.mock.calls[0][0]).toBe(m);
  });
});
