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
import { JwtAuthGuard } from '../../iam/interface/auth.guard';
import type { MediaSendType } from '../../sessions/application/engine.port';
import { SessionManager } from '../../sessions/application/session-manager.service';
import {
  MESSAGE_REPOSITORY,
  type MessageRepository,
  type StoredMessage,
} from '../domain/message.repository';

const sendTextSchema = z.object({
  to: z.string().min(5).max(40),
  text: z.string().min(1).max(4096),
});

const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker'] as const;

const sendMediaUrlSchema = z.object({
  to: z.string().min(5).max(40),
  url: z.string().url(),
  type: z.enum(MEDIA_TYPES).optional(),
  caption: z.string().max(4096).optional(),
  fileName: z.string().max(255).optional(),
  mimetype: z.string().max(120).optional(),
});

// Infere o tipo de mídia a partir do mimetype quando o cliente não informa.
function inferType(mimetype: string | undefined): MediaSendType {
  if (mimetype?.startsWith('image/')) return 'image';
  if (mimetype?.startsWith('video/')) return 'video';
  if (mimetype?.startsWith('audio/')) return 'audio';
  return 'document';
}

// JIDs candidatos para uma conversa: cobre as duas formas do 9º dígito BR (§23.11),
// já que o WhatsApp pode armazenar com ou sem o 9.
function candidateJids(chatId: string): string[] {
  if (chatId.includes('@')) return [chatId];
  const digits = chatId.replace(/[^0-9]/g, '');
  const set = new Set<string>([`${digits}@s.whatsapp.net`]);
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const num = digits.slice(4);
    if (num.length === 9 && num.startsWith('9')) {
      set.add(`55${ddd}${num.slice(1)}@s.whatsapp.net`);
    } else if (num.length === 8) {
      set.add(`55${ddd}9${num}@s.whatsapp.net`);
    }
  }
  return [...set];
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
    timestamp: m.timestamp.toISOString(),
    mediaType: m.mediaType,
    mimetype: m.mimetype,
    fileName: m.fileName,
    fileSize: m.fileSize,
    mediaUrl,
  };
}

@UseGuards(JwtAuthGuard)
@Controller('sessions/:id/messages')
export class MessagesController {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repo: MessageRepository,
    private readonly manager: SessionManager,
    private readonly mediaStorage: MediaStorage,
  ) {}

  @Get()
  async list(
    @Param('id') id: string,
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

  @Post('text')
  async sendText(@Param('id') id: string, @Body() body: unknown) {
    const parsed = sendTextSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    try {
      const res = await this.manager.sendText(
        id,
        parsed.data.to,
        parsed.data.text,
      );
      return { id: res.keyId, to: res.jid };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  // Envio por upload (multipart/form-data). Envie os campos de texto ANTES do arquivo
  // (campo "file"); @fastify/multipart só expõe em data.fields o que vem antes do arquivo.
  @Post('media')
  async sendMedia(@Param('id') id: string, @Req() req: FastifyRequest) {
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
    try {
      const res = await this.manager.sendMedia(id, to, {
        buffer,
        type,
        mimetype: data.mimetype || 'application/octet-stream',
        fileName: data.filename ?? fields.fileName?.value ?? null,
        caption: fields.caption?.value ?? null,
        ptt: fields.ptt?.value === 'true',
      });
      return { id: res.keyId, to: res.jid };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  // Envio por URL (JSON): o gateway baixa o arquivo e envia (uso programático/integrações).
  @Post('media-url')
  async sendMediaUrl(@Param('id') id: string, @Body() body: unknown) {
    const parsed = sendMediaUrlSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const d = parsed.data;
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
      });
      return { id: res.keyId, to: res.jid };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
}
