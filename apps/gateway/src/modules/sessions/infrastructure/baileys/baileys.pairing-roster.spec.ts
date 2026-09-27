import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BaileysEngine } from './baileys.engine';

const SESSION = 'e12-sintetica';
const LID = '123456789@lid';
const PN = '5511999999999@s.whatsapp.net';

function harness() {
  const events: Array<{ name: string; payload: unknown }> = [];
  const recordMany = vi.fn();
  const getPNsForLIDs = vi.fn(
    async (_lids: string[]) =>
      null as Array<{
        lid: string;
        pn: string;
      }> | null,
  );
  const engine = new BaileysEngine({
    sessionId: SESSION,
    deviceName: 'sintetico',
    prisma: {} as never,
    logger: {
      info() {},
      warn() {},
      error() {},
      debug() {},
      trace() {},
    } as never,
    onEvent: (name: string, payload: unknown) => events.push({ name, payload }),
    contacts: { recordMany },
  } as never);
  const ev = new EventEmitter();
  const creds: { me?: { id: string }; registered: boolean } = {
    registered: false,
  };
  const requestPairingCode = vi.fn(async () => '12345678');
  const groupFetchAllParticipating = vi.fn(
    async (): Promise<Record<string, unknown>> => ({}),
  );
  const sock = {
    ev,
    authState: { creds },
    get user() {
      return creds.me;
    },
    signalRepository: { lidMapping: { getPNsForLIDs } },
    requestPairingCode,
    groupFetchAllParticipating,
  };
  const internals = engine as unknown as {
    sock: typeof sock | null;
    status: string;
    pairingReadySock: typeof sock | null;
    lidToPn: Map<string, string>;
    recordGroupParticipants: (groups: unknown[]) => Promise<void>;
  };
  internals.sock = sock;
  internals.status = 'STARTING';
  return {
    engine,
    internals,
    sock,
    creds,
    ev,
    events,
    recordMany,
    getPNsForLIDs,
    requestPairingCode,
    groupFetchAllParticipating,
  };
}

afterEach(() => vi.useRealTimers());

describe('Baileys rc14 — código de pareamento E12', () => {
  it('recusa WORKING sem alterar credenciais nem chamar o socket', async () => {
    const h = harness();
    h.internals.status = 'WORKING';
    await expect(h.engine.requestPairingCode(PN)).rejects.toThrow('já pareada');
    expect(h.requestPairingCode).not.toHaveBeenCalled();
    expect(h.creds.me).toBeUndefined();
  });

  it('recusa creds.me de sessão pareada por QR mesmo com registered=false', async () => {
    const h = harness();
    h.creds.me = { id: PN };
    await expect(h.engine.requestPairingCode(PN)).rejects.toThrow('já pareada');
    expect(h.requestPairingCode).not.toHaveBeenCalled();
    expect(h.creds.me).toEqual({ id: PN });
  });

  it('espera connecting sem sleep fixo, normaliza o número e publica PAIRING_CODE', async () => {
    const h = harness();
    const pending = h.engine.requestPairingCode('+55 (11) 99999-9999');
    await Promise.resolve();
    expect(h.requestPairingCode).not.toHaveBeenCalled();
    h.ev.emit('connection.update', { connection: 'connecting' });
    await expect(pending).resolves.toBe('12345678');
    expect(h.requestPairingCode).toHaveBeenCalledWith('5511999999999');
    expect(h.events.at(-1)).toEqual({
      name: 'session.status',
      payload: { status: 'PAIRING_CODE' },
    });
  });

  it('o primeiro QR também libera; timeout e close recusam sem chamar o socket', async () => {
    const qr = harness();
    const byQr = qr.engine.requestPairingCode(PN);
    qr.ev.emit('connection.update', { qr: 'qr-sintetico' });
    await expect(byQr).resolves.toBe('12345678');

    vi.useFakeTimers();
    const slow = harness();
    const timedOut = slow.engine.requestPairingCode(PN);
    const assertion = expect(timedOut).rejects.toThrow('10 segundos');
    await vi.advanceTimersByTimeAsync(10_001);
    await assertion;
    expect(slow.requestPairingCode).not.toHaveBeenCalled();

    const closed = harness();
    const pending = closed.engine.requestPairingCode(PN);
    const closeAssertion = expect(pending).rejects.toThrow('desconectada');
    closed.ev.emit('connection.update', { connection: 'close' });
    await closeAssertion;
    expect(closed.requestPairingCode).not.toHaveBeenCalled();
  });
});

describe('Baileys rc14 — roster LID E12', () => {
  it('registra phoneNumber do roster, sem lookup local desnecessário', async () => {
    const h = harness();
    await h.internals.recordGroupParticipants([
      { id: 'grupo@g.us', participants: [{ id: LID, phoneNumber: PN }] },
    ]);
    expect(h.getPNsForLIDs).not.toHaveBeenCalled();
    expect(h.recordMany).toHaveBeenCalledWith([
      expect.objectContaining({
        waId: LID,
        jid: PN,
        lid: LID,
        phone: '5511999999999',
      }),
    ]);
  });

  it('prioriza phoneNumber do lote quando o mesmo LID aparece em dois grupos', async () => {
    const h = harness();
    h.getPNsForLIDs.mockResolvedValue([
      { lid: LID, pn: '5521999999999@s.whatsapp.net' },
    ]);
    await h.internals.recordGroupParticipants([
      { id: 'grupo-a@g.us', participants: [{ id: LID }] },
      { id: 'grupo-b@g.us', participants: [{ id: LID, phoneNumber: PN }] },
    ]);
    expect(h.getPNsForLIDs).not.toHaveBeenCalled();
    expect(h.recordMany).toHaveBeenCalledWith([
      expect.objectContaining({ phone: '5511999999999' }),
      expect.objectContaining({ phone: '5511999999999' }),
    ]);
  });

  it('usa apenas lidMapping local quando falta phoneNumber e tira sufixo de device', async () => {
    const h = harness();
    h.getPNsForLIDs.mockResolvedValue([
      { lid: LID, pn: '5511999999999:7@s.whatsapp.net' },
    ]);
    await h.internals.recordGroupParticipants([
      { id: 'grupo@g.us', participants: [{ id: LID }] },
    ]);
    expect(h.getPNsForLIDs).toHaveBeenCalledWith([LID]);
    expect(h.recordMany).toHaveBeenCalledWith([
      expect.objectContaining({ jid: PN, lid: LID, phone: '5511999999999' }),
    ]);
  });

  it('mantém o LID anônimo quando o mapping local não tem PN', async () => {
    const h = harness();
    await h.internals.recordGroupParticipants([
      { id: 'grupo@g.us', participants: [{ id: LID }] },
    ]);
    expect(h.recordMany).toHaveBeenCalledWith([
      expect.objectContaining({ jid: null, lid: LID, phone: null }),
    ]);
  });

  it('não usa par aprendido de mensagens como fallback do roster', async () => {
    const h = harness();
    h.internals.lidToPn.set(LID, PN);
    h.groupFetchAllParticipating.mockResolvedValue({
      'grupo@g.us': { id: 'grupo@g.us', participants: [{ id: LID }] },
    });
    const groups = await h.engine.listGroups();
    expect(h.getPNsForLIDs).toHaveBeenCalledWith([LID]);
    expect(groups[0].participants[0].phone).toBeNull();
    expect(h.recordMany).toHaveBeenCalledWith([
      expect.objectContaining({ jid: null, lid: LID, phone: null }),
    ]);
  });
});
