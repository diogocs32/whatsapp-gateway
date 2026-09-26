import { describe, expect, it, vi } from 'vitest';
import type { BaileysEngineDeps } from '../baileys/baileys.engine';
import { WWebJSEngine } from './wwebjs.engine';

// P-066 (E22) — efeito no ponto de saída da engine wwebjs (onEvent), sem Chromium: os handlers
// privados recebem objetos no formato de `Message`/`Reaction` da 1.34.7. Cobre o describe ANTES da
// espera de 3 s (tipo de sistema do celular não vira handoff), mídia sem arquivo sem download, tipo
// sem cartão de mídia COM arquivo ainda baixado (binário recuperável), reação com a chave-alvo em
// `$1` e o backfill com a mesma descrição.
type Ev = { name: string; payload: Record<string, unknown> };

function makeEngine() {
  const events: Ev[] = [];
  const stored: string[] = [];
  const noop = () => undefined;
  const deps = {
    sessionId: 'sess-e22-wwebjs',
    deviceName: 'test',
    prisma: {} as BaileysEngineDeps['prisma'],
    logger: {
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
      fatal: noop,
      trace: noop,
    } as unknown as BaileysEngineDeps['logger'],
    onEvent: (name: string, payload: unknown) =>
      events.push({ name, payload: payload as Record<string, unknown> }),
    storeMedia: async (key: string) => {
      stored.push(key);
    },
  } as unknown as BaileysEngineDeps;
  const engine = new WWebJSEngine(deps);
  const priv = engine as unknown as {
    client: unknown;
    onMessageCreate: (m: unknown) => Promise<void>;
    onReaction: (r: unknown) => Promise<void>;
    toHistoryMessage: (m: unknown) => Promise<Record<string, unknown> | null>;
  };
  priv.client = { info: { wid: { _serialized: '5511000@c.us' } } };
  return { priv, events, stored };
}

const PEER = '5511988887777@c.us';
const msg = (over: Record<string, unknown>) => ({
  id: {
    _serialized: `false_${PEER}_3EB0${Math.random().toString(16).slice(2, 8)}`,
  },
  from: PEER,
  to: '5511000@c.us',
  fromMe: false,
  timestamp: 1_790_000_000,
  body: '',
  hasMedia: false,
  ...over,
});

describe('WWebJSEngine.onMessageCreate (P-066)', () => {
  it('tipo de sistema DO CELULAR (fromMe) sai na hora, sem evento (não espera 3 s nem vira handoff)', async () => {
    const { priv, events } = makeEngine();
    const t0 = Date.now();
    await priv.onMessageCreate(msg({ type: 'call_log', fromMe: true }));
    expect(Date.now() - t0).toBeLessThan(500);
    expect(events).toHaveLength(0);
  });

  it('localização sai com type location e o texto do cartão (nunca o body de miniatura)', async () => {
    const { priv, events } = makeEngine();
    await priv.onMessageCreate(
      msg({
        type: 'location',
        body: '/9j/miniatura-base64',
        location: {
          latitude: -23.5,
          longitude: -46.6,
          name: 'Praça',
          address: 'Centro',
        },
        isForwarded: true,
        forwardingScore: 2,
      }),
    );
    expect(events[0]).toEqual({
      name: 'message',
      payload: expect.objectContaining({
        chatJid: PEER,
        type: 'location',
        text: 'Praça — Centro\nhttps://maps.google.com/?q=-23.5,-46.6',
        isForwarded: true,
        forwardingScore: 2,
        source: null,
      }),
    });
  });

  it('imagem sem arquivo (hasMedia false): não chama downloadMedia, emite só os metadados', async () => {
    const { priv, events } = makeEngine();
    const downloadMedia = vi.fn();
    await priv.onMessageCreate(
      msg({
        type: 'image',
        hasMedia: false,
        body: '/9j/miniatura',
        rawData: { caption: 'legenda' },
        downloadMedia,
      }),
    );
    expect(downloadMedia).not.toHaveBeenCalled();
    expect(events[0].payload).toMatchObject({
      type: 'image',
      text: 'legenda',
      mediaType: 'image',
    });
    expect(events[0].payload.mediaKey).toBeUndefined();
  });

  it('tipo sem cartão de mídia COM arquivo (produto): baixa como documento e mantém type other', async () => {
    const { priv, events, stored } = makeEngine();
    await priv.onMessageCreate(
      msg({
        type: 'product',
        title: 'Camiseta',
        hasMedia: true,
        downloadMedia: async () => ({
          data: Buffer.from('x').toString('base64'),
          mimetype: 'image/jpeg',
          filename: null,
        }),
      }),
    );
    expect(stored).toHaveLength(1);
    expect(events[0].payload).toMatchObject({
      type: 'other',
      text: 'Camiseta',
      mediaType: 'document',
      mediaKey: stored[0],
    });
  });
});

describe('WWebJSEngine.onReaction (E22 — chave-alvo em $1, remote como Wid)', () => {
  it('emite message.reaction com keyId do $1, chat do Wid e timestamp inteiro', async () => {
    const { priv, events } = makeEngine();
    await priv.onReaction({
      id: { fromMe: false },
      msgId: { $1: `true_${PEER}_3EB0AA`, remote: { _serialized: PEER } },
      reaction: '🔥',
      senderId: PEER,
      timestamp: 1_790_000_100.75,
    });
    expect(events).toEqual([
      {
        name: 'message.reaction',
        payload: {
          keyId: `true_${PEER}_3EB0AA`,
          chatJid: PEER,
          senderJid: PEER,
          emoji: '🔥',
          fromMe: false,
          timestamp: 1_790_000_100,
        },
      },
    ]);
  });
});

describe('WWebJSEngine.toHistoryMessage (backfill com a mesma descrição)', () => {
  it('ignora notificação de sistema e descreve enquete', async () => {
    const { priv } = makeEngine();
    expect(
      await priv.toHistoryMessage(msg({ type: 'e2e_notification' })),
    ).toBeNull();
    expect(
      await priv.toHistoryMessage(
        msg({
          type: 'poll_creation',
          pollName: 'Qual dia?',
          pollOptions: [{ name: 'Seg' }, { name: 'Ter' }],
        }),
      ),
    ).toMatchObject({
      type: 'poll',
      text: 'Qual dia?\n• Seg\n• Ter',
      mediaType: null,
      isForwarded: false,
      forwardingScore: null,
    });
  });
});
