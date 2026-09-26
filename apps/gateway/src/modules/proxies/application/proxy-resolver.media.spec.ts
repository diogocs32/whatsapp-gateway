import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ProxyAgent } from 'undici';
import { ProxyResolver } from './proxy-resolver.service';
import { buildMediaDispatcher } from '../infrastructure/proxy-agent.factory';

function setup(protocol: 'HTTP' | 'HTTPS' | 'SOCKS5') {
  const proxy = {
    id: 'proxy-2',
    position: 2,
    protocol,
    host: 'proxy.invalid',
    port: 8118,
    username: 'u@ser',
    password: 'p:ss',
    status: 'ALIVE',
    enabled: true,
  };
  const repo = {
    getAssignment: vi.fn(async () => ({
      mode: 'GLOBAL_ROUND_ROBIN',
      strategy: 'ROUND_ROBIN',
    })),
    listEnabledAlive: vi.fn(async () => [proxy]),
    setCurrent: vi.fn(async () => undefined),
  };
  const incr = vi.fn(async () => 1);
  const resolver = new ProxyResolver(
    repo as never,
    {
      client: { incr },
    } as never,
  );
  return { resolver, repo, incr };
}

describe('ProxyResolver — transporte Baileys (E10)', () => {
  it('fetch global do Node usa o dispatcher no proxy HTTP falso, com auth codificada', async () => {
    const requests: Array<{
      url: string | undefined;
      auth: string | undefined;
    }> = [];
    const server = createServer((req, res) => {
      requests.push({
        url: req.url,
        auth: req.headers['proxy-authorization'],
      });
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('via proxy');
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('sem porta');
    const dispatcher = buildMediaDispatcher({
      protocol: 'HTTP',
      host: '127.0.0.1',
      port: address.port,
      username: 'u@ser',
      password: 'p:ss',
    } as never);
    try {
      // O alvo não existe no DNS: qualquer saída direta falharia. O servidor local é o proxy.
      const response = await fetch('http://cdn.invalid/e10', {
        dispatcher,
      } as RequestInit);
      expect(await response.text()).toBe('via proxy');
      expect(requests).toEqual([
        {
          url: 'http://cdn.invalid/e10',
          auth: `Basic ${Buffer.from('u@ser:p:ss').toString('base64')}`,
        },
      ]);
    } finally {
      await dispatcher.destroy();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it.each(['HTTP', 'HTTPS'] as const)(
    '%s escolhe o proxy uma vez para socket/upload e download',
    async (protocol) => {
      const { resolver, repo, incr } = setup(protocol);
      const transport = await resolver.resolveBaileysTransport('session-1');
      expect(incr).toHaveBeenCalledOnce();
      expect(repo.setCurrent).toHaveBeenCalledExactlyOnceWith(
        'session-1',
        'proxy-2',
      );
      expect(transport.agent).toBeInstanceOf(HttpsProxyAgent);
      const dispatcher = transport.createMediaDispatcher?.();
      expect(dispatcher).toBeInstanceOf(ProxyAgent);
      await dispatcher?.destroy();
      // Criar outro dispatcher para outra mídia não gira o proxy da conexão.
      const next = transport.createMediaDispatcher?.();
      await next?.destroy();
      expect(incr).toHaveBeenCalledOnce();
    },
  );

  it('SOCKS conserva o Agent do socket e não fornece dispatcher para CDN', async () => {
    const { resolver, repo, incr } = setup('SOCKS5');
    const transport = await resolver.resolveBaileysTransport('session-1');
    expect(transport.agent).toBeTruthy();
    expect(transport.createMediaDispatcher).toBeNull();
    expect(repo.setCurrent).toHaveBeenCalledExactlyOnceWith(
      'session-1',
      'proxy-2',
    );
    expect(incr).toHaveBeenCalledOnce();
  });
});
