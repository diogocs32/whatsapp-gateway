import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { newId } from '../../../shared-kernel/ulid';

export interface CreateCampaignData {
  sessionId: string;
  name: string;
  messageType: string;
  text: string | null;
  mediaUrl: string | null;
  mediaMime: string | null;
  fileName: string | null;
  minDelaySec: number;
  maxDelaySec: number;
  dailyCap: number | null;
  typingPreview: boolean;
  scheduledAt: Date | null;
  recipients: string[];
}

@Injectable()
export class CampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(d: CreateCampaignData) {
    const id = newId();
    const unique = [
      ...new Set(d.recipients.map((r) => r.trim()).filter(Boolean)),
    ];
    await this.prisma.campaign.create({
      data: {
        id,
        sessionId: d.sessionId,
        name: d.name,
        messageType: d.messageType,
        text: d.text,
        mediaUrl: d.mediaUrl,
        mediaMime: d.mediaMime,
        fileName: d.fileName,
        minDelaySec: d.minDelaySec,
        maxDelaySec: d.maxDelaySec,
        dailyCap: d.dailyCap,
        typingPreview: d.typingPreview,
        scheduledAt: d.scheduledAt,
        total: unique.length,
        recipients: { create: unique.map((to) => ({ id: newId(), to })) },
      },
    });
    return this.findByIdOrThrow(id);
  }

  findById(id: string) {
    return this.prisma.campaign.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string) {
    const c = await this.findById(id);
    if (!c) throw new Error('Campanha não encontrada');
    return c;
  }

  list(sessionId?: string) {
    return this.prisma.campaign.findMany({
      where: sessionId ? { sessionId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listRecipients(campaignId: string, limit = 500) {
    return this.prisma.campaignRecipient.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  listPendingRecipients(campaignId: string) {
    return this.prisma.campaignRecipient.findMany({
      where: { campaignId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  findRecipient(id: string) {
    return this.prisma.campaignRecipient.findUnique({ where: { id } });
  }

  updateStatus(
    id: string,
    status: string,
    extra: { startedAt?: Date; finishedAt?: Date } = {},
  ) {
    return this.prisma.campaign.update({
      where: { id },
      data: { status: status as never, ...extra },
    });
  }

  markRecipientSent(id: string, keyId: string) {
    return this.prisma.campaignRecipient.update({
      where: { id },
      data: { status: 'SENT', keyId, sentAt: new Date() },
    });
  }

  markRecipientFailed(id: string, error: string) {
    return this.prisma.campaignRecipient.update({
      where: { id },
      data: { status: 'FAILED', error: error.slice(0, 500) },
    });
  }

  cancelPending(campaignId: string) {
    return this.prisma.campaignRecipient.updateMany({
      where: { campaignId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  }

  delete(id: string) {
    return this.prisma.campaign.delete({ where: { id } });
  }

  // Recalcula contadores; se RUNNING e sem pendentes, marca DONE.
  async refreshCounts(campaignId: string): Promise<void> {
    const grp = await this.prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });
    let sent = 0;
    let failed = 0;
    let pending = 0;
    for (const g of grp) {
      if (g.status === 'SENT') sent = g._count;
      else if (g.status === 'FAILED') failed = g._count;
      else if (g.status === 'PENDING') pending = g._count;
    }
    const c = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    const data: {
      sentCount: number;
      failedCount: number;
      status?: 'DONE';
      finishedAt?: Date;
    } = { sentCount: sent, failedCount: failed };
    if (c && c.status === 'RUNNING' && pending === 0) {
      data.status = 'DONE';
      data.finishedAt = new Date();
    }
    await this.prisma.campaign.update({ where: { id: campaignId }, data });
  }
}
