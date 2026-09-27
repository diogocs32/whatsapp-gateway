// E27 · P-086 · D-037 — regras puras do link público de conexão por QR (sem Nest/Prisma → unit).
// O link deixa uma pessoa de fora conectar a sessão lendo o QR em outra tela. Ele NUNCA recupera
// sessão com login salvo nem derruba conta conectada: só pede QR para sessão Baileys parada e sem
// credencial de conta (ver `publicPhase`). Estados e códigos espelham packages/contracts (o gateway
// é CommonJS e não importa valor de lá — só tipos).
import type { ConnectLinkErrorCode } from '@whatsapp-gateway/contracts';
import type { Engine, SessionStatus } from './session-status';

export const CONNECT_LINK_TTL_DEFAULT_MIN = 1440; // 24 h
export const CONNECT_LINK_TTL_MIN_MIN = 10;
export const CONNECT_LINK_TTL_MAX_MIN = 4320; // 72 h
export const CONNECT_LINK_NEW_QR_MAX = 5;
export const CONNECT_LINK_NEW_QR_COOLDOWN_MS = 30_000;
// Depois de conectar, a página ainda recebe "conectado" por este tempo (o assinante do evento
// WORKING consome o link no mesmo tick do persist — sem a janela, o sucesso chegaria como 410).
export const CONNECT_LINK_CONNECTED_GRACE_MS = 15 * 60_000;
// `lastSeenAt` é gravado no máximo 1×/min (a página consulta a cada 2–3 s).
export const CONNECT_LINK_SEEN_THROTTLE_MS = 60_000;
// Logo após um "gerar QR" pedido pelo link, o banco ainda mostra o status antigo até o start gravar
// STARTING (o stop leva até 10 s): a página mostra "preparando" em vez de reoferecer o botão.
export const CONNECT_LINK_RECENT_NEW_QR_MS = 45_000;
// Inativos da mesma sessão são apagados ao criar um link novo (sem timer próprio).
export const CONNECT_LINK_RETENTION_MS = 30 * 24 * 60 * 60_000;
// 32 bytes em base64url = 43 caracteres sem padding.
export const CONNECT_LINK_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export const CONNECT_LINK_ERROR = {
  NOT_FOUND: 'CONNECT_LINK_NOT_FOUND',
  USED: 'CONNECT_LINK_USED',
  REVOKED: 'CONNECT_LINK_REVOKED',
  EXPIRED: 'CONNECT_LINK_EXPIRED',
  WRONG_NUMBER: 'CONNECT_LINK_WRONG_NUMBER',
  SESSION_WORKING: 'CONNECT_LINK_SESSION_WORKING',
  SESSION_PAIRED: 'CONNECT_LINK_SESSION_PAIRED',
  ENGINE_UNSUPPORTED: 'CONNECT_LINK_ENGINE_UNSUPPORTED',
  NEW_QR_UNAVAILABLE: 'CONNECT_LINK_NEW_QR_UNAVAILABLE',
  NEW_QR_LIMIT: 'CONNECT_LINK_NEW_QR_LIMIT',
  NEW_QR_COOLDOWN: 'CONNECT_LINK_NEW_QR_COOLDOWN',
  BUSY: 'CONNECT_LINK_BUSY',
  NEW_QR_FAILED: 'CONNECT_LINK_NEW_QR_FAILED',
} as const satisfies Record<string, ConnectLinkErrorCode>;
export type ConnectLinkErrorCodeValue =
  (typeof CONNECT_LINK_ERROR)[keyof typeof CONNECT_LINK_ERROR];

export type ConnectLinkState =
  'ACTIVE' | 'CONNECTED' | 'USED' | 'REVOKED' | 'EXPIRED';

export type ConnectLinkRevokedReason =
  'MANUAL' | 'REPLACED' | 'SESSION_STOPPED' | 'WRONG_NUMBER';

export interface ConnectLinkRecord {
  id: string;
  sessionId: string;
  tokenHash: string;
  createdBy: string;
  expectedPhone: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  consumedAt: Date | null;
  newQrCount: number;
  lastNewQrAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
}

// Consumido (só acontece quando a sessão ficou WORKING com o número certo) vence revogado/expirado:
// um link usado 1 min antes de vencer continua "conectado" durante a janela de graça.
export function linkState(
  link: ConnectLinkRecord,
  now: Date,
): ConnectLinkState {
  if (link.consumedAt) {
    return now.getTime() - link.consumedAt.getTime() <=
      CONNECT_LINK_CONNECTED_GRACE_MS
      ? 'CONNECTED'
      : 'USED';
  }
  if (link.revokedAt) return 'REVOKED';
  if (link.expiresAt.getTime() <= now.getTime()) return 'EXPIRED';
  return 'ACTIVE';
}

export interface NewQrAllowance {
  remaining: number;
  retryAfterSeconds: number;
}

export function newQrAllowance(
  link: Pick<ConnectLinkRecord, 'newQrCount' | 'lastNewQrAt'>,
  now: Date,
): NewQrAllowance {
  const remaining = Math.max(0, CONNECT_LINK_NEW_QR_MAX - link.newQrCount);
  const wait = link.lastNewQrAt
    ? link.lastNewQrAt.getTime() +
      CONNECT_LINK_NEW_QR_COOLDOWN_MS -
      now.getTime()
    : 0;
  return {
    remaining,
    retryAfterSeconds: wait > 0 ? Math.ceil(wait / 1000) : 0,
  };
}

export type PublicConnectPhase =
  'QR' | 'PREPARING' | 'IDLE' | 'PAIRING' | 'UNAVAILABLE';

export interface PhaseInput {
  engine: Engine;
  // Status persistido. O status VIVO (`live`) é o da engine neste processo, lido junto com o QR da
  // MESMA instância — o banco não enxerga o backoff entre ciclos de QR nem o 515 pós-leitura do
  // Baileys (ficam só em memória) e mostraria um QR já morto.
  dbStatus: SessionStatus;
  live: SessionStatus | null;
  liveQr: string | null;
  // Credencial de conta salva (Baileys `creds.account`, gravado só no pair-success). `creds.me`
  // sozinho NÃO conta: o pedido de código de pareamento grava `me` sem parear.
  paired: boolean;
  // Operação de ciclo de vida (start/stop/newQr/…) em andamento na sessão.
  busy: boolean;
  // Reidratação do boot já terminou (sem ela, "sem engine" pode ser só "ainda não reidratou").
  rehydrated: boolean;
  // "Gerar QR" pedido por este link há menos de CONNECT_LINK_RECENT_NEW_QR_MS.
  recentNewQr: boolean;
}

const QR_DATA_URL_RE = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/;

export function isQrDataUrl(value: string | null | undefined): value is string {
  return typeof value === 'string' && QR_DATA_URL_RE.test(value);
}

const RESTING: readonly SessionStatus[] = ['STOPPED', 'DEGRADED'];
const IN_FLIGHT: readonly SessionStatus[] = [
  'STARTING',
  'SCAN_QR_CODE',
  'PAIRING_CODE',
];

// Fase da página pública. Só `IDLE` permite pedir QR pelo link.
export function publicPhase(p: PhaseInput): PublicConnectPhase {
  if (p.engine !== 'BAILEYS') return 'UNAVAILABLE';
  if (p.live === 'SCAN_QR_CODE' && isQrDataUrl(p.liveQr) && !p.paired) {
    return 'QR';
  }
  if (p.live === 'PAIRING_CODE') return 'PAIRING';
  if (p.busy) return 'PREPARING';
  if (p.recentNewQr && p.live !== 'SCAN_QR_CODE') return 'PREPARING';
  if (p.dbStatus === 'FAILED' || p.live === 'FAILED') return 'UNAVAILABLE';
  const liveResting = p.live === null || RESTING.includes(p.live);
  // Status "em andamento" no banco sem engine neste processo depois da reidratação = sobra de um
  // processo anterior (sessão sem autostart num restart/deploy): nada vai mudar sozinho.
  const staleInFlight =
    p.live === null && p.rehydrated && IN_FLIGHT.includes(p.dbStatus);
  if (p.paired) {
    // Login salvo parado (ou sobra de processo anterior) = queda → o operador usa Reiniciar (o link
    // nunca apaga credencial válida). Login salvo com engine em movimento = leitura finalizando.
    return (RESTING.includes(p.dbStatus) && liveResting) || staleInFlight
      ? 'UNAVAILABLE'
      : 'PREPARING';
  }
  // Baileys só persiste DEGRADED quando para de tentar (5 reconexões ou sequência de 515).
  if (liveResting && RESTING.includes(p.dbStatus)) return 'IDLE';
  if (staleInFlight) return 'IDLE';
  // Backoff entre ciclos (vivo DEGRADED com banco SCAN/STARTING), engine recém-criada ainda em
  // STOPPED, STARTING vivo.
  return 'PREPARING';
}

// Dígitos do número de um JID de telefone: `5511988887777:12@s.whatsapp.net` → `5511988887777`.
// `@lid` não é telefone → null.
export function phoneDigitsFromJid(
  jid: string | null | undefined,
): string | null {
  if (!jid) return null;
  const [user, domain] = jid.split('@');
  if (domain && domain !== 's.whatsapp.net' && domain !== 'c.us') return null;
  const digits = (user ?? '').replace(/:\d+$/, '').replace(/\D/g, '');
  return digits || null;
}

// Formas do mesmo número brasileiro com e sem o 9º dígito (contas antigas conectam sem o 9).
function brVariants(digits: string): string[] {
  const out = [digits];
  // Só celular (8 dígitos começando em 6–9 depois do 9): um fixo 55+DDD+3xxx não vira "9+fixo".
  const with9 = /^55(\d{2})9([6-9]\d{7})$/.exec(digits);
  if (with9) out.push(`55${with9[1]}${with9[2]}`);
  const without9 = /^55(\d{2})([6-9]\d{7})$/.exec(digits);
  if (without9) out.push(`55${without9[1]}9${without9[2]}`);
  return out;
}

// O número conectado (meJid) é o esperado? Comparação exata de dígitos, tolerando o 9º dígito BR.
// Sem meJid ou meJid @lid → false (falha fechada: quem chama desfaz a conexão).
export function phoneMatches(expected: string, meJid: string | null): boolean {
  const got = phoneDigitsFromJid(meJid);
  const want = expected.replace(/\D/g, '');
  if (!got || !want) return false;
  const wants = brVariants(want);
  return brVariants(got).some((g) => wants.includes(g));
}

// Dica para a página pública: só os 2 últimos dígitos do número esperado.
export function phoneHint(expected: string | null): string | null {
  const d = expected?.replace(/\D/g, '') ?? '';
  return d.length >= 2 ? d.slice(-2) : null;
}

// Normaliza o número esperado vindo do painel: só dígitos, 10..15 (DDI+DDD+número). Vazio = null.
// Número brasileiro SEM o DDI 55 (DDD + fixo/celular): nunca casaria com o meJid (que sempre traz
// o DDI) e desfaria a conexão da pessoa certa como "número errado".
const BR_NATIONAL_RE = /^[1-9]{2}(9[6-9]\d{7}|[2-9]\d{7})$/;

// Só 10–11 dígitos: número BR COM o 55 sempre tem 12–13, então "55…" com 10–11 é o DDD 55 (RS)
// sem DDI, não um número com DDI.
export function looksLikeBrNational(digits: string): boolean {
  return BR_NATIONAL_RE.test(digits);
}

// Texto sem nenhum dígito ("abc") é inválido — virar null aceitaria QUALQUER número (falha aberta).
// 'no-ddi' = parece número brasileiro sem o 55 (limite conhecido: número estrangeiro de 10–11
// dígitos que calhe no mesmo formato, ex.: Singapura, também é recusado).
export function normalizeExpectedPhone(
  raw: string | null | undefined,
): string | null | 'invalid' | 'no-ddi' {
  if (raw == null || !raw.trim()) return null;
  const d = raw.replace(/\D/g, '');
  if (d.length < 10 || d.length > 15) return 'invalid';
  return looksLikeBrNational(d) ? 'no-ddi' : d;
}
