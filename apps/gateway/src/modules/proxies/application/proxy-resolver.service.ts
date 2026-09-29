import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Agent } from 'node:http';
import type { Prisma } from '../../../infra/prisma/prisma.service';
import { RedisService } from '../../../infra/redis/redis.service';
import type { Proxy } from '../domain/proxy.entity';
import type { ProxyMode } from '../domain/proxy-types';
import { ProxyUnavailableError } from './proxy-unavailable.error';
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

  async resolve(sessionId: string, attempt = 0): Promise<Proxy | null> {
    const a = await this.repo.getAssignment(sessionId);
    if (!a || a.mode === 'NONE') {
      return null;
    }

    if (a.mode === 'SINGLE') {
      const proxy = a.currentProxyId
        ? await this.repo.findById(a.currentProxyId)
        : null;
      if (!proxy)
        throw new ProxyUnavailableError('Proxy SINGLE ausente ou excluído');
      if (!proxy.enabled)
        throw new ProxyUnavailableError('Proxy SINGLE desabilitado');
      if (proxy.status === 'DEAD')
        throw new ProxyUnavailableError(
          'Proxy SINGLE está DEAD — teste-o ou escolha outro',
        );
      return proxy;
    }

    let candidates: Proxy[];
    let cursorKey: string;
    if (a.mode === 'GLOBAL_ROUND_ROBIN') {
      candidates = await this.repo.listEnabledAlive();
      cursorKey = 'proxy:rr:global';
    } else if (a.mode === 'RANGE') {
      // RANGE
      if (
        a.rangeStart == null ||
        a.rangeEnd == null ||
        a.rangeStart < 1 ||
        a.rangeStart > a.rangeEnd
      ) {
        throw new ProxyUnavailableError('Faixa de proxies inválida');
      }
      candidates = await this.repo.listInRange(a.rangeStart, a.rangeEnd);
      cursorKey = `proxy:rr:range:${a.rangeStart}-${a.rangeEnd}`;
    } else {
      throw new ProxyUnavailableError('Modo de proxy inválido');
    }

    // Não exige ALIVE: proxy UNTESTED ainda é utilizável; só descartamos os DEAD (e desabilitados já filtrados na query).
    candidates = candidates.filter((p) => p.enabled && p.status !== 'DEAD');
    if (candidates.length === 0) {
      this.logger.warn(
        `Sessão ${sessionId}: nenhum proxy disponível no range/modo ${a.mode}`,
      );
      throw new ProxyUnavailableError(
        `Nenhum proxy elegível no modo ${a.mode}`,
      );
    }

    // A estratégia só escolhe a primeira saída ou substitui uma que perdeu elegibilidade.
    // Mudanças no pool/latência não mudam o IP de uma conta saudável na reconexão.
    const current = candidates.find((p) => p.id === a.currentProxyId);
    if (current) return current;

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

    // Um PUT ou outro resolver pode ter vencido durante o INCR. Nunca sobrescrever
    // a atribuição mais nova com uma escolha feita a partir do snapshot antigo.
    if (!(await this.repo.setCurrentIfUnchanged(a, chosen.id))) {
      if (attempt >= 2)
        throw new ProxyUnavailableError(
          'Atribuição de proxy mudou durante a conexão; tente novamente',
        );
      return this.resolve(sessionId, attempt + 1);
    }
    return chosen;
  }

  // Marca o proxy ATUAL da sessão como DEAD (falhou em uso real — ex.: CONNECT recusado no
  // Chromium) e devolve o modo do assignment para o chamador decidir a reação: nos modos rotativos
  // (RANGE/GLOBAL_ROUND_ROBIN) um novo resolve() pula os DEAD e entrega o próximo candidato; no
  // SINGLE o proxy é pinado de propósito — marcar DEAD dá visibilidade, mas não se rotaciona.
  async reportFailure(
    sessionId: string,
    reason: string,
    expectedProxyId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ mode: ProxyMode | null; marked: boolean }> {
    const a = await this.repo.getAssignment(sessionId, tx);
    if (
      !a ||
      a.mode === 'NONE' ||
      !expectedProxyId ||
      a.currentProxyId !== expectedProxyId
    ) {
      return { mode: a?.mode ?? null, marked: false };
    }
    const proxy = await this.repo.findById(a.currentProxyId, tx);
    if (!proxy) return { mode: a.mode, marked: false };
    await this.repo.updateTest(
      proxy.id,
      {
        status: 'DEAD',
        latencyMs: null,
        exitIp: null,
      },
      tx,
    );
    this.logger.warn(
      `Sessão ${sessionId}: proxy #${proxy.position} ${proxy.host}:${proxy.port} marcado DEAD em uso real (${reason})`,
    );
    return { mode: a.mode, marked: true };
  }

  // Dados crus do proxy para o Chromium/Puppeteer (wwebjs): o `server` vai em --proxy-server (sem
  // credenciais), e username/password vão separados em proxyAuthentication. null => conexão direta.
  async resolveProxyConfig(sessionId: string): Promise<{
    proxyId: string;
    server: string;
    username?: string;
    password?: string;
  } | null> {
    const proxy = await this.resolve(sessionId);
    if (!proxy) {
      return null;
    }
    this.logger.log(
      `Sessão ${sessionId} (browser) → proxy #${proxy.position} ${proxy.protocol}://${proxy.host}:${proxy.port}`,
    );
    return {
      proxyId: proxy.id,
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
      this.logger.warn(
        `Sessão ${sessionId}: modo NONE (ou atribuição ausente); saída direta permitida apenas se WA_REQUIRE_PROXY=false.`,
      );
      return { proxyId: undefined, agent: null, createMediaDispatcher: null };
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
      proxyId: proxy.id,
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
