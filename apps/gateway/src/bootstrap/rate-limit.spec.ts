import 'reflect-metadata';
import { connect } from 'node:net';
import {
  Controller,
  Get,
  NotFoundException,
  RequestMethod,
} from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from '../modules/iam/interface/auth.controller';
import { ConnectLinkService } from '../modules/sessions/application/connect-link.service';
import { PublicConnectController } from '../modules/sessions/interface/public-connect.controller';
import { buildFastifyAdapter } from './fastify-adapter';
import { LoggingExceptionFilter } from './logging-exception.filter';
import {
  PUBLIC_CONNECT_NEW_QR_RATE_LIMIT,
  PUBLIC_CONNECT_READ_RATE_LIMIT,
  rateLimitMaxFromEnv,
  registerRateLimit,
} from './rate-limit';

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
    // Mesma borda de main.ts: Nest 12 deixou de reconhecer Error+statusCode
    // genérico; o filtro do gateway conserva o 429/corpo do plugin.
    app.useGlobalFilters(new LoggingExceptionFilter(app.getHttpAdapter()));
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
      `HTTP://127.0.0.1:${port}/api/auth/%6Cogin`,
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
    // Fastify 5.12.5 reconhece esquema sem distinguir caixa: mesma rota e teto.
    const maiusculo = await login(
      port,
      `HTTP://127.0.0.1:${port}/api/auth/login`,
    );
    expect(maiusculo.status).toBe(401);
    expect(maiusculo.headers['x-ratelimit-limit']).toBe('10');
    const inexistente = await raw(port, 'GET', '/rota-inexistente');
    expect(inexistente.status).toBe(404);
    expect(inexistente.headers['x-ratelimit-limit']).toBeUndefined();
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

// E27 · P-086 · D-037 — rotas públicas do link de conexão: teto por IP NA ROTA (@RouteConfig no
// PublicConnectController real), cada uma com balde próprio — a página consulta a cada 2–3 s e não
// pode esgotar o "gerar QR" (nem o contrário), e nenhuma das duas gasta os 600/min do resto do IP.
// Guard real (ConnectLinkTokenGuard) com o ConnectLinkService falso: token certo → passa.
describe('rate-limit das rotas públicas do link de conexão (E27 · P-086)', () => {
  const TOKEN = 'a'.repeat(43);
  const LINK = { id: 'cl_1', sessionId: 's1', createdBy: 'admin' };
  const fakeLinks = {
    resolveToken: async (raw: string | null) => {
      if (raw !== TOKEN) throw new NotFoundException();
      return LINK;
    },
    publicState: async () => ({ state: 'ACTIVE', phase: 'IDLE', qr: null }),
    requestNewQr: async () => ({ ok: true }),
  };
  let app: NestFastifyApplication | undefined;

  // App nova por teste = contadores zerados.
  async function start(): Promise<NestFastifyApplication> {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicConnectController, PingController],
      providers: [{ provide: ConnectLinkService, useValue: fakeLinks }],
    }).compile();
    const a = moduleRef.createNestApplication<NestFastifyApplication>(
      buildFastifyAdapter(),
      { bodyParser: false, logger: false },
    );
    a.useGlobalFilters(new LoggingExceptionFilter(a.getHttpAdapter()));
    await registerRateLimit(a, 600);
    a.setGlobalPrefix('api');
    await a.init();
    await a.getHttpAdapter().getInstance().ready();
    app = a;
    return a;
  }

  const auth = { authorization: `Bearer ${TOKEN}` };
  const read = (a: NestFastifyApplication, url = '/api/public/connect') =>
    a.inject({ method: 'GET', url, headers: auth });
  const newQr = (
    a: NestFastifyApplication,
    url = '/api/public/connect/new-qr',
  ) => a.inject({ method: 'POST', url, headers: auth });
  const ping = (a: NestFastifyApplication) =>
    a.inject({ method: 'GET', url: '/api/ping' });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('os tetos são 120/min (consulta) e 10/min (gerar QR)', () => {
    expect(PUBLIC_CONNECT_READ_RATE_LIMIT).toEqual({
      max: 120,
      timeWindow: '1 minute',
    });
    expect(PUBLIC_CONNECT_NEW_QR_RATE_LIMIT).toEqual({
      max: 10,
      timeWindow: '1 minute',
    });
  });

  it('GET /api/public/connect: 121ª consulta em 1 min é 429; não gasta o balde do new-qr nem o global', async () => {
    const a = await start();
    // Grafias diferentes da mesma rota contam no mesmo balde (decisão pela rota resolvida).
    const alvos = [
      '/api/public/connect',
      '/api/public/connect?t=1',
      '/%61pi/public/connect',
    ];
    for (let i = 0; i < 120; i++) {
      const res = await read(a, alvos[i % alvos.length]);
      expect(res.statusCode, `consulta ${i + 1}`).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('120');
      expect(res.headers['cache-control']).toBe('no-store');
    }
    const estourou = await read(a);
    expect(estourou.statusCode).toBe(429);
    expect(estourou.headers['x-ratelimit-limit']).toBe('120');

    // Balde próprio do new-qr: intacto.
    const qr = await newQr(a);
    expect(qr.statusCode).toBe(200);
    expect(qr.headers['x-ratelimit-limit']).toBe('10');
    expect(qr.headers['x-ratelimit-remaining']).toBe('9');
    expect(qr.headers['cache-control']).toBe('no-store');
    // Teto global (600) intacto: nenhuma das 122 requests públicas contou nele.
    const p = await ping(a);
    expect(p.statusCode).toBe(200);
    expect(p.headers['x-ratelimit-limit']).toBe('600');
    expect(p.headers['x-ratelimit-remaining']).toBe('599');
  });

  it('POST /api/public/connect/new-qr: 11º pedido em 1 min é 429; a consulta segue no próprio balde', async () => {
    const a = await start();
    for (let i = 0; i < 10; i++) {
      const res = await newQr(
        a,
        i % 2 ? '/api/public/%63onnect/new-qr' : '/api/public/connect/new-qr',
      );
      expect(res.statusCode, `pedido ${i + 1}`).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('10');
    }
    const estourou = await newQr(a);
    expect(estourou.statusCode).toBe(429);
    expect(estourou.headers['x-ratelimit-limit']).toBe('10');

    const r = await read(a);
    expect(r.statusCode).toBe(200);
    expect(r.headers['x-ratelimit-limit']).toBe('120');
    expect(r.headers['x-ratelimit-remaining']).toBe('119');
    const p = await ping(a);
    expect(p.headers['x-ratelimit-limit']).toBe('600');
    expect(p.headers['x-ratelimit-remaining']).toBe('599');
  });

  it('token inválido (404 no guard) também conta no balde da rota — o limitador roda antes do guard', async () => {
    const a = await start();
    for (let i = 0; i < 10; i++) {
      const res = await a.inject({
        method: 'POST',
        url: '/api/public/connect/new-qr',
        headers: { authorization: 'Bearer lixo' },
      });
      expect(res.statusCode).toBe(404);
      expect(res.headers['x-ratelimit-limit']).toBe('10');
    }
    expect((await newQr(a)).statusCode).toBe(429);
  });

  // Regressão (E27): o Fastify cria um HEAD irmão de todo GET, com balde próprio no rate-limit
  // (teto de leitura viraria 240/min). O guard recusa HEAD (405) antes de consultar o banco.
  it('HEAD /api/public/connect → 405 sem chegar ao serviço (não vira 2º balde de leitura)', async () => {
    const a = await start();
    const publicState = vi.spyOn(fakeLinks, 'publicState');
    const resolveToken = vi.spyOn(fakeLinks, 'resolveToken');
    const head = await a.inject({
      method: 'HEAD',
      url: '/api/public/connect',
      headers: auth,
    });
    expect(head.statusCode).toBe(405);
    expect(resolveToken).not.toHaveBeenCalled();
    expect(publicState).not.toHaveBeenCalled();
  });
});
