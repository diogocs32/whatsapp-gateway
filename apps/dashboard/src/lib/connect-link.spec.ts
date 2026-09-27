import { describe, expect, it } from 'vitest';
import type {
  ConnectLinkDto,
  PublicConnectPhase,
  PublicConnectResponse,
} from '@contracts';
import {
  STALE_QR_MS,
  applyNewQr,
  applyPoll,
  buildConnectUrl,
  buildShareText,
  connectView,
  createLinkError,
  defaultExpectedPhone,
  describeLink,
  expiryInfo,
  initialConnectState,
  isLikelyPhone,
  isPublicPath,
  isQrDataUrl,
  isValidExpectedPhone,
  expectedPhoneError,
  looksLikeBrNational,
  lastSeenLabel,
  pickToken,
  readTokenFromHash,
  retryDelayMs,
  uaSaysMobile,
  type ConnectFailure,
  type ConnectPageState,
} from './connect-link';

// E27/P-086 — link público de conexão: token no fragmento, texto de envio, detecção de celular e o
// view model da página /conectar (fases, erros, rede, polling) + os resumos do diálogo do painel.

const TOKEN = 'AbC_-xyz0123456789AbC_-xyz0123456789AbC_-xy'; // 43, com '_' e '-'
const QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
// Datas no fuso LOCAL (o texto sai no fuso de quem vê): 27/09 às 14:05.
const AT_1405 = new Date(2026, 8, 27, 14, 5).toISOString();
const T0 = new Date(2026, 8, 27, 13, 0).getTime();

function active(
  phase: PublicConnectPhase,
  over: Partial<Extract<PublicConnectResponse, { state: 'ACTIVE' }>> = {},
): PublicConnectResponse {
  return {
    state: 'ACTIVE',
    phase,
    qr: phase === 'QR' ? QR : null,
    expiresAt: AT_1405,
    expectedPhoneHint: '77',
    newQr: {
      available: phase === 'IDLE',
      remaining: 5,
      max: 5,
      retryAfterSeconds: 0,
    },
    ...over,
  };
}

const ok = (data: PublicConnectResponse) => ({ ok: true as const, data });
const fail = (error: ConnectFailure) => ({ ok: false as const, error });
const gone = (code: ConnectFailure['code']): ConnectFailure => ({
  status: 410,
  code,
  message: 'x',
});
const NET: ConnectFailure = { status: 0, message: 'Sem conexão' };

// Estado depois de uma resposta OK em T0.
function after(data: PublicConnectResponse, now = T0): ConnectPageState {
  return applyPoll(initialConnectState(T0), ok(data), now);
}
const at = (s: ConnectPageState, now: number): ConnectPageState => ({
  ...s,
  now,
});

describe('token no fragmento', () => {
  it('readTokenFromHash: tira o #, aceita t=, valida 43 chars base64url', () => {
    expect(readTokenFromHash(`#${TOKEN}`)).toBe(TOKEN);
    expect(readTokenFromHash(TOKEN)).toBe(TOKEN);
    expect(readTokenFromHash(`#t=${TOKEN}`)).toBe(TOKEN);
    expect(readTokenFromHash(`#${TOKEN.slice(1)}`)).toBeNull(); // 42
    expect(readTokenFromHash(`#${TOKEN}x`)).toBeNull(); // 44
    expect(readTokenFromHash(`#${TOKEN.slice(1)}+`)).toBeNull();
    expect(readTokenFromHash('')).toBeNull();
    expect(readTokenFromHash('#')).toBeNull();
  });

  it('pickToken: # manda; hash vazio (recarregou) usa o guardado; # inválido não cai no guardado', () => {
    expect(pickToken(`#${TOKEN}`, null)).toBe(TOKEN);
    expect(pickToken('', TOKEN)).toBe(TOKEN);
    expect(pickToken('#', TOKEN)).toBe(TOKEN);
    expect(pickToken('#quebrado', TOKEN)).toBeNull();
    expect(pickToken('', 'lixo')).toBeNull();
    expect(pickToken('', null)).toBeNull();
  });

  it('buildConnectUrl e isPublicPath', () => {
    expect(buildConnectUrl('https://painel.x.com/', TOKEN)).toBe(
      `https://painel.x.com/conectar#${TOKEN}`,
    );
    expect(isPublicPath('/conectar')).toBe(true);
    expect(isPublicPath('/conectar/')).toBe(true);
    expect(isPublicPath('/conectarx')).toBe(false);
    expect(isPublicPath('/sessions')).toBe(false);
  });

  it('isQrDataUrl: só PNG base64', () => {
    expect(isQrDataUrl(QR)).toBe(true);
    expect(isQrDataUrl('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(isQrDataUrl('javascript:alert(1)')).toBe(false);
    expect(isQrDataUrl(null)).toBe(false);
  });
});

describe('buildShareText', () => {
  const url = `https://painel.x.com/conectar#${TOKEN}`;

  it('começa pela instrução de abrir em outra tela; URL sozinha numa linha', () => {
    const text = buildShareText({
      url,
      expiresAt: AT_1405,
      productName: 'WhatsApp Gateway',
    });
    const lines = text.split('\n');
    expect(lines[0]).toBe(
      'Para conectar o WhatsApp, abra este link em um COMPUTADOR (pode ser pelo WhatsApp Web) ou em outro celular/tablet — o QR precisa aparecer em outra tela para a câmera do seu celular ler.',
    );
    expect(lines[1]).toBe(url); // sem pontuação colada no fim
    expect(lines[2]).toBe(
      'Válido até 27/09 às 14:05. Não encaminhe este link.',
    );
    expect(lines).toHaveLength(3);
  });

  it('nome da marca configurado entra na instrução', () => {
    const text = buildShareText({
      url,
      expiresAt: AT_1405,
      productName: ' Acme Atende ',
    });
    expect(
      text.startsWith('Para conectar o WhatsApp ao sistema Acme Atende, abra'),
    ).toBe(true);
  });
});

describe('mesmo celular', () => {
  const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const IPAD =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
  const ANDROID_TABLET =
    'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

  it('uaSaysMobile: UA-CH quando existe; senão o token "Mobi"', () => {
    expect(uaSaysMobile(true, '')).toBe(true);
    expect(uaSaysMobile(false, IPHONE)).toBe(false); // UA-CH vence
    expect(uaSaysMobile(undefined, IPHONE)).toBe(true);
    expect(uaSaysMobile(undefined, IPAD)).toBe(false);
    expect(uaSaysMobile(undefined, ANDROID_TABLET)).toBe(false);
  });

  it('isLikelyPhone: celular sim; tablet, desktop com toque e janela estreita não', () => {
    expect(isLikelyPhone({ uaMobile: true, coarse: true, width: 390 })).toBe(
      true,
    );
    // Navegador sem UA-CH (Safari/Firefox) num celular: toque + tela estreita.
    expect(isLikelyPhone({ coarse: true, width: 390 })).toBe(true);
    // Tablet é uma segunda tela válida.
    expect(isLikelyPhone({ uaMobile: false, coarse: true, width: 820 })).toBe(
      false,
    );
    // Notebook com tela de toque (ponteiro principal fino) e janela estreita de desktop.
    expect(isLikelyPhone({ uaMobile: false, coarse: false, width: 1280 })).toBe(
      false,
    );
    expect(isLikelyPhone({ coarse: false, width: 390 })).toBe(false);
  });
});

describe('view model da página /conectar', () => {
  it('sem token = link inválido (texto do 404), terminal', () => {
    const v = connectView(initialConnectState(T0), false);
    expect(v).toMatchObject({ kind: 'invalid', terminal: true, pollMs: null });
    expect(v.body).toBe(
      'Link inválido ou incompleto. Confira se abriu o link inteiro, inclusive a parte depois do #.',
    );
  });

  it('antes da 1ª resposta: carregando, sem anúncio', () => {
    const v = connectView(initialConnectState(T0), true);
    expect(v).toMatchObject({ kind: 'loading', terminal: false, status: '' });
  });

  it.each<[PublicConnectPhase, Partial<ReturnType<typeof connectView>>]>([
    [
      'QR',
      {
        kind: 'qr',
        qr: QR,
        pollMs: 2000,
        showNewQrButton: false,
        body: 'O código muda sozinho a cada 20 segundos — é normal.',
      },
    ],
    [
      'PREPARING',
      {
        kind: 'preparing',
        tone: 'wait',
        qr: null,
        pollMs: 3000,
        showNewQrButton: false,
        title: 'Preparando o código…',
      },
    ],
    [
      'IDLE',
      {
        kind: 'idle',
        showNewQrButton: true,
        pollMs: 5000,
        body: 'Toque quando estiver com o celular do WhatsApp em mãos.',
      },
    ],
    [
      'PAIRING',
      {
        kind: 'pairing',
        showNewQrButton: false,
        pollMs: 3000,
        title: 'Conexão por código em andamento',
        body: 'Digite no WhatsApp o código que te passaram.',
      },
    ],
    [
      'UNAVAILABLE',
      {
        kind: 'unavailable',
        showNewQrButton: false,
        pollMs: 10000,
        body: 'Não foi possível preparar a conexão agora. Avise quem te enviou o link.',
      },
    ],
  ])('fase %s', (phase, expected) => {
    const v = connectView(after(active(phase)), true);
    expect(v).toMatchObject({
      ...expected,
      terminal: false,
      active: true,
      expiresAt: AT_1405,
      expectedPhoneHint: '77',
    });
    expect(v.status).toBe(v.title);
  });

  it('PREPARING explica a espera e o "acabei de ler"', () => {
    const v = connectView(after(active('PREPARING')), true);
    expect(`${v.title} ${v.body}`).toBe(
      'Preparando o código… Pode levar até 1 minuto. Se você acabou de ler o QR, aguarde: estamos finalizando a conexão.',
    );
  });

  it('fase QR com qr que não é PNG base64 não mostra nada (fica "preparando")', () => {
    const v = connectView(
      after(active('QR', { qr: '<svg onload=alert(1)>' })),
      true,
    );
    expect(v).toMatchObject({ kind: 'preparing', qr: null });
  });

  it('IDLE sem tentativas → esgotado, sem botão, sem parar de consultar', () => {
    const v = connectView(
      after(
        active('IDLE', {
          newQr: {
            available: false,
            remaining: 0,
            max: 5,
            retryAfterSeconds: 0,
          },
        }),
      ),
      true,
    );
    expect(v).toMatchObject({
      kind: 'exhausted',
      showNewQrButton: false,
      terminal: false,
      body: 'Você usou todas as tentativas deste link. Peça um novo.',
    });
  });

  it('IDLE: "restam N" só com ≤ 2; intervalo entre pedidos segura o botão', () => {
    const idle = (remaining: number, retryAfterSeconds = 0) =>
      active('IDLE', {
        newQr: { available: true, remaining, max: 5, retryAfterSeconds },
      });
    expect(connectView(after(idle(5)), true).remainingHint).toBeNull();
    expect(connectView(after(idle(2)), true).remainingHint).toBe(
      'Restam 2 tentativas neste link.',
    );
    expect(connectView(after(idle(1)), true).remainingHint).toBe(
      'Resta 1 tentativa neste link.',
    );
    const s = after(idle(3, 20));
    const v0 = connectView(s, true);
    expect(v0.newQrWaitSeconds).toBe(20);
    expect(v0.refreshAt).toBe(T0 + 20_000);
    expect(connectView(at(s, T0 + 10_000), true).newQrWaitSeconds).toBe(10);
    expect(connectView(at(s, T0 + 21_000), true).newQrWaitSeconds).toBe(0);
  });

  it('CONNECTED → sucesso com a hora, terminal', () => {
    const v = connectView(
      after({ state: 'CONNECTED', connectedAt: AT_1405 }),
      true,
    );
    expect(v).toMatchObject({
      kind: 'success',
      terminal: true,
      pollMs: null,
      title: 'Pronto! Seu WhatsApp foi conectado.',
      body: 'Conectado às 14:05. Pode fechar esta página.',
      status: '',
    });
  });

  it('410 USED: sucesso se esta aba já viu o link ativo; senão "já usado"', () => {
    const fresh = applyPoll(
      initialConnectState(T0),
      fail(gone('CONNECT_LINK_USED')),
      T0,
    );
    expect(connectView(fresh, true)).toMatchObject({
      kind: 'used',
      terminal: true,
      body: 'Este link já foi usado para conectar. Se precisar de novo, peça outro link.',
    });
    const seen = applyPoll(
      after(active('QR')),
      fail(gone('CONNECT_LINK_USED')),
      T0 + 2000,
    );
    expect(connectView(seen, true)).toMatchObject({
      kind: 'success',
      title: 'Pronto! Seu WhatsApp foi conectado.',
      body: 'Pode fechar esta página.',
      terminal: true,
    });
  });

  it.each<[ConnectFailure, string, string]>([
    [
      gone('CONNECT_LINK_REVOKED'),
      'revoked',
      'Este link foi cancelado ou substituído. Use o link mais recente que você recebeu.',
    ],
    [
      gone('CONNECT_LINK_EXPIRED'),
      'expired',
      'Este link expirou. Peça um novo link a quem te enviou.',
    ],
    [
      gone('CONNECT_LINK_WRONG_NUMBER'),
      'wrong-number',
      'O WhatsApp lido não é o número esperado para este link, e a conexão foi desfeita. Peça um novo link a quem te enviou.',
    ],
    [
      { status: 404, code: 'CONNECT_LINK_NOT_FOUND', message: 'x' },
      'invalid',
      'Link inválido ou incompleto. Confira se abriu o link inteiro, inclusive a parte depois do #.',
    ],
    [
      { status: 404, message: 'Not Found' },
      'invalid',
      'Link inválido ou incompleto. Confira se abriu o link inteiro, inclusive a parte depois do #.',
    ],
    [
      { status: 410, message: 'Gone' },
      'gone',
      'Este link não vale mais. Peça um novo link a quem te enviou.',
    ],
  ])('terminal %#: %s', (failure, kind, body) => {
    // Mesmo com um QR na tela antes: terminal apaga tudo e para de consultar.
    const s = applyPoll(after(active('QR')), fail(failure), T0 + 2000);
    const v = connectView(s, true);
    expect(v).toMatchObject({
      kind,
      body,
      terminal: true,
      pollMs: null,
      qr: null,
      showNewQrButton: false,
      status: '',
    });
  });

  it('sem rede: mantém o QR por até 15 s, depois esconde; backoff 2→4→8→10 s', () => {
    let s = after(active('QR'));
    s = applyPoll(s, fail(NET), T0 + 2000);
    let v = connectView(s, true);
    expect(v).toMatchObject({
      kind: 'qr',
      qr: QR,
      notice: 'Sem conexão — tentando de novo…',
      pollMs: 2000,
      refreshAt: T0 + STALE_QR_MS + 1,
    });
    expect(v.status).toBe(
      'Leia o QR com o celular do WhatsApp Sem conexão — tentando de novo…',
    );
    s = applyPoll(s, fail(NET), T0 + 4000);
    expect(connectView(s, true).pollMs).toBe(4000);
    s = applyPoll(s, fail(NET), T0 + 8000);
    expect(connectView(s, true).pollMs).toBe(8000);
    s = applyPoll(s, fail(NET), T0 + 16_000);
    v = connectView(s, true);
    expect(v).toMatchObject({
      kind: 'offline',
      qr: null,
      title: 'Sem conexão — tentando de novo…',
      pollMs: 10_000,
      terminal: false,
      active: true, // validade e dica do número continuam
    });
    s = applyPoll(s, fail(NET), T0 + 26_000);
    expect(connectView(s, true).pollMs).toBe(10_000);
    // Voltou a rede: zera o backoff.
    s = applyPoll(s, ok(active('QR')), T0 + 27_000);
    expect(s.failures).toBe(0);
    expect(connectView(s, true)).toMatchObject({ kind: 'qr', notice: null });
  });

  it('com falha registrada, o QR some no re-render dos 15 s (refreshAt)', () => {
    const s = applyPoll(after(active('QR')), fail(NET), T0 + 2000);
    expect(connectView(at(s, T0 + STALE_QR_MS + 1), true).qr).toBeNull();
  });

  it('SEM falha (GET pendurado, aba que volta): QR com mais de 15 s vira "Atualizando o código…"', () => {
    const s = after(active('QR'));
    // O ramo QR sempre agenda o re-render do instante em que o QR vence na tela.
    expect(connectView(s, true)).toMatchObject({
      kind: 'qr',
      qr: QR,
      refreshAt: T0 + STALE_QR_MS + 1,
    });
    expect(connectView(at(s, T0 + STALE_QR_MS), true).qr).toBe(QR);
    for (const age of [STALE_QR_MS + 1, 60_000, 600_000]) {
      const v = connectView(at(s, T0 + age), true);
      expect(v).toMatchObject({
        kind: 'preparing',
        tone: 'wait',
        title: 'Atualizando o código…',
        qr: null,
        notice: null,
        pollMs: 2000,
        active: true,
        expiresAt: AT_1405,
        expectedPhoneHint: '77',
        terminal: false,
      });
    }
    // Resposta nova: QR de volta.
    const back = applyPoll(at(s, T0 + 60_000), ok(active('QR')), T0 + 60_000);
    expect(connectView(back, true)).toMatchObject({ kind: 'qr', qr: QR });
  });

  it('429 sem code (teto por IP): 30 s; 5xx conta como falha transitória', () => {
    const ip: ConnectFailure = { status: 429, message: 'Rate limit exceeded' };
    const s = applyPoll(initialConnectState(T0), fail(ip), T0);
    expect(connectView(s, true)).toMatchObject({
      kind: 'rate-limited',
      pollMs: 30_000,
      terminal: false,
    });
    expect(retryDelayMs(ip, 5)).toBe(30_000);
    const s5 = applyPoll(
      after(active('PREPARING')),
      fail({ status: 502, message: 'Bad Gateway' }),
      T0 + 3000,
    );
    expect(connectView(s5, true)).toMatchObject({
      kind: 'preparing',
      pollMs: 2000,
      notice: 'Sem conexão — tentando de novo…',
    });
  });

  it('"Mostrar QR": mostra preparando até o servidor sair do IDLE ou 45 s', () => {
    let s = after(active('IDLE'));
    s = applyNewQr(
      s,
      {
        ok: true,
        data: {
          ok: true,
          newQr: {
            available: true,
            remaining: 4,
            max: 5,
            retryAfterSeconds: 30,
          },
        },
      },
      T0 + 1000,
    );
    expect(s.data?.state === 'ACTIVE' && s.data.newQr.remaining).toBe(4);
    // O servidor ainda mostra a sessão parada por alguns segundos.
    s = applyPoll(s, ok(active('IDLE')), T0 + 3000);
    let v = connectView(s, true);
    expect(v).toMatchObject({
      kind: 'preparing',
      title: 'Preparando o código…',
      showNewQrButton: false,
      pollMs: 2000,
      refreshAt: T0 + 1000 + 45_000,
    });
    // Viu PREPARING: o pedido local acabou.
    s = applyPoll(s, ok(active('PREPARING')), T0 + 5000);
    expect(s.request).toBeNull();
    // Sem resposta do servidor em 45 s: volta o botão.
    let t = applyNewQr(
      after(active('IDLE')),
      {
        ok: true,
        data: {
          ok: true,
          newQr: {
            available: true,
            remaining: 4,
            max: 5,
            retryAfterSeconds: 0,
          },
        },
      },
      T0,
    );
    t = applyPoll(t, ok(active('IDLE')), T0 + 46_000);
    v = connectView(t, true);
    expect(v.kind).toBe('idle');
  });

  it.each<ConnectFailure>([
    { status: 409, code: 'CONNECT_LINK_BUSY', message: 'x' },
    { status: 409, code: 'CONNECT_LINK_NEW_QR_UNAVAILABLE', message: 'x' },
    {
      status: 429,
      code: 'CONNECT_LINK_NEW_QR_COOLDOWN',
      message: 'x',
      retryAfterSeconds: 12,
    },
  ])('"Mostrar QR" com $code = "já estamos preparando" (não é erro)', (e) => {
    const s = applyNewQr(after(active('IDLE')), fail(e), T0 + 1000);
    const v = connectView(s, true);
    expect(v).toMatchObject({
      kind: 'preparing',
      tone: 'wait',
      title: 'Já estamos preparando o QR…',
      notice: null,
    });
  });

  it('"Mostrar QR" com limite/falha/rede: aviso, sem retry; 410 é terminal', () => {
    const post = (e: ConnectFailure) =>
      connectView(applyNewQr(after(active('IDLE')), fail(e), T0 + 1000), true);
    expect(
      post({ status: 409, code: 'CONNECT_LINK_NEW_QR_LIMIT', message: 'x' })
        .notice,
    ).toBe('Você usou todas as tentativas deste link. Peça um novo.');
    const failed = post({
      status: 503,
      code: 'CONNECT_LINK_NEW_QR_FAILED',
      message: 'x',
    });
    expect(failed.kind).toBe('idle');
    expect(failed.notice).toMatch(/^Não conseguimos gerar o QR agora/);
    expect(post(NET).notice).toBe(
      'Sem conexão — confira a internet e tente de novo.',
    );
    expect(post(gone('CONNECT_LINK_REVOKED'))).toMatchObject({
      kind: 'revoked',
      terminal: true,
    });
    // O aviso some quando o servidor sai do IDLE.
    const s = applyPoll(
      applyNewQr(after(active('IDLE')), fail(NET), T0 + 1000),
      ok(active('QR')),
      T0 + 2000,
    );
    expect(connectView(s, true).notice).toBeNull();
  });

  it('expiryInfo: validade dd/mm às hh:mm e aviso com menos de 10 min', () => {
    const exp = Date.parse(AT_1405);
    expect(expiryInfo(AT_1405, exp - 60 * 60_000)).toEqual({
      text: 'Este link vale até 27/09 às 14:05',
      soon: null,
    });
    expect(expiryInfo(AT_1405, exp - 5 * 60_000).soon).toBe(
      'Atenção: este link expira em 5 min.',
    );
    expect(expiryInfo(AT_1405, exp + 1000).soon).toBeNull();
  });
});

describe('diálogo do painel', () => {
  const link = (over: Partial<ConnectLinkDto> = {}): ConnectLinkDto => ({
    id: 'l1',
    sessionId: 's1',
    state: 'ACTIVE',
    createdAt: AT_1405,
    expiresAt: AT_1405,
    createdBy: 'admin (OWNER)',
    expectedPhone: '5511988887777',
    lastSeenAt: null,
    newQrCount: 2,
    newQrMax: 5,
    consumedAt: null,
    revokedAt: null,
    revokedReason: null,
    ...over,
  });

  it('defaultExpectedPhone: último número > atual > informado; LID não é telefone', () => {
    expect(
      defaultExpectedPhone({
        lastMeJid: '5511988887777:12@s.whatsapp.net',
        meJid: '5521977776666@s.whatsapp.net',
        phoneNumber: null,
      }),
    ).toBe('5511988887777');
    expect(
      defaultExpectedPhone({
        lastMeJid: '123456@lid',
        meJid: null,
        phoneNumber: '+55 (31) 97777-1111',
      }),
    ).toBe('5531977771111');
    expect(
      defaultExpectedPhone({ lastMeJid: null, meJid: null, phoneNumber: null }),
    ).toBe('');
  });

  it('defaultExpectedPhone: phoneNumber sem DDI ganha o 55', () => {
    expect(
      defaultExpectedPhone({
        lastMeJid: null,
        meJid: null,
        phoneNumber: '(11) 98888-7777',
      }),
    ).toBe('5511988887777');
    expect(
      defaultExpectedPhone({
        lastMeJid: null,
        meJid: null,
        phoneNumber: '11 3333-4444',
      }),
    ).toBe('551133334444');
    // Internacional com DDI fica como está.
    expect(
      defaultExpectedPhone({
        lastMeJid: null,
        meJid: null,
        phoneNumber: '+1 415 555 2671',
      }),
    ).toBe('14155552671');
  });

  it('looksLikeBrNational: DDD + celular/fixo sem o 55', () => {
    expect(looksLikeBrNational('11988887777')).toBe(true); // celular
    expect(looksLikeBrNational('1133334444')).toBe(true); // fixo
    expect(looksLikeBrNational('55999887766')).toBe(true); // DDD 55 (RS) sem DDI
    expect(looksLikeBrNational('5511988887777')).toBe(false); // com DDI
    expect(looksLikeBrNational('551188887777')).toBe(false); // com DDI, sem o 9
    expect(looksLikeBrNational('14155552671')).toBe(false); // EUA (+1): "14" + "1…" não é celular/fixo BR
    expect(looksLikeBrNational('01988887777')).toBe(false); // DDD não começa com 0
    expect(looksLikeBrNational('119888877')).toBe(false); // curto demais
  });

  it('isValidExpectedPhone / expectedPhoneError: 10 a 15 dígitos e com DDI', () => {
    expect(isValidExpectedPhone('5511988887777')).toBe(true);
    expect(isValidExpectedPhone('11988887777')).toBe(false);
    expect(isValidExpectedPhone('119888877')).toBe(false);
    expect(isValidExpectedPhone('1234567890123456')).toBe(false);
    expect(expectedPhoneError('')).toBeNull();
    expect(expectedPhoneError('5511988887777')).toBeNull();
    expect(expectedPhoneError('11988887777')).toBe(
      'Parece um número sem DDI. Use 55 + DDD + número (ex.: 5511988887777).',
    );
    expect(expectedPhoneError('119888877')).toBe(
      'Número inválido: use DDI + DDD + número (10 a 15 dígitos), ex.: 5511988887777.',
    );
  });

  it('lastSeenLabel', () => {
    const now = Date.parse(AT_1405);
    expect(lastSeenLabel(null, now)).toBe('Nunca aberto');
    expect(lastSeenLabel(new Date(now - 30_000).toISOString(), now)).toBe(
      'Aberto agora',
    );
    expect(lastSeenLabel(new Date(now - 5 * 60_000).toISOString(), now)).toBe(
      'Aberto há 5 min',
    );
  });

  it('describeLink ACTIVE: validade, aberto, QR pedidos e número esperado', () => {
    const d = describeLink(link(), { meJid: null }, Date.parse(AT_1405));
    expect(d.title).toBe('Link ativo — válido até 27/09 às 14:05');
    expect(d.lines).toEqual([
      'Nunca aberto',
      'QR pedidos pela pessoa: 2 de 5',
      'Número esperado: +55 11 98888-7777',
    ]);
    expect(
      describeLink(link({ expectedPhone: null }), { meJid: null }, 0).lines[2],
    ).toBe('Número esperado: qualquer número');
  });

  it('describeLink CONNECTED/USED: hora e número conectado agora', () => {
    const d = describeLink(
      link({ state: 'USED', consumedAt: AT_1405 }),
      { meJid: '5511988887777:3@s.whatsapp.net' },
      0,
    );
    expect(d.title).toBe('Conectado pelo link em 27/09 às 14:05');
    expect(d.lines[0]).toBe(
      'Número conectado agora: +55 11 98888-7777 — confira se é o número esperado',
    );
    expect(
      describeLink(link({ state: 'CONNECTED' }), { meJid: null }, 0).lines[0],
    ).toBe('A sessão não está conectada agora.');
  });

  it.each([
    ['MANUAL', 'Link cancelado por você'],
    ['REPLACED', 'Link substituído por um link mais novo'],
    ['SESSION_STOPPED', 'Link cancelado porque a sessão foi parada'],
    [
      'WRONG_NUMBER',
      'Link cancelado: leram o QR com outro número e a conexão foi desfeita',
    ],
  ] as const)('describeLink REVOKED %s', (reason, title) => {
    const d = describeLink(
      link({ state: 'REVOKED', revokedReason: reason, revokedAt: AT_1405 }),
      { meJid: null },
      0,
    );
    expect(d.title).toBe(title);
    expect(d.lines).toEqual(['Em 27/09 às 14:05']);
  });

  it('describeLink EXPIRED', () => {
    expect(
      describeLink(link({ state: 'EXPIRED' }), { meJid: null }, 0).title,
    ).toBe('Link expirou em 27/09 às 14:05');
  });

  it('createLinkError: textos dos 409 e oferta de QR novo só no PAIRED', () => {
    expect(createLinkError('CONNECT_LINK_SESSION_PAIRED', 'x')).toEqual({
      text: 'Esta sessão ainda tem login salvo (caiu por instabilidade). Tente Reiniciar primeiro. Se precisar conectar de novo do zero, gere um novo QR.',
      paired: true,
    });
    expect(createLinkError('CONNECT_LINK_SESSION_WORKING', 'x').text).toBe(
      'A sessão já está conectada.',
    );
    expect(createLinkError('CONNECT_LINK_ENGINE_UNSUPPORTED', 'x').text).toBe(
      'Disponível só para sessões Baileys nesta versão.',
    );
    expect(createLinkError(undefined, 'Forbidden resource')).toEqual({
      text: 'Forbidden resource',
      paired: false,
    });
  });
});
