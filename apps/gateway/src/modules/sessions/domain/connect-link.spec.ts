// E27 · P-086 · D-037 — regras puras do link público de conexão por QR (sem Nest/Prisma).
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CONNECT_LINK_CONNECTED_GRACE_MS,
  CONNECT_LINK_NEW_QR_COOLDOWN_MS,
  CONNECT_LINK_NEW_QR_MAX,
  CONNECT_LINK_TOKEN_RE,
  type ConnectLinkRecord,
  type ConnectLinkState,
  type PhaseInput,
  type PublicConnectPhase,
  isQrDataUrl,
  linkState,
  newQrAllowance,
  normalizeExpectedPhone,
  phoneDigitsFromJid,
  phoneHint,
  phoneMatches,
  publicPhase,
} from './connect-link';
import {
  ENGINES,
  SESSION_STATUSES,
  type SessionStatus,
} from './session-status';

const NOW = new Date('2026-09-27T12:00:00.000Z');
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);
const MIN = 60_000;
const GRACE = CONNECT_LINK_CONNECTED_GRACE_MS;

// PNG 1×1 real em data URL (o formato que a engine entrega para a página).
const QR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function link(over: Partial<ConnectLinkRecord> = {}): ConnectLinkRecord {
  return {
    id: 'cl_1',
    sessionId: 'ses_1',
    tokenHash: 'h'.repeat(128),
    createdBy: 'admin (ADMIN)',
    expectedPhone: null,
    expiresAt: at(60 * MIN),
    revokedAt: null,
    revokedReason: null,
    consumedAt: null,
    newQrCount: 0,
    lastNewQrAt: null,
    lastSeenAt: null,
    createdAt: at(-60 * MIN),
    ...over,
  };
}

describe('linkState — estado do link (E27/P-086)', () => {
  it.each<{
    label: string;
    over: Partial<ConnectLinkRecord>;
    expected: ConnectLinkState;
  }>([
    { label: 'nada marcado e validade futura', over: {}, expected: 'ACTIVE' },
    {
      label: 'expira em 1 ms',
      over: { expiresAt: at(1) },
      expected: 'ACTIVE',
    },
    {
      label: 'limite exato (expiresAt == now)',
      over: { expiresAt: at(0) },
      expected: 'EXPIRED',
    },
    {
      label: 'expirou há 1 ms',
      over: { expiresAt: at(-1) },
      expected: 'EXPIRED',
    },
    {
      label: 'revogado',
      over: { revokedAt: at(-MIN), revokedReason: 'MANUAL' },
      expected: 'REVOKED',
    },
    {
      label: 'revogado e expirado (revogação vence)',
      over: { revokedAt: at(-2 * MIN), expiresAt: at(-MIN) },
      expected: 'REVOKED',
    },
    {
      label: 'consumido agora',
      over: { consumedAt: at(0) },
      expected: 'CONNECTED',
    },
    {
      label: 'consumido no limite exato da graça',
      over: { consumedAt: at(-GRACE) },
      expected: 'CONNECTED',
    },
    {
      label: 'consumido há graça+1 ms',
      over: { consumedAt: at(-GRACE - 1) },
      expected: 'USED',
    },
    {
      label: 'consumido e expirado dentro da graça',
      over: { consumedAt: at(-2 * MIN), expiresAt: at(-MIN) },
      expected: 'CONNECTED',
    },
    {
      label: 'consumido e expirado fora da graça',
      over: { consumedAt: at(-GRACE - MIN), expiresAt: at(-MIN) },
      expected: 'USED',
    },
    {
      label: 'consumido e revogado dentro da graça',
      over: {
        consumedAt: at(-MIN),
        revokedAt: at(-30_000),
        revokedReason: 'SESSION_STOPPED',
      },
      expected: 'CONNECTED',
    },
    {
      label: 'consumido e revogado fora da graça',
      over: {
        consumedAt: at(-GRACE - 1),
        revokedAt: at(-MIN),
        revokedReason: 'SESSION_STOPPED',
      },
      expected: 'USED',
    },
  ])('$label → $expected', ({ over, expected }) => {
    expect(linkState(link(over), NOW)).toBe(expected);
  });
});

describe('newQrAllowance — cota e intervalo do "gerar QR" (E27/P-086)', () => {
  const COOL = CONNECT_LINK_NEW_QR_COOLDOWN_MS;

  it.each<{
    label: string;
    count: number;
    lastOffsetMs: number | null;
    remaining: number;
    retry: number;
  }>([
    {
      label: 'nunca pediu',
      count: 0,
      lastOffsetMs: null,
      remaining: CONNECT_LINK_NEW_QR_MAX,
      retry: 0,
    },
    { label: '3 usados', count: 3, lastOffsetMs: null, remaining: 2, retry: 0 },
    {
      label: 'cota esgotada',
      count: CONNECT_LINK_NEW_QR_MAX,
      lastOffsetMs: null,
      remaining: 0,
      retry: 0,
    },
    {
      label: 'acima do máximo não fica negativo',
      count: CONNECT_LINK_NEW_QR_MAX + 2,
      lastOffsetMs: null,
      remaining: 0,
      retry: 0,
    },
    {
      label: 'pediu agora',
      count: 1,
      lastOffsetMs: 0,
      remaining: 4,
      retry: 30,
    },
    {
      label: 'faltam 29,999 s → arredonda para cima',
      count: 1,
      lastOffsetMs: -1,
      remaining: 4,
      retry: 30,
    },
    {
      label: 'faltam 29 s exatos',
      count: 1,
      lastOffsetMs: -1000,
      remaining: 4,
      retry: 29,
    },
    {
      label: 'faltam 28,999 s → 29',
      count: 1,
      lastOffsetMs: -1001,
      remaining: 4,
      retry: 29,
    },
    {
      label: 'falta 1 ms → 1 s',
      count: 1,
      lastOffsetMs: -(COOL - 1),
      remaining: 4,
      retry: 1,
    },
    {
      label: 'limite exato do intervalo → 0',
      count: 1,
      lastOffsetMs: -COOL,
      remaining: 4,
      retry: 0,
    },
    {
      label: 'fora do intervalo → 0',
      count: 2,
      lastOffsetMs: -2 * COOL,
      remaining: 3,
      retry: 0,
    },
    {
      label: 'cota esgotada e ainda no intervalo (independentes)',
      count: CONNECT_LINK_NEW_QR_MAX,
      lastOffsetMs: -10_000,
      remaining: 0,
      retry: 20,
    },
  ])('$label', ({ count, lastOffsetMs, remaining, retry }) => {
    const r = newQrAllowance(
      {
        newQrCount: count,
        lastNewQrAt: lastOffsetMs === null ? null : at(lastOffsetMs),
      },
      NOW,
    );
    expect(r).toEqual({ remaining, retryAfterSeconds: retry });
  });
});

describe('publicPhase — fase da página pública (E27/P-086, D-037 item 7)', () => {
  // Base = sessão Baileys parada, sem login salvo, reidratação concluída → IDLE.
  const base: PhaseInput = {
    engine: 'BAILEYS',
    dbStatus: 'STOPPED',
    live: null,
    liveQr: null,
    paired: false,
    busy: false,
    rehydrated: true,
    recentNewQr: false,
  };
  const phase = (over: Partial<PhaseInput>) =>
    publicPhase({ ...base, ...over });

  type Row = {
    label: string;
    over: Partial<PhaseInput>;
    expected: PublicConnectPhase;
  };

  const RESTING = ['STOPPED', 'DEGRADED'] as const;
  const LIVE_RESTING = [null, 'STOPPED', 'DEGRADED'] as const;
  const IN_FLIGHT = ['STARTING', 'SCAN_QR_CODE', 'PAIRING_CODE'] as const;

  const rows: Row[] = [
    // Só Baileys na v1 (D-021/P-092), mesmo com QR vivo.
    {
      label: 'WWEBJS parada',
      over: { engine: 'WWEBJS' },
      expected: 'UNAVAILABLE',
    },
    {
      label: 'WWEBJS com QR vivo',
      over: {
        engine: 'WWEBJS',
        dbStatus: 'SCAN_QR_CODE',
        live: 'SCAN_QR_CODE',
        liveQr: QR,
      },
      expected: 'UNAVAILABLE',
    },
    // QR vivo da MESMA instância da engine.
    {
      label: 'live SCAN com data URL válida, não pareada',
      over: { dbStatus: 'SCAN_QR_CODE', live: 'SCAN_QR_CODE', liveQr: QR },
      expected: 'QR',
    },
    {
      label: 'live SCAN com QR válido e banco ainda STOPPED',
      over: { live: 'SCAN_QR_CODE', liveQr: QR },
      expected: 'QR',
    },
    {
      label: 'live SCAN com QR válido e "gerar QR" recente',
      over: { live: 'SCAN_QR_CODE', liveQr: QR, recentNewQr: true },
      expected: 'QR',
    },
    {
      label: 'live SCAN com QR válido vence busy (regra vem antes)',
      over: { live: 'SCAN_QR_CODE', liveQr: QR, busy: true },
      expected: 'QR',
    },
    {
      label: 'live SCAN com qr nulo',
      over: { dbStatus: 'SCAN_QR_CODE', live: 'SCAN_QR_CODE', liveQr: null },
      expected: 'PREPARING',
    },
    {
      label: 'live SCAN com qr cru do Baileys (não é data URL)',
      over: {
        dbStatus: 'SCAN_QR_CODE',
        live: 'SCAN_QR_CODE',
        liveQr: '2@abc,def,ghi',
      },
      expected: 'PREPARING',
    },
    {
      label: 'live SCAN com qr de outro mime',
      over: {
        dbStatus: 'SCAN_QR_CODE',
        live: 'SCAN_QR_CODE',
        liveQr: 'data:image/jpeg;base64,AAAA',
      },
      expected: 'PREPARING',
    },
    {
      label: 'live SCAN pareada (janela pós-leitura/515)',
      over: {
        dbStatus: 'SCAN_QR_CODE',
        live: 'SCAN_QR_CODE',
        liveQr: QR,
        paired: true,
      },
      expected: 'PREPARING',
    },
    // Código de pareamento em curso.
    {
      label: 'live PAIRING_CODE',
      over: { dbStatus: 'PAIRING_CODE', live: 'PAIRING_CODE' },
      expected: 'PAIRING',
    },
    {
      label: 'live PAIRING_CODE vence busy',
      over: { dbStatus: 'PAIRING_CODE', live: 'PAIRING_CODE', busy: true },
      expected: 'PAIRING',
    },
    {
      label: 'live PAIRING_CODE com creds.me (paired=false)',
      over: { dbStatus: 'STOPPED', live: 'PAIRING_CODE' },
      expected: 'PAIRING',
    },
    // Operação de ciclo de vida / "gerar QR" recém-pedido.
    {
      label: 'busy (senão seria IDLE)',
      over: { busy: true },
      expected: 'PREPARING',
    },
    {
      label: 'busy vence FAILED do banco',
      over: { busy: true, dbStatus: 'FAILED' },
      expected: 'PREPARING',
    },
    {
      label: 'recentNewQr sem QR, banco STOPPED live null',
      over: { recentNewQr: true },
      expected: 'PREPARING',
    },
    {
      label: 'recentNewQr sem QR, live STOPPED',
      over: { recentNewQr: true, live: 'STOPPED' },
      expected: 'PREPARING',
    },
    {
      label: 'recentNewQr com live SCAN ainda sem QR',
      over: { recentNewQr: true, live: 'SCAN_QR_CODE' },
      expected: 'PREPARING',
    },
    // FAILED nunca oferece QR pelo link.
    {
      label: 'banco FAILED, live null',
      over: { dbStatus: 'FAILED' },
      expected: 'UNAVAILABLE',
    },
    {
      label: 'banco STOPPED, live FAILED',
      over: { live: 'FAILED' },
      expected: 'UNAVAILABLE',
    },
    {
      label: 'banco FAILED pareada',
      over: { dbStatus: 'FAILED', paired: true },
      expected: 'UNAVAILABLE',
    },
    // Login salvo parado = o operador usa Reiniciar (o link nunca apaga credencial válida).
    ...RESTING.flatMap((dbStatus) =>
      LIVE_RESTING.map((live): Row => ({
        label: `pareada, banco ${dbStatus}, live ${live}`,
        over: { paired: true, dbStatus, live },
        expected: 'UNAVAILABLE',
      })),
    ),
    // Login salvo com engine em movimento = leitura recém-feita finalizando.
    ...(
      [
        ['SCAN_QR_CODE', 'SCAN_QR_CODE'],
        ['SCAN_QR_CODE', 'DEGRADED'],
        ['SCAN_QR_CODE', 'STOPPED'],
        ['STARTING', 'STARTING'],
        ['STARTING', 'STOPPED'],
        ['STOPPED', 'STARTING'],
      ] as const
    ).map(([dbStatus, live]): Row => ({
      label: `pareada, banco ${dbStatus}, live ${live}`,
      over: { paired: true, dbStatus, live },
      expected: 'PREPARING',
    })),
    ...(['SCAN_QR_CODE', 'STARTING'] as const).map((dbStatus): Row => ({
      label: `pareada, banco ${dbStatus}, live null antes da reidratação`,
      over: { paired: true, dbStatus, live: null, rehydrated: false },
      expected: 'PREPARING',
    })),
    // Parada, sem login salvo → pode pedir QR.
    ...RESTING.flatMap((dbStatus) =>
      LIVE_RESTING.map((live): Row => ({
        label: `não pareada, banco ${dbStatus}, live ${live}`,
        over: { dbStatus, live },
        expected: 'IDLE',
      })),
    ),
    {
      label: 'não pareada, banco STOPPED, live null antes da reidratação',
      over: { rehydrated: false },
      expected: 'IDLE',
    },
    // Backoff entre ciclos do Baileys: QR velho em memória não pode aparecer.
    {
      label: 'banco SCAN, live DEGRADED com QR velho (backoff)',
      over: { dbStatus: 'SCAN_QR_CODE', live: 'DEGRADED', liveQr: QR },
      expected: 'PREPARING',
    },
    {
      label: 'banco STARTING, live DEGRADED (backoff)',
      over: { dbStatus: 'STARTING', live: 'DEGRADED' },
      expected: 'PREPARING',
    },
    {
      label: 'banco STARTING, live STOPPED (engine recém-criada)',
      over: { dbStatus: 'STARTING', live: 'STOPPED' },
      expected: 'PREPARING',
    },
    {
      label: 'banco SCAN, live STOPPED',
      over: { dbStatus: 'SCAN_QR_CODE', live: 'STOPPED' },
      expected: 'PREPARING',
    },
    {
      label: 'banco STOPPED, live STARTING (start ainda não gravou)',
      over: { live: 'STARTING' },
      expected: 'PREPARING',
    },
    {
      label: 'banco STARTING, live STARTING',
      over: { dbStatus: 'STARTING', live: 'STARTING' },
      expected: 'PREPARING',
    },
    // Status "em andamento" no banco sem engine no processo: sobra de processo anterior só
    // depois da reidratação; antes dela pode ser a reidratação chegando.
    ...IN_FLIGHT.map((dbStatus): Row => ({
      label: `não pareada, banco ${dbStatus}, live null, reidratada`,
      over: { dbStatus, live: null, rehydrated: true },
      expected: 'IDLE',
    })),
    ...IN_FLIGHT.map((dbStatus): Row => ({
      label: `não pareada, banco ${dbStatus}, live null, sem reidratar`,
      over: { dbStatus, live: null, rehydrated: false },
      expected: 'PREPARING',
    })),
    // WORKING: o ConnectLinkService trata ANTES de chamar publicPhase (consome/revoga o link);
    // aqui só documentamos o que a função devolve — PREPARING, nunca IDLE nem QR.
    {
      label: 'WORKING no banco e vivo',
      over: { dbStatus: 'WORKING', live: 'WORKING' },
      expected: 'PREPARING',
    },
    {
      label: 'live WORKING com banco ainda STOPPED',
      over: { live: 'WORKING' },
      expected: 'PREPARING',
    },
    {
      label: 'banco WORKING sem engine no processo (reidratada)',
      over: { dbStatus: 'WORKING', live: null },
      expected: 'PREPARING',
    },
    {
      label: 'live WORKING pareada',
      over: { dbStatus: 'WORKING', live: 'WORKING', paired: true },
      expected: 'PREPARING',
    },
    {
      label: 'live WORKING com "gerar QR" recente',
      over: { dbStatus: 'WORKING', live: 'WORKING', recentNewQr: true },
      expected: 'PREPARING',
    },
  ];

  it.each(rows)('$label → $expected', ({ over, expected }) => {
    expect(phase(over)).toBe(expected);
  });

  // Regressão (E27): corrigido após o teste acusar o defeito.
  it.each(IN_FLIGHT)(
    'pareada, banco %s, live null, reidratada → UNAVAILABLE (não PREPARING eterno)',
    (dbStatus) => {
      expect(phase({ paired: true, dbStatus, live: null })).toBe('UNAVAILABLE');
    },
  );

  // Invariantes de segurança do D-037 sobre TODAS as combinações de entrada: só IDLE libera
  // "gerar QR"; o QR só vai para a página com QR vivo válido de sessão não pareada.
  it('invariantes: IDLE nunca com Wwebjs/login salvo/FAILED/lock/QR recente/engine em movimento; QR só com QR vivo válido', () => {
    const lives: (SessionStatus | null)[] = [null, ...SESSION_STATUSES];
    const bools = [false, true];
    let combos = 0;
    for (const engine of ENGINES)
      for (const dbStatus of SESSION_STATUSES)
        for (const live of lives)
          for (const liveQr of [null, QR])
            for (const paired of bools)
              for (const busy of bools)
                for (const rehydrated of bools)
                  for (const recentNewQr of bools) {
                    const input: PhaseInput = {
                      engine,
                      dbStatus,
                      live,
                      liveQr,
                      paired,
                      busy,
                      rehydrated,
                      recentNewQr,
                    };
                    const p = publicPhase(input);
                    combos++;
                    const ctx = JSON.stringify({ ...input, liveQr: !!liveQr });
                    expect(p === 'QR', ctx).toBe(
                      engine === 'BAILEYS' &&
                        live === 'SCAN_QR_CODE' &&
                        liveQr !== null &&
                        !paired,
                    );
                    if (p === 'IDLE') {
                      expect(engine, ctx).toBe('BAILEYS');
                      expect(paired, ctx).toBe(false);
                      expect(busy, ctx).toBe(false);
                      expect(recentNewQr, ctx).toBe(false);
                      expect(dbStatus, ctx).not.toBe('FAILED');
                      expect(dbStatus, ctx).not.toBe('WORKING');
                      expect([null, 'STOPPED', 'DEGRADED'], ctx).toContain(
                        live,
                      );
                    }
                    if (engine === 'WWEBJS') {
                      expect(p, ctx).toBe('UNAVAILABLE');
                    }
                  }
    expect(combos).toBe(2 * 7 * 8 * 2 * 2 * 2 * 2 * 2);
  });
});

describe('phoneDigitsFromJid (E27/P-086)', () => {
  it.each<[string | null | undefined, string | null]>([
    ['5511988887777:12@s.whatsapp.net', '5511988887777'],
    ['5511988887777@s.whatsapp.net', '5511988887777'],
    ['5511988887777@c.us', '5511988887777'],
    ['5511988887777:3@c.us', '5511988887777'],
    ['5511988887777', '5511988887777'],
    ['5511988887777:12', '5511988887777'],
    ['123456789012345@lid', null],
    ['123456789012345:7@lid', null],
    ['120363000000000000@g.us', null],
    ['status@broadcast', null],
    ['@s.whatsapp.net', null],
    ['abc@s.whatsapp.net', null],
    ['', null],
    [null, null],
    [undefined, null],
  ])('%s → %s', (jid, expected) => {
    expect(phoneDigitsFromJid(jid)).toBe(expected);
  });
});

describe('phoneMatches — número conectado é o esperado? (E27/P-086)', () => {
  const rows: [string, string, string | null, boolean][] = [
    [
      'igual (JID com :NN)',
      '5511988887777',
      '5511988887777:12@s.whatsapp.net',
      true,
    ],
    ['igual (@c.us)', '5511988887777', '5511988887777@c.us', true],
    [
      'esperado com 9º dígito, conta antiga sem',
      '5511988887777',
      '551188887777@s.whatsapp.net',
      true,
    ],
    [
      'esperado sem 9º dígito, conta com',
      '551188887777',
      '5511988887777:3@s.whatsapp.net',
      true,
    ],
    [
      'esperado com máscara',
      '+55 (11) 98888-7777',
      '5511988887777:12@s.whatsapp.net',
      true,
    ],
    ['não-BR igual', '14155550123', '14155550123@s.whatsapp.net', true],
    [
      'número diferente',
      '5511988887777',
      '5511988887778@s.whatsapp.net',
      false,
    ],
    ['DDD diferente', '5521988887777', '5511988887777@s.whatsapp.net', false],
    ['meJid null (falha fechada)', '5511988887777', null, false],
    [
      'meJid @lid com os mesmos dígitos',
      '5511988887777',
      '5511988887777@lid',
      false,
    ],
    ['esperado vazio', '', '5511988887777@s.whatsapp.net', false],
    [
      'esperado sem DDI (comparação exata)',
      '11988887777',
      '5511988887777@s.whatsapp.net',
      false,
    ],
    [
      'não-BR não ganha variante de 9º dígito',
      '14155550123',
      '141955550123@s.whatsapp.net',
      false,
    ],
  ];
  // Resultado na 2ª posição só para o título do teste.
  it.each(rows.map(([l, e, j, r]) => [l, r, e, j] as const))(
    '%s → %s',
    (_label, result, expected, meJid) => {
      expect(phoneMatches(expected, meJid)).toBe(result);
    },
  );

  // Regressão (E27): corrigido após o teste acusar o defeito.
  it.each<[string, string]>([
    ['551133334444', '5511933334444@s.whatsapp.net'],
    ['5511933334444', '551133334444@s.whatsapp.net'],
  ])(
    'esperado %s não casa com conectado %s (fixo × celular 9+fixo)',
    (expected, meJid) => {
      expect(phoneMatches(expected, meJid)).toBe(false);
    },
  );
});

describe('phoneHint — só os 2 últimos dígitos (E27/P-086)', () => {
  it.each<[string | null, string | null]>([
    ['5511988887777', '77'],
    ['+55 (11) 98888-7734', '34'],
    ['12', '12'],
    ['7', null],
    ['---', null],
    ['', null],
    [null, null],
  ])('%s → %s', (expected, hint) => {
    expect(phoneHint(expected)).toBe(hint);
  });
});

describe('isQrDataUrl — só PNG base64 vai para <img src> (E27/P-086)', () => {
  const rows: [string, string | null | undefined, boolean][] = [
    ['PNG válido', QR, true],
    ['PNG sem padding', 'data:image/png;base64,AAAA', true],
    ['outro mime (jpeg)', 'data:image/jpeg;base64,AAAA', false],
    ['svg (script embutível)', 'data:image/svg+xml;base64,PHN2Zz4=', false],
    ['javascript:', 'javascript:alert(1)', false],
    ['qr cru do Baileys', '2@abc,def,ghi', false],
    ['payload vazio', 'data:image/png;base64,', false],
    ['padding no meio', 'data:image/png;base64,AA=A', false],
    ['quebra de linha no fim', `${QR}\n`, false],
    ['espaço no início', ` ${QR}`, false],
    ['injeção de atributo', 'data:image/png;base64,AAAA"><script>', false],
    ['prefixo em maiúsculas', 'DATA:image/png;base64,AAAA', false],
    ['vazio', '', false],
    ['null', null, false],
    ['undefined', undefined, false],
  ];
  it.each(rows.map(([l, v, e]) => [l, e, v] as const))(
    '%s → %s',
    (_label, expected, value) => {
      expect(isQrDataUrl(value)).toBe(expected);
    },
  );
});

describe('normalizeExpectedPhone — número esperado vindo do painel (E27/P-086)', () => {
  it.each<[string | null | undefined, string | null]>([
    [null, null],
    [undefined, null],
    ['', null],
    ['   ', null],
    ['+55 (11) 98888-7777', '5511988887777'],
    ['5511988887777', '5511988887777'],
    ['119888877', 'invalid'], // 9 dígitos
    ['4901234567', '4901234567'], // 10 (mínimo; não casa com o formato BR nacional)
    ['123456789012345', '123456789012345'], // 15 (máximo)
    ['1234567890123456', 'invalid'], // 16
  ])('%s → %s', (raw, expected) => {
    expect(normalizeExpectedPhone(raw)).toBe(expected);
  });

  // Regressão (E27): corrigido após o teste acusar o defeito.
  it.each(['abc', 'n/a', '-'])('"%s" → invalid (não null)', (raw) => {
    expect(normalizeExpectedPhone(raw)).toBe('invalid');
  });

  // Regressão (E27, revisão do diff): número BR sem o 55 nunca casaria com o meJid e desfaria a
  // conexão da pessoa certa como "número errado" → recusado na entrada.
  // '55999887766' = DDD 55 (RS) sem DDI — com o 55 seriam 13 dígitos.
  it.each([
    '(11) 98888-7777',
    '11988887777',
    '1188887777',
    '1133334444',
    '55999887766',
  ])('"%s" sem DDI → no-ddi', (raw) => {
    expect(normalizeExpectedPhone(raw)).toBe('no-ddi');
  });

  it('com o 55 o mesmo número passa e casa com o meJid (com e sem o 9)', () => {
    expect(normalizeExpectedPhone('55 (11) 98888-7777')).toBe('5511988887777');
    expect(
      phoneMatches('5511988887777', '5511988887777:3@s.whatsapp.net'),
    ).toBe(true);
    expect(phoneMatches('5511988887777', '551188887777:3@s.whatsapp.net')).toBe(
      true,
    );
  });
});

describe('CONNECT_LINK_TOKEN_RE — 32 bytes em base64url (E27/P-086)', () => {
  it('aceita 200 tokens randomBytes(32).toString("base64url") (43 chars)', () => {
    for (let i = 0; i < 200; i++) {
      const token = randomBytes(32).toString('base64url');
      expect(token).toHaveLength(43);
      expect(CONNECT_LINK_TOKEN_RE.test(token), token).toBe(true);
    }
  });

  it('rejeita base64 padrão (44 chars com "=" e possivelmente "+"/"/")', () => {
    for (let i = 0; i < 200; i++) {
      const token = randomBytes(32).toString('base64');
      expect(CONNECT_LINK_TOKEN_RE.test(token), token).toBe(false);
    }
  });

  const ok = 'A'.repeat(43);
  it.each<[string, string]>([
    ['42 chars', 'A'.repeat(42)],
    ['44 chars', 'A'.repeat(44)],
    ['com "+"', `${'A'.repeat(42)}+`],
    ['com "/"', `/${'A'.repeat(42)}`],
    ['com "=" de padding', `${'A'.repeat(42)}=`],
    ['com espaço', `${'A'.repeat(21)} ${'A'.repeat(21)}`],
    ['com quebra de linha no fim', `${ok}\n`],
    ['vazio', ''],
  ])('rejeita %s', (_label, token) => {
    expect(CONNECT_LINK_TOKEN_RE.test(token)).toBe(false);
  });

  it('aceita o alfabeto base64url completo ("-" e "_")', () => {
    expect(CONNECT_LINK_TOKEN_RE.test(`${'a'.repeat(41)}-_`)).toBe(true);
  });
});
