import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Proxy, ProxyAssignment } from '../domain/proxy.entity';
import {
  PROXY_REPOSITORY,
  type ProxyRepository,
} from '../domain/proxy.repository';
import type {
  ProxyMode,
  ProxyProtocol,
  ProxyStrategy,
} from '../domain/proxy-types';
import { ProxyHealthTester } from '../infrastructure/proxy-health-tester';
import { WebshareClient } from '../infrastructure/webshare.client';

export interface CreateProxyData {
  label: string | null;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
}

export interface TestResult {
  id: string;
  status: 'ALIVE' | 'DEAD';
  latencyMs: number | null;
  exitIp: string | null;
  // Motivo quando DEAD (ex.: PROXY_AUTH = credencial recusada com 407) — ajuda a diferenciar
  // "proxy fora do ar" de "senha errada" sem precisar olhar o log do Chromium.
  reason: string | null;
}

export interface SetAssignmentData {
  mode: ProxyMode;
  rangeStart: number | null;
  rangeEnd: number | null;
  strategy: ProxyStrategy;
  proxyId: string | null;
}

// Executa `tasks` com no máximo `limit` em paralelo (evita abrir centenas de sockets ao testar o pool inteiro).
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (x: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const i = cursor++;
        out[i] = await fn(items[i]);
      }
    },
  );
  await Promise.all(workers);
  return out;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    @Inject(PROXY_REPOSITORY) private readonly repo: ProxyRepository,
    private readonly tester: ProxyHealthTester,
    private readonly webshare: WebshareClient,
  ) {}

  list(): Promise<Proxy[]> {
    return this.repo.list();
  }

  async create(data: CreateProxyData): Promise<Proxy> {
    const position = await this.repo.nextPosition();
    return this.repo.create({
      position,
      label: data.label,
      protocol: data.protocol,
      host: data.host,
      port: data.port,
      username: data.username,
      password: data.password,
      source: 'MANUAL',
      webshareId: null,
      country: null,
    });
  }

  // Importa várias linhas: `host:port`, `host:port:user:pass` ou `user:pass@host:port`.
  async bulkImport(
    text: string,
    protocol: ProxyProtocol,
  ): Promise<{ created: number; failed: number; errors: string[] }> {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    let base = await this.repo.nextPosition();
    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const line of lines) {
      const parsed = parseProxyLine(line);
      if (!parsed) {
        failed++;
        errors.push(`Linha inválida: ${line}`);
        continue;
      }
      try {
        await this.repo.create({
          position: base++,
          label: null,
          protocol,
          host: parsed.host,
          port: parsed.port,
          username: parsed.username,
          password: parsed.password,
          source: 'MANUAL',
          webshareId: null,
          country: null,
        });
        created++;
      } catch (e) {
        failed++;
        errors.push(`${line}: ${(e as Error).message}`);
      }
    }

    return { created, failed, errors };
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    await this.repo.setEnabled(id, enabled);
  }

  async test(id: string): Promise<TestResult> {
    const proxy = await this.repo.findById(id);
    if (!proxy) {
      throw new Error('Proxy não encontrado');
    }
    const r = await this.tester.test(proxy);
    await this.repo.updateTest(id, r);
    if (r.status === 'DEAD') {
      this.logger.warn(
        `Proxy ${proxy.host}:${proxy.port} DEAD no teste (${r.reason ?? 'sem motivo'})`,
      );
    }
    return { id, ...r };
  }

  async testAll(): Promise<TestResult[]> {
    const proxies = await this.repo.list();
    return mapLimit(proxies, 8, (p) => this.test(p.id));
  }

  getAssignment(sessionId: string): Promise<ProxyAssignment | null> {
    return this.repo.getAssignment(sessionId);
  }

  async setAssignment(
    sessionId: string,
    data: SetAssignmentData,
  ): Promise<ProxyAssignment> {
    const assignment = await this.repo.setAssignment({
      sessionId,
      mode: data.mode,
      rangeStart: data.rangeStart,
      rangeEnd: data.rangeEnd,
      strategy: data.strategy,
    });
    // No modo SINGLE o proxy é fixo (currentProxyId). Nos demais o resolver define em runtime.
    if (data.mode === 'SINGLE') {
      await this.repo.setCurrent(sessionId, data.proxyId);
      assignment.currentProxyId = data.proxyId;
    } else if (data.mode === 'NONE') {
      await this.repo.setCurrent(sessionId, null);
      assignment.currentProxyId = null;
    }
    return assignment;
  }

  webshareConfigured(): boolean {
    return this.webshare.isConfigured();
  }

  // Sincroniza o pool com a conta Webshare: cria novos (posição estável) e atualiza conexão dos existentes (§7.6).
  async syncWebshare(): Promise<{
    configured: boolean;
    created: number;
    updated: number;
    total: number;
  }> {
    if (!this.webshare.isConfigured()) {
      return { configured: false, created: 0, updated: 0, total: 0 };
    }

    const remote = await this.webshare.fetchAll();
    let created = 0;
    let updated = 0;
    let base = await this.repo.nextPosition();

    for (const p of remote) {
      const existing = await this.repo.findByWebshareId(p.id);
      if (existing) {
        await this.repo.updateConnection(existing.id, {
          host: p.proxy_address,
          port: p.port,
          username: p.username,
          password: p.password,
          country: p.country_code,
        });
        updated++;
      } else {
        await this.repo.create({
          position: base++,
          label: p.city_name
            ? `Webshare ${p.country_code} · ${p.city_name}`
            : `Webshare ${p.id}`,
          protocol: 'HTTP',
          host: p.proxy_address,
          port: p.port,
          username: p.username,
          password: p.password,
          source: 'WEBSHARE',
          webshareId: p.id,
          country: p.country_code,
        });
        created++;
      }
    }

    this.logger.log(
      `Webshare sync: ${created} criados, ${updated} atualizados (${remote.length} remotos)`,
    );
    return { configured: true, created, updated, total: remote.length };
  }
}

function parseProxyLine(line: string): {
  host: string;
  port: number;
  username: string | null;
  password: string | null;
} | null {
  let host: string;
  let portStr: string;
  let username: string | null = null;
  let password: string | null = null;

  if (line.includes('@')) {
    const [creds, hostPort] = line.split('@');
    const [u, p] = creds.split(':');
    const [h, pt] = hostPort.split(':');
    username = u ?? null;
    password = p ?? null;
    host = h;
    portStr = pt;
  } else {
    const parts = line.split(':');
    if (parts.length === 2) {
      [host, portStr] = parts;
    } else if (parts.length === 4) {
      [host, portStr, username, password] = parts;
    } else {
      return null;
    }
  }

  const port = Number(portStr);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }
  return { host, port, username: username || null, password: password || null };
}
