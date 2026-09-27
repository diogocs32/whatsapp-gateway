// E27/P-086 (D-037) — link público para conectar uma sessão lendo o QR de outra tela. Puro (sem
// React/DOM) → testável em vitest `environment: 'node'`. O token vai no FRAGMENTO da URL do painel
// (`/conectar#<token>`): não chega ao servidor do painel nem ao Referer (RFC 3986 §3.5); a página o
// manda ao gateway em `Authorization: Bearer` (lib/public-connect.ts).
import type {
  ConnectLinkDto,
  ConnectLinkErrorCode,
  ConnectLinkRevokedReason,
  PublicConnectNewQrResponse,
  PublicConnectResponse,
  SessionDto,
} from '@contracts';
import { CONNECT_PATH } from './connect-path';
import { formatPhone, isLidJid, numberFromJid } from './jid';
import { clock, since } from './time-format';

export { CONNECT_PATH, isPublicPath } from './connect-path';
// 32 bytes em base64url sem padding = 43 caracteres (mesma regex do gateway).
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
// sessionStorage da aba: o token sobrevive ao recarregar depois do replaceState que tira o #.
export const TOKEN_STORAGE_KEY = 'cz-connect-token';
// Nome padrão do branding (lib/branding.tsx): numa página pública parece página oficial do WhatsApp.
export const DEFAULT_PRODUCT_NAME = 'WhatsApp Gateway';

// `#<token>` ou `#t=<token>` → token; qualquer outra coisa → null (sem ecoar o conteúdo).
export function readTokenFromHash(hash: string): string | null {
  let raw = hash.replace(/^#/, '').trim();
  if (raw.startsWith('t=')) raw = raw.slice(2);
  return TOKEN_RE.test(raw) ? raw : null;
}

// Token da página: o do # quando há #; hash vazio (recarregou depois do replaceState) → o guardado
// na aba. Um # inválido NÃO cai para o guardado: é outro link (quebrado), não uma recarga.
export function pickToken(hash: string, stored: string | null): string | null {
  if (hash.replace(/^#/, '').trim()) return readTokenFromHash(hash);
  return stored && TOKEN_RE.test(stored) ? stored : null;
}

export function buildConnectUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}${CONNECT_PATH}#${token}`;
}

// "27/09 às 14:05" no fuso local.
export function dayTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${day} às ${clock(iso)}`;
}

export function isDefaultProductName(name: string): boolean {
  const n = name.trim();
  return !n || n === DEFAULT_PRODUCT_NAME;
}

// Mensagem para enviar à pessoa. Começa pela instrução de abrir em OUTRA tela (quem recebe no
// celular é justamente quem precisa ler o QR com a câmera dele); a URL vai SOZINHA numa linha, sem
// pontuação colada (detector de link não engole nem corta o fim do token).
export function buildShareText({
  url,
  expiresAt,
  productName,
}: {
  url: string;
  expiresAt: string;
  productName: string;
}): string {
  const target = isDefaultProductName(productName)
    ? 'o WhatsApp'
    : `o WhatsApp ao sistema ${productName.trim()}`;
  return [
    `Para conectar ${target}, abra este link em um COMPUTADOR (pode ser pelo WhatsApp Web) ou em outro celular/tablet — o QR precisa aparecer em outra tela para a câmera do seu celular ler.`,
    url,
    `Válido até ${dayTime(expiresAt)}. Não encaminhe este link.`,
  ].join('\n');
}

// UA-CH (`navigator.userAgentData.mobile`) quando existe (Chromium); senão o token "Mobi" do UA —
// MDN "Browser detection using the user agent" › Mobile, Tablet or Desktop. Tablet não tem "Mobi".
export function uaSaysMobile(
  uaDataMobile: boolean | undefined,
  userAgent: string,
): boolean {
  return typeof uaDataMobile === 'boolean'
    ? uaDataMobile
    : /Mobi/i.test(userAgent);
}

// Celular = o aparelho que precisa LER o QR. Tablet (toque, ≥ 768 px) é uma segunda tela válida.
export function isLikelyPhone({
  uaMobile,
  coarse,
  width,
}: {
  uaMobile?: boolean;
  coarse: boolean;
  width: number;
}): boolean {
  return uaMobile === true || (coarse && width < 768);
}

export const isQrDataUrl = (s: string | null | undefined): s is string =>
  typeof s === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(s);

export const STEPS_ANDROID =
  'WhatsApp → ⋮ (três pontinhos) → Aparelhos conectados → Conectar um aparelho';
export const STEPS_IPHONE =
  'WhatsApp → Configurações → Aparelhos conectados → Conectar um aparelho';

// ---- Página pública: estado e view model ---------------------------------------------------

// Falha de uma chamada pública: `status` 0 = rede (sem resposta). `code` só quando é um dos
// CONNECT_LINK_ERROR_CODES (o 429 do teto por IP vem SEM code).
export interface ConnectFailure {
  status: number;
  code?: ConnectLinkErrorCode;
  message: string;
  retryAfterSeconds?: number;
}

export type ConnectResult<T> =
  { ok: true; data: T } | { ok: false; error: ConnectFailure };

export interface ConnectPageState {
  data: PublicConnectResponse | null; // última resposta OK do GET
  dataAt: number | null; // quando ela chegou (ms)
  failure: ConnectFailure | null; // falha do ÚLTIMO GET (null = o último deu certo)
  failures: number; // falhas transitórias seguidas (backoff)
  sawActive: boolean; // esta aba já viu o link ACTIVE
  // "Mostrar QR" enviado: mostra "preparando" até ver outra fase ou vencer REQUEST_WINDOW_MS.
  request: { at: number; kind: 'sent' | 'already' } | null;
  postFailure: ConnectFailure | null; // falha do último "Mostrar QR" que não virou estado
  now: number; // relógio da última atualização (o render não lê Date.now())
}

export const REQUEST_WINDOW_MS = 45_000;
export const STALE_QR_MS = 15_000;
export const IP_LIMIT_BACKOFF_MS = 30_000;
export const POLL_QR_MS = 2_000;
export const POLL_PREPARING_MS = 3_000;
export const POLL_IDLE_MS = 5_000;
export const POLL_SLOW_MS = 10_000;

export function initialConnectState(now: number): ConnectPageState {
  return {
    data: null,
    dataAt: null,
    failure: null,
    failures: 0,
    sawActive: false,
    request: null,
    postFailure: null,
    now,
  };
}

// 404/410: o link não vale mais — a página para de consultar.
export function isTerminalFailure(f: ConnectFailure): boolean {
  return f.status === 404 || f.status === 410;
}

// Sem rede / 5xx / outros: 2 → 4 → 8 → 10 s. 429 sem code (teto por IP): 30 s fixos.
export function retryDelayMs(f: ConnectFailure, failures: number): number {
  if (f.status === 429 && !f.code) return IP_LIMIT_BACKOFF_MS;
  const n = Math.max(1, failures);
  return Math.min(10_000, 1_000 * 2 ** n);
}

export function applyPoll(
  s: ConnectPageState,
  r: ConnectResult<PublicConnectResponse>,
  now: number,
): ConnectPageState {
  if (!r.ok) {
    return {
      ...s,
      failure: r.error,
      failures: isTerminalFailure(r.error) ? s.failures : s.failures + 1,
      now,
    };
  }
  const d = r.data;
  const idle = d.state === 'ACTIVE' && d.phase === 'IDLE';
  const requestLive = !!s.request && now - s.request.at < REQUEST_WINDOW_MS;
  return {
    ...s,
    data: d,
    dataAt: now,
    failure: null,
    failures: 0,
    sawActive: s.sawActive || d.state === 'ACTIVE',
    // O pedido acabou quando o servidor mostrou outra fase (PREPARING/QR/…) ou o prazo venceu.
    request: idle && requestLive ? s.request : null,
    postFailure: idle ? s.postFailure : null,
    now,
  };
}

// Resultado do "Mostrar QR". Sem retry automático do POST.
export function applyNewQr(
  s: ConnectPageState,
  r: ConnectResult<PublicConnectNewQrResponse>,
  now: number,
): ConnectPageState {
  if (r.ok) {
    const data =
      s.data?.state === 'ACTIVE' ? { ...s.data, newQr: r.data.newQr } : s.data;
    return {
      ...s,
      data,
      request: { at: now, kind: 'sent' },
      postFailure: null,
      now,
    };
  }
  const e = r.error;
  // Outra operação já está preparando o QR (ou acabou de preparar): não é erro para a pessoa.
  if (
    e.code === 'CONNECT_LINK_BUSY' ||
    e.code === 'CONNECT_LINK_NEW_QR_UNAVAILABLE' ||
    e.code === 'CONNECT_LINK_NEW_QR_COOLDOWN'
  ) {
    return {
      ...s,
      request: { at: now, kind: 'already' },
      postFailure: null,
      now,
    };
  }
  if (isTerminalFailure(e)) {
    return { ...s, failure: e, request: null, postFailure: null, now };
  }
  return { ...s, postFailure: e, request: null, now };
}

export type ConnectViewKind =
  | 'loading'
  | 'success'
  | 'used'
  | 'revoked'
  | 'expired'
  | 'wrong-number'
  | 'invalid'
  | 'gone'
  | 'qr'
  | 'preparing'
  | 'idle'
  | 'exhausted'
  | 'pairing'
  | 'unavailable'
  | 'offline'
  | 'rate-limited';

export interface ConnectView {
  kind: ConnectViewKind;
  tone: 'wait' | 'info' | 'success' | 'error';
  title: string;
  body: string | null;
  qr: string | null; // só quando o QR pode ser mostrado (data URL PNG válida e recente)
  showNewQrButton: boolean;
  newQrWaitSeconds: number; // > 0: botão desabilitado (intervalo entre pedidos)
  remainingHint: string | null; // "Restam N tentativas" quando ≤ 2
  active: boolean; // link ACTIVE conhecido (consentimento, dica do número, validade)
  terminal: boolean;
  pollMs: number | null; // null = parar de consultar
  refreshAt: number | null; // instante em que a tela muda sem resposta nova (re-render)
  notice: string | null; // aviso transitório (rede, teto por IP, falha do "Mostrar QR")
  expiresAt: string | null;
  expectedPhoneHint: string | null;
  status: string; // texto da linha role=status (ver connectView)
}

const INVALID_BODY =
  'Link inválido ou incompleto. Confira se abriu o link inteiro, inclusive a parte depois do #.';
const PREPARING_BODY =
  'Pode levar até 1 minuto. Se você acabou de ler o QR, aguarde: estamos finalizando a conexão.';

function base(
  kind: ConnectViewKind,
  tone: ConnectView['tone'],
  title: string,
  body: string | null,
  pollMs: number | null,
): ConnectView {
  const terminal = pollMs === null;
  return {
    kind,
    tone,
    title,
    body,
    qr: null,
    showNewQrButton: false,
    newQrWaitSeconds: 0,
    remainingHint: null,
    active: false,
    terminal,
    pollMs,
    refreshAt: null,
    notice: null,
    expiresAt: null,
    expectedPhoneHint: null,
    status: '',
  };
}

function successView(connectedAt: string | null): ConnectView {
  return base(
    'success',
    'success',
    'Pronto! Seu WhatsApp foi conectado.',
    connectedAt
      ? `Conectado às ${clock(connectedAt)}. Pode fechar esta página.`
      : 'Pode fechar esta página.',
    null,
  );
}

function terminalView(f: ConnectFailure, sawActive: boolean): ConnectView {
  if (f.status === 404) {
    return base('invalid', 'error', 'Link inválido', INVALID_BODY, null);
  }
  switch (f.code) {
    case 'CONNECT_LINK_USED':
      // O consumo pelo evento WORKING chega antes do próximo poll: quem acabou de ver o link ativo
      // nesta aba e recebe "usado" conectou agora (e passou da janela de 15 min do CONNECTED).
      return sawActive
        ? successView(null)
        : base(
            'used',
            'info',
            'Link já usado',
            'Este link já foi usado para conectar. Se precisar de novo, peça outro link.',
            null,
          );
    case 'CONNECT_LINK_REVOKED':
      return base(
        'revoked',
        'error',
        'Link cancelado',
        'Este link foi cancelado ou substituído. Use o link mais recente que você recebeu.',
        null,
      );
    case 'CONNECT_LINK_EXPIRED':
      return base(
        'expired',
        'error',
        'Link expirado',
        'Este link expirou. Peça um novo link a quem te enviou.',
        null,
      );
    case 'CONNECT_LINK_WRONG_NUMBER':
      return base(
        'wrong-number',
        'error',
        'Número diferente do esperado',
        'O WhatsApp lido não é o número esperado para este link, e a conexão foi desfeita. Peça um novo link a quem te enviou.',
        null,
      );
    case 'CONNECT_LINK_NOT_FOUND':
      return base('invalid', 'error', 'Link inválido', INVALID_BODY, null);
    default:
      return base(
        'gone',
        'error',
        'Link encerrado',
        'Este link não vale mais. Peça um novo link a quem te enviou.',
        null,
      );
  }
}

function transientNotice(f: ConnectFailure): string {
  if (f.status === 429 && !f.code)
    return 'Muitas tentativas a partir desta rede — aguardando um pouco…';
  return 'Sem conexão — tentando de novo…';
}

// Vista a partir de uma resposta ACTIVE (fresca, ou recente o bastante durante uma falha).
function activeView(
  s: ConnectPageState,
  d: Extract<PublicConnectResponse, { state: 'ACTIVE' }>,
): ConnectView {
  const request =
    s.request && s.now - s.request.at < REQUEST_WINDOW_MS ? s.request : null;
  let v: ConnectView;
  const qrAge = s.dataAt === null ? 0 : s.now - s.dataAt;
  if (d.phase === 'QR' && isQrDataUrl(d.qr) && qrAge > STALE_QR_MS) {
    // Última resposta com mais de 15 s (GET pendurado, aba que volta): o Baileys já pode ter
    // trocado o QR — não mostrar um que o celular vai recusar.
    v = base(
      'preparing',
      'wait',
      'Atualizando o código…',
      'O código muda a cada 20 segundos; estamos buscando o mais recente.',
      POLL_QR_MS,
    );
  } else if (d.phase === 'QR' && isQrDataUrl(d.qr)) {
    v = base(
      'qr',
      'info',
      'Leia o QR com o celular do WhatsApp',
      'O código muda sozinho a cada 20 segundos — é normal.',
      POLL_QR_MS,
    );
    v.qr = d.qr;
    // Sem resposta nova até lá, a tela troca o QR por "Atualizando o código…".
    if (s.dataAt !== null) v.refreshAt = s.dataAt + STALE_QR_MS + 1;
  } else if (d.phase === 'QR' || d.phase === 'PREPARING') {
    v = base(
      'preparing',
      'wait',
      'Preparando o código…',
      PREPARING_BODY,
      POLL_PREPARING_MS,
    );
  } else if (d.phase === 'IDLE' && request) {
    // "Mostrar QR" enviado: o servidor ainda pode mostrar a sessão parada por alguns segundos.
    v = base(
      'preparing',
      'wait',
      request.kind === 'already'
        ? 'Já estamos preparando o QR…'
        : 'Preparando o código…',
      PREPARING_BODY,
      POLL_QR_MS,
    );
    v.refreshAt = request.at + REQUEST_WINDOW_MS;
  } else if (d.phase === 'IDLE' && d.newQr.available) {
    v = base(
      'idle',
      'info',
      'Tudo pronto para conectar',
      'Toque quando estiver com o celular do WhatsApp em mãos.',
      POLL_IDLE_MS,
    );
    v.showNewQrButton = true;
    const elapsed =
      s.dataAt === null ? 0 : Math.floor((s.now - s.dataAt) / 1000);
    v.newQrWaitSeconds = Math.max(0, d.newQr.retryAfterSeconds - elapsed);
    if (v.newQrWaitSeconds > 0 && s.dataAt !== null)
      v.refreshAt = s.dataAt + d.newQr.retryAfterSeconds * 1000;
    const left = d.newQr.remaining;
    if (left > 0 && left <= 2)
      v.remainingHint =
        left === 1
          ? 'Resta 1 tentativa neste link.'
          : `Restam ${left} tentativas neste link.`;
  } else if (d.phase === 'IDLE') {
    v = base(
      'exhausted',
      'error',
      'Tentativas esgotadas',
      'Você usou todas as tentativas deste link. Peça um novo.',
      POLL_SLOW_MS,
    );
  } else if (d.phase === 'PAIRING') {
    v = base(
      'pairing',
      'info',
      'Conexão por código em andamento',
      'Digite no WhatsApp o código que te passaram.',
      POLL_PREPARING_MS,
    );
  } else {
    v = base(
      'unavailable',
      'error',
      'Conexão indisponível agora',
      'Não foi possível preparar a conexão agora. Avise quem te enviou o link.',
      POLL_SLOW_MS,
    );
  }
  v.active = true;
  v.expiresAt = d.expiresAt;
  v.expectedPhoneHint = d.expectedPhoneHint;
  if (s.postFailure) v.notice = newQrFailureNotice(s.postFailure);
  return v;
}

function newQrFailureNotice(f: ConnectFailure): string {
  if (f.code === 'CONNECT_LINK_NEW_QR_LIMIT')
    return 'Você usou todas as tentativas deste link. Peça um novo.';
  if (f.status === 0)
    return 'Sem conexão — confira a internet e tente de novo.';
  if (f.status === 429 && !f.code)
    return 'Muitas tentativas a partir desta rede — aguarde um pouco e tente de novo.';
  return 'Não conseguimos gerar o QR agora. Tente de novo em instantes; se continuar, avise quem te enviou o link.';
}

export function connectView(
  s: ConnectPageState,
  hasToken: boolean,
): ConnectView {
  const v = rawView(s, hasToken);
  // Leitor de tela: anuncia a transição (título + aviso), nunca o QR nem contagem. Nos terminais
  // fica vazio — o foco vai para o título, que já é lido.
  v.status =
    v.terminal || v.kind === 'loading'
      ? ''
      : [v.title, v.notice].filter(Boolean).join(' ');
  return v;
}

function rawView(s: ConnectPageState, hasToken: boolean): ConnectView {
  if (!hasToken)
    return base('invalid', 'error', 'Link inválido', INVALID_BODY, null);
  const f = s.failure;
  if (f && isTerminalFailure(f)) return terminalView(f, s.sawActive);
  if (s.data?.state === 'CONNECTED') return successView(s.data.connectedAt);

  const fresh = s.dataAt !== null && s.now - s.dataAt <= STALE_QR_MS;
  if (!f) {
    if (s.data?.state === 'ACTIVE') return activeView(s, s.data);
    return base('loading', 'wait', 'Carregando…', null, 0);
  }

  // Falha transitória: mantém a última tela só enquanto ela é recente (o QR troca a cada 20 s —
  // um QR de mais de 15 s atrás pode já ter vencido e não deve ser lido).
  let v: ConnectView;
  if (s.data?.state === 'ACTIVE' && fresh) {
    v = activeView(s, s.data); // o ramo QR já agenda o re-render dos 15 s
    v.notice = transientNotice(f);
  } else {
    const ipLimit = f.status === 429 && !f.code;
    v = base(
      ipLimit ? 'rate-limited' : 'offline',
      'wait',
      ipLimit
        ? 'Muitas tentativas — aguardando um pouco…'
        : 'Sem conexão — tentando de novo…',
      ipLimit
        ? 'A página tenta de novo sozinha em alguns segundos.'
        : 'Confira a internet deste aparelho. A página continua tentando sozinha.',
      0,
    );
    if (s.data?.state === 'ACTIVE') {
      v.active = true;
      v.expiresAt = s.data.expiresAt;
      v.expectedPhoneHint = s.data.expectedPhoneHint;
    }
  }
  v.pollMs = retryDelayMs(f, s.failures);
  return v;
}

// "Este link vale até 27/09 às 14:05" + aviso quando faltam menos de 10 min.
export function expiryInfo(
  expiresAt: string,
  now: number,
): { text: string; soon: string | null } {
  const left = Date.parse(expiresAt) - now;
  const min = Math.ceil(left / 60_000);
  return {
    text: `Este link vale até ${dayTime(expiresAt)}`,
    soon:
      left > 0 && left < 10 * 60_000
        ? `Atenção: este link expira em ${min} min.`
        : null,
  };
}

// ---- Painel (diálogo do operador) -----------------------------------------------------------

// Número brasileiro SEM o DDI (DDD + 8/9 dígitos): o gateway confere o número inteiro com o meJid
// (que sempre traz o 55) — "11988887777" nunca bateria com "5511988887777" e a pessoa CERTA seria
// desconectada como número errado. O painel recusa e pede o 55 (o gateway também recusa com 400).
export function looksLikeBrNational(digits: string): boolean {
  return (
    digits.length >= 10 &&
    digits.length <= 11 &&
    /^[1-9]{2}(9[6-9]\d{7}|[2-9]\d{7})$/.test(digits)
  );
}

// Número pré-preenchido: o último conectado (sobrevive ao 401), o atual ou o informado na criação
// (texto livre — pode vir sem DDI: ganha o 55). Só dígitos; LID não é telefone.
export function defaultExpectedPhone(
  s: Pick<SessionDto, 'lastMeJid' | 'meJid' | 'phoneNumber'>,
): string {
  let d = '';
  for (const jid of [s.lastMeJid, s.meJid]) {
    if (jid && !isLidJid(jid)) {
      d = numberFromJid(jid).replace(/\D/g, '');
      if (d) break;
    }
  }
  if (!d) d = (s.phoneNumber ?? '').replace(/\D/g, '');
  return looksLikeBrNational(d) ? `55${d}` : d;
}

export const TTL_OPTIONS = [
  { minutes: 60, label: '1 hora' },
  { minutes: 1440, label: '24 horas' },
  { minutes: 4320, label: '72 horas' },
] as const;
export const DEFAULT_TTL_MINUTES = 1440;

// DDI + DDD + número (mesmo intervalo do gateway).
export function isValidExpectedPhone(digits: string): boolean {
  return /^\d{10,15}$/.test(digits) && !looksLikeBrNational(digits);
}

// Erro do campo "Número que vai conectar" (só dígitos; vazio = sem número) ou null.
export function expectedPhoneError(digits: string): string | null {
  if (!digits) return null;
  if (looksLikeBrNational(digits))
    return `Parece um número sem DDI. Use 55 + DDD + número (ex.: 55${digits}).`;
  if (!isValidExpectedPhone(digits))
    return 'Número inválido: use DDI + DDD + número (10 a 15 dígitos), ex.: 5511988887777.';
  return null;
}

export function lastSeenLabel(lastSeenAt: string | null, now: number): string {
  if (!lastSeenAt) return 'Nunca aberto';
  if (now - Date.parse(lastSeenAt) < 90_000) return 'Aberto agora';
  return `Aberto ${since(lastSeenAt, now)}`;
}

const REVOKED_REASON: Record<ConnectLinkRevokedReason, string> = {
  MANUAL: 'cancelado por você',
  REPLACED: 'substituído por um link mais novo',
  SESSION_STOPPED: 'cancelado porque a sessão foi parada',
  WRONG_NUMBER:
    'cancelado: leram o QR com outro número e a conexão foi desfeita',
};

// Resumo do último link para o diálogo (atualizado pelo polling de 5 s).
export function describeLink(
  link: ConnectLinkDto,
  session: Pick<SessionDto, 'meJid'>,
  now: number,
): { title: string; tone: 'active' | 'success' | 'muted'; lines: string[] } {
  const expected = link.expectedPhone
    ? `Número esperado: ${formatPhone(link.expectedPhone)}`
    : 'Número esperado: qualquer número';
  switch (link.state) {
    case 'ACTIVE':
      return {
        title: `Link ativo — válido até ${dayTime(link.expiresAt)}`,
        tone: 'active',
        lines: [
          lastSeenLabel(link.lastSeenAt, now),
          `QR pedidos pela pessoa: ${link.newQrCount} de ${link.newQrMax}`,
          expected,
        ],
      };
    case 'CONNECTED':
    case 'USED': {
      const current =
        session.meJid && !isLidJid(session.meJid)
          ? `Número conectado agora: ${formatPhone(numberFromJid(session.meJid))} — confira se é o número esperado`
          : 'A sessão não está conectada agora.';
      return {
        title: link.consumedAt
          ? `Conectado pelo link em ${dayTime(link.consumedAt)}`
          : 'Conectado pelo link',
        tone: 'success',
        lines: [current, expected],
      };
    }
    case 'REVOKED':
      return {
        title: link.revokedReason
          ? `Link ${REVOKED_REASON[link.revokedReason]}`
          : 'Link cancelado',
        tone: 'muted',
        lines: link.revokedAt ? [`Em ${dayTime(link.revokedAt)}`] : [],
      };
    case 'EXPIRED':
      return {
        title: `Link expirou em ${dayTime(link.expiresAt)}`,
        tone: 'muted',
        lines: [lastSeenLabel(link.lastSeenAt, now), expected],
      };
  }
}

// Erro do "Gerar link" (409 com `code`). `paired`: oferece "Gerar novo QR agora e criar o link".
export function createLinkError(
  code: string | undefined,
  message: string,
): { text: string; paired: boolean } {
  switch (code) {
    case 'CONNECT_LINK_SESSION_PAIRED':
      return {
        text: 'Esta sessão ainda tem login salvo (caiu por instabilidade). Tente Reiniciar primeiro. Se precisar conectar de novo do zero, gere um novo QR.',
        paired: true,
      };
    case 'CONNECT_LINK_SESSION_WORKING':
      return { text: 'A sessão já está conectada.', paired: false };
    case 'CONNECT_LINK_ENGINE_UNSUPPORTED':
      return {
        text: 'Disponível só para sessões Baileys nesta versão.',
        paired: false,
      };
    default:
      return {
        text: message || 'Não foi possível gerar o link.',
        paired: false,
      };
  }
}
