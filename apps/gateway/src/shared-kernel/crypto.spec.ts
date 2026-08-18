import { describe, expect, it } from 'vitest';
import { hashPassword, hmacSha512, sha512, verifyPassword } from './crypto';

// Testes unitários do shared-kernel de crypto. Os vetores fixos de HMAC/SHA-512 são CONTRATO:
// o envelope de webhook assinado (INTEGRACAO.md — HMAC-SHA512 hex) e o hash de API key são
// verificados por consumidores externos (node n8n). Se um refactor mudar algoritmo/encoding,
// estes testes quebram ANTES de quebrar os integradores.

describe('hashPassword / verifyPassword (scrypt)', () => {
  it('roundtrip: senha correta verifica', async () => {
    const stored = await hashPassword('s3nh4-f0rte!');
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/); // salt hex 16B : chave hex 64B
    expect(await verifyPassword('s3nh4-f0rte!', stored)).toBe(true);
  });

  it('senha errada não verifica', async () => {
    const stored = await hashPassword('correta');
    expect(await verifyPassword('errada', stored)).toBe(false);
  });

  it('mesma senha gera hashes diferentes (salt aleatório)', async () => {
    const a = await hashPassword('mesma');
    const b = await hashPassword('mesma');
    expect(a).not.toBe(b);
    expect(await verifyPassword('mesma', a)).toBe(true);
    expect(await verifyPassword('mesma', b)).toBe(true);
  });

  it('valor armazenado malformado devolve false (sem lançar)', async () => {
    expect(await verifyPassword('x', 'sem-separador')).toBe(false);
    expect(await verifyPassword('x', ':')).toBe(false);
    expect(await verifyPassword('x', '')).toBe(false);
  });
});

describe('hmacSha512 — assinatura de webhook (vetor fixo = contrato com integradores)', () => {
  it('produz o hex conhecido para secret+payload de referência', () => {
    const payload = '{"id":"01ABC","event":"message.received"}';
    expect(hmacSha512('segredo-webhook', payload)).toBe(
      'dd7b887219c9e0ed582d0fad39aa6fc7be9900b20bdd1f55ddb4a6bbcaea0345' +
        'e5c15e1169241a7c20317dd92fcc6967a86b43775ff858f00ced8d1a68f16aaa',
    );
  });

  it('secrets diferentes → assinaturas diferentes', () => {
    expect(hmacSha512('a', 'payload')).not.toBe(hmacSha512('b', 'payload'));
  });
});

describe('sha512 — hash de API key (vetor fixo = contrato)', () => {
  it('produz o hex conhecido para a key de referência', () => {
    expect(sha512('cz_teste123')).toBe(
      '158d675be5cef4d821c31da8f17f27b84da16875d9d46daf9f1095848f64aa18' +
        'b8d113d4e7a16717da8c76a2e255cd263ce00ed9973aed58c63995a1ba28a2f7',
    );
  });

  it('é determinístico e sensível a 1 caractere', () => {
    expect(sha512('cz_teste123')).toBe(sha512('cz_teste123'));
    expect(sha512('cz_teste124')).not.toBe(sha512('cz_teste123'));
  });
});
