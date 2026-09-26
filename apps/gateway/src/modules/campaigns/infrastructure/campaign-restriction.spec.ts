import { describe, expect, it, vi } from 'vitest';
import { SessionQuarantinedException } from '../../guardrail/session-quarantined.exception';
import { CampaignQueue } from './campaign-queue';

function harness() {
  const add = vi.fn(async () => undefined);
  const updateStatus = vi.fn(async () => undefined);
  const releaseRecipient = vi.fn(async () => undefined);
  const markRecipientFailed = vi.fn(async () => undefined);
  const markRecipientSent = vi.fn(async () => undefined);
  const sendText = vi.fn(async () => ({
    keyId: 'fake-out',
    jid: '5511@s.whatsapp.net',
  }));
  let allowed = false;
  const repo = {
    findById: vi.fn(async () => ({
      id: 'campaign-1',
      sessionId: 'session-1',
      status: 'RUNNING',
      firstContact: true,
      typingPreview: false,
      messageType: 'text',
      text: 'teste',
      dailyCap: null,
    })),
    reserveRecipient: vi.fn(async () => ({
      kind: 'reserved',
      recipient: { id: 'recipient-1', to: '5511999999999' },
    })),
    updateStatus,
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
  (queue as unknown as { queue: unknown }).queue = { add };
  const process = () =>
    (
      queue as unknown as {
        process: (job: {
          campaignId: string;
          recipientId: string;
        }) => Promise<void>;
      }
    ).process({ campaignId: 'campaign-1', recipientId: 'recipient-1' });
  return {
    process,
    setAllowed: (value: boolean) => {
      allowed = value;
    },
    add,
    repo,
    sendText,
    updateStatus,
    releaseRecipient,
    markRecipientFailed,
    markRecipientSent,
  };
}

describe('CampaignQueue — restrição temporária da sessão', () => {
  it('reagenda sem PAUSED e retoma o mesmo destinatário quando o prazo vence', async () => {
    const h = harness();
    await h.process();
    expect(h.add).toHaveBeenCalledOnce();
    expect(h.repo.reserveRecipient).not.toHaveBeenCalled();
    expect(h.updateStatus).not.toHaveBeenCalled();
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
    await h.process();
    expect(h.releaseRecipient).toHaveBeenCalledWith('recipient-1');
    expect(h.add).toHaveBeenCalledOnce();
    expect(h.markRecipientFailed).not.toHaveBeenCalled();
    expect(h.updateStatus).not.toHaveBeenCalled();
  });
});
