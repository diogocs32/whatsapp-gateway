import { describe, expect, it } from 'vitest';
import type { SessionDto, SessionStatus } from '@contracts';
import {
  nextSessionSort,
  parseSessionSort,
  sessionNumberKey,
  sessionSortToParams,
  sortSessions,
  type SessionSort,
} from './session-sort';

function session(over: Partial<SessionDto> & { name: string }): SessionDto {
  return {
    id: over.name,
    engine: 'BAILEYS',
    status: 'WORKING',
    meJid: null,
    mePushName: null,
    lastMeJid: null,
    phoneNumber: null,
    autostart: true,
    lastError: null,
    lastErrorDetails: null,
    createdAt: '2026-11-07T00:00:00.000Z',
    updatedAt: '2026-11-07T00:00:00.000Z',
    ...over,
  };
}

const LABEL: Record<SessionStatus, string> = {
  WORKING: 'Conectado',
  SCAN_QR_CODE: 'Aguardando QR',
  PAIRING_CODE: 'Código de pareamento',
  STARTING: 'Iniciando',
  STOPPED: 'Parado',
  FAILED: 'Falhou',
  DEGRADED: 'Degradado',
};
const labels = { statusLabel: (st: SessionStatus) => LABEL[st] };
const names = (list: SessionDto[], sort: SessionSort | null) =>
  sortSessions(list, sort, labels).map((s) => s.name);

describe('session-sort (E30b/P-111)', () => {
  const list = [
    session({ name: 'contato-10', status: 'STOPPED' }),
    session({
      name: 'Diogo',
      status: 'WORKING',
      meJid: '551731670499:5@s.whatsapp.net',
    }),
    session({ name: 'contato-9', status: 'FAILED', engine: 'WWEBJS' }),
    session({
      name: 'Álvaro',
      status: 'SCAN_QR_CODE',
      lastMeJid: '5511988887777@s.whatsapp.net',
    }),
    session({
      name: 'bruno',
      status: 'WORKING',
      meJid: '5521977776666@s.whatsapp.net',
    }),
  ];

  it('sem ordenação devolve cópia na ordem original', () => {
    const out = sortSessions(list, null, labels);
    expect(out.map((s) => s.name)).toEqual(list.map((s) => s.name));
    expect(out).not.toBe(list);
  });

  it('nome: pt-BR, sem caixa/acento, numérico; decrescente inverte', () => {
    expect(names(list, { key: 'name', direction: 'asc' })).toEqual([
      'Álvaro',
      'bruno',
      'contato-9',
      'contato-10',
      'Diogo',
    ]);
    expect(names(list, { key: 'name', direction: 'desc' })).toEqual([
      'Diogo',
      'contato-10',
      'contato-9',
      'bruno',
      'Álvaro',
    ]);
  });

  it('status: pelo rótulo exibido; empate mantém a ordem original', () => {
    expect(names(list, { key: 'status', direction: 'asc' })).toEqual([
      'Álvaro', // Aguardando QR
      'Diogo', // Conectado (1º na lista)
      'bruno', // Conectado (2º na lista)
      'contato-9', // Falhou
      'contato-10', // Parado
    ]);
    expect(names(list, { key: 'status', direction: 'desc' })).toEqual([
      'contato-10',
      'contato-9',
      'Diogo',
      'bruno',
      'Álvaro',
    ]);
  });

  it('número: numérico, pelo conectado ou último conectado; sem número SEMPRE no fim', () => {
    expect(names(list, { key: 'number', direction: 'asc' })).toEqual([
      'Diogo', // 551731670499
      'Álvaro', // 5511988887777 (último conectado)
      'bruno', // 5521977776666
      'contato-10',
      'contato-9',
    ]);
    expect(names(list, { key: 'number', direction: 'desc' })).toEqual([
      'bruno',
      'Álvaro',
      'Diogo',
      'contato-10',
      'contato-9',
    ]);
    expect(
      sessionNumberKey({ meJid: '5511:3@s.whatsapp.net', lastMeJid: null }),
    ).toBe('5511');
    expect(
      sessionNumberKey({ meJid: null, lastMeJid: '5522@s.whatsapp.net' }),
    ).toBe('5522');
    expect(sessionNumberKey({ meJid: null, lastMeJid: null })).toBe('');
  });

  it('engine: BAILEYS antes de WWEBJS; empate na ordem original', () => {
    expect(names(list, { key: 'engine', direction: 'asc' })).toEqual([
      'contato-10',
      'Diogo',
      'Álvaro',
      'bruno',
      'contato-9',
    ]);
    expect(names(list, { key: 'engine', direction: 'desc' })[0]).toBe(
      'contato-9',
    );
  });

  it('ciclo do clique: crescente → decrescente → original; outra coluna recomeça crescente', () => {
    const a = nextSessionSort(null, 'name');
    expect(a).toEqual({ key: 'name', direction: 'asc' });
    const d = nextSessionSort(a, 'name');
    expect(d).toEqual({ key: 'name', direction: 'desc' });
    expect(nextSessionSort(d, 'name')).toBeNull();
    expect(nextSessionSort(d, 'status')).toEqual({
      key: 'status',
      direction: 'asc',
    });
  });

  it('URL: ida e volta em pt-BR, preserva os parâmetros do filtro, limpa ao voltar à original', () => {
    const base = new URLSearchParams('nome=vend&x=1');
    const p = sessionSortToParams({ key: 'number', direction: 'desc' }, base);
    expect(p.toString()).toBe('nome=vend&x=1&ordem=numero&direcao=desc');
    expect(parseSessionSort(p)).toEqual({ key: 'number', direction: 'desc' });
    expect(base.toString()).toBe('nome=vend&x=1');
    expect(sessionSortToParams(null, p).toString()).toBe('nome=vend&x=1');
  });

  it('URL: coluna desconhecida = sem ordenação; direção desconhecida = crescente', () => {
    expect(
      parseSessionSort(new URLSearchParams('ordem=cor&direcao=desc')),
    ).toBeNull();
    expect(
      parseSessionSort(new URLSearchParams('ordem=engine&direcao=xyz')),
    ).toEqual({
      key: 'engine',
      direction: 'asc',
    });
  });
});
