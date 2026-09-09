import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertEgressAllowed,
  BodyTooLargeError,
  EgressBlockedError,
  egressPolicyFromEnv,
  isPrivateAddress,
  parseEgressUrl,
  safeFetch,
} from './safe-fetch';

const open = { allowPrivate: true, allowHosts: new Set<string>() };
const strict = { allowPrivate: false, allowHosts: new Set<string>() };

describe('isPrivateAddress', () => {
  it('reconhece faixas privadas/reservadas v4', () => {
    for (const ip of [
      '10.1.2.3',
      '127.0.0.1',
      '169.254.169.254',
      '172.16.0.1',
      '172.31.255.254',
      '192.168.1.1',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '255.255.255.255',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ['8.8.8.8', '104.165.159.144', '172.32.0.1', '1.1.1.1']) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  it('reconhece v6 loopback/ULA/link-local e v4 mapeado', () => {
    for (const ip of [
      '::1',
      '::',
      'fc00::1',
      'fd12::1',
      'fe80::1',
      'ff02::1',
      '::ffff:10.0.0.1',
      '::ffff:127.0.0.1',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    expect(isPrivateAddress('2606:4700:4700::1111')).toBe(false);
    expect(isPrivateAddress('::ffff:8.8.8.8')).toBe(false);
  });

  it('string que não é IP conta como bloqueada', () => {
    expect(isPrivateAddress('nao-e-ip')).toBe(true);
  });
});

describe('parseEgressUrl / assertEgressAllowed', () => {
  it('rejeita esquemas fora de http/https e credenciais na URL', () => {
    expect(() => parseEgressUrl('ftp://x.com/a')).toThrow(EgressBlockedError);
    expect(() => parseEgressUrl('file:///etc/passwd')).toThrow(
      EgressBlockedError,
    );
    expect(() => parseEgressUrl('https://user:pass@x.com/a')).toThrow(
      /credenciais/,
    );
    expect(() => parseEgressUrl('nada')).toThrow(/inválida/);
    expect(parseEgressUrl('https://Example.com/a?b=1').hostname).toBe(
      'example.com',
    );
  });

  it('bloqueia IP literal privado, localhost e metadata; libera com allowlist', async () => {
    await expect(
      assertEgressAllowed(new URL('http://127.0.0.1:5678/hook'), strict),
    ).rejects.toThrow(EgressBlockedError);
    await expect(
      assertEgressAllowed(new URL('http://169.254.169.254/latest'), strict),
    ).rejects.toThrow(/privado/);
    await expect(
      assertEgressAllowed(new URL('http://localhost:3000/'), strict),
    ).rejects.toThrow(/não é público/);
    await expect(
      assertEgressAllowed(new URL('http://[::1]:3000/'), strict),
    ).rejects.toThrow();
    await expect(
      assertEgressAllowed(new URL('http://10.0.0.5:5678/hook'), {
        allowPrivate: false,
        allowHosts: new Set(['10.0.0.5']),
      }),
    ).resolves.toBeUndefined();
    await expect(
      assertEgressAllowed(new URL('http://10.0.0.5/'), open),
    ).resolves.toBeUndefined();
  });

  it('IP público literal passa sem DNS', async () => {
    await expect(
      assertEgressAllowed(new URL('https://8.8.8.8/'), strict),
    ).resolves.toBeUndefined();
  });

  it('host que não resolve: bloqueado por default, aceito com dnsFailure=allow (cadastro)', async () => {
    const url = new URL('https://nao-existe.invalid/hook');
    await expect(assertEgressAllowed(url, strict)).rejects.toThrow(
      /não resolvi/,
    );
    await expect(
      assertEgressAllowed(url, strict, { dnsFailure: 'allow' }),
    ).resolves.toBeUndefined();
  });

  it('egressPolicyFromEnv lê EGRESS_ALLOW_PRIVATE e EGRESS_ALLOW_HOSTS', () => {
    const p = egressPolicyFromEnv({
      EGRESS_ALLOW_PRIVATE: 'false',
      EGRESS_ALLOW_HOSTS: ' N8N , 10.0.0.9',
    });
    expect(p.allowPrivate).toBe(false);
    expect([...p.allowHosts]).toEqual(['n8n', '10.0.0.9']);
    expect(
      egressPolicyFromEnv({ EGRESS_ALLOW_PRIVATE: 'true' }).allowPrivate,
    ).toBe(true);
    expect(egressPolicyFromEnv({}).allowPrivate).toBe(false);
  });
});

describe('safeFetch — corpo em fluxo com teto e redirects validados', () => {
  let server: Server;
  let base = '';

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/big') {
        // chunked, sem content-length, 1 MB em pedaços de 64 KB
        res.writeHead(200, { 'content-type': 'application/octet-stream' });
        const chunk = Buffer.alloc(64 * 1024, 1);
        let sent = 0;
        const push = () => {
          while (sent < 1024 * 1024) {
            sent += chunk.length;
            if (!res.write(chunk)) return void res.once('drain', push);
          }
          res.end();
        };
        push();
        return;
      }
      if (req.url === '/declared-big') {
        res.writeHead(200, { 'content-length': String(50 * 1024 * 1024) });
        res.end();
        return;
      }
      if (req.url === '/to-private') {
        res.writeHead(302, {
          location: 'http://169.254.169.254/latest/meta-data',
        });
        res.end();
        return;
      }
      if (req.url === '/loop') {
        res.writeHead(302, { location: '/loop' });
        res.end();
        return;
      }
      if (req.url === '/redir') {
        res.writeHead(302, { location: '/ok' });
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const addr = server.address() as { port: number };
    base = `http://127.0.0.1:${addr.port}`;
  });
  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('baixa um corpo pequeno (e segue redirect same-host validado)', async () => {
    const r = await safeFetch(`${base}/redir`, {
      policy: open,
      maxBytes: 1024,
    });
    expect(r.status).toBe(200);
    expect(r.body.toString()).toBe('ok');
    expect(r.finalUrl).toBe(`${base}/ok`);
  });

  it('corpo chunked acima do teto é abortado sem bufferizar tudo', async () => {
    await expect(
      safeFetch(`${base}/big`, { policy: open, maxBytes: 200 * 1024 }),
    ).rejects.toThrow(BodyTooLargeError);
  });

  it('content-length declarado acima do teto é recusado antes de ler', async () => {
    await expect(
      safeFetch(`${base}/declared-big`, { policy: open, maxBytes: 1024 }),
    ).rejects.toThrow(BodyTooLargeError);
  });

  it('redirect para destino privado é bloqueado (política estrita) e loop de redirect é cortado', async () => {
    const semiStrict = {
      allowPrivate: false,
      allowHosts: new Set(['127.0.0.1']),
    };
    await expect(
      safeFetch(`${base}/to-private`, { policy: semiStrict, maxBytes: 1024 }),
    ).rejects.toThrow(EgressBlockedError);
    await expect(
      safeFetch(`${base}/loop`, {
        policy: open,
        maxBytes: 1024,
        maxRedirects: 2,
      }),
    ).rejects.toThrow(/redirecionamentos/);
  });

  it('política estrita bloqueia o próprio servidor local (loopback)', async () => {
    await expect(
      safeFetch(`${base}/ok`, { policy: strict, maxBytes: 1024 }),
    ).rejects.toThrow(EgressBlockedError);
  });
});
