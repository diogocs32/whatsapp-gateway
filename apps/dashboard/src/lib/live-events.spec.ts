import { describe, expect, it } from 'vitest';
import type { MessageReactionDto } from '@contracts';
// Espelho da identidade de quem reagiu: o arquivo REAL do gateway — se ele mudar, o ao vivo do
// painel mostraria algo que a recarga desfaz. Import dinâmico com o caminho numa variável: o vitest
// resolve, e o tsc do painel não arrasta os tipos do gateway (engine.port usa Buffer do Node).
const GW_REACTION_KEY = new URL(
  '../../../gateway/src/modules/messaging/application/reaction-key.ts',
  import.meta.url,
).href;
type SenderKeyFn = (p: {
  chatJid: string;
  senderJid: string | null;
  fromMe: boolean;
}) => string;
import {
  REACTION_REPLAY_MARGIN_MS,
  ackRank,
  applyAck,
  applyReaction,
  feedItemFromEvent,
  mergeFeed,
  overlayAcks,
  parseLiveEvent,
  reactionChips,
  reactionSenderKey,
  rememberAck,
  rememberFeedItem,
  rememberReaction,
  replayReactions,
  stabilize,
  tickFor,
  upsertFeedItem,
  type AckMemory,
  type FeedMemory,
  type LiveMessage,
  type ReactionMemory,
} from './live-events';

// Envelope no formato EXATO do SSE (session-manager.service.ts + payloads das engines).
const env = (event: string, payload: Record<string, unknown>) =>
  JSON.stringify({
    id: '01J',
    timestamp: 1_758_800_000_000,
    event,
    sessionId: 'S1',
    session: 'vendas',
    engine: 'baileys',
    payload,
  });

describe('parseLiveEvent', () => {
  it('ack válido; status desconhecido, sem keyId e eventos alheios → null', () => {
    expect(
      parseLiveEvent(
        env('message.ack', {
          keyId: '3EB0AAA',
          chatJid: '5511@s.whatsapp.net',
          fromMe: true,
          status: 'delivered',
          timestamp: 1,
        }),
      ),
    ).toEqual({
      kind: 'ack',
      sessionId: 'S1',
      keyId: '3EB0AAA',
      status: 'delivered',
    });
    expect(
      parseLiveEvent(env('message.ack', { keyId: 'K', status: 'error' })),
    ).toMatchObject({ kind: 'ack', status: 'error' });
    for (const status of ['played', 'toString', null]) {
      expect(
        parseLiveEvent(env('message.ack', { keyId: 'K', status })),
      ).toBeNull();
    }
    expect(
      parseLiveEvent(env('message.ack', { keyId: '', status: 'read' })),
    ).toBeNull();
    expect(parseLiveEvent('{nao json')).toBeNull();
    expect(
      parseLiveEvent(env('session.status', { status: 'WORKING' })),
    ).toBeNull();
    expect(
      parseLiveEvent(
        JSON.stringify({
          event: 'message.ack',
          payload: { keyId: 'K', status: 'read' },
        }),
      ),
    ).toBeNull(); // sem sessionId não dá para casar
  });
  it('reação (inclusive remoção com emoji "")', () => {
    expect(
      parseLiveEvent(
        env('message.reaction', {
          keyId: 'K',
          chatJid: 'x@s.whatsapp.net',
          senderJid: null,
          emoji: '',
          fromMe: false,
          timestamp: 10,
        }),
      ),
    ).toEqual({
      kind: 'reaction',
      sessionId: 'S1',
      keyId: 'K',
      chatJid: 'x@s.whatsapp.net',
      senderJid: null,
      emoji: '',
      fromMe: false,
      timestamp: 10,
    });
  });
  it('message → item do fluxo com selo e sem status', () => {
    const ev = parseLiveEvent(
      env('message', {
        keyId: 'K9',
        chatJid: '5511@s.whatsapp.net',
        fromMe: false,
        source: null,
        type: 'location',
        text: 'Praça\nhttps://maps.google.com/?q=1,2',
        timestamp: 1_758_800_000,
        isForwarded: true,
        forwardingScore: 5,
      }),
    ) as LiveMessage;
    expect(ev.kind).toBe('message');
    expect(feedItemFromEvent(ev)).toEqual({
      id: 'sse-S1-K9',
      keyId: 'K9',
      sessionId: 'S1',
      sessionName: 'vendas',
      chatJid: '5511@s.whatsapp.net',
      name: null,
      fromMe: false,
      source: null,
      type: 'location',
      text: 'Praça\nhttps://maps.google.com/?q=1,2',
      timestamp: new Date(1_758_800_000_000).toISOString(),
      status: null,
      isForwarded: true,
      forwardingScore: 5,
    });
  });
});

describe('ACK (P-072 — só exibição)', () => {
  it('ackRank: sent<delivered<read; resto = 0', () => {
    expect(
      [
        null,
        undefined,
        '',
        'sent',
        'delivered',
        'read',
        'played',
        'error',
        'toString',
      ].map(ackRank),
    ).toEqual([0, 0, 0, 1, 2, 3, 0, 4, 0]);
  });
  it('applyAck: sobe, nunca regride, casa por sessionId+keyId, mesma referência sem mudança', () => {
    const list = [
      { sessionId: 'S1', keyId: 'K1', status: null as string | null },
      { sessionId: 'S2', keyId: 'K1', status: null as string | null }, // mesmo keyId noutra sessão
    ];
    const a = applyAck(list, { sessionId: 'S1', keyId: 'K1', status: 'read' });
    expect(a.map((m) => m.status)).toEqual(['read', null]);
    expect(
      applyAck(a, { sessionId: 'S1', keyId: 'K1', status: 'delivered' }),
    ).toBe(a);
    expect(applyAck(a, { sessionId: 'S1', keyId: 'X', status: 'read' })).toBe(
      a,
    );
    expect(applyAck(a, { sessionId: 'S1', keyId: 'K1', status: 'bogus' })).toBe(
      a,
    );
  });
  it('AckMemory: ACK antes da mensagem e GET sem o status (no-op no banco)', () => {
    const mem: AckMemory = new Map();
    rememberAck(mem, { sessionId: 'S1', keyId: 'K1', status: 'delivered' });
    rememberAck(mem, { sessionId: 'S1', keyId: 'K1', status: 'sent' });
    expect(mem.get('S1|K1')).toBe('delivered');
    const fromServer = [
      { sessionId: 'S1', keyId: 'K1', status: null as string | null },
    ];
    expect(overlayAcks(fromServer, mem)[0].status).toBe('delivered');
    const already = [
      { sessionId: 'S1', keyId: 'K1', status: 'read' as string | null },
    ];
    expect(overlayAcks(already, mem)).toBe(already);
    const lru: AckMemory = new Map();
    for (let i = 0; i < 5; i++)
      rememberAck(lru, { sessionId: 'S', keyId: `k${i}`, status: 'sent' }, 3);
    // LRU de verdade: sai o mais antigo, entram os novos
    expect([...lru.keys()]).toEqual(['S|k2', 'S|k3', 'S|k4']);
    // tocar um antigo com status maior o renova (vai para o fim)
    rememberAck(lru, { sessionId: 'S', keyId: 'k2', status: 'read' }, 3);
    rememberAck(lru, { sessionId: 'S', keyId: 'k5', status: 'sent' }, 3);
    expect([...lru.keys()]).toEqual(['S|k4', 'S|k2', 'S|k5']);
  });
  it('tickFor: só fromMe; sem grupo/transmissão/canal; null/desconhecido = sem tique', () => {
    const pv = '5511@s.whatsapp.net';
    expect(tickFor({ fromMe: true, chatJid: pv, status: 'sent' })).toBe('sent');
    expect(tickFor({ fromMe: true, chatJid: pv, status: 'delivered' })).toBe(
      'delivered',
    );
    expect(tickFor({ fromMe: true, chatJid: pv, status: 'read' })).toBe('read');
    expect(tickFor({ fromMe: true, chatJid: pv, status: null })).toBe('none');
    expect(tickFor({ fromMe: true, chatJid: pv })).toBe('none');
    expect(tickFor({ fromMe: true, chatJid: pv, status: 'error' })).toBe(
      'none',
    );
    // entrada com `read` = lida no celular do operador — não é tique
    expect(tickFor({ fromMe: false, chatJid: pv, status: 'read' })).toBe(
      'none',
    );
    expect(
      tickFor({ fromMe: true, chatJid: '1203@g.us', status: 'read' }),
    ).toBe('none');
    expect(
      tickFor({ fromMe: true, chatJid: 'status@broadcast', status: 'read' }),
    ).toBe('none');
    expect(
      tickFor({ fromMe: true, chatJid: '1@newsletter', status: 'read' }),
    ).toBe('none');
    expect(
      tickFor({ fromMe: true, chatJid: '5511@c.us', status: 'read' }),
    ).toBe('read');
    expect(
      tickFor({ fromMe: true, chatJid: '123@lid', status: 'delivered' }),
    ).toBe('delivered');
  });
});

describe('reações ao vivo', () => {
  it('reactionSenderKey é idêntico ao do gateway (48 combinações)', async () => {
    const gw = (await import(/* @vite-ignore */ GW_REACTION_KEY)) as {
      reactionSenderKey: SenderKeyFn;
    };
    const chats = ['5511@s.whatsapp.net', '5511@c.us', '99@lid', '1203@g.us'];
    const senders = [
      null,
      '',
      '5511@s.whatsapp.net',
      '5511:12@s.whatsapp.net',
      '99:3@lid',
      '5511@c.us',
    ];
    let n = 0;
    for (const chatJid of chats)
      for (const senderJid of senders)
        for (const fromMe of [true, false]) {
          const p = { chatJid, senderJid, fromMe };
          expect(reactionSenderKey(p)).toBe(gw.reactionSenderKey(p));
          n++;
        }
    expect(n).toBe(48);
  });

  const iso = (s: number) => new Date(s * 1000).toISOString();
  const base = (chatJid: string, reactions: MessageReactionDto[] = []) => [
    { sessionId: 'S1', keyId: 'K1', chatJid, reactions },
  ];
  const ev = (over: Partial<Parameters<typeof applyReaction>[1]>) => ({
    sessionId: 'S1',
    keyId: 'K1',
    chatJid: '5511@s.whatsapp.net',
    senderJid: null,
    emoji: '👍',
    fromMe: false,
    timestamp: 100,
    ...over,
  });

  it('1:1: uma por pessoa, troca, remoção, @lid × telefone, fora de ordem, outra sessão', () => {
    const msgs = base('5511@s.whatsapp.net');
    const a = applyReaction(
      msgs,
      ev({ chatJid: '999@lid', senderJid: '999@lid' }),
    );
    expect(a[0].reactions.map((r) => r.emoji)).toEqual(['👍']);
    const b = applyReaction(a, ev({ emoji: '❤️', timestamp: 101 }));
    expect(b[0].reactions.map((r) => r.emoji)).toEqual(['❤️']);
    const c = applyReaction(
      b,
      ev({ emoji: '👎', fromMe: true, timestamp: 102 }),
    );
    expect(c[0].reactions.map((r) => `${r.fromMe}:${r.emoji}`)).toEqual([
      'false:❤️',
      'true:👎',
    ]);
    const d = applyReaction(c, ev({ emoji: '', timestamp: 103 }));
    expect(d[0].reactions.map((r) => r.emoji)).toEqual(['👎']);
    expect(
      applyReaction(d, ev({ emoji: '😂', fromMe: true, timestamp: 50 })),
    ).toBe(d);
    expect(
      applyReaction(d, ev({ sessionId: 'S2', emoji: '😂', timestamp: 200 })),
    ).toBe(d);
    // mesmo evento de novo (replay) não cria referência nova
    expect(
      applyReaction(d, ev({ emoji: '👎', fromMe: true, timestamp: 102 })),
    ).toBe(d);
  });

  it('grupo: uma por participante (sem sufixo de aparelho), ordem por horário', () => {
    const msgs = base('1203@g.us', [
      {
        emoji: '👍',
        senderJid: '5511@s.whatsapp.net',
        fromMe: false,
        timestamp: iso(10),
      },
    ]);
    const a = applyReaction(
      msgs,
      ev({
        chatJid: '1203@g.us',
        senderJid: '5522@s.whatsapp.net',
        timestamp: 11,
      }),
    );
    expect(a[0].reactions).toHaveLength(2);
    const b = applyReaction(
      a,
      ev({
        chatJid: '1203@g.us',
        senderJid: '5511:7@s.whatsapp.net',
        emoji: '🔥',
        timestamp: 12,
      }),
    );
    expect(b[0].reactions.map((r) => r.emoji)).toEqual(['👍', '🔥']);
    expect(reactionChips(b[0].reactions)).toEqual({
      chips: [
        { emoji: '👍', count: 1, mine: false },
        { emoji: '🔥', count: 1, mine: false },
      ],
      total: 2,
    });
  });

  it('reação de OUTRA pessoa com horário anterior entra na posição do horário (não no fim)', () => {
    const msgs = base('1203@g.us', [
      {
        emoji: '👍',
        senderJid: '5511@s.whatsapp.net',
        fromMe: false,
        timestamp: iso(20),
      },
    ]);
    const a = applyReaction(
      msgs,
      ev({
        chatJid: '1203@g.us',
        senderJid: '5522@s.whatsapp.net',
        emoji: '🔥',
        timestamp: 10,
      }),
    );
    expect(a[0].reactions.map((r) => r.emoji)).toEqual(['🔥', '👍']);
  });

  it('reactionChips: mais usado primeiro, empate = o que apareceu antes, "mine"', () => {
    const r = (emoji: string, fromMe = false) => ({
      emoji,
      senderJid: null,
      fromMe,
      timestamp: iso(1),
    });
    expect(
      reactionChips([r('❤️'), r('👍'), r('👍'), r('😂'), r('🙏', true), r('')]),
    ).toEqual({
      chips: [
        { emoji: '👍', count: 2, mine: false },
        { emoji: '❤️', count: 1, mine: false },
        { emoji: '😂', count: 1, mine: false },
        { emoji: '🙏', count: 1, mine: true },
      ],
      total: 5,
    });
    expect(reactionChips(undefined)).toEqual({ chips: [], total: 0 });
  });

  it('replayReactions: GET que saiu antes do evento não apaga a reação; o banco mais novo vence', () => {
    const mem: ReactionMemory = [];
    const e1 = ev({});
    rememberReaction(mem, e1, 10_000);
    const stale = base('5511@s.whatsapp.net');
    // GET saiu ANTES do evento chegar (requestedAt < receivedAt)
    expect(
      replayReactions(stale, mem, 9_000)[0].reactions?.map((r) => r.emoji),
    ).toEqual(['👍']);
    // o banco já tem uma reação MAIS NOVA da mesma pessoa → o evento velho não vence
    const newer = base('5511@s.whatsapp.net', [
      { emoji: '❤️', senderJid: null, fromMe: false, timestamp: iso(200) },
    ]);
    expect(replayReactions(newer, mem, 9_000)).toBe(newer);
  });

  it('replayReactions: margem de 2 s para o persister assíncrono do gateway (limite exato)', () => {
    const mem: ReactionMemory = [];
    rememberReaction(mem, ev({}), 10_000);
    const stale = base('5511@s.whatsapp.net');
    // GET saiu até 2 s DEPOIS do evento: o banco pode ainda não ter a reação → reaplica
    expect(
      replayReactions(
        stale,
        mem,
        10_000 + REACTION_REPLAY_MARGIN_MS,
      )[0].reactions?.map((r) => r.emoji),
    ).toEqual(['👍']);
    expect(REACTION_REPLAY_MARGIN_MS).toBe(2000);
  });

  it('replayReactions: não ressuscita reação removida enquanto o SSE esteve fora', () => {
    const mem: ReactionMemory = [];
    rememberReaction(mem, ev({}), 10_000);
    // A remoção aconteceu com o stream caído (nunca chegou ao painel); o GET feito DEPOIS já vem
    // sem a reação (lápide não volta no GET) → o evento antigo não pode reaparecer.
    const fresh = base('5511@s.whatsapp.net');
    const later = 10_000 + REACTION_REPLAY_MARGIN_MS + 1;
    expect(replayReactions(fresh, mem, later)).toBe(fresh);
  });
});

describe('fluxo ao vivo e recarga estável', () => {
  it('upsertFeedItem: dedup por sessionId+keyId (não só keyId) e sem regredir status', () => {
    const feed = [
      { sessionId: 'S2', keyId: 'K', status: null as string | null, id: 'b' },
      {
        sessionId: 'S1',
        keyId: 'K',
        status: 'delivered' as string | null,
        id: 'a',
      },
    ];
    const out = upsertFeedItem(
      feed,
      { sessionId: 'S1', keyId: 'K', status: null as string | null, id: 'sse' },
      200,
    );
    expect(out.map((m) => m.id)).toEqual(['sse', 'b']); // a cópia da S2 continua
    expect(out[0].status).toBe('delivered');
  });

  it('mergeFeed: GET que leu o banco antes do INSERT não apaga o item recebido pelo SSE', () => {
    const at = (id: string, sessionId: string, t: number) => ({
      id,
      keyId: id,
      sessionId,
      sessionName: 'x',
      chatJid: '5511@s.whatsapp.net',
      name: null,
      fromMe: false,
      source: null,
      type: 'text',
      text: id,
      timestamp: new Date(t * 1000).toISOString(),
    });
    const mem: FeedMemory = [];
    rememberFeedItem(mem, at('K9', 'S1', 300), 10_000);
    rememberFeedItem(mem, at('K8', 'S1', 200), 1_000); // antigo: o banco já tinha
    const rows = [at('K1', 'S1', 100), at('K9', 'S2', 250)]; // K9 da OUTRA sessão não conta
    const out = mergeFeed(rows, mem, 9_500, 200);
    expect(out.map((m) => `${m.sessionId}/${m.keyId}`)).toEqual([
      'S1/K9',
      'S2/K9',
      'S1/K1',
    ]);
    // já veio no GET → não duplica
    expect(mergeFeed([at('K9', 'S1', 300)], mem, 9_500, 200)).toHaveLength(1);
    // teto
    expect(mergeFeed(rows, mem, 9_500, 2)).toHaveLength(2);
    // GET saiu bem depois do evento (o banco já tem): nada é somado
    expect(mergeFeed(rows, mem, 20_000, 200)).toEqual(rows);
  });

  it('stabilize: ignora a mediaUrl que muda a cada leitura; reaproveita objetos', () => {
    const m1 = { id: '1', text: 'a', mediaUrl: 'https://s3/x?sig=1' };
    const m2 = { id: '2', text: 'b', mediaUrl: null };
    const prev = [m1, m2];
    const same = stabilize(prev, [
      { id: '1', text: 'a', mediaUrl: 'https://s3/x?sig=2' },
      { id: '2', text: 'b', mediaUrl: null },
    ]);
    expect(same).toBe(prev);
    const changed = stabilize(prev, [
      { id: '1', text: 'a', mediaUrl: 'https://s3/x?sig=3' },
      { id: '2', text: 'b editado', mediaUrl: null },
      { id: '3', text: 'c', mediaUrl: null },
    ]);
    expect(changed).not.toBe(prev);
    expect(changed[0]).toBe(m1);
    expect(changed[1].text).toBe('b editado');
    expect(changed).toHaveLength(3);
    // arquivo que passou a existir (mediaUrl null → presente) conta como mudança
    const got = stabilize(prev, [
      { id: '1', text: 'a', mediaUrl: 'u' },
      { id: '2', text: 'b', mediaUrl: 'u' },
    ]);
    expect(got[1]).not.toBe(m2);
  });
});
