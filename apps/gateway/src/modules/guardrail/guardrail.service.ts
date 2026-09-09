import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../bootstrap/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EventBus } from '../../shared-kernel/event-bus/event-bus';
import { recordProcessError } from '../../shared-kernel/process-errors';
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

// G7 — objeto de saúde por sessão (GET /sessions/:id/health). cap_* virão do G8.
export interface SessionHealth {
  sessionId: string;
  state: GuardrailState;
  reply_rate: number;
  amostra: number;
  reliable: boolean;
  delivery_rate: number;
  read_rate: number;
  score: number;
  cap_base: number | null;
  cap_atual: number | null;
  quarentena_desde: string | null;
  cooldown_ate: string | null;
  ultimos_sinais: string[];
  enforce: boolean;
}

// G7 — limiares tunáveis em runtime (PATCH /guardrail/config). Default vem do env (GUARDRAIL_*).
export interface GuardrailTunables {
  nmin: number;
  throttleMult: number;
  quarantineMult: number;
  targetReplyRate: number;
  cooldownHours: number;
}

// Linha de session_guardrail como o Prisma devolve (tipo derivado do client gerado).
type GuardrailRow = Awaited<
  ReturnType<PrismaService['sessionGuardrail']['upsert']>
>;

// WA-05 (auditoria 09/2026): snapshot de reply-rate mais velho que isto não entra na mediana da
// frota (uma sessão parada há dias não pode "segurar" o baseline).
const FLEET_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// Marca de override manual no `reason` — quarentena manual só sai por ação explícita (WA-04).
const MANUAL_REASON_PREFIX = 'override manual';

@Injectable()
export class GuardrailService {
  private readonly logger = new Logger(GuardrailService.name);
  private readonly enforce: boolean;
  private readonly envDefaults: GuardrailTunables;
  private cfgCache: GuardrailTunables | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly replyRate: ReplyRateService,
    private readonly eventBus: EventBus,
    config: ConfigService<Env, true>,
  ) {
    this.enforce = config.get('GUARDRAIL_ENFORCE', { infer: true });
    this.envDefaults = {
      nmin: config.get('GUARDRAIL_NMIN', { infer: true }),
      throttleMult: config.get('GUARDRAIL_THROTTLE_MULT', { infer: true }),
      quarantineMult: config.get('GUARDRAIL_QUARANTINE_MULT', { infer: true }),
      targetReplyRate: config.get('GUARDRAIL_TARGET_REPLY_RATE', {
        infer: true,
      }),
      cooldownHours: config.get('GUARDRAIL_COOLDOWN_HOURS', { infer: true }),
    };
  }

  isEnforcing(): boolean {
    return this.enforce;
  }

  // G7 — limiares efetivos: o que está no DB (PATCH) sobrepõe o default do env. Cache invalidado
  // no updateConfig (sem redeploy).
  private async cfg(): Promise<GuardrailTunables> {
    if (this.cfgCache) return this.cfgCache;
    const row = await this.prisma.guardrailConfig.findUnique({
      where: { id: 'singleton' },
    });
    const d = this.envDefaults;
    this.cfgCache = {
      nmin: row?.nmin ?? d.nmin,
      throttleMult: row?.throttleMult ?? d.throttleMult,
      quarantineMult: row?.quarantineMult ?? d.quarantineMult,
      targetReplyRate: row?.targetReplyRate ?? d.targetReplyRate,
      cooldownHours: row?.cooldownHours ?? d.cooldownHours,
    };
    return this.cfgCache;
  }

  async getConfig(): Promise<GuardrailTunables & { enforce: boolean }> {
    return { ...(await this.cfg()), enforce: this.enforce };
  }

  async updateConfig(
    patch: Partial<GuardrailTunables>,
  ): Promise<GuardrailTunables & { enforce: boolean }> {
    await this.prisma.guardrailConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...patch },
      update: patch,
    });
    this.cfgCache = null; // invalida o cache → próxima leitura pega os novos limiares
    return this.getConfig();
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
  // WA-05: (a) só snapshots FRESCOS (≤24h); (b) amostra medida contra o Nmin EM VIGOR (não o
  // booleano gravado com outro Nmin); (c) mediana ZERO não é baseline — uma frota inteira sem
  // resposta cairia toda em "ativa" por `reply >= 0`; devolve null e vale o alvo configurado
  // (comportamento conservador quando a frota inteira perde desempenho).
  async fleetMedianReplyRate(): Promise<number | null> {
    const { nmin } = await this.cfg();
    const rows = await this.prisma.sessionMetric.findMany({
      where: {
        windowDays: 7,
        reliable: true,
        computedAt: { gte: new Date(Date.now() - FLEET_SNAPSHOT_MAX_AGE_MS) },
      },
      select: { replyRate: true, sample: true },
    });
    const usable = rows.filter((r) => (r.sample ?? nmin) >= nmin);
    if (usable.length < 2) return null;
    const v = usable.map((r) => r.replyRate).sort((a, b) => a - b);
    const mid = Math.floor(v.length / 2);
    const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
    return median > 0 ? median : null;
  }

  // Avalia o estado-alvo a partir do reply-rate vs mediana da frota. Só APLICA se enforce=true.
  async evaluate(ref: string): Promise<GuardrailEvaluation> {
    const rr = await this.replyRate.compute(ref, 7); // resolve ref + atualiza snapshot
    const sessionId = rr.sessionId;
    const gr = await this.getState(sessionId);
    const current = gr.state as GuardrailState;
    const c = await this.cfg();
    const fleetMedian = await this.fleetMedianReplyRate();
    const baseline = fleetMedian ?? c.targetReplyRate;

    const pct = (x: number) => `${Math.round(x * 100)}%`;
    let target: GuardrailState = current;
    let reason: string;
    const now = new Date();
    const cooldownActive =
      current === 'quarentena' &&
      gr.cooldownAte !== null &&
      gr.cooldownAte.getTime() > now.getTime();
    const manualQuarantine =
      current === 'quarentena' &&
      (gr.reason ?? '').startsWith(MANUAL_REASON_PREFIX);

    if (STICKY.has(current)) {
      reason = `estado fixo (${current}) — avaliação automática não sobrescreve`;
    } else if (manualQuarantine) {
      // WA-04: quarentena decidida pelo dono só sai por ação explícita (activate/warmup).
      reason = `quarentena manual — só sai por override explícito`;
    } else if (cooldownActive) {
      // WA-04: o cooldown participa da decisão — amostra/taxa novas não liberam antes do prazo.
      reason = `cooldown até ${gr.cooldownAte!.toISOString()} — quarentena mantida`;
    } else if (rr.sample < c.nmin) {
      target = 'aquecimento';
      reason = `amostra ${rr.sample} < Nmin ${c.nmin} — sem veredito (aquecimento)`;
    } else if (rr.replyRate < baseline * c.quarantineMult) {
      target = 'quarentena';
      reason = `reply ${pct(rr.replyRate)} < ${pct(baseline * c.quarantineMult)} (mediana×${c.quarantineMult})`;
    } else if (rr.replyRate < baseline * c.throttleMult) {
      target = 'throttled';
      reason = `reply ${pct(rr.replyRate)} < ${pct(baseline * c.throttleMult)} (mediana×${c.throttleMult})`;
    } else if (rr.replyRate >= baseline) {
      target = 'ativa';
      reason = `reply ${pct(rr.replyRate)} >= mediana ${pct(baseline)}`;
    } else {
      // zona de histerese (entre throttle e mediana): mantém o estado atual p/ não oscilar
      reason = `reply ${pct(rr.replyRate)} na faixa de histerese — mantém ${current}`;
    }

    if (fleetMedian === null) {
      reason +=
        ' [baseline = alvo configurado: mediana da frota indisponível/zero]';
    }

    let applied = false;
    if (this.enforce && target !== current && !STICKY.has(current)) {
      await this.apply(sessionId, target, reason, now, {
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
  // WA-07: compare-and-swap — a escrita só vale se a linha ainda tem o eventTs que foi lido
  // (duas transições concorrentes não se sobrescrevem fora de ordem); perdeu a corrida → relê e
  // decide de novo (até 3 vezes), nunca grava por cima de um evento mais novo.
  async apply(
    sessionId: string,
    state: GuardrailState,
    reason: string,
    eventTs: Date = new Date(),
    ctx?: { replyRate?: number; sample?: number },
    attempt = 0,
  ): Promise<GuardrailRow> {
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
    const cooldownHours = (await this.cfg()).cooldownHours;
    const cooldownAte =
      state === 'quarentena'
        ? new Date(eventTs.getTime() + cooldownHours * 3_600_000)
        : state === 'ativa'
          ? null
          : (existing?.cooldownAte ?? null);
    const data = { state, reason, eventTs, quarentenaDesde, cooldownAte };

    let saved: GuardrailRow;
    if (!existing) {
      try {
        saved = await this.prisma.sessionGuardrail.create({
          data: { id: newId(), sessionId, ...data },
        });
      } catch (e) {
        if ((e as { code?: string })?.code !== 'P2002' || attempt >= 3) throw e;
        return this.apply(sessionId, state, reason, eventTs, ctx, attempt + 1);
      }
    } else {
      const won = await this.prisma.sessionGuardrail.updateMany({
        where: { sessionId, eventTs: existing.eventTs },
        data,
      });
      if (won.count !== 1) {
        if (attempt >= 3) {
          this.logger.warn(
            `guard-rail ${sessionId}: transição para ${state} perdeu a corrida 3× — mantida a última gravada`,
          );
          return (await this.prisma.sessionGuardrail.findUnique({
            where: { sessionId },
          }))!;
        }
        return this.apply(sessionId, state, reason, eventTs, ctx, attempt + 1);
      }
      saved = { ...existing, ...data };
    }

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
        }).catch((e: unknown) => this.emitFailed(event, sessionId, e));
      }
    }
    return saved;
  }

  // WA-07: falha ao publicar um evento de proteção NÃO pode ser silenciosa — o n8n espera o
  // alerta/re-enfileiramento. Log + contador em /metrics (gateway_process_errors_total).
  private emitFailed(event: string, sessionId: string, e: unknown): void {
    recordProcessError('guardrail_emit');
    this.logger.warn(
      `falha ao publicar ${event} da sessão ${sessionId}: ${(e as Error)?.message ?? e}`,
    );
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
      }).catch((e: unknown) => this.emitFailed('send.blocked', sessionId, e));
      return { allowed: false, state, reason: gr.reason };
    }
    return { allowed: true, state };
  }

  // Sinal duro (463, close não-recuperável, restrição). Emite o evento sempre; aplica quarentena/
  // banida só com enforce (em observação só registra o último sinal).
  //
  // WA-03 (auditoria 09/2026) — taxonomia: só `ban`/`restriction` (confirmação explícita de
  // restrição da conta) viram `banida`; `463` (número cru) vira quarentena; `401`/`loggedOut` é
  // CREDENCIAL/aparelho desvinculado (o enum do Baileys distingue loggedOut=401 de forbidden=403)
  // e NÃO é prova de ban — só fica registrado como último sinal, sem transição.
  async recordHardSignal(sessionId: string, signal: string): Promise<void> {
    // G6: 463 = número cru (C6); restrição da conta. C5: NÃO há block/report.
    const sigEvent: GuardrailEventName | null =
      signal === '463'
        ? 'signal.463'
        : signal === 'restriction' || signal === 'ban'
          ? 'signal.restriction'
          : null;
    if (sigEvent) {
      void this.emit(sessionId, sigEvent, { signal }).catch((e: unknown) =>
        this.emitFailed(sigEvent, sessionId, e),
      );
    }
    const target: GuardrailState | null =
      signal === 'ban' || signal === 'restriction'
        ? 'banida'
        : signal === '463'
          ? 'quarentena'
          : null; // 401/loggedOut/outros: sem transição automática
    if (this.enforce && target) {
      await this.apply(sessionId, target, `sinal duro: ${signal}`);
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

  // G7 — objeto de saúde por sessão: estado guard-rail + reply-rate (G4) + sinais. cap_* = G8.
  async health(ref: string): Promise<SessionHealth> {
    const rr = await this.replyRate.compute(ref, 7);
    const gr = await this.getState(rr.sessionId);
    return {
      sessionId: rr.sessionId,
      state: gr.state as GuardrailState,
      reply_rate: rr.replyRate,
      amostra: rr.sample,
      reliable: rr.reliable,
      delivery_rate: rr.deliveryRate,
      read_rate: rr.readRate,
      score: rr.scoreSaude,
      cap_base: null,
      cap_atual: null,
      quarentena_desde: gr.quarentenaDesde?.toISOString() ?? null,
      cooldown_ate: gr.cooldownAte?.toISOString() ?? null,
      ultimos_sinais: gr.ultimoSinal ? [gr.ultimoSinal] : [],
      enforce: this.enforce,
    };
  }

  // G7 — estados guard-rail de várias sessões (p/ o filtro ?state= da listagem). Sem registro = ativa.
  async statesFor(sessionIds: string[]): Promise<Map<string, GuardrailState>> {
    const rows = await this.prisma.sessionGuardrail.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { sessionId: true, state: true },
    });
    const map = new Map<string, GuardrailState>();
    for (const r of rows) map.set(r.sessionId, r.state as GuardrailState);
    return map;
  }
}
