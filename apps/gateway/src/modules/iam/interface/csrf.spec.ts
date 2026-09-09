import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertCsrfSafe, csrfVerdict, parseAllowedOrigins } from './csrf';

const allowed = parseAllowedOrigins(
  'https://conexozenvo.cloud, https://www.conexozenvo.cloud/,http://localhost:5173',
);

describe('parseAllowedOrigins', () => {
  it('normaliza (trim, minúsculas, sem barra final) e ignora vazios', () => {
    expect(allowed).toEqual([
      'https://conexozenvo.cloud',
      'https://www.conexozenvo.cloud',
      'http://localhost:5173',
    ]);
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins(',,')).toEqual([]);
  });
});

describe('csrfVerdict', () => {
  it('métodos seguros passam sempre, mesmo com Origin estranha', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS', 'get']) {
      expect(
        csrfVerdict(
          {
            method,
            origin: 'https://evil.example',
            secFetchSite: 'cross-site',
          },
          allowed,
        ),
      ).toBe('ok');
    }
  });

  it('Origin na allowlist passa (case-insensitive, barra final tolerada)', () => {
    expect(
      csrfVerdict(
        {
          method: 'POST',
          origin: 'https://Conexozenvo.cloud/',
          secFetchSite: 'same-site',
        },
        allowed,
      ),
    ).toBe('ok');
  });

  it('Origin fora da allowlist (inclusive origem irmã same-site) é rejeitada', () => {
    expect(
      csrfVerdict(
        {
          method: 'POST',
          origin: 'https://evil.conexozenvo.cloud',
          secFetchSite: 'same-site',
        },
        allowed,
      ),
    ).toBe('origin-not-allowed');
    expect(
      csrfVerdict(
        {
          method: 'DELETE',
          origin: 'https://evil.example',
          secFetchSite: undefined,
        },
        allowed,
      ),
    ).toBe('origin-not-allowed');
  });

  it('Origin "null" (sandbox/data:) é rejeitada', () => {
    expect(
      csrfVerdict(
        { method: 'POST', origin: 'null', secFetchSite: undefined },
        allowed,
      ),
    ).toBe('origin-not-allowed');
  });

  it('sem Origin: Sec-Fetch-Site decide — same-origin/none passam, cross-site/same-site não', () => {
    expect(
      csrfVerdict(
        { method: 'POST', origin: undefined, secFetchSite: 'same-origin' },
        allowed,
      ),
    ).toBe('ok');
    expect(
      csrfVerdict(
        { method: 'POST', origin: undefined, secFetchSite: 'none' },
        allowed,
      ),
    ).toBe('ok');
    expect(
      csrfVerdict(
        { method: 'POST', origin: undefined, secFetchSite: 'cross-site' },
        allowed,
      ),
    ).toBe('cross-site');
    expect(
      csrfVerdict(
        { method: 'PUT', origin: undefined, secFetchSite: 'same-site' },
        allowed,
      ),
    ).toBe('cross-site');
  });

  it('cliente não-browser (sem Origin e sem Sec-Fetch-Site) passa — não existe CSRF sem browser', () => {
    expect(
      csrfVerdict(
        { method: 'POST', origin: undefined, secFetchSite: undefined },
        allowed,
      ),
    ).toBe('ok');
    expect(
      csrfVerdict(
        { method: 'POST', origin: '', secFetchSite: undefined },
        allowed,
      ),
    ).toBe('ok');
  });

  it('header em array (duplicado) usa o primeiro valor', () => {
    expect(
      csrfVerdict(
        {
          method: 'POST',
          origin: ['https://evil.example', 'https://conexozenvo.cloud'],
          secFetchSite: undefined,
        },
        allowed,
      ),
    ).toBe('origin-not-allowed');
  });
});

describe('assertCsrfSafe', () => {
  it('lança 403 com mensagem distinta por motivo', () => {
    expect(() =>
      assertCsrfSafe(
        { method: 'POST', headers: { origin: 'https://evil.example' } },
        allowed,
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertCsrfSafe(
        { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } },
        allowed,
      ),
    ).toThrow(/cross-site/);
    expect(() =>
      assertCsrfSafe(
        { method: 'POST', headers: { origin: 'https://conexozenvo.cloud' } },
        allowed,
      ),
    ).not.toThrow();
  });
});
