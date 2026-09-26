import { describe, expect, it } from 'vitest';
import {
  describeWwebjsMessage,
  mapWwebjsReaction,
  wwebjsGroupSender,
  type WwebjsMessageLike,
} from './wwebjs-content';

// P-066 (E22) — describeWwebjsMessage / mapWwebjsReaction com objetos falsos no formato que o
// `Message._patch` do whatsapp-web.js 1.34.7 produz (sem Chromium).
const vcard = (fn: string, tel: string) =>
  `BEGIN:VCARD\nVERSION:3.0\nFN:${fn}\nTEL;type=CELL;waid=${tel.replace(/\D/g, '')}:${tel}\nEND:VCARD`;

const VISIVEIS: Array<[string, WwebjsMessageLike, string, string | null]> = [
  ['texto com emoji', { type: 'chat', body: 'oi 😀' }, 'text', 'oi 😀'],
  [
    'imagem com legenda',
    { type: 'image', hasMedia: true, body: 'foto 📷' },
    'image',
    'foto 📷',
  ],
  ['nota de voz', { type: 'ptt', hasMedia: true, body: '' }, 'audio', null],
  ['vídeo redondo (ptv)', { type: 'ptv', hasMedia: true }, 'video', null],
  [
    'localização (nunca o body)',
    {
      type: 'location',
      body: '/9j/4AAQSkZJRgABAQ...base64-da-miniatura',
      location: {
        latitude: -23.55,
        longitude: -46.63,
        name: 'Padaria',
        address: 'Rua A, 1',
      },
    },
    'location',
    'Padaria — Rua A, 1\nhttps://maps.google.com/?q=-23.55,-46.63',
  ],
  [
    'contato (vcard)',
    {
      type: 'vcard',
      body: vcard('Maria Silva', '+55 11 98888-7777'),
      vCards: [vcard('Maria Silva', '+55 11 98888-7777')],
    },
    'contact',
    'Maria Silva — +55 11 98888-7777',
  ],
  [
    'vários contatos',
    {
      type: 'multi_vcard',
      vCards: [
        vcard('Maria', '+55 11 90000-0001'),
        vcard('João', '+55 11 90000-0002'),
      ],
    },
    'contact',
    'Maria — +55 11 90000-0001\nJoão — +55 11 90000-0002',
  ],
  [
    'enquete (opções como {name})',
    {
      type: 'poll_creation',
      pollName: 'Qual dia?',
      pollOptions: [{ name: 'Segunda' }, { name: 'Terça' }],
    },
    'poll',
    'Qual dia?\n• Segunda\n• Terça',
  ],
  [
    'evento (campos só no rawData)',
    {
      type: 'scheduled_event_creation',
      body: 'Reunião',
      rawData: { eventName: 'Reunião', eventDescription: 'Pauta' },
    },
    'event',
    'Reunião\nPauta',
  ],
  [
    'convite de grupo',
    { type: 'groups_v4_invite', inviteV4: { groupName: 'Vendas' } },
    'group_invite',
    'Vendas',
  ],
  [
    'resposta de botão',
    { type: 'buttons_response', body: 'Sim', selectedButtonId: 'b1' },
    'text',
    'Sim',
  ],
  [
    'resposta de lista sem body → id',
    { type: 'list_response', selectedRowId: 'row_pro' },
    'text',
    'row_pro',
  ],
  [
    'produto → other com título',
    { type: 'product', title: 'Camiseta' },
    'other',
    'Camiseta',
  ],
  ['tipo desconhecido → other', { type: 'oversized' }, 'other', null],
];

describe('describeWwebjsMessage — tipos visíveis (P-066)', () => {
  it.each(VISIVEIS)('%s', (_n, msg, type, text) => {
    const d = describeWwebjsMessage(msg);
    expect(d.kind).toBe('content');
    if (d.kind !== 'content') return;
    expect(d.type).toBe(type);
    expect(d.text).toBe(text);
  });

  it('mídia é decidida pelo TYPE: imagem sem directPath (hasMedia false) segue imagem, sem o body cru', () => {
    const d = describeWwebjsMessage({
      type: 'image',
      hasMedia: false,
      body: '/9j/miniatura',
      rawData: { caption: 'legenda real' },
    });
    expect(d).toMatchObject({
      kind: 'content',
      type: 'image',
      text: 'legenda real',
      media: { mediaType: 'image' },
    });
  });
});

describe('describeWwebjsMessage — sistema/reação/ligação não são mensagem', () => {
  it.each([
    'revoked',
    'reaction',
    'protocol',
    'e2e_notification',
    'notification_template',
    'gp2',
    'call_log',
    'ciphertext',
    'group_notification',
  ])('%s → ignorada', (type) => {
    expect(describeWwebjsMessage({ type, body: '' }).kind).toBe('ignore');
  });
});

describe('describeWwebjsMessage — selo "Encaminhada"', () => {
  it('isForwarded + forwardingScore', () => {
    expect(
      describeWwebjsMessage({
        type: 'chat',
        body: 'x',
        isForwarded: true,
        forwardingScore: 6,
      }),
    ).toMatchObject({ isForwarded: true, forwardingScore: 6 });
  });
  it('isForwarded ausente (undefined na lib) e score 0 → false/null', () => {
    expect(
      describeWwebjsMessage({ type: 'chat', body: 'x', forwardingScore: 0 }),
    ).toMatchObject({ isForwarded: false, forwardingScore: null });
  });
});

describe('mapWwebjsReaction (E22 — defensivo contra o rename `_serialized` → `$1`)', () => {
  const base = {
    id: { fromMe: false },
    reaction: '👍',
    senderId: '5511988887777@c.us',
    timestamp: 1790000100.123,
  };

  it('chave-alvo com _serialized e remote string → payload com timestamp inteiro', () => {
    expect(
      mapWwebjsReaction({
        ...base,
        msgId: {
          _serialized: 'true_5511988887777@c.us_3EB0AA',
          remote: '5511988887777@c.us',
        },
      }),
    ).toEqual({
      keyId: 'true_5511988887777@c.us_3EB0AA',
      chatJid: '5511988887777@c.us',
      senderJid: '5511988887777@c.us',
      emoji: '👍',
      fromMe: false,
      timestamp: 1790000100,
    });
  });

  it('chave-alvo só com $1 (builds ≥ 2.3000.104x) → não descarta', () => {
    expect(
      mapWwebjsReaction({
        ...base,
        msgId: { $1: 'true_5511@c.us_3EB0BB', remote: '5511@c.us' },
      })?.keyId,
    ).toBe('true_5511@c.us_3EB0BB');
  });

  it('remote como Wid ({_serialized}) → não lança', () => {
    expect(
      mapWwebjsReaction({
        ...base,
        msgId: {
          _serialized: 'x_1',
          remote: { _serialized: '5511@c.us', user: '5511' },
        },
      })?.chatJid,
    ).toBe('5511@c.us');
  });

  it('removida = emoji vazio; reação nossa = fromMe', () => {
    const p = mapWwebjsReaction({
      ...base,
      id: { fromMe: true },
      reaction: '',
      msgId: { _serialized: 'x_2', remote: '5511@c.us' },
    });
    expect(p).toMatchObject({ emoji: '', fromMe: true });
  });

  it('sem chave-alvo ou status@broadcast → null', () => {
    expect(mapWwebjsReaction({ ...base, msgId: {} })).toBeNull();
    expect(
      mapWwebjsReaction({
        ...base,
        msgId: { _serialized: 'x', remote: 'status@broadcast' },
      }),
    ).toBeNull();
  });
});

// E23 (P-074) — remetente de mensagem recebida em grupo = `msg.author` (Message.js:94-100). @lid só
// vira telefone pelo cache em memória (nada de evaluate/rede por mensagem).
describe('wwebjsGroupSender (E23 · P-074)', () => {
  const GROUP = '120363000000000001@g.us';
  const cache = new Map([['44556677@lid', '5511933333333@c.us']]);

  it('author @c.us (string ou Wid) → o próprio author', () => {
    expect(wwebjsGroupSender(GROUP, '5511922222222@c.us', cache)).toBe(
      '5511922222222@c.us',
    );
    expect(
      wwebjsGroupSender(GROUP, { _serialized: '5511922222222@c.us' }, cache),
    ).toBe('5511922222222@c.us');
  });

  it('@lid com par no cache → telefone @c.us; sem par → fica o @lid', () => {
    expect(wwebjsGroupSender(GROUP, '44556677@lid', cache)).toBe(
      '5511933333333@c.us',
    );
    expect(wwebjsGroupSender(GROUP, '99990000@lid', cache)).toBe(
      '99990000@lid',
    );
  });

  it('sufixo de aparelho (:NN@) sai antes do cache', () => {
    expect(wwebjsGroupSender(GROUP, '5511922222222:12@c.us', cache)).toBe(
      '5511922222222@c.us',
    );
    expect(wwebjsGroupSender(GROUP, '44556677:3@lid', cache)).toBe(
      '5511933333333@c.us',
    );
  });

  it('fora de grupo ou sem author → null (o chamador mantém o chatJid)', () => {
    expect(
      wwebjsGroupSender('5511988887777@c.us', '5511922222222@c.us', cache),
    ).toBeNull();
    expect(wwebjsGroupSender(GROUP, undefined, cache)).toBeNull();
    expect(wwebjsGroupSender(GROUP, '', cache)).toBeNull();
    expect(wwebjsGroupSender(GROUP, null, cache)).toBeNull();
  });
});
