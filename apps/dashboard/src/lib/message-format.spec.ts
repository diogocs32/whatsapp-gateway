import { describe, expect, it } from 'vitest';
// Contrato ida e volta: o texto que o GATEWAY gera (fonte única) tem de ser lido de volta pelo
// painel. Mudou o formato lá → este teste quebra aqui. Import dinâmico com o caminho numa variável:
// o vitest resolve, e o tsc do painel (DOM, sem @types/node) não arrasta arquivos do gateway.
type GatewayFormatters = {
  formatLocation: (loc: {
    latitude?: number | null;
    longitude?: number | null;
    name?: string | null;
    address?: string | null;
    live?: boolean;
    caption?: string | null;
  }) => string | null;
  formatContacts: (
    cards: { displayName?: string | null; vcard?: string | null }[],
  ) => string | null;
  formatPoll: (question: string | null, options: string[]) => string | null;
  formatEvent: (
    name: string | null,
    description: string | null,
  ) => string | null;
};
const GW_MESSAGE_CONTENT = new URL(
  '../../../gateway/src/modules/sessions/infrastructure/message-content.ts',
  import.meta.url,
).href;
const { formatContacts, formatEvent, formatLocation, formatPoll } =
  (await import(/* @vite-ignore */ GW_MESSAGE_CONTENT)) as GatewayFormatters;
import {
  MAP_URL_RE,
  UNSUPPORTED_TEXT,
  bubbleContent,
  canPlay,
  conversationPreview,
  downloadName,
  formatBytes,
  forwardBadge,
  isLegacyThumbnail,
  isRenderableImage,
  labelText,
  messagePreview,
  parseContactsText,
  parseLocationText,
  parsePollText,
  safeBlobType,
  splitTitleBody,
  typeLabel,
} from './message-format';

const ALL_TYPES = [
  'text',
  'image',
  'video',
  'audio',
  'document',
  'sticker',
  'location',
  'contact',
  'poll',
  'event',
  'group_invite',
  'poll_vote',
  'other',
];

describe('prévia nunca é "…" nem vazia (P-067)', () => {
  it.each(ALL_TYPES)('type %s com text null', (type) => {
    const p = messagePreview({ type, text: null });
    expect(p).not.toContain('…');
    expect(p.trim()).not.toBe('');
  });
  it.each(ALL_TYPES)('type %s com text só de espaços', (type) => {
    expect(messagePreview({ type, text: '   \n  ' }).trim()).not.toBe('');
  });
  it('type desconhecido (novo no gateway) → aviso', () => {
    expect(messagePreview({ type: 'xyz', text: null })).toBe(UNSUPPORTED_TEXT);
    expect(labelText('nope')).toBe(UNSUPPORTED_TEXT);
  });
});

describe('rótulos por type', () => {
  it('mídia sem legenda → ícone + rótulo; com legenda → ícone + legenda', () => {
    expect(messagePreview({ type: 'image', text: null })).toBe('📷 Foto');
    expect(messagePreview({ type: 'image', text: 'olha isso' })).toBe(
      '📷 olha isso',
    );
    expect(messagePreview({ type: 'audio', text: null })).toBe('🎤 Áudio');
    expect(messagePreview({ type: 'sticker', text: null })).toBe(
      '💟 Figurinha',
    );
  });
  it('other com resumo mostra o resumo; sem resumo → aviso', () => {
    expect(
      messagePreview({ type: 'other', text: 'Camiseta azul\nR$ 50' }),
    ).toBe('Camiseta azul');
    expect(messagePreview({ type: 'other', text: null })).toBe(
      UNSUPPORTED_TEXT,
    );
  });
  it('wwebjs: other + mediaType document sem texto → 📄 Documento', () => {
    expect(
      messagePreview({ type: 'other', text: null, mediaType: 'document' }),
    ).toBe('📄 Documento');
    expect(typeLabel('other', 'document')?.label).toBe('Documento');
  });
  it('poll_vote → voto', () => {
    expect(messagePreview({ type: 'poll_vote', text: null })).toBe(
      '🗳️ Voto em enquete',
    );
  });
  it('texto: 1ª linha não vazia, espaços colapsados, emoji intacto', () => {
    expect(
      messagePreview({ type: 'text', text: '\n  oi   tudo\tbem \nlinha 2' }),
    ).toBe('oi tudo bem');
    expect(messagePreview({ type: 'text', text: 'oi 😀🎉' })).toBe('oi 😀🎉');
  });
  it('conversationPreview prefixa "Você: " só em fromMe', () => {
    expect(
      conversationPreview({
        lastType: 'image',
        lastText: null,
        lastFromMe: true,
      }),
    ).toBe('Você: 📷 Foto');
    expect(
      conversationPreview({
        lastType: 'text',
        lastText: 'oi',
        lastFromMe: false,
      }),
    ).toBe('oi');
  });
});

describe('legado (antes da E22)', () => {
  const b64 =
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYICxILCwoKCxYPEA0QERAQ';
  it('miniatura base64 gravada como text (wwebjs antigo) nunca aparece', () => {
    expect(isLegacyThumbnail(b64)).toBe(true);
    expect(messagePreview({ type: 'text', text: b64 })).toBe(UNSUPPORTED_TEXT);
    expect(bubbleContent({ type: 'text', text: b64 }).kind).toBe('unsupported');
    // nem como legenda de mídia sem arquivo
    expect(
      bubbleContent({ type: 'image', text: b64, mediaType: 'image' }),
    ).toMatchObject({ kind: 'media', caption: null });
  });
  it('texto humano curto que começa com /9j/ não é miniatura', () => {
    expect(isLegacyThumbnail('/9j/ olá')).toBe(false);
  });
  it('vCard cru gravado como text vira contato', () => {
    const v =
      'BEGIN:VCARD\nVERSION:3.0\nFN:Maria Silva\nitem1.TEL;waid=5511988887777:+55 11 98888-7777\nEND:VCARD';
    expect(messagePreview({ type: 'text', text: v })).toBe('👤 Maria Silva');
    expect(bubbleContent({ type: 'text', text: v })).toEqual({
      kind: 'contact',
      contacts: [{ name: 'Maria Silva', phones: ['+55 11 98888-7777'] }],
    });
  });
  it('Baileys antigo (reação gravada como other+null) e wwebjs sem texto → aviso', () => {
    expect(bubbleContent({ type: 'other', text: null })).toEqual({
      kind: 'unsupported',
      summary: null,
    });
    expect(bubbleContent({ type: 'text', text: null }).kind).toBe(
      'unsupported',
    );
  });
  it('localização enviada pela API (eco): só o nome, sem link', () => {
    expect(parseLocationText('Escritório')).toEqual({
      label: 'Escritório',
      mapUrl: null,
    });
    expect(messagePreview({ type: 'location', text: null })).toBe(
      '📍 Localização',
    );
  });
});

describe('localização — link do mapa seguro', () => {
  it('ida e volta com o formatLocation do gateway', () => {
    const t = formatLocation({
      latitude: -23.5505199,
      longitude: -46.6333094,
      name: 'Praça da Sé',
      address: 'Sé, São Paulo - SP',
    });
    expect(parseLocationText(t)).toEqual({
      label: 'Praça da Sé — Sé, São Paulo - SP',
      mapUrl: 'https://maps.google.com/?q=-23.5505199,-46.6333094',
    });
    expect(messagePreview({ type: 'location', text: t })).toBe(
      '📍 Praça da Sé — Sé, São Paulo - SP',
    );
  });
  it('só coordenadas (sem rótulo)', () => {
    const t = formatLocation({ latitude: -23.5, longitude: -46.6 });
    expect(parseLocationText(t)).toEqual({
      label: null,
      mapUrl: 'https://maps.google.com/?q=-23.5,-46.6',
    });
    expect(messagePreview({ type: 'location', text: t })).toBe(
      '📍 Localização',
    );
  });
  it('tempo real com legenda de várias linhas: a URL é a última linha', () => {
    const t = formatLocation({
      latitude: -22.9,
      longitude: -43.2,
      live: true,
      caption: 'indo\npra lá',
    });
    expect(parseLocationText(t)).toEqual({
      label: 'Localização em tempo real — indo\npra lá',
      mapUrl: 'https://maps.google.com/?q=-22.9,-43.2',
    });
  });
  it('notação exponencial que o `${n}` do JS gera', () => {
    const t = formatLocation({ latitude: 1e-7, longitude: -5e-7 });
    expect(t).toBe('https://maps.google.com/?q=1e-7,-5e-7');
    expect(parseLocationText(t).mapUrl).toBe(
      'https://maps.google.com/?q=1e-7,-5e-7',
    );
  });
  it('coordenada fora da faixa (o gateway não valida) não vira link', () => {
    const t = formatLocation({ latitude: 200, longitude: 500, name: 'X' });
    expect(parseLocationText(t)).toEqual({ label: 'X', mapUrl: null });
  });
  it.each([
    'javascript:alert(1)',
    'https://maps.google.com.evil.com/?q=1,2',
    'https://maps.google.com/?q=1,2&x=<script>',
    'http://maps.google.com/?q=1,2',
    'https://maps.google.com/?q=1,2​',
    'HTTPS://MAPS.GOOGLE.COM/?q=1,2',
    'https://maps.google.com/?q=1,2#frag',
    'https://evil.com/\nhttps://maps.google.com/?q=1,2x',
    'data:text/html,<script>alert(1)</script>',
  ])('rejeita %j', (bad) => {
    expect(parseLocationText(bad).mapUrl).toBeNull();
    expect(MAP_URL_RE.test(bad)).toBe(false);
  });
  it('a URL é reconstruída dos números (nunca o texto cru)', () => {
    expect(
      parseLocationText('https://maps.google.com/?q=-0.50,010.0').mapUrl,
    ).toBe('https://maps.google.com/?q=-0.5,10');
    expect(parseLocationText('https://maps.google.com/?q=1,2 ').mapUrl).toBe(
      'https://maps.google.com/?q=1,2',
    );
  });
  it('0,0 não vira link (o gateway também não gera)', () => {
    expect(
      parseLocationText('https://maps.google.com/?q=0,0').mapUrl,
    ).toBeNull();
  });
});

describe('contato / enquete / evento / convite — ida e volta', () => {
  it('contato: vários, sem nome', () => {
    const t = formatContacts([
      { displayName: 'Ana', vcard: 'TEL:+1 555' },
      { displayName: null, vcard: 'TEL:+55 11 2' },
    ]);
    expect(parseContactsText(t)).toEqual([
      { name: 'Ana', phones: ['+1 555'] },
      { name: null, phones: ['+55 11 2'] },
    ]);
    expect(messagePreview({ type: 'contact', text: t })).toBe(
      '👤 Ana e mais 1',
    );
  });
  it('enquete: pergunta + "• opção"; snapshot com contagem', () => {
    expect(parsePollText(formatPoll('Qual dia?', ['Seg', 'Ter']))).toEqual({
      question: 'Qual dia?',
      options: ['Seg', 'Ter'],
    });
    expect(parsePollText('Qual?\n• Seg: 3\n• Ter: 0').options).toEqual([
      'Seg: 3',
      'Ter: 0',
    ]);
    expect(parsePollText(formatPoll(null, ['a']))).toEqual({
      question: null,
      options: ['a'],
    });
    expect(messagePreview({ type: 'poll', text: 'Qual dia?\n• Seg' })).toBe(
      '📊 Qual dia?',
    );
  });
  it('evento e convite: título + corpo', () => {
    expect(splitTitleBody(formatEvent('Reunião', 'Pauta X'))).toEqual({
      title: 'Reunião',
      body: 'Pauta X',
    });
    expect(
      bubbleContent({ type: 'group_invite', text: 'Grupo\nEntra aí' }),
    ).toEqual({
      kind: 'group_invite',
      groupName: 'Grupo',
      caption: 'Entra aí',
    });
    expect(bubbleContent({ type: 'event', text: null })).toEqual({
      kind: 'event',
      name: null,
      description: null,
    });
  });
});

describe('bubbleContent — mídia decide por mediaType', () => {
  it('imagem com legenda', () => {
    expect(
      bubbleContent({ type: 'image', text: 'legenda', mediaType: 'image' }),
    ).toEqual({
      kind: 'media',
      mediaType: 'image',
      caption: 'legenda',
      label: '📷 Foto',
    });
  });
  it('wwebjs: other + mediaType document → documento, resumo como legenda', () => {
    expect(
      bubbleContent({ type: 'other', text: 'Produto', mediaType: 'document' }),
    ).toMatchObject({
      kind: 'media',
      mediaType: 'document',
      caption: 'Produto',
    });
  });
  it('mídia sem mediaType (linha antiga/eco) usa o type', () => {
    expect(bubbleContent({ type: 'audio', text: null })).toMatchObject({
      kind: 'media',
      mediaType: 'audio',
    });
  });
  it('other com resumo → unsupported com o resumo', () => {
    expect(bubbleContent({ type: 'other', text: 'Pedido #12' })).toEqual({
      kind: 'unsupported',
      summary: 'Pedido #12',
    });
  });
});

describe('selo Encaminhada', () => {
  it.each([
    [{}, null],
    [{ isForwarded: false, forwardingScore: null }, null],
    [{ isForwarded: true, forwardingScore: null }, 'Encaminhada'],
    [{ isForwarded: true, forwardingScore: 4 }, 'Encaminhada'],
    [{ isForwarded: true, forwardingScore: 5 }, 'Encaminhada com frequência'],
    [
      { isForwarded: false, forwardingScore: 127 },
      'Encaminhada com frequência',
    ],
  ])('%j → %s', (m, label) => {
    expect(forwardBadge(m)?.label ?? null).toBe(label);
  });
});

describe('mídia: tipo seguro do blob, tamanho, nome, formato tocável', () => {
  it('documento vira octet-stream (nunca executa na origem do painel)', () => {
    expect(safeBlobType('document', 'text/html', 'text/html')).toBe(
      'application/octet-stream',
    );
    expect(safeBlobType('document', 'application/pdf', 'application/pdf')).toBe(
      'application/octet-stream',
    );
  });
  it('imagem só com tipo desenhável; SVG não', () => {
    expect(safeBlobType('image', 'image/jpeg', 'image/jpeg')).toBe(
      'image/jpeg',
    );
    expect(safeBlobType('image', null, 'image/png')).toBe('image/png');
    expect(safeBlobType('image', 'image/svg+xml', 'image/svg+xml')).toBe(
      'application/octet-stream',
    );
    expect(safeBlobType('sticker', 'application/was', 'application/was')).toBe(
      'application/octet-stream',
    );
    expect(isRenderableImage('image/webp')).toBe(true);
    expect(isRenderableImage('application/octet-stream')).toBe(false);
  });
  it('gateway genérico: vale o mimetype do DTO (só tipo/subtipo)', () => {
    expect(
      safeBlobType(
        'audio',
        'audio/ogg; codecs=opus',
        'application/octet-stream',
      ),
    ).toBe('audio/ogg');
    expect(safeBlobType('video', null, 'video/mp4')).toBe('video/mp4');
    expect(safeBlobType('audio', 'text/html', 'text/html')).toBe(
      'application/octet-stream',
    );
  });
  it.each([
    ['video', 'video/mp4,text/html'],
    ['audio', 'audio/ogg,text/html'],
    ['audio', 'audio/ogg text/html'],
    ['video', 'video/'],
    ['audio', 'audio/ogg\ttext/html'],
    ['image', 'image/jpeg,text/html'],
  ])(
    'mimetype do remetente composto/malformado (%s %j) nunca vira tipo que o navegador renderiza',
    (kind, mime) => {
      expect(safeBlobType(kind, mime, mime)).toBe('application/octet-stream');
    },
  );
  it('formatBytes pt-BR', () => {
    expect(formatBytes(null)).toBeNull();
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3 MB');
  });
  it('downloadName: nome do DTO (UTF-8) ou derivado do tipo, sem barras', () => {
    expect(
      downloadName({ id: 'x', fileName: 'relatório – março 😀.pdf' }),
    ).toBe('relatório – março 😀.pdf');
    expect(downloadName({ id: 'x', fileName: '../a/b.pdf' })).toBe(
      '.._a_b.pdf',
    );
    expect(
      downloadName({
        id: '01J',
        keyId: '3EB0ABC',
        mediaType: 'audio',
        mimetype: 'audio/ogg; codecs=opus',
      }),
    ).toBe('audio-3EB0ABC.ogg');
  });
  it('canPlay com sonda injetada ("" = não toca)', () => {
    expect(canPlay('audio/amr', () => '')).toBe(false);
    expect(canPlay('audio/ogg; codecs=opus', () => 'probably')).toBe(true);
    expect(canPlay(null, () => '')).toBe(true);
    expect(
      canPlay('audio/x', () => {
        throw new Error('x');
      }),
    ).toBe(false);
  });
});
