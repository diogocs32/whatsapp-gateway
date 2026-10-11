// E28 · P-107 · D-051 — régua pura do "proxy em uso" (contagem do GET /api/proxies).
import { describe, expect, it } from 'vitest';
import type { ProxyMode } from './proxy-types';
import {
  proxyUsageMap,
  type ProxyUsageSession,
  type UsageAssignment,
} from './proxy-usage';

function a(
  sessionId: string,
  mode: ProxyMode,
  currentProxyId: string | null,
): UsageAssignment {
  return { sessionId, mode, currentProxyId };
}

function s(id: string, name: string): ProxyUsageSession {
  return { id, name };
}

describe('proxyUsageMap', () => {
  it('sem atribuições → mapa vazio', () => {
    expect(proxyUsageMap([], [s('S1', 'vendas')]).size).toBe(0);
  });

  it('SINGLE de sessão viva conta para o proxy dela', () => {
    const m = proxyUsageMap([a('S1', 'SINGLE', 'P1')], [s('S1', 'vendas')]);
    expect(m.get('P1')).toEqual([{ id: 'S1', name: 'vendas' }]);
  });

  it('RANGE e GLOBAL contam pela afinidade atual (currentProxyId)', () => {
    const m = proxyUsageMap(
      [a('S1', 'RANGE', 'P1'), a('S2', 'GLOBAL_ROUND_ROBIN', 'P1')],
      [s('S1', 'faixa'), s('S2', 'global')],
    );
    expect(m.get('P1')?.map((x) => x.name)).toEqual(['faixa', 'global']);
  });

  it('mode NONE não conta, mesmo com currentProxyId sobrando na linha', () => {
    const m = proxyUsageMap([a('S1', 'NONE', 'P1')], [s('S1', 'vendas')]);
    expect(m.has('P1')).toBe(false);
  });

  it('RANGE/GLOBAL que ainda não escolheu proxy (currentProxyId null) não conta', () => {
    const m = proxyUsageMap(
      [a('S1', 'RANGE', null), a('S2', 'GLOBAL_ROUND_ROBIN', null)],
      [s('S1', 'faixa'), s('S2', 'global')],
    );
    expect(m.size).toBe(0);
  });

  it('atribuição órfã (sessão apagada, memória E26) não segura o proxy', () => {
    const m = proxyUsageMap(
      [a('APAGADA', 'SINGLE', 'P1'), a('S1', 'SINGLE', 'P2')],
      [s('S1', 'viva')],
    );
    expect(m.has('P1')).toBe(false);
    expect(m.get('P2')).toEqual([{ id: 'S1', name: 'viva' }]);
  });

  it('proxy compartilhado lista todas as sessões, em ordem de nome sem diferenciar caixa', () => {
    const m = proxyUsageMap(
      [
        a('S3', 'SINGLE', 'P1'),
        a('S1', 'SINGLE', 'P1'),
        a('S2', 'RANGE', 'P1'),
        a('S4', 'SINGLE', 'P2'),
      ],
      [s('S1', 'zeta'), s('S2', 'Beta'), s('S3', 'alfa'), s('S4', 'outra')],
    );
    expect(m.get('P1')?.map((x) => x.name)).toEqual(['alfa', 'Beta', 'zeta']);
    expect(m.get('P2')?.map((x) => x.name)).toEqual(['outra']);
  });

  it('empate sem caixa ordena pela comparação exata (determinístico)', () => {
    const m = proxyUsageMap(
      [a('S1', 'SINGLE', 'P1'), a('S2', 'SINGLE', 'P1')],
      [s('S1', 'vendas'), s('S2', 'Vendas')],
    );
    expect(m.get('P1')?.map((x) => x.name)).toEqual(['Vendas', 'vendas']);
  });

  it('não muta as entradas e devolve só id/nome', () => {
    const sessions = [{ id: 'S1', name: 'vendas', extra: 'x' }];
    const assignments = [a('S1', 'SINGLE', 'P1')];
    const m = proxyUsageMap(assignments, sessions);
    expect(m.get('P1')).toEqual([{ id: 'S1', name: 'vendas' }]);
    expect(sessions).toEqual([{ id: 'S1', name: 'vendas', extra: 'x' }]);
    expect(assignments).toEqual([a('S1', 'SINGLE', 'P1')]);
  });
});
