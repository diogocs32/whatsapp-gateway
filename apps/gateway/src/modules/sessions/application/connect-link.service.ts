import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type {
  ConnectLinkDto,
  PublicConnectNewQrResponse,
  PublicConnectNewQrState,
  PublicConnectResponse,
} from '@whatsapp-gateway/contracts';
import type { DomainEvent } from '../../../shared-kernel/domain-event';
import { sha512 } from '../../../shared-kernel/crypto';
import { EventBus } from '../../../shared-kernel/event-bus/event-bus';
import { newId } from '../../../shared-kernel/ulid';
import {
  CONNECT_LINK_ERROR,
  CONNECT_LINK_NEW_QR_COOLDOWN_MS,
  CONNECT_LINK_NEW_QR_MAX,
  CONNECT_LINK_RECENT_NEW_QR_MS,
  CONNECT_LINK_SEEN_THROTTLE_MS,
  CONNECT_LINK_TOKEN_RE,
  type ConnectLinkErrorCodeValue,
  type ConnectLinkRecord,
  type ConnectLinkRevokedReason,
  linkState,
  newQrAllowance,
  phoneHint,
  phoneMatches,
  publicPhase,
} from '../domain/connect-link';
import {
  CONNECT_LINK_REPOSITORY,
  type ConnectLinkRepository,
} from '../domain/connect-link.repository';
import {
  SESSION_REPOSITORY,
  type ConnectSnapshot,
  type SessionRepository,
} from '../domain/session.repository';
import type { SessionStatePayload, WaEventEnvelope } from './engine.port';
import { SessionBusyError, SessionManager } from './session-manager.service';

// Motivo gravado em lastError (e no webhook session.status STOPPED) quando o QR do link é lido por
// um WhatsApp diferente do número esperado.
export const WRONG_NUMBER_REASON =
  'Conectado com número diferente do esperado pelo link de conexão — a conexão foi desfeita. Gere um novo link.';

const ERROR_LABEL: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  410: 'Gone',
  429: 'Too Many Requests',
  503: 'Service Unavailable',
};

// Corpo no padrão da casa (`{statusCode, error, code, message}` — ver FORWARD_*). Mensagens FIXAS:
// nunca ecoar token nem dado da sessão (WA-18).
export function connectLinkError(
  status: number,
  code: ConnectLinkErrorCodeValue,
  message: string,
  extra: Record<string, unknown> = {},
  cause?: unknown,
): HttpException {
  return new HttpException(
    { statusCode: status, error: ERROR_LABEL[status], code, message, ...extra },
    status,
    cause === undefined ? undefined : { cause },
  );
}

const NOT_FOUND = () =>
  connectLinkError(
    HttpStatus.NOT_FOUND,
    CONNECT_LINK_ERROR.NOT_FOUND,
    'Link de conexão inválido ou incompleto.',
  );

export function toConnectLinkDto(
  link: ConnectLinkRecord,
  now: Date,
): ConnectLinkDto {
  return {
    id: link.id,
    sessionId: link.sessionId,
    state: linkState(link, now),
    createdAt: link.createdAt.toISOString(),
    expiresAt: link.expiresAt.toISOString(),
    createdBy: link.createdBy,
    expectedPhone: link.expectedPhone,
    lastSeenAt: link.lastSeenAt?.toISOString() ?? null,
    newQrCount: link.newQrCount,
    newQrMax: CONNECT_LINK_NEW_QR_MAX,
    consumedAt: link.consumedAt?.toISOString() ?? null,
    revokedAt: link.revokedAt?.toISOString() ?? null,
    revokedReason:
      (link.revokedReason as ConnectLinkRevokedReason | null) ?? null,
  };
}

// E27 · P-086 · D-037 — link público temporário para outra pessoa conectar a sessão por QR.
@Injectable()
export class ConnectLinkService implements OnModuleInit {
  private readonly logger = new Logger(ConnectLinkService.name);

  constructor(
    @Inject(CONNECT_LINK_REPOSITORY)
    private readonly links: ConnectLinkRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    private readonly manager: SessionManager,
    private readonly eventBus: EventBus,
  ) {}

  // Relógio injetável nos specs.
  protected now(): Date {
    return new Date();
  }

  onModuleInit(): void {
    // Só 'wa.event' (emitido pela réplica dona da engine), nunca o 'wa.event.remote' do fan-out.
    this.eventBus.subscribe('wa.event', (e: DomainEvent) => {
      const env = e.payload as WaEventEnvelope;
      if (env.event !== 'session.status') return;
      const p = env.payload as SessionStatePayload;
      if (p.status !== 'WORKING') return;
      // void: nunca segurar a fila de status da sessão (o logout da rejeição usa o lock de ciclo
      // de vida e aguarda as escritas de status pendentes).
      void this.onSessionWorking(env.sessionId, p.meJid ?? null).catch(
        (err: Error) =>
          this.logger.error(
            `link de conexão: falha ao tratar WORKING (${env.sessionId}): ${err.message}`,
            err.stack,
          ),
      );
    });
  }

  async create(
    sessionId: string,
    input: { ttlMinutes: number; expectedPhone: string | null },
    actor: string,
  ): Promise<{ link: ConnectLinkRecord; token: string }> {
    const snap = await this.sessions.findConnectSnapshot(sessionId);
    if (!snap) {
      throw connectLinkError(
        HttpStatus.NOT_FOUND,
        CONNECT_LINK_ERROR.NOT_FOUND,
        'Sessão não encontrada',
      );
    }
    this.assertCanCreate(snap);
    const now = this.now();
    const token = randomBytes(32).toString('base64url');
    const link = await this.links.createReplacing({
      id: newId(),
      sessionId,
      tokenHash: sha512(token),
      createdBy: actor,
      expectedPhone: input.expectedPhone,
      expiresAt: new Date(now.getTime() + input.ttlMinutes * 60_000),
      now,
    });
    // A sessão pode ter conectado (ex.: pelo modal) entre a checagem e o insert: o link já nasce
    // consumido em vez de ficar ativo com a sessão conectada.
    const again = await this.sessions.findConnectSnapshot(sessionId);
    if (again && this.isWorking(again)) {
      await this.links.consume(link.id, this.now());
      return {
        link: (await this.links.findByHash(link.tokenHash)) ?? link,
        token,
      };
    }
    return { link, token };
  }

  private assertCanCreate(snap: ConnectSnapshot): void {
    if (snap.engine !== 'BAILEYS') {
      throw connectLinkError(
        HttpStatus.CONFLICT,
        CONNECT_LINK_ERROR.ENGINE_UNSUPPORTED,
        'O link de conexão está disponível só para sessões Baileys nesta versão.',
      );
    }
    if (this.isWorking(snap)) {
      throw connectLinkError(
        HttpStatus.CONFLICT,
        CONNECT_LINK_ERROR.SESSION_WORKING,
        'A sessão já está conectada. Se ela caiu e o painel ainda mostra conectada, use Reiniciar antes de gerar o link.',
      );
    }
    if (snap.paired) {
      throw connectLinkError(
        HttpStatus.CONFLICT,
        CONNECT_LINK_ERROR.SESSION_PAIRED,
        'Esta sessão ainda tem login salvo (caiu por instabilidade). Tente Reiniciar; para conectar de novo do zero, gere um novo QR antes de criar o link.',
      );
    }
  }

  private isWorking(snap: ConnectSnapshot): boolean {
    return (
      snap.status === 'WORKING' ||
      this.manager.liveView(snap.id)?.status === 'WORKING'
    );
  }

  latest(sessionId: string): Promise<ConnectLinkRecord | null> {
    return this.links.findLatestBySession(sessionId);
  }

  revoke(
    sessionId: string,
    reason: ConnectLinkRevokedReason = 'MANUAL',
  ): Promise<number> {
    return this.links.revokeActive(sessionId, this.now(), reason);
  }

  // Stop/logout pelo operador (rotas existentes): o link ativo morre junto — senão a pessoa
  // religaria a sessão que ele parou de propósito. Falha só loga (nunca quebra a rota).
  async revokeOnOperatorStop(sessionId: string): Promise<void> {
    try {
      await this.links.revokeActive(sessionId, this.now(), 'SESSION_STOPPED');
    } catch (e) {
      const err = e as Error;
      this.logger.error(
        `link de conexão: não revoguei ao parar a sessão ${sessionId}: ${err.message}`,
        err.stack,
      );
    }
  }

  // Resolve o token do header (guard da rota pública). ACTIVE e CONNECTED passam; o resto vira
  // 404/410 com mensagem fixa.
  async resolveToken(raw: string | null): Promise<ConnectLinkRecord> {
    if (!raw || !CONNECT_LINK_TOKEN_RE.test(raw)) throw NOT_FOUND();
    const link = await this.links.findByHash(sha512(raw));
    if (!link) throw NOT_FOUND();
    this.assertUsable(link, this.now());
    return link;
  }

  private assertUsable(link: ConnectLinkRecord, now: Date): void {
    const state = linkState(link, now);
    if (state === 'USED') {
      throw connectLinkError(
        HttpStatus.GONE,
        CONNECT_LINK_ERROR.USED,
        'Este link já foi usado para conectar.',
      );
    }
    if (state === 'REVOKED') {
      throw link.revokedReason === 'WRONG_NUMBER'
        ? connectLinkError(
            HttpStatus.GONE,
            CONNECT_LINK_ERROR.WRONG_NUMBER,
            'O WhatsApp lido não é o número esperado para este link, e a conexão foi desfeita.',
          )
        : connectLinkError(
            HttpStatus.GONE,
            CONNECT_LINK_ERROR.REVOKED,
            'Este link foi cancelado ou substituído.',
          );
    }
    if (state === 'EXPIRED') {
      throw connectLinkError(
        HttpStatus.GONE,
        CONNECT_LINK_ERROR.EXPIRED,
        'Este link expirou.',
      );
    }
  }

  async publicState(link: ConnectLinkRecord): Promise<PublicConnectResponse> {
    const now = this.now();
    if (linkState(link, now) === 'CONNECTED') return connected(link);
    const snap = await this.sessions.findConnectSnapshot(link.sessionId);
    if (!snap) throw NOT_FOUND();
    if (snap.status === 'WORKING') {
      // Normalmente o assinante do evento já tratou; aqui cobre quem perdeu o evento. Mesma regra
      // de número esperado. Número errado com a engine em OUTRA réplica: não decide aqui (quem
      // revoga sem desfazer deixaria a conta errada conectada) — a página segue "preparando" até
      // a réplica dona tratar o evento.
      const outcome = await this.onSessionWorking(
        link.sessionId,
        snap.meJid,
        'read',
      );
      if (outcome !== 'pending') return this.afterWorking(link.tokenHash);
    } else if (
      // Fallback do "uso único": WORKING na timeline desde a criação do link (ex.: conectou no
      // container antigo durante um deploy, sem este assinante) e a sessão caiu de novo.
      await this.links.hasWorkingSince(link.sessionId, link.createdAt)
    ) {
      // Mesma regra de número: o último número conectado (lastMeJid) é o esperado?
      if (
        link.expectedPhone &&
        !phoneMatches(link.expectedPhone, snap.lastMeJid)
      ) {
        if (await this.links.revoke(link.id, now, 'WRONG_NUMBER')) {
          this.logger.warn(
            `link de conexão: sessão ${link.sessionId} conectou com número diferente do esperado (visto pela timeline) — desfazendo a conexão`,
          );
          void this.manager
            .rejectConnectedAccount(
              link.sessionId,
              WRONG_NUMBER_REASON,
              `${link.expectedPhone}@s.whatsapp.net`,
              { withoutEngine: 'clear' },
            )
            .catch((e: Error) =>
              this.logger.error(
                `link de conexão: falha ao desfazer conexão com número errado (${link.sessionId}): ${e.message}`,
                e.stack,
              ),
            );
        }
        return this.afterWorking(link.tokenHash);
      }
      await this.links.consume(link.id, now);
      return this.afterWorking(link.tokenHash);
    }
    if (
      !link.lastSeenAt ||
      now.getTime() - link.lastSeenAt.getTime() >= CONNECT_LINK_SEEN_THROTTLE_MS
    ) {
      await this.links.touchSeen(link.id, now);
    }
    const live = this.manager.liveView(link.sessionId);
    const phase = publicPhase({
      engine: snap.engine,
      dbStatus: snap.status,
      live: live?.status ?? null,
      liveQr: live?.qr ?? null,
      paired: snap.paired,
      busy: this.manager.isBusy(link.sessionId),
      rehydrated: this.manager.isRehydrated(),
      recentNewQr:
        link.lastNewQrAt !== null &&
        now.getTime() - link.lastNewQrAt.getTime() <
          CONNECT_LINK_RECENT_NEW_QR_MS,
    });
    return {
      state: 'ACTIVE',
      phase,
      qr: phase === 'QR' ? (live?.qr ?? null) : null,
      expiresAt: link.expiresAt.toISOString(),
      expectedPhoneHint: phoneHint(link.expectedPhone),
      newQr: this.newQrState(link, now, phase === 'IDLE'),
    };
  }

  private newQrState(
    link: ConnectLinkRecord,
    now: Date,
    phaseAllows: boolean,
  ): PublicConnectNewQrState {
    const a = newQrAllowance(link, now);
    return {
      available: phaseAllows && a.remaining > 0,
      remaining: a.remaining,
      max: CONNECT_LINK_NEW_QR_MAX,
      retryAfterSeconds: a.retryAfterSeconds,
    };
  }

  // Depois de tratar um WORKING: consumido → "conectado"; revogado por número errado → 410.
  private async afterWorking(
    tokenHash: string,
  ): Promise<PublicConnectResponse> {
    const fresh = await this.links.findByHash(tokenHash);
    if (!fresh) throw NOT_FOUND();
    const now = this.now();
    // USED/REVOKED (número errado ou revogado no meio)/EXPIRED: mesma resposta do guard.
    this.assertUsable(fresh, now);
    if (linkState(fresh, now) === 'CONNECTED') return connected(fresh);
    // Ainda ACTIVE depois do WORKING: só se o consumo perdeu uma corrida — trata como conectado.
    return connected(fresh);
  }

  async requestNewQr(
    link: ConnectLinkRecord,
  ): Promise<PublicConnectNewQrResponse> {
    if (linkState(link, this.now()) !== 'ACTIVE') {
      throw connectLinkError(
        HttpStatus.GONE,
        CONNECT_LINK_ERROR.USED,
        'Este link já foi usado para conectar.',
      );
    }
    try {
      await this.manager.newQrForConnectLink(link.sessionId, () =>
        this.checkAndReserve(link),
      );
    } catch (e) {
      if (e instanceof HttpException) throw e;
      if (e instanceof SessionBusyError) throw this.busy();
      const err = e as Error;
      if (err?.message === 'Sessão não encontrada') throw NOT_FOUND();
      this.logger.error(
        `link de conexão: falha ao gerar QR (${link.sessionId}): ${err?.message}`,
        err?.stack,
      );
      throw connectLinkError(
        HttpStatus.SERVICE_UNAVAILABLE,
        CONNECT_LINK_ERROR.NEW_QR_FAILED,
        'Não foi possível preparar o QR agora.',
        {},
        err,
      );
    }
    const fresh = (await this.links.findByHash(link.tokenHash)) ?? link;
    return { ok: true, newQr: this.newQrState(fresh, this.now(), false) };
  }

  // Roda DENTRO do lock da sessão (SessionManager.newQrForConnectLink). Recusa sem gastar cota;
  // a cota só é reservada quando o QR vai mesmo ser gerado.
  private async checkAndReserve(link: ConnectLinkRecord): Promise<void> {
    const snap = await this.sessions.findConnectSnapshot(link.sessionId);
    if (!snap) throw NOT_FOUND();
    const live = this.manager.liveView(link.sessionId);
    const now = this.now();
    const phase = publicPhase({
      engine: snap.engine,
      dbStatus: snap.status,
      live: live?.status ?? null,
      liveQr: live?.qr ?? null,
      paired: snap.paired,
      busy: false, // o lock é nosso agora
      rehydrated: this.manager.isRehydrated(),
      recentNewQr: false, // o intervalo entre pedidos é o CAS abaixo
    });
    if (snap.status === 'WORKING' || phase !== 'IDLE') {
      throw connectLinkError(
        HttpStatus.CONFLICT,
        CONNECT_LINK_ERROR.NEW_QR_UNAVAILABLE,
        'Agora não é possível gerar um QR por este link.',
      );
    }
    const reserved = await this.links.reserveNewQr(
      link.id,
      now,
      CONNECT_LINK_NEW_QR_MAX,
      CONNECT_LINK_NEW_QR_COOLDOWN_MS,
    );
    if (reserved) return;
    const fresh = await this.links.findByHash(link.tokenHash);
    if (!fresh) throw NOT_FOUND();
    // Mudou entre o guard e aqui (revogado, vencido, consumido): o mesmo 410 do guard.
    this.assertUsable(fresh, now);
    if (linkState(fresh, now) !== 'ACTIVE') {
      throw connectLinkError(
        HttpStatus.GONE,
        CONNECT_LINK_ERROR.USED,
        'Este link já foi usado para conectar.',
      );
    }
    const a = newQrAllowance(fresh, now);
    if (a.remaining <= 0) {
      throw connectLinkError(
        HttpStatus.CONFLICT,
        CONNECT_LINK_ERROR.NEW_QR_LIMIT,
        'As tentativas deste link acabaram. Peça um novo link.',
      );
    }
    if (a.retryAfterSeconds > 0) {
      throw connectLinkError(
        HttpStatus.TOO_MANY_REQUESTS,
        CONNECT_LINK_ERROR.NEW_QR_COOLDOWN,
        'Aguarde alguns segundos antes de pedir outro QR.',
        { retryAfterSeconds: a.retryAfterSeconds },
      );
    }
    throw this.busy();
  }

  private busy(): HttpException {
    return connectLinkError(
      HttpStatus.CONFLICT,
      CONNECT_LINK_ERROR.BUSY,
      'Já estamos preparando a conexão. Aguarde alguns segundos.',
    );
  }

  // A sessão ficou WORKING: com link ativo, o número bate (ou não havia número esperado) → consome;
  // não bate → revoga (WRONG_NUMBER) e desfaz a conexão na réplica dona da engine. Pela leitura
  // pública (`source: 'read'`) numa réplica SEM a engine, número errado fica 'pending' — revogar sem
  // poder desfazer faria a réplica dona achar o link já inativo e nunca desconectar a conta errada.
  async onSessionWorking(
    sessionId: string,
    meJid: string | null,
    source: 'event' | 'read' = 'event',
  ): Promise<'none' | 'consumed' | 'rejected' | 'pending'> {
    const now = this.now();
    const link = await this.links.findActiveBySession(sessionId, now);
    if (!link) return 'none';
    if (!link.expectedPhone || phoneMatches(link.expectedPhone, meJid)) {
      await this.links.consume(link.id, now);
      return 'consumed';
    }
    const hasEngine = this.manager.hasEngine(sessionId);
    if (!hasEngine && source === 'read') return 'pending';
    // Só quem revogar desfaz (evento e leitura podem chegar juntos).
    if (!(await this.links.revoke(link.id, now, 'WRONG_NUMBER'))) {
      return 'rejected';
    }
    if (!hasEngine) {
      this.logger.warn(
        `link de conexão: sessão ${sessionId} conectou com número diferente do esperado, mas a engine não está neste processo — a conexão NÃO foi desfeita aqui`,
      );
      return 'rejected';
    }
    this.logger.warn(
      `link de conexão: sessão ${sessionId} conectou com número diferente do esperado — desfazendo a conexão`,
    );
    // Sem await: o logout espera o lock de ciclo de vida (até ~12 s) e não pode segurar a leitura
    // pública nem a fila de status; o link já está revogado, então a resposta não depende disso.
    void this.manager
      .rejectConnectedAccount(
        sessionId,
        WRONG_NUMBER_REASON,
        `${link.expectedPhone}@s.whatsapp.net`,
      )
      .catch((e: Error) =>
        this.logger.error(
          `link de conexão: falha ao desfazer conexão com número errado (${sessionId}): ${e.message}`,
          e.stack,
        ),
      );
    return 'rejected';
  }
}

function connected(link: ConnectLinkRecord): PublicConnectResponse {
  return {
    state: 'CONNECTED',
    connectedAt: (link.consumedAt ?? new Date()).toISOString(),
  };
}
