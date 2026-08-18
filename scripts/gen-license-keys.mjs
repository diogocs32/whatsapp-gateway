#!/usr/bin/env node
// Gera o par de chaves Ed25519 do licenciamento (RODAR UMA ÚNICA VEZ na configuração inicial).
// - A chave PÚBLICA é embutida no código do gateway (license-key.ts) — não é segredo.
// - A chave PRIVADA emite licenças e fica FORA do repositório (~/.conexo-license/private.pem).
//   GUARDE-A com backup seguro. Quem tem a privada pode emitir licenças válidas.
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const dir = join(homedir(), '.conexo-license');
const privPath = join(dir, 'private.pem');
const pubPath = join(dir, 'public.pem');

if (existsSync(privPath)) {
  console.error(
    `JÁ EXISTE um par em ${dir}. Abortando para não invalidar licenças emitidas.`,
  );
  console.error(
    'Apague manualmente se realmente quiser gerar um novo par (invalida tudo).',
  );
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

mkdirSync(dir, { recursive: true });
writeFileSync(privPath, privateKey, { mode: 0o600 });
writeFileSync(pubPath, publicKey);

console.log('=== CHAVE PÚBLICA (copie para license-key.ts) ===');
console.log(publicKey);
console.log(`=== Chaves salvas em ${dir}`);
console.log('private.pem -> GUARDE COM BACKUP. NUNCA commite. Emite licenças.');
