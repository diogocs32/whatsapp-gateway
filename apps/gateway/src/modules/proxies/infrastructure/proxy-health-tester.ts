import * as http from 'node:http';
import * as https from 'node:https';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../bootstrap/config';
import type { Proxy } from '../domain/proxy.entity';
import { buildProxyAgent } from './proxy-agent.factory';

export interface HealthResult {
  status: 'ALIVE' | 'DEAD';
  latencyMs: number | null;
  exitIp: string | null;
}

// Testa o proxy: faz uma requisição a um echo de IP ATRAVÉS do agent, medindo latência e IP de saída (§7.5).
@Injectable()
export class ProxyHealthTester {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async test(proxy: Proxy): Promise<HealthResult> {
    const echoUrl = this.config.get('PROXY_TEST_ECHO_URL', { infer: true });
    const agent = buildProxyAgent(proxy);
    const lib = echoUrl.startsWith('http://') ? http : https;
    const started = Date.now();

    return new Promise<HealthResult>((resolve) => {
      const req = lib.get(echoUrl, { agent, timeout: 8000 }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          const latencyMs = Date.now() - started;
          let exitIp: string | null = null;
          try {
            const j = JSON.parse(body) as { ip?: string };
            exitIp = j.ip ?? null;
          } catch {
            exitIp = body.trim().slice(0, 45) || null;
          }
          resolve({ status: 'ALIVE', latencyMs, exitIp });
        });
      });
      req.on('error', () =>
        resolve({ status: 'DEAD', latencyMs: null, exitIp: null }),
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'DEAD', latencyMs: null, exitIp: null });
      });
    });
  }
}
