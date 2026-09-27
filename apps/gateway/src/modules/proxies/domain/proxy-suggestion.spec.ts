// E26 · P-084 · D-038 — regras puras da sugestão de proxy ao recriar uma sessão apagada.
import { describe, expect, it } from 'vitest';
import {
  pickReleased,
  suggestionAvailability,
  type ReleasedAssignment,
} from './proxy-suggestion';

function row(
  sessionId: string,
  releasedSessionName: string,
  releasedAt: string,
  currentProxyId: string | null = `proxy-${sessionId}`,
): ReleasedAssignment {
  return {
    sessionId,
    releasedSessionName,
    releasedAt: new Date(releasedAt),
    currentProxyId,
  };
}

describe('pickReleased', () => {
  const rows = [row('01A', 'vendas', '2026-09-27T10:00:00Z')];

  it('nome vazio → null (não consulta as linhas)', () => {
    expect(pickReleased(rows, '')).toBeNull();
  });

  it('nome só com espaços → null', () => {
    expect(pickReleased(rows, '   ')).toBeNull();
    expect(pickReleased(rows, '\t \n')).toBeNull();
  });

  it('sem linhas → null', () => {
    expect(pickReleased([], 'vendas')).toBeNull();
  });

  it('faz trim do pedido antes de comparar', () => {
    expect(pickReleased(rows, '  vendas  ')).toBe(rows[0]);
  });

  it('casa sem diferenciar caixa quando só há a versão com outra caixa', () => {
    const r = row('01A', 'Vendas', '2026-09-27T10:00:00Z');
    expect(pickReleased([r], 'vENDAS')).toBe(r);
  });

  it('prefere a caixa idêntica mesmo sendo mais antiga que a de caixa diferente', () => {
    const exactOld = row('01A', 'Vendas', '2026-09-01T10:00:00Z');
    const otherCaseNew = row('01B', 'vendas', '2026-09-27T10:00:00Z');
    const upperNewest = row('01C', 'VENDAS', '2026-09-27T11:00:00Z');
    expect(pickReleased([otherCaseNew, upperNewest, exactOld], 'Vendas')).toBe(
      exactOld,
    );
  });

  it('com trim, a caixa idêntica continua preferida', () => {
    const exactOld = row('01A', 'Vendas', '2026-09-01T10:00:00Z');
    const otherCaseNew = row('01B', 'vendas', '2026-09-27T10:00:00Z');
    expect(pickReleased([otherCaseNew, exactOld], ' Vendas ')).toBe(exactOld);
  });

  it('entre linhas de caixa idêntica, escolhe a exclusão mais recente', () => {
    const older = row('01A', 'vendas', '2026-09-20T10:00:00Z');
    const newer = row('01B', 'vendas', '2026-09-27T10:00:00Z');
    const middle = row('01C', 'vendas', '2026-09-25T10:00:00Z');
    expect(pickReleased([older, newer, middle], 'vendas')).toBe(newer);
  });

  it('sem caixa idêntica, escolhe a mais recente entre as de caixa diferente', () => {
    const older = row('01A', 'VENDAS', '2026-09-20T10:00:00Z');
    const newer = row('01B', 'Vendas', '2026-09-27T10:00:00Z');
    expect(pickReleased([older, newer], 'vendas')).toBe(newer);
  });

  it('empate de releasedAt → sessionId maior (ULID criado depois), em qualquer ordem de entrada', () => {
    const a = row('01HAAAA', 'vendas', '2026-09-27T10:00:00.000Z');
    const b = row('01HBBBB', 'vendas', '2026-09-27T10:00:00.000Z');
    expect(pickReleased([a, b], 'vendas')).toBe(b);
    expect(pickReleased([b, a], 'vendas')).toBe(b);
  });

  it('empate de releasedAt com sessionId igual não quebra (estável)', () => {
    const a = row('01HAAAA', 'vendas', '2026-09-27T10:00:00.000Z', 'p1');
    const b = row('01HAAAA', 'vendas', '2026-09-27T10:00:00.000Z', 'p2');
    expect([a, b]).toContain(pickReleased([a, b], 'vendas'));
  });

  it("linha 'a-b' não casa o pedido 'a_b' (o _ não é curinga)", () => {
    const hyphen = row('01A', 'a-b', '2026-09-27T10:00:00Z');
    const other = row('01B', 'axb', '2026-09-27T11:00:00Z');
    expect(pickReleased([hyphen, other], 'a_b')).toBeNull();
  });

  it("linha 'a_b' casa só o pedido 'a_b' e não 'a-b'", () => {
    const under = row('01A', 'a_b', '2026-09-27T10:00:00Z');
    expect(pickReleased([under], 'a_b')).toBe(under);
    expect(pickReleased([under], 'a-b')).toBeNull();
  });

  it("'%' no pedido não vira curinga de LIKE", () => {
    const r = row('01A', 'vendas', '2026-09-27T10:00:00Z');
    expect(pickReleased([r], 'v%')).toBeNull();
  });

  it('descarta linha com nome diferente que o SQL eventualmente devolva (segunda barreira)', () => {
    const prefix = row('01A', 'vendas-02', '2026-09-27T12:00:00Z');
    const exact = row('01B', 'vendas', '2026-09-27T10:00:00Z');
    expect(pickReleased([prefix, exact], 'vendas')).toBe(exact);
    expect(pickReleased([prefix], 'vendas')).toBeNull();
  });

  it('currentProxyId null é descartado, mesmo sendo a mais recente e de caixa idêntica', () => {
    const noProxyNewest = row('01C', 'vendas', '2026-09-27T12:00:00Z', null);
    const withProxy = row('01A', 'Vendas', '2026-09-27T10:00:00Z');
    expect(pickReleased([noProxyNewest, withProxy], 'vendas')).toBe(withProxy);
  });

  it('só linhas com currentProxyId null → null', () => {
    expect(
      pickReleased(
        [row('01A', 'vendas', '2026-09-27T10:00:00Z', null)],
        'vendas',
      ),
    ).toBeNull();
  });

  it('não altera a ordem do array recebido', () => {
    const older = row('01A', 'vendas', '2026-09-20T10:00:00Z');
    const newer = row('01B', 'vendas', '2026-09-27T10:00:00Z');
    const input = [older, newer];
    pickReleased(input, 'vendas');
    expect(input).toEqual([older, newer]);
  });
});

describe('suggestionAvailability', () => {
  it('proxy null → REMOVED (indisponível)', () => {
    expect(suggestionAvailability(null, false)).toEqual({
      available: false,
      reason: 'REMOVED',
    });
    expect(suggestionAvailability(null, true)).toEqual({
      available: false,
      reason: 'REMOVED',
    });
  });

  // Revisão do diff (E26): "em uso por outra sessão" vem antes — testar/habilitar em Proxies não
  // libera um proxy preso a outra sessão viva.
  it('em uso → IN_USE mesmo desabilitado ou DEAD', () => {
    expect(
      suggestionAvailability({ enabled: false, status: 'DEAD' }, true),
    ).toEqual({ available: false, reason: 'IN_USE' });
    expect(
      suggestionAvailability({ enabled: true, status: 'DEAD' }, true),
    ).toEqual({ available: false, reason: 'IN_USE' });
  });

  it('livre de dono: desabilitado → DISABLED, antes de DEAD', () => {
    expect(
      suggestionAvailability({ enabled: false, status: 'DEAD' }, false),
    ).toEqual({ available: false, reason: 'DISABLED' });
    expect(
      suggestionAvailability({ enabled: false, status: 'ALIVE' }, false),
    ).toEqual({ available: false, reason: 'DISABLED' });
  });

  it('livre de dono, habilitado e DEAD → DEAD', () => {
    expect(
      suggestionAvailability({ enabled: true, status: 'DEAD' }, false),
    ).toEqual({ available: false, reason: 'DEAD' });
  });

  it('habilitado, vivo e em uso → IN_USE', () => {
    expect(
      suggestionAvailability({ enabled: true, status: 'ALIVE' }, true),
    ).toEqual({ available: false, reason: 'IN_USE' });
    expect(
      suggestionAvailability({ enabled: true, status: 'UNTESTED' }, true),
    ).toEqual({ available: false, reason: 'IN_USE' });
  });

  it('habilitado, não-DEAD e livre → disponível sem motivo (ALIVE e UNTESTED)', () => {
    expect(
      suggestionAvailability({ enabled: true, status: 'ALIVE' }, false),
    ).toEqual({ available: true, reason: null });
    expect(
      suggestionAvailability({ enabled: true, status: 'UNTESTED' }, false),
    ).toEqual({ available: true, reason: null });
  });
});
