import { HttpException, Logger } from '@nestjs/common';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';
import { sha512 } from '../../../shared-kernel/crypto';
import { EventBus } from '../../../shared-kernel/event-bus/event-bus';
import {
  CONNECT_LINK_CONNECTED_GRACE_MS,
  CONNECT_LINK_ERROR,
  CONNECT_LINK_NEW_QR_COOLDOWN_MS,
  CONNECT_LINK_NEW_QR_MAX,
  CONNECT_LINK_RETENTION_MS,
  CONNECT_LINK_SEEN_THROTTLE_MS,
  CONNECT_LINK_TOKEN_RE,
  type ConnectLinkRecord,
  type ConnectLinkRevokedReason,
  linkState,
} from '../domain/connect-link';
import type {
  ConnectLinkRepository,
  CreateConnectLinkInput,
} from '../domain/connect-link.repository';
import type { SessionStatus } from '../domain/session-status';
import type {
  ConnectSnapshot,
  SessionRepository,
} from '../domain/session.repository';
import {
  ConnectLinkService,
  toConnectLinkDto,
  WRONG_NUMBER_REASON,
} from './connect-link.service';
import type { WaEventEnvelope } from './engine.port';
import {
  SessionBusyError,
  type SessionManager,
} from './session-manager.service';

// E27 · P-086 · D-037 — ConnectLinkService com fakes: repositório de links em memória (mesma
// semântica condicional dos updateMany do Prisma), SessionRepository/SessionManager falsos e o
// EventBus real (o assinante 'wa.event' WORKING consome/revoga o link).

const SESSION = 'sess-e27';
const ACTOR = 'diogo (ADMIN)';
const T0 = new Date('2026-09-27T12:00:00.000Z');
const QR = 'data:image/png;base64,iVBORw0KGgo=';
const EXPECTED = '5511988887777';

// Relógio controlado: sobrescreve o `now()` protegido do serviço.
class ClockedConnectLinkService extends ConnectLinkService {
  clock = new Date(T0);
  protected override now(): Date {
    return new Date(this.clock.getTime());
  }
  advance(ms: number): void {
    this.clock = new Date(this.clock.getTime() + ms);
  }
}

// Não revogado, não consumido e dentro da validade — o `active(now)` do Prisma.
function isActive(row: ConnectLinkRecord, now: Date): boolean {
  return (
    row.revokedAt === null &&
    row.consumedAt === null &&
    row.expiresAt.getTime() > now.getTime()
  );
}

// Espelho em memória do PrismaConnectLinkRepository: cada escrita repete o WHERE do updateMany
// (CAS) e cada leitura devolve uma cópia (como o Prisma).
class MemoryConnectLinkRepository implements ConnectLinkRepository {
  readonly rows = new Map<string, ConnectLinkRecord>();
  // Linhas WORKING de wa_session_events (sessionId + createdAt).
  readonly workingEvents: { sessionId: string; at: Date }[] = [];

  row(id: string): ConnectLinkRecord {
    const r = this.rows.get(id);
    if (!r) throw new Error(`link ${id} não existe no fake`);
    return r;
  }

  private bySession(sessionId: string): ConnectLinkRecord[] {
    // createdAt desc; empate → o inserido por último primeiro.
    return [...this.rows.values()]
      .filter((r) => r.sessionId === sessionId)
      .reverse()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createReplacing(
    input: CreateConnectLinkInput,
  ): Promise<ConnectLinkRecord> {
    for (const r of this.rows.values()) {
      if (r.sessionId === input.sessionId && isActive(r, input.now)) {
        r.revokedAt = input.now;
        r.revokedReason = 'REPLACED';
      }
    }
    const cutoff = input.now.getTime() - CONNECT_LINK_RETENTION_MS;
    for (const r of [...this.rows.values()]) {
      if (
        r.sessionId === input.sessionId &&
        r.createdAt.getTime() < cutoff &&
        (r.revokedAt !== null ||
          r.consumedAt !== null ||
          r.expiresAt.getTime() <= input.now.getTime())
      ) {
        this.rows.delete(r.id);
      }
    }
    if ([...this.rows.values()].some((r) => r.tokenHash === input.tokenHash)) {
      throw new Error('unique tokenHash');
    }
    const row: ConnectLinkRecord = {
      id: input.id,
      sessionId: input.sessionId,
      tokenHash: input.tokenHash,
      createdBy: input.createdBy,
      expectedPhone: input.expectedPhone,
      expiresAt: input.expiresAt,
      revokedAt: null,
      revokedReason: null,
      consumedAt: null,
      newQrCount: 0,
      lastNewQrAt: null,
      lastSeenAt: null,
      createdAt: input.now,
    };
    this.rows.set(row.id, row);
    return { ...row };
  }

  async findByHash(tokenHash: string): Promise<ConnectLinkRecord | null> {
    const r = [...this.rows.values()].find((x) => x.tokenHash === tokenHash);
    return r ? { ...r } : null;
  }

  async findLatestBySession(
    sessionId: string,
  ): Promise<ConnectLinkRecord | null> {
    const r = this.bySession(sessionId)[0];
    return r ? { ...r } : null;
  }

  async findActiveBySession(
    sessionId: string,
    now: Date,
  ): Promise<ConnectLinkRecord | null> {
    const r = this.bySession(sessionId).find((x) => isActive(x, now));
    return r ? { ...r } : null;
  }

  async revokeActive(
    sessionId: string,
    now: Date,
    reason: ConnectLinkRevokedReason,
  ): Promise<number> {
    let count = 0;
    for (const r of this.rows.values()) {
      if (r.sessionId === sessionId && isActive(r, now)) {
        r.revokedAt = now;
        r.revokedReason = reason;
        count++;
      }
    }
    return count;
  }

  async revoke(
    id: string,
    now: Date,
    reason: ConnectLinkRevokedReason,
  ): Promise<boolean> {
    const r = this.rows.get(id);
    if (!r || r.revokedAt !== null || r.consumedAt !== null) return false;
    r.revokedAt = now;
    r.revokedReason = reason;
    return true;
  }

  async consume(id: string, now: Date): Promise<boolean> {
    const r = this.rows.get(id);
    if (!r || !isActive(r, now)) return false;
    r.consumedAt = now;
    return true;
  }

  async reserveNewQr(
    id: string,
    now: Date,
    max: number,
    cooldownMs: number,
  ): Promise<boolean> {
    const r = this.rows.get(id);
    if (!r || !isActive(r, now) || r.newQrCount >= max) return false;
    if (
      r.lastNewQrAt !== null &&
      r.lastNewQrAt.getTime() > now.getTime() - cooldownMs
    ) {
      return false;
    }
    r.newQrCount += 1;
    r.lastNewQrAt = now;
    return true;
  }

  async touchSeen(id: string, now: Date): Promise<void> {
    const r = this.rows.get(id);
    if (r) r.lastSeenAt = now;
  }

  async hasWorkingSince(sessionId: string, since: Date): Promise<boolean> {
    return this.workingEvents.some(
      (e) => e.sessionId === sessionId && e.at.getTime() >= since.getTime(),
    );
  }
}

type LiveView = { status: SessionStatus; qr: string | null } | null;

function fakeManager() {
  const state = {
    live: null as LiveView,
    busy: false,
    rehydrated: true,
    engine: true,
    // Lock de ciclo de vida ocupado: o failFast recusa antes do check.
    lockBusy: false,
  };
  const newQr = vi.fn(async (_id: string): Promise<void> => undefined);
  const manager = {
    liveView: vi.fn((_id: string): LiveView => state.live),
    isBusy: vi.fn((_id: string) => state.busy),
    isRehydrated: vi.fn(() => state.rehydrated),
    hasEngine: vi.fn((_id: string) => state.engine),
    // Como o real: check() dentro do lock e depois o newQr.
    newQrForConnectLink: vi.fn(
      async (id: string, check: () => Promise<void>): Promise<void> => {
        if (state.lockBusy) throw new SessionBusyError();
        await check();
        await newQr(id);
      },
    ),
    rejectConnectedAccount: vi.fn(
      async (_id: string, _reason: string, _restore: string | null) =>
        undefined,
    ),
  };
  return { state, newQr, manager };
}

function harness(
  opts: {
    links?: MemoryConnectLinkRepository;
    snap?: ConnectSnapshot;
    engine?: boolean;
  } = {},
) {
  const links = opts.links ?? new MemoryConnectLinkRepository();
  const snap: ConnectSnapshot = opts.snap ?? {
    id: SESSION,
    engine: 'BAILEYS',
    status: 'STOPPED',
    meJid: null,
    lastMeJid: null,
    paired: false,
  };
  const sessions = {
    findConnectSnapshot: vi.fn(
      async (id: string): Promise<ConnectSnapshot | null> =>
        id === snap.id ? { ...snap } : null,
    ),
    setLastMeJid: vi.fn(async () => undefined),
  };
  const m = fakeManager();
  if (opts.engine !== undefined) m.state.engine = opts.engine;
  const bus = new EventBus();
  const service = new ClockedConnectLinkService(
    links,
    sessions as unknown as SessionRepository,
    m.manager as unknown as SessionManager,
    bus,
  );
  service.onModuleInit();

  const create = (expectedPhone: string | null = null, ttlMinutes = 1440) =>
    service.create(SESSION, { ttlMinutes, expectedPhone }, ACTOR);
  // GET público: o guard resolve o token a cada requisição (registro fresco) e o controller chama
  // publicState.
  const get = async (token: string) =>
    service.publicState(await service.resolveToken(token));
  const askNewQr = async (token: string) =>
    service.requestNewQr(await service.resolveToken(token));
  const publishStatus = (
    status: SessionStatus,
    meJid: string | null,
    name = 'wa.event',
    event: WaEventEnvelope['event'] = 'session.status',
  ) => {
    const envelope: WaEventEnvelope = {
      id: 'evt-1',
      timestamp: Date.now(),
      event,
      sessionId: SESSION,
      session: 'loja',
      payload: { status, meJid },
      engine: 'baileys',
    };
    bus.publish({ name, occurredAt: new Date(), payload: envelope });
  };

  return {
    links,
    snap,
    sessions,
    state: m.state,
    manager: m.manager,
    // newQr "de verdade" do manager (depois do check); `askNewQr` é o POST público.
    engineNewQr: m.newQr,
    bus,
    service,
    create,
    get,
    askNewQr,
    publishStatus,
  };
}

// O assinante do EventBus roda em `void …` — drena as microtasks (o fake não faz I/O).
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

async function httpError(
  p: Promise<unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  let caught: unknown;
  try {
    await p;
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(HttpException);
  const he = caught as HttpException;
  return {
    status: he.getStatus(),
    body: he.getResponse() as Record<string, unknown>,
  };
}

let errorLog: MockInstance;
let warnLog: MockInstance;

beforeEach(() => {
  errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  warnLog = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConnectLinkService.create (E27/P-086)', () => {
  it('sessão inexistente → 404 CONNECT_LINK_NOT_FOUND sem gravar link', async () => {
    const h = harness();
    const spy = vi.spyOn(h.links, 'createReplacing');
    const err = await httpError(
      h.service.create('outra', { ttlMinutes: 60, expectedPhone: null }, ACTOR),
    );
    expect(err.status).toBe(404);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.NOT_FOUND);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sessão WWEBJS → 409 CONNECT_LINK_ENGINE_UNSUPPORTED (só Baileys na v1)', async () => {
    const h = harness();
    h.snap.engine = 'WWEBJS';
    const err = await httpError(h.create());
    expect(err.status).toBe(409);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.ENGINE_UNSUPPORTED);
    expect(h.links.rows.size).toBe(0);
  });

  it('banco WORKING → 409 CONNECT_LINK_SESSION_WORKING', async () => {
    const h = harness();
    h.snap.status = 'WORKING';
    const err = await httpError(h.create());
    expect(err.status).toBe(409);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.SESSION_WORKING);
    expect(h.links.rows.size).toBe(0);
  });

  it('engine viva WORKING com banco ainda STOPPED → 409 CONNECT_LINK_SESSION_WORKING', async () => {
    const h = harness();
    h.state.live = { status: 'WORKING', qr: null };
    const err = await httpError(h.create());
    expect(err.status).toBe(409);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.SESSION_WORKING);
    expect(h.links.rows.size).toBe(0);
  });

  it('login salvo (paired) → 409 CONNECT_LINK_SESSION_PAIRED', async () => {
    const h = harness();
    h.snap.status = 'DEGRADED';
    h.snap.paired = true;
    const err = await httpError(h.create());
    expect(err.status).toBe(409);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.SESSION_PAIRED);
    expect(h.links.rows.size).toBe(0);
  });

  it('ok → token base64url de 43 chars, banco guarda só o sha512 e expiresAt = now + ttl', async () => {
    const h = harness();
    const { link, token } = await h.create(EXPECTED, 60);

    expect(token).toHaveLength(43);
    expect(token).toMatch(CONNECT_LINK_TOKEN_RE);
    const row = h.links.row(link.id);
    expect(row.tokenHash).toBe(sha512(token));
    // O texto do token não aparece em lugar nenhum da linha gravada.
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row.expiresAt.toISOString()).toBe(
      new Date(T0.getTime() + 60 * 60_000).toISOString(),
    );
    expect(row).toMatchObject({
      sessionId: SESSION,
      createdBy: ACTOR,
      expectedPhone: EXPECTED,
      newQrCount: 0,
      consumedAt: null,
      revokedAt: null,
    });
    expect(linkState(link, T0)).toBe('ACTIVE');
  });

  it('tokens de links diferentes são diferentes', async () => {
    const h = harness();
    const a = await h.create();
    const b = await h.create();
    expect(a.token).not.toBe(b.token);
    expect(a.link.tokenHash).not.toBe(b.link.tokenHash);
  });

  it('segundo create revoga o primeiro com REPLACED (um link ativo por sessão)', async () => {
    const h = harness();
    const first = await h.create();
    h.service.advance(1_000);
    const second = await h.create();

    expect(h.links.row(first.link.id)).toMatchObject({
      revokedReason: 'REPLACED',
      revokedAt: new Date(T0.getTime() + 1_000),
    });
    const err = await httpError(h.service.resolveToken(first.token));
    expect(err.status).toBe(410);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.REVOKED);
    await expect(h.service.resolveToken(second.token)).resolves.toMatchObject({
      id: second.link.id,
    });
    await expect(h.service.latest(SESSION)).resolves.toMatchObject({
      id: second.link.id,
    });
  });

  it('sessão vira WORKING entre a checagem e o insert → link já nasce consumido', async () => {
    const h = harness();
    h.sessions.findConnectSnapshot
      .mockResolvedValueOnce({ ...h.snap })
      .mockResolvedValueOnce({
        ...h.snap,
        status: 'WORKING',
        meJid: `${EXPECTED}:3@s.whatsapp.net`,
      });

    const { link, token } = await h.create();

    expect(link.consumedAt).toEqual(T0);
    expect(linkState(link, T0)).toBe('CONNECTED');
    expect(h.links.row(link.id).consumedAt).toEqual(T0);
    expect(token).toMatch(CONNECT_LINK_TOKEN_RE);
  });
});

describe('ConnectLinkService.resolveToken (E27/P-086)', () => {
  it.each([
    ['null', null],
    ['vazio', ''],
    ['lixo curto', 'abc'],
    ['44 caracteres', 'A'.repeat(44)],
    ['caractere fora do base64url', `${'A'.repeat(42)}+`],
    ['com padding', `${'A'.repeat(42)}=`],
  ])(
    'formato inválido (%s) → 404 sem consultar o banco',
    async (_nome, raw) => {
      const h = harness();
      const spy = vi.spyOn(h.links, 'findByHash');
      const err = await httpError(h.service.resolveToken(raw));
      expect(err.status).toBe(404);
      expect(err.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        code: CONNECT_LINK_ERROR.NOT_FOUND,
        message: 'Link de conexão inválido ou incompleto.',
      });
      expect(spy).not.toHaveBeenCalled();
    },
  );

  it('formato válido com hash desconhecido → 404 sem ecoar o token', async () => {
    const h = harness();
    const spy = vi.spyOn(h.links, 'findByHash');
    const raw = 'Zz9_-'.padEnd(43, 'q');
    const err = await httpError(h.service.resolveToken(raw));
    expect(err.status).toBe(404);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.NOT_FOUND);
    expect(JSON.stringify(err.body)).not.toContain(raw);
    expect(spy).toHaveBeenCalledWith(sha512(raw));
  });

  it('link consumido depois da janela de graça → 410 CONNECT_LINK_USED', async () => {
    const h = harness();
    const { token } = await h.create();
    await h.service.onSessionWorking(SESSION, '5511900001111@s.whatsapp.net');
    h.service.advance(CONNECT_LINK_CONNECTED_GRACE_MS + 1);
    const err = await httpError(h.service.resolveToken(token));
    expect(err.status).toBe(410);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.USED);
    expect(JSON.stringify(err.body)).not.toContain(token);
  });

  it.each<[string, ConnectLinkRevokedReason]>([
    ['cancelado no painel', 'MANUAL'],
    ['sessão parada pelo operador', 'SESSION_STOPPED'],
  ])('link revogado (%s) → 410 CONNECT_LINK_REVOKED', async (_n, reason) => {
    const h = harness();
    const { token } = await h.create();
    await h.service.revoke(SESSION, reason);
    const err = await httpError(h.service.resolveToken(token));
    expect(err.status).toBe(410);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.REVOKED);
  });

  it('link vencido → 410 CONNECT_LINK_EXPIRED', async () => {
    const h = harness();
    const { token } = await h.create(null, 60);
    h.service.advance(60 * 60_000);
    const err = await httpError(h.service.resolveToken(token));
    expect(err.status).toBe(410);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.EXPIRED);
  });

  it('link revogado por número errado → 410 CONNECT_LINK_WRONG_NUMBER', async () => {
    const h = harness();
    const { token } = await h.create(EXPECTED);
    await h.service.onSessionWorking(SESSION, '5521977776666@s.whatsapp.net');
    const err = await httpError(h.service.resolveToken(token));
    expect(err.status).toBe(410);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.WRONG_NUMBER);
  });

  it('ACTIVE e CONNECTED passam (a página precisa ver o "conectado")', async () => {
    const h = harness();
    const { link, token } = await h.create();
    await expect(h.service.resolveToken(token)).resolves.toMatchObject({
      id: link.id,
      consumedAt: null,
    });
    await h.service.onSessionWorking(SESSION, null);
    h.service.advance(CONNECT_LINK_CONNECTED_GRACE_MS);
    const resolved = await h.service.resolveToken(token);
    expect(resolved.id).toBe(link.id);
    expect(linkState(resolved, h.service.clock)).toBe('CONNECTED');
  });
});

describe('ConnectLinkService.publicState (E27/P-086)', () => {
  it('sessão parada sem engine → fase IDLE com botão de gerar QR e dica do número', async () => {
    const h = harness();
    const { link, token } = await h.create(EXPECTED);
    await expect(h.get(token)).resolves.toEqual({
      state: 'ACTIVE',
      phase: 'IDLE',
      qr: null,
      expiresAt: link.expiresAt.toISOString(),
      expectedPhoneHint: '77',
      newQr: {
        available: true,
        remaining: CONNECT_LINK_NEW_QR_MAX,
        max: CONNECT_LINK_NEW_QR_MAX,
        retryAfterSeconds: 0,
      },
    });
  });

  it('sem número esperado → expectedPhoneHint null', async () => {
    const h = harness();
    const { token } = await h.create(null);
    await expect(h.get(token)).resolves.toMatchObject({
      expectedPhoneHint: null,
    });
  });

  it('QR vivo → fase QR devolve o data URL e não oferece "gerar QR"', async () => {
    const h = harness();
    const { token } = await h.create();
    h.snap.status = 'SCAN_QR_CODE';
    h.state.live = { status: 'SCAN_QR_CODE', qr: QR };
    await expect(h.get(token)).resolves.toMatchObject({
      state: 'ACTIVE',
      phase: 'QR',
      qr: QR,
      newQr: { available: false, remaining: CONNECT_LINK_NEW_QR_MAX },
    });
  });

  it.each<[string, () => { live: LiveView; db: SessionStatus }, string]>([
    [
      'engine iniciando com QR antigo na memória',
      () => ({ live: { status: 'STARTING', qr: QR }, db: 'STARTING' }),
      'PREPARING',
    ],
    [
      'QR que não é data URL PNG',
      () => ({
        live: { status: 'SCAN_QR_CODE', qr: '2@abc,def' },
        db: 'SCAN_QR_CODE',
      }),
      'PREPARING',
    ],
    [
      'pareamento por código em andamento',
      () => ({ live: { status: 'PAIRING_CODE', qr: QR }, db: 'PAIRING_CODE' }),
      'PAIRING',
    ],
    ['sessão FAILED', () => ({ live: null, db: 'FAILED' }), 'UNAVAILABLE'],
  ])('%s → qr null (só a fase QR leva QR)', async (_n, setup, phase) => {
    const h = harness();
    const { token } = await h.create();
    const s = setup();
    h.snap.status = s.db;
    h.state.live = s.live;
    await expect(h.get(token)).resolves.toMatchObject({
      phase,
      qr: null,
      newQr: { available: false },
    });
  });

  it('login salvo com QR vivo → não mostra QR (nunca oferece QR de sessão pareada)', async () => {
    const h = harness();
    const { token } = await h.create();
    h.snap.paired = true;
    h.snap.status = 'SCAN_QR_CODE';
    h.state.live = { status: 'SCAN_QR_CODE', qr: QR };
    const res = await h.get(token);
    expect(res).toMatchObject({ state: 'ACTIVE', qr: null });
    expect(res).not.toMatchObject({ phase: 'QR' });
  });

  it('operação de ciclo de vida em andamento → PREPARING sem botão', async () => {
    const h = harness();
    const { token } = await h.create();
    h.state.busy = true;
    await expect(h.get(token)).resolves.toMatchObject({
      phase: 'PREPARING',
      newQr: { available: false },
    });
  });

  it('IDLE com a cota esgotada → available false e remaining 0', async () => {
    const h = harness();
    const { link, token } = await h.create();
    const row = h.links.row(link.id);
    row.newQrCount = CONNECT_LINK_NEW_QR_MAX;
    row.lastNewQrAt = new Date(T0.getTime() - 60 * 60_000);
    await expect(h.get(token)).resolves.toMatchObject({
      phase: 'IDLE',
      newQr: { available: false, remaining: 0, retryAfterSeconds: 0 },
    });
  });

  it('lastSeenAt é gravado no máximo 1×/min', async () => {
    const h = harness();
    const { link, token } = await h.create();
    const touch = vi.spyOn(h.links, 'touchSeen');

    await h.get(token);
    expect(touch).toHaveBeenCalledTimes(1);
    expect(h.links.row(link.id).lastSeenAt).toEqual(T0);

    h.service.advance(CONNECT_LINK_SEEN_THROTTLE_MS - 1);
    await h.get(token);
    expect(touch).toHaveBeenCalledTimes(1);

    h.service.advance(1);
    await h.get(token);
    expect(touch).toHaveBeenCalledTimes(2);
    expect(h.links.row(link.id).lastSeenAt).toEqual(
      new Date(T0.getTime() + CONNECT_LINK_SEEN_THROTTLE_MS),
    );
  });

  it('evento WORKING no EventBus consome o link e o GET seguinte devolve CONNECTED', async () => {
    const h = harness();
    const { link, token } = await h.create();
    h.service.advance(5_000);
    const connectedAt = new Date(h.service.clock);
    // persistStatus grava WORKING antes do publish (SessionManager.handleEngineEvent).
    h.snap.status = 'WORKING';
    h.snap.meJid = '5511900001111:4@s.whatsapp.net';
    h.publishStatus('WORKING', h.snap.meJid);
    await vi.waitFor(() =>
      expect(h.links.row(link.id).consumedAt).toEqual(connectedAt),
    );

    h.service.advance(2_000);
    await expect(h.get(token)).resolves.toEqual({
      state: 'CONNECTED',
      connectedAt: connectedAt.toISOString(),
    });
  });

  it('depois da janela de graça o mesmo link responde 410 CONNECT_LINK_USED', async () => {
    const h = harness();
    const { token } = await h.create();
    h.snap.status = 'WORKING';
    h.publishStatus('WORKING', '5511900001111@s.whatsapp.net');
    await flush();
    await expect(h.get(token)).resolves.toMatchObject({ state: 'CONNECTED' });

    h.service.advance(CONNECT_LINK_CONNECTED_GRACE_MS + 1);
    const err = await httpError(h.get(token));
    expect(err.status).toBe(410);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.USED);
  });

  it.each<[string, string, SessionStatus | 'message']>([
    [
      'fan-out de outra réplica (wa.event.remote)',
      'wa.event.remote',
      'WORKING',
    ],
    ['status que não é WORKING', 'wa.event', 'SCAN_QR_CODE'],
    ['evento que não é session.status', 'wa.event', 'message'],
  ])('ignora %s', async (_n, name, kind) => {
    const h = harness();
    const { link } = await h.create();
    if (kind === 'message') {
      h.publishStatus('WORKING', null, name, 'message');
    } else {
      h.publishStatus(kind, null, name);
    }
    await flush();
    expect(h.links.row(link.id)).toMatchObject({
      consumedAt: null,
      revokedAt: null,
    });
  });

  it.each([
    [
      'número idêntico (com :NN do device)',
      EXPECTED,
      `${EXPECTED}:12@s.whatsapp.net`,
    ],
    ['conta antiga sem o 9º dígito', EXPECTED, '551188887777@s.whatsapp.net'],
    [
      'esperado sem o 9º, conta com o 9º',
      '551188887777',
      `${EXPECTED}:7@s.whatsapp.net`,
    ],
  ])(
    'banco WORKING com o número esperado (%s) → consome e responde CONNECTED',
    async (_n, expected, meJid) => {
      const h = harness();
      const { link, token } = await h.create(expected);
      h.snap.status = 'WORKING';
      h.snap.meJid = meJid;
      await expect(h.get(token)).resolves.toEqual({
        state: 'CONNECTED',
        connectedAt: T0.toISOString(),
      });
      expect(h.links.row(link.id).consumedAt).toEqual(T0);
      expect(h.manager.rejectConnectedAccount).not.toHaveBeenCalled();
    },
  );

  it('número diferente com a engine neste processo → revoga WRONG_NUMBER, desfaz a conexão e responde 410', async () => {
    const h = harness({ engine: true });
    const { link, token } = await h.create(EXPECTED);
    h.snap.status = 'WORKING';
    h.snap.meJid = '5521977776666:2@s.whatsapp.net';

    const err = await httpError(h.get(token));
    expect(err.status).toBe(410);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.WRONG_NUMBER);
    expect(h.links.row(link.id)).toMatchObject({
      revokedReason: 'WRONG_NUMBER',
      revokedAt: T0,
      consumedAt: null,
    });
    expect(h.manager.rejectConnectedAccount).toHaveBeenCalledTimes(1);
    expect(h.manager.rejectConnectedAccount).toHaveBeenCalledWith(
      SESSION,
      WRONG_NUMBER_REASON,
      `${EXPECTED}@s.whatsapp.net`,
    );
  });

  it('número diferente lido numa réplica SEM a engine → não revoga (pending): a página segue preparando', async () => {
    const h = harness({ engine: false });
    const { link, token } = await h.create(EXPECTED);
    h.snap.status = 'WORKING';
    h.snap.meJid = '5521977776666@s.whatsapp.net';

    await expect(h.get(token)).resolves.toMatchObject({
      state: 'ACTIVE',
      phase: 'PREPARING',
      qr: null,
    });
    expect(h.links.row(link.id).revokedAt).toBeNull();
    expect(h.links.row(link.id).consumedAt).toBeNull();
    expect(h.manager.rejectConnectedAccount).not.toHaveBeenCalled();
  });

  it('evento WORKING com número errado sem a engine no processo → revoga e só avisa no log', async () => {
    const h = harness({ engine: false });
    const { link } = await h.create(EXPECTED);
    await expect(
      h.service.onSessionWorking(SESSION, '5521977776666@s.whatsapp.net'),
    ).resolves.toBe('rejected');
    expect(h.links.row(link.id).revokedReason).toBe('WRONG_NUMBER');
    expect(h.manager.rejectConnectedAccount).not.toHaveBeenCalled();
    expect(warnLog).toHaveBeenCalled();
  });

  it('meJid @lid com número esperado → falha fechada (WRONG_NUMBER)', async () => {
    const h = harness();
    const { token } = await h.create(EXPECTED);
    h.snap.status = 'WORKING';
    h.snap.meJid = '123456789012345@lid';
    const err = await httpError(h.get(token));
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.WRONG_NUMBER);
    expect(h.manager.rejectConnectedAccount).toHaveBeenCalledOnce();
  });

  it('sem número esperado → consome com qualquer conta', async () => {
    const h = harness();
    const { link, token } = await h.create(null);
    h.snap.status = 'WORKING';
    h.snap.meJid = '5521977776666@s.whatsapp.net';
    await expect(h.get(token)).resolves.toMatchObject({ state: 'CONNECTED' });
    expect(h.links.row(link.id).consumedAt).toEqual(T0);
    expect(h.manager.rejectConnectedAccount).not.toHaveBeenCalled();
  });

  it('evento e leitura com número errado ao mesmo tempo → o logout é pedido 1× só', async () => {
    const h = harness();
    const { token } = await h.create(EXPECTED);
    h.snap.status = 'WORKING';
    h.snap.meJid = '5521977776666@s.whatsapp.net';
    h.publishStatus('WORKING', h.snap.meJid);
    const err = await httpError(h.get(token));
    await flush();
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.WRONG_NUMBER);
    expect(h.manager.rejectConnectedAccount).toHaveBeenCalledTimes(1);
  });

  it('dois WORKING com número errado em paralelo → só quem revogou pede o logout', async () => {
    const h = harness();
    const { link } = await h.create(EXPECTED);
    const jid = '5521977776666@s.whatsapp.net';
    await Promise.all([
      h.service.onSessionWorking(SESSION, jid),
      h.service.onSessionWorking(SESSION, jid),
    ]);
    expect(h.links.row(link.id).revokedReason).toBe('WRONG_NUMBER');
    expect(h.manager.rejectConnectedAccount).toHaveBeenCalledTimes(1);
  });

  // Regressão (E27): corrida entre réplicas (deploy start-first). A leitura numa réplica SEM a
  // engine não revoga; a réplica DONA trata o evento, revoga e desfaz a conexão.
  it('número errado lido primeiro numa réplica sem engine → a réplica dona ainda desfaz a conexão', async () => {
    const links = new MemoryConnectLinkRepository();
    const other = harness({ links, engine: false });
    const owner = harness({ links, snap: other.snap, engine: true });
    const { token } = await other.create(EXPECTED);
    other.snap.status = 'WORKING';
    other.snap.meJid = '5521977776666@s.whatsapp.net';

    await expect(other.get(token)).resolves.toMatchObject({
      state: 'ACTIVE',
      phase: 'PREPARING',
    });
    owner.publishStatus('WORKING', other.snap.meJid);
    await flush();

    expect(owner.manager.rejectConnectedAccount).toHaveBeenCalledWith(
      SESSION,
      WRONG_NUMBER_REASON,
      `${EXPECTED}@s.whatsapp.net`,
    );
    const err = await httpError(other.get(token));
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.WRONG_NUMBER);
  });

  it('fallback da timeline: WORKING registrado desde a criação do link → consome e responde CONNECTED', async () => {
    const h = harness();
    const { link, token } = await h.create();
    h.links.workingEvents.push({
      sessionId: SESSION,
      at: new Date(T0.getTime() + 1_000),
    });
    h.service.advance(10_000);
    await expect(h.get(token)).resolves.toEqual({
      state: 'CONNECTED',
      connectedAt: new Date(T0.getTime() + 10_000).toISOString(),
    });
    expect(h.links.row(link.id).consumedAt).not.toBeNull();
  });

  // Regressão (E27, revisão do diff): a reserva da timeline também confere o número esperado —
  // usa o último número conectado (lastMeJid), já que a sessão caiu de novo.
  it('fallback da timeline com número esperado: lastMeJid diferente → WRONG_NUMBER e desfaz sem engine', async () => {
    const h = harness({ engine: false });
    const { link, token } = await h.create(EXPECTED);
    h.snap.lastMeJid = '5521977776666:4@s.whatsapp.net';
    h.links.workingEvents.push({
      sessionId: SESSION,
      at: new Date(T0.getTime() + 1_000),
    });
    const err = await httpError(h.get(token));
    expect(err.status).toBe(410);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.WRONG_NUMBER);
    expect(h.links.row(link.id)).toMatchObject({
      revokedReason: 'WRONG_NUMBER',
      consumedAt: null,
    });
    expect(h.manager.rejectConnectedAccount).toHaveBeenCalledWith(
      SESSION,
      WRONG_NUMBER_REASON,
      `${EXPECTED}@s.whatsapp.net`,
      { withoutEngine: 'clear' },
    );
  });

  it('fallback da timeline com número esperado: lastMeJid certo (sem o 9) → CONNECTED', async () => {
    const h = harness();
    const { link, token } = await h.create(EXPECTED);
    h.snap.lastMeJid = '551188887777:4@s.whatsapp.net';
    h.links.workingEvents.push({
      sessionId: SESSION,
      at: new Date(T0.getTime() + 1_000),
    });
    await expect(h.get(token)).resolves.toMatchObject({ state: 'CONNECTED' });
    expect(h.links.row(link.id).consumedAt).not.toBeNull();
    expect(h.manager.rejectConnectedAccount).not.toHaveBeenCalled();
  });

  it('WORKING na timeline ANTES da criação do link não consome', async () => {
    const h = harness();
    h.links.workingEvents.push({
      sessionId: SESSION,
      at: new Date(T0.getTime() - 1),
    });
    const { link, token } = await h.create();
    await expect(h.get(token)).resolves.toMatchObject({
      state: 'ACTIVE',
      phase: 'IDLE',
    });
    expect(h.links.row(link.id).consumedAt).toBeNull();
  });

  it('falha do repositório no assinante do evento só loga (não derruba o processo)', async () => {
    const h = harness();
    await h.create();
    vi.spyOn(h.links, 'findActiveBySession').mockRejectedValueOnce(
      new Error('db caiu'),
    );
    h.publishStatus('WORKING', null);
    await flush();
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('falha ao tratar WORKING'),
      expect.any(String),
    );
  });
});

describe('ConnectLinkService.requestNewQr (E27/P-086)', () => {
  it.each<[string, (h: ReturnType<typeof harness>) => void]>([
    [
      'QR vivo na tela',
      (h) => {
        h.snap.status = 'SCAN_QR_CODE';
        h.state.live = { status: 'SCAN_QR_CODE', qr: QR };
      },
    ],
    [
      'engine iniciando',
      (h) => {
        h.snap.status = 'STARTING';
        h.state.live = { status: 'STARTING', qr: null };
      },
    ],
    [
      'pareamento por código',
      (h) => {
        h.snap.status = 'PAIRING_CODE';
        h.state.live = { status: 'PAIRING_CODE', qr: null };
      },
    ],
    [
      'sessão FAILED',
      (h) => {
        h.snap.status = 'FAILED';
      },
    ],
    [
      'login salvo',
      (h) => {
        h.snap.paired = true;
      },
    ],
    [
      'banco WORKING',
      (h) => {
        h.snap.status = 'WORKING';
      },
    ],
  ])(
    'fase ≠ IDLE (%s) → 409 NEW_QR_UNAVAILABLE e a cota não muda',
    async (_n, setup) => {
      const h = harness();
      const { link, token } = await h.create();
      const resolved = await h.service.resolveToken(token);
      setup(h);
      const err = await httpError(h.service.requestNewQr(resolved));
      expect(err.status).toBe(409);
      expect(err.body.code).toBe(CONNECT_LINK_ERROR.NEW_QR_UNAVAILABLE);
      expect(h.engineNewQr).not.toHaveBeenCalled();
      expect(h.links.row(link.id)).toMatchObject({
        newQrCount: 0,
        lastNewQrAt: null,
      });
    },
  );

  it('IDLE → gera o QR, gasta 1 da cota e responde com o intervalo', async () => {
    const h = harness();
    const { link, token } = await h.create();
    await expect(h.askNewQr(token)).resolves.toEqual({
      ok: true,
      newQr: {
        available: false,
        remaining: CONNECT_LINK_NEW_QR_MAX - 1,
        max: CONNECT_LINK_NEW_QR_MAX,
        retryAfterSeconds: CONNECT_LINK_NEW_QR_COOLDOWN_MS / 1000,
      },
    });
    expect(h.engineNewQr).toHaveBeenCalledWith(SESSION);
    expect(h.manager.newQrForConnectLink).toHaveBeenCalledWith(
      SESSION,
      expect.any(Function),
    );
    expect(h.links.row(link.id)).toMatchObject({
      newQrCount: 1,
      lastNewQrAt: T0,
    });
  });

  it('segundo pedido em < 30 s → 429 NEW_QR_COOLDOWN com retryAfterSeconds; depois de 30 s passa', async () => {
    const h = harness();
    const { link, token } = await h.create();
    await h.askNewQr(token);

    h.service.advance(10_000);
    const err = await httpError(h.askNewQr(token));
    expect(err.status).toBe(429);
    expect(err.body).toMatchObject({
      statusCode: 429,
      error: 'Too Many Requests',
      code: CONNECT_LINK_ERROR.NEW_QR_COOLDOWN,
      retryAfterSeconds: 20,
    });
    expect(h.links.row(link.id).newQrCount).toBe(1);
    expect(h.engineNewQr).toHaveBeenCalledTimes(1);

    h.service.advance(20_000);
    await expect(h.askNewQr(token)).resolves.toMatchObject({ ok: true });
    expect(h.links.row(link.id).newQrCount).toBe(2);
    expect(h.engineNewQr).toHaveBeenCalledTimes(2);
  });

  it('6º pedido → 409 NEW_QR_LIMIT', async () => {
    const h = harness();
    const { link, token } = await h.create();
    for (let i = 0; i < CONNECT_LINK_NEW_QR_MAX; i++) {
      await h.askNewQr(token);
      h.service.advance(CONNECT_LINK_NEW_QR_COOLDOWN_MS);
    }
    expect(h.links.row(link.id).newQrCount).toBe(CONNECT_LINK_NEW_QR_MAX);

    const err = await httpError(h.askNewQr(token));
    expect(err.status).toBe(409);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.NEW_QR_LIMIT);
    expect(h.engineNewQr).toHaveBeenCalledTimes(CONNECT_LINK_NEW_QR_MAX);
    expect(h.links.row(link.id).newQrCount).toBe(CONNECT_LINK_NEW_QR_MAX);
  });

  it('lock da sessão ocupado (SessionBusyError do failFast) → 409 CONNECT_LINK_BUSY sem gastar cota', async () => {
    const h = harness();
    const { link, token } = await h.create();
    h.state.lockBusy = true;
    const err = await httpError(h.askNewQr(token));
    expect(err.status).toBe(409);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.BUSY);
    expect(h.links.row(link.id).newQrCount).toBe(0);
    expect(h.engineNewQr).not.toHaveBeenCalled();
  });

  it('SessionBusyError depois do check (engine saiu do repouso) → 409 CONNECT_LINK_BUSY', async () => {
    const h = harness();
    const { token } = await h.create();
    h.engineNewQr.mockRejectedValueOnce(new SessionBusyError());
    const err = await httpError(h.askNewQr(token));
    expect(err.status).toBe(409);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.BUSY);
  });

  it('newQr falha com erro qualquer → 503 NEW_QR_FAILED com mensagem genérica (e loga o erro)', async () => {
    const h = harness();
    const { token } = await h.create();
    h.engineNewQr.mockRejectedValueOnce(new Error('ECONNRESET 10.0.0.7:6379'));
    const err = await httpError(h.askNewQr(token));
    expect(err.status).toBe(503);
    expect(err.body).toEqual({
      statusCode: 503,
      error: 'Service Unavailable',
      code: CONNECT_LINK_ERROR.NEW_QR_FAILED,
      message: 'Não foi possível preparar o QR agora.',
    });
    expect(JSON.stringify(err.body)).not.toContain('ECONNRESET');
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('ECONNRESET'),
      expect.any(String),
    );
  });

  it("newQr falha com 'Sessão não encontrada' → 404 CONNECT_LINK_NOT_FOUND", async () => {
    const h = harness();
    const { token } = await h.create();
    h.engineNewQr.mockRejectedValueOnce(new Error('Sessão não encontrada'));
    const err = await httpError(h.askNewQr(token));
    expect(err.status).toBe(404);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.NOT_FOUND);
  });

  it('link CONNECTED → 410 sem tocar na sessão', async () => {
    const h = harness();
    const { token } = await h.create();
    await h.service.onSessionWorking(SESSION, null);
    const err = await httpError(h.askNewQr(token));
    expect(err.status).toBe(410);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.USED);
    expect(h.manager.newQrForConnectLink).not.toHaveBeenCalled();
  });

  it('link revogado entre o guard e o pedido → 410 CONNECT_LINK_REVOKED sem gerar QR', async () => {
    const h = harness();
    const { link, token } = await h.create();
    const resolved = await h.service.resolveToken(token);
    await h.service.revoke(SESSION);
    const err = await httpError(h.service.requestNewQr(resolved));
    expect(err.status).toBe(410);
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.REVOKED);
    expect(h.engineNewQr).not.toHaveBeenCalled();
    expect(h.links.row(link.id).newQrCount).toBe(0);
  });
});

describe('ConnectLinkService.revoke / revokeOnOperatorStop (E27/P-086)', () => {
  it('revoke sem motivo usa MANUAL e devolve quantos revogou', async () => {
    const h = harness();
    const { link } = await h.create();
    await expect(h.service.revoke(SESSION)).resolves.toBe(1);
    expect(h.links.row(link.id).revokedReason).toBe('MANUAL');
    await expect(h.service.revoke(SESSION)).resolves.toBe(0);
  });

  it('stop/logout do operador revoga o link ativo com SESSION_STOPPED', async () => {
    const h = harness();
    const { link, token } = await h.create();
    h.service.advance(3_000);
    await h.service.revokeOnOperatorStop(SESSION);
    expect(h.links.row(link.id)).toMatchObject({
      revokedReason: 'SESSION_STOPPED',
      revokedAt: new Date(T0.getTime() + 3_000),
    });
    const err = await httpError(h.service.resolveToken(token));
    expect(err.body.code).toBe(CONNECT_LINK_ERROR.REVOKED);
  });

  it('não mexe em link já consumido (o "conectado" continua na janela de graça)', async () => {
    const h = harness();
    const { link, token } = await h.create();
    await h.service.onSessionWorking(SESSION, null);
    await h.service.revokeOnOperatorStop(SESSION);
    expect(h.links.row(link.id).revokedAt).toBeNull();
    await expect(h.get(token)).resolves.toMatchObject({ state: 'CONNECTED' });
  });

  it('erro do repositório só loga, nunca lança (não quebra a rota de stop/logout)', async () => {
    const h = harness();
    vi.spyOn(h.links, 'revokeActive').mockRejectedValueOnce(
      new Error('db caiu'),
    );
    await expect(
      h.service.revokeOnOperatorStop(SESSION),
    ).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('db caiu'),
      expect.any(String),
    );
  });
});

describe('toConnectLinkDto (E27/P-086)', () => {
  const base: ConnectLinkRecord = {
    id: 'link-1',
    sessionId: SESSION,
    tokenHash: 'h'.repeat(128),
    createdBy: ACTOR,
    expectedPhone: EXPECTED,
    expiresAt: new Date(T0.getTime() + 60 * 60_000),
    revokedAt: null,
    revokedReason: null,
    consumedAt: null,
    newQrCount: 2,
    lastNewQrAt: new Date(T0.getTime() - 60_000),
    lastSeenAt: null,
    createdAt: T0,
  };

  it('ACTIVE → datas ISO, nulos preservados e sem o hash do token', () => {
    const dto = toConnectLinkDto(base, T0);
    expect(dto).toEqual({
      id: 'link-1',
      sessionId: SESSION,
      state: 'ACTIVE',
      createdAt: '2026-09-27T12:00:00.000Z',
      expiresAt: '2026-09-27T13:00:00.000Z',
      createdBy: ACTOR,
      expectedPhone: EXPECTED,
      lastSeenAt: null,
      newQrCount: 2,
      newQrMax: CONNECT_LINK_NEW_QR_MAX,
      consumedAt: null,
      revokedAt: null,
      revokedReason: null,
    });
    expect(JSON.stringify(dto)).not.toContain(base.tokenHash);
  });

  it.each<[string, Partial<ConnectLinkRecord>, Date, string]>([
    [
      'CONNECTED',
      { consumedAt: new Date(T0.getTime() + 60_000) },
      new Date(T0.getTime() + 2 * 60_000),
      'CONNECTED',
    ],
    [
      'USED',
      { consumedAt: new Date(T0.getTime() + 60_000) },
      new Date(T0.getTime() + 60_000 + CONNECT_LINK_CONNECTED_GRACE_MS + 1),
      'USED',
    ],
    [
      'REVOKED',
      {
        revokedAt: new Date(T0.getTime() + 60_000),
        revokedReason: 'WRONG_NUMBER',
      },
      new Date(T0.getTime() + 2 * 60_000),
      'REVOKED',
    ],
    ['EXPIRED', {}, new Date(T0.getTime() + 60 * 60_000), 'EXPIRED'],
  ])('%s', (_n, patch, now, state) => {
    const row = {
      ...base,
      lastSeenAt: new Date(T0.getTime() + 30_000),
      ...patch,
    };
    const dto = toConnectLinkDto(row, now);
    expect(dto.state).toBe(state);
    expect(dto.lastSeenAt).toBe('2026-09-27T12:00:30.000Z');
    expect(dto.consumedAt).toBe(row.consumedAt?.toISOString() ?? null);
    expect(dto.revokedAt).toBe(row.revokedAt?.toISOString() ?? null);
    expect(dto.revokedReason).toBe(row.revokedReason ?? null);
  });
});
