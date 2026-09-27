import { describe, expect, it } from 'vitest';
import type { SessionDto } from '@contracts';
import {
  EMPTY_SESSION_FILTER,
  filterSessions,
  isSessionFilterActive,
  matchesSessionFilter,
  parseSessionFilter,
  sessionFilterToParams,
  type SessionFilter,
} from './session-filter';

function session(over: Partial<SessionDto>): SessionDto {
  return {
    id: over.name ?? 'id',
    name: 'vendas-01',
    engine: 'BAILEYS',
    status: 'WORKING',
    meJid: null,
    mePushName: null,
    lastMeJid: null,
    phoneNumber: null,
    autostart: true,
    lastError: null,
    lastErrorDetails: null,
    createdAt: '2026-09-27T00:00:00.000Z',
    updatedAt: '2026-09-27T00:00:00.000Z',
    ...over,
  };
}

const f = (over: Partial<SessionFilter>): SessionFilter => ({
  ...EMPTY_SESSION_FILTER,
  ...over,
});

describe('session-filter (P-089)', () => {
  const list = [
    session({
      name: 'Vendas-SP',
      status: 'WORKING',
      meJid: '5511988887777:12@s.whatsapp.net',
    }),
    session({ name: 'suporte', status: 'SCAN_QR_CODE' }),
    session({
      name: 'Cobrança',
      status: 'FAILED',
      meJid: '551177776666@s.whatsapp.net',
    }),
    session({
      name: 'pairing-rj',
      status: 'STOPPED',
      phoneNumber: '+55 21 97777-6666',
    }),
  ];
  const names = (filter: SessionFilter) =>
    filterSessions(list, filter).map((s) => s.name);

  it('sem filtro devolve tudo (cópia, na ordem)', () => {
    const out = filterSessions(list, EMPTY_SESSION_FILTER);
    expect(out.map((s) => s.name)).toEqual(list.map((s) => s.name));
    expect(out).not.toBe(list);
    expect(isSessionFilterActive(EMPTY_SESSION_FILTER)).toBe(false);
  });

  it('nome: contém, sem diferenciar caixa nem acento', () => {
    expect(names(f({ name: 'VENDAS' }))).toEqual(['Vendas-SP']);
    expect(names(f({ name: 'cobranca' }))).toEqual(['Cobrança']);
    expect(names(f({ name: '  sup ' }))).toEqual(['suporte']);
    expect(names(f({ name: 'nada' }))).toEqual([]);
  });

  it('status: exato, e "desconectadas" = tudo que não está WORKING', () => {
    expect(names(f({ status: 'FAILED' }))).toEqual(['Cobrança']);
    expect(names(f({ status: 'DISCONNECTED' }))).toEqual([
      'suporte',
      'Cobrança',
      'pairing-rj',
    ]);
  });

  it('número: só dígitos, casa com meJid sem aparelho e com phoneNumber', () => {
    expect(names(f({ number: '+55 (11) 98888-7777' }))).toEqual(['Vendas-SP']);
    expect(names(f({ number: '6666' }))).toEqual(['Cobrança', 'pairing-rj']);
    expect(names(f({ number: '21 97777' }))).toEqual(['pairing-rj']);
    // O sufixo de aparelho (":12") não é número da conta.
    expect(names(f({ number: '777712' }))).toEqual([]);
  });

  it('número: 9º dígito BR presente ou ausente nos dois sentidos', () => {
    // meJid sem o 9 (conta antiga) × dono digitando com o 9.
    expect(names(f({ number: '11 97777-6666' }))).toEqual(['Cobrança']);
    // meJid com o 9 × dono digitando sem o 9.
    expect(names(f({ number: '1188887777' }))).toEqual(['Vendas-SP']);
    // phoneNumber com o 9 × número completo sem o 9.
    expect(names(f({ number: '552177776666' }))).toEqual(['pairing-rj']);
  });

  it('número sem dígitos não filtra; LID não é telefone', () => {
    expect(isSessionFilterActive(f({ number: 'abc' }))).toBe(false);
    expect(names(f({ number: 'abc' }))).toHaveLength(list.length);
    const lid = session({ name: 'lid', meJid: '123456789@lid' });
    expect(matchesSessionFilter(lid, f({ number: '1234' }))).toBe(false);
  });

  it('sessão caída acha pelo lastMeJid (meJid zerado), LID ignorado', () => {
    const fallen = session({
      name: 'caiu',
      status: 'STOPPED',
      meJid: null,
      lastMeJid: '5531977776666:3@s.whatsapp.net',
    });
    expect(matchesSessionFilter(fallen, f({ number: '31 97777-6666' }))).toBe(
      true,
    );
    // 9º dígito também vale para o último número.
    expect(matchesSessionFilter(fallen, f({ number: '3177776666' }))).toBe(
      true,
    );
    expect(matchesSessionFilter(fallen, f({ number: '66663' }))).toBe(false);
    const lid = session({ name: 'lid', lastMeJid: '987654321@lid' });
    expect(matchesSessionFilter(lid, f({ number: '9876' }))).toBe(false);
  });

  it('combina os três filtros (E)', () => {
    expect(
      names(f({ name: 'o', status: 'DISCONNECTED', number: '6666' })),
    ).toEqual(['Cobrança']);
  });

  it('URL: ida e volta em pt-BR, vazios saem, outros parâmetros ficam', () => {
    const base = new URLSearchParams('x=1&nome=antigo');
    const params = sessionFilterToParams(
      f({ name: 'vendas', status: 'DISCONNECTED' }),
      base,
    );
    expect(params.toString()).toBe('x=1&nome=vendas&status=DISCONNECTED');
    expect(parseSessionFilter(params)).toEqual(
      f({ name: 'vendas', status: 'DISCONNECTED' }),
    );
    expect(base.toString()).toBe('x=1&nome=antigo');
  });

  it('URL: status desconhecido vira "todos"', () => {
    expect(
      parseSessionFilter(new URLSearchParams('status=BANIDA&numero=11')),
    ).toEqual(f({ number: '11' }));
  });
});
