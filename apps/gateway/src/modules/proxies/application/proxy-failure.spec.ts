import { describe, expect, it } from 'vitest';
import { classifyProxyFailure } from './proxy-failure';

describe('falha explícita de proxy (E15/P-058)', () => {
  it.each([
    'Unexpected server response: 407',
    'HTTP/1.1 407 Proxy Authentication Required',
    'Proxy authentication failed with status 407 after retry',
    'tunneling socket could not be established, statusCode=407',
    'net::ERR_INVALID_AUTH_CREDENTIALS at https://web.whatsapp.com/',
  ])('atribui autenticação ao proxy: %s', (message) => {
    expect(classifyProxyFailure(message)).toBe('PROXY_AUTH');
  });

  it.each([
    'net::ERR_TUNNEL_CONNECTION_FAILED',
    'net::ERR_PROXY_CONNECTION_FAILED',
    'net::ERR_NO_SUPPORTED_PROXIES',
    'net::ERR_SOCKS_CONNECTION_FAILED',
    'tunneling socket could not be established, statusCode=502',
  ])('atribui túnel ao proxy: %s', (message) => {
    expect(classifyProxyFailure(message)).toBe('PROXY_TUNNEL');
  });

  it.each([
    'proxy connection closed',
    'connect ECONNREFUSED 127.0.0.1:8080',
    'connect ETIMEDOUT',
    'getaddrinfo ENOTFOUND web.whatsapp.com',
    'EHOSTUNREACH',
    'read ECONNRESET',
    'restartRequired',
    'connectionReplaced',
    'stream errored (unknown)',
    'request 407123 failed',
    'Unexpected server response: 503',
  ])('não condena proxy por erro ambíguo: %s', (message) => {
    expect(classifyProxyFailure(message)).toBeNull();
  });
});
