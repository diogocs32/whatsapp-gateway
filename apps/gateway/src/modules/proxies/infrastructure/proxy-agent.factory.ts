import type { Agent } from 'node:http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ProxyAgent, type Dispatcher } from 'undici';
import type { Proxy } from '../domain/proxy.entity';

export function buildProxyUrl(p: Proxy): string {
  const auth = p.username
    ? `${encodeURIComponent(p.username)}:${encodeURIComponent(p.password ?? '')}@`
    : '';
  return `${p.protocol.toLowerCase()}://${auth}${p.host}:${p.port}`;
}

// Agent do WebSocket e do upload (`fetchAgent`) do Baileys. Download usa dispatcher undici.
export function buildProxyAgent(p: Proxy): Agent {
  const url = buildProxyUrl(p);
  if (p.protocol === 'SOCKS4' || p.protocol === 'SOCKS5') {
    return new SocksProxyAgent(url) as unknown as Agent;
  }
  return new HttpsProxyAgent(url) as unknown as Agent;
}

// A rc14 passa options.dispatcher ao fetch da CDN. Só HTTP/HTTPS têm caminho validado aqui;
// SOCKS mantém o socket pelo proxy, mas a mídia recebida segue sem binário até prova do fetch.
export function buildMediaDispatcher(p: Proxy): Dispatcher {
  if (p.protocol === 'SOCKS4' || p.protocol === 'SOCKS5') {
    throw new Error('dispatcher de mídia SOCKS sem validação');
  }
  return new ProxyAgent(buildProxyUrl(p));
}
