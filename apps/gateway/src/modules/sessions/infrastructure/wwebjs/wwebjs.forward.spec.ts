import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';
import type { BaileysEngineDeps } from '../baileys/baileys.engine';
import {
  ForwardSourceError,
  type ForwardSource,
  type SendResult,
} from '../../application/engine.port';
import {
  describeWwebjsMessage,
  wwebjsForwardBlock,
  type WwebjsForwardLike,
} from './wwebjs-content';
import { ForwardEchoRegistry } from './wwebjs.forward-echo';
import { WWebJSEngine } from './wwebjs.engine';

// P-068 (E24) — encaminhar no whatsapp-web.js 1.34.7, sem Chromium. `Message.forward` devolve
// `Promise<void>` (Message.js:498-508): o id da cópia só chega no eco `message_create` fromMe. Sem a
// correlação (ForwardEchoRegistry) esse eco virava `source:'phone'` depois da janela de 3 s do
// onMessageCreate → handoff falso da IA, `isCold` perdido e linha sem a idempotencyKey. Os handlers
// privados recebem objetos no formato de `Message`; o forward falso dispara o eco DE DENTRO (antes
// de resolver), como o WhatsApp Web faz. P-077 no fim: texto do eco de localização/enquete.

type Ev = { name: string; payload: Record<string, unknown> };
type Snap<T> = { done: boolean; value?: T; error?: unknown };

const ME = '5511000@c.us';
const ORIGIN_CHAT = '5511955554444@c.us';
const DEST = '5511988887777@c.us';
const OTHER = '5511977776666@c.us';
const ORIG_ID = `false_${ORIGIN_CHAT}_3EB0ORIG`;
const NEW_ID = `true_${DEST}_3EB0NEW`;
const FWD = { isForwarded: true, forwardingScore: 1 };

// Acompanha uma promise sem pendurar o teste (o `await` direto esperaria para sempre com timers
// falsos se o eco não casasse).
function track<T>(p: Promise<T>): Snap<T> {
  const s: Snap<T> = { done: false };
  p.then(
    (value) => {
      s.done = true;
      s.value = value;
    },
    (error: unknown) => {
      s.done = true;
      s.error = error;
    },
  );
  return s;
}

// Esvazia a fila de microtasks (sem timers) — basta para promessas já resolvidas propagarem.
async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

type FakeMsg = Record<string, unknown> & {
  forward: Mock<(chat: string) => Promise<void>>;
};

// A ORIGINAL viva no aparelho (o que getMessageById devolve).
const original = (over: Record<string, unknown> = {}): FakeMsg => ({
  id: { _serialized: ORIG_ID },
  from: ORIGIN_CHAT,
  to: ME,
  fromMe: false,
  type: 'chat',
  body: 'oi',
  hasMedia: false,
  isForwarded: false,
  forwardingScore: 0,
  timestamp: 1_790_000_000,
  forward: vi.fn(async (_chat: string) => undefined),
  ...over,
});

// O eco `message_create` da cópia encaminhada (fromMe, `to` = destino).
const echo = (over: Record<string, unknown> = {}) => ({
  id: { _serialized: NEW_ID },
  from: ME,
  to: DEST,
  fromMe: true,
  type: 'chat',
  body: 'oi',
  hasMedia: false,
  isForwarded: true,
  forwardingScore: 1,
  timestamp: 1_790_000_100,
  ...over,
});

const src = (over: Partial<ForwardSource> = {}): ForwardSource => ({
  keyId: ORIG_ID,
  chatJid: ORIGIN_CHAT,
  fromMe: false,
  type: 'text',
  text: 'oi',
  mediaType: null,
  mimetype: null,
  fileName: null,
  fileSize: null,
  mediaKey: null,
  forwardingScore: null,
  ...over,
});

type Priv = {
  client: unknown;
  onMessageCreate: (m: unknown) => Promise<void>;
  handleIncomingMedia: (...a: unknown[]) => Promise<void>;
  forwardEchoWaitMs: number;
  forwardEchoTtlMs: number;
  forwardOpTimeoutMs: number;
  forwardEchoes: ForwardEchoRegistry;
  pnToLidOutbound: Map<string, string>;
  lidToPnCache: Map<string, string>;
};

// Com timers falsos, criar a engine DEPOIS do vi.useFakeTimers: o registro captura `Date.now` no
// construtor — assim o TTL anda junto com o relógio falso.
function makeEngine(orig: FakeMsg | null = original()) {
  const events: Ev[] = [];
  const stored: string[] = [];
  const noop = () => undefined;
  const deps = {
    sessionId: 'sess-e24-wwebjs',
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
  const priv = engine as unknown as Priv;
  const getMessageById = vi.fn(async (_id: string) => orig);
  const sendMessage = vi.fn(
    async (_to: string, _content: unknown) =>
      ({ id: { _serialized: '' } }) as { id?: { _serialized?: string } },
  );
  // getState = probe do assertPageResponsive (P-016); sem ele o engine trata a página como travada.
  priv.client = {
    info: { wid: { _serialized: ME } },
    getState: async () => 'CONNECTED',
    getMessageById,
    sendMessage,
  };
  return { engine, priv, events, stored, getMessageById, sendMessage };
}

const sources = (events: Ev[]) =>
  events.map((e) => [e.payload.keyId, e.payload.source]);

// ---------------------------------------------------------------------------------------------

describe('ForwardEchoRegistry (correlação do eco — P-068)', () => {
  const input = (chat: string, type: string, idem = 'k') => ({
    chatIds: new Set([chat]),
    pnJid: chat,
    type,
    text: null,
    meta: { isCold: false, idempotencyKey: idem },
    media: null,
  });

  it('casa o MAIS ANTIGO compatível (FIFO) e só com chat E tipo iguais', async () => {
    const reg = new ForwardEchoRegistry(() => 1_000);
    const img = reg.expect(input(DEST, 'image', 'a'), 60_000);
    const t1 = reg.expect(input(DEST, 'text', 'b'), 60_000);
    const t2 = reg.expect(input(DEST, 'text', 'c'), 60_000);
    // A mais antiga (imagem) é de outro tipo: o texto pula ela e pega o 1º texto.
    expect(reg.match([DEST], 'text', null, 'K1', FWD)).toBe(t1.echo);
    expect(reg.match([DEST], 'text', null, 'K2', FWD)).toBe(t2.echo);
    expect(reg.match([DEST], 'text', null, 'K3', FWD)).toBeNull();
    expect(reg.size).toBe(1); // a imagem segue esperando
    expect(reg.match([DEST], 'image', null, 'K4', FWD)).toBe(img.echo);
    const w = track(t1.wait(60_000));
    await flush();
    expect(w).toEqual({ done: true, value: 'K1' });
  });

  it('chat diferente ou tipo diferente → null e a expectativa continua (o celular não é engolido)', () => {
    const reg = new ForwardEchoRegistry(() => 1_000);
    reg.expect(input(DEST, 'text'), 60_000);
    expect(reg.match([OTHER], 'text', null, 'K1', FWD)).toBeNull();
    expect(reg.match([DEST], 'image', null, 'K2', FWD)).toBeNull();
    expect(reg.size).toBe(1);
  });

  it('match preenche keyId/isForwarded/forwardingScore no MESMO objeto que o forwardTo lê', () => {
    const reg = new ForwardEchoRegistry(() => 1_000);
    const e = reg.expect(input(DEST, 'text'), 60_000);
    expect(e.echo).toMatchObject({
      keyId: null,
      isForwarded: false,
      forwardingScore: null,
    });
    reg.match([DEST], 'text', null, 'K1', {
      isForwarded: true,
      forwardingScore: 4,
    });
    expect(e.echo).toMatchObject({
      keyId: 'K1',
      isForwarded: true,
      forwardingScore: 4,
    });
  });

  it('chat acrescentado depois do expect (o @lid do reroteio) também casa', () => {
    const reg = new ForwardEchoRegistry(() => 1_000);
    const e = reg.expect(input(DEST, 'text'), 60_000);
    e.echo.chatIds.add('999@lid');
    expect(reg.match(['999@lid'], 'text', null, 'K1', FWD)).toBe(e.echo);
  });

  // Correção da E24 (achado do próprio teste): o eco de um sendText no mesmo chat chega SEM id
  // conhecido e, só por chat + tipo, era tomado como o do encaminhar enquanto uma expectativa sem
  // eco seguia viva. Com o texto da original na expectativa, só o mesmo texto casa.
  it('expectativa de TEXTO só casa com o mesmo texto; sem texto (mídia) casa por chat + tipo', () => {
    const reg = new ForwardEchoRegistry(() => 1_000);
    const t = reg.expect(
      { ...input(DEST, 'text'), text: 'oi, tudo bem?' },
      60_000,
    );
    expect(reg.match([DEST], 'text', 'veja acima', 'K1', FWD)).toBeNull();
    expect(reg.match([DEST], 'text', null, 'K2', FWD)).toBeNull();
    expect(reg.match([DEST], 'text', 'oi, tudo bem?', 'K3', FWD)).toBe(t.echo);
    const img = reg.expect(input(DEST, 'image'), 60_000);
    expect(reg.match([DEST], 'image', 'legenda qualquer', 'K4', FWD)).toBe(
      img.echo,
    );
  });

  it('casa por QUALQUER uma das formas do destino (to cru @lid + o telefone do cache)', () => {
    const reg = new ForwardEchoRegistry(() => 1_000);
    const e = reg.expect(input(DEST, 'text'), 60_000);
    expect(reg.match(['777@lid'], 'text', null, 'K1', FWD)).toBeNull();
    expect(reg.match(['777@lid', DEST], 'text', null, 'K2', FWD)).toBe(e.echo);
  });

  it('vencida (now injetado) é varrida: match → null, size 0 e o wait resolve null SEM esperar o timeout', async () => {
    let now = 1_000;
    const reg = new ForwardEchoRegistry(() => now);
    const e = reg.expect(input(DEST, 'text'), 5_000);
    now = 1_000 + 5_000; // expiresAt não é mais > now
    expect(reg.match([DEST], 'text', null, 'K1', FWD)).toBeNull();
    expect(reg.size).toBe(0);
    const w = track(e.wait(60_000));
    await flush();
    expect(w).toEqual({ done: true, value: null });
  });

  it('o próprio expect varre as vencidas (sem match no meio)', () => {
    let now = 0;
    const reg = new ForwardEchoRegistry(() => now);
    reg.expect(input(DEST, 'text'), 1_000);
    now = 2_000;
    reg.expect(input(OTHER, 'text'), 1_000);
    expect(reg.size).toBe(1);
    expect(reg.match([DEST], 'text', null, 'K1', FWD)).toBeNull();
  });

  it('cancel remove e o wait resolve null na hora', async () => {
    const reg = new ForwardEchoRegistry(() => 1_000);
    const e = reg.expect(input(DEST, 'text'), 60_000);
    const w = track(e.wait(60_000));
    e.cancel();
    await flush();
    expect(w).toEqual({ done: true, value: null });
    expect(reg.size).toBe(0);
    expect(reg.match([DEST], 'text', null, 'K1', FWD)).toBeNull();
  });

  describe('wait (timers falsos)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('null no timeout, a expectativa SEGUE viva; um match depois resolve o próximo wait com o keyId', async () => {
      const reg = new ForwardEchoRegistry(() => 0);
      const e = reg.expect(input(DEST, 'text'), 60_000);
      const w1 = track(e.wait(100));
      await vi.advanceTimersByTimeAsync(99);
      expect(w1.done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(w1).toEqual({ done: true, value: null });
      expect(reg.size).toBe(1); // eco tardio ainda tem com quem casar

      const w2 = track(e.wait(1_000));
      await vi.advanceTimersByTimeAsync(400);
      expect(w2.done).toBe(false);
      expect(reg.match([DEST], 'text', null, 'K1', FWD)).toBe(e.echo);
      await vi.advanceTimersByTimeAsync(0);
      expect(w2).toEqual({ done: true, value: 'K1' });
    });
  });
});

// ---------------------------------------------------------------------------------------------

describe('wwebjsForwardBlock (o que o gateway recusa ANTES de encaminhar)', () => {
  const BLOQUEADAS: Array<[string, WwebjsForwardLike, string]> = [
    ['apagada', { type: 'revoked' }, 'apagada'],
    [
      'apagada vence a marca de edição',
      { type: 'revoked', latestEditMsgKey: { id: 'E1' } },
      'apagada',
    ],
    [
      'editada (chave da edição)',
      { type: 'chat', body: 'v2', latestEditMsgKey: { id: 'E1' } },
      'editada',
    ],
    [
      'editada (só o timestamp da edição)',
      { type: 'chat', latestEditSenderTimestampMs: 1_790_000_000_000 },
      'editada',
    ],
    [
      'imagem de visualização única',
      { type: 'image', hasMedia: true, rawData: { isViewOnce: true } },
      'visualização única',
    ],
    [
      'localização em tempo real',
      { type: 'location', rawData: { isLive: true } },
      'localização em tempo real',
    ],
    ['enquete', { type: 'poll_creation' }, 'enquete'],
    ['evento', { type: 'event_creation' }, 'evento'],
    ['evento agendado', { type: 'scheduled_event_creation' }, 'evento'],
    ['convite de grupo', { type: 'groups_v4_invite' }, 'convite de grupo'],
    [
      'resposta de botão',
      { type: 'buttons_response', body: 'Sim' },
      'mensagem interativa (botões/lista)',
    ],
    [
      'resposta de lista',
      { type: 'list_response' },
      'mensagem interativa (botões/lista)',
    ],
    ['produto', { type: 'product' }, 'produto, pedido ou pagamento'],
    ['pedido', { type: 'order' }, 'produto, pedido ou pagamento'],
    ['tipo desconhecido', { type: 'oversized' }, 'tipo oversized'],
  ];

  it.each(BLOQUEADAS)('%s → motivo', (_n, msg, motivo) => {
    expect(wwebjsForwardBlock(msg)).toBe(motivo);
  });

  // O que o botão "Encaminhar" do WhatsApp Web encaminha fielmente.
  const LIVRES: Array<[string, WwebjsForwardLike]> = [
    ['texto', { type: 'chat', body: 'oi' }],
    ['sem type (default chat)', { body: 'oi' }],
    ['imagem', { type: 'image', hasMedia: true }],
    ['vídeo', { type: 'video', hasMedia: true }],
    ['vídeo redondo', { type: 'ptv', hasMedia: true }],
    ['áudio', { type: 'audio', hasMedia: true }],
    ['nota de voz', { type: 'ptt', hasMedia: true }],
    ['documento', { type: 'document', hasMedia: true }],
    ['figurinha', { type: 'sticker', hasMedia: true }],
    ['localização fixa', { type: 'location', rawData: { isLive: false } }],
    ['contato', { type: 'vcard' }],
    ['vários contatos', { type: 'multi_vcard' }],
    [
      'imagem comum (isViewOnce false)',
      { type: 'image', rawData: { isViewOnce: false } },
    ],
  ];

  it.each(LIVRES)('%s → null (encaminhável)', (_n, msg) => {
    expect(wwebjsForwardBlock(msg)).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------

describe('WWebJSEngine.prepareForward (carrega e confere a original UMA vez)', () => {
  const reject = async (p: Promise<unknown>) => {
    const err = await p.then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ForwardSourceError);
    return err as ForwardSourceError;
  };

  it('keyId fora do formato do WhatsApp Web (gravado pelo Baileys) → SOURCE_UNAVAILABLE sem chamar getMessageById', async () => {
    // Sem o filtro, o getMessageById lançaria "Invalid serialized message id" e o withStoreReady
    // repetiria 8× (casa "Evaluation failed") — ~12 s para um erro certo.
    const { engine, getMessageById } = makeEngine();
    const err = await reject(engine.prepareForward(src({ keyId: '3EB0ABC' })));
    expect(err.code).toBe('FORWARD_SOURCE_UNAVAILABLE');
    expect(getMessageById).not.toHaveBeenCalled();
  });

  it('keyId de grupo (4 partes, com o autor) passa no formato e vai ao aparelho', async () => {
    const { engine, getMessageById } = makeEngine();
    const id = 'false_120363000000000001@g.us_3EB0AA_5511922222222@c.us';
    await engine.prepareForward(src({ keyId: id }));
    expect(getMessageById).toHaveBeenCalledWith(id);
  });

  it('original fora do aparelho (getMessageById → null) → SOURCE_UNAVAILABLE', async () => {
    const { engine, getMessageById } = makeEngine(null);
    const err = await reject(engine.prepareForward(src()));
    expect(err.code).toBe('FORWARD_SOURCE_UNAVAILABLE');
    expect(getMessageById).toHaveBeenCalledWith(ORIG_ID);
  });

  it.each([
    ['apagada', { type: 'revoked' }],
    ['editada', { latestEditMsgKey: { id: 'E1' } }],
    ['enquete', { type: 'poll_creation', pollName: 'Qual dia?' }],
    ['visualização única', { type: 'image', rawData: { isViewOnce: true } }],
  ])(
    'original %s → FORWARD_UNSUPPORTED com o motivo, sem encaminhar',
    async (motivo, over) => {
      const orig = original(over);
      const { engine } = makeEngine(orig);
      const err = await reject(engine.prepareForward(src()));
      expect(err.code).toBe('FORWARD_UNSUPPORTED');
      expect(err.message).toContain(motivo);
      expect(orig.forward).not.toHaveBeenCalled();
    },
  );

  it('devolve o forwardingScore VIVO da original (o do banco pode ser null) e não encaminha nada ainda', async () => {
    const orig = original({ isForwarded: true, forwardingScore: 7 });
    const { engine } = makeEngine(orig);
    const prepared = await engine.prepareForward(
      src({ forwardingScore: null }),
    );
    expect(prepared.forwardingScore).toBe(7);
    expect(orig.forward).not.toHaveBeenCalled();
  });

  it('sessão sem client → erro de sessão, não ForwardSourceError', async () => {
    const { engine, priv } = makeEngine();
    priv.client = null;
    await expect(engine.prepareForward(src())).rejects.toThrow(
      'Sessão não conectada',
    );
  });
});

// ---------------------------------------------------------------------------------------------

describe('WWebJSEngine.forwardTo + eco no message_create (P-068)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('eco DENTRO do forward → UM evento api com cold/chave do pedido, SendResult confirmado; nada de phone depois dos 3 s', async () => {
    const orig = original();
    const h = makeEngine(orig);
    orig.forward.mockImplementation(async () => {
      void h.priv.onMessageCreate(echo());
    });
    const prepared = await h.engine.prepareForward(src());
    const run = track(
      prepared.send(DEST, { cold: true, idempotencyKey: 'idem-1:DEST' }),
    );
    await vi.advanceTimersByTimeAsync(0);
    // Resolveu SEM consumir os 10 s de espera nem os 3 s da janela: casou no caminho rápido.
    expect(run.done).toBe(true);
    expect(run.value).toEqual<SendResult>({
      keyId: NEW_ID,
      jid: DEST,
      confirmed: true,
      isForwarded: true,
      forwardingScore: 1,
    });
    expect(h.events).toEqual([
      {
        name: 'message',
        payload: {
          keyId: NEW_ID,
          chatJid: DEST,
          senderJid: ME,
          fromMe: true,
          source: 'api',
          isCold: true,
          idempotencyKey: 'idem-1:DEST',
          timestamp: 1_790_000_100,
          isForwarded: true,
          forwardingScore: 1,
          type: 'text',
          text: 'oi',
        },
      },
    ]);
    expect(orig.forward).toHaveBeenCalledTimes(1);
    expect(orig.forward).toHaveBeenCalledWith(DEST);

    await vi.advanceTimersByTimeAsync(3_500);
    expect(h.events).toHaveLength(1); // nenhum 'phone' atrasado
    // message_create repetido do mesmo id (a lib pode emitir 2×) não duplica: sentByPanel.
    await h.priv.onMessageCreate(echo());
    expect(h.events).toHaveLength(1);
    expect(h.priv.forwardEchoes.size).toBe(0);
  });

  it('controle: fromMe de OUTRO chat durante o encaminhar e do MESMO chat depois do eco consumido seguem phone (o handoff real não morre)', async () => {
    const orig = original();
    const h = makeEngine(orig);
    const CEL1 = `true_${OTHER}_3EB0CEL1`;
    const CEL2 = `true_${DEST}_3EB0CEL2`;
    orig.forward.mockImplementation(async () => {
      void h.priv.onMessageCreate(
        echo({ id: { _serialized: CEL1 }, to: OTHER, body: 'do celular' }),
      );
      void h.priv.onMessageCreate(echo());
    });
    const prepared = await h.engine.prepareForward(src());
    const run = track(prepared.send(DEST, { idempotencyKey: 'k' }));
    await vi.advanceTimersByTimeAsync(0);
    expect(run.value?.keyId).toBe(NEW_ID);
    // Dono digita no MESMO chat logo depois: sem expectativa viva → é handoff de verdade.
    void h.priv.onMessageCreate(
      echo({
        id: { _serialized: CEL2 },
        body: 'eu mesmo',
        isForwarded: false,
        forwardingScore: 0,
      }),
    );
    await vi.advanceTimersByTimeAsync(3_500);
    expect(sources(h.events)).toEqual([
      [NEW_ID, 'api'],
      [CEL1, 'phone'],
      [CEL2, 'phone'],
    ]);
    expect(h.events[1].payload.chatJid).toBe(OTHER);
    expect(h.events[1].payload.idempotencyKey).toBeUndefined();
  });

  it('eco depois da espera (forwardEchoWaitMs curto) mas dentro do TTL → confirmed:false sem id; o eco tardio ainda sai api', async () => {
    const orig = original(); // forward resolve sem eco
    const h = makeEngine(orig);
    h.priv.forwardEchoWaitMs = 50;
    const prepared = await h.engine.prepareForward(src());
    const run = track(
      prepared.send(DEST, { cold: false, idempotencyKey: 'k2' }),
    );
    await vi.advanceTimersByTimeAsync(49);
    expect(run.done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(run.value).toMatchObject({
      keyId: '',
      jid: DEST,
      confirmed: false,
    });
    expect(h.events).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(5_000); // bem antes dos 60 s de TTL
    void h.priv.onMessageCreate(echo());
    await vi.advanceTimersByTimeAsync(3_500);
    expect(h.events).toHaveLength(1);
    expect(h.events[0].payload).toMatchObject({
      keyId: NEW_ID,
      chatJid: DEST,
      source: 'api',
      isCold: false,
      idempotencyKey: 'k2',
    });
  });

  // Revisão da E24: forward que RESOLVEU sem eco na espera → a expectativa só vive mais o "grace"
  // (não segura por 60 s uma mensagem do celular no mesmo chat) e o resultado não inventa selo.
  it('sem eco na espera: resultado sem isForwarded e a expectativa vive só o grace (depois, celular = phone)', async () => {
    const orig = original();
    const h = makeEngine(orig);
    h.priv.forwardEchoWaitMs = 50;
    (h.priv as unknown as { forwardEchoGraceMs: number }).forwardEchoGraceMs =
      1_000;
    const prepared = await h.engine.prepareForward(src());
    const run = track(prepared.send(DEST, { idempotencyKey: 'k' }));
    await vi.advanceTimersByTimeAsync(50);
    expect(run.value).toEqual({ keyId: '', jid: DEST, confirmed: false });
    expect(run.value).not.toHaveProperty('isForwarded');
    await vi.advanceTimersByTimeAsync(1_500); // passou o grace (bem antes dos 60 s do TTL)
    void h.priv.onMessageCreate(echo());
    await vi.advanceTimersByTimeAsync(3_500);
    expect(sources(h.events)).toEqual([[NEW_ID, 'phone']]);
  });

  it('eco de mídia com a original SEM binário (mediaKey null) → baixa a da cópia pelo caminho normal, com cold/chave/api', async () => {
    const orig = original({ type: 'image', body: '', hasMedia: true });
    const h = makeEngine(orig);
    const media = vi.fn(async (..._a: unknown[]) => undefined);
    h.priv.handleIncomingMedia = media;
    orig.forward.mockImplementation(async () => {
      void h.priv.onMessageCreate(
        echo({ type: 'image', body: '', hasMedia: true }),
      );
    });
    const prepared = await h.engine.prepareForward(
      src({ type: 'image', text: null, mediaType: 'image', mediaKey: null }),
    );
    const run = track(
      prepared.send(DEST, { cold: true, idempotencyKey: 'k-img' }),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(run.value).toMatchObject({ keyId: NEW_ID, confirmed: true });
    expect(media).toHaveBeenCalledTimes(1);
    expect(media.mock.calls[0][1]).toMatchObject({
      keyId: NEW_ID,
      chatJid: DEST,
      source: 'api',
      isCold: true,
      idempotencyKey: 'k-img',
    });
    expect(h.events).toHaveLength(0); // o evento sai do handleIncomingMedia (aqui, falso)
  });

  it('eco depois do TTL → a expectativa morreu: sai phone (não segura o handoff para sempre)', async () => {
    const orig = original();
    const h = makeEngine(orig);
    h.priv.forwardEchoWaitMs = 50;
    h.priv.forwardEchoTtlMs = 1_000;
    const prepared = await h.engine.prepareForward(src());
    track(prepared.send(DEST, { idempotencyKey: 'k' }));
    await vi.advanceTimersByTimeAsync(2_000);
    void h.priv.onMessageCreate(echo());
    await vi.advanceTimersByTimeAsync(3_500);
    expect(sources(h.events)).toEqual([[NEW_ID, 'phone']]);
  });

  it('sendText da API no mesmo chat com a expectativa viva não é confundido com o eco do encaminhar', async () => {
    // Fluxo n8n comum: encaminhar (sem eco a tempo → confirmed:false, expectativa ainda viva) e logo
    // mandar "veja acima". O eco do sendText pode chegar ANTES de o sendMessage resolver (ainda fora
    // do sentByPanel). A original é de TERCEIRO: a cópia encaminhada leva o selo; o texto, não.
    const orig = original();
    const h = makeEngine(orig);
    h.priv.forwardEchoWaitMs = 50;
    const prepared = await h.engine.prepareForward(src());
    track(prepared.send(DEST, { idempotencyKey: 'fwd' }));
    await vi.advanceTimersByTimeAsync(50);
    const TXT = `true_${DEST}_3EB0TXT`;
    h.sendMessage.mockImplementation(async () => {
      void h.priv.onMessageCreate(
        echo({
          id: { _serialized: TXT },
          body: 'veja acima',
          isForwarded: false,
          forwardingScore: 0,
        }),
      );
      return { id: { _serialized: TXT } };
    });
    await h.engine.sendText(DEST, 'veja acima', { idempotencyKey: 'txt' });
    await vi.advanceTimersByTimeAsync(500);
    void h.priv.onMessageCreate(echo()); // o eco tardio do encaminhar
    await vi.advanceTimersByTimeAsync(3_500);
    expect(
      h.events.map((e) => [
        e.payload.keyId,
        e.payload.source,
        e.payload.idempotencyKey,
      ]),
    ).toEqual([
      [TXT, 'api', 'txt'],
      [NEW_ID, 'api', 'fwd'],
    ]);
  });

  it('mídia: eco image sai com o mediaKey/mimetype/fileSize da ORIGINAL, sem downloadMedia; texto do celular no mesmo chat segue phone', async () => {
    const orig = original({ type: 'image', hasMedia: true, body: 'foto' });
    const h = makeEngine(orig);
    const handle = vi.spyOn(h.priv, 'handleIncomingMedia');
    const downloadMedia = vi.fn();
    const CEL = `true_${DEST}_3EB0CEL`;
    orig.forward.mockImplementation(async () => {
      // Texto digitado no MESMO chat com a expectativa (de imagem) pendente: tipo não bate.
      void h.priv.onMessageCreate(
        echo({
          id: { _serialized: CEL },
          body: 'olha a foto',
          isForwarded: false,
          forwardingScore: 0,
          downloadMedia,
        }),
      );
      void h.priv.onMessageCreate(
        echo({ type: 'image', hasMedia: true, body: 'foto', downloadMedia }),
      );
    });
    const prepared = await h.engine.prepareForward(
      src({
        type: 'image',
        text: 'foto',
        mediaType: 'image',
        mimetype: 'image/jpeg',
        fileName: 'foto.jpg',
        fileSize: 2048,
        mediaKey: 'sess-e24-wwebjs/ORIG.jpg',
      }),
    );
    const run = track(prepared.send(DEST, { idempotencyKey: 'km' }));
    await vi.advanceTimersByTimeAsync(0);
    expect(run.value).toMatchObject({ keyId: NEW_ID, confirmed: true });
    expect(h.events[0].payload).toEqual({
      keyId: NEW_ID,
      chatJid: DEST,
      senderJid: ME,
      fromMe: true,
      source: 'api',
      isCold: false,
      idempotencyKey: 'km',
      timestamp: 1_790_000_100,
      isForwarded: true,
      forwardingScore: 1,
      type: 'image',
      text: 'foto',
      mediaType: 'image',
      mimetype: 'image/jpeg',
      fileName: 'foto.jpg',
      fileSize: 2048,
      mediaKey: 'sess-e24-wwebjs/ORIG.jpg',
    });
    await vi.advanceTimersByTimeAsync(3_500);
    expect(sources(h.events)).toEqual([
      [NEW_ID, 'api'],
      [CEL, 'phone'],
    ]);
    expect(downloadMedia).not.toHaveBeenCalled();
    expect(handle).not.toHaveBeenCalled();
    expect(h.stored).toHaveLength(0);
  });

  it('LID memorizado: forward UMA vez com o @lid (o op devolve o destino) e o eco com to @lid casa', async () => {
    // Antes, o op devolvia o `undefined` do forward: o withLidFallback lia "nada saiu", esquecia o
    // par e refazia pelo PN — encaminhar 2× para o mesmo contato.
    const orig = original();
    const h = makeEngine(orig);
    h.priv.pnToLidOutbound.set(DEST, '999@lid');
    orig.forward.mockImplementation(async () => {
      void h.priv.onMessageCreate(echo({ to: '999@lid' }));
    });
    const prepared = await h.engine.prepareForward(src());
    const run = track(
      prepared.send(DEST, { cold: true, idempotencyKey: 'kl' }),
    );
    await vi.advanceTimersByTimeAsync(3_500);
    expect(orig.forward).toHaveBeenCalledTimes(1);
    expect(orig.forward).toHaveBeenCalledWith('999@lid');
    expect(run.value).toMatchObject({
      keyId: NEW_ID,
      jid: DEST,
      confirmed: true,
    });
    expect(h.events).toHaveLength(1);
    expect(h.events[0].payload).toMatchObject({
      keyId: NEW_ID,
      chatJid: DEST, // o destino como o gateway o grava, não o @lid
      source: 'api',
      isCold: true,
      idempotencyKey: 'kl',
    });
    expect(h.priv.pnToLidOutbound.get(DEST)).toBe('999@lid'); // par não foi esquecido
  });

  it('eco com `to` @lid que a engine JÁ conhece como o destino (lidToPnCache) também é o encaminhar — não phone', async () => {
    // window.WWebJS.getChat usa findOrCreateLatestChat (Injected/Utils.js:877-887): com o par
    // PN↔LID no Store, o forward para o PN cai no chat @lid e o eco vem com `to` = @lid — o mesmo
    // formato que o onMessageCreate já trata para fromMe (resolveNumberJid). A engine sabe o par.
    const orig = original();
    const h = makeEngine(orig);
    h.priv.lidToPnCache.set('888@lid', DEST);
    orig.forward.mockImplementation(async () => {
      void h.priv.onMessageCreate(echo({ to: '888@lid' }));
    });
    const prepared = await h.engine.prepareForward(src());
    const run = track(
      prepared.send(DEST, { cold: true, idempotencyKey: 'kc' }),
    );
    await vi.advanceTimersByTimeAsync(3_500);
    expect(sources(h.events)).toEqual([[NEW_ID, 'api']]);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run.value).toMatchObject({ keyId: NEW_ID, confirmed: true });
  });

  it('forward rejeita → erro sobe e a expectativa é cancelada (fromMe seguinte no mesmo chat vira phone)', async () => {
    const orig = original();
    const h = makeEngine(orig);
    orig.forward.mockRejectedValue(
      new Error('Evaluation failed: chat inválido'),
    );
    const prepared = await h.engine.prepareForward(src());
    await expect(prepared.send(DEST, { idempotencyKey: 'ke' })).rejects.toThrow(
      'chat inválido',
    );
    expect(orig.forward).toHaveBeenCalledTimes(1); // erro comum: sem reroteio LID nem retry
    expect(h.priv.forwardEchoes.size).toBe(0);
    void h.priv.onMessageCreate(
      echo({ body: 'digitada', isForwarded: false, forwardingScore: 0 }),
    );
    await vi.advanceTimersByTimeAsync(3_500);
    expect(sources(h.events)).toEqual([[NEW_ID, 'phone']]);
  });

  it('forward que não responde → erro "não respondeu" no teto; a expectativa segue viva e o eco tardio sai api', async () => {
    const orig = original();
    const h = makeEngine(orig);
    h.priv.forwardOpTimeoutMs = 1_000;
    orig.forward.mockImplementation(() => new Promise<void>(() => undefined));
    const prepared = await h.engine.prepareForward(src());
    const run = track(
      prepared.send(DEST, { cold: true, idempotencyKey: 'kt' }),
    );
    await vi.advanceTimersByTimeAsync(999);
    expect(run.done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(run.done).toBe(true);
    expect(String(run.error)).toMatch(/não respondeu/);
    expect(h.priv.forwardEchoes.size).toBe(1);

    void h.priv.onMessageCreate(echo());
    await vi.advanceTimersByTimeAsync(3_500);
    expect(h.events).toHaveLength(1);
    expect(h.events[0].payload).toMatchObject({
      keyId: NEW_ID,
      source: 'api',
      isCold: true,
      idempotencyKey: 'kt',
    });
  });
});

// ---------------------------------------------------------------------------------------------

describe('P-077 — eco de localização/enquete com o texto da RECEBIDA', () => {
  it('sendLocation: texto = formatLocation (rótulo + link), igual ao da localização recebida', async () => {
    const { engine, events, sendMessage } = makeEngine();
    sendMessage.mockResolvedValue({ id: { _serialized: `true_${DEST}_LOC` } });
    const input = {
      latitude: -23.5,
      longitude: -46.6,
      name: 'Praça',
      address: 'Centro',
      idempotencyKey: 'loc-1',
    };
    await engine.sendLocation(DEST, input);
    const inbound = describeWwebjsMessage({
      type: 'location',
      location: input,
    });
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({
      keyId: `true_${DEST}_LOC`,
      chatJid: DEST,
      type: 'location',
      text: 'Praça — Centro\nhttps://maps.google.com/?q=-23.5,-46.6',
      source: 'api',
      idempotencyKey: 'loc-1',
    });
    expect(inbound).toMatchObject({ text: events[0].payload.text });
  });

  it('sendLocation sem rótulo: só o link (antes o eco saía com text null)', async () => {
    const { engine, events, sendMessage } = makeEngine();
    sendMessage.mockResolvedValue({ id: { _serialized: `true_${DEST}_LOC2` } });
    await engine.sendLocation(DEST, { latitude: 1.25, longitude: 2.5 });
    expect(events[0].payload.text).toBe('https://maps.google.com/?q=1.25,2.5');
  });

  it('sendPoll: texto = formatPoll (pergunta + "• opção"), igual ao da enquete recebida', async () => {
    const { engine, events, sendMessage } = makeEngine();
    sendMessage.mockResolvedValue({ id: { _serialized: `true_${DEST}_POLL` } });
    await engine.sendPoll(DEST, {
      name: 'Qual dia?',
      options: ['Seg', 'Ter'],
      cold: true,
    });
    const inbound = describeWwebjsMessage({
      type: 'poll_creation',
      pollName: 'Qual dia?',
      pollOptions: [{ name: 'Seg' }, { name: 'Ter' }],
    });
    expect(events[0].payload).toMatchObject({
      keyId: `true_${DEST}_POLL`,
      type: 'poll',
      text: 'Qual dia?\n• Seg\n• Ter',
      source: 'api',
      isCold: true,
    });
    expect(inbound).toMatchObject({ text: events[0].payload.text });
  });
});
