import { describe, expect, it } from 'vitest';
import {
  forwarding,
  formatContacts,
  formatLocation,
  formatPoll,
} from './message-content';

// P-066 (E22) — formatadores comuns às duas engines (o mesmo texto sai do Baileys e do wwebjs).
describe('forwarding (selo "Encaminhada")', () => {
  it('score só quando encaminhada de fato; limita ao integer da coluna', () => {
    expect(forwarding(true, 5)).toEqual({
      isForwarded: true,
      forwardingScore: 5,
    });
    expect(forwarding(false, 0)).toEqual({
      isForwarded: false,
      forwardingScore: null,
    });
    expect(forwarding(undefined, undefined)).toEqual({
      isForwarded: false,
      forwardingScore: null,
    });
    expect(forwarding(true, 0)).toEqual({
      isForwarded: true,
      forwardingScore: null,
    });
    // score > 0 sem a flag (lib antiga) ainda é encaminhada
    expect(forwarding(null, 3).isForwarded).toBe(true);
    // uint32 do proto além do integer do Postgres
    expect(forwarding(true, 4_294_967_295).forwardingScore).toBe(2_147_483_647);
    expect(forwarding(true, -1)).toEqual({
      isForwarded: true,
      forwardingScore: null,
    });
  });
});

describe('formatLocation', () => {
  it('coordenada 0,0 ou inválida não vira link', () => {
    expect(formatLocation({ latitude: 0, longitude: 0 })).toBeNull();
    expect(formatLocation({ latitude: 'x', longitude: 1, name: 'Casa' })).toBe(
      'Casa',
    );
  });
});

describe('formatContacts', () => {
  it('sem displayName usa o FN do vCard; vários TEL', () => {
    expect(
      formatContacts([
        {
          vcard:
            'BEGIN:VCARD\nFN;CHARSET=UTF-8:Ana\nitem1.TEL;waid=5511:+55 11 1\nTEL:+55 11 2\nEND:VCARD',
        },
      ]),
    ).toBe('Ana — +55 11 1 — +55 11 2');
  });
  it('vazio → null', () => {
    expect(formatContacts([])).toBeNull();
  });
});

describe('formatPoll', () => {
  it('ignora opções vazias; sem nada → null', () => {
    expect(formatPoll('P?', ['a', '', null, 'b'])).toBe('P?\n• a\n• b');
    expect(formatPoll(null, [])).toBeNull();
  });
});
