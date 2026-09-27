import { describe, expect, it } from 'vitest';
import { SessionManager } from '../src/modules/sessions/application/session-manager.service';
import type {
  SessionRepository,
  StatusPatch,
} from '../src/modules/sessions/domain/session.repository';
import type { SessionStatus } from '../src/modules/sessions/domain/session-status';
import type { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import type { WaEventEnvelope } from '../src/modules/sessions/application/engine.port';

// Dedup de session.status idêntico consecutivo (SessionManager.handleEngineEvent).
//
// PROBLEMA (produção): as engines RE-emitem session.status sem que nada mude — o Baileys dispara
// WORKING em TODO connection 'open' (baileys.engine.ts), logo cada reconexão transitória reemite
// WORKING já sendo WORKING; o wwebjs reemite WORKING a cada heal. Sem dedup, cada uma vira um
// webhook → alerta no n8n (zap/telegram) dizendo "está WORKING" de novo: "muitos alertas, mas nada
// mudou". Estes testes fixam o critério: publica no EventBus só quando (status, erro) MUDA.
//
// Teste de unidade puro — instancia o SessionManager com fakes e dirige o callback de evento da
// engine direto, sem infra (mesmo padrão do wwebjs-engine.e2e-spec.ts). handleEngineEvent é privado;
// acessado via cast, como os outros specs fazem com internals.

type StatusWrite = { status: SessionStatus; error: string | null };

function makeManager(): {
  manager: SessionManager;
  published: WaEventEnvelope[];
  statusWrites: StatusWrite[];
} {
  const published: WaEventEnvelope[] = [];
  const statusWrites: StatusWrite[] = [];
  const repo: Pick<SessionRepository, 'updateStatus'> = {
    updateStatus: (_id: string, status: SessionStatus, patch?: StatusPatch) => {
      statusWrites.push({ status, error: patch?.lastError ?? null });
      return Promise.resolve(true); // sessão viva → não dispara o caminho de engine órfã
    },
  };
  const eventBus: Pick<EventBus, 'publish'> = {
    publish: (e) => published.push(e.payload as WaEventEnvelope),
  };
  const manager = new SessionManager(
    repo as SessionRepository,
    {} as never, // prisma
    {} as never, // config
    eventBus as EventBus,
    {} as never, // proxyResolver
    {} as never, // mediaStorage
    {} as never, // contactDirectory
    {} as never, // engineFactory
    {} as never, // guardrail
  );
  const internals = manager as unknown as {
    lease: unknown;
    owned: Map<string, unknown>;
  };
  for (const id of ['s1', 's2'])
    internals.owned.set(id, {
      epoch: 1n,
      until: new Date(Date.now() + 60_000),
      active: true,
    });
  internals.lease = {
    updateStatus: (
      _id: string,
      _epoch: bigint,
      status: SessionStatus,
      patch: StatusPatch,
    ) => repo.updateStatus(_id, status, patch),
  };
  return { manager, published, statusWrites };
}

function emit(
  manager: SessionManager,
  sessionId: string,
  status: SessionStatus,
  error: string | null = null,
): Promise<void> {
  return (
    manager as unknown as {
      handleEngineEvent: (
        id: string,
        name: string,
        payload: unknown,
      ) => Promise<void>;
    }
  ).handleEngineEvent(sessionId, 'session.status', { status, error });
}

const statusesOf = (published: WaEventEnvelope[]): string[] =>
  published
    .filter((e) => e.event === 'session.status')
    .map((e) => (e.payload as { status: string }).status);

describe('SessionManager — dedup de session.status (alertas zap/telegram)', () => {
  it('não republica WORKING repetido (reconexão transitória que não muda nada)', async () => {
    const { manager, published, statusWrites } = makeManager();
    await emit(manager, 's1', 'WORKING');
    await emit(manager, 's1', 'WORKING'); // reconexão reemite WORKING
    await emit(manager, 's1', 'WORKING'); // e de novo
    // Só o 1º WORKING vira evento/alerta.
    expect(statusesOf(published)).toEqual(['WORKING']);
    // Mas persistStatus roda SEMPRE (status atual + detecção de órfã não podem depender do dedup).
    expect(statusWrites).toHaveLength(3);
  });

  it('republica em transição real e volta a deduplicar no novo patamar', async () => {
    const { manager, published } = makeManager();
    await emit(manager, 's1', 'WORKING');
    await emit(manager, 's1', 'DEGRADED', 'página sem resposta');
    await emit(manager, 's1', 'WORKING'); // recuperou — transição real
    await emit(manager, 's1', 'WORKING'); // reemite — deduplicado
    expect(statusesOf(published)).toEqual(['WORKING', 'DEGRADED', 'WORKING']);
  });

  it('mesmo status com erro diferente é informação nova — republica', async () => {
    const { manager, published } = makeManager();
    await emit(manager, 's1', 'DEGRADED', 'falha A');
    await emit(manager, 's1', 'DEGRADED', 'falha A'); // idêntico → dedup
    await emit(manager, 's1', 'DEGRADED', 'falha B'); // erro novo → publica
    expect(statusesOf(published)).toHaveLength(2);
  });

  it('dedup é isolado por sessão — uma não silencia a outra', async () => {
    const { manager, published } = makeManager();
    await emit(manager, 's1', 'WORKING');
    await emit(manager, 's2', 'WORKING'); // outra sessão → publica
    await emit(manager, 's1', 'WORKING'); // dedup de s1
    expect(statusesOf(published)).toEqual(['WORKING', 'WORKING']);
    expect(published.map((e) => e.sessionId)).toEqual(['s1', 's2']);
  });

  it('não deduplica eventos que não são session.status (message.ack sempre passa)', async () => {
    const { manager, published } = makeManager();
    const ack = (
      manager as unknown as {
        handleEngineEvent: (
          id: string,
          name: string,
          payload: unknown,
        ) => Promise<void>;
      }
    ).handleEngineEvent.bind(manager);
    await ack('s1', 'message.ack', { id: 'm1', ack: 2 });
    await ack('s1', 'message.ack', { id: 'm1', ack: 2 });
    expect(published.filter((e) => e.event === 'message.ack')).toHaveLength(2);
  });
});
