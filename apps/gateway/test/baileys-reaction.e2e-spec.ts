import { describe, expect, it } from 'vitest';
import { mapBaileysReaction } from '../src/modules/sessions/infrastructure/baileys/baileys.engine';

// W6 — mapeamento de reação recebida (Baileys) para o payload público do evento message.reaction.
// Cobre a lógica que decide fromMe (a reação é NOSSA?), emoji vazio (= removida), sender e timestamp.
describe('mapBaileysReaction (W6)', () => {
  const chat = '5511999999999@s.whatsapp.net';
  const ourJid = '5511000000000@s.whatsapp.net';
  const ts = 1_700_000_000_000; // ms

  it('contato reage a uma mensagem nossa → fromMe=false, sender=chat', () => {
    const p = mapBaileysReaction(
      { id: 'M1', remoteJid: chat, fromMe: true },
      { text: '👍', key: { fromMe: false }, senderTimestampMs: ts },
      ourJid,
    );
    expect(p).toEqual({
      keyId: 'M1',
      chatJid: chat,
      senderJid: chat,
      emoji: '👍',
      fromMe: false,
      timestamp: 1_700_000_000,
    });
  });

  it('nós reagimos (reaction.key.fromMe) → fromMe=true, sender=ourJid', () => {
    const p = mapBaileysReaction(
      { id: 'M2', remoteJid: chat, fromMe: false },
      { text: '❤️', key: { fromMe: true }, senderTimestampMs: ts },
      ourJid,
    );
    expect(p?.fromMe).toBe(true);
    expect(p?.senderJid).toBe(ourJid);
  });

  it('emoji vazio = reação removida', () => {
    const p = mapBaileysReaction(
      { id: 'M3', remoteJid: chat, fromMe: true },
      { text: '', key: { fromMe: false }, senderTimestampMs: ts },
      ourJid,
    );
    expect(p?.emoji).toBe('');
  });

  it('status@broadcast e key sem id → null (ignorado)', () => {
    expect(
      mapBaileysReaction(
        { id: 'X', remoteJid: 'status@broadcast', fromMe: false },
        { text: '👍' },
        ourJid,
      ),
    ).toBeNull();
    expect(
      mapBaileysReaction({ remoteJid: chat }, { text: '👍' }, ourJid),
    ).toBeNull();
  });
});
