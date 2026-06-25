import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { newId } from '../../../shared-kernel/ulid';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { MinRole } from '../../iam/interface/roles.decorator';
import { RolesGuard } from '../../iam/interface/roles.guard';
import { WebhookDispatcher } from '../application/webhook-dispatcher.service';
import type { Webhook } from '../domain/webhook.entity';
import {
  WEBHOOK_REPOSITORY,
  type WebhookRepository,
} from '../domain/webhook.repository';
import { WebhookQueue } from '../infrastructure/webhook-queue';
import { createWebhookSchema } from './dto';

function toDto(w: Webhook) {
  return {
    id: w.id,
    sessionId: w.sessionId,
    url: w.url,
    events: w.events,
    hasSecret: !!w.secret,
    enabled: w.enabled,
    maxAttempts: w.maxAttempts,
    createdAt: w.createdAt.toISOString(),
  };
}

@UseGuards(ApiKeyAuthGuard, RolesGuard)
@MinRole('ADMIN')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    @Inject(WEBHOOK_REPOSITORY) private readonly repo: WebhookRepository,
    private readonly dispatcher: WebhookDispatcher,
    private readonly queue: WebhookQueue,
  ) {}

  @Get()
  async list() {
    return (await this.repo.list()).map(toDto);
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const d = parsed.data;
    const w = await this.repo.create({
      id: newId(),
      sessionId: d.sessionId ?? null,
      url: d.url,
      events: d.events,
      secret: d.secret ?? null,
      headers: d.headers ?? null,
      enabled: d.enabled,
      maxAttempts: d.maxAttempts,
    });
    await this.dispatcher.refresh();
    return toDto(w);
  }

  // G6 (C4) — dead-letter: eventos que esgotaram os retries (ex.: n8n fora do ar).
  @Get('dead-letters')
  async deadLetters() {
    return this.queue.listDeadLetters();
  }

  // Reconciliação: reenfileira os pendentes com a config atual dos webhooks (n8n voltou).
  @Post('dead-letters/redeliver')
  async redeliver() {
    return this.queue.redeliverDeadLetters();
  }

  @Post(':id/enable')
  async enable(@Param('id') id: string) {
    await this.ensure(id);
    await this.repo.setEnabled(id, true);
    await this.dispatcher.refresh();
    return { ok: true };
  }

  @Post(':id/disable')
  async disable(@Param('id') id: string) {
    await this.ensure(id);
    await this.repo.setEnabled(id, false);
    await this.dispatcher.refresh();
    return { ok: true };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.ensure(id);
    await this.repo.delete(id);
    await this.dispatcher.refresh();
    return { ok: true };
  }

  @Post(':id/test')
  async test(@Param('id') id: string) {
    const w = await this.ensure(id);
    const body = {
      id: newId(),
      timestamp: Date.now(),
      event: 'webhook.test',
      sessionId: w.sessionId ?? 'global',
      session: w.sessionId ?? 'global',
      payload: { message: 'Teste do WhatsApp Gateway' },
      engine: 'baileys',
    };
    await this.queue.enqueue(
      {
        webhookId: w.id,
        url: w.url,
        secret: w.secret,
        headers: w.headers,
        body,
      },
      1,
    );
    return { ok: true };
  }

  private async ensure(id: string): Promise<Webhook> {
    const w = await this.repo.findById(id);
    if (!w) throw new NotFoundException('Webhook não encontrado');
    return w;
  }
}
