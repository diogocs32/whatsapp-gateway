// P-106: executar em apps/gateway, também após prune na imagem final.
// IPs pequenos, módulos reais de dist e transporte SOCKS falso; toda rede é negada.
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const Module = require('node:module');
const { resolve } = require('node:path');
const { Duplex } = require('node:stream');

const gatewayRequire = Module.createRequire(resolve('package.json'));
const trustClassifiers = [
  'isPrivate',
  'isLoopback',
  'isLinkLocal',
  'isMulticast',
  'isUnspecified',
  'isCGNAT',
  'isBroadcast',
  'isULA',
  'getType',
  'getScope',
];

class FakeSocket extends Duplex {
  constructor(type) {
    super();
    this.type = type;
    this.writes = [];
  }

  _read() {}

  _write(chunk, encoding, done) {
    this.writes.push(Buffer.from(chunk));
    let reply;
    if (this.type === 4) {
      reply = Buffer.from([0, 0x5a, 0x01, 0xbb, 192, 0, 2, 2]);
    } else if (this.writes.length === 1) {
      reply = Buffer.from([5, 0]);
    } else {
      reply = Buffer.concat([
        Buffer.from([5, 0, 0, 4]),
        Buffer.from('20010db8000000000000000000000002', 'hex'),
        Buffer.from([0x01, 0xbb]),
      ]);
    }
    process.nextTick(() => this.push(reply));
    done();
  }
}

async function main() {
  const rateLimitRequire = Module.createRequire(
    gatewayRequire.resolve('@fastify/rate-limit'),
  );
  const socksRequire = Module.createRequire(gatewayRequire.resolve('socks'));
  const ipPath = gatewayRequire.resolve('ip-address');
  assert.equal(rateLimitRequire.resolve('ip-address'), ipPath);
  assert.equal(socksRequire.resolve('ip-address'), ipPath);
  const version = gatewayRequire('ip-address/package.json').version;
  assert.match(version, /^10\.\d+\.\d+$/, 'ip-address fora da linha 10');
  const [, minor, patch] = version.split('.').map(Number);
  assert.ok(
    minor > 7 || (minor === 7 && patch >= 1),
    'ip-address anterior ao fix P-106/10.7.1',
  );

  const ip = gatewayRequire('ip-address');
  const { Address4, Address6, AddressError } = ip;
  // Provas dos classificadores corrigidos, separadas dos consumidores do produto.
  for (const host of ['fe81::1', 'febf::1', 'fe80:0:0:1::1']) {
    const address = new Address6(host);
    assert.equal(address.isLinkLocal(), true);
    assert.equal(address.getType(), 'Link-local unicast');
    assert.equal(address.getScope(), 'Link local');
  }
  assert.equal(new Address6('fec0::1').isLinkLocal(), false);
  for (const host of ['64:ff9b:1:7f00:0:100::', '64:ff9b:1::7f00:1']) {
    assert.equal(new Address6(host).isPrivate(), true);
  }
  assert.equal(new Address6('64:ff9b::7f00:1').isLoopback(), true);
  assert.equal(new Address6('2001:db8::1').isPrivate(), false);
  for (const [host, subnet] of [
    [new Address6('a00::1'), new Address4('10.0.0.0/8')],
    [new Address4('32.0.0.1'), new Address6('2000::/3')],
  ]) {
    assert.equal(host.isInSubnet(subnet), false);
    assert.equal(host.isHostInSubnet(subnet), false);
  }
  assert.equal(
    new Address6('2001:db8::1').isInSubnet(new Address6('2001:db8::/32')),
    true,
  );
  assert.equal(
    new Address6('::ffff:10.0.0.1')
      .to4()
      .isInSubnet(new Address4('10.0.0.0/8')),
    true,
  );
  const longestIpv6 = 'ffff:ffff:ffff:ffff:ffff:ffff:255.255.255.255';
  assert.equal(longestIpv6.length, 45);
  assert.equal(
    new Address6(`${longestIpv6}%fixture/128`).canonicalForm(),
    'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
  );
  // Controle fixo de 46 caracteres, só um além do limite; sem stress/timing/memória.
  const oneBeyondLimit = `${longestIpv6}a`;
  assert.equal(oneBeyondLimit.length, 46);
  for (const host of [oneBeyondLimit, `${oneBeyondLimit}%fixture/128`]) {
    assert.throws(
      () => new Address6(host),
      (error) =>
        error instanceof AddressError &&
        /at most 45 characters/.test(error.message) &&
        error.parseMessage === undefined,
    );
    assert.equal(Address6.isValid(host), false);
  }
  assert.throws(() => new Address6('not-an-ip'), AddressError);

  const restorers = [];
  let networkAttempts = 0;
  const refuse = () => {
    networkAttempts++;
    throw new Error('smoke ip-address recusa rede');
  };
  function replace(target, key, replacement) {
    const previous = target[key];
    target[key] = replacement;
    restorers.push(() => {
      target[key] = previous;
    });
  }
  const net = require('node:net');
  replace(net, 'connect', refuse);
  replace(net, 'createConnection', refuse);
  replace(net.Socket.prototype, 'connect', refuse);
  replace(require('node:tls'), 'connect', refuse);
  replace(require('node:dns'), 'lookup', refuse);
  replace(require('node:dns/promises'), 'lookup', refuse);
  replace(globalThis, 'fetch', refuse);

  let calls = {};
  const count = (key) => {
    calls[key] = (calls[key] ?? 0) + 1;
  };
  for (const Class of [Address4, Address6]) {
    for (const name of [
      ...trustClassifiers,
      'isMapped4',
      'canonicalForm',
      'correctForm',
      'startAddress',
      'toArray',
      'to4',
    ]) {
      if (typeof Class.prototype[name] !== 'function') continue;
      const original = Class.prototype[name];
      replace(Class.prototype, name, function (...args) {
        count(`${Class.name}.${name}`);
        return Reflect.apply(original, this, args);
      });
    }
  }
  const instrumented4 = new Proxy(Address4, {
    construct(target, args, newTarget) {
      count('Address4.construct');
      return Reflect.construct(target, args, newTarget);
    },
  });
  const instrumented6 = new Proxy(Address6, {
    construct(target, args, newTarget) {
      count('Address6.construct');
      return Reflect.construct(target, args, newTarget);
    },
    get(target, key, receiver) {
      if (key === 'fromByteArray') {
        return (...args) => {
          count('Address6.fromByteArray');
          return target.fromByteArray(...args);
        };
      }
      return Reflect.get(target, key, receiver);
    },
  });
  const originalLoad = Module._load;
  replace(Module, '_load', function (id, parent, isMain) {
    if (id === 'ip-address') {
      return { ...ip, Address4: instrumented4, Address6: instrumented6 };
    }
    return Reflect.apply(originalLoad, this, [id, parent, isMain]);
  });
  function noTrustClassifierCalls() {
    for (const Class of [Address4, Address6]) {
      for (const method of trustClassifiers) {
        assert.equal(calls[`${Class.name}.${method}`] ?? 0, 0, method);
      }
    }
  }
  const phases = [];
  function record(phase, result) {
    noTrustClassifierCalls();
    phases.push({ phase, ...result, calls });
    calls = {};
  }

  let fastify;
  const sockets = [];
  const agents = [];
  try {
    fastify = gatewayRequire('fastify')({ trustProxy: true });
    const { registerRateLimit } = gatewayRequire(
      './dist/bootstrap/rate-limit.js',
    );
    await registerRateLimit(fastify, 2);
    fastify.get('/fixture', (request) => ({ ip: request.ip }));
    await fastify.ready();
    calls = {};
    const statuses = [];
    for (const forwarded of [
      '2001:db8:abcd:1234::1',
      '2001:db8:abcd:1234::2',
      '2001:db8:abcd:1234::3',
    ]) {
      const response = await fastify.inject({
        method: 'GET',
        url: '/fixture',
        headers: { 'x-forwarded-for': forwarded },
      });
      statuses.push(response.statusCode);
    }
    assert.deepEqual(statuses, [200, 200, 429]);
    assert.ok(calls['Address6.construct'] > 0);
    record('produto-rate-limit-ipv6-64', { statuses });
    const mapped = gatewayRequire('@fastify/rate-limit').normalizeIP(
      '::ffff:192.0.2.1',
    );
    assert.equal(mapped, '192.0.2.1');
    record('rate-limit-ipv4-mapeado', { mapped });
    await fastify.close();
    fastify = null;

    const { SocksClient } = gatewayRequire('socks');
    const originalConnection = SocksClient.createConnection;
    replace(SocksClient, 'createConnection', function (options, callback) {
      const socket = new FakeSocket(options.proxy.type);
      sockets.push(socket);
      return originalConnection.call(
        this,
        { ...options, existing_socket: socket },
        callback,
      );
    });
    const { buildProxyAgent, buildMediaDispatcher } = gatewayRequire(
      './dist/modules/proxies/infrastructure/proxy-agent.factory.js',
    );
    for (const [protocol, destination] of [
      ['SOCKS4', '192.0.2.1'],
      ['SOCKS5', '2001:db8::1'],
    ]) {
      calls = {};
      const agent = buildProxyAgent({
        protocol,
        host: 'proxy.invalid',
        port: 1080,
      });
      agents.push(agent);
      const request = new EventEmitter();
      request.destroy = () => {};
      const socket = await agent.connect(request, {
        host: 'destination.invalid',
        port: 443,
        secureEndpoint: false,
        lookup: (host, options, callback) => callback(null, destination),
      });
      assert.equal(socket, sockets.at(-1));
      if (protocol === 'SOCKS4') {
        assert.equal(socket.writes[0].toString('hex'), '040101bbc000020100');
        assert.ok(calls['Address4.toArray'] > 0);
      } else {
        assert.deepEqual(
          socket.writes.map((bytes) => bytes.toString('hex')),
          ['050100', '0501000420010db800000000000000000000000101bb'],
        );
        assert.ok(calls['Address6.fromByteArray'] > 0);
        assert.ok(calls['Address6.canonicalForm'] > 0);
      }
      record(`produto-agent-${protocol}`, { destination });
    }
    calls = {};
    const frame = SocksClient.createUDPFrame({
      remoteHost: { host: '2001:db8::1', port: 53 },
      data: Buffer.from('ok'),
    });
    const parsed = SocksClient.parseUDPFrame(frame);
    assert.equal(
      parsed.remoteHost.host,
      '2001:0db8:0000:0000:0000:0000:0000:0001',
    );
    assert.equal(parsed.remoteHost.port, 53);
    assert.equal(parsed.data.toString(), 'ok');
    assert.ok(calls['Address6.fromByteArray'] > 0);
    record('socks-udp-api-independente', { host: parsed.remoteHost.host });
    assert.throws(
      () =>
        buildMediaDispatcher({
          protocol: 'SOCKS5',
          host: 'proxy.invalid',
          port: 1080,
        }),
      /sem validação/,
    );
    record('produto-dispatcher-socks-recusa', {});

    const { parseEgressUrl, assertEgressAllowed, isPrivateAddress } =
      gatewayRequire('./dist/shared-kernel/safe-fetch.js');
    const rejected = [];
    for (const url of [
      'http://127.0.0.1/',
      'http://[::1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://[fe81::1]/',
      'http://[64:ff9b:1::7f00:1]/',
    ]) {
      await assert.rejects(
        assertEgressAllowed(parseEgressUrl(url), {
          allowPrivate: false,
          allowHosts: new Set(),
        }),
        /privado/,
      );
      rejected.push(url);
    }
    assert.equal(isPrivateAddress('192.0.2.1'), true);
    assert.equal(isPrivateAddress('2606:4700:4700::1111'), false);
    assert.deepEqual(calls, {}, 'egress passou a depender de ip-address');
    record('produto-egress-classificador-node', { rejected });
    assert.equal(networkAttempts, 0);
    console.log(
      JSON.stringify({
        smoke: 'ip-address: consumidores dist e classificadores corrigidos OK',
        node: process.versions.node,
        platform: process.platform,
        arch: process.arch,
        version,
        sameCopy: true,
        networkAttempts,
        phases,
        limit: 'fixtures comuns offline; sem prova DoS/exploração/produção',
      }),
    );
  } finally {
    for (const agent of agents) agent.destroy();
    for (const socket of sockets) socket.destroy();
    try {
      await fastify?.close();
    } finally {
      for (const restore of restorers.reverse()) restore();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
