import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

// Hash de senha com scrypt (API nativa do Node — zero dependências, sem build nativo).
//
// Formato VERSIONADO (auditoria 09/2026, ABE-11): `s2$N$r$p$salt$hash` — o custo fica gravado no
// próprio hash, então dá para subir o parâmetro (PASSWORD_SCRYPT_LOG2N) sem migração: quem loga
// com hash de custo antigo é re-hasheado (`passwordNeedsRehash` + `hashPassword` no login).
// Legado (`salt:hash`, custo default do Node N=16384/r=8/p=1) continua verificando.
// Custo default = o mesmo do Node (2^14): subir sem medir em hardware real vira DoS de login —
// a auditoria manda calibrar antes; o formato só deixa a porta aberta.
const scryptAsync = promisify<
  string,
  string,
  number,
  { N: number; r: number; p: number; maxmem: number },
  Buffer
>(scrypt);

const KEYLEN = 64;
const VERSION = 's2';
const DEFAULT_LOG2N = 14;
const R = 8;
const P = 1;

export interface ScryptCost {
  N: number;
  r: number;
  p: number;
}

// Custo corrente: PASSWORD_SCRYPT_LOG2N (12..20) — fora da faixa/ausente = default do Node.
export function currentScryptCost(): ScryptCost {
  const raw = Number(process.env.PASSWORD_SCRYPT_LOG2N);
  const log2n =
    Number.isInteger(raw) && raw >= 12 && raw <= 20 ? raw : DEFAULT_LOG2N;
  return { N: 2 ** log2n, r: R, p: P };
}

function maxmemFor(cost: ScryptCost): number {
  // Node exige maxmem > 128*N*r; folga de 2× cobre o overhead interno.
  return Math.max(32 * 1024 * 1024, 2 * 128 * cost.N * cost.r);
}

async function derive(
  plain: string,
  salt: string,
  cost: ScryptCost,
): Promise<Buffer> {
  return scryptAsync(plain, salt, KEYLEN, { ...cost, maxmem: maxmemFor(cost) });
}

export async function hashPassword(
  plain: string,
  cost: ScryptCost = currentScryptCost(),
): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await derive(plain, salt, cost);
  return `${VERSION}$${cost.N}$${cost.r}$${cost.p}$${salt}$${derived.toString('hex')}`;
}

interface ParsedHash {
  cost: ScryptCost;
  salt: string;
  key: Buffer;
  legacy: boolean;
}

function parseStored(stored: string): ParsedHash | null {
  if (!stored) return null;
  if (stored.startsWith(`${VERSION}$`)) {
    const [, n, r, p, salt, key] = stored.split('$');
    const N = Number(n);
    const rr = Number(r);
    const pp = Number(p);
    if (
      !salt ||
      !key ||
      !Number.isInteger(N) ||
      !Number.isInteger(rr) ||
      !Number.isInteger(pp) ||
      N < 2 ||
      rr < 1 ||
      pp < 1
    ) {
      return null;
    }
    return {
      cost: { N, r: rr, p: pp },
      salt,
      key: Buffer.from(key, 'hex'),
      legacy: false,
    };
  }
  const [salt, key] = stored.split(':');
  if (!salt || !key) return null;
  return {
    cost: { N: 2 ** DEFAULT_LOG2N, r: R, p: P },
    salt,
    key: Buffer.from(key, 'hex'),
    legacy: true,
  };
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const parsed = parseStored(stored);
  if (!parsed) return false;
  const derived = await derive(plain, parsed.salt, parsed.cost);
  return (
    parsed.key.length === derived.length && timingSafeEqual(parsed.key, derived)
  );
}

// true quando o hash está no formato legado ou com custo diferente do corrente → re-hashear no
// próximo login bem-sucedido.
export function passwordNeedsRehash(
  stored: string,
  cost: ScryptCost = currentScryptCost(),
): boolean {
  const parsed = parseStored(stored);
  if (!parsed) return false;
  if (parsed.legacy) return true;
  return (
    parsed.cost.N !== cost.N ||
    parsed.cost.r !== cost.r ||
    parsed.cost.p !== cost.p
  );
}

// Custo equivalente para "usuário não existe": sem isto o login responde mais rápido quando o
// username é desconhecido (enumeração por tempo — ABE-11). Salt fixo, resultado descartado.
const DUMMY_SALT = '00000000000000000000000000000000';
export async function verifyPasswordDummy(
  cost: ScryptCost = currentScryptCost(),
): Promise<void> {
  await derive('dummy-password-for-constant-time', DUMMY_SALT, cost);
}

// HMAC SHA-512 para assinar webhooks (blueprint §10.3).
export function hmacSha512(secret: string, payload: string): string {
  return createHmac('sha512', secret).update(payload).digest('hex');
}

// SHA-512 (hex) de um texto — usado para guardar/validar API keys (blueprint §15: "texto + SHA-512").
export function sha512(text: string): string {
  return createHash('sha512').update(text).digest('hex');
}
