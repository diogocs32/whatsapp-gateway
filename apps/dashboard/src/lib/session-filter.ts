// P-089 (E27) — filtro da tela de Sessões por nome, status e número. Puro (sem React/DOM) →
// testável em vitest `environment: 'node'`. Filtra no painel: o `GET /api/sessions` já devolve a
// lista inteira (poucas sessões, teto da licença) a cada 3 s — nenhuma rota nova (R0).
import type { SessionDto, SessionStatus } from '@contracts';
import { numberFromJid } from './jid';

// Ordem de exibição no seletor (mesma dos rótulos de STATUS_META em routes/Sessions.tsx).
export const SESSION_STATUSES: readonly SessionStatus[] = [
  'WORKING',
  'SCAN_QR_CODE',
  'PAIRING_CODE',
  'STARTING',
  'STOPPED',
  'FAILED',
  'DEGRADED',
];

// '' = todos; 'DISCONNECTED' = tudo que não está WORKING (as que caíram e precisam de atenção).
export type SessionStatusFilter = '' | 'DISCONNECTED' | SessionStatus;

export interface SessionFilter {
  name: string;
  status: SessionStatusFilter;
  number: string;
}

export const EMPTY_SESSION_FILTER: SessionFilter = {
  name: '',
  status: '',
  number: '',
};

// Nomes na URL em pt-BR (o dono compartilha/recarrega a tela filtrada): ?nome=&status=&numero=
const PARAM = { name: 'nome', status: 'status', number: 'numero' } as const;

function isStatusFilter(v: string): v is SessionStatusFilter {
  return (
    v === '' ||
    v === 'DISCONNECTED' ||
    (SESSION_STATUSES as readonly string[]).includes(v)
  );
}

export function parseSessionFilter(params: URLSearchParams): SessionFilter {
  const status = params.get(PARAM.status) ?? '';
  return {
    name: params.get(PARAM.name) ?? '',
    // Valor desconhecido na URL (digitado à mão, status que deixou de existir) = sem filtro.
    status: isStatusFilter(status) ? status : '',
    number: params.get(PARAM.number) ?? '',
  };
}

// Devolve os parâmetros da URL com o filtro aplicado, preservando os que não são do filtro;
// campo vazio sai da URL (link limpo quando nada está filtrado).
export function sessionFilterToParams(
  filter: SessionFilter,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const next = new URLSearchParams(base);
  const set = (key: string, value: string) => {
    if (value.trim()) next.set(key, value);
    else next.delete(key);
  };
  set(PARAM.name, filter.name);
  set(PARAM.status, filter.status);
  set(PARAM.number, filter.number);
  return next;
}

export function isSessionFilterActive(filter: SessionFilter): boolean {
  return Boolean(
    filter.name.trim() || filter.status || digitsOf(filter.number),
  );
}

// Minúsculas e sem acento: "Sessão" casa com "sessao".
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function digitsOf(text: string): string {
  return text.replace(/\D/g, '');
}

// Formas do mesmo número brasileiro com e sem o 9º dígito: o `meJid` de contas antigas pode vir
// sem o 9 (`551199998888`) enquanto o dono digita o número atual (`11 99999-8888`), e vice-versa.
function numberVariants(digits: string): string[] {
  const variants = [digits];
  const with9 = /^55(\d{2})9(\d{8})$/.exec(digits);
  if (with9) variants.push(`55${with9[1]}${with9[2]}`);
  const without9 = /^55(\d{2})([6-9]\d{7})$/.exec(digits);
  if (without9) variants.push(`55${without9[1]}9${without9[2]}`);
  return variants;
}

// Números da sessão: o conectado (`meJid`, sem domínio/aparelho), o último conectado (`lastMeJid`,
// E27 — sobrevive ao 401 que zera o meJid: acha a sessão caída pelo número) e o informado na
// criação (`phoneNumber`, modo pairing). Só dígitos; LID não é telefone.
function sessionNumbers(s: SessionDto): string[] {
  const out: string[] = [];
  for (const jid of [s.meJid, s.lastMeJid]) {
    if (!jid || jid.endsWith('@lid')) continue;
    const d = digitsOf(numberFromJid(jid));
    if (d) out.push(...numberVariants(d));
  }
  if (s.phoneNumber) {
    const d = digitsOf(s.phoneNumber);
    if (d) out.push(...numberVariants(d));
  }
  return out;
}

export function matchesSessionFilter(
  s: SessionDto,
  filter: SessionFilter,
): boolean {
  const name = fold(filter.name);
  if (name && !fold(s.name).includes(name)) return false;

  if (filter.status === 'DISCONNECTED') {
    if (s.status === 'WORKING') return false;
  } else if (filter.status && s.status !== filter.status) {
    return false;
  }

  // "+55 (11) 9…" vira só dígitos; texto sem dígito no campo de número não filtra nada.
  const number = digitsOf(filter.number);
  if (number && !sessionNumbers(s).some((n) => n.includes(number))) {
    return false;
  }
  return true;
}

export function filterSessions(
  sessions: readonly SessionDto[],
  filter: SessionFilter,
): SessionDto[] {
  if (!isSessionFilterActive(filter)) return [...sessions];
  return sessions.filter((s) => matchesSessionFilter(s, filter));
}
