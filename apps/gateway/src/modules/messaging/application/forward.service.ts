import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { GuardrailService } from '../../guardrail/guardrail.service';
import {
  ForwardSourceError,
  FREQUENTLY_FORWARDED_MIN,
  type ForwardSource,
  type PreparedForward,
  type SendResult,
} from '../../sessions/application/engine.port';
import { SessionManager } from '../../sessions/application/session-manager.service';
import {
  MESSAGE_REPOSITORY,
  type MessageRepository,
  type StoredMessage,
} from '../domain/message.repository';
import {
  batchFingerprint,
  batchStatus,
  canonicalDestination,
  derivedKey,
  destinationFingerprint,
  exceedsFrequentLimit,
  findDuplicate,
  FORWARDABLE_TYPES,
  forwardGapMs,
  unsupportedTypeLabel,
  type ForwardDestination,
} from './forward.decision';
import { SendIntentService } from './send-intent.service';

export interface ForwardInput {
  to: string[];
  cold?: boolean;
  idempotencyKey?: string;
}

// Um item de `results[]` — mesma posição de `to[]` (contrato em packages/contracts ForwardResultDto).
export interface ForwardResult {
  target: string;
  to: string | null;
  ok: boolean;
  id: string | null;
  deduped: boolean;
  cold: boolean;
  idempotencyKey: string | null;
  isForwarded?: boolean;
  forwardingScore?: number | null;
  confirmed?: boolean;
  status?: number;
  code?: string;
  error?: string;
}

// Destino ainda por enviar (reservado ou sem idempotencyKey).
interface Pending {
  index: number;
  dest: ForwardDestination;
  transport: string;
  cold: boolean;
  key: string | null;
  intentId: string | null;
}

// Teto de um envio (a engine tem os seus; este só impede um destino de prender o lote para sempre).
const SEND_TIMEOUT_MS = 60_000;

// P-068 (etapa E24) — encaminhar uma mensagem para até 5 destinos da MESMA sessão, fiel ao
// WhatsApp Web. Ordem (tudo o que recusa vem ANTES de qualquer envio):
//   F0 sem efeito — destinos canônicos/repetidos/proibidos (400), original da sessão (404),
//      apagada/editada/tipo (400 FORWARD_UNSUPPORTED), "encaminhada com frequência" com > 1
//      destino (400 FORWARD_LIMIT);
//   F1 reserva do LOTE (a mesma idempotencyKey com outra original/outro conjunto → 409, nada sai)
//      e de cada destino (`<chave>:<destino>` — replay/409 por item, como o envio unitário);
//   F2 engine carrega e confere a original (400 com o code) · gate cold UMA vez: destino sem
//      conversa = cold à força; bloqueado → 423 no lote inteiro, nada sai;
//   F3 um destino por vez, 1–3 s entre envios efetivos (também entre pedidos da mesma sessão).
@Injectable()
export class ForwardService {
  private readonly logger = new Logger(ForwardService.name);
  // Um encaminhar por sessão por vez (neste processo): dois pedidos simultâneos se intercalariam
  // sem intervalo. O intervalo também vale entre pedidos (último envio efetivo por sessão).
  private readonly locks = new Map<string, Promise<void>>();
  private readonly lastSentAt = new Map<string, number>();

  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repo: MessageRepository,
    private readonly intents: SendIntentService,
    private readonly guardrail: GuardrailService,
    private readonly manager: SessionManager,
  ) {}

  async forward(
    sessionId: string,
    ref: string,
    input: ForwardInput,
  ): Promise<{ results: ForwardResult[] }> {
    // ---- F0: validação sem efeito ----
    const dests: ForwardDestination[] = [];
    for (const raw of input.to) {
      const d = canonicalDestination(raw);
      if ('error' in d) {
        throw new BadRequestException(`Destino inválido "${raw}": ${d.error}`);
      }
      dests.push(d);
    }
    const dup = findDuplicate(dests);
    if (dup) {
      throw new BadRequestException(
        `Destinos repetidos no mesmo encaminhamento: "${dup[0]}" e "${dup[1]}"`,
      );
    }
    // findByRef: aceita o id interno (GET /messages) ou o keyId (webhook), SÓ desta sessão —
    // mensagem de outra sessão responde 404 (regra "só a mesma sessão").
    const orig = await this.repo.findByRef(sessionId, ref);
    if (!orig) throw new NotFoundException('Mensagem não encontrada');
    // Apagada/editada é recusada DEPOIS do replay (run): a repetição de um lote já entregue continua
    // 201 `deduped` mesmo que o contato edite/apague a original depois (senão o cliente registraria
    // falha e o operador reencaminharia à mão — duplicado). Pedido novo: 400 sem enviar nada.
    if (!FORWARDABLE_TYPES.has(orig.type)) {
      this.unsupported(unsupportedTypeLabel(orig.type));
    }
    if (
      exceedsFrequentLimit(
        orig.forwardingScore,
        dests.length,
        FREQUENTLY_FORWARDED_MIN,
      )
    ) {
      throw this.limitError();
    }
    return this.withSessionLock(sessionId, () =>
      this.run(sessionId, orig, dests, input),
    );
  }

  // Erro INESPERADO (banco fora, exceção do guard-rail…) depois de reservar: as intenções não podem
  // ficar `pending` — o retry levaria 409 "em andamento" por 2 min. Viram `failed` (o retry assume).
  private async run(
    sessionId: string,
    orig: StoredMessage,
    dests: ForwardDestination[],
    input: ForwardInput,
  ): Promise<{ results: ForwardResult[] }> {
    const reserved: string[] = [];
    try {
      return await this.runReserved(sessionId, orig, dests, input, reserved);
    } catch (e) {
      if (!(e instanceof HttpException)) {
        for (const id of reserved) {
          await this.intents.fail(
            id,
            `erro inesperado: ${(e as Error).message}`,
          );
        }
      }
      throw e;
    }
  }

  private async runReserved(
    sessionId: string,
    orig: StoredMessage,
    dests: ForwardDestination[],
    input: ForwardInput,
    reserved: string[],
  ): Promise<{ results: ForwardResult[] }> {
    const base = input.idempotencyKey;
    // ---- F1: reserva do lote ----
    let batchId: string | null = null;
    if (base) {
      // ConflictException (409) sobe direto: nada foi enviado.
      const r = await this.intents.reserve(
        sessionId,
        base,
        batchFingerprint(orig.keyId, dests),
      );
      // replay do lote = o mesmo pedido já rodou: segue o laço (cada destino faz replay ou é
      // retomado se tinha falhado — takeover da intenção dele).
      if (r.kind === 'reserved') {
        batchId = r.intentId;
        reserved.push(r.intentId);
      }
    }

    const results: ForwardResult[] = [];
    const pending: Pending[] = [];
    for (const [index, dest] of dests.entries()) {
      const key = base ? derivedKey(base, dest) : null;
      // Destino sem conversa (nenhuma mensagem RECEBIDA desse chat na sessão, no número EXATO) = 1º
      // contato: cold à força — o cliente só pode SUBIR o cold (decisão do dono na E24).
      const conv = await this.repo.findInboundChat(sessionId, dest.exact);
      const cold = input.cold === true || conv === null;
      const transport = dest.transport;
      const item: ForwardResult = {
        target: dest.input,
        to: null,
        ok: false,
        id: null,
        deduped: false,
        cold,
        idempotencyKey: key,
      };
      results.push(item);
      if (!key) {
        pending.push({ index, dest, transport, cold, key, intentId: null });
        continue;
      }
      // Dedup legado (chaves anteriores às intenções) e reserva — mesma ordem do sendWithIntent.
      const legacy = await this.repo.findByIdempotencyKey(sessionId, key);
      if (legacy) {
        Object.assign(item, {
          ok: true,
          deduped: true,
          id: legacy.keyId || null,
          to: legacy.chatJid,
        });
        continue;
      }
      try {
        const r = await this.intents.reserve(
          sessionId,
          key,
          destinationFingerprint(orig.keyId, dest),
        );
        if (r.kind === 'replay') {
          Object.assign(item, {
            ok: true,
            deduped: true,
            id: r.keyId || null,
            to: r.chatJid || null,
          });
          continue;
        }
        reserved.push(r.intentId);
        pending.push({
          index,
          dest,
          transport,
          cold,
          key,
          intentId: r.intentId,
        });
      } catch (e) {
        if (!(e instanceof ConflictException)) throw e;
        Object.assign(item, { status: 409, error: (e as Error).message });
      }
    }

    if (pending.length && (orig.revokedAt || orig.editedAt)) {
      const why = orig.revokedAt ? 'apagada' : 'editada';
      await this.failAll(
        pending,
        results,
        `Esta mensagem não pode ser encaminhada pelo gateway (${why}).`,
        400,
        'FORWARD_UNSUPPORTED',
      );
      pending.length = 0;
    }

    if (pending.length) {
      // ---- F2: original na engine + gate cold (uma vez) ----
      let prepared: PreparedForward | null = null;
      try {
        prepared = await this.manager.prepareForward(sessionId, toSource(orig));
      } catch (e) {
        const code = e instanceof ForwardSourceError ? e.code : undefined;
        await this.failAll(pending, results, (e as Error).message, 400, code);
      }
      if (prepared) {
        const live = Math.max(
          orig.forwardingScore ?? 0,
          prepared.forwardingScore ?? 0,
        );
        if (
          exceedsFrequentLimit(live, dests.length, FREQUENTLY_FORWARDED_MIN)
        ) {
          const err = this.limitError();
          await this.failAll(
            pending,
            results,
            err.message,
            400,
            'FORWARD_LIMIT',
          );
          prepared = null;
        }
      }
      if (prepared && pending.some((p) => p.cold)) {
        const gate = await this.guardrail.canSendCold(sessionId);
        if (!gate.allowed) {
          const message =
            gate.reason ??
            `Sessão em "${gate.state}": envio cold bloqueado pelo guard-rail.`;
          await this.failAll(
            pending,
            results,
            'bloqueado pelo guard-rail',
            423,
            'SESSION_QUARANTINED',
          );
          await this.finishBatch(batchId, results);
          // 423 no lote INTEIRO (mesmo com destinos com conversa e mesmo com replays de um pedido
          // anterior no mesmo lote): o n8n re-enfileira no 423 — mandar parte e responder 423
          // duplicaria os já enviados num retry sem chave; com chave, a repetição faz replay.
          throw new HttpException(
            {
              code: 'SESSION_QUARANTINED',
              state: gate.state,
              message,
              results,
            },
            HttpStatus.LOCKED,
          );
        }
      }
      // ---- F3: um destino por vez ----
      if (prepared) {
        for (const p of pending)
          await this.sendOne(sessionId, prepared, p, results);
      }
    }

    await this.finishBatch(batchId, results);
    const status = batchStatus(results);
    if (status === 201) return { results };
    const failed = results.filter((r) => !r.ok);
    const codes = new Set(failed.map((r) => r.code).filter(Boolean));
    throw new HttpException(
      {
        statusCode: status,
        code:
          codes.size === 1
            ? [...codes][0]
            : status === 400
              ? 'FORWARD_FAILED'
              : undefined,
        message:
          new Set(failed.map((r) => r.error)).size === 1
            ? failed[0]?.error
            : 'Nenhum destino recebeu o encaminhamento — veja results[]',
        results,
      },
      status,
    );
  }

  private async sendOne(
    sessionId: string,
    prepared: PreparedForward,
    p: Pending,
    results: ForwardResult[],
  ): Promise<void> {
    const item = results[p.index];
    await this.pace(sessionId);
    let res: SendResult;
    try {
      res = await withTimeout(
        prepared.send(p.transport, {
          cold: p.cold,
          idempotencyKey: p.key,
        }),
        SEND_TIMEOUT_MS,
        'o envio não respondeu a tempo — confira no celular antes de tentar de novo',
      );
    } catch (e) {
      const msg = (e as Error).message;
      if (p.intentId) await this.intents.fail(p.intentId, msg);
      Object.assign(item, { status: 400, error: msg });
      this.logger.warn(
        `encaminhar (${sessionId} → ${p.dest.key}) falhou: ${msg}`,
      );
      return;
    }
    // Só envio EFETIVO conta para o intervalo (destino que falhou rápido não espera à toa).
    this.lastSentAt.set(sessionId, Date.now());
    if (p.intentId) await this.intents.complete(p.intentId, res.keyId, res.jid);
    Object.assign(item, {
      ok: true,
      to: res.jid,
      id: res.keyId || null,
      isForwarded: res.isForwarded,
      forwardingScore: res.forwardingScore,
      ...(res.confirmed === false ? { confirmed: false } : {}),
    });
  }

  // Intervalo anti-ban de 1–3 s desde o último envio efetivo DESTA sessão (inclusive de outro
  // pedido). Sem envio anterior, não espera. Métodos (não inline) para o e2e zerar a espera.
  protected async pace(sessionId: string): Promise<void> {
    const last = this.lastSentAt.get(sessionId);
    if (last == null) return;
    const wait = last + this.gapMs() - Date.now();
    if (wait > 0) await this.sleep(wait);
  }

  protected gapMs(): number {
    return forwardGapMs();
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async failAll(
    pending: Pending[],
    results: ForwardResult[],
    error: string,
    status: number,
    code?: string,
  ): Promise<void> {
    for (const p of pending) {
      if (p.intentId) await this.intents.fail(p.intentId, error);
      Object.assign(results[p.index], {
        status,
        error,
        ...(code ? { code } : {}),
      });
    }
  }

  // Intenção do LOTE: tudo ok → sent (replay do lote = rodar o laço de novo, só replays); senão
  // failed (a repetição assume e retoma só quem falhou — os enviados voltam como replay).
  private async finishBatch(
    batchId: string | null,
    results: ForwardResult[],
  ): Promise<void> {
    if (!batchId) return;
    if (results.every((r) => r.ok)) {
      await this.intents.complete(batchId, '', '');
    } else {
      await this.intents.fail(
        batchId,
        `encaminhamento parcial: ${results.filter((r) => r.ok).length}/${results.length}`,
      );
    }
  }

  private withSessionLock<T>(
    sessionId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const prev = this.locks.get(sessionId) ?? Promise.resolve();
    const run = prev.then(fn, fn);
    const tail = run.then(
      () => undefined,
      () => undefined,
    );
    this.locks.set(sessionId, tail);
    void tail.then(() => {
      if (this.locks.get(sessionId) === tail) this.locks.delete(sessionId);
    });
    return run;
  }

  private unsupported(reason: string): never {
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      code: 'FORWARD_UNSUPPORTED',
      message: `Esta mensagem não pode ser encaminhada pelo gateway (${reason}).`,
    });
  }

  private limitError(): BadRequestException {
    return new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      code: 'FORWARD_LIMIT',
      message: `Mensagem "encaminhada com frequência" (${FREQUENTLY_FORWARDED_MIN}+ vezes): o WhatsApp só deixa encaminhar para 1 conversa por vez.`,
    });
  }
}

function toSource(m: StoredMessage): ForwardSource {
  return {
    keyId: m.keyId,
    chatJid: m.chatJid,
    fromMe: m.fromMe,
    type: m.type,
    text: m.text,
    mediaType: m.mediaType,
    mimetype: m.mimetype,
    fileName: m.fileName,
    fileSize: m.fileSize,
    mediaKey: m.mediaKey,
    forwardingScore: m.forwardingScore,
    timestamp: Math.floor(m.timestamp.getTime() / 1000),
  };
}

async function withTimeout<T>(
  op: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      op,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } catch (e) {
    op.catch(() => undefined);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
