import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { clampInt } from '../../../shared-kernel/query-int';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { RolesGuard } from '../../iam/interface/roles.guard';
import { SessionRefPipe } from '../../sessions/interface/session-ref.pipe';
import { deriveTriageStatus } from '../application/triage-status';
import {
  INBOX_REPOSITORY,
  type InboxConversationRow,
  type InboxFeedRow,
  type InboxRepository,
  type TriageStatus,
} from '../domain/inbox.repository';

// Chat que a caixa única não atende (mesma lista do repositório — grupo, transmissão, canal).
const EXCLUDED_CHAT_SUFFIXES = ['@g.us', '@broadcast', '@newsletter'];

const STATUSES = ['pending', 'answered', 'ignored'] as const;

const triageSchema = z.object({
  chatJid: z.string().min(5).max(80),
  state: z.enum(['ignored', 'pending']),
  // keyId da mensagem de entrada que o operador viu na tela. Manda o painel: se uma mensagem nova
  // chegou entre a renderização e o clique, a âncora fica velha e a conversa segue vermelha —
  // ninguém "apaga" sem ler. Ausente = âncora na última entrada conhecida AGORA.
  keyId: z.string().min(1).max(200).optional(),
});

// `?sessions=nome-ou-id,outra` → filtro por aparelho (o repositório resolve nome OU id).
// Vazio = todos. Teto de 50 refs — acima disso é abuso, não filtro.
function parseSessionFilter(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const refs = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  return refs.length ? refs : undefined;
}

function isExcludedChat(chatJid: string): boolean {
  return EXCLUDED_CHAT_SUFFIXES.some((suffix) => chatJid.endsWith(suffix));
}

function toConversationDto(row: InboxConversationRow, status: TriageStatus) {
  return {
    sessionId: row.sessionId,
    sessionName: row.sessionName,
    engine: row.engine,
    chatJid: row.chatJid,
    name: row.name,
    phone: row.phone,
    imgUrl: row.imgUrl,
    lastText: row.lastText,
    lastType: row.lastType,
    lastFromMe: row.lastFromMe,
    lastSource: row.lastSource,
    lastTimestamp: row.lastTimestamp.toISOString(),
    lastInboundKeyId: row.lastInboundKeyId,
    lastInboundTimestamp: row.lastInboundTimestamp
      ? row.lastInboundTimestamp.toISOString()
      : null,
    pendingInbound: row.pendingInbound,
    status,
  };
}

function toFeedDto(row: InboxFeedRow) {
  return {
    id: row.id,
    keyId: row.keyId,
    sessionId: row.sessionId,
    sessionName: row.sessionName,
    chatJid: row.chatJid,
    name: row.name,
    fromMe: row.fromMe,
    source: row.source,
    type: row.type,
    text: row.text,
    // Aditivos (E22): tiques das enviadas (P-072 — só exibição) e selo "Encaminhada" (P-066).
    status: row.status,
    isForwarded: row.isForwarded,
    forwardingScore: row.forwardingScore,
    timestamp: row.timestamp.toISOString(),
  };
}

// Caixa única (página Atendimento): visão AGREGADA de TODAS as sessões para triagem humana.
// Aditiva ao contrato (R0) — nada em `/api/sessions/:id/messages/*` muda; o envio continua no
// controller por sessão (esta tela só LÊ e marca a triagem).
@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('inbox')
export class InboxController {
  constructor(
    @Inject(INBOX_REPOSITORY) private readonly repo: InboxRepository,
  ) {}

  // Lista de conversas de todos os aparelhos, mais recente primeiro, com o semáforo calculado.
  // `status` filtra a lista; os contadores vêm do conjunto INTEIRO (senão o painel mentiria).
  @Get('conversations')
  async conversations(
    @Query('limit') limit?: string,
    @Query('sessions') sessions?: string,
    @Query('status') status?: string,
  ) {
    if (status && !STATUSES.includes(status as TriageStatus)) {
      throw new BadRequestException(
        `status inválido: use ${STATUSES.join(' | ')}`,
      );
    }
    const rows = await this.repo.listConversations({
      limit: clampInt(limit, 200, 1, 500),
      sessionIds: parseSessionFilter(sessions),
    });

    const withStatus = rows.map((row) => ({
      row,
      status: deriveTriageStatus(row),
    }));
    const counts = {
      pending: withStatus.filter((c) => c.status === 'pending').length,
      answered: withStatus.filter((c) => c.status === 'answered').length,
      ignored: withStatus.filter((c) => c.status === 'ignored').length,
      total: withStatus.length,
    };

    return {
      counts,
      conversations: withStatus
        .filter((c) => !status || c.status === status)
        .map((c) => toConversationDto(c.row, c.status)),
    };
  }

  // Fluxo cronológico ("todas as mensagens na sequência") — carga inicial da tela. O tempo real
  // fica com o SSE `/api/events/stream`, que já entrega os eventos de todas as sessões.
  @Get('messages')
  async messages(
    @Query('limit') limit?: string,
    @Query('sessions') sessions?: string,
  ) {
    const rows = await this.repo.listFeed({
      limit: clampInt(limit, 100, 1, 300),
      sessionIds: parseSessionFilter(sessions),
    });
    return rows.map(toFeedDto);
  }

  // Marca 🟡 ("não preciso responder") ou desmarca (volta a 🔴). O :id aceita nome OU id da
  // sessão (SessionRefPipe) — sessão inexistente vira 404 antes de gravar nada.
  @Post('sessions/:id/triage')
  async triage(
    @Param('id', SessionRefPipe) sessionId: string,
    @Body() body: unknown,
  ) {
    const parsed = triageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    const { chatJid, state, keyId } = parsed.data;
    if (!chatJid.includes('@') || isExcludedChat(chatJid)) {
      throw new BadRequestException(
        'chatJid deve ser uma conversa 1:1 (grupo, transmissão e canal ficam fora da caixa única)',
      );
    }

    if (state === 'pending') {
      await this.repo.clearTriage(sessionId, chatJid);
      return { sessionId, chatJid, status: 'pending' as TriageStatus };
    }

    const lastInbound = await this.repo.findLastInbound(sessionId, chatJid);

    // Anti-atropelo: o painel manda o keyId da entrada que estava na tela. Se entrou mensagem
    // NOVA entre a renderização e o clique, a marca NÃO é gravada — a conversa fica vermelha e o
    // operador vê o que chegou (o amarelo nunca "engole" mensagem não lida).
    if (keyId && lastInbound && lastInbound.keyId !== keyId) {
      return { sessionId, chatJid, status: 'pending' as TriageStatus };
    }

    // Âncora = a última entrada conhecida. Conversa só com saídas (sem entrada nenhuma): marca
    // sem keyId, com o instante do clique.
    await this.repo.markIgnored({
      sessionId,
      chatJid,
      keyId: lastInbound?.keyId ?? null,
      timestamp: lastInbound?.timestamp ?? new Date(),
    });
    return { sessionId, chatJid, status: 'ignored' as TriageStatus };
  }
}
