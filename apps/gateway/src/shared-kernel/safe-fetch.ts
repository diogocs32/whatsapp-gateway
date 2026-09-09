import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Política de EGRESS (auditoria 09/2026, ABE-06/ABE-07 — P-031): URLs controladas pelo
// integrador (webhook, mediaUrl de campanha, /messages/media-url) não podem virar SSRF nem
// bomba de memória.
//
//   - só http/https; sem credenciais embutidas na URL;
//   - destino não pode resolver para endereço privado/loopback/link-local/metadata
//     (exceções explícitas: EGRESS_ALLOW_HOSTS="n8n,10.0.0.5" ou EGRESS_ALLOW_PRIVATE=true);
//   - redirect é seguido manualmente e CADA salto passa pela mesma validação;
//   - o corpo é lido em fluxo com contador de bytes e abortado ao passar o teto.
//
// Limite conhecido (documentado): a validação resolve o DNS ANTES de conectar — um servidor
// que muda o A record entre a validação e a conexão (rebinding) não é coberto; para isso a
// camada de rede do host precisa complementar (regra de saída do container).

export interface EgressPolicy {
  allowPrivate: boolean;
  allowHosts: Set<string>; // hostnames/IPs literais liberados mesmo se privados (lowercase)
}

export function egressPolicyFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): EgressPolicy {
  const allowPrivate = /^(true|1|yes|on)$/i.test(
    env.EGRESS_ALLOW_PRIVATE ?? '',
  );
  const allowHosts = new Set(
    (env.EGRESS_ALLOW_HOSTS ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
  return { allowPrivate, allowHosts };
}

export class EgressBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EgressBlockedError';
  }
}

function ipv4ToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, part) => ((acc << 8) + Number(part)) >>> 0, 0);
}

function inCidr4(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const PRIVATE_V4: Array<[string, number]> = [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local + metadata (169.254.169.254)
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
];

// true para endereços que NÃO são roteáveis publicamente (v4 e v6, inclusive v4-mapeado).
export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return PRIVATE_V4.some(([b, bits]) => inCidr4(ip, b, bits));
  if (kind !== 6) return true; // não é IP válido → trata como bloqueado
  const lower = ip.toLowerCase();
  // v4 mapeado (::ffff:a.b.c.d) ou v4 compatível
  const mapped = lower.match(/^(?:0*:)*ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (lower === '::' || lower === '::1') return true;
  const first = lower.split(':')[0];
  const firstNum = parseInt(first || '0', 16);
  if ((firstNum & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
  if ((firstNum & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((firstNum & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (lower.startsWith('2001:db8:')) return true; // documentação
  if (lower.startsWith('64:ff9b:')) return true; // NAT64 (pode mapear v4 privado)
  return false;
}

export function parseEgressUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new EgressBlockedError('URL inválida');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new EgressBlockedError(
      `esquema "${url.protocol}" não permitido (use http/https)`,
    );
  }
  if (url.username || url.password) {
    throw new EgressBlockedError(
      'URL com credenciais embutidas não é permitida',
    );
  }
  if (!url.hostname) throw new EgressBlockedError('URL sem host');
  return url;
}

export interface EgressCheckOptions {
  // Host que NÃO resolve: 'block' (default — na entrega, sem endereço não há para onde ir) ou
  // 'allow' (no CADASTRO de webhook: o DNS do integrador pode ainda não existir; a entrega
  // revalida de qualquer forma).
  dnsFailure?: 'block' | 'allow';
}

// Resolve o host e recusa destinos privados (salvo allowlist). Sem rede quando o host é IP literal.
export async function assertEgressAllowed(
  url: URL,
  policy: EgressPolicy,
  opts: EgressCheckOptions = {},
): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (policy.allowPrivate || policy.allowHosts.has(host)) return;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    throw new EgressBlockedError(`destino "${host}" não é público`);
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new EgressBlockedError(
        `destino ${host} é um endereço privado/reservado`,
      );
    }
    return;
  }
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true, verbatim: true });
  } catch (e) {
    if (opts.dnsFailure === 'allow') return;
    throw new EgressBlockedError(
      `não resolvi o host "${host}": ${(e as Error).message}`,
    );
  }
  if (!addrs.length)
    throw new EgressBlockedError(`host "${host}" sem endereço`);
  const bad = addrs.find((a) => isPrivateAddress(a.address));
  if (bad) {
    throw new EgressBlockedError(
      `host "${host}" resolve para endereço privado/reservado (${bad.address})`,
    );
  }
}

export interface SafeFetchOptions {
  policy: EgressPolicy;
  maxBytes: number;
  timeoutMs?: number;
  maxRedirects?: number;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

export interface SafeFetchResult {
  status: number;
  headers: Headers;
  body: Buffer;
  finalUrl: string;
}

export class BodyTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`corpo excede o teto de ${maxBytes} bytes`);
    this.name = 'BodyTooLargeError';
  }
}

// fetch com política de egress, redirects validados e corpo lido em FLUXO com teto de bytes
// (aborta no primeiro chunk que ultrapassa — nunca aloca o corpo inteiro para depois medir).
export async function safeFetch(
  raw: string,
  opts: SafeFetchOptions,
): Promise<SafeFetchResult> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const maxRedirects = opts.maxRedirects ?? 3;
  let url = parseEgressUrl(raw);
  for (let hop = 0; ; hop++) {
    await assertEgressAllowed(url, opts.policy);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: opts.method ?? 'GET',
        headers: opts.headers,
        body: opts.body,
        redirect: 'manual',
        signal: controller.signal,
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        await res.body?.cancel().catch(() => undefined);
        if (!loc)
          return {
            status: res.status,
            headers: res.headers,
            body: Buffer.alloc(0),
            finalUrl: url.href,
          };
        if (hop >= maxRedirects) {
          throw new EgressBlockedError(
            `redirecionamentos demais (>${maxRedirects})`,
          );
        }
        url = parseEgressUrl(new URL(loc, url).href);
        continue;
      }
      const declared = Number(res.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > opts.maxBytes) {
        await res.body?.cancel().catch(() => undefined);
        throw new BodyTooLargeError(opts.maxBytes);
      }
      const chunks: Buffer[] = [];
      let total = 0;
      if (res.body) {
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > opts.maxBytes) {
            await reader.cancel().catch(() => undefined);
            throw new BodyTooLargeError(opts.maxBytes);
          }
          chunks.push(Buffer.from(value));
        }
      }
      return {
        status: res.status,
        headers: res.headers,
        body: Buffer.concat(chunks, total),
        finalUrl: url.href,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
