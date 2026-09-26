// P-066 (E22) — reações às mensagens (tabela wa_message_reactions). Uma linha por (sessão,
// mensagem-alvo, quem reagiu); reação removida fica como lápide (emoji '').
export interface SaveReactionInput {
  sessionId: string;
  chatJid: string;
  targetKeyId: string; // keyId da mensagem que recebeu a reação
  senderKey: string; // identidade estável de quem reagiu ('me' | 'peer' | jid do participante)
  senderJid: string | null;
  fromMe: boolean;
  emoji: string; // '' = reação removida
  timestamp: Date;
}

export interface StoredReaction {
  targetKeyId: string;
  emoji: string;
  senderJid: string | null;
  fromMe: boolean;
  timestamp: Date;
}

export interface ReactionRepository {
  // Grava ou substitui a reação de quem reagiu (emoji '' = removida → lápide). Não regride: uma
  // reação MAIS ANTIGA que a guardada (reprocessada fora de ordem) é ignorada.
  upsert(input: SaveReactionInput): Promise<void>;
  // Reações VIVAS (emoji ≠ '') das mensagens `targetKeyIds` da sessão, da mais antiga à mais nova.
  // Uma consulta para a página inteira do GET /messages (sem N+1).
  listForMessages(
    sessionId: string,
    targetKeyIds: string[],
  ): Promise<StoredReaction[]>;
}

export const REACTION_REPOSITORY = Symbol('REACTION_REPOSITORY');
