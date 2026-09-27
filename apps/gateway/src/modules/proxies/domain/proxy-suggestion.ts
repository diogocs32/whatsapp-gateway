// E26 · P-084 · D-038 — regras puras da sugestão de proxy ao recriar uma sessão com o nome de uma
// sessão apagada (sem Nest/Prisma → unit). A memória é o carimbo `releasedSessionName`/`releasedAt`
// gravado na atribuição SINGLE da sessão quando ela é apagada.
import type { ProxyStatus } from './proxy-types';

export type ProxySuggestionReason = 'IN_USE' | 'DEAD' | 'DISABLED' | 'REMOVED';

export interface ReleasedAssignment {
  sessionId: string;
  releasedSessionName: string;
  releasedAt: Date;
  currentProxyId: string | null;
}

// Nome de sessão igual sem diferenciar caixa (descarta qualquer linha cujo nome em minúsculas
// difere — segunda barreira além do SQL). Entre as que batem, prefere a de caixa idêntica (é "a
// mesma sessão" para o dono); dentro de cada grupo, a exclusão mais recente.
export function pickReleased(
  rows: readonly ReleasedAssignment[],
  name: string,
): ReleasedAssignment | null {
  const wanted = name.trim();
  if (!wanted) return null;
  const lower = wanted.toLowerCase();
  // Mais recente primeiro; empate no mesmo milissegundo → ULID maior (criado depois).
  const byRecent = (a: ReleasedAssignment, b: ReleasedAssignment) =>
    b.releasedAt.getTime() - a.releasedAt.getTime() ||
    (b.sessionId > a.sessionId ? 1 : b.sessionId < a.sessionId ? -1 : 0);
  const same = rows
    .filter(
      (r) => r.currentProxyId && r.releasedSessionName.toLowerCase() === lower,
    )
    .sort(byRecent);
  return same.find((r) => r.releasedSessionName === wanted) ?? same[0] ?? null;
}

// O proxy ainda pode ser escolhido na criação? Mesma régua do `ensureAvailable` (D-008): existe,
// habilitado, não-DEAD e sem outra sessão viva usando. O motivo prioriza "em uso por outra sessão"
// — é o bloqueio que o dono não resolve pela tela de Proxies (testar/habilitar não libera o proxy).
export function suggestionAvailability(
  proxy: { enabled: boolean; status: ProxyStatus } | null,
  inUse: boolean,
): { available: boolean; reason: ProxySuggestionReason | null } {
  if (!proxy) return { available: false, reason: 'REMOVED' };
  if (inUse) return { available: false, reason: 'IN_USE' };
  if (!proxy.enabled) return { available: false, reason: 'DISABLED' };
  if (proxy.status === 'DEAD') return { available: false, reason: 'DEAD' };
  return { available: true, reason: null };
}
