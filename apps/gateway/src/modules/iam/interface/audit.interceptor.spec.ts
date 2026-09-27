import 'reflect-metadata';
import { connect } from 'node:net';
import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  Injectable,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
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

// E27 · P-086 — quem é o ator. Ordem: usuário (JWT) > API key > `auditActor` (posto pelo guard do
// link público: `link:<id> (de <quem criou>)`, teto 200) > `login:<nome>` SÓ na rota de login >
// 'anônimo'. Antes, qualquer mutação anônima com `username` no corpo gravava "login:<nome>" — ator
// forjado pelo cliente (ex.: POST público do link com {"username":"admin"}).

// Guard de teste: põe no req as credenciais que os guards reais poriam, a partir de headers.
@Injectable()
class StubCredentialsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { sub: string; username: string; role: string };
      apiKey?: { id: string; name: string };
      auditActor?: string;
    }>();
    const h = req.headers;
    if (h['x-test-user'])
      req.user = { sub: 'u1', username: h['x-test-user'], role: 'ADMIN' };
    if (h['x-test-key']) req.apiKey = { id: 'k1', name: h['x-test-key'] };
    if (h['x-test-actor']) req.auditActor = h['x-test-actor'];
    return true;
  }
}

@Controller('public/connect')
class PublicConnectStub {
  @Post('new-qr')
  @HttpCode(200)
  newQr(): { ok: boolean } {
    return { ok: true };
  }
}

@Controller('auth')
class AuthLoginStub {
  // Login recusado (401): a tentativa também entra na trilha, pelo catchError do interceptor.
  @Post('login')
  login(@Body() _body: unknown): never {
    throw new UnauthorizedException('Credenciais inválidas');
  }
}

describe('AuditInterceptor — ator da trilha (E27 · P-086)', () => {
  let app: NestFastifyApplication;
  const log = vi.fn<(e: AuditEntry) => Promise<void>>(async () => undefined);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicConnectStub, AuthLoginStub],
      providers: [
        { provide: AuditService, useValue: { log } },
        { provide: APP_GUARD, useClass: StubCredentialsGuard },
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      buildFastifyAdapter(),
      { bodyParser: false, logger: false },
    );
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => log.mockClear());

  const post = async (
    url: string,
    headers: Record<string, string> = {},
    body?: unknown,
  ) => {
    const res = await app.inject({
      method: 'POST',
      url,
      headers: {
        ...headers,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      payload: body === undefined ? undefined : JSON.stringify(body),
    });
    return res.statusCode;
  };
  const actors = () => log.mock.calls.map(([e]) => e.actor);

  it('sem usuário nem API key, o ator é o auditActor do guard (com teto de 200 caracteres)', async () => {
    expect(
      await post('/api/public/connect/new-qr', {
        'x-test-actor': 'link:cl_123 (de admin)',
      }),
    ).toBe(200);
    const longo = `link:${'x'.repeat(295)}`; // 300 caracteres
    expect(
      await post('/api/public/connect/new-qr', { 'x-test-actor': longo }),
    ).toBe(200);
    expect(actors()).toEqual(['link:cl_123 (de admin)', longo.slice(0, 200)]);
    expect(actors()[1]).toHaveLength(200);
    expect(log.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      path: '/api/public/connect/new-qr',
      statusCode: 200,
    });
  });

  it('usuário (JWT) e API key têm precedência sobre o auditActor', async () => {
    const actor = { 'x-test-actor': 'link:cl_1 (de admin)' };
    await post('/api/public/connect/new-qr', {
      ...actor,
      'x-test-user': 'maria',
      'x-test-key': 'integracao',
    });
    await post('/api/public/connect/new-qr', {
      ...actor,
      'x-test-key': 'integracao',
    });
    expect(actors()).toEqual(['maria (ADMIN)', 'key:integracao']);
  });

  it('username no corpo fora da rota de login não forja ator: fica "anônimo"', async () => {
    for (const url of [
      '/api/public/connect/new-qr',
      '/%61pi/public/connect/new-qr',
    ]) {
      expect(await post(url, {}, { username: 'admin' }), url).toBe(200);
    }
    expect(actors()).toEqual(['anônimo', 'anônimo']);
  });

  it('username no corpo da rota /api/auth/login continua "login:<nome>" (inclusive %-encoding e falha 401)', async () => {
    for (const url of ['/api/auth/login', '/api/auth/%6Cogin']) {
      expect(
        await post(url, {}, { username: 'admin', password: 'x' }),
        url,
      ).toBe(401);
    }
    expect(actors()).toEqual(['login:admin', 'login:admin']);
    expect(log.mock.calls[0][0]).toMatchObject({
      path: '/api/auth/login',
      statusCode: 401,
    });
  });
});
