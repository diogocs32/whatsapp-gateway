// Content-Disposition do GET /:msgId/media (E23). O Node só aceita num header TAB, 0x20-0x7E e
// 0x80-0xFF — fora disso lança ERR_INVALID_CHAR (Node 26 `http.validateHeaderValue`,
// nodejs.org/docs/latest-v26.x/api/http.html; conferido em execução no v26.0.0), e um documento
// com –, aspas curvas, … ou emoji no nome derrubava a rota com 500. Nome que o Node aceita e que
// não tem `% \ ; =` → EXATAMENTE o header de antes (zero mudança para o n8n). Fora disso →
// `filename` com fallback ASCII + `filename*` UTF-8 (RFC 5987 §3.2); MDN Content-Disposition:
// "filename* is preferred over filename when both are understood. It's recommended to include both
// for maximum compatibility". Aspas/CR/LF saem sempre, como antes.
const HEADER_SAFE = /^[\t\x20-\x7e\x80-\xff]*$/;
// Revisão E23 (CD-1): cabem no header, mas o parser do n8n (n8n-core 1.117.0,
// parse-incoming-message.js:5-43) divide por `;` e `=` SEM respeitar aspas e faz decodeURIComponent
// em todo parâmetro: `%` solto lançava "URI malformed", `%41` virava `A`, `a;b`/`a=b` viravam `"a`.
// `\` abre quoted-pair no quoted-string. Esses nomes vão pelo filename* (que o n8n 1.x e 2.x leem
// primeiro) e, no fallback, os quatro viram `_` — quem ignora filename* lê o fallback inteiro.
const NAIVE_PARSER_UNSAFE = /[%\\;=]/;

export function inlineDisposition(
  fileName: string | null | undefined,
): string | undefined {
  const name = fileName?.replace(/["\r\n]/g, '') || null;
  if (!name) return undefined;
  if (HEADER_SAFE.test(name) && !NAIVE_PARSER_UNSAFE.test(name)) {
    return `inline; filename="${name}"`;
  }
  // Fallback: 1 `_` por code point não-ASCII (flag u: o emoji é UM caractere) e por `% \ ; =`
  // (MDN: escape percentual em `filename` é lido de forma diferente por cada navegador).
  const ascii = name.replace(/[^\x20-\x7e]|[%\\;=]/gu, '_');
  return `inline; filename="${ascii}"; filename*=UTF-8''${rfc5987(name)}`;
}

// MDN encodeURIComponent → encodeRFC5987ValueChars: o encodeURIComponent deixa passar ' ( ) *, que
// o attr-char do RFC 5987 não aceita. Substituto solitário vira U+FFFD antes (senão URIError).
const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function rfc5987(value: string): string {
  return encodeURIComponent(
    value.replace(LONE_SURROGATE, String.fromCharCode(0xfffd)),
  ).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// Content-Type do GET /:msgId/media (E23 — mesma classe do Content-Disposition acima): o mimetype
// vem do REMETENTE (proto do WhatsApp, gravado como veio — e é o mesmo ContentType do objeto no S3)
// e um valor fora do que o Node aceita num header (não-Latin-1, CR/LF) derrubava a rota com 500
// ERR_INVALID_CHAR. Aceita só `tipo/subtipo` com parâmetros simples (ex.: `audio/ogg; codecs=opus`)
// — RFC 9110 §8.3.1 (token / quoted-string); o resto → null e o chamador cai no próximo candidato.
const TOKEN = String.raw`[a-z0-9!#$%&'*+.^_\`|~-]+`;
const QUOTED = String.raw`"[\x20\x21\x23-\x5b\x5d-\x7e]*"`;
const MIME_RE = new RegExp(
  String.raw`^${TOKEN}/${TOKEN}(?:\s*;\s*${TOKEN}=(?:${TOKEN}|${QUOTED}))*$`,
  'i',
);

export function safeContentType(
  mimetype: string | null | undefined,
): string | null {
  const t = mimetype?.trim();
  return t && t.length <= 255 && MIME_RE.test(t) ? t : null;
}
