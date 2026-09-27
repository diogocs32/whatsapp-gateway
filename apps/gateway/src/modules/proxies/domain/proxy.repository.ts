import type { Proxy, ProxyAssignment } from './proxy.entity';
import type { ReleasedAssignment } from './proxy-suggestion';
import type {
  ProxyMode,
  ProxyProtocol,
  ProxySource,
  ProxyStatus,
  ProxyStrategy,
} from './proxy-types';

export interface CreateProxyInput {
  position: number;
  label: string | null;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  source: ProxySource;
  webshareId: string | null;
  country: string | null;
}

export interface UpdateConnectionInput {
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  country: string | null;
}

export interface SetAssignmentInput {
  sessionId: string;
  mode: ProxyMode;
  rangeStart: number | null;
  rangeEnd: number | null;
  strategy: ProxyStrategy;
}

export interface ProxyRepository {
  nextPosition(): Promise<number>;
  create(input: CreateProxyInput): Promise<Proxy>;
  findByWebshareId(webshareId: string): Promise<Proxy | null>;
  updateConnection(id: string, input: UpdateConnectionInput): Promise<void>;
  list(): Promise<Proxy[]>;
  findById(id: string): Promise<Proxy | null>;
  listInRange(start: number, end: number): Promise<Proxy[]>;
  listEnabledAlive(): Promise<Proxy[]>;
  updateTest(
    id: string,
    r: { status: ProxyStatus; latencyMs: number | null; exitIp: string | null },
  ): Promise<void>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  delete(id: string): Promise<void>;

  getAssignment(sessionId: string): Promise<ProxyAssignment | null>;
  setAssignment(input: SetAssignmentInput): Promise<ProxyAssignment>;
  setCurrent(sessionId: string, proxyId: string | null): Promise<void>;
  // Ids de proxies "em uso" = currentProxyId de assignment de sessão EXISTENTE (mode ≠ NONE).
  // session_proxy_assignments não tem FK p/ wa_sessions — assignments órfãos não contam.
  usedProxyIds(): Promise<string[]>;
  // Nome da sessão viva que usa o proxy (mesma régua do usedProxyIds) — ou null.
  proxyOwnerName(proxyId: string): Promise<string | null>;

  // E26 (P-084, D-038) — carimbo da atribuição SINGLE com proxy de uma sessão já apagada.
  // Devolve quantas linhas carimbou (0 = a sessão não tinha proxy fixo).
  markReleased(
    sessionId: string,
    sessionName: string,
    at: Date,
  ): Promise<number>;
  // Carimbos com o nome igual sem diferenciar caixa (igualdade exata em minúsculas — nunca
  // padrão/ILIKE), só SINGLE com proxy e de sessões que não existem mais; mais recentes primeiro.
  findReleasedByName(name: string): Promise<ReleasedAssignment[]>;
}

export const PROXY_REPOSITORY = Symbol('PROXY_REPOSITORY');
