import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { Env } from '../src/bootstrap/config';
import type { PrismaClient, Prisma } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/infra/prisma/prisma.service';
import { GuardrailService } from '../src/modules/guardrail/guardrail.service';
import { ReplyRateService } from '../src/modules/observability/reply-rate.service';
import type { WaEventEnvelope } from '../src/modules/sessions/application/engine.port';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import { createGuardrailFixture } from './guardrail-c10.fixture';

type Row = Awaited<
  ReturnType<PrismaClient['sessionGuardrail']['findUniqueOrThrow']>
>;
type Fixture = Awaited<ReturnType<typeof createGuardrailFixture>>;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// O timeout só detecta uma barreira quebrada; a ordem da corrida vem das Promises.
async function reached(barrier: Promise<void>, operation: Promise<unknown>) {
  let timeout!: ReturnType<typeof setTimeout>;
  try {
    await Promise.race([
      barrier,
      operation.then(() => {
        throw new Error('operação terminou antes da barreira C10');
      }),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error('barreira C10 não atingida')),
          3000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

interface Hooks {
  afterRead?: (row: Row | null) => void;
  beforeUpdate?: (args: Prisma.SessionGuardrailUpdateManyArgs) => Promise<void>;
  afterUpdate?: (count: number) => void;
  beforeCreate?: () => Promise<void>;
  createError?: (error: unknown) => void;
}

// Serviço, Prisma/SQL, ReplyRate e EventBus reais. Os hooks apenas interrompem uma
// consulta antes/depois do SQL real para ordenar os escritores concorrentes.
function harness(client: PrismaClient, enforce = true, hooks: Hooks = {}) {
  const bus = new EventBus();
  const events: WaEventEnvelope[] = [];
  bus.subscribe('wa.event', (event) => {
    events.push(event.payload as WaEventEnvelope);
  });
  const effects = new Set<Promise<void>>();
  const observable = new Proxy(client, {
    get(target, property, receiver) {
      if (property === 'waSession') {
        return new Proxy(target.waSession, {
          get(delegate, method, delegateReceiver) {
            if (method === 'findUnique') {
              return (args: Prisma.WaSessionFindUniqueArgs) => {
                const completed = deferred();
                effects.add(completed.promise);
                // emit() aguarda este lookup antes de publicar. A microtask sentinela
                // roda após a continuação do await e a publicação síncrona no bus real.
                return new Promise((resolve, reject) => {
                  Promise.resolve(delegate.findUnique(args)).then(
                    (row) => {
                      resolve(row);
                      queueMicrotask(completed.resolve);
                    },
                    (error: unknown) => {
                      reject(error);
                      queueMicrotask(completed.resolve);
                    },
                  );
                });
              };
            }
            return Reflect.get(delegate, method, delegateReceiver);
          },
        });
      }
      if (property === 'sessionGuardrail') {
        return new Proxy(target.sessionGuardrail, {
          get(delegate, method, delegateReceiver) {
            if (method === 'findUnique') {
              return async (args: Prisma.SessionGuardrailFindUniqueArgs) => {
                const row = await delegate.findUnique(args);
                hooks.afterRead?.(row);
                return row;
              };
            }
            if (method === 'updateMany') {
              return async (args: Prisma.SessionGuardrailUpdateManyArgs) => {
                await hooks.beforeUpdate?.(args);
                const changed = await delegate.updateMany(args);
                hooks.afterUpdate?.(changed.count);
                return changed;
              };
            }
            if (method === 'create') {
              return async (args: Prisma.SessionGuardrailCreateArgs) => {
                await hooks.beforeCreate?.();
                try {
                  return await delegate.create(args);
                } catch (error) {
                  hooks.createError?.(error);
                  throw error;
                }
              };
            }
            return Reflect.get(delegate, method, delegateReceiver);
          },
        });
      }
      return Reflect.get(target, property, receiver);
    },
  }) as unknown as PrismaService;
  const config = new ConfigService<Env, true>({
    GUARDRAIL_ENFORCE: enforce,
    GUARDRAIL_NMIN: 20,
    GUARDRAIL_THROTTLE_MULT: 0.75,
    GUARDRAIL_QUARANTINE_MULT: 0.6,
    GUARDRAIL_TARGET_REPLY_RATE: 0.35,
    GUARDRAIL_COOLDOWN_HOURS: 48,
  });
  const replyRate = new ReplyRateService(observable, config);
  const service = new GuardrailService(observable, replyRate, bus, config);
  return {
    service,
    events,
    async flush() {
      // Toda emissão começa o lookup antes de apply retornar. Esperar a sentinela
      // prova término inclusive quando esperamos ausência de eventos; sem sleep/IO fake.
      await Promise.all(effects);
      effects.clear();
    },
  };
}

describe('E21/P-022 C10 — ordenação e efeitos GuardrailService/Prisma reais', () => {
  let fixture: Fixture;
  let prisma: PrismaClient;
  let sessionId: string;
  const base = new Date('2020-01-01T00:00:00.000Z');
  const at = (milliseconds: number) => new Date(base.getTime() + milliseconds);
  const row = () =>
    prisma.sessionGuardrail.findUniqueOrThrow({ where: { sessionId } });

  async function seed(
    patch: Partial<Prisma.SessionGuardrailUncheckedCreateInput> = {},
  ) {
    return prisma.sessionGuardrail.create({
      data: {
        id: randomUUID(),
        sessionId,
        state: 'ativa',
        eventTs: base,
        ...patch,
      },
    });
  }

  beforeAll(async () => {
    fixture = await createGuardrailFixture();
    prisma = fixture.prisma;
  });
  beforeEach(async () => {
    sessionId = `c10-${randomUUID()}`;
    await fixture.seedSession(sessionId);
    // Só Date: timers/microtasks/socket SQL continuam reais.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2040-01-01T00:00:00.000Z'));
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Remove somente o registro da fixture; schema inteiro é privado deste arquivo.
    await prisma.waSession.delete({ where: { id: sessionId } });
  });
  afterAll(async () => {
    await fixture?.dispose();
  });

  it('getState cria ativa, não emite e conserva id/datas/campos nas releituras', async () => {
    const h = harness(prisma);
    const initial = await h.service.getState(sessionId);
    expect(initial.state).toBe('ativa');
    expect(initial.sessionId).toBe(sessionId);
    vi.setSystemTime(new Date('2050-01-01T00:00:00.000Z'));
    expect(await h.service.getState(sessionId)).toEqual(initial);
    expect(await row()).toEqual(initial);
    expect(await prisma.sessionGuardrail.count({ where: { sessionId } })).toBe(
      1,
    );
    await h.flush();
    expect(h.events).toEqual([]);
  });

  it.each([
    ['antigo', -1],
    ['igual', 0],
  ] as const)(
    'apply %s conserva todos os campos persistidos e não publica G6',
    async (_label, offset) => {
      const initial = await seed({
        state: 'quarentena',
        reason: 'já aplicada',
        quarentenaDesde: at(-100),
        cooldownAte: at(48 * 3_600_000),
        ultimoSinal: '401',
        restrictionUntil: at(60_000),
        restrictionSignal: '463',
      });
      const h = harness(prisma);
      const returned = await h.service.apply(
        sessionId,
        'ativa',
        'não deve substituir',
        at(offset),
      );
      expect(returned).toEqual(initial);
      expect(await row()).toEqual(initial);
      await h.flush();
      expect(h.events).toEqual([]);
    },
  );

  it('novo aplica quarentena no SQL, payload G6 e releitura idempotente de getState', async () => {
    await seed();
    const h = harness(prisma);
    const applied = await h.service.apply(
      sessionId,
      'quarentena',
      'amostra ruim',
      at(1),
      {
        replyRate: 0.125,
        sample: 24,
      },
    );
    const saved = await row();
    expect(saved).toMatchObject({
      state: 'quarentena',
      reason: 'amostra ruim',
      eventTs: at(1),
      quarentenaDesde: at(1),
      cooldownAte: at(48 * 3_600_000 + 1),
    });
    expect(applied.eventTs).toEqual(saved.eventTs);
    expect(await h.service.getState(sessionId)).toEqual(saved);
    await h.flush();
    expect(h.events).toHaveLength(1);
    expect(h.events[0]).toMatchObject({
      event: 'session.quarantined',
      sessionId,
      session: sessionId,
      engine: 'baileys',
      payload: {
        state: 'quarentena',
        motivo: 'amostra ruim',
        quarentena_desde: at(1).toISOString(),
        cooldown_ate: at(48 * 3_600_000 + 1).toISOString(),
        reply_rate: 0.125,
        amostra: 24,
        cap_novo: null,
      },
    });
  });

  it('novo mesmo estado renova eventTs/reason/cooldown, preserva início e não duplica G6', async () => {
    await seed({
      state: 'quarentena',
      reason: 'primeiro',
      quarentenaDesde: at(-10),
      cooldownAte: at(50),
    });
    const h = harness(prisma);
    await h.service.apply(sessionId, 'quarentena', 'renovada', at(1));
    expect(await row()).toMatchObject({
      state: 'quarentena',
      eventTs: at(1),
      reason: 'renovada',
      quarentenaDesde: at(-10),
      cooldownAte: at(48 * 3_600_000 + 1),
    });
    await h.flush();
    expect(h.events).toEqual([]);
  });

  it('recuperação nova limpa início/cooldown e emite sessão recuperada uma vez', async () => {
    await seed({
      state: 'quarentena',
      quarentenaDesde: at(-10),
      cooldownAte: at(50),
    });
    const h = harness(prisma);
    await h.service.apply(sessionId, 'ativa', 'recuperada', at(1));
    expect(await row()).toMatchObject({
      state: 'ativa',
      eventTs: at(1),
      reason: 'recuperada',
      quarentenaDesde: null,
      cooldownAte: null,
    });
    await h.flush();
    expect(h.events.map((event) => event.event)).toEqual(['session.recovered']);
    expect(h.events[0].payload).toMatchObject({
      quarentena_desde: null,
      cooldown_ate: null,
    });
  });

  it.each(['getState', 'health', 'canSendCold'] as const)(
    'primeira transição manual após bootstrap por %s muda SQL/saúde/gate/eventos',
    async (bootstrap) => {
      const h = harness(prisma, false);
      await h.service[bootstrap](sessionId);
      const initial = await row();
      expect(initial.state).toBe('ativa');
      await h.flush();
      expect(h.events).toEqual([]);
      const next = new Date(initial.eventTs.getTime() + 1);
      vi.setSystemTime(next);
      const result = await h.service.setManualState(sessionId, 'quarantine');
      expect(result.state).toBe('quarentena');
      expect(await row()).toMatchObject({
        state: 'quarentena',
        eventTs: next,
        reason: 'override manual: quarantine',
      });
      await h.flush();
      expect(h.events.map((event) => event.event)).toEqual([
        'session.quarantined',
      ]);
      expect(await h.service.health(sessionId)).toMatchObject({
        state: 'quarentena',
        quarentena_desde: next.toISOString(),
        enforce: false,
      });
      expect(await h.service.canSendCold(sessionId)).toEqual({
        allowed: false,
        state: 'quarentena',
        reason: 'override manual: quarantine',
      });
      await h.flush();
      expect(h.events.map((event) => event.event)).toEqual([
        'session.quarantined',
        'send.blocked',
      ]);
    },
  );

  it('evaluate novo após bootstrap persiste aquecimento medido pelo ReplyRate real', async () => {
    const h = harness(prisma);
    const initial = await h.service.getState(sessionId);
    const next = new Date(initial.eventTs.getTime() + 1);
    vi.setSystemTime(next);
    const result = await h.service.evaluate(sessionId);
    expect(result).toMatchObject({
      currentState: 'ativa',
      targetState: 'aquecimento',
      applied: true,
      sample: 0,
      reliable: false,
    });
    expect(await row()).toMatchObject({
      state: 'aquecimento',
      eventTs: next,
      quarentenaDesde: null,
      cooldownAte: null,
    });
    expect(await h.service.health(sessionId)).toMatchObject({
      state: 'aquecimento',
      amostra: 0,
    });
    await h.flush();
    expect(h.events.map((event) => event.event)).toEqual(['session.warming']);
  });

  it('evaluate no mesmo milissegundo reporta applied mas C10 mantém ativa sem evento', async () => {
    const h = harness(prisma);
    const initial = await h.service.getState(sessionId);
    vi.setSystemTime(initial.eventTs);
    const result = await h.service.evaluate(sessionId);
    // Documenta o retorno atual do consumidor; applied sozinho não comprova escrita.
    expect(result).toMatchObject({
      currentState: 'ativa',
      targetState: 'aquecimento',
      applied: true,
    });
    expect(await row()).toEqual(initial);
    expect(await h.service.canSendCold(sessionId)).toEqual({
      allowed: true,
      state: 'ativa',
    });
    await h.flush();
    expect(h.events).toEqual([]);
  });

  it('override manual igual ao bootstrap mantém ativa e gate aberto sem evento', async () => {
    const h = harness(prisma, false);
    const initial = await h.service.getState(sessionId);
    vi.setSystemTime(initial.eventTs);
    expect(await h.service.setManualState(sessionId, 'quarantine')).toEqual(
      initial,
    );
    expect(await row()).toEqual(initial);
    expect(await h.service.canSendCold(sessionId)).toEqual({
      allowed: true,
      state: 'ativa',
    });
    await h.flush();
    expect(h.events).toEqual([]);
  });

  it('sinal duro novo após bootstrap persiste banida/ultimoSinal e publica G6', async () => {
    const h = harness(prisma);
    const initial = await h.service.getState(sessionId);
    const next = new Date(initial.eventTs.getTime() + 1);
    vi.setSystemTime(next);
    await h.service.recordHardSignal(sessionId, 'ban');
    expect(await row()).toMatchObject({
      state: 'banida',
      eventTs: next,
      reason: 'sinal duro: ban',
      ultimoSinal: 'ban',
    });
    await h.flush();
    expect(h.events.map((event) => event.event).sort()).toEqual([
      'session.banned',
      'signal.restriction',
    ]);
    expect(
      h.events.find((event) => event.event === 'signal.restriction')?.payload,
    ).toEqual({ signal: 'ban' });
    expect(
      h.events.find((event) => event.event === 'session.banned')?.payload,
    ).toMatchObject({ state: 'banida', motivo: 'sinal duro: ban' });
    expect(await h.service.canSendCold(sessionId)).toEqual({
      allowed: false,
      state: 'banida',
      reason: 'sinal duro: ban',
    });
    await h.flush();
    expect(h.events).toHaveLength(3);
    expect(h.events[2].event).toBe('send.blocked');
  });

  it('pausa manual nova bloqueia cold sem publicar evento de transição do catálogo', async () => {
    const h = harness(prisma, false);
    const initial = await h.service.getState(sessionId);
    vi.setSystemTime(new Date(initial.eventTs.getTime() + 1));
    await h.service.setManualState(sessionId, 'pause');
    expect(await row()).toMatchObject({
      state: 'pausa_manual',
      reason: 'override manual: pause',
    });
    await h.flush();
    expect(h.events).toEqual([]);
    expect((await h.service.canSendCold(sessionId)).allowed).toBe(false);
    await h.flush();
    expect(h.events.map((event) => event.event)).toEqual(['send.blocked']);
  });

  it.each([
    ['mais novo', 1, 2, 'throttled', 'quarentena', ['session.quarantined']],
    [
      'mais velho',
      2,
      1,
      'quarentena',
      'throttled',
      ['session.throttled', 'session.quarantined'],
    ],
    ['igual', 1, 1, 'quarentena', 'throttled', ['session.throttled']],
  ] as const)(
    'CAS real: vencedor %s e releitura do perdedor preservam ordem/eventos',
    async (
      _label,
      delayedTs,
      winnerTs,
      delayedState,
      winnerState,
      expectedEvents,
    ) => {
      await seed();
      const held = deferred();
      const release = deferred();
      const snapshots: Array<Date | undefined> = [];
      const counts: number[] = [];
      const delayed = harness(prisma, true, {
        beforeUpdate: async (args) => {
          snapshots.push(args.where?.eventTs as Date | undefined);
          if (snapshots.length === 1) {
            held.resolve();
            await release.promise;
          }
        },
        afterUpdate: (count) => counts.push(count),
      });
      const winner = harness(prisma);
      const operation = delayed.service.apply(
        sessionId,
        delayedState,
        'atrasado',
        at(delayedTs),
      );
      try {
        await reached(held.promise, operation);
        await winner.service.apply(
          sessionId,
          winnerState,
          'vencedor',
          at(winnerTs),
        );
        await winner.flush();
      } finally {
        release.resolve();
        await Promise.allSettled([operation]);
      }
      const returned = await operation;
      await delayed.flush();
      const delayedIsNewer = delayedTs > winnerTs;
      const saved = await row();
      expect(saved).toMatchObject({
        state: delayedIsNewer ? delayedState : winnerState,
        reason: delayedIsNewer ? 'atrasado' : 'vencedor',
        eventTs: at(Math.max(delayedTs, winnerTs)),
      });
      expect(returned.eventTs).toEqual(saved.eventTs);
      expect(returned.state).toBe(saved.state);
      expect(snapshots).toEqual(delayedIsNewer ? [base, at(winnerTs)] : [base]);
      expect(counts).toEqual(delayedIsNewer ? [0, 1] : [0]);
      expect(
        [...winner.events, ...delayed.events].map((event) => event.event),
      ).toEqual(expectedEvents);
      expect(
        await prisma.sessionGuardrail.count({ where: { sessionId } }),
      ).toBe(1);
    },
  );

  it.each([
    ['mais novo', 1, 2, 'throttled', 'quarentena', ['session.quarantined']],
    [
      'mais velho',
      2,
      1,
      'quarentena',
      'throttled',
      ['session.throttled', 'session.quarantined'],
    ],
  ] as const)(
    'create concorrente: P2002 SQL real com vencedor %s relê sem perder ordem',
    async (
      _label,
      delayedTs,
      winnerTs,
      delayedState,
      winnerState,
      expectedEvents,
    ) => {
      const held = deferred();
      const release = deferred();
      const reads: Array<Date | null> = [];
      const codes: unknown[] = [];
      const delayed = harness(prisma, true, {
        afterRead: (found) => reads.push(found?.eventTs ?? null),
        beforeCreate: async () => {
          held.resolve();
          await release.promise;
        },
        createError: (error) => codes.push((error as { code?: string }).code),
      });
      const winner = harness(prisma);
      const operation = delayed.service.apply(
        sessionId,
        delayedState,
        'atrasado',
        at(delayedTs),
      );
      try {
        await reached(held.promise, operation);
        await winner.service.apply(
          sessionId,
          winnerState,
          'vencedor',
          at(winnerTs),
        );
        await winner.flush();
      } finally {
        release.resolve();
        await Promise.allSettled([operation]);
      }
      const returned = await operation;
      await delayed.flush();
      const delayedIsNewer = delayedTs > winnerTs;
      const saved = await row();
      expect(codes).toEqual(['P2002']);
      expect(reads).toEqual([null, at(winnerTs)]);
      expect(saved).toMatchObject({
        state: delayedIsNewer ? delayedState : winnerState,
        reason: delayedIsNewer ? 'atrasado' : 'vencedor',
        eventTs: at(Math.max(delayedTs, winnerTs)),
      });
      expect(returned.state).toBe(saved.state);
      expect(returned.eventTs).toEqual(saved.eventTs);
      expect(
        [...winner.events, ...delayed.events].map((event) => event.event),
      ).toEqual(expectedEvents);
      expect(
        await prisma.sessionGuardrail.count({ where: { sessionId } }),
      ).toBe(1);
    },
  );

  it('CAS perdido repetidamente faz no máximo quatro writes e retorna última linha SQL sem G6', async () => {
    await seed();
    const snapshots: Array<Date | undefined> = [];
    const counts: number[] = [];
    const h = harness(prisma, true, {
      beforeUpdate: async (args) => {
        snapshots.push(args.where?.eventTs as Date | undefined);
        await prisma.sessionGuardrail.update({
          where: { sessionId },
          data: {
            state: 'throttled',
            reason: `concorrente-${snapshots.length}`,
            eventTs: at(snapshots.length),
          },
        });
      },
      afterUpdate: (count) => counts.push(count),
    });
    const returned = await h.service.apply(
      sessionId,
      'quarentena',
      'nunca adquiriu CAS',
      at(100),
    );
    expect(snapshots).toEqual([base, at(1), at(2), at(3)]);
    expect(counts).toEqual([0, 0, 0, 0]);
    expect(returned).toEqual(await row());
    expect(returned).toMatchObject({
      state: 'throttled',
      reason: 'concorrente-4',
      eventTs: at(4),
      quarentenaDesde: null,
      cooldownAte: null,
    });
    await h.flush();
    expect(h.events).toEqual([]);
  });
});
