import { validateHeaderValue } from 'node:http';
import { describe, expect, it } from 'vitest';
import { inlineDisposition, safeContentType } from './content-disposition';

// E23 — Content-Disposition do GET /:msgId/media. Nome que o Node aceita num header → EXATAMENTE o
// de antes (zero mudança para o n8n); fora disso (–, aspas curvas, …, emoji) o Node recusava o
// header (ERR_INVALID_CHAR → 500) e agora vai fallback ASCII + filename* (RFC 5987).
describe('inlineDisposition', () => {
  it('sem nome (ou só aspas/quebras) → sem header, como antes', () => {
    expect(inlineDisposition(null)).toBeUndefined();
    expect(inlineDisposition(undefined)).toBeUndefined();
    expect(inlineDisposition('')).toBeUndefined();
    expect(inlineDisposition('"\r\n')).toBeUndefined();
  });

  it('ASCII e Latin-1 → header idêntico ao de antes (aspas/CR/LF removidos)', () => {
    expect(inlineDisposition('foto.png')).toBe('inline; filename="foto.png"');
    expect(inlineDisposition('relatório março.pdf')).toBe(
      'inline; filename="relatório março.pdf"',
    );
    expect(inlineDisposition('a"b\r\nc.pdf')).toBe(
      'inline; filename="abc.pdf"',
    );
  });

  it('travessão → fallback ASCII com _ + filename* UTF-8 percent-encoded', () => {
    expect(inlineDisposition('relatório – março.pdf')).toBe(
      `inline; filename="relat_rio _ mar_o.pdf"; filename*=UTF-8''relat%C3%B3rio%20%E2%80%93%20mar%C3%A7o.pdf`,
    );
  });

  it('emoji (par substituto) vira UM _ no fallback e 4 bytes no filename*', () => {
    expect(inlineDisposition('foto 😀.png')).toBe(
      `inline; filename="foto _.png"; filename*=UTF-8''foto%20%F0%9F%98%80.png`,
    );
  });

  it("filename* escapa o que o encodeURIComponent deixa passar e o RFC 5987 não aceita: ' ( ) *", () => {
    expect(inlineDisposition("proposta (v2) – 'final'*.pdf")).toBe(
      `inline; filename="proposta (v2) _ 'final'*.pdf"; filename*=UTF-8''proposta%20%28v2%29%20%E2%80%93%20%27final%27%2A.pdf`,
    );
  });

  it('fallback sem % nem \\ (evita escape ambíguo no quoted-string/navegador)', () => {
    expect(inlineDisposition('100% \\ “ok”.pdf')).toBe(
      `inline; filename="100_ _ _ok_.pdf"; filename*=UTF-8''100%25%20%5C%20%E2%80%9Cok%E2%80%9D.pdf`,
    );
  });

  it('substituto solitário (nome malformado) não lança URIError', () => {
    expect(inlineDisposition('a\uD800b.pdf')).toBe(
      `inline; filename="a_b.pdf"; filename*=UTF-8''a%EF%BF%BDb.pdf`,
    );
  });

  // Revisão E23 (CD-1): Latin-1 com `%`, `\`, `;` ou `=` passava inalterado e o n8n (que faz
  // decodeURIComponent em todo parâmetro e divide por `;`/`=` sem respeitar aspas) lançava "URI
  // malformed", renomeava (`%41` → `A`) ou truncava (`a;b` → `"a`). Agora vai fallback + filename*.
  it('Latin-1 com % \\ ; = → fallback (esses caracteres viram _) + filename*', () => {
    expect(inlineDisposition('100% pago.pdf')).toBe(
      `inline; filename="100_ pago.pdf"; filename*=UTF-8''100%25%20pago.pdf`,
    );
    expect(inlineDisposition('a;b.pdf')).toBe(
      `inline; filename="a_b.pdf"; filename*=UTF-8''a%3Bb.pdf`,
    );
    expect(inlineDisposition('a=b.pdf')).toBe(
      `inline; filename="a_b.pdf"; filename*=UTF-8''a%3Db.pdf`,
    );
    expect(inlineDisposition('c:\\x\\y.pdf')).toBe(
      `inline; filename="c:_x_y.pdf"; filename*=UTF-8''c%3A%5Cx%5Cy.pdf`,
    );
    expect(inlineDisposition('%41.pdf')).toBe(
      `inline; filename="_41.pdf"; filename*=UTF-8''%2541.pdf`,
    );
  });

  it('Latin-1 sem esses caracteres segue idêntico (apóstrofo incluso)', () => {
    expect(inlineDisposition("João's notas.pdf")).toBe(
      `inline; filename="João's notas.pdf"`,
    );
  });

  it('n8n (parser real, transcrito) recebe o nome exato — e sem filename* o fallback não quebra', () => {
    const nomes = [
      'foto.png',
      'relatório março.pdf',
      "João's notas.pdf",
      '100% pago.pdf',
      'Desconto 50%.pdf',
      '%41.pdf',
      'Arquivo%20final.pdf',
      'a;b.pdf',
      'a=b.pdf',
      'c:\\x\\y.pdf',
      'relatório – março.pdf',
      'foto 😀.png',
    ];
    for (const n of nomes) {
      const h = inlineDisposition(n) as string;
      expect(n8nFilename(h)).toBe(n);
      // Cliente que ignora filename*: lê o fallback INTEIRO — sem exceção e sem cortar em `;`/`=`.
      const semEstrela = h.replace(/; filename\*=.*$/, '');
      expect(n8nFilename(semEstrela)).toBe(/filename="([^"]*)"/.exec(h)?.[1]);
    }
  });

  it('toda saída passa na validação de header do Node (http.validateHeaderValue)', () => {
    const nomes = [
      'foto.png',
      'relatório março.pdf',
      'relatório – março.pdf',
      'foto 😀.png',
      '“aspas curvas”….docx',
      'ctrl\u0001\u007f.txt',
      'a\uD800b.pdf',
      '日本語.pdf',
      '100% pago.pdf',
      'a;b=c\\d.pdf',
    ];
    for (const n of nomes) {
      const h = inlineDisposition(n);
      expect(h).toBeTypeOf('string');
      expect(() =>
        validateHeaderValue('content-disposition', h as string),
      ).not.toThrow();
    }
  });
});

// Consumidor real: transcrição literal de parseContentDisposition do n8n-core 1.117.0 (n8n 1.118.1,
// dist/execution-engine/node-execution-context/utils/parse-incoming-message.js:5-43): divide o
// header por `;` e cada parâmetro por `=` SEM respeitar aspas, faz decodeURIComponent em tudo e
// pega o nome do filename* com split("'"). Limitação DELE, fora do nosso alcance: nome não-Latin-1
// COM apóstrofo sai cortado no apóstrofo (o %27 é decodificado antes do split).
function n8nFilename(header: string): string | undefined {
  const [, ...params] = header.split(';');
  const acc: Record<string, string> = {};
  for (const param of params) {
    const [key, value] = param.split('=');
    let v = decodeURIComponent(value).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    acc[key.toLowerCase().trim()] = v;
  }
  const wildcard = acc['filename*'];
  return wildcard ? wildcard.split("'")[2] : acc.filename;
}

// E23 — Content-Type do GET /:msgId/media: o mimetype vem do remetente e um valor que não cabe num
// header derrubava a rota (500). Só `tipo/subtipo` com parâmetros simples passa (RFC 9110 §8.3.1).
describe('safeContentType', () => {
  it('tipos legítimos passam (com parâmetros, aspas e espaços nas pontas)', () => {
    for (const t of [
      'audio/ogg; codecs=opus',
      'audio/ogg;codecs=opus',
      'image/jpeg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain; charset="utf-8"',
      'application/was',
    ]) {
      expect(safeContentType(t)).toBe(t);
    }
    expect(safeContentType('  image/png  ')).toBe('image/png');
  });
  it('inválido → null (CR/LF, não-ASCII, composto, aspas quebradas, vazio, enorme)', () => {
    for (const t of [
      'image/png\r\nX-Evil: 1',
      'imagem/jpég',
      'video/mp4,text/html',
      'a/b; x="y"z"',
      'semBarra',
      '',
      null,
      undefined,
      `a/${'b'.repeat(300)}`,
    ]) {
      expect(safeContentType(t)).toBeNull();
    }
  });
  it('toda saída não nula passa na validação de header do Node', () => {
    for (const t of ['audio/ogg; codecs=opus', 'text/plain; charset="utf-8"']) {
      const v = safeContentType(t);
      expect(v).not.toBeNull();
      expect(() => validateHeaderValue('content-type', v!)).not.toThrow();
    }
  });
});
