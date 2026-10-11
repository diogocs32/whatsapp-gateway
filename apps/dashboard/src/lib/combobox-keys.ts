// E28 · P-107 — teclado do combobox "select-only" do WAI-ARIA APG
// (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/), puro para
// testar no vitest `environment: 'node'` (o painel não tem DOM nos testes). O componente
// (`components/proxies/ProxyPicker.tsx`) só traduz o resultado em estado e preventDefault.
//
// Fechado: ↓, Alt+↓, Enter e Espaço abrem destacando a escolha atual (ou a 1ª); ↑ e Home abrem na
// 1ª; End abre na última. Aberto: ↑/↓/Home/End/PageUp/PageDown movem (pulam desabilitadas, sem
// dar a volta); Enter, Espaço e Alt+↑ escolhem a destacada e fecham; Esc fecha. Tab fecha SEM
// escolher — desvio deliberado do APG: um proxy vermelho escolhido sem querer compartilharia o IP.
// Busca por digitação (APG "printable characters") não foi implementada.
import { moveActive, type PickerMove } from './proxy-usage';

export type ComboKeyResult =
  | { kind: 'ignore' } // deixa o navegador agir (sem preventDefault)
  | { kind: 'open'; active: number } // abre destacando `active` (-1 = nenhuma habilitada)
  | { kind: 'move'; active: number }
  | { kind: 'choose'; index: number } // escolhe e fecha
  | { kind: 'close'; prevent: boolean }; // Esc previne; Tab não (o foco segue)

const MOVES: Partial<Record<string, PickerMove>> = {
  ArrowDown: 'next',
  ArrowUp: 'prev',
  Home: 'first',
  End: 'last',
  PageDown: 'pageDown',
  PageUp: 'pageUp',
};

// Destaque ao abrir: a escolha atual se puder ser escolhida; senão a 1ª habilitada.
export function initialActive(
  items: readonly { disabled?: boolean }[],
  selectedIndex: number,
): number {
  return selectedIndex >= 0 && !items[selectedIndex]?.disabled
    ? selectedIndex
    : moveActive(items, -1, 'first');
}

export function comboKey(input: {
  open: boolean;
  key: string;
  altKey: boolean;
  items: readonly { disabled?: boolean }[];
  activeIndex: number;
  selectedIndex: number;
}): ComboKeyResult {
  const { open, key, altKey, items, activeIndex, selectedIndex } = input;
  if (!open) {
    if (key === 'ArrowDown' || key === 'Enter' || key === ' ')
      return { kind: 'open', active: initialActive(items, selectedIndex) };
    if (key === 'ArrowUp' || key === 'Home')
      return { kind: 'open', active: moveActive(items, -1, 'first') };
    if (key === 'End')
      return { kind: 'open', active: moveActive(items, -1, 'last') };
    return { kind: 'ignore' };
  }
  if (key === 'Enter' || key === ' ' || (key === 'ArrowUp' && altKey)) {
    return activeIndex >= 0 && !items[activeIndex]?.disabled
      ? { kind: 'choose', index: activeIndex }
      : { kind: 'close', prevent: true };
  }
  const move = MOVES[key];
  if (move)
    return { kind: 'move', active: moveActive(items, activeIndex, move) };
  if (key === 'Escape') return { kind: 'close', prevent: true };
  if (key === 'Tab') return { kind: 'close', prevent: false };
  return { kind: 'ignore' };
}
