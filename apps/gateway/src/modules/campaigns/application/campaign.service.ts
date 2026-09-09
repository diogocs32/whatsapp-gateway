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
  // ABE-04: a transição para RUNNING é atômica — dois starts concorrentes agendam UMA vez; e o
  // jobId determinístico (campaign-<id>-<recipient>) dedupa o agendamento no BullMQ.
  async start(id: string): Promise<void> {
    const c = await this.repo.findByIdOrThrow(id);
    if (c.status === 'RUNNING') return;
    if (c.status === 'DONE' || c.status === 'CANCELLED') {
      throw new Error('Campanha finalizada — não pode reiniciar');
    }
    const won = await this.repo.transitionToRunning(
      id,
      c.startedAt ?? new Date(),
    );
    if (!won) return; // outro start venceu a corrida e já agendou

    const scheduled = await this.schedulePending(id, c, `campaign-${id}`);
    this.logger.log(
      `Campanha "${c.name}" iniciada: ${scheduled} destinatários enfileirados`,
    );
  }

  private async schedulePending(
    id: string,
    c: { scheduledAt: Date | null; minDelaySec: number; maxDelaySec: number },
    jobPrefix: string,
  ): Promise<number> {
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
        `${jobPrefix}-${r.id}`,
      );
    }
    return pending.length;
  }

  async pause(id: string): Promise<void> {
    await this.repo.findByIdOrThrow(id);
    await this.repo.updateStatus(id, 'PAUSED');
  }

  // ABE-05: além de voltar a RUNNING, reagenda os pendentes que ficaram sem job (fila perdida,
  // processo reiniciado). Jobs ainda vivos coexistem sem duplicar: a reserva atômica do
  // destinatário garante um único envio por pendente.
  async resume(id: string): Promise<void> {
    const c = await this.repo.findByIdOrThrow(id);
    if (c.status !== 'PAUSED') return;
    const won = await this.repo.transitionToRunning(
      id,
      c.startedAt ?? new Date(),
    );
    if (!won) return;
    const n = await this.schedulePending(
      id,
      c,
      `campaign-${id}-resume-${Math.floor(Date.now() / 1000)}`,
    );
    this.logger.log(
      `Campanha "${c.name}" retomada: ${n} pendentes reagendados`,
    );
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
