import { Injectable, Logger } from '@nestjs/common';
import {
  CampaignRepository,
  type CreateCampaignData,
} from '../infrastructure/campaign.repository';
import { CampaignQueue } from '../infrastructure/campaign-queue';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly repo: CampaignRepository,
    private readonly queue: CampaignQueue,
  ) {}

  list(sessionId?: string) {
    return this.repo.list(sessionId);
  }
  get(id: string) {
    return this.repo.findByIdOrThrow(id);
  }
  recipients(id: string) {
    return this.repo.listRecipients(id);
  }

  async create(data: CreateCampaignData, autostart: boolean) {
    const campaign = await this.repo.create(data);
    if (autostart) await this.start(campaign.id);
    return this.repo.findByIdOrThrow(campaign.id);
  }

  // Agenda cada pendente com espaçamento aleatório acumulado (anti-ban) + offset do agendamento.
  async start(id: string): Promise<void> {
    const c = await this.repo.findByIdOrThrow(id);
    if (c.status === 'RUNNING') return;
    if (c.status === 'DONE' || c.status === 'CANCELLED') {
      throw new Error('Campanha finalizada — não pode reiniciar');
    }
    await this.repo.updateStatus(id, 'RUNNING', {
      startedAt: c.startedAt ?? new Date(),
    });

    const pending = await this.repo.listPendingRecipients(id);
    const baseOffset =
      c.scheduledAt && c.scheduledAt.getTime() > Date.now()
        ? c.scheduledAt.getTime() - Date.now()
        : 0;
    let cumulative = 0;
    for (const r of pending) {
      cumulative += randInt(c.minDelaySec, c.maxDelaySec) * 1000;
      await this.queue.enqueueSend(
        { campaignId: id, recipientId: r.id },
        baseOffset + cumulative,
      );
    }
    this.logger.log(
      `Campanha "${c.name}" iniciada: ${pending.length} destinatários enfileirados`,
    );
  }

  async pause(id: string): Promise<void> {
    await this.repo.findByIdOrThrow(id);
    await this.repo.updateStatus(id, 'PAUSED');
  }

  async resume(id: string): Promise<void> {
    const c = await this.repo.findByIdOrThrow(id);
    if (c.status !== 'PAUSED') return;
    // Os jobs pausados continuam re-agendando sozinhos; basta voltar a RUNNING.
    await this.repo.updateStatus(id, 'RUNNING');
  }

  async cancel(id: string): Promise<void> {
    await this.repo.findByIdOrThrow(id);
    await this.repo.updateStatus(id, 'CANCELLED', { finishedAt: new Date() });
    await this.repo.cancelPending(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
