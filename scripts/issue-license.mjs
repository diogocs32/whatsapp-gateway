#!/usr/bin/env node
// Emite uma licença assinada (Ed25519). Uso (vendedor, OFFLINE — exige a chave privada):
//   node scripts/issue-license.mjs --customer "ACME" --seats 5 --sessions 10 --days 365 \
//        --features campaigns,multiengine
// --days perpetual  -> licença sem expiração.  --key <path> sobrepõe ~/.conexo-license/private.pem
import { randomUUID, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const days = arg('days', '365');
const now = Date.now();
const claims = {
  licenseId: randomUUID(),
  customer: arg('customer', 'Cliente'),
  maxSeats: Number(arg('seats', '5')),
  maxSessions: Number(arg('sessions', '5')),
  features: (arg('features', '') || '').split(',').filter(Boolean),
  iat: now,
  exp: days === 'perpetual' ? null : now + Number(days) * 86400000,
};

const keyPath = arg('key', join(homedir(), '.conexo-license', 'private.pem'));
const privateKey = readFileSync(keyPath, 'utf8');
const payloadB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
const sig = sign(null, Buffer.from(payloadB64), privateKey).toString('base64url');

console.error('Licença emitida:', JSON.stringify(claims, null, 2));
console.log(`CZL1.${payloadB64}.${sig}`);
