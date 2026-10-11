// E28 · P-107 · D-051 — uso dos proxies no painel: verde = livre, vermelho = já em uso por outra
// sessão (com quantas e quais), consentimento de compartilhar, seleção para excluir em lote, o
// resumo da confirmação e o movimento do destaque no seletor (as teclas em `combobox-keys.ts`).
// Puro (sem React/DOM) → testável em vitest `environment: 'node'`.
//
// "Em uso" vem pronto do gateway (`GET /api/proxies` → `sessions`): `currentProxyId` de atribuição
// mode ≠ NONE de sessão viva (D-008); em faixa/global conta a afinidade atual (D-041).
import type {
  BulkDeleteProxiesResult,
  ProxyDto,
  ProxyListItemDto,
} from '@contracts';

// 'unknown' = gateway anterior à E28 (sem `sessions` no item): não dá para afirmar "livre".
export type ProxyUsageTone = 'free' | 'used' | 'unknown';

export interface ProxyUsageView {
  tone: ProxyUsageTone;
  // Nomes das sessões que usam o proxy, tirando a própria (quando o seletor é de uma sessão).
  others: string[];
  // A própria sessão (contexto de edição) já sai por este proxy.
  ownUses: boolean;
  text: string; // "livre" · "só esta sessão" · "em uso por 2 sessões" · "em uso por 1 outra sessão"
  title: string; // dica com os nomes
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

// Gateway anterior à E28 (painel publicado antes dele, ou gateway que voltou de versão) não manda
// `sessions`: a tela não quebra, mas também não afirma "livre" — mostra "uso indisponível".
export function hasUsageInfo(p: Pick<ProxyListItemDto, 'sessions'>): boolean {
  return Array.isArray(p.sessions);
}

const sessionsOf = (p: Pick<ProxyListItemDto, 'sessions'>) =>
  hasUsageInfo(p) ? p.sessions : [];

// Verde/vermelho de um proxy. Sem `ownSessionId` (criação): conta todas as sessões. Com ele (sessão
// já criada): a própria não conta como "outra" — o proxy só fica vermelho se OUTRA sessão o usa.
export function proxyUsageView(
  p: Pick<ProxyListItemDto, 'sessions'>,
  ownSessionId?: string,
): ProxyUsageView {
  if (!hasUsageInfo(p)) {
    return {
      tone: 'unknown',
      others: [],
      ownUses: false,
      text: 'uso indisponível',
      title:
        'O gateway não informou quem usa este proxy (versão anterior à E28) — publique o gateway antes do painel',
    };
  }
  const sessions = sessionsOf(p);
  const ownUses =
    ownSessionId !== undefined && sessions.some((s) => s.id === ownSessionId);
  const others = sessions
    .filter((s) => s.id !== ownSessionId)
    .map((s) => s.name);
  if (others.length === 0) {
    return ownUses
      ? {
          tone: 'free',
          others,
          ownUses,
          text: 'só esta sessão',
          title: 'Só esta sessão usa este proxy',
        }
      : {
          tone: 'free',
          others,
          ownUses,
          text: 'livre',
          title: 'Livre — nenhuma sessão usa este proxy',
        };
  }
  const text =
    ownSessionId !== undefined
      ? `em uso por ${plural(others.length, 'outra sessão', 'outras sessões')}`
      : `em uso por ${plural(others.length, 'sessão', 'sessões')}`;
  return {
    tone: 'used',
    others,
    ownUses,
    text,
    title: `Em uso por: ${others.join(', ')}${ownUses ? ' (e esta sessão)' : ''}`,
  };
}

// O que o gateway aceita num proxy fixo (com ou sem compartilhar): habilitado e não-DEAD.
export function isSelectableProxy(
  p: Pick<ProxyDto, 'enabled' | 'status'>,
): boolean {
  return p.enabled && p.status !== 'DEAD';
}

// Motivo de um proxy não poder ser escolhido (para o valor atual que ficou inválido).
export function unavailableText(
  p: Pick<ProxyDto, 'enabled' | 'status'>,
): string | null {
  if (!p.enabled) return 'desativado';
  if (p.status === 'DEAD') return 'fora do ar (DEAD)';
  return null;
}

// "#3 · BR-01 · BR · ALIVE" (rótulo ou host:porta) — o formato da lista da criação (E26).
export function proxyOptionLabel(
  p: Pick<
    ProxyDto,
    'position' | 'label' | 'host' | 'port' | 'country' | 'status'
  >,
): string {
  return `#${p.position} · ${p.label ?? `${p.host}:${p.port}`}${
    p.country ? ` · ${p.country}` : ''
  } · ${p.status}`;
}

// O proxy está vermelho (em uso por OUTRA sessão) para quem escolhe?
export function needsShareConsent(
  p: Pick<ProxyListItemDto, 'sessions'> | undefined,
  ownSessionId?: string,
): boolean {
  return !!p && proxyUsageView(p, ownSessionId).tone === 'used';
}

// Consentimento de compartilhar = o DONO escolheu na lista um proxy que estava vermelho NAQUELA hora
// (registrado no clique da opção). Pré-seleção da sugestão (E26), "Usar este proxy", valor herdado
// da atribuição salva e um verde que virou vermelho depois da escolha (outra sessão entrou, a lista
// recarregou) NUNCA contam: o envio vai sem `allowSharedProxy` e o gateway responde 400 "em uso".
export interface ShareConsent {
  id: string;
  red: boolean;
}

export function consentFromPick(
  id: string,
  tone: string | undefined,
): ShareConsent | null {
  return id ? { id, red: tone === 'used' } : null;
}

export function shareFromConsent(
  proxyId: string,
  consent: ShareConsent | null,
): boolean {
  return !!proxyId && consent?.id === proxyId && consent.red;
}

// Mensagem do 400 "em uso" com a dica de como compartilhar de propósito.
export function inUseErrorText(message: string): string {
  return /em uso/i.test(message)
    ? `${message} — para compartilhar, escolha-o de novo na lista (em vermelho) ou escolha outro.`
    : message;
}

// Aviso abaixo do seletor quando o proxy escolhido já é de outra(s) sessão(ões). Na sessão já
// criada vale também para o compartilhamento já salvo (presente: "sai"); na criação, futuro.
export function sharedNote(
  p: Pick<ProxyListItemDto, 'sessions' | 'position' | 'label'>,
  ownSessionId?: string,
): string | null {
  const u = proxyUsageView(p, ownSessionId);
  if (u.tone !== 'used') return null;
  const who = plural(u.others.length, 'sessão', 'sessões');
  const name = p.label ? `#${p.position} · ${p.label}` : `#${p.position}`;
  return `Atenção: o ${name} também é usado por ${who} (${u.others.join(', ')}) — ${
    ownSessionId !== undefined
      ? 'esta sessão sai pelo mesmo IP'
      : 'a nova sessão vai sair pelo mesmo IP'
  }.`;
}

// ---- Seleção para excluir em lote ----

export type SelectAllState = 'none' | 'some' | 'all';

// Ids marcados que ainda existem na lista, na ordem da lista (apagado por outra aba sai sozinho).
export function visibleSelection(
  selected: ReadonlySet<string>,
  proxies: readonly Pick<ProxyDto, 'id'>[],
): string[] {
  return proxies.filter((p) => selected.has(p.id)).map((p) => p.id);
}

export function selectAllState(
  selected: ReadonlySet<string>,
  proxies: readonly Pick<ProxyDto, 'id'>[],
): SelectAllState {
  const n = visibleSelection(selected, proxies).length;
  if (n === 0) return 'none';
  return n === proxies.length ? 'all' : 'some';
}

export function toggleOne(
  selected: ReadonlySet<string>,
  id: string,
): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

// "Marcar todos": com todos marcados desmarca; senão marca todos os da lista.
export function toggleAll(
  selected: ReadonlySet<string>,
  proxies: readonly Pick<ProxyDto, 'id'>[],
): Set<string> {
  return selectAllState(selected, proxies) === 'all'
    ? new Set()
    : new Set(proxies.map((p) => p.id));
}

export interface BulkDeleteSummary {
  ids: string[];
  inUse: Array<{ id: string; label: string; sessions: string[] }>;
  sessionsAffected: string[];
  // Marcados cujo uso o gateway não informou (versão anterior à E28).
  unknownUsage: number;
}

export function bulkDeleteSummary(
  selected: ReadonlySet<string>,
  proxies: readonly ProxyListItemDto[],
): BulkDeleteSummary {
  const chosen = proxies.filter((p) => selected.has(p.id));
  const inUse = chosen
    .filter((p) => sessionsOf(p).length > 0)
    .map((p) => ({
      id: p.id,
      label: p.label ? `#${p.position} · ${p.label}` : `#${p.position}`,
      sessions: sessionsOf(p).map((s) => s.name),
    }));
  const affected = [...new Set(inUse.flatMap((x) => x.sessions))].sort(
    (a, b) => {
      const x = a.toLowerCase();
      const y = b.toLowerCase();
      return x < y ? -1 : x > y ? 1 : a < b ? -1 : a > b ? 1 : 0;
    },
  );
  return {
    ids: chosen.map((p) => p.id),
    inUse,
    sessionsAffected: affected,
    unknownUsage: chosen.filter((p) => !hasUsageInfo(p)).length,
  };
}

export function bulkDeleteQuestion(n: number): string {
  return `Excluir ${plural(n, 'proxy', 'proxies')}? Não dá para desfazer.`;
}

// O efeito de apagar proxy em uso (sem FK — E15/D-041): proxy fixo não conecta até ganhar outro;
// faixa/global escolhe outro na próxima conexão.
export function bulkDeleteWarning(s: BulkDeleteSummary): string | null {
  if (s.unknownUsage > 0 && s.inUse.length === 0) {
    return 'Não deu para conferir se algum deles está em uso (o gateway não informou). Sessão com proxy fixo num proxy apagado não conecta até você escolher outro proxy.';
  }
  if (s.inUse.length === 0) return null;
  const which = s.inUse
    .map((x) => `${x.label} (${x.sessions.join(', ')})`)
    .join('; ');
  const lead =
    s.inUse.length === 1
      ? `1 deles está em uso por ${plural(s.sessionsAffected.length, 'sessão', 'sessões')}`
      : `${s.inUse.length} deles estão em uso por ${plural(s.sessionsAffected.length, 'sessão', 'sessões')}`;
  return `${lead}: ${which}. Sessão com proxy fixo nele não conecta até você escolher outro proxy; em faixa/global, ela troca de proxy na próxima conexão.`;
}

export function bulkDeleteResultText(r: BulkDeleteProxiesResult): string {
  const done =
    r.deleted === 1 ? '1 proxy excluído' : `${r.deleted} proxies excluídos`;
  const gone = r.notFound.length;
  if (gone === 0) return done;
  return `${done} · ${gone === 1 ? '1 já não existia' : `${gone} já não existiam`}`;
}

// ---- Teclado do seletor (padrão APG "select-only combobox") ----

export type PickerMove =
  'next' | 'prev' | 'first' | 'last' | 'pageDown' | 'pageUp';

// Índice da opção que recebe o foco visual. Pula desabilitadas e não dá a volta: no fim, fica no
// fim. PageDown/PageUp saltam até 10 (ou até a ponta). `from` fora da lista (-1 = nenhuma ativa)
// vai para a primeira. Devolve -1 só quando não há opção habilitada.
export function moveActive(
  items: readonly { disabled?: boolean }[],
  from: number,
  move: PickerMove,
): number {
  const ok = (i: number) => i >= 0 && i < items.length && !items[i].disabled;
  // Primeira habilitada de `start` até `end` (inclusive), andando na direção de `end`.
  const scan = (start: number, end: number): number => {
    const dir = end >= start ? 1 : -1;
    for (let i = start; dir > 0 ? i <= end : i >= end; i += dir) {
      if (ok(i)) return i;
    }
    return -1;
  };
  const lastIdx = items.length - 1;
  const first = scan(0, lastIdx);
  if (first === -1) return -1;
  const last = scan(lastIdx, 0);
  if (move === 'first') return first;
  if (move === 'last') return last;
  if (from < 0 || from > lastIdx) return first;
  const stay = ok(from) ? from : -1;
  switch (move) {
    case 'next': {
      const i = from < lastIdx ? scan(from + 1, lastIdx) : -1;
      return i !== -1 ? i : stay !== -1 ? stay : last;
    }
    case 'prev': {
      const i = from > 0 ? scan(from - 1, 0) : -1;
      return i !== -1 ? i : stay !== -1 ? stay : first;
    }
    case 'pageDown': {
      const target = Math.min(from + 10, lastIdx);
      // a habilitada mais longe dentro do salto; senão a próxima depois dele
      const i = target > from ? scan(target, from + 1) : -1;
      if (i !== -1) return i;
      const j = target < lastIdx ? scan(target + 1, lastIdx) : -1;
      return j !== -1 ? j : stay !== -1 ? stay : last;
    }
    case 'pageUp': {
      const target = Math.max(from - 10, 0);
      const i = target < from ? scan(target, from - 1) : -1;
      if (i !== -1) return i;
      const j = target > 0 ? scan(target - 1, 0) : -1;
      return j !== -1 ? j : stay !== -1 ? stay : first;
    }
  }
}
