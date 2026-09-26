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
    lidToPnCache: Map<string, string>;
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

// E23 (P-074) — remetente de mensagem RECEBIDA em grupo = o autor (`msg.author`), com @lid → telefone
// SÓ pelo cache em memória: resolver o autor na hora custaria um page.evaluate +
// enforceLidAndPnRetrieval → queryWidExists (rede) por mensagem (Injected/Utils.js:1795-1823).
describe('WWebJSEngine — remetente em grupo (E23 · P-074)', () => {
  const GROUP = '120363000000000001@g.us';
  const LID = '44556677@lid';
  const groupMsg = (over: Record<string, unknown>) =>
    msg({
      id: {
        _serialized: `false_${GROUP}_3EB0${Math.random().toString(16).slice(2, 8)}`,
      },
      from: GROUP,
      type: 'chat',
      body: 'oi grupo',
      ...over,
    });
  // Página falsa: se alguém tentar resolver o autor pelo WhatsApp Web, o spy acusa.
  const withPage = (priv: ReturnType<typeof makeEngine>['priv']) => {
    const evaluate = vi.fn(async () => null);
    priv.client = {
      info: { wid: { _serialized: '5511000@c.us' } },
      pupPage: { evaluate },
    };
    return evaluate;
  };

  it('author @c.us → senderJid = author; chatJid segue o grupo', async () => {
    const { priv, events } = makeEngine();
    await priv.onMessageCreate(groupMsg({ author: '5511922222222@c.us' }));
    expect(events[0].payload).toMatchObject({
      chatJid: GROUP,
      senderJid: '5511922222222@c.us',
      fromMe: false,
      source: null,
    });
  });

  it('author @lid com par no cache → telefone @c.us', async () => {
    const { priv, events } = makeEngine();
    priv.lidToPnCache.set(LID, '5511933333333@c.us');
    await priv.onMessageCreate(groupMsg({ author: LID }));
    expect(events[0].payload.senderJid).toBe('5511933333333@c.us');
  });

  it('author @lid SEM cache → fica o @lid e NÃO consulta o WhatsApp Web (zero evaluate/rede)', async () => {
    const { priv, events } = makeEngine();
    const evaluate = withPage(priv);
    await priv.onMessageCreate(groupMsg({ author: '99990000:2@lid' }));
    expect(events[0].payload.senderJid).toBe('99990000@lid');
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('1:1 inalterado, mesmo com author espúrio', async () => {
    const { priv, events } = makeEngine();
    await priv.onMessageCreate(
      msg({ type: 'chat', body: 'oi', author: '5511922222222@c.us' }),
    );
    expect(events[0].payload).toMatchObject({ chatJid: PEER, senderJid: PEER });
  });

  it('grupo sem author → mantém o jid do grupo (comportamento antigo)', async () => {
    const { priv, events } = makeEngine();
    await priv.onMessageCreate(groupMsg({}));
    expect(events[0].payload).toMatchObject({
      chatJid: GROUP,
      senderJid: GROUP,
    });
  });

  it('fromMe em grupo (celular) → senderJid = a conta, source phone', async () => {
    vi.useFakeTimers();
    try {
      const { priv, events } = makeEngine();
      const p = priv.onMessageCreate(
        groupMsg({
          fromMe: true,
          from: '5511000@c.us',
          to: GROUP,
          author: '5511000@c.us',
        }),
      );
      await vi.advanceTimersByTimeAsync(3000); // janela do eco de envio (wwebjs.engine.ts)
      await p;
      expect(events[0].payload).toMatchObject({
        chatJid: GROUP,
        senderJid: '5511000@c.us',
        fromMe: true,
        source: 'phone',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('mídia em grupo: o evento com o arquivo sai com o senderJid do autor', async () => {
    const { priv, events, stored } = makeEngine();
    priv.lidToPnCache.set(LID, '5511933333333@c.us');
    await priv.onMessageCreate(
      groupMsg({
        type: 'image',
        hasMedia: true,
        author: LID,
        downloadMedia: async () => ({
          data: Buffer.from('x').toString('base64'),
          mimetype: 'image/jpeg',
          filename: null,
        }),
      }),
    );
    expect(stored).toHaveLength(1);
    expect(events[0].payload).toMatchObject({
      chatJid: GROUP,
      senderJid: '5511933333333@c.us',
      mediaKey: stored[0],
    });
  });

  it('backfill (toHistoryMessage): mesmo remetente do ao vivo — @lid pelo cache, aparelho removido, sem evaluate', async () => {
    const { priv } = makeEngine();
    const evaluate = withPage(priv);
    priv.lidToPnCache.set(LID, '5511933333333@c.us');
    const h = (author: string) =>
      priv.toHistoryMessage(groupMsg({ author })).then((r) => r?.senderJid);
    expect(await h(LID)).toBe('5511933333333@c.us');
    expect(await h('99990000@lid')).toBe('99990000@lid');
    expect(await h('5511922222222:7@c.us')).toBe('5511922222222@c.us');
    expect(evaluate).not.toHaveBeenCalled();
    // 1:1 no backfill: o contato (author ausente na lib)
    expect(
      (await priv.toHistoryMessage(msg({ type: 'chat', body: 'oi' })))
        ?.senderJid,
    ).toBe(PEER);
  });
});
