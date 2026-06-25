import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { MediaStorage } from '../../../infra/storage/media-storage.service';
import { GuardrailService } from '../../guardrail/guardrail.service';
import { SessionQuarantinedException } from '../../guardrail/session-quarantined.exception';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { RolesGuard } from '../../iam/interface/roles.guard';
import type { MediaSendType } from '../../sessions/application/engine.port';
import { SessionManager } from '../../sessions/application/session-manager.service';
import { SessionRefPipe } from '../../sessions/interface/session-ref.pipe';
import {
  MESSAGE_REPOSITORY,
  type ConversationSummary,
  type MessageRepository,
  type StoredMessage,
} from '../domain/message.repository';

// G1: `cold` marca o 1º contato permissionado; `idempotencyKey` dá dedup forte (retry do n8n
// não duplica). Comuns a texto e mídia.
const coldField = z.boolean().optional();
const idempotencyKeyField = z.string().min(1).max(200).optional();

const sendTextSchema = z.object({
  to: z.string().min(5).max(40),
  text: z.string().min(1).max(4096),
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

// JIDs candidatos para uma conversa. Cobre (a) as duas formas do 9º dígito BR (§23.11) — o
// WhatsApp pode armazenar com ou sem o 9 — e (b) os dois sufixos de servidor: `@s.whatsapp.net`
// (engine Baileys) e `@c.us` (engine whatsapp-web.js / WWEBJS). Sem o `@c.us`, o inbox de uma
// sessão WWEBJS aparece vazio (as mensagens são persistidas com `<num>@c.us`).
function candidateJids(chatId: string): string[] {
  if (chatId.includes('@')) return [chatId];
  const digits = chatId.replace(/[^0-9]/g, '');
  const numbers = new Set<string>([digits]);
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const num = digits.slice(4);
    if (num.length === 9 && num.startsWith('9')) {
      numbers.add(`55${ddd}${num.slice(1)}`);
    } else if (num.length === 8) {
      numbers.add(`55${ddd}9${num}`);
    }
  }
  const jids = new Set<string>();
  for (const n of numbers) {
    jids.add(`${n}@s.whatsapp.net`);
    jids.add(`${n}@c.us`);
  }
  return [...jids];
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

function toDto(m: StoredMessage, mediaUrl: string | null) {
  return {
    id: m.id,
    sessionId: m.sessionId,
    chatJid: m.chatJid,
    senderJid: m.senderJid,
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
  };
}

@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('sessions/:id/messages')
export class MessagesController {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repo: MessageRepository,
    private readonly manager: SessionManager,
    private readonly mediaStorage: MediaStorage,
    private readonly guardrail: GuardrailService,
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
    const take = Math.min(Number(limit) || 100, 500);
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
    const take = Math.min(Number(limit) || 50, 200);
    const msgs = await this.repo.listByChat(id, candidateJids(chatId), take);
    return Promise.all(
      msgs.map(async (m) =>
        toDto(
          m,
          m.mediaKey
            ? await this.mediaStorage
                .presignedGetUrl(m.mediaKey)
                .catch(() => null)
            : null,
        ),
      ),
    );
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

  @Post('text')
  async sendText(@Param('id', SessionRefPipe) id: string, @Body() body: unknown) {
    const parsed = sendTextSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const { to, text, cold, idempotencyKey } = parsed.data;
    const dup = await this.deduped(id, idempotencyKey);
    if (dup) return dup;
    await this.assertColdAllowed(id, cold);
    try {
      const res = await this.manager.sendText(id, to, text, {
        cold,
        idempotencyKey,
      });
      return { id: res.keyId, to: res.jid, deduped: false };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  // Envio por upload (multipart/form-data). Envie os campos de texto ANTES do arquivo
  // (campo "file"); @fastify/multipart só expõe em data.fields o que vem antes do arquivo.
  @Post('media')
  async sendMedia(@Param('id', SessionRefPipe) id: string, @Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('arquivo é obrigatório (campo "file")');
    }
    const buffer = await data.toBuffer();
    const fields = data.fields as unknown as Record<
      string,
      { value?: string } | undefined
    >;
    const to = fields.to?.value;
    if (!to) {
      throw new BadRequestException(
        'campo "to" é obrigatório (envie-o antes do arquivo)',
      );
    }
    const typeField = fields.type?.value as MediaSendType | undefined;
    const type =
      typeField && (MEDIA_TYPES as readonly string[]).includes(typeField)
        ? typeField
        : inferType(data.mimetype);
    // multipart: cold e idempotencyKey chegam como campos de texto (envie-os antes do arquivo).
    const idempotencyKey = fields.idempotencyKey?.value || undefined;
    const cold = fields.cold?.value === 'true';
    const dup = await this.deduped(id, idempotencyKey);
    if (dup) return dup;
    await this.assertColdAllowed(id, cold);
    try {
      const res = await this.manager.sendMedia(id, to, {
        buffer,
        type,
        mimetype: data.mimetype || 'application/octet-stream',
        fileName: data.filename ?? fields.fileName?.value ?? null,
        caption: fields.caption?.value ?? null,
        ptt: fields.ptt?.value === 'true',
        cold,
        idempotencyKey,
      });
      return { id: res.keyId, to: res.jid, deduped: false };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  // Envio por URL (JSON): o gateway baixa o arquivo e envia (uso programático/integrações).
  @Post('media-url')
  async sendMediaUrl(@Param('id', SessionRefPipe) id: string, @Body() body: unknown) {
    const parsed = sendMediaUrlSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const d = parsed.data;
    const dup = await this.deduped(id, d.idempotencyKey);
    if (dup) return dup;
    await this.assertColdAllowed(id, d.cold);
    let buffer: Buffer;
    let mimetype: string;
    try {
      const res = await fetch(d.url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      mimetype =
        d.mimetype ||
        res.headers.get('content-type')?.split(';')[0] ||
        'application/octet-stream';
      buffer = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      throw new BadRequestException(
        `não consegui baixar a URL: ${(e as Error).message}`,
      );
    }
    if (buffer.length > 100 * 1024 * 1024) {
      throw new BadRequestException('arquivo acima de 100 MB');
    }
    try {
      const res = await this.manager.sendMedia(id, d.to, {
        buffer,
        type: d.type ?? inferType(mimetype),
        mimetype,
        fileName: d.fileName ?? null,
        caption: d.caption ?? null,
        cold: d.cold,
        idempotencyKey: d.idempotencyKey,
      });
      return { id: res.keyId, to: res.jid, deduped: false };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
}
