import { describe, expect, it } from 'vitest';
import { clock, listTime, since } from './time-format';

describe('time-format', () => {
  it('clock: HH:mm sem segundos', () => {
    expect(clock('2026-09-25T15:04:59.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });
  it('since: agora / min / h / d', () => {
    const now = Date.parse('2026-09-25T12:00:00Z');
    expect(since('2026-09-25T11:59:30Z', now)).toBe('agora');
    expect(since('2026-09-25T11:57:00Z', now)).toBe('há 3 min');
    expect(since('2026-09-25T10:00:00Z', now)).toBe('há 2 h');
    expect(since('2026-09-21T12:00:00Z', now)).toBe('há 4 d');
  });
  it('listTime: hora se hoje, dd/mm se não', () => {
    const now = new Date(2026, 8, 25, 18, 0);
    expect(listTime(new Date(2026, 8, 25, 9, 30).toISOString(), now)).toMatch(
      /^09:30$/,
    );
    expect(listTime(new Date(2026, 8, 20, 9, 30).toISOString(), now)).toBe(
      '20/09',
    );
  });
});
