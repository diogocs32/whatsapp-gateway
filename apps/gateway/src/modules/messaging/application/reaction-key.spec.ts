import { describe, expect, it } from 'vitest';
import {
  reactionSenderKey,
  stripDevice,
  toReactionInput,
} from './reaction-key';

// P-066 (E22) — identidade de quem reagiu (unique da wa_message_reactions: uma reação por pessoa).
describe('reactionSenderKey', () => {
  it('nossa reação é sempre "me" (API ou celular, com ou sem aparelho)', () => {
    expect(
      reactionSenderKey({
        chatJid: '5511@s.whatsapp.net',
        senderJid: '5511000:12@s.whatsapp.net',
        fromMe: true,
      }),
    ).toBe('me');
  });
  it('contato em 1:1 é "peer" — o mesmo como @lid ou como telefone', () => {
    expect(
      reactionSenderKey({
        chatJid: '5511@s.whatsapp.net',
        senderJid: '5511@s.whatsapp.net',
        fromMe: false,
      }),
    ).toBe('peer');
    expect(
      reactionSenderKey({
        chatJid: '99887766@lid',
        senderJid: '99887766@lid',
        fromMe: false,
      }),
    ).toBe('peer');
    expect(
      reactionSenderKey({
        chatJid: '5511@c.us',
        senderJid: null,
        fromMe: false,
      }),
    ).toBe('peer');
  });
  it('grupo: o participante, sem o sufixo de aparelho; sem remetente → "unknown"', () => {
    expect(
      reactionSenderKey({
        chatJid: '1203@g.us',
        senderJid: '5511911:3@s.whatsapp.net',
        fromMe: false,
      }),
    ).toBe('5511911@s.whatsapp.net');
    expect(
      reactionSenderKey({
        chatJid: '1203@g.us',
        senderJid: null,
        fromMe: false,
      }),
    ).toBe('unknown');
  });
});

describe('stripDevice', () => {
  it.each([
    ['5511:12@s.whatsapp.net', '5511@s.whatsapp.net'],
    ['998877:5@lid', '998877@lid'],
    ['5511@c.us', '5511@c.us'],
  ])('%s → %s', (i, o) => expect(stripDevice(i)).toBe(o));
});

describe('toReactionInput', () => {
  it('converte segundos → Date e mantém emoji vazio (remoção)', () => {
    expect(
      toReactionInput('s1', {
        keyId: 'K',
        chatJid: '5511@s.whatsapp.net',
        senderJid: '5511@s.whatsapp.net',
        emoji: '',
        fromMe: false,
        timestamp: 1_700_000_000,
      }),
    ).toEqual({
      sessionId: 's1',
      chatJid: '5511@s.whatsapp.net',
      targetKeyId: 'K',
      senderKey: 'peer',
      senderJid: '5511@s.whatsapp.net',
      fromMe: false,
      emoji: '',
      timestamp: new Date(1_700_000_000_000),
    });
  });
  it('reação nossa → senderKey me e fromMe true', () => {
    expect(
      toReactionInput('s1', {
        keyId: 'K',
        chatJid: '5511@s.whatsapp.net',
        senderJid: '5511000:7@s.whatsapp.net',
        emoji: '👍',
        fromMe: true,
        timestamp: 1,
      }),
    ).toMatchObject({ senderKey: 'me', fromMe: true });
  });
  it('sem mensagem-alvo ou sem chat → null', () => {
    const p = {
      keyId: '',
      chatJid: 'x',
      senderJid: null,
      emoji: '👍',
      fromMe: false,
      timestamp: 1,
    };
    expect(toReactionInput('s', p)).toBeNull();
    expect(toReactionInput('s', { ...p, keyId: 'K', chatJid: '' })).toBeNull();
  });
});
