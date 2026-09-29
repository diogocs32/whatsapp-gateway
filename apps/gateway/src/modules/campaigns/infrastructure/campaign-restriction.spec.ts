import { describe, expect, it, vi } from 'vitest';
import { DelayedError } from 'bullmq';
import { SessionQuarantinedException } from '../../guardrail/session-quarantined.exception';
import { LeaseLostError } from '../../sessions/application/session-lease.error';
import { SessionBusyError } from '../../sessions/application/session-manager.service';
import { CampaignQueue } from './campaign-queue';

function harness() {
  const pauseIfRunning = vi.fn(async () => undefined);
  const releaseRecipient = vi.fn(async () => undefined);
  const markRecipientFailed = vi.fn(async () => undefined);
  const markRecipientSent = vi.fn(async () => undefined);
  const sendText = vi.fn(async () => ({
    keyId: 'fake-out',
    jid: '5511@s.whatsapp.net',
  }));
  let allowed = false;
  const reservedAt = new Date('2026-09-29T08:00:00.000Z');
  const repo = {
    findById: vi.fn(async () => ({
      id: 'campaign-1',
      sessionId: 'session-1',
      status: 'RUNNING',
      scheduleEpoch: 0,
      firstContact: true,
      typingPreview: false,
      messageType: 'text',
      text: 'teste',
      dailyCap: null,
    })),
    reserveRecipient: vi.fn(async () => ({
      kind: 'reserved',
      recipient: { id: 'recipient-1', to: '5511999999999', reservedAt },
    })),
    pauseIfRunning,
    releaseRecipient,
    markRecipientFailed,
    markRecipientSent,
    refreshCounts: vi.fn(async () => undefined),
  };
  const guardrail = {
    canSendMessage: vi.fn(async () =>
      allowed
        ? { allowed: true, state: 'ativa' }
        : {
            allowed: false,
            state: 'quarentena',
            until: new Date(Date.now() + 120_000),
          },
    ),
    canSendCold: vi.fn(async () => ({ allowed: true, state: 'ativa' })),
  };
  const queue = new CampaignQueue(
    {} as never,
    repo as never,
    { sendText } as never,
    guardrail as never,
  );
  const moveToDelayed = vi.fn(async () => undefined);
  const updateData = vi.fn(async () => undefined);
  const job = {
    data: { campaignId: 'campaign-1', recipientId: 'recipient-1' },
    moveToDelayed,
    updateData,
  };
  const process = () =>
    (
      queue as unknown as {
        process: (job: unknown, token: string) => Promise<void>;
      }
    ).process(job, 'fake-token');
  return {
    process,
    setAllowed: (value: boolean) => {
      allowed = value;
    },
    moveToDelayed,
    updateData,
    repo,
    sendText,
    pauseIfRunning,
    reservedAt,
    releaseRecipient,
    markRecipientFailed,
    markRecipientSent,
  };
}

describe('CampaignQueue — restrição temporária da sessão', () => {
  it('reagenda sem PAUSED e retoma o mesmo destinatário quando o prazo vence', async () => {
    const h = harness();
    await expect(h.process()).rejects.toBeInstanceOf(DelayedError);
    expect(h.moveToDelayed).toHaveBeenCalledOnce();
    expect(h.repo.reserveRecipient).not.toHaveBeenCalled();
    expect(h.pauseIfRunning).not.toHaveBeenCalled();
    expect(h.sendText).not.toHaveBeenCalled();

    h.setAllowed(true);
    await h.process();
    expect(h.sendText).toHaveBeenCalledOnce();
    expect(h.markRecipientSent).toHaveBeenCalledWith('recipient-1', 'fake-out');
    expect(h.markRecipientFailed).not.toHaveBeenCalled();
  });

  it('restrição entre a reserva e o envio libera o destinatário e reagenda', async () => {
    const h = harness();
    h.setAllowed(true);
    h.sendText.mockRejectedValueOnce(
      new SessionQuarantinedException('quarentena', 'prazo nativo ativo'),
    );
    await expect(h.process()).rejects.toBeInstanceOf(DelayedError);
    expect(h.releaseRecipient).toHaveBeenCalledWith(
      'recipient-1',
      h.reservedAt,
    );
    expect(h.moveToDelayed).toHaveBeenCalledOnce();
    expect(h.markRecipientFailed).not.toHaveBeenCalled();
    expect(h.pauseIfRunning).not.toHaveBeenCalled();
  });

  it('worker na réplica sem lease libera a reserva e reagenda sem FAILED', async () => {
    const h = harness();
    h.setAllowed(true);
    h.sendText.mockRejectedValueOnce(new LeaseLostError());
    await expect(h.process()).rejects.toBeInstanceOf(DelayedError);
    expect(h.releaseRecipient).toHaveBeenCalledWith(
      'recipient-1',
      h.reservedAt,
    );
    expect(h.moveToDelayed).toHaveBeenCalledOnce();
    expect(h.markRecipientFailed).not.toHaveBeenCalled();
    expect(h.pauseIfRunning).not.toHaveBeenCalled();
  });

  it('shutdown da réplica libera a reserva e reagenda sem FAILED', async () => {
    const h = harness();
    h.setAllowed(true);
    h.sendText.mockRejectedValueOnce(new SessionBusyError());
    await expect(h.process()).rejects.toBeInstanceOf(DelayedError);
    expect(h.releaseRecipient).toHaveBeenCalledWith(
      'recipient-1',
      h.reservedAt,
    );
    expect(h.moveToDelayed).toHaveBeenCalledOnce();
    expect(h.markRecipientFailed).not.toHaveBeenCalled();
  });

  it('teto diário ocupado só por reserva transitória não pausa a campanha', async () => {
    const h = harness();
    h.setAllowed(true);
    h.repo.findById.mockResolvedValue({
      ...((await h.repo.findById()) as object),
      dailyCap: 1,
    } as never);
    h.repo.reserveRecipient.mockResolvedValueOnce({
      kind: 'cap',
      sentToday: 0,
      inFlight: 1,
    } as never);
    await expect(h.process()).rejects.toBeInstanceOf(DelayedError);
    expect(h.pauseIfRunning).not.toHaveBeenCalled();
    expect(h.sendText).not.toHaveBeenCalled();

    await h.process();
    expect(h.sendText).toHaveBeenCalledOnce();
    expect(h.markRecipientSent).toHaveBeenCalledOnce();
  });
});
