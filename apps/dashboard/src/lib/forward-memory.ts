// Memória dos diálogos de encaminhar (E25 · D-031) — o que um diálogo fechado sem terminar precisa
// devolver ao próximo diálogo da MESMA mensagem: quem já recebeu / pode ter recebido (travas), a
// chave e o conjunto do último pedido (repetir igual = replay no gateway) e se ele ficou congelado.
// Sem isto, trocar de conversa, de tela, recarregar ou perder o login e voltar geraria chave nova e
// reenviaria para quem já recebeu (achado da 2ª revisão da E25).
//
// Guardada por ABA (`sessionStorage`): sobrevive a troca de rota, recarga e ao login expirado (o
// painel volta para /login na mesma aba); outra aba não enxerga. Vale por 24 h e no máximo 50
// mensagens (o que passar disso cai pelo mais antigo). Sem storage (modo privado, cota), fica só na
// memória do módulo. Pura: storage e relógio injetados → vitest em node.
import type { ForwardAttempt, ForwardTarget, TargetOutcome } from './forward';

export type ForwardBanner = { tone: 'ok' | 'partial' | 'error'; text: string };

export interface ForwardSnapshot {
  selected: ForwardTarget[];
  outcomes: Map<string, TargetOutcome>;
  attempt: ForwardAttempt | null;
  frozen: boolean;
  refused: boolean;
  maxLive: number;
  canRetry: boolean;
  banner: ForwardBanner | null;
}

interface Stored extends Omit<ForwardSnapshot, 'outcomes'> {
  at: number;
  outcomes: [string, TargetOutcome][];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const MEMORY_KEY = 'cz:fwd-memory:v1';
export const MEMORY_TTL_MS = 24 * 60 * 60 * 1000;
export const MEMORY_MAX = 50;

export const memoryKey = (sessionId: string, msgId: string): string =>
  `${sessionId}|${msgId}`;

export interface ForwardMemory {
  get(key: string): ForwardSnapshot | null;
  set(key: string, snap: ForwardSnapshot): void;
  delete(key: string): void;
}

export function createForwardMemory(
  storage: StorageLike | null,
  now: () => number = () => Date.now(),
): ForwardMemory {
  let cache: Record<string, Stored> | null = null;

  const load = (): Record<string, Stored> => {
    if (cache) return cache;
    cache = {};
    try {
      const raw = storage?.getItem(MEMORY_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        cache = parsed as Record<string, Stored>;
      }
    } catch {
      /* corrompido ou sem acesso: começa vazio */
    }
    return cache;
  };

  const save = (all: Record<string, Stored>) => {
    const t = now();
    // Vencidos saem; acima do teto, sai o mais antigo.
    const alive = Object.entries(all)
      .filter(
        ([, v]) => v && typeof v.at === 'number' && t - v.at < MEMORY_TTL_MS,
      )
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, MEMORY_MAX);
    cache = Object.fromEntries(alive);
    try {
      storage?.setItem(MEMORY_KEY, JSON.stringify(cache));
    } catch {
      /* cota/modo privado: fica só em memória */
    }
  };

  return {
    get(key) {
      const v = load()[key];
      if (!v || typeof v.at !== 'number' || now() - v.at >= MEMORY_TTL_MS) {
        return null;
      }
      return { ...v, outcomes: new Map(v.outcomes) };
    },
    set(key, snap) {
      const all = { ...load() };
      all[key] = { ...snap, outcomes: [...snap.outcomes], at: now() };
      save(all);
    },
    delete(key) {
      const all = { ...load() };
      if (!(key in all)) return;
      delete all[key];
      save(all);
    },
  };
}

function sessionStorageOrNull(): StorageLike | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null; // acesso negado (bloqueio de dados do site)
  }
}

// A do painel (uma por aba).
export const forwardMemory: ForwardMemory = createForwardMemory(
  sessionStorageOrNull(),
);
