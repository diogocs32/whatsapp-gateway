import { describe, expect, it } from 'vitest';
import { clampInt } from './query-int';

describe('clampInt', () => {
  it('ausente ou inválido → default', () => {
    expect(clampInt(undefined, 50, 1, 200)).toBe(50);
    expect(clampInt('', 50, 1, 200)).toBe(50);
    expect(clampInt('abc', 50, 1, 200)).toBe(50);
  });

  it('clampa em [min, max] e arredonda para baixo', () => {
    expect(clampInt('-5', 50, 1, 200)).toBe(1);
    expect(clampInt('0', 50, 1, 200)).toBe(1);
    expect(clampInt('9999', 50, 1, 200)).toBe(200);
    expect(clampInt('7.9', 50, 1, 200)).toBe(7);
    expect(clampInt(120, 50, 1, 200)).toBe(120);
  });
});
