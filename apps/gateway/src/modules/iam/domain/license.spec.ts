import { describe, expect, it, vi } from 'vitest';
import {
  COMMUNITY_LICENSE,
  LICENSE_PREFIX,
  verifyLicense,
  type LicenseClaims,
} from './license';

// Chave PÚBLICA do vetor TEST 1 de RFC 8032, §7.1. Só a chave embutida é
// substituída: createPublicKey/verify continuam sendo os reais de node:crypto.
vi.mock('./license-key', () => ({
  LICENSE_PUBLIC_KEY_PEM: `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=
-----END PUBLIC KEY-----
`,
}));

const EXP_MS = 1_702_592_000_123;
const CLAIMS: LicenseClaims = {
  licenseId: '00000000-0000-4000-8000-000000000022',
  customer: 'Cliente sintético',
  maxSeats: 3,
  maxSessions: 5,
  features: ['campaigns', 'multiengine'],
  iat: 1_700_000_000_123,
  exp: EXP_MS,
};
const EXPECTED_COMMUNITY = {
  licenseId: 'community',
  customer: 'Community',
  maxSeats: 1,
  maxSessions: 1,
  features: [],
  iat: 0,
  exp: null,
  valid: false,
  community: true,
};

// Vetores fixos emitidos por scripts/issue-license.mjs com --days 30/perpetual,
// --customer "Cliente sintético" --seats 3 --sessions 5 e os features acima.
// A geração isolada fixou Date.now/randomUUID e usou --key temporária com a
// seed pública de teste RFC 8032; nenhum material privado fica neste spec.
const PAYLOAD =
  'eyJsaWNlbnNlSWQiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMjIiLCJjdXN0b21lciI6IkNsaWVudGUgc2ludMOpdGljbyIsIm1heFNlYXRzIjozLCJtYXhTZXNzaW9ucyI6NSwiZmVhdHVyZXMiOlsiY2FtcGFpZ25zIiwibXVsdGllbmdpbmUiXSwiaWF0IjoxNzAwMDAwMDAwMTIzLCJleHAiOjE3MDI1OTIwMDAxMjN9';
const SIGNATURE =
  'mvd_eVBlSDNAQSHn3B_DgtMGw3QZFD0H7JBRTw4Jk6RjxMncbmqYIZGlIpz9R-uU7OtwaGjUrFTqizEcKpUHCQ';
const TOKEN = `CZL1.${PAYLOAD}.${SIGNATURE}`;
const PERPETUAL_TOKEN =
  'CZL1.eyJsaWNlbnNlSWQiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMjIiLCJjdXN0b21lciI6IkNsaWVudGUgc2ludMOpdGljbyIsIm1heFNlYXRzIjozLCJtYXhTZXNzaW9ucyI6NSwiZmVhdHVyZXMiOlsiY2FtcGFpZ25zIiwibXVsdGllbmdpbmUiXSwiaWF0IjoxNzAwMDAwMDAwMTIzLCJleHAiOm51bGx9.gPczlluqb5kMDn6sMyN2PZ6Qfc_K9-2AILSpQveWwSGl-pMM0S4O029sPyOpwQV9N4v9WdY42uAAgN1-d1fICQ';

function expectCommunity(
  token: string | null | undefined,
  reason: string,
  nowMs = EXP_MS - 1,
) {
  expect(verifyLicense(token, nowMs)).toEqual({
    ...EXPECTED_COMMUNITY,
    reason,
  });
}

describe('verifyLicense — Ed25519/P-022', () => {
  it('confere a assinatura real do emissor e preserva todos os claims/limites', () => {
    expect(LICENSE_PREFIX).toBe('CZL1');
    expect(verifyLicense(TOKEN, CLAIMS.iat)).toEqual({
      ...CLAIMS,
      valid: true,
      community: false,
    });
  });

  it('aceita espaços externos ao token emitido', () => {
    expect(verifyLicense(` \t${TOKEN}\n `, CLAIMS.iat)).toEqual({
      ...CLAIMS,
      valid: true,
      community: false,
    });
  });

  it('mantém os limites mínimos do modo comunidade', () => {
    expect(COMMUNITY_LICENSE).toEqual(EXPECTED_COMMUNITY);
  });

  it.each([null, undefined, '', ' ', '\t\n'])(
    'licença ausente/branca (%j) retorna comunidade sem lançar',
    (token) => expectCommunity(token, 'sem licença'),
  );

  it.each([
    ['prefixo diferente', `CZL2.${PAYLOAD}.${SIGNATURE}`],
    ['prefixo minúsculo', `czl1.${PAYLOAD}.${SIGNATURE}`],
    ['sem prefixo', `${PAYLOAD}.${SIGNATURE}`],
    ['uma parte', 'CZL1'],
    ['duas partes', `CZL1.${PAYLOAD}`],
    ['quatro partes', `${TOKEN}.extra`],
  ])('rejeita formato inválido: %s', (_case, token) => {
    expectCommunity(token, 'formato inválido');
  });

  it.each([
    ['customer', { ...CLAIMS, customer: 'Outro cliente' }],
    ['maxSeats', { ...CLAIMS, maxSeats: 300 }],
    ['maxSessions', { ...CLAIMS, maxSessions: 500 }],
    ['features', { ...CLAIMS, features: ['admin'] }],
    ['exp', { ...CLAIMS, exp: null }],
  ])('rejeita adulteração de %s mantendo a assinatura', (_case, claims) => {
    const tamperedPayload = Buffer.from(JSON.stringify(claims)).toString(
      'base64url',
    );
    expectCommunity(
      `CZL1.${tamperedPayload}.${SIGNATURE}`,
      'assinatura inválida',
    );
  });

  it('rejeita assinatura com um byte adulterado', () => {
    const signature = Buffer.from(SIGNATURE, 'base64url');
    signature[0] ^= 1;
    expectCommunity(
      `CZL1.${PAYLOAD}.${signature.toString('base64url')}`,
      'assinatura inválida',
    );
  });

  it('rejeita assinatura Ed25519 válida produzida por outra chave', () => {
    // Mesmos bytes de PAYLOAD assinados pela chave pública TEST 2 de RFC 8032.
    const otherSignature =
      'c3-hpUCo9riT8lrqofYeTcpwCGAr8gUD4U1pfk8e5UMMdWyt5hR0avVKdXqnXr4Cm_V56Xd3sRM0WA-L7MjmBg';
    expectCommunity(`CZL1.${PAYLOAD}.${otherSignature}`, 'assinatura inválida');
  });

  it('confere os bytes base64url, sem aceitar assinatura sobre JSON decodificado', () => {
    const decodedSignature =
      'GFM_o08gydqCDHNBZ23LpGm4rjmwmUO_3e8LU7a9Rz5_0VaDpHts-0VlC8yg-nmkfNli41E5y7HgLqQOuM3EAg';
    expectCommunity(
      `CZL1.${PAYLOAD}.${decodedSignature}`,
      'assinatura inválida',
    );
  });

  it.each(['', '!', 'AA', SIGNATURE.slice(0, -2)])(
    'assinatura vazia/malformada/truncada (%j) retorna comunidade sem lançar',
    (signature) => {
      expectCommunity(`CZL1.${PAYLOAD}.${signature}`, 'assinatura inválida');
    },
  );

  it('JSON inválido com assinatura correta cai no fallback sem lançar', () => {
    // PAYLOAD representa {"licenseId":, assinado pelos mesmos bytes base64url.
    const invalidJsonToken =
      'CZL1.eyJsaWNlbnNlSWQiOg.7eEV2OsHP-7d6ZszfNt3n-y7qhS3Qzyi5-3hlN99SzQNGehloDfHLW_VYcKgyqi3rYOZZ4HkWn7P60DVvuGTAQ';
    expectCommunity(invalidJsonToken, 'falha ao validar');
  });

  it.each([EXP_MS - 1, EXP_MS])(
    'licença está válida em %i ms (antes/no instante exato de exp)',
    (nowMs) => {
      expect(verifyLicense(TOKEN, nowMs)).toEqual({
        ...CLAIMS,
        valid: true,
        community: false,
      });
    },
  );

  it('expira um milissegundo após exp e retira todos os claims pagos', () => {
    expectCommunity(TOKEN, 'licença expirada', EXP_MS + 1);
  });

  it('exp null permanece perpétua mesmo após a expiração do outro vetor', () => {
    expect(verifyLicense(PERPETUAL_TOKEN, Number.MAX_SAFE_INTEGER)).toEqual({
      ...CLAIMS,
      exp: null,
      valid: true,
      community: false,
    });
  });
});
