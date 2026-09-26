// Caixa única (página Atendimento do painel): leitura AGREGADA de TODAS as sessões e a marca
// manual de triagem. Complementa o MessageRepository (que é sempre por sessão) sem substituí-lo —
// o contrato público `/api/sessions/:id/messages/*` fica intacto (R0).
//
// Grupos e listas de transmissão NÃO entram (decisão do dono 15/09/2026): a caixa única existe
// para conversa 1:1 que espera resposta humana.

// Estado de triagem de uma conversa (o "semáforo" do painel):
//   pending  🔴 a última mensagem é do contato → precisa responder
//   answered 🟢 a última mensagem é minha (pela API ou pelo CELULAR, source='phone')
//   ignored  🟡 marcado à mão como "não preciso responder" (vale só para aquela entrada)
export type TriageStatus = 'pending' | 'answered' | 'ignored';

// Uma conversa da caixa única. `last*` é a última mensagem (qualquer direção); `lastInbound*` é a
// última mensagem DE ENTRADA — é ela que o amarelo ancora; `triage*` é a marca manual persistida.
export interface InboxConversationRow {
  sessionId: string;
  sessionName: string;
  engine: string;
  chatJid: string;
  name: string | null; // COALESCE(name, verifiedName, pushName) de wa_contacts
  phone: string | null;
  imgUrl: string | null;
  lastText: string | null;
  lastType: string;
  lastFromMe: boolean;
  lastSource: string | null; // 'phone' = respondido no aparelho; 'api' = pelo gateway/painel
  lastTimestamp: Date;
  lastInboundKeyId: string | null;
  lastInboundTimestamp: Date | null;
  // Quantas mensagens de entrada chegaram DEPOIS da minha última resposta (0 quando respondido).
  pendingInbound: number;
  triageKeyId: string | null;
  triageTimestamp: Date | null;
}

// Uma mensagem do fluxo cronológico (todas as sessões juntas, em sequência).
export interface InboxFeedRow {
  id: string;
  keyId: string;
  sessionId: string;
  sessionName: string;
  chatJid: string;
  name: string | null;
  fromMe: boolean;
  source: string | null;
  type: string;
  text: string | null;
  // P-072 (E22): ACK da mensagem enviada (sent|delivered|read) — tiques no painel; null em entrada
  // e em enviada ainda sem recibo. P-066: selo "Encaminhada".
  status: string | null;
  isForwarded: boolean;
  forwardingScore: number | null;
  timestamp: Date;
}

export interface InboxRepository {
  // Conversas de todas as sessões (ou das sessões filtradas), mais recente primeiro.
  listConversations(opts: {
    limit: number;
    sessionIds?: string[];
  }): Promise<InboxConversationRow[]>;
  // Carga inicial do fluxo ao vivo: últimas mensagens de todas as sessões, mais recente primeiro.
  listFeed(opts: {
    limit: number;
    sessionIds?: string[];
  }): Promise<InboxFeedRow[]>;
  // Última mensagem de ENTRADA de uma conversa — âncora default do amarelo quando o cliente não
  // manda a que viu na tela.
  findLastInbound(
    sessionId: string,
    chatJid: string,
  ): Promise<{ keyId: string; timestamp: Date } | null>;
  // Marca/atualiza o amarelo ancorado numa mensagem de entrada (upsert por sessão+chat).
  markIgnored(input: {
    sessionId: string;
    chatJid: string;
    keyId: string | null;
    timestamp: Date;
  }): Promise<void>;
  // Remove a marca (volta ao vermelho/verde derivado dos dados).
  clearTriage(sessionId: string, chatJid: string): Promise<void>;
}

export const INBOX_REPOSITORY = Symbol('INBOX_REPOSITORY');
