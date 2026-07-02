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
  // Motivo da morte (não persistido — vai na resposta do teste e no log): PROXY_AUTH, HTTP_<code>,
  // TIMEOUT ou a mensagem do erro de socket.
  reason: string | null;
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
        const code = res.statusCode ?? 0;
        // Só 2xx comprova túnel + credencial ok. Quando o proxy recusa a auth, o https-proxy-agent
        // repassa o 407 do CONNECT ao parser HTTP do Node — sem checar o status, esse 407 chegava
        // aqui como resposta "válida" e o proxy virava ALIVE (falso-positivo que depois explode
        // ERR_INVALID_AUTH_CREDENTIALS no Chromium/wwebjs ao usar a sessão).
        if (code < 200 || code >= 300) {
          res.resume(); // drena a resposta e libera o socket
          resolve({
            status: 'DEAD',
            latencyMs: null,
            exitIp: null,
            reason: code === 407 ? 'PROXY_AUTH' : `HTTP_${code}`,
          });
          return;
        }
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
          resolve({ status: 'ALIVE', latencyMs, exitIp, reason: null });
        });
      });
      req.on('error', (e) =>
        resolve({
          status: 'DEAD',
          latencyMs: null,
          exitIp: null,
          reason: (e.message || 'erro de socket').slice(0, 120),
        }),
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 'DEAD',
          latencyMs: null,
          exitIp: null,
          reason: 'TIMEOUT',
        });
      });
    });
  }
}
