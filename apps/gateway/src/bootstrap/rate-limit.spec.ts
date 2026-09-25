import 'reflect-metadata';
import { connect } from 'node:net';
import { Controller, Get, RequestMethod } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthController } from '../modules/iam/interface/auth.controller';
import { buildFastifyAdapter } from './fastify-adapter';
import { rateLimitMaxFromEnv, registerRateLimit } from './rate-limit';

// P-053: o teto do login (10/min) decidia por `req.url.startsWith('/api/auth/login')` — forma
// absoluta e %-encoding casavam a MESMA rota e caíam no teto global (600/min). Agora o teto está na
// rota (@RouteConfig no AuthController real) e o /health isento pela rota resolvida. Montagem igual
// à do main.ts (adapter do gateway + prefixo 'api' + registerRateLimit ANTES do listen); requests
// por socket cru porque o inject (light-my-request) reduz a forma absoluta a origin-form.

@Controller('ping')
class PingController {
  @Get()
  ping(): string {
    return 'pong';
  }
}

@Controller('health')
class HealthStubController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}

interface RawRes {
  status: number;
  headers: Record<string, string>;
}

function raw(
  port: number,
  method: string,
  target: string,
  body?: string,
): Promise<RawRes> {
  return new Promise((resolve, reject) => {
    let out = '';
    const s = connect(port, '127.0.0.1', () => {
      const extra = body
        ? `Content-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\n`
        : '';
      s.write(
        `${method} ${target} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\n${extra}Connection: close\r\n\r\n${body ?? ''}`,
      );
    });
    s.on('data', (chunk) => (out += String(chunk)));
    s.on('end', () => {
      const [head] = out.split('\r\n\r\n');
      const [statusLine, ...lines] = head.split('\r\n');
      const headers: Record<string, string> = {};
      for (const l of lines) {
        const i = l.indexOf(':');
        headers[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
      }
      resolve({ status: Number(statusLine.split(' ')[1]), headers });
    });
    s.on('error', reject);
  });
}

// Login com corpo inválido → 401 no zod, sem tocar o serviço (o rate-limit conta antes, no onRequest).
const login = (port: number, target: string) => raw(port, 'POST', target, '{}');

describe('rate-limit pela rota resolvida (P-053)', () => {
  let app: NestFastifyApplication | undefined;

  // App nova por teste = contadores zerados (o store é por instância).
  async function start(): Promise<number> {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, PingController, HealthStubController],
    })
      .useMocker(() => ({}))
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      buildFastifyAdapter(),
      { bodyParser: false, logger: false },
    );
    await registerRateLimit(app, 600);
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    await app.listen(0, '127.0.0.1');
    return (app.getHttpServer().address() as { port: number }).port;
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('o 11º login em 1 min é 429 mesmo alternando %-encoding e forma absoluta', async () => {
    const port = await start();
    const variantes = [
      '/api/auth/login',
      '/api/auth/%6Cogin',
      '/%61pi/auth/login',
      '/api/auth/log%69n',
      `http://127.0.0.1:${port}/api/auth/login`,
      `http://127.0.0.1:${port}/api/auth/%6Cogin`,
      'http://outro-host/api/auth/login',
      'https://h/api/auth/login',
      '/api/auth/login?x=1',
      '/api/auth/login#x',
    ];
    for (const alvo of variantes) {
      const res = await login(port, alvo);
      expect(res.status, alvo).toBe(401);
      expect(res.headers['x-ratelimit-limit'], alvo).toBe('10');
    }
    const decimo1 = await login(
      port,
      `http://127.0.0.1:${port}/api/auth/%6Cogin`,
    );
    expect(decimo1.status).toBe(429);
  });

  it('o login tem contador próprio: tráfego do mesmo IP não o esgota (D-025)', async () => {
    const port = await start();
    for (let i = 0; i < 20; i++) {
      const res = await raw(port, 'GET', '/api/ping');
      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('600');
    }
    for (let i = 0; i < 10; i++) {
      expect((await login(port, '/api/auth/login')).status).toBe(401);
    }
    expect((await login(port, '/api/auth/login')).status).toBe(429);
    // o resto do tráfego segue no teto global
    const ping = await raw(port, 'GET', '/api/ping');
    expect(ping.status).toBe(200);
    expect(ping.headers['x-ratelimit-remaining']).toBe(String(600 - 21));
  });

  it('/health fica fora do rate-limit em qualquer grafia; 404 não passa pelo limitador', async () => {
    const port = await start();
    for (const alvo of [
      '/health',
      '/health?probe=1',
      '/%68ealth',
      `http://127.0.0.1:${port}/health`,
    ]) {
      const res = await raw(port, 'GET', alvo);
      expect(res.status, alvo).toBe(200);
      expect(res.headers['x-ratelimit-limit'], alvo).toBeUndefined();
    }
    // Esquema maiúsculo: o router do fastify 5.11.3 não casa (404) — sem rota, sem limitador.
    const maiusculo = await login(
      port,
      `HTTP://127.0.0.1:${port}/api/auth/login`,
    );
    expect(maiusculo.status).toBe(404);
    expect(maiusculo.headers['x-ratelimit-limit']).toBeUndefined();
  });

  // P-071: `http://h?x=/api/auth/login` — o router casava a rota da QUERY (find-my-way) enquanto o
  // middie/Nest resolviam '/' (login sem linha de log). Agora é recusado na borda, antes da rota.
  it('forma absoluta com ? ou # antes do caminho → 400 antes de qualquer rota (nem conta no limitador)', async () => {
    const port = await start();
    for (const alvo of [
      'http://h?x=/api/auth/login',
      'http://h?/api/auth/login',
      `https://127.0.0.1:${port}#/api/auth/login`,
      'HTTP://h?x=/api/auth/login',
    ]) {
      const res = await login(port, alvo);
      expect(res.status, alvo).toBe(400);
      expect(res.headers['x-ratelimit-limit'], alvo).toBeUndefined();
    }
  });
});

describe('rateLimitMaxFromEnv', () => {
  it('default 600; 0/negativo/inválido desligam', () => {
    expect(rateLimitMaxFromEnv({})).toBe(600);
    expect(rateLimitMaxFromEnv({ RATE_LIMIT_MAX: '120' })).toBe(120);
    for (const v of ['0', '-5', 'abc', 'Infinity']) {
      expect(rateLimitMaxFromEnv({ RATE_LIMIT_MAX: v }), v).toBe(0);
    }
  });
});
