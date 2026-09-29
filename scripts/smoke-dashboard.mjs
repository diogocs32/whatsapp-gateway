#!/usr/bin/env node
// E16 / R15: prova o nginx e os assets da imagem pronta, sem conta nem API.
// Uso: node scripts/smoke-dashboard.mjs http://127.0.0.1:8080
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const origin = process.argv[2];

async function request(path, headers = {}) {
  const response = await fetch(new URL(path, origin), {
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(5_000),
  });
  return { response, body: await response.text() };
}

function securityHeaders(response, path) {
  for (const [header, expected] of Object.entries({
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  })) {
    assert.equal(response.headers.get(header), expected, `${path}: ${header}`);
  }
}

async function smoke() {
  assert.ok(origin, 'uso: node scripts/smoke-dashboard.mjs <origem HTTP>');
  assert.match(new URL(origin).protocol, /^https?:$/);
  // Só a subida do container pode esperar. Falhas de conteúdo/header não são repetidas.
  let home;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      home = await request('/');
      if (home.response.status === 200) break;
    } catch {
      // O nginx ainda pode não ter aberto a porta.
    }
    await delay(1_000);
  }
  assert.equal(home?.response.status, 200, 'nginx não respondeu 200 na raiz');
  assert.match(home.body, /<div id="root"><\/div>/, 'index sem a raiz React');
  securityHeaders(home.response, '/');

  for (const path of ['/login', '/atendimento', '/conectar']) {
    const { response, body } = await request(path);
    assert.equal(response.status, 200, `${path}: status`);
    assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/);
    assert.equal(
      body,
      home.body,
      `${path}: fallback da SPA diferente do index`,
    );
    securityHeaders(response, path);
  }

  const assets = [
    ...home.body.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(js|css))"/g),
  ];
  assert.ok(
    assets.some((a) => a[2] === 'js'),
    'index sem asset JS',
  );
  assert.ok(
    assets.some((a) => a[2] === 'css'),
    'index sem asset CSS',
  );
  for (const [, path, kind] of assets) {
    const { response, body } = await request(path, {
      'accept-encoding': 'gzip',
    });
    assert.equal(response.status, 200, `${path}: status`);
    assert.ok(body.length > 0, `${path}: vazio`);
    assert.match(
      response.headers.get('content-type') ?? '',
      kind === 'js' ? /^(application|text)\/javascript\b/ : /^text\/css\b/,
      `${path}: tipo`,
    );
    const cache = response.headers.get('cache-control') ?? '';
    assert.match(cache, /\bimmutable\b/, `${path}: cache imutável`);
    assert.match(cache, /\bmax-age=31536000\b/, `${path}: validade do cache`);
    securityHeaders(response, path);
    if (Buffer.byteLength(body) >= 1024) {
      assert.equal(
        response.headers.get('content-encoding'),
        'gzip',
        `${path}: gzip`,
      );
      assert.match(response.headers.get('vary') ?? '', /accept-encoding/i);
    }
  }

  const missing = await request('/assets/nao-existe-e16.js');
  assert.equal(
    missing.response.status,
    404,
    'asset ausente não pode virar index/200',
  );
  console.log(
    'smoke dashboard OK: SPA, JS/CSS, cache, gzip, headers e asset 404',
  );
}

smoke().catch((error) => {
  console.error(`smoke dashboard FALHOU: ${error.message}`);
  process.exitCode = 1;
});
