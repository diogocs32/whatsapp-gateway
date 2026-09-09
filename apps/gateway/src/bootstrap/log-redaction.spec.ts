import { describe, expect, it } from 'vitest';
import {
  httpLogSerializers,
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
