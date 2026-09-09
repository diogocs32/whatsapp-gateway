import { stdSerializers } from 'pino';
import { describe, expect, it } from 'vitest';
import {
  errorAliasSerializers,
  httpLogSerializers,
  logSerializers,
  maskUrlSecrets,
  REDACTED,
  redactHeaders,
  redactQuery,
} from './log-redaction';

describe('maskUrlSecrets', () => {
  it('mascara token/api_key/secret na query e preserva o resto', () => {
    expect(maskUrlSecrets('/api/events/stream?token=abc.def&x=1')).toBe(
      `/api/events/stream?token=${REDACTED}&x=1`,
    );
    expect(maskUrlSecrets('/metrics?TOKEN=xyz')).toBe(
      `/metrics?TOKEN=${REDACTED}`,
    );
    expect(maskUrlSecrets('/a?api_key=k&secret=s&password=p')).toBe(
      `/a?api_key=${REDACTED}&secret=${REDACTED}&password=${REDACTED}`,
    );
  });

  it('URL sem query, vazia ou undefined volta intacta', () => {
    expect(maskUrlSecrets('/api/sessions')).toBe('/api/sessions');
    expect(maskUrlSecrets('')).toBe('');
    expect(maskUrlSecrets(undefined)).toBeUndefined();
  });

  it('não toca em parâmetros inofensivos nem em chave sem valor', () => {
    expect(maskUrlSecrets('/a?limit=50&chatId=x@c.us&flag')).toBe(
      '/a?limit=50&chatId=x@c.us&flag',
    );
  });
});

describe('redactHeaders / redactQuery', () => {
  it('redige cookie, set-cookie, authorization e x-api-key (case-insensitive) sem mutar a origem', () => {
    const headers = {
      Cookie: 'token=jwt; refresh_token=rt_x',
      authorization: 'Bearer abc',
      'X-Api-Key': 'cz_123',
      'user-agent': 'n8n',
    };
    const out = redactHeaders(headers);
    expect(out).toEqual({
      Cookie: REDACTED,
      authorization: REDACTED,
      'X-Api-Key': REDACTED,
      'user-agent': 'n8n',
    });
    expect(headers.Cookie).toBe('token=jwt; refresh_token=rt_x');
  });

  it('redige token na query parseada', () => {
    expect(redactQuery({ token: 'x', limit: '5' })).toEqual({
      token: REDACTED,
      limit: '5',
    });
    expect(redactQuery(undefined)).toBeUndefined();
  });
});

describe('httpLogSerializers', () => {
  it('serializa request com url/headers/query redigidos', () => {
    const { req } = httpLogSerializers();
    const fake = {
      id: 'req-1',
      method: 'POST',
      url: '/api/auth/refresh?token=abc',
      headers: { cookie: 'refresh_token=rt_1', host: 'api' },
      query: { token: 'abc' },
      socket: { remoteAddress: '10.0.0.1', remotePort: 1234 },
    };
    const out = req(fake) as {
      url: string;
      headers: Record<string, string>;
      query: Record<string, string>;
    };
    expect(out.url).toBe(`/api/auth/refresh?token=${REDACTED}`);
    expect(out.headers.cookie).toBe(REDACTED);
    expect(out.headers.host).toBe('api');
    expect(out.query.token).toBe(REDACTED);
    expect(fake.headers.cookie).toBe('refresh_token=rt_1');
  });

  it('serializa response com set-cookie redigido', () => {
    const { res } = httpLogSerializers();
    const fake = {
      statusCode: 201,
      getHeaders: () => ({
        'set-cookie': ['token=jwt; HttpOnly'],
        'content-type': 'application/json',
      }),
    };
    const out = res(fake) as { headers: Record<string, unknown> };
    expect(out.headers['set-cookie']).toBe(REDACTED);
    expect(out.headers['content-type']).toBe('application/json');
  });

  it('nunca lança: objeto inesperado vira serialização mínima', () => {
    const { req, res } = httpLogSerializers();
    expect(() => req(null)).not.toThrow();
    expect(() => res(null)).not.toThrow();
  });
});

// P-041 — o pino-http embrulha serializers customizados (`wrapResponseSerializer`): o valor que
// chega é o objeto JÁ serializado pelo padrão. Reaplicar o padrão zerava o statusCode.
describe('httpLogSerializers sob o embrulho do pino-http', () => {
  it('response já serializada mantém statusCode e headers (redigidos)', () => {
    const { res } = httpLogSerializers();
    const wrapped = stdSerializers.wrapResponseSerializer(
      res as Parameters<typeof stdSerializers.wrapResponseSerializer>[0],
    );
    const raw = {
      statusCode: 409,
      headersSent: true,
      getHeaders: () => ({
        'set-cookie': ['token=jwt; HttpOnly'],
        'content-type': 'application/json',
      }),
    };
    const out = wrapped(raw as never) as unknown as {
      statusCode: number;
      headers: Record<string, unknown>;
    };
    expect(out.statusCode).toBe(409);
    expect(out.headers['set-cookie']).toBe(REDACTED);
    expect(out.headers['content-type']).toBe('application/json');
  });

  it('request já serializada mantém método/id e redige cookie e ?token=', () => {
    const { req } = httpLogSerializers();
    const wrapped = stdSerializers.wrapRequestSerializer(
      req as Parameters<typeof stdSerializers.wrapRequestSerializer>[0],
    );
    const raw = {
      id: 'req-9',
      method: 'POST',
      url: '/api/events/stream?token=abc',
      headers: { cookie: 'token=jwt', host: 'api' },
      query: { token: 'abc' },
      socket: { remoteAddress: '10.0.0.1', remotePort: 4 },
    };
    const out = wrapped(raw as never) as unknown as {
      id: string;
      method: string;
      url: string;
      headers: Record<string, string>;
      remoteAddress?: string;
    };
    expect(out.id).toBe('req-9');
    expect(out.method).toBe('POST');
    expect(out.url).toBe(`/api/events/stream?token=${REDACTED}`);
    expect(out.headers.cookie).toBe(REDACTED);
    expect(out.remoteAddress).toBe('10.0.0.1');
  });
});

describe('errorAliasSerializers', () => {
  it('Error sob e/error/cause sai com mensagem e stack; não-Error passa intacto', () => {
    const s = errorAliasSerializers();
    const boom = new Error('boom');
    for (const key of ['err', 'e', 'error', 'cause', 'exception'] as const) {
      const out = s[key](boom) as { message: string; stack?: string };
      expect(out.message, key).toBe('boom');
      expect(out.stack, key).toContain('boom');
    }
    expect(s.error('texto simples')).toBe('texto simples');
    expect(s.e(undefined)).toBeUndefined();
  });

  it('logSerializers junta http + aliases', () => {
    const keys = Object.keys(logSerializers());
    expect(keys).toEqual(
      expect.arrayContaining(['req', 'res', 'err', 'e', 'error']),
    );
  });
});
