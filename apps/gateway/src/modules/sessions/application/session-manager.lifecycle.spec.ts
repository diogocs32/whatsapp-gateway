import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Prisma } from '../../../infra/prisma/prisma.service';
import type { EventBus } from '../../../shared-kernel/event-bus/event-bus';
import type { SessionStatus } from '../domain/session-status';
import { WWebJSEngine } from '../infrastructure/wwebjs/wwebjs.engine';
import { SessionBusyError, SessionManager } from './session-manager.service';

// E27/P-086 (D-037) — lock de ciclo de vida por sessão no SessionManager (runExclusive): operações
// da mesma sessão em fila, failFast só no link público, checagem síncrona antes do delete do newQr,
// rejeição de número errado e as leituras sem efeito (liveView/isBusy/isRehydrated/hasEngine).

const SID = 'sess-e27';
const NAME = 'Sessão E27';
const REASON =
  'Conectado com número diferente do esperado pelo link de conexão — a conexão foi desfeita. Gere um novo link.';
const EXPECTED_JID = '5511999999999@s.whatsapp.net';

type Method = 'start' | 'stop' | 'logout';

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (e: Error) => void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // Rejeitar o portão antes de a engine chegar nele não vira unhandledRejection.
  promise.catch(() => undefined);
  return { promise, resolve, reject };
}

type OnEvent = (name: string, payload: unknown) => void;

interface FakeEngine {
  n: number;
  engineName: 'baileys';
  status: SessionStatus;
  qr: string | null;
  getStatus: () => SessionStatus;
  getQrBase64: () => string | null;
  start: Mock<() => Promise<void>>;
  stop: Mock<() => Promise<void>>;
  logout: Mock<() => Promise<void>>;
  emit: OnEvent;
}

const qrOf = (n: number) => `data:image/png;base64,QR${n}`;

// Esvazia a fila de microtasks (o lock libera a sessão 2 ticks depois de a operação resolver).
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

// Engines falsas controláveis: cada chamada de start/stop/logout registra no `log` e, se houver um
// portão (`hold`) na fila daquele método, espera por ele — resolvido/rejeitado na mão pelo teste.
function harness() {
  const log: string[] = [];
  const gates: Record<Method, Deferred[]> = { start: [], stop: [], logout: [] };
  const hold = (m: Method): Deferred => {
    const d = deferred();
    gates[m].push(d);
    return d;
  };
  const engines: FakeEngine[] = [];
  const step = async (e: FakeEngine, m: Method, after: () => void) => {
    log.push(`${m}#${e.n}`);
    const gate = gates[m].shift();
    if (gate) await gate.promise;
    after();
  };
  const engineFactory = {
    create: vi.fn((_type: string, deps: { onEvent: OnEvent }) => {
      const e = {
        n: engines.length + 1,
        engineName: 'baileys',
        status: 'STOPPED',
        qr: null,
      } as FakeEngine;
      e.getStatus = () => e.status;
      e.getQrBase64 = () => e.qr;
      e.start = vi.fn(() =>
        step(e, 'start', () => {
          e.status = 'SCAN_QR_CODE';
          e.qr = qrOf(e.n);
        }),
      );
      e.stop = vi.fn(() =>
        step(e, 'stop', () => {
          e.status = 'STOPPED';
          e.qr = null;
        }),
      );
      e.logout = vi.fn(() =>
        step(e, 'logout', () => {
          e.status = 'STOPPED';
          e.qr = null;
        }),
      );
      e.emit = (name, payload) => deps.onEvent(name, payload);
      engines.push(e);
      log.push(`create#${e.n}`);
      return e;
    }),
  };
  const session = { id: SID, name: NAME, engine: 'BAILEYS', status: 'STOPPED' };
  const repo = {
    findById: vi.fn(async (_id: string) => session),
    updateStatus: vi.fn(
      async (
        _id: string,
        status: SessionStatus,
        patch?: { lastError?: string | null },
      ) => {
        log.push(`updateStatus:${status}:${patch?.lastError ?? '-'}`);
        return true;
      },
    ),
    updateLastErrorDetails: vi.fn(async () => true),
    setLastMeJid: vi.fn(async (_id: string, jid: string | null) => {
      log.push(`setLastMeJid:${jid}`);
    }),
    findAutostart: vi.fn(async () => [] as (typeof session)[]),
    delete: vi.fn(async () => {
      log.push('repo.delete');
    }),
  };
  const prisma = {
    waAuthKey: {
      deleteMany: vi.fn(async (_args: unknown) => {
        log.push('deleteMany');
        return { count: 0 };
      }),
    },
    waSession: {
      updateMany: vi.fn(async (_args: unknown) => {
        log.push('updateMany');
        return { count: 1 };
      }),
    },
  };
  const eventBus = {
    publish: vi.fn(
      (event: { payload: { payload: { status: SessionStatus } } }) => {
        log.push(`publish:${event.payload.payload.status}`);
      },
    ),
  };
  const purge = vi
    .spyOn(WWebJSEngine, 'purgeAuthDir')
    .mockImplementation(async () => {
      log.push('purge');
    });
  const loggerError = vi
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  const manager = new SessionManager(
    repo as never,
    prisma as never,
    {
      get: (key: string) => (key === 'WA_LOG_LEVEL' ? 'silent' : undefined),
    } as never,
    eventBus as unknown as EventBus,
    {} as never,
    {} as never,
    {} as never,
    engineFactory as never,
    {} as never,
  );
  // Sobe a engine #1 pelo start público e deixa a sessão sem operação em andamento.
  const startEngine = async (status: SessionStatus): Promise<FakeEngine> => {
    await manager.start(SID);
    await flush();
    const e = engines[engines.length - 1];
    e.status = status;
    if (status !== 'SCAN_QR_CODE') e.qr = null;
    return e;
  };
  return {
    manager,
    log,
    hold,
    engines,
    engineFactory,
    session,
    repo,
    prisma,
    eventBus,
    purge,
    loggerError,
    startEngine,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SessionManager — lock de ciclo de vida (E27/D-037)', () => {
  it('dois newQr concorrentes não se sobrepõem: o 2º espera o 1º terminar e cada engine nova sobe 1 vez', async () => {
    const h = harness();
    const startGate = h.hold('start');
    const first = h.manager.newQr(SID);
    const second = h.manager.newQr(SID);
    await flush();
    // Janela do 1º newQr (start da engine nova pendurado): o 2º não tocou em nada.
    expect(h.engineFactory.create).toHaveBeenCalledTimes(1);
    expect(h.engines[0].start).toHaveBeenCalledTimes(1);
    expect(h.prisma.waAuthKey.deleteMany).toHaveBeenCalledTimes(1);
    expect(h.log).toEqual([
      'deleteMany',
      'updateMany',
      'purge',
      'create#1',
      'start#1',
    ]);
    expect(h.manager.isBusy(SID)).toBe(true);

    startGate.resolve();
    await Promise.all([first, second]);
    // Fila, não coalescência (rotas existentes esperam — R0): o 2º para a engine do 1º antes de
    // criar a sua; nenhuma engine recebe dois starts.
    expect(h.log).toEqual([
      'deleteMany',
      'updateMany',
      'purge',
      'create#1',
      'start#1',
      'stop#1',
      'deleteMany',
      'updateMany',
      'purge',
      'create#2',
      'start#2',
    ]);
    expect(h.engines[0].start).toHaveBeenCalledOnce();
    expect(h.engines[1].start).toHaveBeenCalledOnce();
    expect(h.manager.liveView(SID)).toEqual({
      status: 'SCAN_QR_CODE',
      qr: qrOf(2),
    });
  });

  it('stop chamado durante um newQr roda DEPOIS dele e a engine final fica parada', async () => {
    const h = harness();
    const a = await h.startEngine('SCAN_QR_CODE');
    const stopOld = h.hold('stop');
    const startNew = h.hold('start');
    const renewing = h.manager.newQr(SID);
    await flush();
    const stopping = h.manager.stop(SID);
    await flush();
    expect(a.stop).toHaveBeenCalledOnce(); // só o do newQr

    stopOld.resolve();
    await vi.waitFor(() => expect(h.engines).toHaveLength(2));
    await flush();
    const b = h.engines[1];
    expect(b.start).toHaveBeenCalledOnce();
    expect(b.stop).not.toHaveBeenCalled(); // o stop ainda espera na fila

    startNew.resolve();
    await Promise.all([renewing, stopping]);
    expect(h.log.slice(-2)).toEqual(['start#2', 'stop#2']);
    expect(a.stop).toHaveBeenCalledOnce();
    expect(b.stop).toHaveBeenCalledOnce();
    expect(h.manager.liveView(SID)).toEqual({ status: 'STOPPED', qr: null });
  });

  it.each([
    ['logout' as const, ['logout#2']],
    ['remove' as const, ['stop#2', 'purge', 'repo.delete']],
  ])(
    '%s chamado durante um newQr age sobre a engine NOVA, sem deixar órfã',
    async (op, tail) => {
      const h = harness();
      await h.startEngine('SCAN_QR_CODE');
      const startNew = h.hold('start');
      const renewing = h.manager.newQr(SID);
      await flush();
      const queued = h.manager[op](SID);
      await flush();
      expect(h.log).not.toContain(tail[0]);

      startNew.resolve();
      await Promise.all([renewing, queued]);
      expect(h.log.slice(-1 - tail.length)).toEqual(['start#2', ...tail]);
      expect(h.manager.hasEngine(SID)).toBe(false);
      expect(h.manager.liveView(SID)).toBeNull();
    },
  );

  it('restart termina sem deadlock e encadeia stop → start na mesma engine', async () => {
    const h = harness();
    const a = await h.startEngine('WORKING');
    await h.manager.restart(SID);
    expect(h.log).toEqual(['create#1', 'start#1', 'stop#1', 'start#1']);
    expect(h.engineFactory.create).toHaveBeenCalledOnce();
    expect(a.start).toHaveBeenCalledTimes(2);
    await flush();
    expect(h.manager.isBusy(SID)).toBe(false);
  });

  it('start, stop, restart e stop disparados juntos rodam em fila, na ordem de chegada', async () => {
    const h = harness();
    const startGate = h.hold('start');
    const ops = [
      h.manager.start(SID),
      h.manager.stop(SID),
      h.manager.restart(SID),
      h.manager.stop(SID),
    ];
    await flush();
    expect(h.log).toEqual(['create#1', 'start#1']);

    startGate.resolve();
    await Promise.all(ops);
    expect(h.log).toEqual([
      'create#1',
      'start#1',
      'stop#1',
      'stop#1',
      'start#1',
      'stop#1',
    ]);
    expect(h.manager.liveView(SID)).toEqual({ status: 'STOPPED', qr: null });
  });

  it('stop pendurado não prende o lock: após o teto de 10 s o restart segue para o start', async () => {
    vi.useFakeTimers();
    const h = harness();
    const a = await (async () => {
      await h.manager.start(SID);
      await vi.advanceTimersByTimeAsync(0);
      return h.engines[0];
    })();
    h.hold('stop'); // nunca resolve
    const restarting = h.manager.restart(SID);
    const after = h.manager.stop(SID);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(a.start).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1);
    await restarting;
    expect(a.start).toHaveBeenCalledTimes(2);
    await after; // a operação seguinte da fila também roda
    expect(a.stop).toHaveBeenCalledTimes(2);
  });
});

describe('SessionManager.newQrForConnectLink (E27/P-086)', () => {
  it('com outra operação em andamento rejeita SessionBusyError sem chamar o check nem mexer na fila', async () => {
    const h = harness();
    const startGate = h.hold('start');
    const starting = h.manager.start(SID);
    const check = vi.fn(async () => undefined);

    await expect(
      h.manager.newQrForConnectLink(SID, check),
    ).rejects.toBeInstanceOf(SessionBusyError);
    expect(check).not.toHaveBeenCalled();
    expect(h.manager.isBusy(SID)).toBe(true);

    // O stop enfileirado depois da recusa ainda espera o start (a recusa não trocou o lock).
    const stopping = h.manager.stop(SID);
    await flush();
    expect(h.log).toEqual(['create#1', 'start#1']);
    startGate.resolve();
    await Promise.all([starting, stopping]);
    expect(h.log).toEqual(['create#1', 'start#1', 'stop#1']);
    expect(h.prisma.waAuthKey.deleteMany).not.toHaveBeenCalled();
  });

  it('check que lança: erro propaga e nada de stop/deleteMany/purge/start; o lock é liberado', async () => {
    const h = harness();
    const a = await h.startEngine('STOPPED');
    const err = new Error('fase não é IDLE');
    const check = vi.fn(async () => {
      throw err;
    });

    await expect(h.manager.newQrForConnectLink(SID, check)).rejects.toBe(err);
    expect(check).toHaveBeenCalledOnce();
    expect(a.stop).not.toHaveBeenCalled();
    expect(h.prisma.waAuthKey.deleteMany).not.toHaveBeenCalled();
    expect(h.prisma.waSession.updateMany).not.toHaveBeenCalled();
    expect(h.purge).not.toHaveBeenCalled();
    expect(h.engineFactory.create).toHaveBeenCalledOnce();
    expect(a.start).toHaveBeenCalledOnce();
    expect(h.manager.liveView(SID)).toEqual({ status: 'STOPPED', qr: null });
    await flush();
    expect(h.manager.isBusy(SID)).toBe(false);
  });

  it.each(['SCAN_QR_CODE', 'WORKING', 'STARTING', 'PAIRING_CODE'] as const)(
    'engine em memória vira %s durante o check → SessionBusyError e NADA é apagado',
    async (status) => {
      const h = harness();
      const a = await h.startEngine('STOPPED');
      // Ex.: o Baileys reconectou sozinho (backoff) enquanto o check relia o banco.
      const check = vi.fn(async () => {
        a.status = status;
      });

      await expect(
        h.manager.newQrForConnectLink(SID, check),
      ).rejects.toBeInstanceOf(SessionBusyError);
      expect(check).toHaveBeenCalledOnce();
      expect(a.stop).not.toHaveBeenCalled();
      expect(h.prisma.waAuthKey.deleteMany).not.toHaveBeenCalled();
      expect(h.prisma.waSession.updateMany).not.toHaveBeenCalled();
      expect(h.purge).not.toHaveBeenCalled();
      expect(h.engineFactory.create).toHaveBeenCalledOnce();
      expect(h.manager.hasEngine(SID)).toBe(true);
      expect(h.manager.liveView(SID)?.status).toBe(status);
    },
  );

  it.each(['STOPPED', 'DEGRADED'] as const)(
    'engine em %s: newQr roda (stop da velha, creds apagadas, purge, engine nova iniciada)',
    async (status) => {
      const h = harness();
      const a = await h.startEngine(status);
      const check = vi.fn(async () => {
        h.log.push('check');
      });

      await h.manager.newQrForConnectLink(SID, check);
      expect(h.log).toEqual([
        'create#1',
        'start#1',
        'check',
        'stop#1',
        'deleteMany',
        'updateMany',
        'purge',
        'create#2',
        'start#2',
      ]);
      expect(a.stop).toHaveBeenCalledOnce();
      expect(h.prisma.waAuthKey.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: SID },
      });
      expect(h.prisma.waSession.updateMany).toHaveBeenCalledWith({
        where: { id: SID },
        data: { creds: Prisma.DbNull },
      });
      expect(h.purge).toHaveBeenCalledWith(SID);
      expect(h.engines[1].start).toHaveBeenCalledOnce();
      expect(h.manager.liveView(SID)).toEqual({
        status: 'SCAN_QR_CODE',
        qr: qrOf(2),
      });
    },
  );

  it('sem engine em memória: newQr roda (creds apagadas, purge, engine criada e iniciada)', async () => {
    const h = harness();
    const check = vi.fn(async () => {
      h.log.push('check');
    });

    await h.manager.newQrForConnectLink(SID, check);
    expect(h.log).toEqual([
      'check',
      'deleteMany',
      'updateMany',
      'purge',
      'create#1',
      'start#1',
    ]);
    expect(h.manager.liveView(SID)).toEqual({
      status: 'SCAN_QR_CODE',
      qr: qrOf(1),
    });
  });
});

describe('SessionManager — erro e fila (E27/D-037)', () => {
  it('erro numa operação volta só para o chamador dela e não trava as seguintes', async () => {
    const h = harness();
    const startGate = h.hold('start');
    const starting = h.manager.start(SID);
    const stopping = h.manager.stop(SID);
    const renewing = h.manager.newQr(SID);
    await flush();
    expect(h.manager.isBusy(SID)).toBe(true);

    const boom = new Error('socket recusou');
    startGate.reject(boom);
    await expect(starting).rejects.toBe(boom);
    await expect(stopping).resolves.toBeUndefined();
    await expect(renewing).resolves.toBeUndefined();
    expect(h.log).toEqual([
      'create#1',
      'start#1',
      'stop#1',
      'stop#1',
      'deleteMany',
      'updateMany',
      'purge',
      'create#2',
      'start#2',
    ]);
    await flush();
    expect(h.manager.isBusy(SID)).toBe(false);
  });

  it('start da engine nova falhando dentro do newQrForConnectLink propaga o erro e libera o lock', async () => {
    const h = harness();
    const startGate = h.hold('start');
    const boom = new Error('proxy morto');
    startGate.reject(boom);

    await expect(
      h.manager.newQrForConnectLink(SID, async () => undefined),
    ).rejects.toBe(boom);
    await flush();
    expect(h.manager.isBusy(SID)).toBe(false);
    // Próximo pedido do link não esbarra em "ocupado".
    await expect(
      h.manager.newQrForConnectLink(SID, async () => undefined),
    ).resolves.toBeUndefined();
  });

  it('isBusy: true durante a operação e na fila, false quando tudo assenta; por sessão', async () => {
    const h = harness();
    expect(h.manager.isBusy(SID)).toBe(false);
    const startGate = h.hold('start');
    const starting = h.manager.start(SID);
    expect(h.manager.isBusy(SID)).toBe(true);
    expect(h.manager.isBusy('outra-sessao')).toBe(false);
    startGate.resolve();
    await starting;
    await flush();
    expect(h.manager.isBusy(SID)).toBe(false);
  });

  // Regressão (E27): corrigido após o teste acusar o defeito.
  it('logo após o await de uma operação, o failFast do link público não vê a sessão ocupada', async () => {
    const h = harness();
    await h.startEngine('WORKING');
    await h.manager.stop(SID);
    expect(h.manager.isBusy(SID)).toBe(false);
    await expect(
      h.manager.newQrForConnectLink(SID, async () => undefined),
    ).resolves.toBeUndefined();
  });
});

describe('SessionManager.remove — ordem para o carimbo de proxy (E26/D-038)', () => {
  afterEach(() => vi.restoreAllMocks());

  // O SessionsController carimba a atribuição de proxy DEPOIS de `manager.remove` resolver: a
  // premissa é que remove só resolve com a linha de wa_sessions já apagada (e rejeita se não).
  it('só resolve depois de repo.delete e rejeita se ele rejeitar', async () => {
    const h = harness();
    await h.startEngine('STOPPED');
    const gate = deferred();
    h.repo.delete.mockImplementationOnce(async () => {
      await gate.promise;
    });
    let done = false;
    const removing = h.manager.remove(SID).then(() => {
      done = true;
    });
    await flush();
    expect(done).toBe(false);
    gate.resolve();
    await removing;
    expect(done).toBe(true);

    h.repo.delete.mockRejectedValueOnce(new Error('banco fora'));
    await expect(h.manager.remove(SID)).rejects.toThrow('banco fora');
  });
});

describe('SessionManager.requestPairingCode dentro do lock (E27, revisão do diff)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Regressão: o pedido de código roda dentro do lock; sem teto, um page.evaluate pendurado do
  // wwebjs (até 240 s) seguraria Parar/Logout/Novo QR/remover da sessão.
  it('pedido de código pendurado estoura em 45 s (409 na rota) e libera o stop que esperava', async () => {
    const h = harness();
    const a = await h.startEngine('SCAN_QR_CODE');
    (a as unknown as { requestPairingCode: Mock }).requestPairingCode = vi.fn(
      () => new Promise<string>(() => undefined),
    );
    (h.prisma.waSession as unknown as { findUnique: Mock }).findUnique = vi.fn(
      async () => ({ creds: null }),
    );
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const pairing = h.manager.requestPairingCode(SID, '5511999999999');
    const pairingErr = pairing.catch((e: Error) => e);
    const stopping = h.manager.stop(SID);
    await vi.advanceTimersByTimeAsync(44_999);
    expect(a.stop).not.toHaveBeenCalled();
    expect(h.manager.isBusy(SID)).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    const err = await pairingErr;
    expect(err).toBeInstanceOf(Error);
    // "não conectada" → o controller devolve o 409 amigável (regex de sessions.controller.ts).
    expect((err as Error).message).toMatch(/não conectada/);
    await stopping;
    expect(a.stop).toHaveBeenCalledOnce();
    expect(h.manager.isBusy(SID)).toBe(false);
  });
});

describe('SessionManager.rejectConnectedAccount (E27/P-086)', () => {
  it('sem engine no mapa (réplica não dona) é no-op', async () => {
    const h = harness();
    await expect(
      h.manager.rejectConnectedAccount(SID, REASON, EXPECTED_JID),
    ).resolves.toBeUndefined();
    expect(h.engineFactory.create).not.toHaveBeenCalled();
    expect(h.repo.updateStatus).not.toHaveBeenCalled();
    expect(h.repo.setLastMeJid).not.toHaveBeenCalled();
    expect(h.eventBus.publish).not.toHaveBeenCalled();
    expect(h.prisma.waAuthKey.deleteMany).not.toHaveBeenCalled();
  });

  it('com engine: logout, sai do mapa, persiste e publica STOPPED com o motivo e restaura lastMeJid', async () => {
    const h = harness();
    const a = await h.startEngine('WORKING');

    await h.manager.rejectConnectedAccount(SID, REASON, EXPECTED_JID);
    expect(a.logout).toHaveBeenCalledOnce();
    expect(h.manager.hasEngine(SID)).toBe(false);
    expect(h.manager.liveView(SID)).toBeNull();
    expect(h.repo.updateStatus).toHaveBeenCalledOnce();
    expect(h.repo.updateStatus).toHaveBeenCalledWith(
      SID,
      'STOPPED',
      expect.objectContaining({
        meJid: null,
        mePushName: null,
        lastError: REASON,
      }),
    );
    expect(h.eventBus.publish).toHaveBeenCalledOnce();
    expect(h.eventBus.publish).toHaveBeenCalledWith({
      name: 'wa.event',
      occurredAt: expect.any(Date),
      payload: expect.objectContaining({
        event: 'session.status',
        sessionId: SID,
        session: NAME,
        engine: 'baileys',
        payload: {
          status: 'STOPPED',
          meJid: null,
          mePushName: null,
          error: REASON,
        },
      }),
    });
    expect(h.repo.setLastMeJid).toHaveBeenCalledWith(SID, EXPECTED_JID);
    expect(h.log.slice(-4)).toEqual([
      'logout#1',
      `updateStatus:STOPPED:${REASON}`,
      'publish:STOPPED',
      `setLastMeJid:${EXPECTED_JID}`,
    ]);
  });

  it('publica um único STOPPED (com o motivo): o STOPPED sem motivo do próprio logout é descartado', async () => {
    const h = harness();
    const a = await h.startEngine('WORKING');
    // Como o Baileys (doLogout → setStatus STOPPED sem erro) antes de resolver.
    a.logout.mockImplementationOnce(async () => {
      h.log.push('logout#1');
      a.emit('session.status', {
        status: 'STOPPED',
        meJid: null,
        mePushName: null,
        error: null,
      });
      a.status = 'STOPPED';
    });

    await h.manager.rejectConnectedAccount(SID, REASON, EXPECTED_JID);
    await flush();
    // A engine saiu do mapa ANTES do logout (guard de onEvent): só o nosso STOPPED grava e publica.
    expect(h.log.slice(-4)).toEqual([
      'logout#1',
      `updateStatus:STOPPED:${REASON}`,
      'publish:STOPPED',
      `setLastMeJid:${EXPECTED_JID}`,
    ]);
    expect(h.repo.updateStatus).toHaveBeenCalledOnce();
    expect(h.repo.updateStatus).toHaveBeenLastCalledWith(
      SID,
      'STOPPED',
      expect.objectContaining({ lastError: REASON, meJid: null }),
    );
  });

  it('logout que falha não impede a rejeição (sai do mapa, STOPPED com motivo, lastMeJid)', async () => {
    const h = harness();
    await h.startEngine('WORKING');
    h.hold('logout').reject(new Error('rede caiu'));

    await h.manager.rejectConnectedAccount(SID, REASON, EXPECTED_JID);
    expect(h.manager.hasEngine(SID)).toBe(false);
    expect(h.repo.updateStatus).toHaveBeenCalledWith(
      SID,
      'STOPPED',
      expect.objectContaining({ lastError: REASON }),
    );
    expect(h.repo.setLastMeJid).toHaveBeenCalledWith(SID, EXPECTED_JID);
  });

  it('entra na fila do lock (sem failFast): espera a operação em andamento', async () => {
    const h = harness();
    const a = await h.startEngine('WORKING');
    const stopGate = h.hold('stop');
    const stopping = h.manager.stop(SID);
    const rejecting = h.manager.rejectConnectedAccount(
      SID,
      REASON,
      EXPECTED_JID,
    );
    await flush();
    expect(a.logout).not.toHaveBeenCalled();

    stopGate.resolve();
    await Promise.all([stopping, rejecting]);
    expect(h.log.slice(2, 4)).toEqual(['stop#1', 'logout#1']);
    expect(h.repo.setLastMeJid).toHaveBeenCalledWith(SID, EXPECTED_JID);
  });
});

describe('SessionManager — leituras do link (E27/P-086)', () => {
  it('liveView devolve status+qr da mesma instância e null sem engine; hasEngine acompanha', async () => {
    const h = harness();
    expect(h.manager.liveView(SID)).toBeNull();
    expect(h.manager.hasEngine(SID)).toBe(false);

    await h.manager.start(SID);
    expect(h.manager.hasEngine(SID)).toBe(true);
    expect(h.manager.liveView(SID)).toEqual({
      status: 'SCAN_QR_CODE',
      qr: qrOf(1),
    });

    await flush();
    await h.manager.newQr(SID);
    // Depois do newQr a engine é outra: status e QR vêm juntos da nova, nunca misturados.
    expect(h.manager.liveView(SID)).toEqual({
      status: 'SCAN_QR_CODE',
      qr: qrOf(2),
    });
    h.engines[1].status = 'WORKING';
    h.engines[1].qr = null;
    expect(h.manager.liveView(SID)).toEqual({ status: 'WORKING', qr: null });
  });

  it('isRehydrated: false antes do bootstrap, true depois sem candidatos', async () => {
    const h = harness();
    expect(h.manager.isRehydrated()).toBe(false);
    await h.manager.onApplicationBootstrap();
    expect(h.repo.findAutostart).toHaveBeenCalledOnce();
    expect(h.manager.isRehydrated()).toBe(true);
    expect(h.engineFactory.create).not.toHaveBeenCalled();
  });

  it('isRehydrated com candidatos: só vira true quando o laço termina, mesmo com falha no start', async () => {
    const h = harness();
    h.repo.findAutostart.mockResolvedValueOnce([
      { ...h.session, status: 'WORKING' },
    ]);
    const startGate = h.hold('start');

    await h.manager.onApplicationBootstrap();
    await flush();
    expect(h.log).toEqual(['create#1', 'start#1']);
    expect(h.manager.isRehydrated()).toBe(false);

    startGate.reject(new Error('handshake falhou'));
    await vi.waitFor(() => expect(h.manager.isRehydrated()).toBe(true));
    expect(h.loggerError).toHaveBeenCalledWith(
      expect.stringContaining('Falha ao reidratar'),
    );
  });
});
