import { Inject, Injectable, Logger } from '@nestjs/common';
import type { HistoryMessage } from '../../sessions/application/engine.port';
import { SessionManager } from '../../sessions/application/session-manager.service';
import {
  MESSAGE_REPOSITORY,
  type MessageRepository,
  type SaveMessageInput,
} from '../domain/message.repository';

// W7 — backfill do inbox: puxa o histórico da engine (só WWEBJS; Baileys lança
// UnsupportedEngineOperationError) e grava DIRETO no banco (wa_messages), deduplicando por keyId.
// De propósito NÃO passa pelo EventBus: histórico não é evento novo → não dispara webhook nem
// conta no reply-rate (G4). Depois do sync, a inbox de leitura (GET /messages/conversations e
// GET /messages) já mostra o que foi importado.
@Injectable()
export class InboxSyncService {
  private readonly logger = new Logger(InboxSyncService.name);

  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repo: MessageRepository,
    private readonly manager: SessionManager,
  ) {}

  // Backfill de UM chat: últimas `limit` mensagens. Devolve quantas vieram e quantas foram novas.
  async syncChat(
    sessionId: string,
    chatJid: string,
    limit: number,
  ): Promise<{ chats: number; fetched: number; imported: number }> {
    const history = await this.manager.fetchChatHistory(
      sessionId,
      chatJid,
      limit,
    );
    const imported = await this.repo.saveHistorical(
      history.map((h) => this.toInput(sessionId, h)),
    );
    return { chats: 1, fetched: history.length, imported };
  }

  // Backfill dos `maxChats` chats mais recentes, `limitPerChat` mensagens cada. Sequencial (cada
  // chamada é um round-trip CDP no Chromium — paralelizar trava). Um chat que falha não derruba o
  // resto (loga e segue).
  async syncAll(
    sessionId: string,
    opts: { maxChats: number; limitPerChat: number },
  ): Promise<{ chats: number; fetched: number; imported: number }> {
    const chats = await this.manager.listChats(sessionId, opts.maxChats);
    let fetched = 0;
    let imported = 0;
    for (const c of chats) {
      try {
        const r = await this.syncChat(sessionId, c.chatJid, opts.limitPerChat);
        fetched += r.fetched;
        imported += r.imported;
      } catch (e) {
        this.logger.warn(
          `backfill do chat ${c.chatJid} falhou: ${(e as Error).message}`,
        );
      }
    }
    return { chats: chats.length, fetched, imported };
  }

  private toInput(sessionId: string, h: HistoryMessage): SaveMessageInput {
    return {
      sessionId,
      keyId: h.keyId,
      chatJid: h.chatJid,
      senderJid: h.senderJid,
      fromMe: h.fromMe,
      type: h.type,
      text: h.text,
      // Histórico nunca é cold nem tem idempotencyKey/source (não é envio nosso pela API).
      isCold: false,
      idempotencyKey: null,
      source: null,
      timestamp: new Date(h.timestamp * 1000),
      mediaType: h.mediaType ?? null,
      mimetype: h.mimetype ?? null,
      fileName: h.fileName ?? null,
      // Backfill não baixa binário → sem mediaKey (GET /media responde 404 p/ mídia histórica).
      mediaKey: null,
      fileSize: h.fileSize ?? null,
      isForwarded: h.isForwarded ?? false,
      forwardingScore: h.forwardingScore ?? null,
    };
  }
}
