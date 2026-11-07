import { describe, expect, it } from 'vitest';
import { RENAME_INVALID, RENAME_TAKEN, checkRename } from './session-rename';

const list = [
  { id: 'a', name: 'vendas' },
  { id: 'b', name: 'Suporte' },
];
const self = list[0];

describe('session-rename (E30/P-110)', () => {
  it('nome igual (mesmo com espaços em volta) = sem mudança', () => {
    expect(checkRename('vendas', self, list)).toEqual({ kind: 'unchanged' });
    expect(checkRename('  vendas ', self, list)).toEqual({
      kind: 'unchanged',
    });
  });

  it('formato: só letras, números, _ e -, de 1 a 64 (regra do gateway)', () => {
    for (const raw of [
      '',
      '   ',
      'com espaço',
      'acentuação',
      'x'.repeat(65),
      'a.b',
      'a/b',
    ]) {
      expect(checkRename(raw, self, list)).toEqual({
        kind: 'invalid',
        message: RENAME_INVALID,
      });
    }
    expect(checkRename('x'.repeat(64), self, list)).toEqual({
      kind: 'ok',
      name: 'x'.repeat(64),
    });
  });

  it('nome de outra sessão (exato, caixa importa) = em uso; a própria não conta', () => {
    expect(checkRename('Suporte', self, list)).toEqual({
      kind: 'taken',
      message: RENAME_TAKEN,
    });
    expect(checkRename('suporte', self, list)).toEqual({
      kind: 'ok',
      name: 'suporte',
    });
    // Lista velha ainda com o próprio id sob outro nome: não é conflito.
    expect(
      checkRename('vendas-01', self, [...list, { id: 'a', name: 'vendas-01' }]),
    ).toEqual({ kind: 'ok', name: 'vendas-01' });
  });

  it('ok devolve o nome aparado', () => {
    expect(checkRename(' Vendas-SP_2 ', self, list)).toEqual({
      kind: 'ok',
      name: 'Vendas-SP_2',
    });
  });
});
