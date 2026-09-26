import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Logger,
  NotFoundException,
  NotImplementedException,
  Param,
  Post,
  Query,
  Body,
  Req,
  ServiceUnavailableException,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Env } from '../../../bootstrap/config';
import { ContactDirectory } from '../../../infra/directory/contact-directory.service';
import {
  MediaStorage,
  StorageUnavailableError,
} from '../../../infra/storage/media-storage.service';
import { clampInt } from '../../../shared-kernel/query-int';
import {
  BodyTooLargeError,
  EgressBlockedError,
  egressPolicyFromEnv,
  safeFetch,
} from '../../../shared-kernel/safe-fetch';
import { GuardrailService } from '../../guardrail/guardrail.service';
import { SessionQuarantinedException } from '../../guardrail/session-quarantined.exception';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { RolesGuard } from '../../iam/interface/roles.guard';
import {
  MAX_FORWARD_TARGETS,
  PendingMediaSendError,
  UnsupportedEngineOperationError,
} from '../../sessions/application/engine.port';
import type { MediaSendType } from '../../sessions/application/engine.port';
import { SessionManager } from '../../sessions/application/session-manager.service';
import { SessionRefPipe } from '../../sessions/interface/session-ref.pipe';
import { candidateJids } from '../application/chat-jids';
import { ForwardService } from '../application/forward.service';
import { InboxSyncService } from '../application/inbox-sync.service';
import { sendFingerprint } from '../application/send-intent.decision';
import { SendIntentService } from '../application/send-intent.service';
import {
  MESSAGE_REPOSITORY,
  type ConversationSummary,
  type MessageRepository,
  type StoredMessage,
} from '../domain/message.repository';
import {
  REACTION_REPOSITORY,
  type ReactionRepository,
  type StoredReaction,
} from '../domain/reaction.repository';
import { inlineDisposition, safeContentType } from './content-disposition';

// G1: `cold` marca o 1º contato permissionado; `idempotencyKey` dá dedup forte (retry do n8n
// não duplica). Comuns a texto e mídia.
const coldField = z.boolean().optional();
const idempotencyKeyField = z.string().min(1).max(200).optional();

// W5: menções — lista de números/JIDs a marcar (@). Opcional, aditivo (R0/R4).
const mentionsField = z.array(z.string().min(5).max(40)).max(50).optional();

// W7: backfill do inbox. `chatId` presente = só aquele chat; ausente = os `maxChats` mais recentes.
const inboxSyncSchema = z.object({
  chatId: z.string().min(3).max(40).optional(),
  limit: z.number().int().min(1).max(500).optional(), // mensagens por chat
  maxChats: z.number().int().min(1).max(200).optional(), // só no modo "todos os chats"
});

// W7: gestão de chat. flag = o que mudar; enabled = ligar/desligar.
const chatFlagSchema = z.object({
  flag: z.enum(['archive', 'pin', 'mute', 'unread']),
  enabled: z.boolean(),
});

const sendTextSchema = z.object({
  to: z.string().min(5).max(40),
  text: z.string().min(1).max(4096),
  mentions: mentionsField,
  cold: coldField,
  idempotencyKey: idempotencyKeyField,
});

const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker'] as const;

const sendMediaUrlSchema = z.object({
  to: z.string().min(5).max(40),
  url: z.string().url(),
  type: z.enum(MEDIA_TYPES).optional(),
  caption: z.string().max(4096).optional(),
  fileName: z.string().max(255).optional(),
  mimetype: z.string().max(120).optional(),
  mentions: mentionsField,
  cold: coldField,
  idempotencyKey: idempotencyKeyField,
});

// W5: reação a uma mensagem. emoji vazio ('') REMOVE a reação.
const reactionSchema = z.object({ emoji: z.string().max(20) });

// P-068 (E24): encaminhar — 1 a 5 destinos (número, jid de contato, grupo ou @lid) da MESMA sessão.
// `cold` só SOBE o cold (destino sem conversa já é cold); `idempotencyKey` vale para o lote.
const forwardSchema = z.object({
  to: z
    .array(z.string().min(5).max(80), {
      invalid_type_error: 'to: informe uma lista de destinos',
      required_error: 'to é obrigatório (lista de 1 a 5 destinos)',
    })
    .min(1, 'to: informe ao menos 1 destino')
    .max(
      MAX_FORWARD_TARGETS,
      `to: no máximo ${MAX_FORWARD_TARGETS} destinos por encaminhamento`,
    ),
  cold: coldField,
  idempotencyKey: idempotencyKeyField,
});

// W5: localização.
const sendLocationSchema = z.object({
  to: z.string().min(5).max(40),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().max(255).optional(),
  address: z.string().max(500).optional(),
  cold: coldField,
  idempotencyKey: idempotencyKeyField,
});

// W5: enquete (poll). 2..12 opções (limite do WhatsApp).
const sendPollSchema = z.object({
  to: z.string().min(5).max(40),
  name: z.string().min(1).max(255),
  options: z.array(z.string().min(1).max(100)).min(2).max(12),
  multi: z.boolean().optional(),
  cold: coldField,
  idempotencyKey: idempotencyKeyField,
});

// Infere o tipo de mídia a partir do mimetype quando o cliente não informa.
function inferType(mimetype: string | undefined): MediaSendType {
  if (mimetype?.startsWith('image/')) return 'image';
  if (mimetype?.startsWith('video/')) return 'video';
  if (mimetype?.startsWith('audio/')) return 'audio';
  return 'document';
}

function toConversationDto(c: ConversationSummary) {
  return {
    chatJid: c.chatJid,
    name: c.name,
    imgUrl: c.imgUrl,
    lastText: c.lastText,
    lastType: c.lastType,
    lastFromMe: c.lastFromMe,
    lastTimestamp: c.lastTimestamp.toISOString(),
  };
}

// P-066 (E22): reação como o WhatsApp mostra no balão — emoji + quem reagiu. Só as vivas (a removida
// não aparece); em ordem de horário.
function toReactionDto(r: StoredReaction) {
  return {
    emoji: r.emoji,
    senderJid: r.senderJid,
    fromMe: r.fromMe,
    timestamp: r.timestamp.toISOString(),
  };
}

// E23 (P-074): remetente de uma mensagem RECEBIDA em grupo, quando a linha o tem — as de grupo
// gravadas antes da E23 trazem o jid do próprio grupo em senderJid (= chatJid).
function groupSenderOf(m: StoredMessage): string | null {
  return !m.fromMe &&
    m.chatJid.endsWith('@g.us') &&
    m.senderJid &&
    m.senderJid !== m.chatJid
    ? m.senderJid
    : null;
}

// Chaves de diretório de um remetente (namesFor casa waId/lid/jid/phone): o jid e, quando é
// telefone (@s.whatsapp.net no Baileys, @c.us no WWEBJS), os dígitos — acha o contato gravado no
// outro formato pela coluna phone.
function senderKeys(jid: string): string[] {
  return /@(s\.whatsapp\.net|c\.us)$/.test(jid)
    ? [jid, jid.split('@')[0]]
    : [jid];
}

function toDto(
  m: StoredMessage,
  mediaUrl: string | null,
  reactions: StoredReaction[] = [],
  senderName: string | null = null,
) {
  return {
    id: m.id,
    // keyId = chave real do WhatsApp (CP-149): é o id que markRead e o download de mídia aceitam;
    // o webhook já o entrega, agora o pull (GET /messages) também.
    keyId: m.keyId,
    sessionId: m.sessionId,
    chatJid: m.chatJid,
    senderJid: m.senderJid,
    // E23 (P-074, aditivo): nome de quem mandou a mensagem recebida em GRUPO; null fora disso.
    senderName,
    fromMe: m.fromMe,
    type: m.type,
    text: m.text,
    status: m.status,
    isCold: m.isCold,
    source: m.source,
    timestamp: m.timestamp.toISOString(),
    mediaType: m.mediaType,
    mimetype: m.mimetype,
    fileName: m.fileName,
    fileSize: m.fileSize,
    mediaUrl,
    // P-066 (E22, aditivo): selo "Encaminhada" e reações da mensagem (tabela própria).
    isForwarded: m.isForwarded,
    forwardingScore: m.forwardingScore,
    reactions: reactions.map(toReactionDto),
  };
}

@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('sessions/:id/messages')
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repo: MessageRepository,
    @Inject(REACTION_REPOSITORY)
    private readonly reactions: ReactionRepository,
    private readonly manager: SessionManager,
    private readonly mediaStorage: MediaStorage,
    private readonly guardrail: GuardrailService,
    private readonly inboxSync: InboxSyncService,
    private readonly intents: SendIntentService,
    private readonly config: ConfigService<Env, true>,
    private readonly directory: ContactDirectory,
    private readonly forwarder: ForwardService,
  ) {}

  // G5 hard-gate: só envios COLD passam pelo guard-rail; cold=false (chat aberto) sempre passa.
  // Em modo observação (enforce=false) canSendCold só bloqueia estados aplicados por override
  // manual; a quarentena automática não atua. Bloqueado → 423 SESSION_QUARANTINED (fora do try
  // dos handlers, para não virar 400).
  private async assertColdAllowed(id: string, cold?: boolean): Promise<void> {
    if (!cold) return;
    const gate = await this.guardrail.canSendCold(id);
    if (!gate.allowed) {
      throw new SessionQuarantinedException(gate.state, gate.reason);
    }
  }

  // Lista de conversas (chatJid distintos) p/ a inbox — última msg, nome/foto, ordenada por recência.
  @Get('conversations')
  async conversations(
    @Param('id', SessionRefPipe) id: string,
    @Query('limit') limit?: string,
  ) {
    const take = clampInt(limit, 100, 1, 500);
    const convs = await this.repo.listConversations(id, take);
    return convs.map(toConversationDto);
  }

  @Get()
  async list(
    @Param('id', SessionRefPipe) id: string,
    @Query('chatId') chatId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!chatId) throw new BadRequestException('chatId é obrigatório');
    const take = clampInt(limit, 50, 1, 200);
    const msgs = await this.repo.listByChat(id, candidateJids(chatId), take);
    return this.toDtos(id, msgs);
  }

  // Página do GET /messages e do /search → DTO: reações da página inteira numa consulta só (por
  // keyId — imune ao chatJid @lid × telefone), nome do remetente de grupo (outra consulta só, em
  // paralelo) + URL pré-assinada de cada mídia.
  private async toDtos(sessionId: string, msgs: StoredMessage[]) {
    const byKey = new Map<string, StoredReaction[]>();
    const keyIds = [...new Set(msgs.map((m) => m.keyId).filter(Boolean))];
    const [reactions, names] = await Promise.all([
      this.reactions.listForMessages(sessionId, keyIds),
      this.groupSenderNames(sessionId, msgs),
    ]);
    for (const r of reactions) {
      const list = byKey.get(r.targetKeyId);
      if (list) list.push(r);
      else byKey.set(r.targetKeyId, [r]);
    }
    return Promise.all(
      msgs.map(async (m) => {
        const sender = groupSenderOf(m);
        return toDto(
          m,
          m.mediaKey
            ? await this.mediaStorage.presignedGetUrl(m.mediaKey).catch((e) => {
                this.logger.warn(
                  `mediaUrl indisponível para ${m.mediaKey}: ${(e as Error).message}`,
                );
                return null;
              })
            : null,
          byKey.get(m.keyId),
          sender ? (names.get(sender) ?? null) : null,
        );
      }),
    );
  }

  // E23 (P-074): remetente de grupo → nome, numa ÚNICA consulta ao diretório por página (nenhuma
  // quando a página não tem mensagem de participante). Agenda > pushName, em qualquer das chaves.
  // Falha do diretório → sem nome, com log: o nome é enfeite, o GET não pode cair por ele.
  private async groupSenderNames(
    sessionId: string,
    msgs: StoredMessage[],
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const senders = [
      ...new Set(msgs.map(groupSenderOf).filter((s): s is string => !!s)),
    ];
    if (!senders.length) return out;
    const found = await this.directory
      .namesFor(sessionId, senders.flatMap(senderKeys))
      .catch((e) => {
        this.logger.warn(
          `senderName indisponível (diretório de contatos): ${(e as Error).message}`,
        );
        return new Map<
          string,
          { name: string | null; pushName: string | null }
        >();
      });
    for (const s of senders) {
      const hits = senderKeys(s).flatMap((k) => found.get(k) ?? []);
      const name =
        hits.find((h) => h.name)?.name ??
        hits.find((h) => h.pushName)?.pushName;
      if (name) out.set(s, name);
    }
    return out;
  }

  // W7 — busca por termo (`q`) no texto das mensagens da sessão. `chatId` opcional restringe a uma
  // conversa. Servida do banco → funciona nas 2 engines e alcança o histórico já importado
  // (backfill). Mesmo formato do GET /messages (traz keyId + mediaUrl pré-assinada quando há mídia).
  @Get('search')
  async search(
    @Param('id', SessionRefPipe) id: string,
    @Query('q') q?: string,
    @Query('chatId') chatId?: string,
    @Query('limit') limit?: string,
  ) {
    const term = (q ?? '').trim();
    if (term.length < 1) {
      throw new BadRequestException('q (termo de busca) é obrigatório');
    }
    const take = clampInt(limit, 50, 1, 200);
    const chatJids = chatId ? candidateJids(chatId) : [];
    const msgs = await this.repo.searchMessages(id, term, chatJids, take);
    return this.toDtos(id, msgs);
  }

  // W7 — backfill do inbox: puxa o histórico da engine e grava no banco, populando GET
  // /conversations e GET /messages com conversas anteriores à conexão. `{chatId}` = só aquele chat;
  // sem `chatId` = os `maxChats` mais recentes. Só WWEBJS; Baileys → 501 (a inbox ao vivo dele já
  // funciona via /conversations). Não dispara webhook nem conta no reply-rate. Devolve
  // `{chats, fetched, imported}` (imported = quantas eram novas). Mídia histórica não tem binário.
  @Post('sync')
  async sync(@Param('id', SessionRefPipe) id: string, @Body() body: unknown) {
    const parsed = inboxSyncSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const d = parsed.data;
    try {
      if (d.chatId) {
        return await this.inboxSync.syncChat(id, d.chatId, d.limit ?? 50);
      }
      return await this.inboxSync.syncAll(id, {
        maxChats: d.maxChats ?? 50,
        limitPerChat: d.limit ?? 50,
      });
    } catch (e) {
      // Engine não suporta (Baileys) → 501; o resto (sessão não conectada etc.) → 400.
      if (e instanceof UnsupportedEngineOperationError) {
        throw new NotImplementedException((e as Error).message);
      }
      throw new BadRequestException((e as Error).message);
    }
  }

  // W7 — gestão de chat: arquivar/fixar/silenciar/marcar não-lido. `{chatId}` na URL; corpo
  // `{flag, enabled}`. Só WWEBJS; Baileys → 501. Idempotente. `enabled:false` em `unread` = marca
  // como LIDO (sendSeen). Requer a sessão conectada (WORKING).
  @Post(':chatId/flag')
  async chatFlag(
    @Param('id', SessionRefPipe) id: string,
    @Param('chatId') chatId: string,
    @Body() body: unknown,
  ) {
    const parsed = chatFlagSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    try {
      await this.manager.setChatFlag(
        id,
        chatId,
        parsed.data.flag,
        parsed.data.enabled,
      );
      return { ok: true };
    } catch (e) {
      if (e instanceof UnsupportedEngineOperationError) {
        throw new NotImplementedException((e as Error).message);
      }
      throw new BadRequestException((e as Error).message);
    }
  }

  // GAP 2 (contrato CP-149) — download dos BYTES da mídia pelo próprio gateway. Aceita o id
  // interno (ULID do GET /messages) OU o keyId do WhatsApp (o mesmo do webhook). Streaming do
  // S3 com o Content-Type original — o consumidor (n8n) não depende de o S3 ser público nem do
  // TTL da URL pré-assinada; dá para re-obter a mídia a qualquer momento enquanto ela existir.
  @Get(':msgId/media')
  async downloadMedia(
    @Param('id', SessionRefPipe) id: string,
    @Param('msgId') msgId: string,
  ): Promise<StreamableFile> {
    const msg = await this.repo.findByRef(id, msgId);
    if (!msg) throw new NotFoundException('Mensagem não encontrada');
    if (!msg.mediaKey) {
      throw new NotFoundException(
        'Mídia não disponível: a mensagem não tem mídia ou o binário não foi armazenado (S3 indisponível quando ela chegou).',
      );
    }
    let obj: Awaited<ReturnType<MediaStorage['getObject']>>;
    try {
      obj = await this.mediaStorage.getObject(msg.mediaKey);
    } catch (e) {
      // ABE-21: storage fora/negado é 503 (transitório), não 404 "expirada" (permanente).
      if (e instanceof StorageUnavailableError) {
        throw new ServiceUnavailableException(
          'Armazenamento de mídia indisponível no momento — tente novamente.',
        );
      }
      throw e;
    }
    if (!obj) {
      throw new NotFoundException(
        'Mídia expirada ou removida do armazenamento.',
      );
    }
    return new StreamableFile(obj.body, {
      // E23: mimetype do remetente fora do que cabe num header também derrubava a rota (500).
      type:
        safeContentType(msg.mimetype) ??
        safeContentType(obj.contentType) ??
        'application/octet-stream',
      length: obj.contentLength ?? undefined,
      // E23: nome fora do Latin-1 derrubava a rota (500 ERR_INVALID_CHAR) — ver content-disposition.ts.
      disposition: inlineDisposition(msg.fileName),
    });
  }

  // G8 — marca uma mensagem recebida como lida (read receipt). Resolve o chatJid pela WaMessage.
  @Post(':msgId/read')
  async markRead(
    @Param('id', SessionRefPipe) id: string,
    @Param('msgId') msgId: string,
  ) {
    const msg = await this.repo.findByKeyId(id, msgId);
    if (!msg) throw new NotFoundException('Mensagem não encontrada');
    await this.manager.markRead(id, msg.chatJid, msgId);
    return { ok: true };
  }

  // W5 — reage a uma mensagem com um emoji (emoji vazio remove a reação).
  @Post(':msgId/reaction')
  async reaction(
    @Param('id', SessionRefPipe) id: string,
    @Param('msgId') msgId: string,
    @Body() body: unknown,
  ) {
    const parsed = reactionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const msg = await this.repo.findByKeyId(id, msgId);
    if (!msg) throw new NotFoundException('Mensagem não encontrada');
    try {
      await this.manager.sendReaction(
        id,
        msg.chatJid,
        msgId,
        msg.fromMe,
        parsed.data.emoji,
      );
      return { ok: true };
    } catch (e) {
      if (e instanceof SessionQuarantinedException) throw e;
      throw new BadRequestException((e as Error).message);
    }
  }

  // P-068 (E24) — encaminha a mensagem `msgId` (id interno do GET /messages ou keyId do webhook) para
  // 1..5 destinos da MESMA sessão, como o WhatsApp Web: selo "Encaminhada", mídia reaproveitada,
  // um destino por vez com 1–3 s entre eles. 201 `{results[]}` (uma posição por destino); 400 /
  // 404 / 409 / 423 antes de enviar — regras em ForwardService e INTEGRACAO §2.
  @Post(':msgId/forward')
  async forward(
    @Param('id', SessionRefPipe) id: string,
    @Param('msgId') msgId: string,
    @Body() body: unknown,
  ) {
    const parsed = forwardSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    return this.forwarder.forward(id, msgId, parsed.data);
  }

  // G1: dedup forte. Se já houve um envio com a mesma idempotencyKey nesta sessão, devolve o
  // resultado anterior SEM reenviar (crítico p/ o retry do n8n não duplicar). O índice único
  // (sessionId, idempotencyKey) é a rede de segurança contra corrida; aqui é a pré-checagem.
  private async deduped(
    id: string,
    idempotencyKey?: string,
  ): Promise<{ id: string; to: string; deduped: true } | null> {
    if (!idempotencyKey) return null;
    const hit = await this.repo.findByIdempotencyKey(id, idempotencyKey);
    if (!hit) return null;
    return { id: hit.keyId, to: hit.chatJid, deduped: true };
  }

  // ABE-03 (auditoria 09/2026): intenção DURÁVEL reservada ANTES do transporte. A pré-checagem
  // acima (wa_messages) só enxergava envios já persistidos — duas requisições concorrentes com a
  // mesma key passavam as duas e enviavam duas vezes. Agora: legado (compat com keys anteriores)
  // → reserva atômica (replay | 409 em voo | 409 payload diferente) → gate cold → envio →
  // complete/fail. Sem idempotencyKey o caminho é o de sempre (sem reserva).
  private async sendWithIntent(
    id: string,
    input: {
      idempotencyKey?: string;
      cold?: boolean;
      fingerprint: Record<string, unknown>;
    },
    send: () => Promise<{ keyId: string; jid: string }>,
  ): Promise<{ id: string; to: string; deduped: boolean }> {
    const key = input.idempotencyKey;
    const legacy = await this.deduped(id, key);
    if (legacy) return legacy;
    const intent = key
      ? await this.intents.reserve(id, key, sendFingerprint(input.fingerprint))
      : null;
    if (intent?.kind === 'replay') {
      return { id: intent.keyId, to: intent.chatJid, deduped: true };
    }
    const intentId = intent?.kind === 'reserved' ? intent.intentId : null;
    try {
      await this.assertColdAllowed(id, input.cold);
    } catch (e) {
      if (intentId)
        await this.intents.fail(intentId, 'bloqueado pelo guard-rail');
      throw e;
    }
    try {
      const res = await send();
      if (intentId) await this.intents.complete(intentId, res.keyId, res.jid);
      return { id: res.keyId, to: res.jid, deduped: false };
    } catch (e) {
      if (e instanceof PendingMediaSendError) {
        // Não liberar a idempotencyKey enquanto o CDP ainda pode confirmar o envio.
        // O trabalho continua na fila da sessão e conclui/falha a intenção quando realmente acabar.
        void e.completion
          .then(
            (result) =>
              intentId
                ? this.intents.complete(intentId, result.keyId, result.jid)
                : undefined,
            (err: Error) =>
              intentId ? this.intents.fail(intentId, err.message) : undefined,
          )
          .catch((err: Error) =>
            this.logger.error('Falha ao reconciliar envio WWEBJS tardio', err),
          );
        throw new BadRequestException(e.message);
      }
      if (intentId) await this.intents.fail(intentId, (e as Error).message);
      if (e instanceof SessionQuarantinedException) throw e;
      throw new BadRequestException((e as Error).message);
    }
  }

  @Post('text')
  async sendText(
    @Param('id', SessionRefPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = sendTextSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const { to, text, mentions, cold, idempotencyKey } = parsed.data;
    return this.sendWithIntent(
      id,
      {
        idempotencyKey,
        cold,
        fingerprint: { kind: 'text', to, text, mentions: mentions ?? null },
      },
      () =>
        this.manager.sendText(id, to, text, { cold, idempotencyKey, mentions }),
    );
  }

  // Envio por upload (multipart/form-data): 1 arquivo no campo "file" + campos de texto. O corpo é
  // lido até o fim ANTES de enviar (P-054): um 2º arquivo faz o @fastify/multipart rejeitar com
  // FST_FILES_LIMIT (413, limits.files=1 em fastify-adapter.ts) e nada sai para o WhatsApp. Com
  // o corpo todo lido, data.fields tem também os campos enviados depois do arquivo (README do
  // @fastify/multipart: ler data.fields depois de consumir o stream).
  @Post('media')
  async sendMedia(
    @Param('id', SessionRefPipe) id: string,
    @Req() req: FastifyRequest,
  ) {
    // O MESMO iterador do começo ao fim: req.file()/req.files() de novo criaria outro parser.
    const files = req.files();
    const first = await files.next();
    if (first.done) {
      throw new BadRequestException('arquivo é obrigatório (campo "file")');
    }
    const data = first.value;
    const buffer = await data.toBuffer();
    // Drena o resto do corpo: 2º arquivo → o plugin rejeita aqui com FST_FILES_LIMIT (413).
    const rest = await files.next();
    if (!rest.done) {
      throw new BadRequestException('envie apenas 1 arquivo (campo "file")');
    }
    const fields = data.fields as unknown as Record<
      string,
      { value?: string } | undefined
    >;
    const to = fields.to?.value;
    if (!to) {
      throw new BadRequestException('campo "to" é obrigatório');
    }
    const typeField = fields.type?.value as MediaSendType | undefined;
    const type =
      typeField && (MEDIA_TYPES as readonly string[]).includes(typeField)
        ? typeField
        : inferType(data.mimetype);
    // multipart: cold e idempotencyKey chegam como campos de texto.
    const idempotencyKey = fields.idempotencyKey?.value || undefined;
    const cold = fields.cold?.value === 'true';
    const mimetype = data.mimetype || 'application/octet-stream';
    const fileName = data.filename ?? fields.fileName?.value ?? null;
    const caption = fields.caption?.value ?? null;
    return this.sendWithIntent(
      id,
      {
        idempotencyKey,
        cold,
        fingerprint: {
          kind: 'media',
          to,
          type,
          mimetype,
          fileName,
          caption,
          size: buffer.length,
          sha256: idempotencyKey
            ? sendFingerprint({ b: buffer.toString('base64') })
            : null,
        },
      },
      () =>
        this.manager.sendMedia(id, to, {
          buffer,
          type,
          mimetype,
          fileName,
          caption,
          ptt: fields.ptt?.value === 'true',
          cold,
          idempotencyKey,
        }),
    );
  }

  // Envio por URL (JSON): o gateway baixa o arquivo e envia (uso programático/integrações).
  @Post('media-url')
  async sendMediaUrl(
    @Param('id', SessionRefPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = sendMediaUrlSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const d = parsed.data;
    return this.sendWithIntent(
      id,
      {
        idempotencyKey: d.idempotencyKey,
        cold: d.cold,
        fingerprint: {
          kind: 'media-url',
          to: d.to,
          url: d.url,
          type: d.type ?? null,
          caption: d.caption ?? null,
          fileName: d.fileName ?? null,
          mentions: d.mentions ?? null,
        },
      },
      async () => {
        // Download dentro da intenção: falha de download = intenção failed (retry permitido).
        // ABE-06/07: política de egress (sem rede privada/metadata, redirect validado) e corpo
        // lido em FLUXO com teto MEDIA_MAX_BYTES — antes o arrayBuffer() alocava tudo e só
        // depois media 100 MB.
        let buffer: Buffer;
        let mimetype: string;
        try {
          const res = await safeFetch(d.url, {
            policy: egressPolicyFromEnv(),
            maxBytes: this.config.get('MEDIA_MAX_BYTES', { infer: true }),
            timeoutMs: 20_000,
          });
          if (res.status < 200 || res.status >= 300) {
            throw new Error(`HTTP ${res.status}`);
          }
          mimetype =
            d.mimetype ||
            res.headers.get('content-type')?.split(';')[0] ||
            'application/octet-stream';
          buffer = res.body;
        } catch (e) {
          if (e instanceof EgressBlockedError) {
            throw new Error(`URL de mídia recusada: ${e.message}`);
          }
          if (e instanceof BodyTooLargeError) {
            throw new Error(`mídia ${e.message} (MEDIA_MAX_BYTES)`);
          }
          throw new Error(`não consegui baixar a URL: ${(e as Error).message}`);
        }
        return this.manager.sendMedia(id, d.to, {
          buffer,
          type: d.type ?? inferType(mimetype),
          mimetype,
          fileName: d.fileName ?? null,
          caption: d.caption ?? null,
          mentions: d.mentions,
          cold: d.cold,
          idempotencyKey: d.idempotencyKey,
        });
      },
    );
  }

  // W5 — envia uma localização (mapa).
  @Post('location')
  async sendLocation(
    @Param('id', SessionRefPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = sendLocationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const d = parsed.data;
    return this.sendWithIntent(
      id,
      {
        idempotencyKey: d.idempotencyKey,
        cold: d.cold,
        fingerprint: {
          kind: 'location',
          to: d.to,
          latitude: d.latitude,
          longitude: d.longitude,
          name: d.name ?? null,
          address: d.address ?? null,
        },
      },
      () =>
        this.manager.sendLocation(id, d.to, {
          latitude: d.latitude,
          longitude: d.longitude,
          name: d.name ?? null,
          address: d.address ?? null,
          cold: d.cold,
          idempotencyKey: d.idempotencyKey,
        }),
    );
  }

  // W5 — envia uma enquete (poll).
  @Post('poll')
  async sendPoll(
    @Param('id', SessionRefPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = sendPollSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const d = parsed.data;
    return this.sendWithIntent(
      id,
      {
        idempotencyKey: d.idempotencyKey,
        cold: d.cold,
        fingerprint: {
          kind: 'poll',
          to: d.to,
          name: d.name,
          options: d.options,
          multi: d.multi ?? null,
        },
      },
      () =>
        this.manager.sendPoll(id, d.to, {
          name: d.name,
          options: d.options,
          multi: d.multi,
          cold: d.cold,
          idempotencyKey: d.idempotencyKey,
        }),
    );
  }
}
