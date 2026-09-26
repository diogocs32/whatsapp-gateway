import { createCipheriv } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMediaKeys, proto, type WAMessage } from '@whiskeysockets/baileys';
import { BaileysEngine } from './baileys.engine';

// A rc14 real decifra a resposta do fetch falso. Nenhum socket, proxy ou CDN real é usado.
const SESSION = 'sess-e10';
const PEER = '5511988887777@s.whatsapp.net';
const MEDIA_KEY = Buffer.alloc(32, 7);
const BODY = Buffer.from('midia de teste e10');
type Kind = 'image' | 'ptv';
type MediaNode = {
  url?: string | null;
  directPath?: string | null;
  mediaKey?: Uint8Array | null;
};
type MessageEvent = { name: string; payload: Record<string, unknown> };

async function encryptedResponse(kind: Kind): Promise<Response> {
  const { iv, cipherKey } = await getMediaKeys(MEDIA_KEY, kind);
  const cipher = createCipheriv('aes-256-cbc', cipherKey, iv);
  // A rc14 ignora os dez bytes finais de MAC neste caminho; o corpo cifrado é sintético.
  const encrypted = Buffer.concat([
    cipher.update(BODY),
    cipher.final(),
    Buffer.alloc(10),
  ]);
  return new Response(encrypted, { status: 200 });
}

function incoming(kind: Kind, id = 'MEDIA1'): WAMessage {
  const media = {
    url: 'https://mmg.whatsapp.net/v/expired',
    mediaKey: MEDIA_KEY,
    mimetype: kind === 'image' ? 'image/jpeg' : 'video/mp4',
    fileLength: BODY.length,
  };
  return {
    key: { id, remoteJid: PEER, fromMe: false },
    message: proto.Message.fromObject(
      kind === 'image' ? { imageMessage: media } : { ptvMessage: media },
    ),
    messageTimestamp: 1_727_280_000,
  } as WAMessage;
}

function mediaNode(m: WAMessage, kind: Kind): MediaNode {
  return (
    kind === 'image' ? m.message?.imageMessage : m.message?.ptvMessage
  ) as MediaNode;
}

function harness(
  createMediaDispatcher: (() => unknown) | null = () => ({
    close: async () => undefined,
    destroy: () => undefined,
  }),
) {
  const events: MessageEvent[] = [];
  const storeMedia = vi.fn(
    async (_key: string, _body: Buffer, _contentType: string) => undefined,
  );
  const updateMediaMessage = vi.fn(async (m: WAMessage) => m);
  const engine = new BaileysEngine({
    sessionId: SESSION,
    deviceName: 'teste',
    prisma: {},
    logger: { info() {}, warn() {}, error() {}, debug() {}, trace() {} },
    onEvent: (name: string, payload: unknown) =>
      events.push({ name, payload: payload as Record<string, unknown> }),
    storeMedia,
  } as never);
  const internals = engine as unknown as {
    sock: unknown;
    createMediaDispatcher: (() => unknown) | null;
    handleIncomingMedia: (
      m: WAMessage,
      base: Record<string, unknown>,
      media: Record<string, unknown>,
      original: proto.IMessage | null | undefined,
    ) => Promise<void>;
  };
  internals.sock = { updateMediaMessage };
  internals.createMediaDispatcher = createMediaDispatcher;

  const receive = (m: WAMessage, kind: Kind = 'image') =>
    internals.handleIncomingMedia(
      m,
      {
        keyId: m.key.id,
        chatJid: PEER,
        senderJid: PEER,
        fromMe: false,
        source: null,
        timestamp: 1_727_280_000,
        isForwarded: false,
        forwardingScore: null,
        raw: null,
      },
      {
        mediaType: kind === 'image' ? 'image' : 'video',
        mimetype: kind === 'image' ? 'image/jpeg' : 'video/mp4',
        fileName: null,
        caption: null,
        fileSize: BODY.length,
      },
      m.message,
    );
  const messages = () => events.filter((e) => e.name === 'message');
  return { events, messages, storeMedia, updateMediaMessage, receive };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('BaileysEngine — mídia recebida E10', () => {
  it('leva o dispatcher da sessão até o fetch real da rc14 e armazena o binário', async () => {
    const dispatcher = {
      close: vi.fn(async () => undefined),
      destroy: vi.fn(),
    };
    const createMediaDispatcher = vi.fn(() => dispatcher);
    const h = harness(createMediaDispatcher);
    const fetchMock = vi.fn(async (_url: string, _init: unknown) =>
      encryptedResponse('image'),
    );
    vi.stubGlobal('fetch', fetchMock);

    await h.receive(incoming('image'));

    expect(createMediaDispatcher).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      dispatcher,
      method: 'GET',
    });
    expect(h.storeMedia).toHaveBeenCalledOnce();
    expect(h.storeMedia.mock.calls[0]?.[1]).toEqual(BODY);
    expect(h.messages()).toHaveLength(1);
    expect(h.messages()[0].payload).toMatchObject({
      type: 'image',
      mediaKey: `media/${SESSION}/MEDIA1.jpeg`,
    });
    expect(dispatcher.destroy).toHaveBeenCalledTimes(1);
  });

  it('publica os metadados em até 90 s quando o stream responde mas nunca termina', async () => {
    vi.useFakeTimers();
    const dispatcher = { destroy: vi.fn() };
    const h = harness(() => dispatcher);
    let streamController:
      ReadableStreamDefaultController<Uint8Array> | undefined;
    const fetchMock = vi.fn(
      async (_url: string, _init: unknown) =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              streamController = controller;
              // O stream chega a iniciar; é o EOF que nunca vem.
              controller.enqueue(Buffer.alloc(16));
            },
          }),
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const pending = h.receive(incoming('image'));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(90_000);
    await pending;

    expect(h.messages()).toHaveLength(1);
    expect(h.messages()[0].payload).toMatchObject({ type: 'image' });
    expect(h.messages()[0].payload).not.toHaveProperty('mediaKey');
    expect(h.storeMedia).not.toHaveBeenCalled();
    expect(dispatcher.destroy).toHaveBeenCalledTimes(1);
    streamController?.close();
    await Promise.resolve();
    expect(h.messages()).toHaveLength(1);
  });

  it('falha sem fetch direto quando o proxy da sessão não tem dispatcher suportado', async () => {
    const h = harness(null); // SOCKS4/5: até existir prova, só metadados.
    const fetchMock = vi.fn(async (_url: string, _init: unknown) =>
      encryptedResponse('image'),
    );
    vi.stubGlobal('fetch', fetchMock);

    await h.receive(incoming('image'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(h.storeMedia).not.toHaveBeenCalled();
    expect(h.messages()).toHaveLength(1);
    expect(h.messages()[0].payload).not.toHaveProperty('mediaKey');
  });

  it('falha sem reupload para erro da CDN diferente de 404/410', async () => {
    const h = harness();
    const fetchMock = vi.fn(
      async (_url: string, _init: unknown) =>
        new Response('indisponível', { status: 503 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await h.receive(incoming('image'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(h.updateMediaMessage).not.toHaveBeenCalled();
    expect(h.storeMedia).not.toHaveBeenCalled();
    expect(h.messages()).toHaveLength(1);
    expect(h.messages()[0].payload).not.toHaveProperty('mediaKey');
  });

  it.each([
    [404, 'image'],
    [410, 'ptv'],
  ] as const)(
    'pede reupload após HTTP %i, baixa de novo e preserva o raw de %s',
    async (status, kind) => {
      const dispatcher = {
        close: vi.fn(async () => undefined),
        destroy: vi.fn(),
      };
      const h = harness(() => dispatcher);
      const m = incoming(kind);
      const originalMedia = mediaNode(m, kind);
      h.updateMediaMessage.mockImplementation(async (requested: WAMessage) => {
        if (kind === 'ptv') {
          // updateMediaMessage da rc14 chama assertMediaContent, que só aceita videoMessage.
          expect(requested.message?.videoMessage).toBe(originalMedia);
        }
        originalMedia.directPath = '/v/fresh';
        originalMedia.url = 'https://mmg.whatsapp.net/v/fresh';
        return requested;
      });
      const fetchMock = vi.fn(async (_url: string, _init: unknown) =>
        fetchMock.mock.calls.length === 1
          ? new Response('URL vencida', { status })
          : encryptedResponse(kind),
      );
      vi.stubGlobal('fetch', fetchMock);

      await h.receive(m, kind);

      expect(h.updateMediaMessage).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/v/fresh');
      expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ dispatcher });
      expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ dispatcher });
      expect(h.storeMedia.mock.calls[0]?.[1]).toEqual(BODY);
      expect(h.messages()).toHaveLength(1);
      expect(h.messages()[0].payload).toHaveProperty('mediaKey');
      const raw = h.messages()[0].payload.raw as Record<string, MediaNode>;
      expect(
        raw[kind === 'image' ? 'imageMessage' : 'ptvMessage']?.directPath,
      ).toBe('/v/fresh');
    },
  );

  it('limita a espera do reupload, ignora rejeição tardia e não tenta um segundo fetch', async () => {
    vi.useFakeTimers();
    const h = harness();
    let rejectUpdate: ((reason: Error) => void) | undefined;
    h.updateMediaMessage.mockImplementation(
      () =>
        new Promise<WAMessage>((_resolve, reject) => {
          rejectUpdate = reject;
        }),
    );
    const fetchMock = vi.fn(
      async (_url: string, _init: unknown) =>
        new Response('URL vencida', { status: 404 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const pending = h.receive(incoming('image'));
    await vi.waitFor(() =>
      expect(h.updateMediaMessage).toHaveBeenCalledTimes(1),
    );
    await vi.advanceTimersByTimeAsync(20_000);
    await pending;

    expect(h.messages()).toHaveLength(1);
    expect(h.messages()[0].payload).not.toHaveProperty('mediaKey');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    rejectUpdate?.(new Error('resposta tardia do telefone'));
    await Promise.resolve();
    expect(h.messages()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('o segundo download usa o saldo do teto total de 90 s', async () => {
    vi.useFakeTimers();
    const dispatcher = { destroy: vi.fn() };
    const h = harness(() => dispatcher);
    h.updateMediaMessage.mockImplementation(async (requested: WAMessage) => {
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      requested.message!.imageMessage!.url = 'https://mmg.whatsapp.net/v/fresh';
      return requested;
    });
    let streamController:
      ReadableStreamDefaultController<Uint8Array> | undefined;
    const fetchMock = vi.fn(async (_url: string, _init: unknown) =>
      fetchMock.mock.calls.length === 1
        ? new Response('URL vencida', { status: 404 })
        : new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                streamController = controller;
                controller.enqueue(Buffer.alloc(16));
              },
            }),
          ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const pending = h.receive(incoming('image'));
    await vi.waitFor(() => expect(h.updateMediaMessage).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(15_000);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(75_000);
    await pending;

    expect(h.messages()).toHaveLength(1);
    expect(h.messages()[0].payload).not.toHaveProperty('mediaKey');
    expect(h.storeMedia).not.toHaveBeenCalled();
    expect(dispatcher.destroy).toHaveBeenCalledOnce();
    streamController?.close();
    await Promise.resolve();
    expect(h.messages()).toHaveLength(1);
  });
});
