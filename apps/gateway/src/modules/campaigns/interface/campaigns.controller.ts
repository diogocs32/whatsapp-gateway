import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../iam/interface/auth.guard';
import { CampaignService } from '../application/campaign.service';

const createCampaignSchema = z
  .object({
    sessionId: z.string().min(1),
    name: z.string().min(1).max(120),
    messageType: z
      .enum(['text', 'image', 'video', 'audio', 'document'])
      .default('text'),
    text: z.string().max(4096).optional(),
    mediaUrl: z.string().url().optional(),
    mediaMime: z.string().max(120).optional(),
    fileName: z.string().max(255).optional(),
    recipients: z.array(z.string().min(5).max(40)).min(1).max(100000),
    minDelaySec: z.number().int().min(1).max(3600).default(8),
    maxDelaySec: z.number().int().min(1).max(3600).default(25),
    dailyCap: z.number().int().min(1).optional(),
    typingPreview: z.boolean().default(true),
    scheduledAt: z.string().datetime().optional(),
    autostart: z.boolean().default(false),
  })
  .refine((d) => d.maxDelaySec >= d.minDelaySec, {
    message: 'maxDelaySec deve ser >= minDelaySec',
    path: ['maxDelaySec'],
  })
  .refine((d) => (d.messageType === 'text' ? !!d.text : !!d.mediaUrl), {
    message: 'text é obrigatório p/ texto; mediaUrl p/ mídia',
    path: ['text'],
  });

type CampaignRow = {
  id: string;
  sessionId: string;
  name: string;
  messageType: string;
  text: string | null;
  mediaUrl: string | null;
  status: string;
  total: number;
  sentCount: number;
  failedCount: number;
  minDelaySec: number;
  maxDelaySec: number;
  dailyCap: number | null;
  typingPreview: boolean;
  scheduledAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
};

function toDto(c: CampaignRow) {
  return {
    id: c.id,
    sessionId: c.sessionId,
    name: c.name,
    messageType: c.messageType,
    text: c.text,
    mediaUrl: c.mediaUrl,
    status: c.status,
    total: c.total,
    sentCount: c.sentCount,
    failedCount: c.failedCount,
    minDelaySec: c.minDelaySec,
    maxDelaySec: c.maxDelaySec,
    dailyCap: c.dailyCap,
    typingPreview: c.typingPreview,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    startedAt: c.startedAt?.toISOString() ?? null,
    finishedAt: c.finishedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly service: CampaignService) {}

  @Get()
  async list(@Query('sessionId') sessionId?: string) {
    return (await this.service.list(sessionId)).map(toDto);
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const d = parsed.data;
    try {
      const c = await this.service.create(
        {
          sessionId: d.sessionId,
          name: d.name,
          messageType: d.messageType,
          text: d.text ?? null,
          mediaUrl: d.mediaUrl ?? null,
          mediaMime: d.mediaMime ?? null,
          fileName: d.fileName ?? null,
          minDelaySec: d.minDelaySec,
          maxDelaySec: d.maxDelaySec,
          dailyCap: d.dailyCap ?? null,
          typingPreview: d.typingPreview,
          scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
          recipients: d.recipients,
        },
        d.autostart,
      );
      return toDto(c);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return toDto(await this.ensure(id));
  }

  @Get(':id/recipients')
  async recipients(@Param('id') id: string) {
    await this.ensure(id);
    const rows = await this.service.recipients(id);
    return rows.map((r) => ({
      id: r.id,
      to: r.to,
      status: r.status,
      error: r.error,
      sentAt: r.sentAt?.toISOString() ?? null,
    }));
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    await this.run(() => this.service.start(id));
    return { ok: true };
  }
  @Post(':id/pause')
  async pause(@Param('id') id: string) {
    await this.run(() => this.service.pause(id));
    return { ok: true };
  }
  @Post(':id/resume')
  async resume(@Param('id') id: string) {
    await this.run(() => this.service.resume(id));
    return { ok: true };
  }
  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    await this.run(() => this.service.cancel(id));
    return { ok: true };
  }
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.run(() => this.service.remove(id));
    return { ok: true };
  }

  private async ensure(id: string): Promise<CampaignRow> {
    try {
      return (await this.service.get(id)) as unknown as CampaignRow;
    } catch {
      throw new NotFoundException('Campanha não encontrada');
    }
  }

  private async run(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
}
