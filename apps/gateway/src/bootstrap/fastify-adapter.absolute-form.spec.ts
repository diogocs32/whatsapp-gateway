import 'reflect-metadata';
import { connect } from 'node:net';
import {
  Controller,
  Get,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildFastifyAdapter } from './fastify-adapter';

// GHSA-9c5c-9qcx-q35q (P-054): no @nestjs/platform-fastify < 11.2.4 um middleware com escopo de
// rota (forRoutes) era PULADO quando o request vinha em forma absoluta (`GET http://host/rota`).
// No gateway o único middleware Nest é o pino-http (nestjs-pino, forRoutes '*'): o efeito era
// request sem linha de log — a autenticação é guard e não é afetada. Este teste trava a correção.

@Controller('protegido')
class ProtegidoController {
  @Get()
  get(): string {
    return 'dado protegido';
  }
}

@Module({ controllers: [ProtegidoController] })
class AlvoAbsolutoModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        (
          _req: unknown,
          res: { statusCode: number; end: (body: string) => void },
        ) => {
          res.statusCode = 401;
          res.end('bloqueado pelo middleware');
        },
      )
      .forRoutes({ path: 'protegido', method: RequestMethod.GET });
  }
}

// light-my-request (inject) sempre manda origin-form: a forma absoluta só sai por socket cru.
function requestCru(port: number, alvo: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let out = '';
    const s = connect(port, '127.0.0.1', () =>
      s.write(
        `GET ${alvo} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`,
      ),
    );
    s.on('data', (chunk) => (out += String(chunk)));
    s.on('end', () => resolve(out));
    s.on('error', reject);
  });
}

describe('GHSA-9c5c-9qcx-q35q — middleware por rota com alvo em forma absoluta', () => {
  let app: NestFastifyApplication;
  let port: number;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AlvoAbsolutoModule,
      buildFastifyAdapter(),
      { bodyParser: false, logger: false },
    );
    await app.listen(0, '127.0.0.1');
    port = (app.getHttpServer().address() as { port: number }).port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('origin-form: o middleware roda', async () => {
    const res = await requestCru(port, '/protegido');
    expect(res.startsWith('HTTP/1.1 401')).toBe(true);
  });

  it('forma absoluta: o middleware também roda (falhava no platform-fastify < 11.2.4)', async () => {
    const res = await requestCru(port, `http://127.0.0.1:${port}/protegido`);
    expect(res.startsWith('HTTP/1.1 401')).toBe(true);
    expect(res).not.toContain('dado protegido');
  });
});
