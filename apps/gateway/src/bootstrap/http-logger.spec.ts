import 'reflect-metadata';
import { connect } from 'node:net';
import { Writable } from 'node:stream';
import {
  Controller,
  Get,
  Headers,
  Module,
  Post,
  RequestMethod,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyReply } from 'fastify';
import { LoggerModule } from 'nestjs-pino';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildFastifyAdapter } from './fastify-adapter';
import { httpLoggerOptions } from './http-logger';

// P-053: /health e /metrics decidem pela rota RESOLVIDA (carimbo do buildFastifyAdapter), não por
// `req.url` — dentro do middleware do pino-http o req.url é '/' e o antigo autoLogging.ignore
// nunca casava. Montagem de PRODUÇÃO (NestFactory.create + buildFastifyAdapter) com as opções
// REAIS do http-logger; requests por socket cru. As grafias de %-encoding e forma absoluta vão em
// HEAD /health (2xx) e em /metrics sem token (401): GET 2xx já seria silencioso pela regra geral e
// não provaria nada — só a decisão PELA ROTA silencia esses casos.

@Controller('health')
class HealthStubController {
  @Get()
  check(
    @Headers('x-falhar') falhar: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): { status: string } {
    reply.status(falhar ? 503 : 200);
    return { status: falhar ? 'unhealthy' : 'ok' };
  }
}

@Controller('metrics')
class MetricsStubController {
  @Get()
  scrape(@Headers('authorization') auth: string | undefined): string {
    if (auth !== 'Bearer ok') throw new UnauthorizedException('Token inválido');
    return '# metrics';
  }
}

@Controller('x')
class XController {
  @Get()
  get(): string {
    return 'x';
  }
  @Post()
  post(): string {
    return 'criado';
  }
}

const lines: Array<{ msg?: string; level?: number; req?: { url?: string } }> =
  [];
const dest = new Writable({
  write(chunk, _enc, cb) {
    for (const l of String(chunk).split('\n').filter(Boolean)) {
      lines.push(JSON.parse(l) as (typeof lines)[number]);
    }
    cb();
  },
});

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: [
        httpLoggerOptions({ NODE_ENV: 'production', LOG_LEVEL: 'info' }),
        dest,
      ],
    }),
  ],
  controllers: [HealthStubController, MetricsStubController, XController],
})
class LogAppModule {}

function raw(
  port: number,
  method: string,
  target: string,
  headers: Record<string, string> = {},
): Promise<number> {
  return new Promise((resolve, reject) => {
    let out = '';
    const extra = Object.entries(headers)
      .map(([k, v]) => `${k}: ${v}\r\n`)
      .join('');
    const s = connect(port, '127.0.0.1', () =>
      s.write(
        `${method} ${target} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\n${extra}Content-Length: 0\r\nConnection: close\r\n\r\n`,
      ),
    );
    s.on('data', (c) => (out += String(c)));
    s.on('end', () => resolve(Number(out.split(' ')[1])));
    s.on('error', reject);
  });
}

// O pino-http loga no 'finish' da resposta — um tick depois do fim do socket basta.
const settle = () => new Promise((r) => setTimeout(r, 30));
const completed = () =>
  lines.filter(
    (l) => l.msg === 'request completed' || l.msg === 'request errored',
  );

describe('request-log: sondagens pela rota resolvida (P-053)', () => {
  let app: NestFastifyApplication;
  let port: number;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      LogAppModule,
      buildFastifyAdapter(),
      { bodyParser: false, logger: false },
    );
    app.setGlobalPrefix('api', {
      exclude: [
        { path: 'health', method: RequestMethod.GET },
        { path: 'metrics', method: RequestMethod.GET },
      ],
    });
    await app.listen(0, '127.0.0.1');
    port = (app.getHttpServer().address() as { port: number }).port;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    lines.length = 0;
  });

  it('/health e /metrics não geram linha em nenhuma grafia (2xx, 4xx, HEAD, %-encoding, forma absoluta)', async () => {
    const reqs: Array<[string, string, number, Record<string, string>?]> = [
      ['GET', '/health', 200],
      ['GET', '/health?probe=1', 200],
      ['HEAD', '/health', 200],
      ['HEAD', '/%68ealth', 200],
      ['HEAD', `http://127.0.0.1:${port}/health`, 200],
      ['GET', '/metrics', 401], // a linha do 401 fica com o LoggingExceptionFilter
      ['GET', '/metrics?token=errado', 401],
      ['GET', '/%6Detrics', 401],
      ['GET', `http://127.0.0.1:${port}/metrics`, 401],
      ['GET', '/metrics', 200, { authorization: 'Bearer ok' }],
    ];
    for (const [m, alvo, status, h] of reqs) {
      expect(await raw(port, m, alvo, h), `${m} ${alvo}`).toBe(status);
    }
    await settle();
    expect(completed()).toEqual([]);
  });

  it('503 do /health continua visível (único rastro de unhealthy no log)', async () => {
    expect(await raw(port, 'GET', '/health', { 'x-falhar': '1' })).toBe(503);
    await settle();
    const [linha] = completed();
    expect(linha?.level).toBe(50); // error
  });

  it('demais rotas seguem a regra: mutação em info, GET 2xx silencioso', async () => {
    expect(await raw(port, 'POST', '/api/x')).toBe(201);
    expect(await raw(port, 'GET', '/api/x')).toBe(200);
    // 404 nunca passa pelo middleware do pino-http (comportamento anterior, provado forçando
    // 'warn' para tudo): a linha do 404 vem do LoggingExceptionFilter.
    expect(await raw(port, 'GET', '/nao-existe')).toBe(404);
    await settle();
    expect(completed().map((l) => l.level)).toEqual([30]);
  });
});
