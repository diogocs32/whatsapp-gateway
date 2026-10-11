import type { Proxy, ProxyAssignment } from './proxy.entity';
import type { Prisma } from '../../../infra/prisma/prisma.service';
import type { ReleasedAssignment } from './proxy-suggestion';
import type { ProxyUsageSession } from './proxy-usage';
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

export interface DeletedProxy {
  id: string;
  position: number;
  // Sessões vivas que usavam o proxy, lidas sob o lock da exclusão (para o aviso no log).
  sessions: ProxyUsageSession[];
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
  currentProxyId?: string | null;
  // E28 (D-051): SINGLE aceita proxy já usado por outra sessão viva (escolha explícita do dono).
  // Ausente/false = exclusividade D-008/D-041. Não dispensa existir/habilitado/não-DEAD.
  allowShared?: boolean;
}

export interface ProxyRepository {
  nextPosition(): Promise<number>;
  create(input: CreateProxyInput): Promise<Proxy>;
  findByWebshareId(webshareId: string): Promise<Proxy | null>;
  updateConnection(id: string, input: UpdateConnectionInput): Promise<void>;
  list(): Promise<Proxy[]>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<Proxy | null>;
  listInRange(start: number, end: number): Promise<Proxy[]>;
  listEnabledAlive(): Promise<Proxy[]>;
  updateTest(
    id: string,
    r: { status: ProxyStatus; latencyMs: number | null; exitIp: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  delete(id: string): Promise<void>;
  // E28 (P-107): apaga, sob lock das linhas, os proxies da lista que existem; devolve os apagados
  // (id, posição e quem os usava, em ordem de posição). Ids inexistentes são ignorados.
  deleteMany(ids: readonly string[]): Promise<DeletedProxy[]>;

  getAssignment(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ProxyAssignment | null>;
  // Compatibilidade: nome vivo resolve para id; referência ausente continua aceita (P-097).
  resolveSessionId(reference: string): Promise<string>;
  setAssignment(input: SetAssignmentInput): Promise<ProxyAssignment>;
  setCurrent(sessionId: string, proxyId: string | null): Promise<void>;
  setCurrentIfUnchanged(
    expected: ProxyAssignment,
    proxyId: string,
  ): Promise<boolean>;
  // Ids de proxies "em uso" = currentProxyId de assignment de sessão EXISTENTE (mode ≠ NONE).
  // session_proxy_assignments não tem FK p/ wa_sessions — assignments órfãos não contam.
  usedProxyIds(excludeSessionId?: string): Promise<string[]>;
  // Nome da sessão viva que usa o proxy (mesma régua do usedProxyIds) — ou null.
  proxyOwnerName(proxyId: string): Promise<string | null>;
  // E28 (P-107, D-051): sessões vivas que usam cada proxy (régua do domínio `proxyUsageMap`).
  proxyUsage(): Promise<Map<string, ProxyUsageSession[]>>;
  // E28: proxy do SINGLE atual da sessão VIVA (null sem atribuição SINGLE ou sessão apagada).
  // Repetir o próprio pin não é compartilhar de novo.
  liveSinglePin(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string | null>;

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
