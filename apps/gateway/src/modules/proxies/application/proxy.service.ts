import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import type { Proxy, ProxyAssignment } from '../domain/proxy.entity';
import {
  pickReleased,
  suggestionAvailability,
  type ProxySuggestionReason,
} from '../domain/proxy-suggestion';
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
import { ProxyUnavailableError } from './proxy-unavailable.error';

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

// E26 (P-084): o proxy que a sessão apagada com esse nome usava, e se ainda dá para escolher.
export interface ProxySuggestion {
  proxy: Proxy | null; // null só com reason REMOVED (proxy excluído do pool)
  fromSession: string; // nome como a sessão foi apagada
  releasedAt: Date;
  available: boolean;
  reason: ProxySuggestionReason | null;
  inUseBySession: string | null;
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
export class ProxyService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    @Inject(PROXY_REPOSITORY) private readonly repo: ProxyRepository,
    private readonly tester: ProxyHealthTester,
    private readonly webshare: WebshareClient,
  ) {}

  // Item 9 (auditoria 07/2026) — re-teste periódico do pool: revive proxies marcados DEAD que
  // voltaram a funcionar (inclusive falso-positivos do fallback em uso real) e derruba os que
  // morreram desde o último teste. Sem isto, DEAD é para sempre até alguém clicar "Testar todos".
  // Desligado nos e2e (NODE_ENV=test) e com PROXY_RETEST_INTERVAL_MIN=0.
  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === 'test') return;
    const minutes = Number(process.env.PROXY_RETEST_INTERVAL_MIN ?? 30);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const timer = setInterval(
      () =>
        void this.testAll().catch((e) =>
          this.logger.error(
            `re-teste periódico falhou: ${(e as Error).message}`,
          ),
        ),
      minutes * 60_000,
    );
    timer.unref(); // não segura o shutdown do processo
    this.logger.log(`Re-teste periódico de proxies a cada ${minutes} min`);
  }

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
      // Item 11 — username sem password conectaria SEM auth e daria 407 "inexplicável" em uso.
      if (parsed.username && !parsed.password) {
        failed++;
        errors.push(`Linha com username sem password: ${line}`);
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

  resolveSessionId(reference: string): Promise<string> {
    return this.repo.resolveSessionId(reference);
  }

  // Proxies LIVRES p/ a criação de sessão (backlog 10/07, D-008): enabled, não-DEAD e que não são
  // o proxy atual de nenhuma sessão existente. Exclusividade vale p/ o fluxo SINGLE — modos
  // RANGE/GLOBAL_ROUND_ROBIN podem usar qualquer proxy em runtime (limitação consciente, D-008).
  async listAvailable(): Promise<Proxy[]> {
    const [all, used] = await Promise.all([
      this.repo.list(),
      this.repo.usedProxyIds(),
    ]);
    const usedSet = new Set(used);
    return all.filter(
      (p) => p.enabled && p.status !== 'DEAD' && !usedSet.has(p.id),
    );
  }

  // Valida que o proxy pode ser atribuído com exclusividade. Lança Error com mensagem clara —
  // o controller que chamar mapeia para o HTTP adequado.
  async ensureAvailable(
    proxyId: string,
    ownSessionId?: string,
  ): Promise<Proxy> {
    const proxy = await this.repo.findById(proxyId);
    if (!proxy) throw new ProxyUnavailableError('Proxy não encontrado');
    if (!proxy.enabled)
      throw new ProxyUnavailableError('Proxy está desabilitado');
    if (proxy.status === 'DEAD')
      throw new ProxyUnavailableError(
        'Proxy está DEAD — teste-o ou escolha outro',
      );
    const used = new Set(await this.repo.usedProxyIds(ownSessionId));
    if (used.has(proxyId))
      throw new ProxyUnavailableError('Proxy já está em uso por outra sessão');
    return proxy;
  }

  // Revalida antes de gravar; o repositório repete a validação sob lock para SINGLE.
  // RANGE/GLOBAL continuam podendo compartilhar o pool (D-008).
  async assignExclusive(
    sessionId: string,
    proxyId: string,
  ): Promise<ProxyAssignment> {
    await this.ensureAvailable(proxyId);
    return this.setAssignment(sessionId, {
      mode: 'SINGLE',
      rangeStart: null,
      rangeEnd: null,
      strategy: 'STICKY',
      proxyId,
    });
  }

  async setAssignment(
    sessionId: string,
    data: SetAssignmentData,
  ): Promise<ProxyAssignment> {
    if (data.mode === 'SINGLE') {
      if (!data.proxyId)
        throw new ProxyUnavailableError('mode SINGLE exige proxyId');
      await this.ensureAvailable(data.proxyId, sessionId);
    }
    // Modo e pin mudam juntos: uma reconexão não pode ler SINGLE com o pin anterior.
    return this.repo.setAssignment({
      sessionId,
      mode: data.mode,
      rangeStart: data.rangeStart,
      rangeEnd: data.rangeEnd,
      strategy: data.strategy,
      ...(data.mode === 'SINGLE'
        ? { currentProxyId: data.proxyId }
        : data.mode === 'NONE'
          ? { currentProxyId: null }
          : {}),
    });
  }

  // E26 (P-084, D-038): chamado DEPOIS de apagar a sessão (a linha de atribuição não tem FK e
  // sobrevive). Nunca lança — a exclusão já aconteceu; sem o carimbo só se perde a sugestão.
  async markReleased(sessionId: string, sessionName: string): Promise<void> {
    try {
      const n = await this.repo.markReleased(
        sessionId,
        sessionName,
        new Date(),
      );
      if (n > 0) {
        this.logger.log(
          `Proxy da sessão apagada "${sessionName}" guardado para sugerir ao recriar`,
        );
      }
    } catch (e) {
      const err = e as Error;
      this.logger.error(
        `não guardei o proxy da sessão apagada ${sessionId}: ${err.message}`,
        err.stack,
      );
    }
  }

  async suggestionFor(sessionName: string): Promise<ProxySuggestion | null> {
    const row = pickReleased(
      await this.repo.findReleasedByName(sessionName),
      sessionName,
    );
    if (!row?.currentProxyId) return null;
    const proxy = await this.repo.findById(row.currentProxyId);
    const owner = proxy ? await this.repo.proxyOwnerName(proxy.id) : null;
    const a = suggestionAvailability(proxy, owner !== null);
    return {
      proxy,
      fromSession: row.releasedSessionName,
      releasedAt: row.releasedAt,
      available: a.available,
      reason: a.reason,
      // Só com IN_USE (contrato): com o proxy excluído não há dono.
      inUseBySession: a.reason === 'IN_USE' ? owner : null,
    };
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
