import { describe, expect, it } from 'vitest';
import { proto } from '@whiskeysockets/baileys';
import { describeBaileysMessage } from './baileys-content';

// P-066 (E22) — describeBaileysMessage com a lib REAL (rc14) e o caminho do fio: fromObject →
// encode → decode (como chega do socket; no decode `messageContextInfo` vem antes de enquete/evento
// e os inteiros de 64 bits viram Long). Fixtures dos tipos que antes viravam "…" no painel.
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
const vcard = (fn: string, tel: string) =>
  `BEGIN:VCARD\nVERSION:3.0\nFN:${fn}\nTEL;type=CELL;type=VOICE;waid=${tel.replace(/\D/g, '')}:${tel}\nEND:VCARD`;
const key = {
  remoteJid: '5511999990000@s.whatsapp.net',
  fromMe: true,
  id: '3EB0ABCDEF1234567890',
};
const wire = (obj: Record<string, unknown>) =>
  proto.Message.decode(
    proto.Message.encode(proto.Message.fromObject(obj)).finish(),
  );
const describeWire = (obj: Record<string, unknown>, fromMe = false) =>
  describeBaileysMessage(wire(obj), fromMe);

// [fixture, type esperado, texto esperado]
const VISIVEIS: Array<
  [string, Record<string, unknown>, string, string | null]
> = [
  ['texto com emoji', { conversation: 'oi 😀🎉' }, 'text', 'oi 😀🎉'],
  ['só emoji', { conversation: '👍' }, 'text', '👍'],
  [
    'texto estendido com link',
    { extendedTextMessage: { text: 'bom dia ☀️ https://exemplo.com' } },
    'text',
    'bom dia ☀️ https://exemplo.com',
  ],
  [
    'temporária (ephemeral)',
    {
      ephemeralMessage: { message: { extendedTextMessage: { text: 'oi 👋' } } },
    },
    'text',
    'oi 👋',
  ],
  [
    'enviada pelo celular (deviceSent)',
    {
      deviceSentMessage: {
        destinationJid: key.remoteJid,
        message: { conversation: 'enviada pelo celular 📱' },
      },
    },
    'text',
    'enviada pelo celular 📱',
  ],
  [
    'imagem com legenda',
    { imageMessage: media({ mimetype: 'image/jpeg', caption: 'foto 📷' }) },
    'image',
    'foto 📷',
  ],
  [
    'vídeo redondo (ptv) = vídeo',
    { ptvMessage: media({ mimetype: 'video/mp4', seconds: 8 }) },
    'video',
    null,
  ],
  [
    'nota de voz',
    { audioMessage: media({ mimetype: 'audio/ogg; codecs=opus', ptt: true }) },
    'audio',
    null,
  ],
  [
    'documento com legenda (invólucro)',
    {
      documentWithCaptionMessage: {
        message: {
          documentMessage: media({
            mimetype: 'application/pdf',
            fileName: 'contrato.pdf',
            caption: 'segue o contrato 📄',
          }),
        },
      },
    },
    'document',
    'segue o contrato 📄',
  ],
  [
    'figurinha animada (lottie, invólucro que a lib não abre)',
    {
      lottieStickerMessage: {
        message: {
          stickerMessage: media({
            mimetype: 'application/was',
            isAnimated: true,
            isLottie: true,
          }),
        },
      },
    },
    'sticker',
    null,
  ],
  [
    'visualização única',
    {
      viewOnceMessageV2: {
        message: { imageMessage: media({ mimetype: 'image/jpeg' }) },
      },
    },
    'image',
    null,
  ],
  [
    'localização com nome e endereço',
    {
      locationMessage: {
        degreesLatitude: -23.55052,
        degreesLongitude: -46.633308,
        name: 'Praça da Sé',
        address: 'Sé, São Paulo - SP',
      },
    },
    'location',
    'Praça da Sé — Sé, São Paulo - SP\nhttps://maps.google.com/?q=-23.55052,-46.633308',
  ],
  [
    'localização só com coordenadas',
    {
      locationMessage: {
        degreesLatitude: -22.9068,
        degreesLongitude: -43.1729,
      },
    },
    'location',
    'https://maps.google.com/?q=-22.9068,-43.1729',
  ],
  [
    'localização em tempo real',
    {
      liveLocationMessage: {
        degreesLatitude: -23.55,
        degreesLongitude: -46.63,
        caption: 'estou aqui 📍',
      },
    },
    'location',
    'Localização em tempo real — estou aqui 📍\nhttps://maps.google.com/?q=-23.55,-46.63',
  ],
  [
    'contato',
    {
      contactMessage: {
        displayName: 'Maria Silva',
        vcard: vcard('Maria Silva', '+55 11 98888-7777'),
      },
    },
    'contact',
    'Maria Silva — +55 11 98888-7777',
  ],
  [
    'vários contatos',
    {
      contactsArrayMessage: {
        displayName: '2 contatos',
        contacts: [
          {
            displayName: 'Maria Silva',
            vcard: vcard('Maria Silva', '+55 11 98888-7777'),
          },
          {
            displayName: 'João Souza',
            vcard: vcard('João Souza', '+55 21 97777-6666'),
          },
        ],
      },
    },
    'contact',
    'Maria Silva — +55 11 98888-7777\nJoão Souza — +55 21 97777-6666',
  ],
  [
    'enquete V3 (com messageContextInfo antes no fio)',
    {
      pollCreationMessageV3: {
        name: 'Qual dia? 📅',
        options: [{ optionName: 'Segunda' }, { optionName: 'Terça' }],
        selectableOptionsCount: 1,
      },
      messageContextInfo: { messageSecret: B64 },
    },
    'poll',
    'Qual dia? 📅\n• Segunda\n• Terça',
  ],
  [
    'enquete V4 (invólucro FutureProof)',
    {
      pollCreationMessageV4: {
        message: {
          pollCreationMessage: {
            name: 'Pizza?',
            options: [{ optionName: 'Sim' }, { optionName: 'Não' }],
          },
        },
      },
    },
    'poll',
    'Pizza?\n• Sim\n• Não',
  ],
  [
    'evento',
    {
      eventMessage: {
        name: 'Reunião 🗓️',
        description: 'Pauta: metas',
        startTime: 1727290000,
      },
      messageContextInfo: { messageSecret: B64 },
    },
    'event',
    'Reunião 🗓️\nPauta: metas',
  ],
  [
    'resposta de botão',
    {
      buttonsResponseMessage: {
        selectedButtonId: 'btn_sim',
        selectedDisplayText: 'Sim, quero',
        type: 'DISPLAY_TEXT',
      },
    },
    'text',
    'Sim, quero',
  ],
  [
    'resposta de lista',
    {
      listResponseMessage: {
        title: 'Plano Pro',
        description: 'R$ 99/mês',
        singleSelectReply: { selectedRowId: 'row_pro' },
      },
    },
    'text',
    'Plano Pro\nR$ 99/mês',
  ],
  [
    'resposta de fluxo interativo',
    { interactiveResponseMessage: { body: { text: 'Confirmar pedido' } } },
    'text',
    'Confirmar pedido',
  ],
  [
    'convite de grupo',
    {
      groupInviteMessage: {
        groupJid: '120363000000000000@g.us',
        inviteCode: 'AbC',
        groupName: 'Grupo Vendas',
        caption: 'Entre no grupo 👥',
      },
    },
    'group_invite',
    'Grupo Vendas\nEntre no grupo 👥',
  ],
  [
    'produto (sem cartão próprio → other com resumo)',
    {
      productMessage: {
        product: { title: 'Camiseta' },
        body: 'Olha essa',
      },
    },
    'other',
    'Camiseta\nOlha essa',
  ],
];

describe('describeBaileysMessage — tipos visíveis (P-066)', () => {
  it.each(VISIVEIS)('%s', (_n, obj, type, text) => {
    const d = describeWire(obj);
    expect(d.kind).toBe('content');
    if (d.kind !== 'content') return;
    expect(d.type).toBe(type);
    expect(d.text).toBe(text);
    // nada de "…": todo tipo visível tem texto OU é mídia (o painel rotula pelo type)
    expect(d.text != null || d.media != null).toBe(true);
  });

  it('mídia traz metadados; lottie traz o conteúdo desembrulhado para o download', () => {
    const doc = describeWire({
      documentMessage: media({
        mimetype: 'application/pdf',
        fileName: 'contrato.pdf',
      }),
    });
    expect(doc.kind === 'content' && doc.media).toMatchObject({
      mediaType: 'document',
      mimetype: 'application/pdf',
      fileName: 'contrato.pdf',
      fileSize: 123456, // Long → number
    });
    const lottie = describeWire({
      lottieStickerMessage: {
        message: { stickerMessage: media({ mimetype: 'application/was' }) },
      },
    });
    expect(lottie).toHaveProperty('mediaMessage.stickerMessage');
    const imagem = describeWire({ imageMessage: media() });
    expect(imagem).not.toHaveProperty('mediaMessage');
  });
});

describe('describeBaileysMessage — o que NÃO é mensagem no chat (P-066 / D-028)', () => {
  const IGNORADAS: Array<[string, Record<string, unknown>]> = [
    ['reação', { reactionMessage: { key, text: '❤️', senderTimestampMs: 1 } }],
    ['reação removida', { reactionMessage: { key, text: '' } }],
    [
      'reação cifrada',
      { encReactionMessage: { targetMessageKey: key, encPayload: B64 } },
    ],
    [
      'resposta a evento',
      {
        encEventResponseMessage: {
          eventCreationMessageKey: key,
          encPayload: B64,
        },
      },
    ],
    [
      'álbum-mãe (cada foto chega sozinha)',
      { albumMessage: { expectedImageCount: 3 } },
    ],
    [
      'manter no chat',
      { keepInChatMessage: { key, keepType: 'KEEP_FOR_ALL' } },
    ],
    ['fixar', { pinInChatMessage: { key, type: 'PIN_FOR_ALL' } }],
    [
      'edição (protocolMessage — P-069)',
      {
        protocolMessage: {
          key,
          type: 'MESSAGE_EDIT',
          editedMessage: { conversation: 'editado' },
        },
      },
    ],
    ['apagada (REVOKE = 0)', { protocolMessage: { key, type: 'REVOKE' } }],
    [
      'distribuição de chave de grupo',
      {
        senderKeyDistributionMessage: {
          groupId: '1@g.us',
          axolotlSenderKeyDistributionMessage: B64,
        },
      },
    ],
    ['menção em status', { statusMentionMessage: {} }],
    ['registro de ligação', { callLogMesssage: { callOutcome: 'MISSED' } }],
    ['vazia', {}],
  ];
  it.each(IGNORADAS)('%s → ignorada', (_n, obj) => {
    expect(describeWire(obj).kind).toBe('ignore');
  });

  it('voto de enquete: do contato vira poll_vote (conta como resposta); o nosso é ignorado', () => {
    const voto = {
      pollUpdateMessage: {
        pollCreationMessageKey: key,
        vote: { encPayload: B64, encIv: B64 },
      },
    };
    expect(describeWire(voto, false)).toMatchObject({
      kind: 'content',
      type: 'poll_vote',
      text: null,
    });
    expect(describeWire(voto, true).kind).toBe('ignore');
  });
});

describe('describeBaileysMessage — selo "Encaminhada" (contextInfo dentro do conteúdo)', () => {
  it('texto encaminhado 5× → isForwarded + score 5', () => {
    expect(
      describeWire({
        extendedTextMessage: {
          text: 'encaminhada 🔁',
          contextInfo: { isForwarded: true, forwardingScore: 5 },
        },
      }),
    ).toMatchObject({ isForwarded: true, forwardingScore: 5 });
  });

  it('localização e documento-com-legenda encaminhados (contextInfo interno)', () => {
    expect(
      describeWire({
        locationMessage: {
          degreesLatitude: 1,
          degreesLongitude: 2,
          contextInfo: { isForwarded: true, forwardingScore: 1 },
        },
      }),
    ).toMatchObject({
      type: 'location',
      isForwarded: true,
      forwardingScore: 1,
    });
    expect(
      describeWire({
        documentWithCaptionMessage: {
          message: {
            documentMessage: media({
              caption: 'x',
              contextInfo: { isForwarded: true, forwardingScore: 7 },
            }),
          },
        },
      }),
    ).toMatchObject({ isForwarded: true, forwardingScore: 7 });
  });

  it('não encaminhada → false/null; texto simples (conversation) nunca tem contextInfo', () => {
    expect(describeWire({ conversation: 'oi' })).toMatchObject({
      isForwarded: false,
      forwardingScore: null,
    });
    expect(
      describeWire({
        extendedTextMessage: {
          text: 'citando',
          contextInfo: { stanzaId: 'X', participant: key.remoteJid },
        },
      }),
    ).toMatchObject({ isForwarded: false, forwardingScore: null });
  });
});
