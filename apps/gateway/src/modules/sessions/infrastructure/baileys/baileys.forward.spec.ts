import { describe, expect, it, vi } from 'vitest';
import {
  BufferJSON,
  generateForwardMessageContent,
  generateWAMessage,
  proto,
  WAMessageStubType,
  type AnyMessageContent,
  type WAMessage,
  type WAMessageUpdate,
} from '@whiskeysockets/baileys';
import {
  ForwardSourceError,
  type ForwardSource,
} from '../../application/engine.port';
import { formatLocation, formatPoll } from '../message-content';
import { forwardableContent } from './baileys-content';
import { BaileysEngine } from './baileys.engine';

// P-068 (E24) — encaminhar no Baileys com a lib REAL (rc14), sem rede: o recorte do conteúdo
// (forwardableContent) passado pelo `generateForwardMessageContent` de verdade, o prepareForward/
// forwardTo com um socket falso cujo sendMessage é o `generateWAMessage` da lib (o que o
// sendMessage real devolve — Socket/messages-send.js:1068-1140), o `raw` das recebidas, as marcas
// de apagada/editada e o texto do eco de localização/enquete (P-077).
type Ev = { name: string; payload: Record<string, unknown> };
type ForwardContent = {
  forward: { key: proto.IMessageKey; message: proto.IMessage };
  force?: boolean;
};
type Ci = { contextInfo?: proto.IContextInfo | null };

const SESSION = 'sess-e24';
const OUR = '5511000000000:7@s.whatsapp.net';
const PEER = '5511988887777@s.whatsapp.net';
const GROUP = '120363000000000001@g.us';
const DEST = '5511977776666';
const DEST_JID = '5511977776666@s.whatsapp.net';
const DEST2_JID = '5511955554444@s.whatsapp.net';
const B64 = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const media = (extra: Record<string, unknown> = {}) => ({
  url: 'https://mmg.whatsapp.net/v/t62.7118-24/x.enc',
  fileSha256: B64,
  fileEncSha256: B64,
  mediaKey: B64,
  directPath: '/v/t62.7118-24/x.enc',
  fileLength: 123456,
  mediaKeyTimestamp: 1727280000,
  ...extra,
});
const quoted = {
  stanzaId: 'CITADA1',
  participant: PEER,
  quotedMessage: { conversation: 'mensagem citada' },
  mentionedJid: [PEER],
};

// Como chega do fio: fromObject → encode → decode (Long, ordem dos campos no decode).
const wire = (obj: Record<string, unknown>) =>
  proto.Message.decode(
    proto.Message.encode(proto.Message.fromObject(obj)).finish(),
  );
// Como fica em wa_messages.raw: encodeProto (toJSON do protobufjs + BufferJSON) e ida/volta do jsonb.
const asRaw = (m: proto.IMessage): unknown =>
  JSON.parse(JSON.stringify(m, BufferJSON.replacer));
const jsonb = (v: unknown): unknown => JSON.parse(JSON.stringify(v));
// Leitura do raw com a mesma fórmula do decodeProto (privado no engine).
const readRaw = (v: unknown): proto.Message =>
  proto.Message.fromObject(
    JSON.parse(JSON.stringify(v), BufferJSON.reviver) as Record<
      string,
      unknown
    >,
  );
// A cópia que o sendMessage({forward}) faz (Utils/messages.js:238-262).
const libForward = (message: proto.IMessage, fromMe = false) =>
  generateForwardMessageContent(
    { key: { remoteJid: PEER, id: 'ORIG', fromMe }, message } as WAMessage,
    false,
  );
const ciOf = (m: proto.IMessage | null | undefined, ctype: string) =>
  (m?.[ctype as keyof proto.IMessage] as Ci | null | undefined)?.contextInfo;

function okContent(m: proto.IMessage) {
  const fc = forwardableContent(m);
  if (!fc.ok) throw new Error(`esperava encaminhável, veio: ${fc.reason}`);
  return fc;
}

const GROUP_IMAGE = {
  senderKeyDistributionMessage: {
    groupId: GROUP,
    axolotlSenderKeyDistributionMessage: Buffer.from('skdm'),
  },
  imageMessage: media({
    mimetype: 'image/jpeg',
    caption: 'legenda 📷',
    contextInfo: quoted,
  }),
  messageContextInfo: { messageSecret: Buffer.alloc(32, 7) },
};
const GIF = {
  videoMessage: media({
    mimetype: 'video/mp4',
    gifPlayback: true,
    gifAttribution: proto.Message.VideoMessage.Attribution.GIPHY,
  }),
};

describe('forwardableContent (P-068) — o que vai para o generateForwardMessageContent', () => {
  it('conversation: vai só o nó; a lib troca por extendedTextMessage com o selo 1', () => {
    const fc = okContent(wire({ conversation: 'oi 😀' }));
    expect(fc.message).toEqual({ conversation: 'oi 😀' });
    expect(fc.forwardingScore).toBeNull();
    const out = libForward(fc.message);
    expect(out.extendedTextMessage?.text).toBe('oi 😀');
    expect(out.extendedTextMessage?.contextInfo).toEqual({
      forwardingScore: 1,
      isForwarded: true,
    });
  });

  it('texto com citação/menções/score 3: citação e menções NÃO vão para o destino; score sobe para 4', () => {
    const fc = okContent(
      wire({
        extendedTextMessage: {
          text: 'veja isso @5511988887777',
          contextInfo: { ...quoted, isForwarded: true, forwardingScore: 3 },
        },
      }),
    );
    expect(fc.forwardingScore).toBe(3);
    const ci = ciOf(libForward(fc.message), 'extendedTextMessage');
    expect(ci).toEqual({ forwardingScore: 4, isForwarded: true });
  });

  it('imagem de GRUPO (SKDM + messageContextInfo + citação): só o imageMessage; selo 1 e nada da citação', () => {
    const fc = okContent(wire(GROUP_IMAGE));
    // O bug: Object.keys(content)[0] da lib = senderKeyDistributionMessage (campo 2).
    expect(Object.keys(fc.message)).toEqual(['imageMessage']);
    expect(fc.ctype).toBe('imageMessage');
    const out = libForward(fc.message);
    expect(out.imageMessage?.contextInfo).toEqual({
      forwardingScore: 1,
      isForwarded: true,
    });
    expect(out.imageMessage?.caption).toBe('legenda 📷');
    // A mídia é a MESMA (sem novo upload): mesma chave e caminho.
    expect(Buffer.from(out.imageMessage!.mediaKey!).toString('base64')).toBe(
      B64,
    );
    expect(out.senderKeyDistributionMessage).toBeFalsy();
  });

  it('premissa (lib real): a original INTEIRA vaza a citação e fica sem selo — por isso o recorte', () => {
    const out = libForward(wire(GROUP_IMAGE));
    const ci = out.imageMessage?.contextInfo;
    expect(ci?.stanzaId).toBe('CITADA1');
    expect(ci?.isForwarded).toBeFalsy();
  });

  it('ptv com messageContextInfo: o selo fica no ptvMessage (era o bug do Object.keys()[0])', () => {
    const orig = wire({
      ptvMessage: media({ mimetype: 'video/mp4', seconds: 8 }),
      messageContextInfo: { messageSecret: Buffer.alloc(32, 1) },
    });
    // No decode o campo 35 (messageContextInfo) vem ANTES do ptvMessage.
    expect(Object.keys(orig)[0]).toBe('messageContextInfo');
    expect(ciOf(libForward(orig), 'ptvMessage')?.isForwarded).toBeFalsy();
    const fc = okContent(orig);
    expect(Object.keys(fc.message)).toEqual(['ptvMessage']);
    expect(ciOf(libForward(fc.message), 'ptvMessage')).toEqual({
      forwardingScore: 1,
      isForwarded: true,
    });
  });

  it('forwardingScore da ORIGINAL (4) é o devolvido — a cópia (5) quem calcula é a lib', () => {
    const fc = okContent(
      wire({
        imageMessage: media({
          mimetype: 'image/jpeg',
          contextInfo: { isForwarded: true, forwardingScore: 4 },
        }),
      }),
    );
    expect(fc.forwardingScore).toBe(4);
    expect(ciOf(libForward(fc.message), 'imageMessage')?.forwardingScore).toBe(
      5,
    );
  });

  it.each<[string, Record<string, unknown>, string]>([
    [
      'documento com legenda (documentWithCaptionMessage)',
      {
        documentWithCaptionMessage: {
          message: {
            documentMessage: media({
              mimetype: 'application/pdf',
              fileName: 'contrato.pdf',
              caption: 'segue',
            }),
          },
        },
      },
      'documentMessage',
    ],
    [
      'contato',
      {
        contactMessage: {
          displayName: 'Maria',
          vcard: 'BEGIN:VCARD\nFN:Maria\nEND:VCARD',
        },
      },
      'contactMessage',
    ],
    [
      'vários contatos',
      {
        contactsArrayMessage: {
          displayName: '2 contatos',
          contacts: [{ displayName: 'A', vcard: 'BEGIN:VCARD\nEND:VCARD' }],
        },
      },
      'contactsArrayMessage',
    ],
    [
      'temporária (ephemeral): sem o invólucro',
      { ephemeralMessage: { message: { extendedTextMessage: { text: 'x' } } } },
      'extendedTextMessage',
    ],
    [
      'enviada pelo celular (deviceSent): sem o invólucro',
      {
        deviceSentMessage: {
          destinationJid: PEER,
          message: { conversation: 'do celular' },
        },
      },
      'conversation',
    ],
    [
      'resposta a uma visualização única (a citação NÃO torna a resposta única)',
      {
        extendedTextMessage: {
          text: 'que foto!',
          contextInfo: {
            stanzaId: 'VO1',
            quotedMessage: {
              viewOnceMessageV2: {
                message: { imageMessage: media({ viewOnce: true }) },
              },
            },
          },
        },
      },
      'extendedTextMessage',
    ],
  ])('%s → encaminhável como %s (um nó só)', (_n, obj, ctype) => {
    const fc = okContent(wire(obj));
    expect(fc.ctype).toBe(ctype);
    expect(Object.keys(fc.message)).toEqual([ctype]);
  });

  it.each<[string, Record<string, unknown>, string]>([
    [
      'enquete V3',
      {
        pollCreationMessageV3: {
          name: 'Qual?',
          options: [{ optionName: 'A' }, { optionName: 'B' }],
          selectableOptionsCount: 1,
        },
        messageContextInfo: { messageSecret: Buffer.alloc(32, 2) },
      },
      'enquete',
    ],
    [
      'evento',
      { eventMessage: { name: 'Churrasco', description: 'sábado' } },
      'evento',
    ],
    [
      'localização em tempo real',
      {
        liveLocationMessage: {
          degreesLatitude: -23.5,
          degreesLongitude: -46.6,
        },
      },
      'localização em tempo real',
    ],
    [
      'convite de grupo',
      {
        groupInviteMessage: {
          groupJid: GROUP,
          inviteCode: 'abc',
          groupName: 'Turma',
        },
      },
      'convite de grupo',
    ],
    [
      'resposta de botão',
      {
        buttonsResponseMessage: {
          selectedButtonId: 'b1',
          selectedDisplayText: 'Sim',
        },
      },
      'mensagem interativa (botões/lista)',
    ],
    [
      'resposta de lista',
      {
        listResponseMessage: {
          title: 'Plano',
          singleSelectReply: { selectedRowId: 'r1' },
        },
      },
      'mensagem interativa (botões/lista)',
    ],
    [
      'lista (empresa)',
      { listMessage: { title: 'Cardápio', description: 'escolha' } },
      'mensagem interativa (botões/lista)',
    ],
    [
      'visualização única V2',
      {
        viewOnceMessageV2: {
          message: { imageMessage: media({ mimetype: 'image/jpeg' }) },
        },
      },
      'visualização única',
    ],
    [
      'visualização única dentro de temporária',
      {
        ephemeralMessage: {
          message: {
            viewOnceMessageV2: {
              message: { videoMessage: media({ mimetype: 'video/mp4' }) },
            },
          },
        },
      },
      'visualização única',
    ],
    [
      'visualização única marcada no nó (viewOnce:true)',
      { imageMessage: media({ mimetype: 'image/jpeg', viewOnce: true }) },
      'visualização única',
    ],
    [
      'áudio de visualização única (V2Extension)',
      {
        viewOnceMessageV2Extension: {
          message: { audioMessage: media({ ptt: true }) },
        },
      },
      'visualização única',
    ],
    [
      'figurinha animada (lottie)',
      {
        lottieStickerMessage: {
          message: { stickerMessage: media({ mimetype: 'application/was' }) },
        },
      },
      'figurinha animada (lottie)',
    ],
  ])('%s → recusa (%s)', (_n, obj, reason) => {
    expect(forwardableContent(wire(obj))).toEqual({ ok: false, reason });
  });

  // O desenho recusa mensagem interativa de empresa (unsupportedLabel lista buttonsMessage e
  // templateMessage). Mas o extractMessageContent da lib converte buttonsMessage/templateMessage
  // hidratado em `conversation`/`imageMessage` ANTES do FORWARDABLE (Utils/messages.js:667-699):
  // o gateway encaminharia só o corpo, sem os botões, como texto comum com selo.
  it.each<[string, Record<string, unknown>]>([
    [
      'mensagem com botões (buttonsMessage)',
      {
        buttonsMessage: {
          contentText: 'Escolha uma opção',
          footerText: 'Loja',
          buttons: [
            { buttonId: 'b1', buttonText: { displayText: 'Sim' }, type: 1 },
          ],
          headerType: 1,
        },
      },
    ],
    [
      'modelo com botões (templateMessage.hydratedTemplate)',
      {
        templateMessage: {
          hydratedTemplate: {
            hydratedContentText: 'Seu pedido saiu',
            hydratedButtons: [
              { index: 0, quickReplyButton: { displayText: 'OK', id: 'ok' } },
            ],
          },
        },
      },
    ],
  ])('%s → recusa como mensagem interativa', (_n, obj) => {
    expect(forwardableContent(wire(obj))).toEqual({
      ok: false,
      reason: 'mensagem interativa (botões/lista)',
    });
  });
});

// Socket falso: o sendMessage devolve o que o sendMessage REAL devolve (generateWAMessage da lib,
// que chama o generateForwardMessageContent e acrescenta o messageContextInfo do reporting token).
function makeEngine(rows: Array<{ raw: unknown }> = []) {
  const events: Ev[] = [];
  const upload = vi.fn();
  let seq = 0;
  const sendMessage = vi.fn(async (jid: string, content: AnyMessageContent) =>
    generateWAMessage(jid, content, {
      userJid: OUR,
      messageId: `NEW${++seq}`,
      upload,
    } as never),
  );
  const prisma = {
    waMessage: {
      findMany: vi.fn(async (): Promise<Array<{ raw: unknown }>> => rows),
      findFirst: vi.fn(
        async (): Promise<{ raw: unknown; text: string | null } | null> => null,
      ),
      updateMany: vi.fn(async (): Promise<{ count: number }> => ({
        count: 1,
      })),
    },
    messageReaction: { updateMany: vi.fn(async () => ({ count: 0 })) },
  };
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug() {},
    trace() {},
  };
  const engine = new BaileysEngine({
    sessionId: SESSION,
    deviceName: 'test',
    prisma,
    logger,
    onEvent: (name: string, payload: unknown) =>
      events.push({ name, payload: payload as Record<string, unknown> }),
    resolveAgent: async () => null,
    resolveProxyConfig: async () => null,
    contacts: {
      record: vi.fn(),
      recordMany: vi.fn(),
      loadLidMap: vi.fn(async () => []),
    },
  } as never);
  const setSock = (s: unknown) =>
    ((engine as unknown as { sock: unknown }).sock = s);
  setSock({ user: { id: OUR, name: 'Diogo' }, sendMessage });
  const internals = engine as unknown as {
    onMessagesUpsert: (u: { messages: WAMessage[]; type: string }) => void;
    onMessagesUpdate: (u: WAMessageUpdate[]) => void;
    loadMessageForRetry: (
      k: proto.IMessageKey,
    ) => Promise<proto.IMessage | undefined>;
  };
  const upsert = (messages: Partial<WAMessage>[], type = 'notify') =>
    internals.onMessagesUpsert({ messages: messages as WAMessage[], type });
  const msgEvents = () => events.filter((e) => e.name === 'message');
  const sentAt = async (i: number) =>
    (await sendMessage.mock.results[i].value) as WAMessage;
  const contentAt = (i: number) =>
    sendMessage.mock.calls[i][1] as unknown as ForwardContent;
  return {
    engine,
    events,
    msgEvents,
    prisma,
    logger,
    sendMessage,
    upload,
    upsert,
    setSock,
    sentAt,
    contentAt,
    update: (u: Array<Partial<WAMessageUpdate>>) =>
      internals.onMessagesUpdate(u as WAMessageUpdate[]),
    retry: (k: proto.IMessageKey) => internals.loadMessageForRetry(k),
  };
}

const src = (extra: Partial<ForwardSource> = {}): ForwardSource => ({
  keyId: 'ORIG1',
  chatJid: PEER,
  fromMe: false,
  type: 'text',
  text: 'bom dia ☀️',
  mediaType: null,
  mimetype: null,
  fileName: null,
  fileSize: null,
  mediaKey: null,
  forwardingScore: null,
  ...extra,
});

const received = (
  id: string,
  remoteJid: string,
  message: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Partial<WAMessage> => ({
  key: { id, remoteJid, fromMe: false, ...extra },
  message: wire(message),
  messageTimestamp: 1_727_280_000,
});

// Revisão da E24: mensagem TEMPORÁRIA vencida sumiu dos aparelhos — a cópia chegaria PERMANENTE (o
// forward troca o contextInfo inteiro, `expiration` incluso). Ainda viva: encaminha normal.
describe('BaileysEngine.prepareForward — mensagem temporária', () => {
  const ephemeral = (expiration: number) =>
    jsonb(
      asRaw(
        wire({
          extendedTextMessage: {
            text: 'some em 24 h',
            contextInfo: { expiration },
          },
        }),
      ),
    );
  const now = Math.floor(Date.now() / 1000);

  it('vencida (timestamp + expiration no passado) → FORWARD_UNSUPPORTED, sem enviar', async () => {
    const t = makeEngine([{ raw: ephemeral(86_400) }]);
    await expect(
      t.engine.prepareForward(src({ timestamp: now - 2 * 86_400 })),
    ).rejects.toMatchObject({
      name: 'ForwardSourceError',
      code: 'FORWARD_UNSUPPORTED',
      message: expect.stringContaining('temporária'),
    });
    expect(t.sendMessage).not.toHaveBeenCalled();
  });

  it('ainda dentro do prazo → encaminha (sem a expiration na cópia)', async () => {
    const t = makeEngine([{ raw: ephemeral(86_400) }]);
    const prepared = await t.engine.prepareForward(
      src({ timestamp: now - 3_600 }),
    );
    await prepared.send(DEST, {});
    const sent = await t.sentAt(0);
    expect(
      sent.message?.extendedTextMessage?.contextInfo?.expiration ?? null,
    ).toBeFalsy();
    expect(sent.message?.extendedTextMessage?.contextInfo).toMatchObject({
      isForwarded: true,
    });
  });
});

describe('BaileysEngine.prepareForward/send (P-068)', () => {
  it('texto recebido: um nó para o destino, eco único source api com selo, cold e chave', async () => {
    const raw = jsonb(
      asRaw(
        wire({
          extendedTextMessage: { text: 'bom dia ☀️', contextInfo: quoted },
        }),
      ),
    );
    const t = makeEngine([{ raw }]);
    const prepared = await t.engine.prepareForward(src());
    expect(t.prisma.waMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: SESSION, keyId: 'ORIG1' },
      }),
    );
    expect(prepared.forwardingScore).toBeNull();

    const r = await prepared.send(DEST, {
      cold: true,
      idempotencyKey: `k:${DEST}`,
    });

    expect(t.sendMessage).toHaveBeenCalledTimes(1);
    expect(t.sendMessage.mock.calls[0][0]).toBe(DEST_JID);
    const c = t.contentAt(0);
    // Só `forward`: sem `force` (original alheia já ganha o selo) nem menções/contextInfo extras.
    expect(Object.keys(c)).toEqual(['forward']);
    expect(c.forward.key).toEqual({
      remoteJid: PEER,
      id: 'ORIG1',
      fromMe: false,
    });
    expect(Object.keys(c.forward.message)).toEqual(['extendedTextMessage']);
    // No fio: selo 1 e a citação da original ficou para trás.
    const sent = await t.sentAt(0);
    expect(sent.message?.extendedTextMessage?.contextInfo).toEqual({
      forwardingScore: 1,
      isForwarded: true,
    });

    expect(t.msgEvents()).toHaveLength(1);
    const p = t.msgEvents()[0].payload;
    expect(p).toMatchObject({
      keyId: 'NEW1',
      chatJid: DEST_JID,
      senderJid: OUR,
      fromMe: true,
      source: 'api',
      type: 'text',
      text: 'bom dia ☀️',
      isForwarded: true,
      forwardingScore: 1,
      isCold: true,
      idempotencyKey: `k:${DEST}`,
    });
    expect(p).not.toHaveProperty('mediaKey');
    // raw do eco = o que foi enviado (retry de descriptografia do envio).
    expect(
      readRaw(jsonb(p.raw)).extendedTextMessage?.contextInfo?.isForwarded,
    ).toBe(true);
    expect(r).toEqual({
      keyId: 'NEW1',
      jid: DEST_JID,
      isForwarded: true,
      forwardingScore: 1,
    });
  });

  it('o append da própria lib e um notify com o mesmo id NÃO geram segundo evento', async () => {
    const t = makeEngine([
      { raw: asRaw(wire({ conversation: 'uma vez só' })) },
    ]);
    const prepared = await t.engine.prepareForward(src());
    await prepared.send(DEST, {});
    const sent = await t.sentAt(0);
    await t.upsert([sent], 'append');
    await t.upsert([sent], 'notify');
    expect(t.msgEvents()).toHaveLength(1);
  });

  it('keyId repetido: linha sem raw antes e com raw depois → usa a que TEM a original', async () => {
    const t = makeEngine([
      { raw: null },
      { raw: asRaw(wire({ conversation: 'texto do raw' })) },
    ]);
    const prepared = await t.engine.prepareForward(
      src({ text: 'texto da coluna' }),
    );
    await prepared.send(DEST, {});
    expect(t.contentAt(0).forward.message.conversation).toBe('texto do raw');
    expect(t.msgEvents()[0].payload.text).toBe('texto do raw');
  });

  it('imagem de grupo recebida (ciclo completo upsert → raw → encaminhar): só o nó, mesma mídia, mediaKey S3 da original', async () => {
    const t = makeEngine();
    const spy = vi
      .spyOn(
        t.engine as unknown as {
          handleIncomingMedia: (...a: unknown[]) => Promise<void>;
        },
        'handleIncomingMedia',
      )
      .mockResolvedValue(undefined);
    await t.upsert([received('G1', GROUP, GROUP_IMAGE, { participant: PEER })]);
    const base = spy.mock.calls[0][1] as { raw: unknown };
    t.prisma.waMessage.findMany.mockResolvedValueOnce([
      { raw: jsonb(base.raw) },
    ]);

    const prepared = await t.engine.prepareForward(
      src({
        keyId: 'G1',
        chatJid: GROUP,
        type: 'image',
        text: 'legenda 📷',
        mediaType: 'image',
        mimetype: 'image/jpeg',
        fileSize: 123456,
        mediaKey: 'media/sess-e24/G1.jpeg',
      }),
    );
    await prepared.send(DEST, { idempotencyKey: 'k:img' });

    expect(Object.keys(t.contentAt(0).forward.message)).toEqual([
      'imageMessage',
    ]);
    const sent = await t.sentAt(0);
    const im = sent.message?.imageMessage;
    expect(im?.contextInfo).toEqual({ forwardingScore: 1, isForwarded: true });
    expect(im?.url).toBe(media().url);
    expect(Buffer.from(im!.mediaKey!).toString('base64')).toBe(B64);
    expect(t.upload).not.toHaveBeenCalled();
    expect(t.msgEvents()).toHaveLength(1);
    expect(t.msgEvents()[0].payload).toMatchObject({
      type: 'image',
      text: 'legenda 📷',
      mediaType: 'image',
      mimetype: 'image/jpeg',
      fileSize: 123456,
      mediaKey: 'media/sess-e24/G1.jpeg',
      isForwarded: true,
      forwardingScore: 1,
      idempotencyKey: 'k:img',
    });
  });

  it('mídia sem mimetype/tamanho no proto: o eco completa com os da ForwardSource', async () => {
    const t = makeEngine([
      {
        raw: asRaw(
          wire({
            documentMessage: {
              url: media().url,
              mediaKey: B64,
              directPath: media().directPath,
            },
          }),
        ),
      },
    ]);
    const prepared = await t.engine.prepareForward(
      src({
        type: 'document',
        text: null,
        mediaType: 'document',
        mimetype: 'application/pdf',
        fileName: 'nota.pdf',
        fileSize: 999,
        mediaKey: 'media/sess-e24/ORIG1.pdf',
      }),
    );
    await prepared.send(DEST, {});
    expect(t.msgEvents()[0].payload).toMatchObject({
      type: 'document',
      mediaType: 'document',
      mimetype: 'application/pdf',
      fileName: 'nota.pdf',
      fileSize: 999,
      mediaKey: 'media/sess-e24/ORIG1.pdf',
    });
  });

  it('original NOSSA (fromMe): sai sem selo, como no app (sem force)', async () => {
    const t = makeEngine([{ raw: asRaw(wire({ conversation: 'minha' })) }]);
    const prepared = await t.engine.prepareForward(
      src({ fromMe: true, text: 'minha' }),
    );
    const r = await prepared.send(DEST, {});
    expect(t.contentAt(0).forward.key.fromMe).toBe(true);
    expect(t.contentAt(0).force).toBeUndefined();
    const sent = await t.sentAt(0);
    expect(sent.message?.extendedTextMessage?.contextInfo?.isForwarded).toBe(
      undefined,
    );
    expect(t.msgEvents()[0].payload).toMatchObject({
      isForwarded: false,
      forwardingScore: null,
      source: 'api',
    });
    expect(r).toMatchObject({ isForwarded: false, forwardingScore: null });
  });

  it('original com score 4: prepare devolve 4 (o limite de destinos decide por ele); a cópia sai com 5', async () => {
    const t = makeEngine([
      {
        raw: asRaw(
          wire({
            extendedTextMessage: {
              text: 'corrente',
              contextInfo: { isForwarded: true, forwardingScore: 4 },
            },
          }),
        ),
      },
    ]);
    const prepared = await t.engine.prepareForward(src());
    expect(prepared.forwardingScore).toBe(4);
    const r = await prepared.send(DEST, {});
    expect(r.forwardingScore).toBe(5);
    expect(t.msgEvents()[0].payload.forwardingScore).toBe(5);
  });

  it('o mesmo prepared para dois destinos: ids distintos e o MESMO selo (a original não é mutada)', async () => {
    const t = makeEngine([{ raw: asRaw(wire({ conversation: 'lote' })) }]);
    const prepared = await t.engine.prepareForward(src());
    const a = await prepared.send(DEST, { idempotencyKey: 'k:a' });
    const b = await prepared.send(DEST2_JID, { idempotencyKey: 'k:b' });
    expect(a).toMatchObject({ keyId: 'NEW1', jid: DEST_JID });
    expect(b).toMatchObject({ keyId: 'NEW2', jid: DEST2_JID });
    expect(b.forwardingScore).toBe(1);
    expect(t.contentAt(1).forward.message).toEqual(
      t.contentAt(0).forward.message,
    );
    expect(t.msgEvents().map((e) => e.payload.idempotencyKey)).toEqual([
      'k:a',
      'k:b',
    ]);
  });

  it('GIF do GIPHY: o enum sobrevive ao raw (fromObject) e à cópia da lib', async () => {
    const t = makeEngine([{ raw: jsonb(asRaw(wire(GIF))) }]);
    const prepared = await t.engine.prepareForward(
      src({ type: 'video', text: null, mediaType: 'video' }),
    );
    await prepared.send(DEST, {});
    expect(t.contentAt(0).forward.message.videoMessage?.gifAttribution).toBe(
      proto.Message.VideoMessage.Attribution.GIPHY,
    );
    const sent = await t.sentAt(0);
    const again = proto.Message.decode(
      proto.Message.encode(sent.message!).finish(),
    );
    expect(again.videoMessage?.gifAttribution).toBe(
      proto.Message.VideoMessage.Attribution.GIPHY,
    );
  });

  it('localização encaminhada: eco com o mesmo texto da recebida (rótulo + link do mapa)', async () => {
    const t = makeEngine([
      {
        raw: asRaw(
          wire({
            locationMessage: {
              degreesLatitude: -23.5,
              degreesLongitude: -46.6,
              name: 'Praça',
            },
          }),
        ),
      },
    ]);
    const prepared = await t.engine.prepareForward(
      src({ type: 'location', text: null }),
    );
    await prepared.send(DEST, {});
    expect(t.msgEvents()[0].payload).toMatchObject({
      type: 'location',
      text: 'Praça\nhttps://maps.google.com/?q=-23.5,-46.6',
      isForwarded: true,
    });
  });

  it('sem raw + texto: remonta extendedTextMessage com o texto; selo = score da coluna + 1', async () => {
    const t = makeEngine([{ raw: null }]);
    const prepared = await t.engine.prepareForward(
      src({ text: 'texto antigo', forwardingScore: 2 }),
    );
    expect(prepared.forwardingScore).toBe(2);
    const r = await prepared.send(DEST, {});
    expect(t.contentAt(0).forward.message).toEqual({
      extendedTextMessage: {
        text: 'texto antigo',
        contextInfo: { isForwarded: true, forwardingScore: 2 },
      },
    });
    expect(r).toMatchObject({ isForwarded: true, forwardingScore: 3 });
    expect(t.msgEvents()[0].payload).toMatchObject({
      type: 'text',
      text: 'texto antigo',
      forwardingScore: 3,
    });
  });

  it('sem raw + texto nunca encaminhado: selo 1', async () => {
    const t = makeEngine([]);
    const prepared = await t.engine.prepareForward(src({ text: 'velho' }));
    expect(prepared.forwardingScore).toBeNull();
    const r = await prepared.send(DEST, {});
    expect(r).toMatchObject({ isForwarded: true, forwardingScore: 1 });
  });

  it.each<[string, Partial<ForwardSource>]>([
    ['imagem', { type: 'image', text: 'legenda', mediaType: 'image' }],
    ['texto vazio', { type: 'text', text: null }],
  ])(
    'sem raw + %s → FORWARD_SOURCE_UNAVAILABLE, nada enviado',
    async (_n, extra) => {
      const t = makeEngine([{ raw: null }]);
      const p = t.engine.prepareForward(src(extra));
      await expect(p).rejects.toBeInstanceOf(ForwardSourceError);
      await expect(p).rejects.toMatchObject({
        code: 'FORWARD_SOURCE_UNAVAILABLE',
      });
      expect(t.sendMessage).not.toHaveBeenCalled();
    },
  );

  it('raw ilegível (o fromObject lança) → FORWARD_SOURCE_UNAVAILABLE e log', async () => {
    const t = makeEngine([{ raw: { imageMessage: 'lixo' } }]);
    await expect(
      t.engine.prepareForward(src({ type: 'image', mediaType: 'image' })),
    ).rejects.toMatchObject({
      name: 'ForwardSourceError',
      code: 'FORWARD_SOURCE_UNAVAILABLE',
    });
    expect(t.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ keyId: 'ORIG1' }),
      expect.stringContaining('ilegível'),
    );
    expect(t.sendMessage).not.toHaveBeenCalled();
  });

  it('raw de enquete → FORWARD_UNSUPPORTED (enquete), nada enviado', async () => {
    const t = makeEngine([
      {
        raw: asRaw(
          wire({
            pollCreationMessageV3: {
              name: 'Qual?',
              options: [{ optionName: 'A' }, { optionName: 'B' }],
            },
          }),
        ),
      },
    ]);
    const p = t.engine.prepareForward(src({ type: 'poll', text: 'Qual?' }));
    await expect(p).rejects.toMatchObject({
      code: 'FORWARD_UNSUPPORTED',
      message: expect.stringContaining('enquete'),
    });
    expect(t.sendMessage).not.toHaveBeenCalled();
  });

  it('sem socket: prepare lança "Sessão não conectada" sem ir ao banco', async () => {
    const t = makeEngine();
    t.setSock(null);
    await expect(t.engine.prepareForward(src())).rejects.toThrow(
      'Sessão não conectada',
    );
    expect(t.prisma.waMessage.findMany).not.toHaveBeenCalled();
  });

  it('socket cai entre o prepare e o envio: send lança "Sessão não conectada" e não há eco', async () => {
    const t = makeEngine([{ raw: asRaw(wire({ conversation: 'x' })) }]);
    const prepared = await t.engine.prepareForward(src());
    t.setSock(null);
    await expect(prepared.send(DEST, {})).rejects.toThrow(
      'Sessão não conectada',
    );
    expect(t.msgEvents()).toHaveLength(0);
  });
});

describe('BaileysEngine.loadMessageForRetry — decodeProto com fromObject (E24)', () => {
  it('GIF GIPHY guardado em raw: o proto do retry, re-encodado, mantém gifAttribution 1 (antes virava 0)', async () => {
    const t = makeEngine();
    t.prisma.waMessage.findFirst.mockResolvedValueOnce({
      raw: jsonb(asRaw(wire(GIF))),
      text: null,
    });
    const m = await t.retry({ id: 'R1', remoteJid: PEER, fromMe: true });
    expect(t.prisma.waMessage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: SESSION, keyId: 'R1', fromMe: true },
      }),
    );
    const again = proto.Message.decode(proto.Message.encode(m!).finish());
    expect(again.videoMessage?.gifAttribution).toBe(1);
    expect(again.videoMessage?.gifPlayback).toBe(true);
    expect(Buffer.from(again.videoMessage!.mediaKey!).toString('base64')).toBe(
      B64,
    );
    // Reidratou o cache: o 2º retry não vai ao banco.
    await t.retry({ id: 'R1', remoteJid: PEER, fromMe: true });
    expect(t.prisma.waMessage.findFirst).toHaveBeenCalledTimes(1);
  });

  it('fonte do texto (enum FontType) também sobrevive', async () => {
    const bold = proto.Message.ExtendedTextMessage.FontType.SYSTEM_BOLD;
    const t = makeEngine();
    t.prisma.waMessage.findFirst.mockResolvedValueOnce({
      raw: jsonb(
        asRaw(wire({ extendedTextMessage: { text: 'x', font: bold } })),
      ),
      text: 'x',
    });
    const m = await t.retry({ id: 'R2', remoteJid: PEER, fromMe: true });
    const again = proto.Message.decode(proto.Message.encode(m!).finish());
    expect(again.extendedTextMessage?.font).toBe(bold);
  });
});

describe('BaileysEngine.onMessagesUpsert — raw das RECEBIDAS (E24)', () => {
  it('texto recebido (notify): o evento leva raw JSON puro (jsonb) que volta ao proto', async () => {
    const t = makeEngine();
    await t.upsert([received('IN1', PEER, { conversation: 'olá 👋' })]);
    expect(t.msgEvents()).toHaveLength(1);
    const p = t.msgEvents()[0].payload;
    expect(p).toMatchObject({ keyId: 'IN1', type: 'text', fromMe: false });
    expect(p.raw).toBeTruthy();
    expect(jsonb(p.raw)).toEqual(p.raw);
    expect(readRaw(jsonb(p.raw)).conversation).toBe('olá 👋');
  });

  it('imagem recebida: o base entregue ao download já tem o raw com a mídia', async () => {
    const t = makeEngine();
    const spy = vi
      .spyOn(
        t.engine as unknown as {
          handleIncomingMedia: (...a: unknown[]) => Promise<void>;
        },
        'handleIncomingMedia',
      )
      .mockResolvedValue(undefined);
    await t.upsert([
      received('IM1', PEER, {
        imageMessage: media({ mimetype: 'image/jpeg', caption: 'foto' }),
      }),
    ]);
    const base = spy.mock.calls[0][1] as { raw: unknown };
    const back = readRaw(jsonb(base.raw));
    expect(back.imageMessage?.caption).toBe('foto');
    expect(Buffer.from(back.imageMessage!.mediaKey!).toString('base64')).toBe(
      B64,
    );
  });

  // Revisão da E24: um reupload no download (CDN 404/410 → updateMediaMessage) MUTA url/directPath
  // dentro da própria mensagem; o `raw` tem de ser serializado na hora de emitir (depois do download),
  // senão o encaminhar reaproveita o caminho morto. Aqui a "mutação" acontece antes do evento sair.
  it('o raw do evento de mídia é serializado da ORIGINAL na hora de emitir (pega o reupload)', async () => {
    const t = makeEngine();
    const original = wire({
      imageMessage: { mimetype: 'image/jpeg', directPath: '/v/morto' },
    });
    const handle = (
      t.engine as unknown as {
        handleIncomingMedia: (...a: unknown[]) => Promise<void>;
      }
    ).handleIncomingMedia.bind(t.engine);
    const base = {
      keyId: 'RU1',
      chatJid: PEER,
      senderJid: PEER,
      fromMe: false,
      source: null,
      timestamp: 1_727_280_000,
      isForwarded: false,
      forwardingScore: null,
      raw: asRaw(original), // o que o upsert serializou ANTES do download
    };
    original.imageMessage!.directPath = '/v/novo'; // o que o reupload faria
    t.setSock({ user: { id: OUR }, sendMessage: t.sendMessage });
    const fetchSpy = vi.fn(async () => {
      throw new Error('rede proibida no teste');
    });
    vi.stubGlobal('fetch', fetchSpy);
    try {
      await handle(
        { key: { id: 'RU1' }, message: original },
        base,
        {
          mediaType: 'image',
          mimetype: 'image/jpeg',
          fileName: null,
          caption: null,
          fileSize: null,
        },
        original,
      );
    } finally {
      vi.unstubAllGlobals();
    }
    const p = t.msgEvents()[0].payload;
    expect(readRaw(jsonb(p.raw)).imageMessage?.directPath).toBe('/v/novo');
    expect(fetchSpy).not.toHaveBeenCalled(); // sem mediaKey a lib nem tenta baixar
  });

  it('imagem recebida cujo download falha (sem url — nenhuma rede): o evento final mantém o raw', async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error('rede proibida no teste');
    });
    vi.stubGlobal('fetch', fetchSpy);
    try {
      const t = makeEngine();
      t.setSock({
        user: { id: OUR },
        sendMessage: t.sendMessage,
        updateMediaMessage: vi.fn(),
      });
      await t.upsert([
        received('IM2', PEER, {
          imageMessage: { mimetype: 'image/jpeg', mediaKey: B64 },
        }),
      ]);
      await vi.waitFor(() => expect(t.msgEvents()).toHaveLength(1));
      const p = t.msgEvents()[0].payload;
      expect(p).toMatchObject({ keyId: 'IM2', type: 'image' });
      expect(p).not.toHaveProperty('mediaKey');
      expect(readRaw(jsonb(p.raw)).imageMessage?.mimetype).toBe('image/jpeg');
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each<[string, Record<string, unknown>, string]>([
    [
      'visualização única',
      {
        viewOnceMessageV2: {
          message: { imageMessage: media({ mimetype: 'image/jpeg' }) },
        },
      },
      'visualização única',
    ],
    [
      'figurinha lottie',
      {
        lottieStickerMessage: {
          message: { stickerMessage: media({ mimetype: 'application/was' }) },
        },
      },
      'lottie',
    ],
  ])(
    '%s recebida: o raw guarda o INVÓLUCRO e o encaminhar recusa',
    async (_n, obj, reason) => {
      const t = makeEngine();
      const spy = vi
        .spyOn(
          t.engine as unknown as {
            handleIncomingMedia: (...a: unknown[]) => Promise<void>;
          },
          'handleIncomingMedia',
        )
        .mockResolvedValue(undefined);
      await t.upsert([received('W1', PEER, obj)]);
      const base = spy.mock.calls[0][1] as { raw: unknown };
      t.prisma.waMessage.findMany.mockResolvedValueOnce([
        { raw: jsonb(base.raw) },
      ]);
      await expect(
        t.engine.prepareForward(
          src({ keyId: 'W1', type: 'image', mediaType: 'image' }),
        ),
      ).rejects.toMatchObject({
        code: 'FORWARD_UNSUPPORTED',
        message: expect.stringContaining(reason),
      });
    },
  );
});

describe('BaileysEngine.onMessagesUpdate — apagada/editada (E24)', () => {
  const tick = () => new Promise((r) => setTimeout(r, 0));

  it('REVOKE (message:null + stub): marca revokedAt nas linhas do keyId desta sessão, sem message.ack', () => {
    const t = makeEngine();
    t.update([
      {
        key: { id: 'X', remoteJid: PEER, fromMe: false },
        update: { message: null, messageStubType: WAMessageStubType.REVOKE },
      },
    ]);
    expect(t.prisma.waMessage.updateMany).toHaveBeenCalledWith({
      where: { sessionId: SESSION, keyId: 'X', fromMe: false },
      data: { revokedAt: expect.any(Date) },
    });
    expect(t.events.filter((e) => e.name === 'message.ack')).toHaveLength(0);
  });

  it('EDIT (message.editedMessage): marca editedAt, sem message.ack', () => {
    const t = makeEngine();
    t.update([
      {
        key: { id: 'E1', remoteJid: PEER, fromMe: false },
        update: {
          message: {
            editedMessage: { message: { conversation: 'versão nova' } },
          },
          messageTimestamp: 1_727_280_100,
        },
      },
    ]);
    expect(t.prisma.waMessage.updateMany).toHaveBeenCalledWith({
      where: { sessionId: SESSION, keyId: 'E1', fromMe: false },
      data: { editedAt: expect.any(Date) },
    });
    expect(t.events).toHaveLength(0);
  });

  // Revisão da E24: a lib não confere o autor do REVOKE/EDIT (process-message.js:298-307) — um
  // contato mandando REVOKE com o id de uma mensagem NOSSA não pode marcá-la (e vice-versa).
  it('a marca só vale do MESMO lado (fromMe da key entra no filtro)', () => {
    const t = makeEngine();
    t.update([
      {
        key: { id: 'NOSSA', remoteJid: PEER, fromMe: false },
        update: { message: null, messageStubType: WAMessageStubType.REVOKE },
      },
    ]);
    expect(t.prisma.waMessage.updateMany).toHaveBeenCalledWith({
      where: { sessionId: SESSION, keyId: 'NOSSA', fromMe: false },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('DELIVERY_ACK continua virando message.ack (e não marca nada)', () => {
    const t = makeEngine();
    t.update([
      {
        key: { id: 'A1', remoteJid: PEER, fromMe: true },
        update: { status: proto.WebMessageInfo.Status.DELIVERY_ACK },
      },
    ]);
    expect(t.events).toEqual([
      {
        name: 'message.ack',
        payload: expect.objectContaining({
          keyId: 'A1',
          chatJid: PEER,
          fromMe: true,
          status: 'delivered',
        }),
      },
    ]);
    expect(t.prisma.waMessage.updateMany).not.toHaveBeenCalled();
  });

  it('falha do banco ao marcar é logada (warn com err/keyId/field) e não estoura', async () => {
    const t = makeEngine();
    t.prisma.waMessage.updateMany.mockRejectedValueOnce(new Error('pg fora'));
    t.update([
      {
        key: { id: 'X2', remoteJid: PEER },
        update: { message: null, messageStubType: WAMessageStubType.REVOKE },
      },
    ]);
    await tick();
    expect(t.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ keyId: 'X2', field: 'revokedAt' }),
      expect.any(String),
    );
  });

  // O event-buffer da lib FUNDE updates da mesma key numa janela (Object.assign em
  // Utils/event-buffer.js:425-443 — reconexão/offline): um ACK e a edição/apagamento da mesma
  // mensagem chegam num update só. A marca não pode engolir o ACK (ledger do score_saude).
  it.each<[string, Partial<WAMessageUpdate['update']>, string]>([
    [
      'edição',
      { message: { editedMessage: { message: { conversation: 'nova' } } } },
      'editedAt',
    ],
    [
      'apagamento',
      { message: null, messageStubType: WAMessageStubType.REVOKE },
      'revokedAt',
    ],
  ])(
    'ACK fundido com %s no mesmo update: marca E emite o message.ack',
    (_n, upd, field) => {
      const t = makeEngine();
      t.update([
        {
          key: { id: 'M1', remoteJid: PEER, fromMe: true },
          update: { ...upd, status: proto.WebMessageInfo.Status.DELIVERY_ACK },
        },
      ]);
      expect(t.prisma.waMessage.updateMany).toHaveBeenCalledWith({
        where: { sessionId: SESSION, keyId: 'M1', fromMe: true },
        data: { [field]: expect.any(Date) },
      });
      expect(t.events.filter((e) => e.name === 'message.ack')).toHaveLength(1);
    },
  );
});

describe('P-077 — eco de localização e enquete enviadas pela API', () => {
  it('sendLocation: texto do eco = formatLocation (rótulo + link do mapa)', async () => {
    const t = makeEngine();
    const r = await t.engine.sendLocation(DEST, {
      latitude: -23.5,
      longitude: -46.6,
      name: 'Praça',
      address: 'Rua X, 10',
      cold: true,
      idempotencyKey: 'k:loc',
    });
    expect(t.sendMessage.mock.calls[0][1]).toEqual({
      location: {
        degreesLatitude: -23.5,
        degreesLongitude: -46.6,
        name: 'Praça',
        address: 'Rua X, 10',
      },
    });
    const expected = formatLocation({
      latitude: -23.5,
      longitude: -46.6,
      name: 'Praça',
      address: 'Rua X, 10',
    });
    expect(expected).toBe(
      'Praça — Rua X, 10\nhttps://maps.google.com/?q=-23.5,-46.6',
    );
    expect(t.msgEvents()).toHaveLength(1);
    expect(t.msgEvents()[0].payload).toMatchObject({
      keyId: 'NEW1',
      chatJid: DEST_JID,
      type: 'location',
      text: expected,
      source: 'api',
      isCold: true,
      idempotencyKey: 'k:loc',
    });
    expect(t.msgEvents()[0].payload.raw).toBeTruthy();
    expect(r).toEqual({ keyId: 'NEW1', jid: DEST_JID });
  });

  it('sendPoll: texto do eco = formatPoll (pergunta + "• opção"); escolha única = V3', async () => {
    const t = makeEngine();
    await t.engine.sendPoll(DEST, {
      name: 'Qual dia?',
      options: ['Seg', 'Ter'],
    });
    const expected = formatPoll('Qual dia?', ['Seg', 'Ter']);
    expect(expected).toBe('Qual dia?\n• Seg\n• Ter');
    expect(t.msgEvents()[0].payload).toMatchObject({
      type: 'poll',
      text: expected,
      source: 'api',
    });
    const sent = await t.sentAt(0);
    expect(sent.message?.pollCreationMessageV3?.name).toBe('Qual dia?');
  });

  it('sendPoll múltipla: selectableCount 0 e o mesmo texto', async () => {
    const t = makeEngine();
    await t.engine.sendPoll(DEST, {
      name: 'Sabores',
      options: ['Uva', 'Maçã', 'Pera'],
      multi: true,
    });
    expect(t.sendMessage.mock.calls[0][1]).toMatchObject({
      poll: { selectableCount: 0 },
    });
    expect(t.msgEvents()[0].payload.text).toBe(
      'Sabores\n• Uva\n• Maçã\n• Pera',
    );
  });
});
