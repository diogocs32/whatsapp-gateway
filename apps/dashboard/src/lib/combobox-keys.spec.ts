// E28 · P-107 — teclado do seletor de proxy conforme o APG "select-only combobox" (tabela de
// teclas do exemplo oficial), com o desvio do Tab documentado.
import { describe, expect, it } from 'vitest';
import { comboKey, initialActive } from './combobox-keys';

const items = (disabled: number[] = [], n = 5) =>
  Array.from({ length: n }, (_, i) => ({ disabled: disabled.includes(i) }));

const closed = (
  key: string,
  selectedIndex = -1,
  altKey = false,
  list = items(),
) =>
  comboKey({
    open: false,
    key,
    altKey,
    items: list,
    activeIndex: -1,
    selectedIndex,
  });

const opened = (
  key: string,
  activeIndex: number,
  altKey = false,
  list = items(),
) =>
  comboKey({
    open: true,
    key,
    altKey,
    items: list,
    activeIndex,
    selectedIndex: -1,
  });

describe('initialActive', () => {
  it('a escolha atual se habilitada; senão a 1ª habilitada; -1 sem nenhuma', () => {
    expect(initialActive(items(), 3)).toBe(3);
    expect(initialActive(items([3]), 3)).toBe(0);
    expect(initialActive(items([0]), -1)).toBe(1);
    expect(initialActive(items([0, 1, 2, 3, 4]), 2)).toBe(-1);
  });
});

describe('comboKey — fechado', () => {
  it.each(['ArrowDown', 'Enter', ' '])('%s abre na escolha atual', (key) => {
    expect(closed(key, 2)).toEqual({ kind: 'open', active: 2 });
  });

  it('Alt+↓ também abre na escolha atual', () => {
    expect(closed('ArrowDown', 2, true)).toEqual({ kind: 'open', active: 2 });
  });

  it('↓ sem escolha (ou escolha desabilitada) abre na 1ª habilitada', () => {
    expect(closed('ArrowDown')).toEqual({ kind: 'open', active: 0 });
    expect(closed('ArrowDown', 2, false, items([0, 2]))).toEqual({
      kind: 'open',
      active: 1,
    });
  });

  it('↑ e Home abrem na 1ª; End abre na última (pulando desabilitadas)', () => {
    expect(closed('ArrowUp', 3)).toEqual({ kind: 'open', active: 0 });
    expect(closed('Home', 3, false, items([0]))).toEqual({
      kind: 'open',
      active: 1,
    });
    expect(closed('End', 0, false, items([4]))).toEqual({
      kind: 'open',
      active: 3,
    });
  });

  it('outras teclas (Tab, Esc, letras) não fazem nada com a lista fechada', () => {
    for (const key of ['Tab', 'Escape', 'a', 'PageDown']) {
      expect(closed(key)).toEqual({ kind: 'ignore' });
    }
  });
});

describe('comboKey — aberto', () => {
  it.each(['Enter', ' '])('%s escolhe a destacada', (key) => {
    expect(opened(key, 2)).toEqual({ kind: 'choose', index: 2 });
  });

  it('Alt+↑ escolhe a destacada; ↑ sozinho só move', () => {
    expect(opened('ArrowUp', 2, true)).toEqual({ kind: 'choose', index: 2 });
    expect(opened('ArrowUp', 2)).toEqual({ kind: 'move', active: 1 });
  });

  it('Enter sem destaque (ou em desabilitada) só fecha', () => {
    expect(opened('Enter', -1)).toEqual({ kind: 'close', prevent: true });
    expect(opened('Enter', 1, false, items([1]))).toEqual({
      kind: 'close',
      prevent: true,
    });
  });

  it('setas, Home/End e PageUp/PageDown movem pulando desabilitadas', () => {
    expect(opened('ArrowDown', 0, false, items([1]))).toEqual({
      kind: 'move',
      active: 2,
    });
    expect(opened('End', 0)).toEqual({ kind: 'move', active: 4 });
    expect(opened('Home', 4)).toEqual({ kind: 'move', active: 0 });
    expect(opened('PageDown', 0, false, items([], 30))).toEqual({
      kind: 'move',
      active: 10,
    });
    expect(opened('PageUp', 25, false, items([], 30))).toEqual({
      kind: 'move',
      active: 15,
    });
  });

  it('↓ na última fica na última (sem dar a volta)', () => {
    expect(opened('ArrowDown', 4)).toEqual({ kind: 'move', active: 4 });
  });

  it('Esc fecha com preventDefault; Tab fecha SEM escolher e deixa o foco seguir', () => {
    expect(opened('Escape', 2)).toEqual({ kind: 'close', prevent: true });
    expect(opened('Tab', 2)).toEqual({ kind: 'close', prevent: false });
  });

  it('letras não fazem nada (sem busca por digitação)', () => {
    expect(opened('b', 2)).toEqual({ kind: 'ignore' });
  });
});
