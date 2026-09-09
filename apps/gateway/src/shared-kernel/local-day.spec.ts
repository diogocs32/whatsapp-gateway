import { describe, expect, it } from 'vitest';
import { startOfLocalDay } from './local-day';

describe('startOfLocalDay', () => {
  it('America/Sao_Paulo (UTC-3): 01:30Z de 10/09 ainda é 09/09 local → meia-noite local = 03:00Z de 09/09', () => {
    const now = new Date('2026-09-10T01:30:00.000Z');
    expect(startOfLocalDay('America/Sao_Paulo', now).toISOString()).toBe(
      '2026-09-09T03:00:00.000Z',
    );
  });

  it('America/Sao_Paulo: 12:00Z de 10/09 → meia-noite local = 03:00Z de 10/09', () => {
    const now = new Date('2026-09-10T12:00:00.000Z');
    expect(startOfLocalDay('America/Sao_Paulo', now).toISOString()).toBe(
      '2026-09-10T03:00:00.000Z',
    );
  });

  it('UTC: meia-noite UTC do próprio dia', () => {
    const now = new Date('2026-09-10T23:59:59.000Z');
    expect(startOfLocalDay('UTC', now).toISOString()).toBe(
      '2026-09-10T00:00:00.000Z',
    );
  });

  it('fuso positivo (Asia/Tokyo, UTC+9): 20:00Z de 10/09 já é 11/09 local → 15:00Z de 10/09', () => {
    const now = new Date('2026-09-10T20:00:00.000Z');
    expect(startOfLocalDay('Asia/Tokyo', now).toISOString()).toBe(
      '2026-09-10T15:00:00.000Z',
    );
  });

  it('fuso inválido cai no dia UTC (não lança)', () => {
    const now = new Date('2026-09-10T10:00:00.000Z');
    expect(startOfLocalDay('Nao/Existe', now).toISOString()).toBe(
      '2026-09-10T00:00:00.000Z',
    );
  });
});
