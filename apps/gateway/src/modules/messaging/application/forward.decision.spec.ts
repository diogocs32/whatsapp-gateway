import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FREQUENTLY_FORWARDED_MIN,
  MAX_FORWARD_TARGETS,
} from '../../sessions/application/engine.port';
import { candidateJids } from './chat-jids';
import {
  batchFingerprint,
  batchStatus,
  canonicalDestination,
  derivedKey,
  destinationFingerprint,
  exceedsFrequentLimit,
  findDuplicate,
  FORWARDABLE_TYPES,
  forwardGapMs,
  unsupportedTypeLabel,
  type ForwardDestination,
} from './forward.decision';

// P-068 (E24) — regras puras do encaminhar. O ForwardService confia nelas para recusar ANTES de
// qualquer envio (400) e para a idempotência do lote/destino — erro aqui vira mensagem duplicada
// ou 409 indevido em produção.

const BR_9 = '5511912345678'; // celular SP com o 9º dígito
const BR_8 = '551112345678'; // o mesmo celular sem o 9 (forma que o WhatsApp às vezes guarda)
const GROUP = '120363012345678901@g.us';
const GROUP_OLD = '5511912345678-1600000000@g.us'; // grupo antigo: criador-timestamp
const LID = '123456789012345@lid';

function dest(raw: string): ForwardDestination {
  const d = canonicalDestination(raw);
  if ('error' in d) throw new Error(`esperava destino válido: ${raw}`);
  return d;
}

function refused(raw: string): string {
  const d = canonicalDestination(raw);
  if (!('error' in d)) throw new Error(`esperava recusa: ${raw}`);
  return d.error;
}

describe('canonicalDestination', () => {
  it('número formatado (+, espaços, parênteses, hífen) vira só dígitos — key e transport iguais', () => {
    const d = dest('+55 (11) 91234-5678');
    expect(d).toMatchObject({ kind: 'phone', key: BR_9, transport: BR_9 });
    // candidatos = as 2 formas do 9º dígito × os 2 sufixos (Baileys e wwebjs).
    expect(d.candidates).toEqual(candidateJids(BR_9));
    expect(d.candidates).toHaveLength(4);
  });

  it('o mesmo número como jid (@s.whatsapp.net, @c.us, com aparelho, servidor em maiúsculas) → mesma key', () => {
    // transport sem sufixo: cada engine põe o dela (e o wwebjs mantém o fallback de LID).
    for (const raw of [
      BR_9,
      `${BR_9}@s.whatsapp.net`,
      `${BR_9}@c.us`,
      `${BR_9}:12@s.whatsapp.net`,
      `${BR_9}@S.WHATSAPP.NET`,
      `${BR_9}@C.US`,
      `  ${BR_9}@c.us  `,
    ]) {
      expect(dest(raw), raw).toMatchObject({
        kind: 'phone',
        key: BR_9,
        transport: BR_9,
        candidates: candidateJids(BR_9),
      });
    }
  });

  it('bordas do número: 10 e 15 dígitos passam', () => {
    expect(dest('1234567890').key).toBe('1234567890');
    expect(dest('123456789012345').key).toBe('123456789012345');
    expect(dest('123456789012345@s.whatsapp.net').key).toBe('123456789012345');
  });

  it('grupo (novo e antigo criador-timestamp) → key = transport = jid @g.us, servidor normalizado', () => {
    expect(dest(GROUP)).toEqual({
      input: GROUP,
      kind: 'group',
      key: GROUP,
      transport: GROUP,
      candidates: [GROUP],
      exact: [GROUP],
    });
    expect(dest(GROUP_OLD)).toMatchObject({
      kind: 'group',
      key: GROUP_OLD,
      transport: GROUP_OLD,
      candidates: [GROUP_OLD],
    });
    // Maiúsculas no servidor não podem gerar outra key (repetido/fingerprint passariam batido).
    expect(dest('120363012345678901@G.US').key).toBe(GROUP);
  });

  it('@lid → key = transport = jid; o aparelho não muda o destino', () => {
    expect(dest(LID)).toMatchObject({
      kind: 'lid',
      key: LID,
      transport: LID,
      candidates: [LID],
    });
    expect(dest('123456789012345:7@lid').key).toBe(LID);
    expect(dest('123456789012345@LID').key).toBe(LID);
  });

  it('número com 9 ou 16 dígitos, ou com letras → erro (400 antes de qualquer envio)', () => {
    expect(refused('551191234')).toMatch(/número inválido/);
    expect(refused('5511912345678901')).toMatch(/número inválido/);
    expect(refused('55119abc45678')).toMatch(/número inválido/);
    expect(refused('551191234@s.whatsapp.net')).toMatch(/número inválido/);
    expect(refused('5511912345678901@c.us')).toMatch(/número inválido/);
    expect(refused('55119abc45678@s.whatsapp.net')).toMatch(/número inválido/);
    // jid sem usuário não pode virar destino vazio.
    expect(refused('@s.whatsapp.net')).toMatch(/número inválido/);
  });

  it('grupo/@lid malformados → erro', () => {
    expect(refused('1203abc@g.us')).toMatch(/grupo inválido/);
    expect(refused('@g.us')).toMatch(/grupo inválido/);
    expect(refused('1-2-3@g.us')).toMatch(/grupo inválido/);
    expect(refused('abc@lid')).toMatch(/@lid inválido/);
  });

  it('canal, lista/status, bot e conta hospedada → erro (outro caminho de envio no WhatsApp)', () => {
    for (const [raw, server] of [
      ['120363123456789012@newsletter', 'newsletter'],
      ['1234567890@broadcast', 'broadcast'],
      ['status@broadcast', 'broadcast'],
      ['13135550002@bot', 'bot'],
      ['123456789012345@hosted.lid', 'hosted.lid'],
      ['5511912345678@hosted', 'hosted'],
    ]) {
      expect(refused(raw), raw).toBe(
        `destino não suportado no encaminhar (@${server})`,
      );
    }
    // Maiúsculas não furam a lista (o servidor é comparado em minúsculas).
    expect(refused('status@BROADCAST')).toMatch(/@broadcast/);
  });

  // Contrato (packages/contracts ForwardResultDto.target: "o destino como veio em `to[i]`") e o
  // comentário do findDuplicate ("entradas como vieram"): `input` alimenta os dois. O zod da rota
  // não faz trim, então um destino com espaço nas pontas tem de voltar igual para o cliente casar.
  it('input guarda o destino exatamente como veio em to[i] (a key é que é canônica)', () => {
    const raw = ` ${BR_9} `;
    const d = dest(raw);
    expect(d.key).toBe(BR_9);
    expect(d.input).toBe(raw);
  });
});

describe('findDuplicate', () => {
  it('mesma key em grafias diferentes → devolve o par como veio, na ordem de to[]', () => {
    expect(
      findDuplicate([dest('+55 11 91234-5678'), dest(`${BR_9}:3@c.us`)]),
    ).toEqual(['+55 11 91234-5678', `${BR_9}:3@c.us`]);
  });

  it('o mesmo celular com e sem o 9º dígito → duplicata (a 2ª cópia sumiria no unique do eco)', () => {
    expect(findDuplicate([dest(BR_9), dest(BR_8)])).toEqual([BR_9, BR_8]);
    expect(findDuplicate([dest(`${BR_8}@c.us`), dest(BR_9)])).toEqual([
      `${BR_8}@c.us`,
      BR_9,
    ]);
  });

  it('grupo repetido (inclusive servidor em maiúsculas) → duplicata', () => {
    expect(findDuplicate([dest(GROUP), dest(GROUP)])).toEqual([GROUP, GROUP]);
    expect(
      findDuplicate([dest(GROUP), dest('120363012345678901@G.US')]),
    ).toEqual([GROUP, '120363012345678901@G.US']);
  });

  it('acha o par mesmo fora de posições vizinhas (1º × 3º)', () => {
    expect(
      findDuplicate([dest(BR_9), dest(GROUP), dest(`${BR_9}@s.whatsapp.net`)]),
    ).toEqual([BR_9, `${BR_9}@s.whatsapp.net`]);
  });

  it('destinos distintos → null (lid com os mesmos dígitos do número NÃO é o mesmo destino)', () => {
    expect(
      findDuplicate([
        dest(BR_9),
        dest('5521987654321'),
        dest(GROUP),
        dest(GROUP_OLD),
        dest(`${BR_9}@lid`),
      ]),
    ).toBeNull();
    expect(findDuplicate([dest(BR_9)])).toBeNull();
    expect(findDuplicate([])).toBeNull();
  });
});

describe('exact (onde se procura a conversa — só o número EXATO)', () => {
  // Revisão da E24: o 9º dígito não entra aqui — o "gêmeo" (11 9 4123-4567 × fixo 11 4123-4567) pode
  // ser OUTRA pessoa; casar com a conversa dele trataria o destino como quente (sem a trava cold).
  it('telefone: os dois sufixos do número exato, sem a variante do 9º dígito', () => {
    const d = dest(BR_9);
    expect(d.exact).toEqual([`${BR_9}@s.whatsapp.net`, `${BR_9}@c.us`]);
    expect(d.exact).not.toContain(`${BR_8}@s.whatsapp.net`);
    // os repetidos continuam enxergando o 9º dígito (mesmo pedido com as duas grafias = 400)
    expect(d.candidates).toContain(`${BR_8}@s.whatsapp.net`);
  });

  it('grupo e @lid: só o próprio jid; o transporte é o jid (telefone vai em dígitos)', () => {
    expect(dest(GROUP).exact).toEqual([GROUP]);
    expect(dest(LID).exact).toEqual([LID]);
    expect(dest(GROUP).transport).toBe(GROUP);
    expect(dest(`${BR_9}@s.whatsapp.net`).transport).toBe(BR_9);
  });
});

describe('exceedsFrequentLimit', () => {
  it('limites do dono: até 5 destinos; "encaminhada com frequência" a partir de score 5', () => {
    expect(MAX_FORWARD_TARGETS).toBe(5);
    expect(FREQUENTLY_FORWARDED_MIN).toBe(5);
  });

  it('só bloqueia score ≥ 5 com MAIS de 1 destino', () => {
    const min = FREQUENTLY_FORWARDED_MIN;
    expect(exceedsFrequentLimit(4, 2, min)).toBe(false);
    expect(exceedsFrequentLimit(5, 2, min)).toBe(true);
    expect(exceedsFrequentLimit(127, 5, min)).toBe(true);
    // 1 destino por vez é o que o WhatsApp deixa — não recusar.
    expect(exceedsFrequentLimit(5, 1, min)).toBe(false);
  });

  it('sem score (original nunca encaminhada / coluna vazia) → nunca bloqueia', () => {
    expect(exceedsFrequentLimit(null, 5, FREQUENTLY_FORWARDED_MIN)).toBe(false);
    expect(exceedsFrequentLimit(undefined, 5, FREQUENTLY_FORWARDED_MIN)).toBe(
      false,
    );
  });
});

describe('derivedKey', () => {
  it('chave por destino = `<chave do cliente>:<destino canônico>`', () => {
    expect(derivedKey('pedido-42', dest(BR_9))).toBe(`pedido-42:${BR_9}`);
    expect(derivedKey('pedido-42', dest(GROUP))).toBe(`pedido-42:${GROUP}`);
    expect(derivedKey('pedido-42', dest(LID))).toBe(`pedido-42:${LID}`);
  });

  it('grafias diferentes do mesmo número → mesma chave (retry com outra grafia faz replay)', () => {
    expect(derivedKey('k', dest(`${BR_9}:2@s.whatsapp.net`))).toBe(
      derivedKey('k', dest('+55 (11) 91234-5678')),
    );
  });
});

describe('batchFingerprint', () => {
  const A = dest(BR_9);
  const B = dest(GROUP);
  const C = dest(LID);

  it('é sha256 hex e não depende da ordem dos destinos', () => {
    expect(batchFingerprint('KEY1', [A, B, C])).toMatch(/^[0-9a-f]{64}$/);
    expect(batchFingerprint('KEY1', [A, B, C])).toBe(
      batchFingerprint('KEY1', [C, A, B]),
    );
  });

  it('outra original (keyId) → outro hash (mesma chave com outra mensagem = 409)', () => {
    expect(batchFingerprint('KEY1', [A, B])).not.toBe(
      batchFingerprint('KEY2', [A, B]),
    );
  });

  it('outro CONJUNTO de destinos → outro hash ([A,B] e depois [A,C] com a mesma chave = 409)', () => {
    const ab = batchFingerprint('KEY1', [A, B]);
    expect(ab).not.toBe(batchFingerprint('KEY1', [A, C]));
    expect(ab).not.toBe(batchFingerprint('KEY1', [A]));
    expect(ab).not.toBe(batchFingerprint('KEY1', [A, B, C]));
  });

  it('grafias diferentes do mesmo número → mesmo hash (retry do lote não vira 409)', () => {
    expect(batchFingerprint('KEY1', [dest('+55 (11) 91234-5678'), B])).toBe(
      batchFingerprint('KEY1', [B, dest(`${BR_9}@c.us`)]),
    );
  });
});

describe('destinationFingerprint', () => {
  it('mesmo destino em outra grafia → mesmo hash; outro destino ou outra original → outro', () => {
    const fp = destinationFingerprint('KEY1', dest(BR_9));
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
    expect(destinationFingerprint('KEY1', dest(`${BR_9}:5@c.us`))).toBe(fp);
    expect(destinationFingerprint('KEY1', dest(GROUP))).not.toBe(fp);
    expect(destinationFingerprint('KEY2', dest(BR_9))).not.toBe(fp);
  });
});

describe('batchStatus', () => {
  it('algum destino ok (enviado ou replay) → 201, mesmo com erros no resto', () => {
    expect(
      batchStatus([
        { ok: false, status: 409 },
        { ok: true },
        { ok: false, status: 400 },
      ]),
    ).toBe(201);
    expect(batchStatus([{ ok: true }, { ok: true }])).toBe(201);
  });

  it('nenhum ok → o status comum dos itens', () => {
    expect(
      batchStatus([
        { ok: false, status: 409 },
        { ok: false, status: 409 },
      ]),
    ).toBe(409);
    expect(
      batchStatus([
        { ok: false, status: 400 },
        { ok: false, status: 400 },
      ]),
    ).toBe(400);
    expect(batchStatus([{ ok: false, status: 423 }])).toBe(423);
  });

  it('nenhum ok com status misturados ou ausentes → 400', () => {
    expect(
      batchStatus([
        { ok: false, status: 409 },
        { ok: false, status: 400 },
      ]),
    ).toBe(400);
    expect(
      batchStatus([
        { ok: false, status: 409 },
        { ok: false, status: 423 },
      ]),
    ).toBe(400);
    // Item sem status conta como 400 (falha sem classificação nunca vira 409).
    expect(batchStatus([{ ok: false, status: 409 }, { ok: false }])).toBe(400);
  });

  it('lote vazio → 400, nunca 201 (inalcançável: o zod exige 1 destino, mas nada saiu)', () => {
    expect(batchStatus([])).toBe(400);
  });
});

describe('forwardGapMs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('intervalo anti-ban fica em [1000, 3000] ms inteiros', () => {
    expect(forwardGapMs(0)).toBe(1000);
    expect(forwardGapMs(0.5)).toBe(2000);
    expect(forwardGapMs(0.9999999)).toBe(3000);
    // Maior valor que o Math.random devolve (1 - 2^-53): não pode passar de 3 s.
    expect(forwardGapMs(1 - 2 ** -53)).toBe(3000);
    for (const r of [0.1, 0.25, 0.333, 0.75, 0.999]) {
      const ms = forwardGapMs(r);
      expect(Number.isInteger(ms)).toBe(true);
      expect(ms).toBeGreaterThanOrEqual(1000);
      expect(ms).toBeLessThanOrEqual(3000);
    }
  });

  it('sem argumento usa o Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(forwardGapMs()).toBe(1000);
  });
});

describe('FORWARDABLE_TYPES / unsupportedTypeLabel', () => {
  // Lista de `type` do contrato (packages/contracts, mensagens F2).
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

  it('encaminháveis: texto, mídias, localização e contato', () => {
    expect([...FORWARDABLE_TYPES].sort()).toEqual(
      [
        'audio',
        'contact',
        'document',
        'image',
        'location',
        'sticker',
        'text',
        'video',
      ].sort(),
    );
  });

  it('todo tipo do contrato fora da lista tem rótulo próprio no 400 (não o genérico)', () => {
    const blocked = ALL_TYPES.filter((t) => !FORWARDABLE_TYPES.has(t));
    expect(blocked.sort()).toEqual(
      ['event', 'group_invite', 'other', 'poll', 'poll_vote'].sort(),
    );
    expect(unsupportedTypeLabel('poll')).toBe('enquete');
    expect(unsupportedTypeLabel('event')).toBe('evento');
    expect(unsupportedTypeLabel('group_invite')).toBe('convite de grupo');
    expect(unsupportedTypeLabel('poll_vote')).toBe('voto em enquete');
    expect(unsupportedTypeLabel('other')).toMatch(/produto, pedido, pagamento/);
  });

  it('tipo desconhecido → rótulo genérico com o nome do tipo', () => {
    expect(unsupportedTypeLabel('ptv')).toBe('tipo ptv');
  });
});

describe('candidateJids (movida do controller na E24 — mesmo comportamento)', () => {
  it('com @ devolve o jid como veio, sem normalizar (GET /messages e /search)', () => {
    expect(candidateJids(`${BR_9}@s.whatsapp.net`)).toEqual([
      `${BR_9}@s.whatsapp.net`,
    ]);
    expect(candidateJids(GROUP)).toEqual([GROUP]);
    expect(candidateJids(`${BR_9}:3@C.US`)).toEqual([`${BR_9}:3@C.US`]);
  });

  it('celular BR com o 9 → as 2 formas × os 2 sufixos', () => {
    expect(candidateJids(BR_9)).toEqual([
      `${BR_9}@s.whatsapp.net`,
      `${BR_9}@c.us`,
      `${BR_8}@s.whatsapp.net`,
      `${BR_8}@c.us`,
    ]);
  });

  it('celular BR sem o 9 (8 dígitos no número) → acrescenta a forma com o 9', () => {
    expect(candidateJids(BR_8)).toEqual([
      `${BR_8}@s.whatsapp.net`,
      `${BR_8}@c.us`,
      `${BR_9}@s.whatsapp.net`,
      `${BR_9}@c.us`,
    ]);
  });

  it('formatação é ignorada (só dígitos contam)', () => {
    expect(candidateJids('+55 (11) 91234-5678')).toEqual(candidateJids(BR_9));
  });

  it('sem variação de 9º dígito → só os 2 sufixos', () => {
    // Estrangeiro, BR com 9 dígitos sem começar por 9, e BR curto demais.
    for (const n of ['14155552671', '5511812345678', '55119123456']) {
      expect(candidateJids(n), n).toEqual([`${n}@s.whatsapp.net`, `${n}@c.us`]);
    }
  });
});
