// E28 · P-107 · D-051 — régua pura do "proxy em uso" (sem Nest/Prisma → unit). É a mesma do
// `usedProxyIds` (D-008): o `currentProxyId` de uma atribuição `mode ≠ NONE` de sessão VIVA. Linha
// órfã (sessão apagada — inclusive a memória E26/D-038) não segura proxy. Em RANGE/GLOBAL o
// `currentProxyId` é a afinidade atual da conta (D-041): a sessão sai por ele, então conta.
import type { ProxyMode } from './proxy-types';

export interface UsageAssignment {
  sessionId: string;
  mode: ProxyMode;
  currentProxyId: string | null;
}

export interface ProxyUsageSession {
  id: string;
  name: string;
}

// Nomes são ASCII ([a-zA-Z0-9_-]): ordem sem diferenciar caixa e sem depender do locale do
// processo; empate de caixa ("Vendas" × "vendas") pela comparação exata.
function byName(a: ProxyUsageSession, b: ProxyUsageSession): number {
  const x = a.name.toLowerCase();
  const y = b.name.toLowerCase();
  if (x !== y) return x < y ? -1 : 1;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Sessões vivas que usam cada proxy (chave = id do proxy), em ordem de nome. Proxy sem uso não
// aparece no mapa.
export function proxyUsageMap(
  assignments: readonly UsageAssignment[],
  liveSessions: readonly ProxyUsageSession[],
): Map<string, ProxyUsageSession[]> {
  const live = new Map(liveSessions.map((s) => [s.id, s]));
  const out = new Map<string, ProxyUsageSession[]>();
  for (const a of assignments) {
    if (a.mode === 'NONE' || !a.currentProxyId) continue;
    const session = live.get(a.sessionId);
    if (!session) continue;
    const entry = { id: session.id, name: session.name };
    const list = out.get(a.currentProxyId);
    if (list) list.push(entry);
    else out.set(a.currentProxyId, [entry]);
  }
  for (const list of out.values()) list.sort(byName);
  return out;
}
