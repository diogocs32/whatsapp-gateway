import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Agent } from 'node:http';
import { RedisService } from '../../../infra/redis/redis.service';
import type { Proxy } from '../domain/proxy.entity';
import {
  PROXY_REPOSITORY,
  type ProxyRepository,
} from '../domain/proxy.repository';
import { buildProxyAgent } from '../infrastructure/proxy-agent.factory';

// Hash determinístico simples (FNV-1a 32-bit) — para STICKY mapear sessionId → índice estável sem Date/random.
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Resolve QUAL proxy uma sessão deve usar, segundo o assignment (mode/range/strategy). Núcleo do §7.2/§7.3.
@Injectable()
export class ProxyResolver {
  private readonly logger = new Logger(ProxyResolver.name);

  constructor(
    @Inject(PROXY_REPOSITORY) private readonly repo: ProxyRepository,
    private readonly redis: RedisService,
  ) {}

  async resolve(sessionId: string): Promise<Proxy | null> {
    const a = await this.repo.getAssignment(sessionId);
    if (!a || a.mode === 'NONE') {
      return null;
    }

    if (a.mode === 'SINGLE') {
      return a.currentProxyId ? this.repo.findById(a.currentProxyId) : null;
    }

    let candidates: Proxy[];
    let cursorKey: string;
    if (a.mode === 'GLOBAL_ROUND_ROBIN') {
      candidates = await this.repo.listEnabledAlive();
      cursorKey = 'proxy:rr:global';
    } else {
      // RANGE
      if (a.rangeStart == null || a.rangeEnd == null) {
        return null;
      }
      candidates = await this.repo.listInRange(a.rangeStart, a.rangeEnd);
      cursorKey = `proxy:rr:range:${a.rangeStart}-${a.rangeEnd}`;
    }

    // Não exige ALIVE: proxy UNTESTED ainda é utilizável; só descartamos os DEAD (e desabilitados já filtrados na query).
    candidates = candidates.filter((p) => p.status !== 'DEAD');
    if (candidates.length === 0) {
      this.logger.warn(
        `Sessão ${sessionId}: nenhum proxy disponível no range/modo ${a.mode}`,
      );
      return null;
    }

    let chosen: Proxy;
    switch (a.strategy) {
      case 'STICKY':
        chosen = candidates[hashString(sessionId) % candidates.length];
        break;
      case 'ROUND_ROBIN': {
        const n = await this.redis.client.incr(cursorKey);
        chosen = candidates[(n - 1) % candidates.length];
        break;
      }
      case 'LEAST_LATENCY':
        chosen = [...candidates].sort(
          (x, y) =>
            (x.latencyMs ?? Number.MAX_SAFE_INTEGER) -
            (y.latencyMs ?? Number.MAX_SAFE_INTEGER),
        )[0];
        break;
      case 'RANDOM':
        // Variação por contador Redis (Math.random é proibido no ambiente de workflow; aqui em runtime é ok,
        // mas mantemos determinístico-rotativo via cursor para reprodutibilidade).
        chosen =
          candidates[
            (await this.redis.client.incr(`${cursorKey}:rnd`)) %
              candidates.length
          ];
        break;
    }

    await this.repo.setCurrent(sessionId, chosen.id);
    return chosen;
  }

  // Resolve já como Agent pronto para o Baileys (agent + fetchAgent). null => conexão direta (sem proxy).
  async resolveAgent(sessionId: string): Promise<Agent | null> {
    const proxy = await this.resolve(sessionId);
    if (!proxy) {
      return null;
    }
    this.logger.log(
      `Sessão ${sessionId} → proxy #${proxy.position} ${proxy.protocol}://${proxy.host}:${proxy.port}`,
    );
    return buildProxyAgent(proxy);
  }
}
