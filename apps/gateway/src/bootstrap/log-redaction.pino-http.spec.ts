import { createServer } from 'node:http';
import { Writable } from 'node:stream';
import { pinoHttp } from 'pino-http';
import { describe, expect, it } from 'vitest';
import { LOG_REDACT_PATHS, logSerializers, REDACTED } from './log-redaction';

// Contrato com o pino-http REAL (não com um mock): garante que `request completed` traz o
// statusCode (regressão P-041 — o embrulho `wrapResponseSerializer` entregava o objeto já
// serializado e o statusCode saía null em 100% das linhas) e que cookie/authorization/x-api-key/
// set-cookie/?token= nunca chegam ao JSON.
describe('logSerializers com pino-http de verdade', () => {
  it('request completed traz statusCode e redige todos os segredos; alias { e } sai com stack', async () => {
    const lines: string[] = [];
    const dest = new Writable({
      write(chunk, _enc, cb) {
        lines.push(chunk.toString());
        cb();
      },
    });
    // Como o nestjs-pino faz: as opções (serializers + redact) vão para o pino-http, que embrulha os
    // serializers de req/res. (Passá-las a um logger pré-construído NÃO serve: o child que o pino-http
    // cria sobrepõe req/res com os dele — o teste inicial desta suíte pegou exatamente isso.)
    const middleware = pinoHttp(
      {
        level: 'info',
        serializers: logSerializers(),
        redact: LOG_REDACT_PATHS,
      },
      dest,
    );
    const logger = middleware.logger;
    const server = createServer((req, res) => {
      middleware(req, res);
      res.statusCode = 409;
      res.setHeader('set-cookie', 'token=jwt-de-resposta; HttpOnly');
      res.setHeader('content-type', 'application/json');
      res.end('{}');
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address() as { port: number };
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/x?token=segredo-q`,
        {
          headers: {
            cookie: 'token=jwt-do-cookie',
            authorization: 'Bearer jwt-bearer',
            'x-api-key': 'cz_segredo',
          },
        },
      );
      expect(res.status).toBe(409);
      // o log sai no 'finish' da resposta — um tick basta
      await new Promise((r) => setTimeout(r, 20));
    } finally {
      server.close();
    }
    const raw = lines.find((l) => l.includes('request completed'));
    expect(raw).toBeDefined();
    const entry = JSON.parse(raw!) as {
      res: { statusCode: number; headers: Record<string, unknown> };
      req: { url: string; headers: Record<string, unknown> };
    };
    expect(entry.res.statusCode).toBe(409);
    expect(entry.res.headers['set-cookie']).toBe(REDACTED);
    expect(entry.res.headers['content-type']).toBe('application/json');
    expect(entry.req.url).toBe(`/api/x?token=${REDACTED}`);
    expect(entry.req.headers.cookie).toBe(REDACTED);
    expect(entry.req.headers.authorization).toBe(REDACTED);
    expect(entry.req.headers['x-api-key']).toBe(REDACTED);
    for (const secret of [
      'jwt-do-cookie',
      'jwt-bearer',
      'cz_segredo',
      'segredo-q',
      'jwt-de-resposta',
    ]) {
      expect(raw, secret).not.toContain(secret);
    }

    logger.error({ e: new Error('boom-alias') }, 'alias');
    const errLine = JSON.parse(
      lines.find((l) => l.includes('"msg":"alias"'))!,
    ) as {
      e: { message: string; stack?: string };
    };
    expect(errLine.e.message).toBe('boom-alias');
    expect(errLine.e.stack).toContain('boom-alias');
  });
});
