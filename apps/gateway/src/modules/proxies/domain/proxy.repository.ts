import type { Proxy, ProxyAssignment } from './proxy.entity';
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
}

export const PROXY_REPOSITORY = Symbol('PROXY_REPOSITORY');
