import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertEgressAllowed,
  BodyTooLargeError,
  EgressBlockedError,
  egressPolicyFromEnv,
  fetchImageByUrl,
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
    for (const ip of ['', '127.1', '0x7f.1', '127.000.000.001']) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  // P-065: o URL do WHATWG normaliza [::ffff:127.0.0.1] para [::ffff:7f00:1] (hexa) — a regex
  // antiga só via a forma pontuada e tratava o loopback/metadata como público.
  it('IPv4-mapeado em hexa e em qualquer grafia segue as faixas IPv4', () => {
    for (const ip of [
      '::ffff:7f00:1', // 127.0.0.1
      '0:0:0:0:0:ffff:7f00:1',
      '::FFFF:7F00:1',
      '::ffff:a9fe:a9fe', // 169.254.169.254 (metadata)
      '::ffff:a00:1', // 10.0.0.1
      '::ffff:ac10:1', // 172.16.0.1
      '::ffff:c0a8:101', // 192.168.1.1
      '::ffff:6440:1', // 100.64.0.1
      '::ffff:0:0', // 0.0.0.0
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ['::ffff:808:808', '::ffff:68a5:9f90']) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  it('bloqueia v6 que embute IPv4 ou está fora do unicast global (2000::/3)', () => {
    for (const ip of [
      '::7f00:1', // IPv4-compatível (::/96, deprecado)
      '::127.0.0.1',
      '::808:808',
      '::ffff:0:7f00:1', // IPv4-traduzido
      '64:ff9b::7f00:1', // NAT64
      '64:ff9b::808:808',
      '64:ff9b:1::a00:1',
      '2002:7f00:1::1', // 6to4
      '2002:808:808::1',
      '2001:0:4136:e378:8000:63bf:3fff:fdd2', // Teredo
      '2001:2::1', // benchmarking
      '2001:db8::1',
      '2001:0db8::1',
      '3fff::1', // documentação (RFC 9637)
      '100::1', // discard
      '5f00::1', // SRv6
      'fec0::1', // site-local (deprecado)
      'fe80::1%lo0', // zone id
      '0:0:0:0:0:0:0:1',
      '0::1',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of [
      '2001:4860:4860::8888',
      '2a03:2880:f12f:83:face:b00c:0:25de',
      '2804:14c::1',
      '2001:200::1', // 1º bloco de RIR logo depois de 2001::/23
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  it('faixas IPv4 de documentação/6to4 bloqueadas; limites vizinhos seguem públicos', () => {
    for (const ip of [
      '192.0.2.1',
      '198.51.100.1',
      '203.0.113.1',
      '192.88.99.1',
      '100.127.255.255',
      '198.19.255.255',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of [
      '100.128.0.1',
      '198.20.0.1',
      '192.0.1.1',
      '192.31.196.1',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  // Guarda: uma regra IPv6 que contenha ::ffff:0:0/96 faz a BlockList bloquear TODO IPv4 — o egress
  // inteiro pararia (webhook vai direto para a dead-letter). Se isto falhar, reveja BLOCKED_V6.
  it('guarda: IPv4 público segue liberado (nenhuma regra v6 engole o IPv4 inteiro)', () => {
    for (const ip of [
      '8.8.8.8',
      '1.1.1.1',
      '104.165.159.144',
      '172.32.0.1',
      '::ffff:8.8.8.8',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
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
    await expect(
      assertEgressAllowed(new URL('http://[::ffff:8.8.8.8]/'), strict),
    ).resolves.toBeUndefined();
    await expect(
      assertEgressAllowed(new URL('https://[2606:4700:4700::1111]/'), strict),
    ).resolves.toBeUndefined();
  });

  it('P-065: IPv6 que embute loopback/metadata/privado é recusado depois da normalização do URL', async () => {
    for (const u of [
      'http://[::ffff:127.0.0.1]/',
      'http://[0:0:0:0:0:ffff:7f00:1]/',
      'http://[::ffff:169.254.169.254]/latest',
      'http://[::ffff:10.0.0.5]:5678/',
      'http://[::127.0.0.1]/',
      'http://[::ffff:0:127.0.0.1]/',
      'http://[64:ff9b::127.0.0.1]/',
      'http://[2002:7f00:1::1]/',
    ]) {
      await expect(assertEgressAllowed(new URL(u), strict), u).rejects.toThrow(
        EgressBlockedError,
      );
    }
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
  let port = 0;
  let hits = 0;

  beforeAll(async () => {
    server = createServer((req, res) => {
      hits++;
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
      if (req.url === '/img') {
        res.writeHead(200, { 'content-type': 'image/png; charset=binary' });
        res.end('png');
        return;
      }
      if (req.url === '/sumiu') {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    port = (server.address() as { port: number }).port;
    base = `http://127.0.0.1:${port}`;
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

  // P-065 ponta a ponta: antes da correção o fetch em [::ffff:127.0.0.1] CHEGAVA ao servidor local
  // (reproduzido no macOS e no Linux do Docker) e o corpo voltava para o chamador.
  it('loopback escrito como IPv6 v4-mapeado é recusado sem tocar o servidor', async () => {
    const before = hits;
    for (const u of [
      `http://[::ffff:127.0.0.1]:${port}/x`,
      `http://[0:0:0:0:0:ffff:7f00:1]:${port}/y`,
    ]) {
      await expect(
        safeFetch(u, { policy: strict, maxBytes: 1024 }),
        u,
      ).rejects.toThrow(/privado/);
    }
    expect(hits).toBe(before);
  });

  // P-070: foto de grupo/perfil por URL passa pela mesma política (antes: fetch cru).
  it('fetchImageByUrl: baixa com a política, recusa destino privado e repassa HTTP de erro', async () => {
    const img = await fetchImageByUrl(`${base}/img`, open);
    expect(img.buffer.toString()).toBe('png');
    expect(img.mimetype).toBe('image/png');
    const before = hits;
    await expect(fetchImageByUrl(`${base}/img`, strict)).rejects.toThrow(
      /URL da imagem recusada/,
    );
    await expect(
      fetchImageByUrl(`http://[::ffff:127.0.0.1]:${port}/img`, strict),
    ).rejects.toThrow(/URL da imagem recusada/);
    expect(hits).toBe(before);
    await expect(fetchImageByUrl(`${base}/sumiu`, open)).rejects.toThrow(
      /HTTP 404/,
    );
  });
});
