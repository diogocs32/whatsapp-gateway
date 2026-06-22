import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

// Hash de senha com scrypt (API nativa do Node — zero dependências, sem build nativo).
const scryptAsync = promisify<string, string, number, Buffer>(scrypt);

const KEYLEN = 64;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(plain, salt, KEYLEN);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, 'hex');
  const derived = await scryptAsync(plain, salt, KEYLEN);
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

// HMAC SHA-512 para assinar webhooks (blueprint §10.3).
export function hmacSha512(secret: string, payload: string): string {
  return createHmac('sha512', secret).update(payload).digest('hex');
}

// SHA-512 (hex) de um texto — usado para guardar/validar API keys (blueprint §15: "texto + SHA-512").
export function sha512(text: string): string {
  return createHash('sha512').update(text).digest('hex');
}
