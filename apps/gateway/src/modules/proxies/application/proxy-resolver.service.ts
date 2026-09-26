import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Agent } from 'node:http';
import { RedisService } from '../../../infra/redis/redis.service';
import type { Proxy } from '../domain/proxy.entity';
import type { ProxyMode } from '../domain/proxy-types';
import {
  PROXY_REPOSITORY,
  type ProxyRepository,
} from '../domain/proxy.repository';
import {
  buildMediaDispatcher,
  buildProxyAgent,
} from '../infrastructure/proxy-agent.factory';

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

  // Marca o proxy ATUAL da sessão como DEAD (falhou em uso real — ex.: CONNECT recusado no
  // Chromium) e devolve o modo do assignment para o chamador decidir a reação: nos modos rotativos
  // (RANGE/GLOBAL_ROUND_ROBIN) um novo resolve() pula os DEAD e entrega o próximo candidato; no
  // SINGLE o proxy é pinado de propósito — marcar DEAD dá visibilidade, mas não se rotaciona.
  async reportFailure(
    sessionId: string,
    reason: string,
  ): Promise<{ mode: ProxyMode | null; marked: boolean }> {
    const a = await this.repo.getAssignment(sessionId);
    if (!a || a.mode === 'NONE' || !a.currentProxyId) {
      return { mode: a?.mode ?? null, marked: false };
    }
    const proxy = await this.repo.findById(a.currentProxyId);
    if (!proxy) return { mode: a.mode, marked: false };
    await this.repo.updateTest(proxy.id, {
      status: 'DEAD',
      latencyMs: null,
      exitIp: null,
    });
    this.logger.warn(
      `Sessão ${sessionId}: proxy #${proxy.position} ${proxy.host}:${proxy.port} marcado DEAD em uso real (${reason})`,
    );
    return { mode: a.mode, marked: true };
  }

  // Dados crus do proxy para o Chromium/Puppeteer (wwebjs): o `server` vai em --proxy-server (sem
  // credenciais), e username/password vão separados em proxyAuthentication. null => conexão direta.
  async resolveProxyConfig(
    sessionId: string,
  ): Promise<{ server: string; username?: string; password?: string } | null> {
    const proxy = await this.resolve(sessionId);
    if (!proxy) {
      return null;
    }
    this.logger.log(
      `Sessão ${sessionId} (browser) → proxy #${proxy.position} ${proxy.protocol}://${proxy.host}:${proxy.port}`,
    );
    return {
      server: `${proxy.protocol.toLowerCase()}://${proxy.host}:${proxy.port}`,
      username: proxy.username ?? undefined,
      password: proxy.password ?? undefined,
    };
  }

  // Escolhe uma vez: o WebSocket/upload e o download da CDN usam o MESMO proxy da conexão.
  // Resolver duas vezes avançaria o cursor de ROUND_ROBIN/RANDOM e misturaria saídas.
  async resolveBaileysTransport(sessionId: string) {
    const proxy = await this.resolve(sessionId);
    if (!proxy) {
      // Ponto cego ELIMINADO: antes, conectar sem proxy (IP direto do servidor = datacenter) era
      // silencioso. Para WhatsApp, conexão direta é o gatilho nº 1 de flag. Logamos SEMPRE,
      // distinguindo intencional (mode NONE) de falha (SINGLE sem proxy vivo / candidatos DEAD).
      const a = await this.repo.getAssignment(sessionId);
      const motivo =
        !a || a.mode === 'NONE'
          ? 'sem proxy atribuído (mode NONE)'
          : a.mode === 'SINGLE'
            ? 'SINGLE sem proxy vivo (currentProxyId ausente ou DEAD)'
            : `${a.mode} sem candidato vivo`;
      this.logger.warn(
        `Sessão ${sessionId}: conectando SEM proxy — ${motivo}. Tráfego sai pelo IP do servidor (datacenter); risco de flag no WhatsApp. Atribua um proxy residencial (ou ligue WA_REQUIRE_PROXY para bloquear).`,
      );
      return { agent: null, createMediaDispatcher: null };
    }
    this.logger.log(
      `Sessão ${sessionId} → proxy #${proxy.position} ${proxy.protocol}://${proxy.host}:${proxy.port}`,
    );
    if (proxy.protocol === 'SOCKS4' || proxy.protocol === 'SOCKS5') {
      this.logger.warn(
        `Sessão ${sessionId}: download de mídia via ${proxy.protocol} sem prova; emitindo só metadados para não acessar a CDN diretamente.`,
      );
    }
    return {
      agent: buildProxyAgent(proxy),
      createMediaDispatcher:
        proxy.protocol === 'SOCKS4' || proxy.protocol === 'SOCKS5'
          ? null
          : () => buildMediaDispatcher(proxy),
    };
  }

  // Compatibilidade para callers que só precisam do Agent Node.
  async resolveAgent(sessionId: string): Promise<Agent | null> {
    return (await this.resolveBaileysTransport(sessionId)).agent;
  }
}
