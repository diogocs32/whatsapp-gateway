import 'reflect-metadata';
import { connect } from 'node:net';
import { Controller, Get, Param, Post } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { buildFastifyAdapter } from '../../../bootstrap/fastify-adapter';
import { AuditService } from '../application/audit.service';
import type { AuditEntry } from '../domain/audit.repository';
import { AuditInterceptor } from './audit.interceptor';

// P-053: QUEM é auditado decide pela rota resolvida. Antes, `req.url` cru: `/%61pi/webhooks` e a
// forma absoluta (`POST http://host/api/webhooks`) casavam a mesma rota e ficavam FORA da trilha;
// `/api/webhooks#/messages` também (o '#' corta o roteamento, mas o path cru "contém /messages").
// A coluna path segue o alvo como veio (a evasão fica visível), com teto de tamanho.

@Controller('webhooks')
class WebhooksStub {
  @Post()
  create(): { ok: boolean } {
    return { ok: true };
  }
}

@Controller('sessions')
class SessionsStub {
  @Post(':id/messages/text')
  send(@Param('id') id: string): { id: string } {
    return { id };
  }
  @Post(':id/proxy')
  proxy(@Param('id') id: string): { id: string } {
    return { id };
  }
  @Get(':id')
  get(@Param('id') id: string): { id: string } {
    return { id };
  }
}

function raw(port: number, method: string, target: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let out = '';
    const s = connect(port, '127.0.0.1', () =>
      s.write(
        `${method} ${target} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`,
      ),
    );
    s.on('data', (c) => (out += String(c)));
    s.on('end', () => resolve(Number(out.split(' ')[1])));
    s.on('error', reject);
  });
}

describe('AuditInterceptor pela rota resolvida (P-053)', () => {
  let app: NestFastifyApplication;
  let port: number;
  const log = vi.fn<(e: AuditEntry) => Promise<void>>(async () => undefined);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WebhooksStub, SessionsStub],
      providers: [
        { provide: AuditService, useValue: { log } },
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      buildFastifyAdapter(),
      { bodyParser: false, logger: false },
    );
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    port = (app.getHttpServer().address() as { port: number }).port;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => log.mockClear());

  const paths = () => log.mock.calls.map(([e]) => e.path);

  it('mutação em /api/* é auditada em qualquer grafia do alvo — o path gravado é o alvo cru', async () => {
    const alvos = [
      '/api/webhooks',
      '/%61pi/webhooks',
      `http://127.0.0.1:${port}/api/webhooks`,
      'http://outro-host/%61pi/webhooks?x=1',
      '/api/webhooks#/messages',
    ];
    for (const alvo of alvos)
      expect(await raw(port, 'POST', alvo), alvo).toBe(201);
    expect(paths()).toEqual([
      '/api/webhooks',
      '/%61pi/webhooks',
      `http://127.0.0.1:${port}/api/webhooks`,
      'http://outro-host/%61pi/webhooks',
      '/api/webhooks#/messages',
    ]);
    expect(log.mock.calls[0][0]).toMatchObject({
      actor: 'anônimo',
      method: 'POST',
      statusCode: 201,
    });
  });

  it('envio de mensagem (alto volume) continua fora — decidido pelo padrão da rota', async () => {
    for (const alvo of [
      '/api/sessions/abc/messages/text',
      '/%61pi/sessions/abc/messages/text',
      'http://h/api/sessions/abc/messages/text',
    ]) {
      expect(await raw(port, 'POST', alvo), alvo).toBe(201);
    }
    expect(log).not.toHaveBeenCalled();
  });

  it('sessão cujo NOME contém "messages" deixa de escapar da trilha; GET nunca é auditado', async () => {
    expect(await raw(port, 'POST', '/api/sessions/messages-vendas/proxy')).toBe(
      201,
    );
    expect(await raw(port, 'GET', '/api/sessions/abc')).toBe(200);
    expect(paths()).toEqual(['/api/sessions/messages-vendas/proxy']);
  });

  it('path gravado tem teto de 512 caracteres (host da forma absoluta é do cliente)', async () => {
    const host = 'h'.repeat(2000);
    expect(await raw(port, 'POST', `http://${host}/api/webhooks`)).toBe(201);
    const [path] = paths();
    expect(path).toHaveLength(512);
    expect(path.startsWith('http://hhh')).toBe(true);
  });

  // P-071: com '?' antes do caminho o router casava a rota da query e a trilha gravaria só o host
  // ('http://painel.local'), sem dizer QUAL recurso — agora nem chega à rota (400 na borda).
  it('forma absoluta com ? ou # antes do caminho: 400 na borda, a mutação não roda', async () => {
    for (const alvo of [
      'http://h?/api/webhooks',
      'http://painel.local?x=/api/sessions/vendas-01/proxy',
      'http://h#/api/webhooks',
    ]) {
      expect(await raw(port, 'POST', alvo), alvo).toBe(400);
    }
    expect(log).not.toHaveBeenCalled();
  });
});
