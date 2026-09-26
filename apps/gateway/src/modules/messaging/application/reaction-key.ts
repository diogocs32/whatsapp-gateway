import type { ReactionPayload } from '../../sessions/application/engine.port';
import type { SaveReactionInput } from '../domain/reaction.repository';

// P-066 (E22) — traduz o evento `message.reaction` na linha de wa_message_reactions. Pura/testável.
//
// `senderKey` é a identidade de quem reagiu usada no unique (uma reação por pessoa por mensagem):
//   'me'   → nós (API ou celular — o WhatsApp trata como a mesma conta);
//   'peer' → o contato numa conversa 1:1 (o único outro lado possível): imune à troca @lid ×
//            telefone, que no Baileys 7 pode mudar entre duas reações da mesma pessoa;
//   jid    → participante de grupo, sem o sufixo de aparelho (`:12@`), que muda por device.
// Grupo sem remetente conhecido cai em 'unknown' (melhor colidir do que perder a reação).
export function reactionSenderKey(p: {
  chatJid: string;
  senderJid: string | null;
  fromMe: boolean;
}): string {
  if (p.fromMe) return 'me';
  if (!p.chatJid.endsWith('@g.us')) return 'peer';
  return p.senderJid ? stripDevice(p.senderJid) : 'unknown';
}

// `5511999:12@s.whatsapp.net` → `5511999@s.whatsapp.net` (idem @lid). Sem sufixo → igual.
export function stripDevice(jid: string): string {
  return jid.replace(/:\d+(?=@)/, '');
}

// null = evento inválido (sem mensagem-alvo ou sem chat) — não grava nada.
export function toReactionInput(
  sessionId: string,
  p: ReactionPayload,
): SaveReactionInput | null {
  if (!p?.keyId || !p.chatJid) return null;
  const seconds = Number.isFinite(p.timestamp)
    ? p.timestamp
    : Math.floor(Date.now() / 1000);
  return {
    sessionId,
    chatJid: p.chatJid,
    targetKeyId: p.keyId,
    senderKey: reactionSenderKey(p),
    senderJid: p.senderJid ?? null,
    fromMe: !!p.fromMe,
    emoji: p.emoji ?? '',
    timestamp: new Date(seconds * 1000),
  };
}
