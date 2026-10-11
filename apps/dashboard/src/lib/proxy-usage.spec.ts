// E28 · P-107 · D-051 — verde/vermelho e contagem no seletor de proxy, seleção para excluir em lote,
// resumo da confirmação e teclado do seletor.
import { describe, expect, it } from 'vitest';
import type { ProxyListItemDto } from '@contracts';
import {
  bulkDeleteQuestion,
  bulkDeleteResultText,
  bulkDeleteSummary,
  bulkDeleteWarning,
  hasUsageInfo,
  isSelectableProxy,
  moveActive,
  needsShareConsent,
  proxyOptionLabel,
  proxyUsageView,
  selectAllState,
  shareFromConsent,
  consentFromPick,
  inUseErrorText,
  sharedNote,
  toggleAll,
  toggleOne,
  unavailableText,
  visibleSelection,
} from './proxy-usage';

function px(
  id: string,
  position: number,
  sessions: Array<[string, string]> = [],
  extra: Partial<ProxyListItemDto> = {},
): ProxyListItemDto {
  return {
    id,
    position,
    label: null,
    protocol: 'HTTP',
    host: `10.0.0.${position}`,
    port: 8080,
    hasAuth: true,
    source: 'MANUAL',
    country: 'BR',
    exitIp: null,
    latencyMs: null,
    status: 'ALIVE',
    enabled: true,
    sessionCount: sessions.length,
    sessions: sessions.map(([sid, name]) => ({ id: sid, name })),
    ...extra,
  };
}

describe('proxyUsageView — criação (sem sessão própria)', () => {
  it('sem sessões → verde "livre"', () => {
    expect(proxyUsageView(px('P1', 1))).toEqual({
      tone: 'free',
      others: [],
      ownUses: false,
      text: 'livre',
      title: 'Livre — nenhuma sessão usa este proxy',
    });
  });

  it('1 sessão → vermelho "em uso por 1 sessão" com o nome na dica', () => {
    const v = proxyUsageView(px('P1', 1, [['S1', 'vendas']]));
    expect(v).toMatchObject({
      tone: 'used',
      others: ['vendas'],
      text: 'em uso por 1 sessão',
      title: 'Em uso por: vendas',
    });
  });

  it('3 sessões → plural e todos os nomes na ordem do gateway', () => {
    const v = proxyUsageView(
      px('P1', 1, [
        ['S1', 'alfa'],
        ['S2', 'beta'],
        ['S3', 'zeta'],
      ]),
    );
    expect(v.text).toBe('em uso por 3 sessões');
    expect(v.title).toBe('Em uso por: alfa, beta, zeta');
  });
});

describe('proxyUsageView — sessão já criada (conta só as OUTRAS)', () => {
  it('ninguém usa → "livre"', () => {
    expect(proxyUsageView(px('P1', 1), 'S9')).toMatchObject({
      tone: 'free',
      ownUses: false,
      text: 'livre',
    });
  });

  it('só a própria usa → verde "só esta sessão"', () => {
    expect(proxyUsageView(px('P1', 1, [['S9', 'eu']]), 'S9')).toEqual({
      tone: 'free',
      others: [],
      ownUses: true,
      text: 'só esta sessão',
      title: 'Só esta sessão usa este proxy',
    });
  });

  it('outra usa → vermelho "em uso por 1 outra sessão"', () => {
    expect(proxyUsageView(px('P1', 1, [['S1', 'vendas']]), 'S9')).toMatchObject(
      { tone: 'used', text: 'em uso por 1 outra sessão' },
    );
  });

  it('a própria + 2 outras → "2 outras sessões" e a dica cita esta sessão', () => {
    const v = proxyUsageView(
      px('P1', 1, [
        ['S1', 'a'],
        ['S9', 'eu'],
        ['S2', 'b'],
      ]),
      'S9',
    );
    expect(v).toMatchObject({
      tone: 'used',
      ownUses: true,
      others: ['a', 'b'],
      text: 'em uso por 2 outras sessões',
      title: 'Em uso por: a, b (e esta sessão)',
    });
  });
});

describe('isSelectableProxy / unavailableText', () => {
  it('habilitado e ALIVE/UNTESTED pode; desativado ou DEAD não', () => {
    expect(isSelectableProxy(px('P', 1))).toBe(true);
    expect(isSelectableProxy(px('P', 1, [], { status: 'UNTESTED' }))).toBe(
      true,
    );
    expect(isSelectableProxy(px('P', 1, [], { enabled: false }))).toBe(false);
    expect(isSelectableProxy(px('P', 1, [], { status: 'DEAD' }))).toBe(false);
  });

  it('motivo: desativado tem prioridade sobre DEAD; elegível → null', () => {
    expect(unavailableText(px('P', 1))).toBeNull();
    expect(unavailableText(px('P', 1, [], { enabled: false }))).toBe(
      'desativado',
    );
    expect(unavailableText(px('P', 1, [], { status: 'DEAD' }))).toBe(
      'fora do ar (DEAD)',
    );
    expect(
      unavailableText(px('P', 1, [], { enabled: false, status: 'DEAD' })),
    ).toBe('desativado');
  });
});

describe('proxyOptionLabel', () => {
  it('rótulo quando existe; senão host:porta; país e status', () => {
    expect(proxyOptionLabel(px('P', 3, [], { label: 'BR-01' }))).toBe(
      '#3 · BR-01 · BR · ALIVE',
    );
    expect(
      proxyOptionLabel(px('P', 4, [], { country: null, status: 'UNTESTED' })),
    ).toBe('#4 · 10.0.0.4:8080 · UNTESTED');
  });
});

describe('needsShareConsent / consentimento na escolha / sharedNote', () => {
  it('só pede compartilhar quando o proxy está vermelho para quem escolhe', () => {
    expect(needsShareConsent(undefined)).toBe(false);
    expect(needsShareConsent(px('P', 1))).toBe(false);
    expect(needsShareConsent(px('P', 1, [['S1', 'a']]))).toBe(true);
    // sessão já criada: o próprio proxy não é "de outra sessão"
    expect(needsShareConsent(px('P', 1, [['S9', 'eu']]), 'S9')).toBe(false);
    expect(needsShareConsent(px('P', 1, [['S1', 'a']]), 'S9')).toBe(true);
  });

  // Revisão E28: o consentimento é registrado NA ESCOLHA — não pela cor no momento de salvar.
  it('consentFromPick: só uma opção vermelha escolhida conta; vazio não vira consentimento', () => {
    expect(consentFromPick('P1', 'used')).toEqual({ id: 'P1', red: true });
    expect(consentFromPick('P1', 'free')).toEqual({ id: 'P1', red: false });
    expect(consentFromPick('P1', 'none')).toEqual({ id: 'P1', red: false });
    expect(consentFromPick('P1', undefined)).toEqual({ id: 'P1', red: false });
    expect(consentFromPick('', 'used')).toBeNull();
  });

  it('shareFromConsent: compartilha só o MESMO proxy que foi escolhido vermelho', () => {
    const red = { id: 'P1', red: true };
    expect(shareFromConsent('P1', red)).toBe(true);
    // outro proxy (pré-seleção/sugestão/troca) não herda o consentimento
    expect(shareFromConsent('P2', red)).toBe(false);
    // escolhido verde e virou vermelho depois (outra sessão/linha pegou): nada de compartilhar
    expect(shareFromConsent('P1', { id: 'P1', red: false })).toBe(false);
    // sem escolha registrada (valor herdado, pré-seleção, "Usar este proxy")
    expect(shareFromConsent('P1', null)).toBe(false);
    expect(shareFromConsent('', red)).toBe(false);
  });

  it('inUseErrorText: o 400 "em uso" ganha a dica de como compartilhar; o resto passa igual', () => {
    expect(inUseErrorText('Proxy já está em uso por outra sessão')).toBe(
      'Proxy já está em uso por outra sessão — para compartilhar, escolha-o de novo na lista (em vermelho) ou escolha outro.',
    );
    expect(inUseErrorText('Proxy está DEAD — teste-o ou escolha outro')).toBe(
      'Proxy está DEAD — teste-o ou escolha outro',
    );
  });

  it('aviso de compartilhado: nomes, quantidade e o sujeito certo', () => {
    expect(sharedNote(px('P', 3))).toBeNull();
    expect(sharedNote(px('P', 3, [['S1', 'a']], { label: 'BR-01' }))).toBe(
      'Atenção: o #3 · BR-01 também é usado por 1 sessão (a) — a nova sessão vai sair pelo mesmo IP.',
    );
    expect(
      sharedNote(
        px('P', 3, [
          ['S1', 'a'],
          ['S9', 'eu'],
          ['S2', 'b'],
        ]),
        'S9',
      ),
    ).toBe(
      'Atenção: o #3 também é usado por 2 sessões (a, b) — esta sessão sai pelo mesmo IP.',
    );
    expect(sharedNote(px('P', 3, [['S9', 'eu']]), 'S9')).toBeNull();
  });
});

describe('seleção para excluir em lote', () => {
  const list = [px('A', 1), px('B', 2), px('C', 3)];

  it('visibleSelection: só os que ainda existem, na ordem da lista', () => {
    expect(visibleSelection(new Set(['C', 'X', 'A']), list)).toEqual([
      'A',
      'C',
    ]);
  });

  it('selectAllState: none / some / all (ids que sumiram não contam)', () => {
    expect(selectAllState(new Set(), list)).toBe('none');
    expect(selectAllState(new Set(['X']), list)).toBe('none');
    expect(selectAllState(new Set(['A']), list)).toBe('some');
    expect(selectAllState(new Set(['A', 'B', 'C', 'X']), list)).toBe('all');
    expect(selectAllState(new Set(), [])).toBe('none');
  });

  it('toggleOne marca e desmarca sem mutar o conjunto original', () => {
    const s = new Set(['A']);
    expect([...toggleOne(s, 'B')].sort()).toEqual(['A', 'B']);
    expect([...toggleOne(s, 'A')]).toEqual([]);
    expect([...s]).toEqual(['A']);
  });

  it('toggleAll: parcial ou vazio → todos; todos → nenhum', () => {
    expect([...toggleAll(new Set(), list)]).toEqual(['A', 'B', 'C']);
    expect([...toggleAll(new Set(['B']), list)]).toEqual(['A', 'B', 'C']);
    expect([...toggleAll(new Set(['A', 'B', 'C']), list)]).toEqual([]);
  });
});

describe('confirmação da exclusão em lote', () => {
  const list = [
    px('A', 1, [['S2', 'vendas']], { label: 'BR-01' }),
    px('B', 2),
    px('C', 3, [
      ['S1', 'Alfa'],
      ['S2', 'vendas'],
    ]),
  ];

  it('resumo: ids na ordem da lista, os em uso com sessões e as sessões afetadas sem repetir', () => {
    expect(bulkDeleteSummary(new Set(['C', 'B', 'A']), list)).toEqual({
      ids: ['A', 'B', 'C'],
      inUse: [
        { id: 'A', label: '#1 · BR-01', sessions: ['vendas'] },
        { id: 'C', label: '#3', sessions: ['Alfa', 'vendas'] },
      ],
      sessionsAffected: ['Alfa', 'vendas'],
      unknownUsage: 0,
    });
  });

  it('pergunta com plural certo', () => {
    expect(bulkDeleteQuestion(1)).toBe(
      'Excluir 1 proxy? Não dá para desfazer.',
    );
    expect(bulkDeleteQuestion(12)).toBe(
      'Excluir 12 proxies? Não dá para desfazer.',
    );
  });

  it('sem nenhum em uso → sem aviso', () => {
    expect(
      bulkDeleteWarning(bulkDeleteSummary(new Set(['B']), list)),
    ).toBeNull();
  });

  it('aviso nomeia proxies e sessões e explica o efeito (fixo × faixa/global)', () => {
    const w = bulkDeleteWarning(
      bulkDeleteSummary(new Set(['A', 'B', 'C']), list),
    );
    expect(w).toBe(
      '2 deles estão em uso por 2 sessões: #1 · BR-01 (vendas); #3 (Alfa, vendas). Sessão com proxy fixo nele não conecta até você escolher outro proxy; em faixa/global, ela troca de proxy na próxima conexão.',
    );
    const one = bulkDeleteWarning(bulkDeleteSummary(new Set(['A']), list));
    expect(one).toMatch(
      /^1 deles está em uso por 1 sessão: #1 · BR-01 \(vendas\)\./,
    );
  });

  it('resultado: singular/plural e os que já não existiam', () => {
    expect(bulkDeleteResultText({ deleted: 1, notFound: [] })).toBe(
      '1 proxy excluído',
    );
    expect(bulkDeleteResultText({ deleted: 3, notFound: ['x'] })).toBe(
      '3 proxies excluídos · 1 já não existia',
    );
    expect(bulkDeleteResultText({ deleted: 0, notFound: ['x', 'y'] })).toBe(
      '0 proxies excluídos · 2 já não existiam',
    );
  });
});

describe('moveActive (teclado do seletor, APG select-only)', () => {
  const opts = (disabled: number[] = [], n = 5) =>
    Array.from({ length: n }, (_, i) => ({ disabled: disabled.includes(i) }));

  it('sem opção habilitada → -1', () => {
    expect(moveActive([], 0, 'next')).toBe(-1);
    expect(moveActive(opts([0, 1, 2, 3, 4]), 0, 'first')).toBe(-1);
    expect(moveActive(opts([0, 1, 2, 3, 4]), 2, 'next')).toBe(-1);
  });

  it('first/last pulam desabilitadas nas pontas', () => {
    expect(moveActive(opts([0]), 3, 'first')).toBe(1);
    expect(moveActive(opts([4]), 1, 'last')).toBe(3);
  });

  it('sem ativa (-1) → primeira habilitada para qualquer movimento relativo', () => {
    for (const m of ['next', 'prev', 'pageDown', 'pageUp'] as const) {
      expect(moveActive(opts([0]), -1, m)).toBe(1);
    }
  });

  it('next/prev pulam desabilitadas e não dão a volta', () => {
    expect(moveActive(opts([2]), 1, 'next')).toBe(3);
    expect(moveActive(opts(), 4, 'next')).toBe(4);
    expect(moveActive(opts([2]), 3, 'prev')).toBe(1);
    expect(moveActive(opts(), 0, 'prev')).toBe(0);
  });

  it('nas pontas com a atual desabilitada, vai para a ponta habilitada', () => {
    // atual (4) virou desabilitada e não há próxima → última habilitada
    expect(moveActive(opts([4]), 4, 'next')).toBe(3);
    expect(moveActive(opts([0]), 0, 'prev')).toBe(1);
  });

  it('pageDown/pageUp saltam até 10 ou até a ponta', () => {
    const many = opts([], 25);
    expect(moveActive(many, 0, 'pageDown')).toBe(10);
    expect(moveActive(many, 20, 'pageDown')).toBe(24);
    expect(moveActive(many, 24, 'pageUp')).toBe(14);
    expect(moveActive(many, 5, 'pageUp')).toBe(0);
  });

  it('pageDown/pageUp com o alvo desabilitado ficam na mais longe habilitada dentro do salto', () => {
    const many = opts([10], 25);
    expect(moveActive(many, 0, 'pageDown')).toBe(9);
    const up = opts([14], 25);
    expect(moveActive(up, 24, 'pageUp')).toBe(15);
  });

  it('sem habilitada dentro do salto, vai à primeira depois dele (no sentido do salto)', () => {
    const gap = opts([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 15);
    expect(moveActive(gap, 0, 'pageDown')).toBe(11);
    // só a 0 habilitada; a atual (14) desabilitada: o salto (4..13) é vazio → 0
    const onlyFirst = opts([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 15);
    expect(moveActive(onlyFirst, 14, 'pageUp')).toBe(0);
  });
});

// Painel publicado antes do gateway E28 (ou gateway que voltou de versão): o GET /api/proxies
// antigo não traz `sessions` — a tela não quebra e também não afirma "livre".
describe('gateway anterior à E28 (sem `sessions` no item)', () => {
  const legacy = {
    ...px('P1', 1),
    sessions: undefined,
  } as unknown as ProxyListItemDto;

  it('hasUsageInfo distingue item com e sem uso', () => {
    expect(hasUsageInfo(px('P1', 1))).toBe(true);
    expect(hasUsageInfo(legacy)).toBe(false);
  });

  it('vira "uso indisponível" (neutro), não pede compartilhar nem avisa', () => {
    expect(proxyUsageView(legacy)).toMatchObject({
      tone: 'unknown',
      text: 'uso indisponível',
      others: [],
    });
    expect(proxyUsageView(legacy, 'S9').tone).toBe('unknown');
    expect(needsShareConsent(legacy)).toBe(false);
    expect(sharedNote(legacy)).toBeNull();
  });

  it('confirmação do lote avisa que não deu para conferir o uso', () => {
    const s = bulkDeleteSummary(new Set(['P1']), [legacy]);
    expect(s).toEqual({
      ids: ['P1'],
      inUse: [],
      sessionsAffected: [],
      unknownUsage: 1,
    });
    expect(bulkDeleteWarning(s)).toMatch(/^Não deu para conferir/);
  });
});
