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
    const epoch = await this.repo.transitionToRunning(
      id,
      c.startedAt ?? new Date(),
    );
    if (epoch === null) return; // outro start venceu a corrida e já agendou

    const scheduled = await this.scheduleOrPause(id, c, epoch);
    this.logger.log(
      `Campanha "${c.name}" iniciada: ${scheduled} destinatários enfileirados`,
    );
  }

  private async schedulePending(
    id: string,
    c: { scheduledAt: Date | null; minDelaySec: number; maxDelaySec: number },
    epoch: number,
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
        { campaignId: id, recipientId: r.id, scheduleEpoch: epoch },
        baseOffset + cumulative,
        `campaign-${id}-e${epoch}-${r.id}`,
      );
    }
    return pending.length;
  }

  private async scheduleOrPause(
    id: string,
    c: { scheduledAt: Date | null; minDelaySec: number; maxDelaySec: number },
    epoch: number,
  ): Promise<number> {
    try {
      return await this.schedulePending(id, c, epoch);
    } catch (e) {
      // Se o Redis falha no meio do agendamento, os jobs já criados viram no-op enquanto
      // PAUSED. Um novo /resume sobe a época e agenda TODOS os PENDING, sem deixá-los órfãos.
      await this.repo.pauseIfRunning(id, epoch);
      throw e;
    }
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
    const epoch = await this.repo.transitionToRunning(
      id,
      c.startedAt ?? new Date(),
    );
    if (epoch === null) return;
    const n = await this.scheduleOrPause(id, c, epoch);
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
