import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

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

// Faixas bloqueadas (P-065): registros de endereços especiais da IANA (IPv4 e IPv6 — "Globally
// Reachable" False/N/A) + tudo o que EMBUTE um IPv4. Avaliadas com `net.BlockList` do Node, que
// casa o IPv4-mapeado em QUALQUER grafia (`::ffff:7f00:1`, `::ffff:127.0.0.1`) com as regras
// IPv4 (doc do Node 26, net.md "blockList.check": "IPv6 notation for IPv4 addresses works"). A
// regex antiga só via a forma pontuada — o URL do WHATWG normaliza `[::ffff:127.0.0.1]` para
// `[::ffff:7f00:1]`, que passava como público.
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // RFC 1918
  ['100.64.0.0', 10], // CGNAT (RFC 6598)
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local + metadata (169.254.169.254)
  ['172.16.0.0', 12], // RFC 1918
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1 (RFC 5737)
  ['192.88.99.0', 24], // anycast 6to4, deprecado (RFC 7526)
  ['192.168.0.0', 16], // RFC 1918
  ['198.18.0.0', 15], // benchmarking (RFC 2544)
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reservado + broadcast
];

// IPv6: só 2000::/3 é unicast global (IANA ipv6-address-space); fora dele, tudo bloqueado.
// ⚠️ NUNCA adicionar regra IPv6 que contenha ::ffff:0:0/96 (ex.: `::/8`, `::/80`, `::ffff:0:0/96`):
// a BlockList a aplica a TODO IPv4 e o egress inteiro para (8.8.8.8 bloqueado) — o spec tem guarda.
const BLOCKED_V6: ReadonlyArray<readonly [string, number]> = [
  ['100::', 8], // 0100::/8 (inclui 100::/64 discard, RFC 6666)
  ['200::', 7],
  ['400::', 6],
  ['800::', 5],
  ['1000::', 4], // restante de 0000::/3 (reservado IETF)
  ['2001::', 23], // IETF protocol assignments (Teredo 2001::/32 embute IPv4, benchmarking 2001:2::/48)
  ['2001:db8::', 32], // documentação (RFC 3849)
  ['2002::', 16], // 6to4 (RFC 3056 — embute IPv4)
  ['3fff::', 20], // documentação (RFC 9637)
  ['4000::', 2], // 4000::/3 e 6000::/3 (reservados; inclui 5f00::/16 SRv6)
  ['8000::', 1], // 8000::–ffff:: (fc00::/7 ULA, fe80::/10 link-local, fec0::/10, ff00::/8 multicast)
];

const BLOCKED = new BlockList();
for (const [net, prefix] of BLOCKED_V4) BLOCKED.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of BLOCKED_V6) BLOCKED.addSubnet(net, prefix, 'ipv6');
// 0000::/8 SEM o ::ffff:0:0/96 (que já segue as regras IPv4 acima): cobre ::, ::1, ::/96
// IPv4-compatível (deprecado, RFC 4291 §2.5.5.1), ::ffff:0:0:0/96 IPv4-traduzido (RFC 2765) e o
// NAT64 64:ff9b::/96 + 64:ff9b:1::/48 (RFC 6052/8215 — embutem IPv4).
BLOCKED.addRange('::', '::fffe:ffff:ffff', 'ipv6');
BLOCKED.addRange('::1:0:0:0', 'ff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'ipv6');

// true para endereços que NÃO são roteáveis publicamente (v4 e v6, inclusive v4-mapeado).
export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 0) return true; // não é IP válido → bloqueado (check() devolveria false)
  if (ip.includes('%')) return true; // zone id (fe80::1%eth0) = escopo de enlace
  // A família vem do isIP: check() com a família trocada devolve false calado.
  return BLOCKED.check(ip, kind === 4 ? 'ipv4' : 'ipv6');
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

// Imagem por URL do integrador (foto de grupo e foto de perfil — P-070): mesma política de egress e
// mesmo teto em fluxo do media-url. Antes as duas rotas usavam fetch cru — sem política nenhuma
// (http://127.0.0.1/ e metadata passavam) e com o corpo inteiro na memória antes de medir.
// Lança Error com a mensagem pronta para o 400 do controller.
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export async function fetchImageByUrl(
  raw: string,
  policy: EgressPolicy = egressPolicyFromEnv(),
): Promise<{ buffer: Buffer; mimetype: string }> {
  let res: SafeFetchResult;
  try {
    res = await safeFetch(raw, {
      policy,
      maxBytes: PHOTO_MAX_BYTES,
      timeoutMs: 20_000,
    });
  } catch (e) {
    if (e instanceof EgressBlockedError) {
      throw new Error(`URL da imagem recusada: ${e.message}`);
    }
    if (e instanceof BodyTooLargeError) {
      throw new Error('imagem acima de 10 MB');
    }
    throw new Error(`não consegui baixar a imagem: ${(e as Error).message}`);
  }
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`não consegui baixar a imagem: HTTP ${res.status}`);
  }
  return {
    buffer: res.body,
    mimetype: res.headers.get('content-type')?.split(';')[0] || 'image/jpeg',
  };
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
