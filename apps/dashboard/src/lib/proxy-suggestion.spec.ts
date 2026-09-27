import { describe, expect, it } from 'vitest';
import type { ProxyDto, ProxySuggestionDto } from '@contracts';
import {
  SESSION_NAME_RE,
  decideAfterHold,
  isValidSessionName,
  mustHoldCreate,
  suggestionView,
  type SuggestionState,
  type SuggestionViewInput,
} from './proxy-suggestion';
import { fullDateTime } from './time-format';

// E26 (P-084) — sugestão de proxy ao recriar uma sessão com o nome de uma sessão apagada.

const NOW = Date.parse('2026-09-27T12:00:00.000Z');
const MIN = 60_000;
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function proxy(over: Partial<ProxyDto>): ProxyDto {
  return {
    id: 'p3',
    position: 3,
    label: 'BR-01',
    protocol: 'HTTP',
    host: '10.0.0.3',
    port: 8080,
    hasAuth: false,
    source: 'MANUAL',
    country: 'BR',
    exitIp: null,
    latencyMs: null,
    status: 'ALIVE',
    enabled: true,
    ...over,
  };
}

const P1 = proxy({ id: 'p1', position: 1, label: 'SP-01' });
const P3 = proxy({});
const P5 = proxy({ id: 'p5', position: 5, label: 'RJ-01' });

function sug(over: Partial<ProxySuggestionDto> = {}): ProxySuggestionDto {
  return {
    proxy: P3,
    fromSession: 'vendas',
    releasedAt: ago(3 * MIN),
    available: true,
    reason: null,
    inUseBySession: null,
    ...over,
  };
}

const state = (data: ProxySuggestionDto | null, forName = 'vendas') =>
  ({ forName, data }) satisfies SuggestionState;

function view(over: Partial<SuggestionViewInput>) {
  return suggestionView({
    trimmedName: 'vendas',
    suggestion: null,
    availableProxies: [P1, P3, P5],
    choice: null,
    now: NOW,
    ...over,
  });
}

describe('isValidSessionName (mesma regex do create no gateway)', () => {
  it('aceita letras, números, _ e -, de 1 a 64', () => {
    expect(isValidSessionName('Vendas_01-sp')).toBe(true);
    expect(isValidSessionName('a'.repeat(64))).toBe(true);
    expect(SESSION_NAME_RE.test('x')).toBe(true);
  });

  it('recusa vazio, >64, espaço, acento e outros símbolos', () => {
    for (const bad of ['', 'a'.repeat(65), 'ven das', 'sessão', 'a.b', 'a%b']) {
      expect(isValidSessionName(bad)).toBe(false);
    }
  });
});

describe('suggestionView (E26)', () => {
  it('sem sugestão: só a lista, sem proxy, sem aviso', () => {
    const v = view({});
    expect(v.options).toEqual([P1, P3, P5]);
    expect(v.selectValue).toBe('');
    expect(v.preselectId).toBeNull();
    expect(v.suggestedId).toBeNull();
    expect(v.note).toBeNull();
    expect(v.canApplySuggestion).toBe(false);
    expect(v.manualChoiceLost).toBe(false);
  });

  it('disponível e na lista: pré-seleciona com o texto de sugestão', () => {
    const v = view({ suggestion: state(sug()) });
    expect(v.preselectId).toBe('p3');
    expect(v.selectValue).toBe('p3');
    expect(v.suggestedId).toBe('p3');
    expect(v.options).toEqual([P1, P3, P5]);
    expect(v.note).toEqual({
      tone: 'suggest',
      text: 'Sugestão: #3 · BR-01 era o proxy da sessão "vendas" (apagada há 3 min). Pode trocar se quiser.',
    });
    expect(v.canApplySuggestion).toBe(false);
  });

  it('lista chegando DEPOIS da sugestão: pré-seleciona do mesmo jeito', () => {
    const before = view({ suggestion: state(sug()), availableProxies: [] });
    // Sem lista, o sugerido entra como opção extra (o servidor acabou de validar).
    expect(before.options).toEqual([P3]);
    expect(before.selectValue).toBe('p3');
    const after = view({ suggestion: state(sug()) });
    expect(after.options).toEqual([P1, P3, P5]);
    expect(after.selectValue).toBe('p3');
  });

  it('available fora da lista (lista velha): vira opção extra, na ordem de posição, pré-selecionada', () => {
    const v = view({ suggestion: state(sug()), availableProxies: [P1, P5] });
    expect(v.options.map((p) => p.id)).toEqual(['p1', 'p3', 'p5']);
    expect(v.preselectId).toBe('p3');
    expect(v.selectValue).toBe('p3');
  });

  it('nome mudando desfaz a pré-seleção (resposta de outro nome é ignorada)', () => {
    const v = view({ trimmedName: 'vendas2', suggestion: state(sug()) });
    expect(v.preselectId).toBeNull();
    expect(v.selectValue).toBe('');
    expect(v.note).toBeNull();
    expect(v.options).toEqual([P1, P3, P5]);
  });

  it('forName diferente ignorado mesmo com o proxy fora da lista (sem opção extra)', () => {
    const v = view({
      trimmedName: 'suporte',
      suggestion: state(sug(), 'vendas'),
      availableProxies: [P1],
    });
    expect(v.options).toEqual([P1]);
    expect(v.selectValue).toBe('');
    expect(v.suggestedId).toBeNull();
  });

  it('escolha manual preservada: sugerido livre vira aviso + "Usar este proxy"', () => {
    const v = view({ suggestion: state(sug()), choice: 'p5' });
    expect(v.selectValue).toBe('p5');
    expect(v.preselectId).toBeNull();
    expect(v.canApplySuggestion).toBe(true);
    expect(v.suggestedId).toBe('p3');
    expect(v.note).toEqual({
      tone: 'info',
      text: 'A sessão "vendas" (apagada há 3 min) usava o #3 · BR-01, que está livre.',
    });
  });

  it("choice '' (dono escolheu Sem proxy) é preservada", () => {
    const v = view({ suggestion: state(sug()), choice: '' });
    expect(v.selectValue).toBe('');
    expect(v.preselectId).toBeNull();
    expect(v.canApplySuggestion).toBe(true);
    expect(v.manualChoiceLost).toBe(false);
    expect(v.note?.tone).toBe('info');
  });

  it('dono aplicou a sugestão (choice = sugerido): fica selecionado, sem botão', () => {
    const v = view({ suggestion: state(sug()), choice: 'p3' });
    expect(v.selectValue).toBe('p3');
    expect(v.canApplySuggestion).toBe(false);
    expect(v.note?.tone).toBe('suggest');
  });

  it('manualChoiceLost: escolha manual saiu da lista → Sem proxy + aviso', () => {
    const v = view({ choice: 'p9' });
    expect(v.manualChoiceLost).toBe(true);
    expect(v.selectValue).toBe('');
    expect(v.note).toEqual({
      tone: 'warn',
      text: 'Atenção: O proxy escolhido não está mais livre.',
    });
  });

  it('manualChoiceLost com sugerido livre: os dois avisos e o botão', () => {
    const v = view({ suggestion: state(sug()), choice: 'p9' });
    expect(v.selectValue).toBe('');
    expect(v.canApplySuggestion).toBe(true);
    expect(v.note?.tone).toBe('warn');
    expect(v.note?.text).toBe(
      'Atenção: O proxy escolhido não está mais livre. A sessão "vendas" (apagada há 3 min) usava o #3 · BR-01, que está livre.',
    );
  });

  it('IN_USE: cita a sessão que está com o proxy; sem nome, "outra sessão"', () => {
    const inUse = sug({
      available: false,
      reason: 'IN_USE',
      inUseBySession: 'vendas-02',
    });
    const v = view({ suggestion: state(inUse), availableProxies: [P1, P5] });
    expect(v.preselectId).toBeNull();
    expect(v.selectValue).toBe('');
    expect(v.options).toEqual([P1, P5]);
    expect(v.canApplySuggestion).toBe(false);
    expect(v.note).toEqual({
      tone: 'warn',
      text: 'Atenção: A sessão "vendas" (apagada há 3 min) usava o #3 · BR-01, mas ele já está em uso pela sessão "vendas-02".',
    });
    const anon = view({
      suggestion: state({ ...inUse, inUseBySession: null }),
    });
    expect(anon.note?.text).toBe(
      'Atenção: A sessão "vendas" (apagada há 3 min) usava o #3 · BR-01, mas ele já está em uso por outra sessão.',
    );
  });

  it('DEAD e DISABLED: avisam sem pré-selecionar', () => {
    const dead = view({
      suggestion: state(
        sug({
          available: false,
          reason: 'DEAD',
          proxy: { ...P3, status: 'DEAD' },
        }),
      ),
      availableProxies: [P1],
    });
    expect(dead.selectValue).toBe('');
    expect(dead.options).toEqual([P1]);
    expect(dead.note?.text).toBe(
      'Atenção: A sessão "vendas" (apagada há 3 min) usava o #3 · BR-01, mas ele está fora do ar (DEAD). Teste-o em Proxies para voltar a usá-lo.',
    );
    const disabled = view({
      suggestion: state(sug({ available: false, reason: 'DISABLED' })),
    });
    expect(disabled.preselectId).toBeNull();
    expect(disabled.note?.text).toBe(
      'Atenção: A sessão "vendas" (apagada há 3 min) usava o #3 · BR-01, mas ele está desabilitado em Proxies.',
    );
  });

  it('REMOVED com proxy null: frase sem #N (nunca lê proxy.*)', () => {
    const v = view({
      suggestion: state(
        sug({ proxy: null, available: false, reason: 'REMOVED' }),
      ),
    });
    expect(v.preselectId).toBeNull();
    expect(v.suggestedId).toBeNull();
    expect(v.note).toEqual({
      tone: 'warn',
      text: 'Atenção: A sessão "vendas" (apagada há 3 min) usava um proxy que foi excluído do pool.',
    });
  });

  it('proxy null mesmo com available:true (defensivo) não quebra nem pré-seleciona', () => {
    const v = view({
      suggestion: state(sug({ proxy: null, available: true })),
    });
    expect(v.preselectId).toBeNull();
    expect(v.note?.tone).toBe('warn');
  });

  it('label null: só "#N"', () => {
    const noLabel = proxy({ label: null });
    const v = view({
      suggestion: state(sug({ proxy: noLabel })),
      availableProxies: [noLabel],
    });
    expect(v.note?.text).toBe(
      'Sugestão: #3 era o proxy da sessão "vendas" (apagada há 3 min). Pode trocar se quiser.',
    );
  });

  it('diferença de caixa: pré-seleciona, cita o nome como foi apagado e avisa', () => {
    const v = view({
      trimmedName: 'Vendas',
      suggestion: state(sug(), 'Vendas'),
    });
    expect(v.preselectId).toBe('p3');
    expect(v.note?.text).toBe(
      'Sugestão: #3 · BR-01 era o proxy da sessão "vendas" (apagada há 3 min — com maiúsculas/minúsculas diferentes). Pode trocar se quiser.',
    );
  });

  it('create segurado (held): pede para conferir e criar de novo', () => {
    const v = view({ suggestion: state(sug()), held: true });
    expect(v.note?.text).toBe(
      'Sugestão: #3 · BR-01 era o proxy da sessão "vendas" (apagada há 3 min) — confira e clique em Criar de novo.',
    );
  });

  it('tempo: "agora", horas e, depois de 24 h, data e hora', () => {
    expect(
      view({ suggestion: state(sug({ releasedAt: ago(20_000) })) }).note?.text,
    ).toContain('(apagada agora)');
    expect(
      view({ suggestion: state(sug({ releasedAt: ago(5 * 60 * MIN) })) }).note
        ?.text,
    ).toContain('(apagada há 5 h)');
    const old = ago(3 * 24 * 60 * MIN);
    expect(
      view({ suggestion: state(sug({ releasedAt: old })) }).note?.text,
    ).toContain(`(apagada em ${fullDateTime(old)})`);
  });

  it('data null (sem memória ou erro): nada muda', () => {
    const v = view({ suggestion: state(null) });
    expect(v.note).toBeNull();
    expect(v.selectValue).toBe('');
  });
});

describe('mustHoldCreate (E26)', () => {
  const base = { trimmedName: 'vendas', choice: null, resolvedFor: null };

  it('segura: automático, nome válido e a sugestão desse nome ainda não chegou', () => {
    expect(mustHoldCreate(base)).toBe(true);
    expect(mustHoldCreate({ ...base, resolvedFor: 'vend' })).toBe(true);
  });

  it('não segura com escolha do dono (manual ou Sem proxy)', () => {
    expect(mustHoldCreate({ ...base, choice: 'p3' })).toBe(false);
    expect(mustHoldCreate({ ...base, choice: '' })).toBe(false);
  });

  it('não segura se a sugestão já resolveu para esse nome', () => {
    expect(mustHoldCreate({ ...base, resolvedFor: 'vendas' })).toBe(false);
  });

  it('não segura com nome inválido ou já em uso', () => {
    expect(mustHoldCreate({ ...base, trimmedName: '' })).toBe(false);
    expect(mustHoldCreate({ ...base, trimmedName: 'ven das' })).toBe(false);
    expect(mustHoldCreate({ ...base, nameTaken: true })).toBe(false);
  });
});

describe('decideAfterHold (E26 — "Criar" segurado depois da consulta)', () => {
  // Recalcula a view como o componente faz (com a resposta nova e o estado atual).
  function decide(o: {
    shown?: string;
    currentTrimmed?: string;
    data: ProxySuggestionDto | null | undefined;
    choice?: string | null;
    curSelect?: string;
  }) {
    const choice = o.choice ?? null;
    return decideAfterHold({
      shown: o.shown ?? '',
      trimmed: 'vendas',
      currentTrimmed: o.currentTrimmed ?? 'vendas',
      data: o.data,
      cur: { proxyChoice: choice, selectValue: o.curSelect ?? '' },
      view:
        o.data === undefined
          ? null
          : view({ suggestion: state(o.data), choice }),
    });
  }

  it('sugestão pré-selecionável (via "Sem proxy" no clique) → segura', () => {
    expect(decide({ data: sug() })).toEqual({ action: 'hold' });
  });

  it('sugestão null, indisponível ou REMOVED → cria com ""', () => {
    expect(decide({ data: null })).toEqual({ action: 'create', proxyId: '' });
    expect(
      decide({ data: sug({ available: false, reason: 'IN_USE' }) }),
    ).toEqual({ action: 'create', proxyId: '' });
    expect(
      decide({
        data: sug({ proxy: null, available: false, reason: 'REMOVED' }),
      }),
    ).toEqual({ action: 'create', proxyId: '' });
  });

  it('erro ou teto SEM mudança na tela → cria com o que está na tela', () => {
    expect(decide({ data: undefined, shown: '', curSelect: '' })).toEqual({
      action: 'create',
      proxyId: '',
    });
    expect(decide({ data: undefined, shown: 'p3', curSelect: 'p3' })).toEqual({
      action: 'create',
      proxyId: 'p3',
    });
  });

  it('erro ou teto COM mudança (o debounce pré-selecionou na espera) → segura', () => {
    expect(decide({ data: undefined, shown: '', curSelect: 'p3' })).toEqual({
      action: 'hold',
    });
  });

  it('o dono via o sugerido (resposta velha) e agora está IN_USE → segura', () => {
    expect(
      decide({
        data: sug({ available: false, reason: 'IN_USE' }),
        shown: 'p3',
      }),
    ).toEqual({ action: 'hold' });
  });

  it('pré-seleção igual à vista no clique → cria com ela', () => {
    expect(decide({ data: sug(), shown: 'p3' })).toEqual({
      action: 'create',
      proxyId: 'p3',
    });
  });

  it('escolha manual feita durante a espera → cria com a escolha', () => {
    expect(decide({ data: sug(), choice: 'p5', curSelect: 'p5' })).toEqual({
      action: 'create',
      proxyId: 'p5',
    });
    expect(
      decide({ data: undefined, choice: '', shown: 'p3', curSelect: '' }),
    ).toEqual({ action: 'create', proxyId: '' });
  });

  it('nome mudado durante a espera → não cria', () => {
    expect(decide({ data: sug(), currentTrimmed: 'vendas2' })).toEqual({
      action: 'abort',
    });
    expect(decide({ data: undefined, currentTrimmed: '' })).toEqual({
      action: 'abort',
    });
  });
});
