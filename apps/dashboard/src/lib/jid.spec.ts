import { describe, expect, it } from 'vitest';
import {
  displayName,
  formatPhone,
  groupSenderLabel,
  isTriageExcludedChat,
  numberFromJid,
  sendTarget,
  senderColor,
  stripDevice,
} from './jid';

describe('jid (consolidação Inbox × Atendimento)', () => {
  it('numberFromJid tira domínio e aparelho', () => {
    expect(numberFromJid('5511999@s.whatsapp.net')).toBe('5511999');
    expect(numberFromJid('5511999:12@s.whatsapp.net')).toBe('5511999');
    expect(numberFromJid('abc')).toBe('abc');
    expect(stripDevice('5511:3@lid')).toBe('5511@lid');
  });
  it('sendTarget: número só para telefone', () => {
    expect(sendTarget('5511999@c.us')).toBe('5511999');
    expect(sendTarget('5511999@s.whatsapp.net')).toBe('5511999');
    expect(sendTarget('123@lid')).toBe('123@lid');
    expect(sendTarget('123-456@g.us')).toBe('123-456@g.us');
  });
  it('displayName e caixa única', () => {
    expect(displayName({ name: '  ', chatJid: '5511@s.whatsapp.net' })).toBe(
      '5511',
    );
    expect(displayName({ name: 'Ana', chatJid: '5511@s.whatsapp.net' })).toBe(
      'Ana',
    );
    expect(isTriageExcludedChat('1@newsletter')).toBe(true);
    expect(isTriageExcludedChat('status@broadcast')).toBe(true);
    expect(isTriageExcludedChat('1203@g.us')).toBe(true);
    expect(isTriageExcludedChat('5511@s.whatsapp.net')).toBe(false);
  });
  it('formatPhone: Brasil com máscara; outros com +', () => {
    expect(formatPhone('5511988887777')).toBe('+55 11 98888-7777');
    expect(formatPhone('551133334444')).toBe('+55 11 3333-4444');
    expect(formatPhone('14155550100')).toBe('+14155550100');
  });
});

describe('groupSenderLabel (P-074)', () => {
  const g = '120363400000000001@g.us';
  it('linha antiga (senderJid = grupo), fromMe e 1:1 → sem rótulo', () => {
    expect(
      groupSenderLabel({ chatJid: g, senderJid: g, fromMe: false }),
    ).toBeNull();
    expect(
      groupSenderLabel({
        chatJid: g,
        senderJid: '551@s.whatsapp.net',
        fromMe: true,
      }),
    ).toBeNull();
    expect(
      groupSenderLabel({
        chatJid: '551@s.whatsapp.net',
        senderJid: '551@s.whatsapp.net',
        fromMe: false,
      }),
    ).toBeNull();
    expect(
      groupSenderLabel({ chatJid: g, senderJid: null, fromMe: false }),
    ).toBeNull();
  });
  it('nome (senderName) vence; telefone formatado; @lid vira "Participante"', () => {
    expect(
      groupSenderLabel({
        chatJid: g,
        senderJid: '5511988887777@s.whatsapp.net',
        senderName: 'Fulano',
        fromMe: false,
      }),
    ).toEqual({ text: 'Fulano', key: '5511988887777@s.whatsapp.net' });
    expect(
      groupSenderLabel({
        chatJid: g,
        senderJid: '5511988887777:3@c.us',
        fromMe: false,
      }),
    ).toEqual({ text: '+55 11 98888-7777', key: '5511988887777@c.us' });
    expect(
      groupSenderLabel({ chatJid: g, senderJid: '987654@lid', fromMe: false }),
    ).toEqual({ text: 'Participante', key: '987654@lid' });
  });
  it('cor estável por participante', () => {
    const a = senderColor('5511@s.whatsapp.net');
    expect(senderColor('5511@s.whatsapp.net')).toBe(a);
    expect(a).toMatch(/^text-\w+-300$/);
    // participantes diferentes ganham cores diferentes (não uma cor só para todos)
    const colors = new Set(
      Array.from({ length: 20 }, (_, i) =>
        senderColor(`55119${String(i).padStart(8, '0')}@s.whatsapp.net`),
      ),
    );
    expect(colors.size).toBeGreaterThanOrEqual(4);
  });
});
