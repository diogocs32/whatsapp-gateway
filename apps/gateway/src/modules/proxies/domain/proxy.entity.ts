import type {
  ProxyMode,
  ProxyProtocol,
  ProxySource,
  ProxyStatus,
  ProxyStrategy,
} from './proxy-types';

export class Proxy {
  constructor(
    public readonly id: string,
    public readonly position: number,
    public label: string | null,
    public protocol: ProxyProtocol,
    public host: string,
    public port: number,
    public username: string | null,
    public password: string | null,
    public source: ProxySource,
    public country: string | null,
    public exitIp: string | null,
    public latencyMs: number | null,
    public status: ProxyStatus,
    public enabled: boolean,
  ) {}
}

export class ProxyAssignment {
  constructor(
    public readonly sessionId: string,
    public mode: ProxyMode,
    public rangeStart: number | null,
    public rangeEnd: number | null,
    public strategy: ProxyStrategy,
    public currentProxyId: string | null,
  ) {}
}
