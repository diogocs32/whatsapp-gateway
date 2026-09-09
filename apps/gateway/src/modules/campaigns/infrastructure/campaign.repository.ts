import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { startOfLocalDay } from '../../../shared-kernel/local-day';
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
  firstContact: boolean;
}

// ABE-04: reserva de destinatário — quem reserva envia; os demais workers pulam.
export type ReserveRecipientResult =
  | { kind: 'reserved'; recipient: { id: string; to: string } }
  | { kind: 'cap'; sentToday: number }
  | { kind: 'skip'; reason: string };

// Teto de tentativas por destinatário (resultado indeterminado após worker morto no meio).
const MAX_RECIPIENT_ATTEMPTS = 2;
const DEFAULT_TZ = 'America/Sao_Paulo';

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
        firstContact: d.firstContact,
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

  // ABE-04: transição DRAFT/PAUSED → RUNNING atômica. Dois `start` concorrentes: só um vence
  // (count 1) e agenda; o outro vê count 0 e não duplica os jobs.
  async transitionToRunning(id: string, startedAt: Date): Promise<boolean> {
    const r = await this.prisma.campaign.updateMany({
      where: { id, status: { in: ['DRAFT', 'PAUSED'] } },
      data: { status: 'RUNNING', startedAt },
    });
    return r.count === 1;
  }

  // ABE-04/ABE-05: reserva atômica do destinatário + orçamento diário, serializados pela linha
  // da campanha (SELECT ... FOR UPDATE): com 4 workers, só um passa pelo cap por vez; o
  // destinatário reservado (reservedAt) não é enviado por outro worker; reserva antiga sem
  // resultado (worker morto) é retomada até MAX_RECIPIENT_ATTEMPTS e depois vira FAILED
  // ("resultado indeterminado"), nunca reenvio cego infinito.
  async reserveRecipient(
    campaignId: string,
    recipientId: string,
    opts: { dailyCap: number | null; staleMs: number },
  ): Promise<ReserveRecipientResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaignId} FOR UPDATE`;
      const r = await tx.campaignRecipient.findUnique({
        where: { id: recipientId },
      });
      if (!r || r.campaignId !== campaignId) {
        return { kind: 'skip', reason: 'destinatário inexistente' };
      }
      if (r.status !== 'PENDING') {
        return { kind: 'skip', reason: `status ${r.status}` };
      }
      const now = Date.now();
      if (r.reservedAt && now - r.reservedAt.getTime() < opts.staleMs) {
        return { kind: 'skip', reason: 'reservado por outro worker' };
      }
      if (r.attempts >= MAX_RECIPIENT_ATTEMPTS) {
        await tx.campaignRecipient.update({
          where: { id: r.id },
          data: {
            status: 'FAILED',
            error: `resultado indeterminado após ${r.attempts} tentativas (worker não concluiu) — verifique no WhatsApp antes de reenviar`,
          },
        });
        return { kind: 'skip', reason: 'tentativas esgotadas' };
      }
      if (opts.dailyCap != null) {
        const tz = await this.sessionTimezone(tx, campaignId);
        const dayStart = startOfLocalDay(tz);
        const [sentToday, inFlight] = await Promise.all([
          tx.campaignRecipient.count({
            where: { campaignId, status: 'SENT', sentAt: { gte: dayStart } },
          }),
          tx.campaignRecipient.count({
            where: {
              campaignId,
              status: 'PENDING',
              id: { not: r.id },
              reservedAt: { gte: new Date(now - opts.staleMs) },
            },
          }),
        ]);
        if (sentToday + inFlight >= opts.dailyCap) {
          return { kind: 'cap', sentToday };
        }
      }
      await tx.campaignRecipient.update({
        where: { id: r.id },
        data: { reservedAt: new Date(now), attempts: { increment: 1 } },
      });
      return { kind: 'reserved', recipient: { id: r.id, to: r.to } };
    });
  }

  // Devolve o destinatário à fila (pausa/cancelamento detectados após a reserva, antes do efeito).
  releaseRecipient(id: string) {
    return this.prisma.campaignRecipient.updateMany({
      where: { id, status: 'PENDING' },
      data: { reservedAt: null, attempts: { decrement: 1 } },
    });
  }

  private async sessionTimezone(
    tx: Pick<PrismaService, 'campaign'>,
    campaignId: string,
  ): Promise<string> {
    const c = await tx.campaign.findUnique({
      where: { id: campaignId },
      select: {
        session: { select: { config: { select: { timezone: true } } } },
      },
    });
    return c?.session.config?.timezone || DEFAULT_TZ;
  }

  markRecipientSent(id: string, keyId: string) {
    return this.prisma.campaignRecipient.update({
      where: { id },
      data: { status: 'SENT', keyId, sentAt: new Date(), reservedAt: null },
    });
  }

  markRecipientFailed(id: string, error: string) {
    return this.prisma.campaignRecipient.update({
      where: { id },
      data: { status: 'FAILED', error: error.slice(0, 500), reservedAt: null },
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
