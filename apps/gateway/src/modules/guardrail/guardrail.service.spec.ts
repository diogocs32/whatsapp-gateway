import { beforeEach, describe, expect, it } from 'vitest';
import { GuardrailService } from './guardrail.service';
import type { GuardrailState } from './guardrail.service';

// Testes UNITÁRIOS da máquina de decisão G5 (sem infra — Prisma/ReplyRate/EventBus/Config
// substituídos por fakes de construtor). O comportamento com banco/HTTP real é coberto pelos
// e2e g5/g6/g7 — aqui provamos a TABELA DE DECISÃO e as regras C10/sticky/histerese isoladas.
//
// Limiares usados (mesmos defaults documentados da M2): nmin=20, throttleMult=0.75,
// quarantineMult=0.6, targetReplyRate=0.35, cooldownHours=48. Com baseline=0.35:
//   quarentena < 0.21 · throttled < 0.2625 · histerese [0.2625, 0.35) · ativa >= 0.35

interface GuardrailRow {
  id: string;
  sessionId: string;
  state: GuardrailState;
  reason: string | null;
  quarentenaDesde: Date | null;
  cooldownAte: Date | null;
  ultimoSinal: string | null;
  eventTs: Date;
}

class PrismaFake {
  rows = new Map<string, GuardrailRow>();
  metricRows: Array<{ replyRate: number }> = [];

  guardrailConfig = {
    findUnique: async () => null, // sem override no DB → valem os defaults do env
  };
  sessionMetric = {
    findMany: async () => this.metricRows,
  };
  waSession = {
    findUnique: async () => ({ name: 'Diogo', engine: 'BAILEYS' }),
    findFirst: async () => ({ id: 'S1' }),
  };
  sessionGuardrail = {
    findUnique: async ({ where }: { where: { sessionId: string } }) =>
      this.rows.get(where.sessionId) ?? null,
    findMany: async ({ where }: { where: { sessionId: { in: string[] } } }) =>
      where.sessionId.in
        .map((id) => this.rows.get(id))
        .filter((r): r is GuardrailRow => Boolean(r)),
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { sessionId: string };
      create: Partial<GuardrailRow>;
      update: Partial<GuardrailRow>;
    }) => {
      const existing = this.rows.get(where.sessionId);
      const row: GuardrailRow = existing
        ? { ...existing, ...update }
        : {
            // espelha os defaults do schema (state ativa, eventTs now())
            id: 'fake',
            sessionId: where.sessionId,
            state: 'ativa',
            reason: null,
            quarentenaDesde: null,
            cooldownAte: null,
            ultimoSinal: null,
            eventTs: new Date(),
            ...create,
          };
      this.rows.set(where.sessionId, row);
      return row;
    },
  };

  seed(sessionId: string, patch: Partial<GuardrailRow>): void {
    this.rows.set(sessionId, {
      id: 'seed',
      sessionId,
      state: 'ativa',
      reason: null,
      quarentenaDesde: null,
      cooldownAte: null,
      ultimoSinal: null,
      eventTs: new Date(0), // passado distante — não interfere no C10 dos testes
      ...patch,
    });
  }
}

class EventBusFake {
  published: Array<{ name: string; payload: Record<string, unknown> }> = [];
  publish(evt: { name: string; payload: Record<string, unknown> }): void {
    this.published.push(evt);
  }
  async flush(): Promise<void> {
    // emit() do serviço é fire-and-forget (void) — espera os microtasks/timers pendentes
    await new Promise((resolve) => setImmediate(resolve));
  }
  eventNames(): string[] {
    return this.published.map(
      (e) => (e.payload as { event?: string }).event ?? e.name,
    );
  }
}

function makeService(opts: {
  enforce?: boolean;
  replyRate?: number;
  sample?: number;
  reliable?: boolean;
  prisma?: PrismaFake;
  bus?: EventBusFake;
}) {
  const prisma = opts.prisma ?? new PrismaFake();
  const bus = opts.bus ?? new EventBusFake();
  const envDefaults: Record<string, unknown> = {
    GUARDRAIL_ENFORCE: opts.enforce ?? false,
    GUARDRAIL_NMIN: 20,
    GUARDRAIL_THROTTLE_MULT: 0.75,
    GUARDRAIL_QUARANTINE_MULT: 0.6,
    GUARDRAIL_TARGET_REPLY_RATE: 0.35,
    GUARDRAIL_COOLDOWN_HOURS: 48,
  };
  const config = { get: (key: string) => envDefaults[key] };
  const replyRate = {
    compute: async () => ({
      sessionId: 'S1',
      replyRate: opts.replyRate ?? 0,
      sample: opts.sample ?? 0,
      reliable: opts.reliable ?? false,
      deliveryRate: 1,
      readRate: 1,
      scoreSaude: 1,
    }),
  };
  const service = new GuardrailService(
    prisma as never,
    replyRate as never,
    bus as never,
    config as never,
  );
  return { service, prisma, bus };
}

describe('GuardrailService.evaluate — tabela de decisão G5', () => {
  it('amostra < Nmin → alvo aquecimento (sem veredito)', async () => {
    const { service } = makeService({ replyRate: 0.9, sample: 5 });
    const r = await service.evaluate('S1');
    expect(r.targetState).toBe('aquecimento');
    expect(r.reason).toContain('Nmin');
    expect(r.applied).toBe(false); // observação nunca aplica
  });

  it('reply < baseline×quarantineMult → alvo quarentena', async () => {
    const { service } = makeService({ replyRate: 0.1, sample: 20 });
    const r = await service.evaluate('S1');
    expect(r.targetState).toBe('quarentena');
    expect(r.baseline).toBe(0.35); // frota pequena → fallback no alvo
  });

  it('reply entre quarantine e throttle → alvo throttled', async () => {
    const { service } = makeService({ replyRate: 0.25, sample: 20 });
    const r = await service.evaluate('S1');
    expect(r.targetState).toBe('throttled');
  });

  it('reply na faixa de histerese mantém o estado atual (não oscila)', async () => {
    const prisma = new PrismaFake();
    prisma.seed('S1', { state: 'throttled' });
    const { service } = makeService({ replyRate: 0.3, sample: 20, prisma });
    const r = await service.evaluate('S1');
    expect(r.targetState).toBe('throttled'); // manteve, não subiu para ativa
    expect(r.reason).toContain('histerese');
  });

  it('reply >= baseline → alvo ativa', async () => {
    const { service } = makeService({ replyRate: 0.4, sample: 20 });
    const r = await service.evaluate('S1');
    expect(r.targetState).toBe('ativa');
  });

  it('estado sticky (banida/pausa_manual) nunca é sobrescrito pela avaliação', async () => {
    for (const sticky of ['banida', 'pausa_manual'] as const) {
      const prisma = new PrismaFake();
      prisma.seed('S1', { state: sticky });
      const { service } = makeService({
        replyRate: 0.9,
        sample: 50,
        prisma,
        enforce: true,
      });
      const r = await service.evaluate('S1');
      expect(r.targetState).toBe(sticky);
      expect(r.applied).toBe(false);
      expect(r.reason).toContain('estado fixo');
    }
  });

  it('mediana da frota vira o baseline quando há >= 2 sessões reliable', async () => {
    const prisma = new PrismaFake();
    prisma.metricRows = [{ replyRate: 0.5 }, { replyRate: 0.3 }];
    // baseline = 0.4 → quarentena < 0.24; reply 0.23 seria "throttled" no fallback 0.35
    const { service } = makeService({ replyRate: 0.23, sample: 20, prisma });
    const r = await service.evaluate('S1');
    expect(r.fleetMedian).toBe(0.4);
    expect(r.baseline).toBe(0.4);
    expect(r.targetState).toBe('quarentena');
  });

  it('modo observação (enforce=false): transição calculada mas NUNCA aplicada', async () => {
    const prisma = new PrismaFake();
    prisma.seed('S1', { state: 'ativa' });
    const { service } = makeService({ replyRate: 0.1, sample: 20, prisma });
    const r = await service.evaluate('S1');
    expect(r.targetState).toBe('quarentena');
    expect(r.applied).toBe(false);
    expect(prisma.rows.get('S1')?.state).toBe('ativa'); // banco intocado
  });

  it('enforce=true: aplica a transição, seta cooldown e emite session.quarantined', async () => {
    const prisma = new PrismaFake();
    prisma.seed('S1', { state: 'ativa' });
    const bus = new EventBusFake();
    const { service } = makeService({
      replyRate: 0.1,
      sample: 20,
      prisma,
      bus,
      enforce: true,
    });
    const r = await service.evaluate('S1');
    expect(r.applied).toBe(true);
    const row = prisma.rows.get('S1');
    expect(row?.state).toBe('quarentena');
    expect(row?.quarentenaDesde).toBeInstanceOf(Date);
    // cooldown = eventTs + 48h
    expect(row?.cooldownAte?.getTime()).toBe(
      (row?.eventTs.getTime() ?? 0) + 48 * 3_600_000,
    );
    await bus.flush();
    expect(bus.eventNames()).toContain('session.quarantined');
  });
});

describe('GuardrailService.apply — idempotência C10', () => {
  it('evento mais antigo que o último aplicado é ignorado', async () => {
    const prisma = new PrismaFake();
    const now = new Date();
    prisma.seed('S1', { state: 'quarentena', eventTs: now });
    const { service } = makeService({ prisma });
    const older = new Date(now.getTime() - 60_000);
    const result = await service.apply('S1', 'ativa', 'replay antigo', older);
    expect(result.state).toBe('quarentena'); // devolveu o existente, sem aplicar
    expect(prisma.rows.get('S1')?.state).toBe('quarentena');
  });

  it('evento mais novo aplica e sair da quarentena para ativa limpa cooldown', async () => {
    const prisma = new PrismaFake();
    prisma.seed('S1', {
      state: 'quarentena',
      quarentenaDesde: new Date(0),
      cooldownAte: new Date(Date.now() + 1_000_000),
    });
    const { service } = makeService({ prisma });
    const saved = await service.apply('S1', 'ativa', 'recuperou', new Date());
    expect(saved.state).toBe('ativa');
    expect(saved.quarentenaDesde).toBeNull();
    expect(saved.cooldownAte).toBeNull();
  });
});

describe('GuardrailService.canSendCold — hard-gate', () => {
  it.each(['quarentena', 'banida', 'pausa_manual'] as const)(
    'bloqueia cold em %s e emite send.blocked',
    async (state) => {
      const prisma = new PrismaFake();
      prisma.seed('S1', { state, reason: 'teste' });
      const bus = new EventBusFake();
      const { service } = makeService({ prisma, bus });
      const gate = await service.canSendCold('S1');
      expect(gate.allowed).toBe(false);
      expect(gate.state).toBe(state);
      await bus.flush();
      expect(bus.eventNames()).toContain('send.blocked');
    },
  );

  it.each(['ativa', 'throttled', 'aquecimento'] as const)(
    'permite cold em %s',
    async (state) => {
      const prisma = new PrismaFake();
      prisma.seed('S1', { state });
      const { service } = makeService({ prisma });
      const gate = await service.canSendCold('S1');
      expect(gate.allowed).toBe(true);
    },
  );
});

describe('GuardrailService.fleetMedianReplyRate', () => {
  let prisma: PrismaFake;
  let service: GuardrailService;

  beforeEach(() => {
    prisma = new PrismaFake();
    service = makeService({ prisma }).service;
  });

  it('frota pequena (< 2 reliable) → null (baseline cai no fallback)', async () => {
    prisma.metricRows = [{ replyRate: 0.8 }];
    expect(await service.fleetMedianReplyRate()).toBeNull();
  });

  it('quantidade ímpar → elemento central', async () => {
    prisma.metricRows = [
      { replyRate: 0.9 },
      { replyRate: 0.1 },
      { replyRate: 0.5 },
    ];
    expect(await service.fleetMedianReplyRate()).toBe(0.5);
  });

  it('quantidade par → média dos dois centrais', async () => {
    prisma.metricRows = [
      { replyRate: 0.2 },
      { replyRate: 0.6 },
      { replyRate: 0.8 },
      { replyRate: 0.4 },
    ];
    expect(await service.fleetMedianReplyRate()).toBe(0.5);
  });
});
