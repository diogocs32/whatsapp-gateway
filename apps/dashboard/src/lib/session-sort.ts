// E30b (P-111) — ordenação da tabela de Sessões pelo cabeçalho (Nome, Status, Número, Engine).
// Puro (sem React/DOM) → testável em vitest `environment: 'node'`. Ordena no painel a lista que o
// filtro P-089 já deixou passar; nenhuma rota nova (R0). Ciclo por clique na MESMA coluna:
// crescente → decrescente → ordem original (a do gateway: criação). Guardada na URL
// (?ordem=&direcao=) como o filtro, para sobreviver ao recarregar e poder ser compartilhada.
import type { SessionDto } from '@contracts';
import { numberFromJid } from './jid';

export type SessionSortKey = 'name' | 'status' | 'number' | 'engine';
export type SessionSortDirection = 'asc' | 'desc';
export interface SessionSort {
  key: SessionSortKey;
  direction: SessionSortDirection;
}

// Nomes na URL em pt-BR (como ?nome=&status=&numero= do filtro).
const PARAM = { key: 'ordem', direction: 'direcao' } as const;
const KEY_PARAM: Record<SessionSortKey, string> = {
  name: 'nome',
  status: 'status',
  number: 'numero',
  engine: 'engine',
};
const PARAM_KEY: Record<string, SessionSortKey> = {
  nome: 'name',
  status: 'status',
  numero: 'number',
  engine: 'engine',
};

export function parseSessionSort(params: URLSearchParams): SessionSort | null {
  const key = PARAM_KEY[params.get(PARAM.key) ?? ''];
  // Coluna desconhecida (digitada à mão) = sem ordenação; direção desconhecida = crescente.
  if (!key) return null;
  return {
    key,
    direction: params.get(PARAM.direction) === 'desc' ? 'desc' : 'asc',
  };
}

// Parâmetros da URL com a ordenação aplicada, preservando os que não são dela (os do filtro).
export function sessionSortToParams(
  sort: SessionSort | null,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const next = new URLSearchParams(base);
  if (sort) {
    next.set(PARAM.key, KEY_PARAM[sort.key]);
    next.set(PARAM.direction, sort.direction);
  } else {
    next.delete(PARAM.key);
    next.delete(PARAM.direction);
  }
  return next;
}

// Clique no cabeçalho: outra coluna → crescente; mesma coluna crescente → decrescente;
// decrescente → volta à ordem original.
export function nextSessionSort(
  current: SessionSort | null,
  key: SessionSortKey,
): SessionSort | null {
  if (!current || current.key !== key) return { key, direction: 'asc' };
  if (current.direction === 'asc') return { key, direction: 'desc' };
  return null;
}

// pt-BR, sem diferenciar caixa nem acento, números como números ("contato-9" antes de
// "contato-10"; "551199…" numérico).
const collator = new Intl.Collator('pt-BR', {
  sensitivity: 'base',
  numeric: true,
});

// O número que a coluna mostra: o conectado (`meJid`), senão o último conectado (`lastMeJid`,
// E27); '' = a coluna mostra "—". Só dígitos.
export function sessionNumberKey(
  s: Pick<SessionDto, 'meJid' | 'lastMeJid'>,
): string {
  const jid = s.meJid || s.lastMeJid;
  return jid ? numberFromJid(jid).replace(/\D/g, '') : '';
}

export interface SessionSortLabels {
  // Rótulo exibido do status (STATUS_META em routes/Sessions.tsx): ordena pelo que se vê.
  statusLabel: (status: SessionDto['status']) => string;
}

export function sortSessions(
  list: readonly SessionDto[],
  sort: SessionSort | null,
  labels: SessionSortLabels,
): SessionDto[] {
  if (!sort) return [...list];
  const keyOf = (s: SessionDto): string => {
    switch (sort.key) {
      case 'name':
        return s.name;
      case 'status':
        return labels.statusLabel(s.status);
      case 'number':
        return sessionNumberKey(s);
      case 'engine':
        return s.engine;
    }
  };
  const dir = sort.direction === 'asc' ? 1 : -1;
  // Índice original desempata (regra explícita, além de `sort` ser estável); sessão sem número fica
  // SEMPRE no fim, nos dois sentidos — o "—" não é o menor nem o maior número.
  return list
    .map((s, i) => ({ s, i, k: keyOf(s) }))
    .sort((a, b) => {
      if (a.k === '' || b.k === '') {
        if (a.k === b.k) return a.i - b.i;
        return a.k === '' ? 1 : -1;
      }
      return dir * collator.compare(a.k, b.k) || a.i - b.i;
    })
    .map((x) => x.s);
}
