import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../bootstrap/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EventBus } from '../../shared-kernel/event-bus/event-bus';
import { newId } from '../../shared-kernel/ulid';
import type {
  GuardrailEventName,
  WaEventEnvelope,
} from '../sessions/application/engine.port';
import { ReplyRateService } from '../observability/reply-rate.service';

// G5 — máquina de estados de SAÚDE da sessão (guard-rail). Limiar RELATIVO à mediana da frota
// (35% é alvo/fallback, NÃO corte fixo). MODO OBSERVAÇÃO (GUARDRAIL_ENFORCE=false, default): a
// avaliação automática e os sinais duros NÃO aplicam transição — só são calculados/registrados;
// o hard-gate só bloqueia estados aplicados por OVERRIDE manual. Com enforce=true, tudo atua.

export type GuardrailState =
  | 'ativa'
  | 'throttled'
  | 'quarentena'
  | 'aquecimento'
  | 'banida'
  | 'pausa_manual';

export type ManualAction = 'quarantine' | 'warmup' | 'activate' | 'pause';

const MANUAL_TO_STATE: Record<ManualAction, GuardrailState> = {
  quarantine: 'quarentena',
  warmup: 'aquecimento',
  activate: 'ativa',
  pause: 'pausa_manual',
};

// Estados "pegajosos": não mudam pela avaliação automática por reply-rate.
const STICKY: ReadonlySet<GuardrailState> = new Set(['banida', 'pausa_manual']);
// Estados que bloqueiam envio cold no hard-gate.
const BLOCKS_COLD: ReadonlySet<GuardrailState> = new Set([
  'quarentena',
  'banida',
  'pausa_manual',
]);

// G6 — evento OUT emitido quando a sessão ENTRA em cada estado (pausa_manual é controle do Diogo,
// não vai no catálogo do n8n).
const STATE_EVENT: Partial<Record<GuardrailState, GuardrailEventName>> = {
  ativa: 'session.recovered',
  throttled: 'session.throttled',
  quarentena: 'session.quarantined',
  aquecimento: 'session.warming',
  banida: 'session.banned',
};

export interface GuardrailEvaluation {
  sessionId: string;
  enforce: boolean;
  currentState: GuardrailState;
  targetState: GuardrailState;
  applied: boolean; // só true quando enforce aplicou a transição
  replyRate: number;
  sample: number;
  reliable: boolean;
  fleetMedian: number | null;
  baseline: number; // mediana da frota ou fallback (target)
  reason: string;
}

export interface ColdGate {
  allowed: boolean;
  state: GuardrailState;
  reason?: string | null;
}

@Injectable()
export class GuardrailService {
  private readonly enforce: boolean;
  private readonly nmin: number;
  private readonly throttleMult: number;
  private readonly quarantineMult: number;
  private readonly target: number;
  private readonly cooldownHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly replyRate: ReplyRateService,
    private readonly eventBus: EventBus,
    config: ConfigService<Env, true>,
  ) {
    this.enforce = config.get('GUARDRAIL_ENFORCE', { infer: true });
    this.nmin = config.get('GUARDRAIL_NMIN', { infer: true });
    this.throttleMult = config.get('GUARDRAIL_THROTTLE_MULT', { infer: true });
    this.quarantineMult = config.get('GUARDRAIL_QUARANTINE_MULT', {
      infer: true,
    });
    this.target = config.get('GUARDRAIL_TARGET_REPLY_RATE', { infer: true });
    this.cooldownHours = config.get('GUARDRAIL_COOLDOWN_HOURS', { infer: true });
  }

  isEnforcing(): boolean {
    return this.enforce;
  }

  // G6 — publica um evento OUT do guard-rail no EventBus (o WebhookDispatcher entrega ao n8n).
  private async emit(
    sessionId: string,
    event: GuardrailEventName,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const s = await this.prisma.waSession.findUnique({
      where: { id: sessionId },
      select: { name: true, engine: true },
    });
    const envelope: WaEventEnvelope = {
      id: newId(),
      timestamp: Date.now(),
      event,
      sessionId,
      session: s?.name ?? sessionId,
      payload,
      engine: s?.engine === 'WWEBJS' ? 'wwebjs' : 'baileys',
    };
    this.eventBus.publish({
      name: 'wa.event',
      occurredAt: new Date(),
      payload: envelope,
    });
  }

  // Lê o estado (cria default 'ativa' idempotente). sessionId deve existir (FK).
  async getState(sessionId: string) {
    return this.prisma.sessionGuardrail.upsert({
      where: { sessionId },
      create: { id: newId(), sessionId, state: 'ativa' },
      update: {},
    });
  }

  // Mediana do reply-rate (7d) das sessões com amostra confiável. null se a frota é pequena
  // (< 2 sessões reliable) — aí o baseline cai no alvo/fallback (GUARDRAIL_TARGET_REPLY_RATE).
  async fleetMedianReplyRate(): Promise<number | null> {
    const rows = await this.prisma.sessionMetric.findMany({
      where: { windowDays: 7, reliable: true },
      select: { replyRate: true },
    });
    if (rows.length < 2) return null;
    const v = rows.map((r) => r.replyRate).sort((a, b) => a - b);
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  }

  // Avalia o estado-alvo a partir do reply-rate vs mediana da frota. Só APLICA se enforce=true.
  async evaluate(ref: string): Promise<GuardrailEvaluation> {
    const rr = await this.replyRate.compute(ref, 7); // resolve ref + atualiza snapshot
    const sessionId = rr.sessionId;
    const gr = await this.getState(sessionId);
    const current = gr.state as GuardrailState;
    const fleetMedian = await this.fleetMedianReplyRate();
    const baseline = fleetMedian ?? this.target;

    const pct = (x: number) => `${Math.round(x * 100)}%`;
    let target: GuardrailState = current;
    let reason: string;

    if (STICKY.has(current)) {
      reason = `estado fixo (${current}) — avaliação automática não sobrescreve`;
    } else if (!rr.reliable) {
      target = 'aquecimento';
      reason = `amostra ${rr.sample} < Nmin ${this.nmin} — sem veredito (aquecimento)`;
    } else if (rr.replyRate < baseline * this.quarantineMult) {
      target = 'quarentena';
      reason = `reply ${pct(rr.replyRate)} < ${pct(baseline * this.quarantineMult)} (mediana×${this.quarantineMult})`;
    } else if (rr.replyRate < baseline * this.throttleMult) {
      target = 'throttled';
      reason = `reply ${pct(rr.replyRate)} < ${pct(baseline * this.throttleMult)} (mediana×${this.throttleMult})`;
    } else if (rr.replyRate >= baseline) {
      target = 'ativa';
      reason = `reply ${pct(rr.replyRate)} >= mediana ${pct(baseline)}`;
    } else {
      // zona de histerese (entre throttle e mediana): mantém o estado atual p/ não oscilar
      reason = `reply ${pct(rr.replyRate)} na faixa de histerese — mantém ${current}`;
    }

    let applied = false;
    if (this.enforce && target !== current && !STICKY.has(current)) {
      await this.apply(sessionId, target, reason, new Date(), {
        replyRate: rr.replyRate,
        sample: rr.sample,
      });
      applied = true;
    }

    return {
      sessionId,
      enforce: this.enforce,
      currentState: current,
      targetState: target,
      applied,
      replyRate: rr.replyRate,
      sample: rr.sample,
      reliable: rr.reliable,
      fleetMedian,
      baseline,
      reason,
    };
  }

  // Aplica uma transição de estado. C10: idempotente — só aplica se o evento for MAIS NOVO que o
  // último aplicado (eventTs). Define quarentenaDesde/cooldownAte conforme o estado.
  async apply(
    sessionId: string,
    state: GuardrailState,
    reason: string,
    eventTs: Date = new Date(),
    ctx?: { replyRate?: number; sample?: number },
  ) {
    const existing = await this.prisma.sessionGuardrail.findUnique({
      where: { sessionId },
    });
    if (existing && existing.eventTs >= eventTs) {
      return existing; // evento antigo/duplicado — ignora (C10)
    }
    const previousState = existing?.state as GuardrailState | undefined;
    const quarentenaDesde =
      state === 'quarentena'
        ? (existing?.quarentenaDesde ?? eventTs)
        : state === 'ativa'
          ? null
          : (existing?.quarentenaDesde ?? null);
    const cooldownAte =
      state === 'quarentena'
        ? new Date(eventTs.getTime() + this.cooldownHours * 3_600_000)
        : state === 'ativa'
          ? null
          : (existing?.cooldownAte ?? null);

    const saved = await this.prisma.sessionGuardrail.upsert({
      where: { sessionId },
      create: {
        id: newId(),
        sessionId,
        state,
        reason,
        eventTs,
        quarentenaDesde,
        cooldownAte,
      },
      update: { state, reason, eventTs, quarentenaDesde, cooldownAte },
    });

    // G6: emite o evento OUT só na TRANSIÇÃO (mudança de estado). Payload do session.quarantined
    // traz reply_rate/amostra/motivo/cooldown_ate (cap_novo é do G8). pausa_manual não vai ao catálogo.
    if (previousState !== state) {
      const event = STATE_EVENT[state];
      if (event) {
        void this.emit(sessionId, event, {
          state,
          motivo: reason,
          quarentena_desde: saved.quarentenaDesde?.toISOString() ?? null,
          cooldown_ate: saved.cooldownAte?.toISOString() ?? null,
          reply_rate: ctx?.replyRate ?? null,
          amostra: ctx?.sample ?? null,
          cap_novo: null,
        }).catch(() => undefined);
      }
    }
    return saved;
  }

  // Hard-gate: pode enviar cold? Bloqueia em estados de bloqueio. Em OBSERVAÇÃO o estado só chega
  // a esses valores por override manual (a avaliação automática não aplica), então o automático
  // nunca bloqueia até enforce=true — mas um pause/quarentena MANUAL bloqueia sempre.
  async canSendCold(sessionId: string): Promise<ColdGate> {
    const gr = await this.getState(sessionId);
    const state = gr.state as GuardrailState;
    if (BLOCKS_COLD.has(state)) {
      // G6: um envio cold barrado vira evento send.blocked (o n8n re-enfileira o lead).
      void this.emit(sessionId, 'send.blocked', {
        state,
        motivo: gr.reason ?? null,
      }).catch(() => undefined);
      return { allowed: false, state, reason: gr.reason };
    }
    return { allowed: true, state };
  }

  // Sinal duro (463, close não-recuperável, restrição). Emite o evento sempre; aplica quarentena/
  // banida só com enforce (em observação só registra o último sinal).
  async recordHardSignal(sessionId: string, signal: string): Promise<void> {
    // G6: 463 = número cru (C6); restrição da conta. C5: NÃO há block/report.
    const sigEvent: GuardrailEventName | null =
      signal === '463'
        ? 'signal.463'
        : signal === 'restriction'
          ? 'signal.restriction'
          : null;
    if (sigEvent) {
      void this.emit(sessionId, sigEvent, { signal }).catch(() => undefined);
    }
    if (this.enforce) {
      const banned = signal === 'ban' || signal === '401';
      await this.apply(
        sessionId,
        banned ? 'banida' : 'quarentena',
        `sinal duro: ${signal}`,
      );
    }
    await this.prisma.sessionGuardrail.upsert({
      where: { sessionId },
      create: { id: newId(), sessionId, state: 'ativa', ultimoSinal: signal },
      update: { ultimoSinal: signal },
    });
  }

  // Override manual do Diogo (G7). Aplica SEMPRE (decisão explícita, independe de enforce).
  async setManualState(ref: string, action: ManualAction) {
    const session = await this.prisma.waSession.findFirst({
      where: { OR: [{ id: ref }, { name: ref }] },
      select: { id: true },
    });
    if (!session) {
      throw new Error(`Sessão não encontrada: ${ref}`);
    }
    return this.apply(
      session.id,
      MANUAL_TO_STATE[action],
      `override manual: ${action}`,
    );
  }
}
