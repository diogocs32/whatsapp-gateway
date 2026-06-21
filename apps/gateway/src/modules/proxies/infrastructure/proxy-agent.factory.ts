import type { Agent } from 'node:http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { Proxy } from '../domain/proxy.entity';

export function buildProxyUrl(p: Proxy): string {
  const auth = p.username
    ? `${encodeURIComponent(p.username)}:${encodeURIComponent(p.password ?? '')}@`
    : '';
  return `${p.protocol.toLowerCase()}://${auth}${p.host}:${p.port}`;
}

// Constrói o Agent (socks ou http/https) — usado tanto em `agent` quanto em `fetchAgent` do Baileys (§7.1).
export function buildProxyAgent(p: Proxy): Agent {
  const url = buildProxyUrl(p);
  if (p.protocol === 'SOCKS4' || p.protocol === 'SOCKS5') {
    return new SocksProxyAgent(url) as unknown as Agent;
  }
  return new HttpsProxyAgent(url) as unknown as Agent;
}
