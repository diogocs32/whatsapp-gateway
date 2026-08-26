import { describe, expect, it } from 'vitest';
import { UndeliveredDetectorService } from './undelivered-detector.service';

// Teste UNITÁRIO do detector de não-entrega (R6 — efeito): a query de agregação é substituída por
// um fake que devolve as linhas "presas" já agrupadas (a correção do SQL em si é responsabilidade
// do Postgres; aqui provamos a REGRA DE AÇÃO). Prova de efeito: para CADA sessão que a varredura
// retorna, recordHardSignal(sessionId, 'restriction') é chamado uma vez — e nada é chamado quando
// a varredura vem vazia (o HAVING do SQL já filtrou quem não bate o padrão ≥N msgs / ≥M chats).

interface StuckRow {
  sessionId: string;
  name: string;
  stuckMsgs: number;
  stuckChats: number;
}

class PrismaFake {
  constructor(private readonly rows: StuckRow[]) {}
  // O serviço chama this.prisma.$queryRaw`...` (tagged template) — a impl real ignora os args e
  // devolve as linhas preparadas pelo teste.
  $queryRaw = async (): Promise<StuckRow[]> => this.rows;
}

class GuardrailFake {
  calls: Array<{ sessionId: string; signal: string }> = [];
  recordHardSignal = async (
    sessionId: string,
    signal: string,
  ): Promise<void> => {
    this.calls.push({ sessionId, signal });
  };
}

function makeService(rows: StuckRow[]) {
  const prisma = new PrismaFake(rows);
  const guardrail = new GuardrailFake();
  const env: Record<string, number> = {
    UNDELIVERED_SWEEP_MIN: 5,
    UNDELIVERED_STUCK_MIN: 15,
    UNDELIVERED_MIN_MSGS: 5,
    UNDELIVERED_MIN_CHATS: 3,
  };
  const config = { get: (k: string) => env[k] };
  const svc = new UndeliveredDetectorService(
    prisma as never,
    guardrail as never,
    config as never,
  );
  return { svc, guardrail };
}

describe('UndeliveredDetectorService.sweep', () => {
  it('sinaliza restrição para CADA sessão presa que a varredura retorna', async () => {
    const { svc, guardrail } = makeService([
      { sessionId: 'S2', name: 'CONTATO2', stuckMsgs: 16, stuckChats: 12 },
      { sessionId: 'S3', name: 'CONTATO3', stuckMsgs: 15, stuckChats: 11 },
    ]);

    const out = await svc.sweep();

    expect(out).toHaveLength(2);
    expect(guardrail.calls).toEqual([
      { sessionId: 'S2', signal: 'restriction' },
      { sessionId: 'S3', signal: 'restriction' },
    ]);
  });

  it('NÃO sinaliza nada quando a varredura vem vazia (frota saudável)', async () => {
    const { svc, guardrail } = makeService([]);

    const out = await svc.sweep();

    expect(out).toHaveLength(0);
    expect(guardrail.calls).toEqual([]);
  });

  it('não deixa um erro de banco derrubar o job — devolve [] e não sinaliza', async () => {
    const guardrail = new GuardrailFake();
    const prismaBoom = {
      $queryRaw: async () => {
        throw new Error('conexão caiu');
      },
    };
    const config = {
      get: (k: string) =>
        ({
          UNDELIVERED_SWEEP_MIN: 5,
          UNDELIVERED_STUCK_MIN: 15,
          UNDELIVERED_MIN_MSGS: 5,
          UNDELIVERED_MIN_CHATS: 3,
        })[k],
    };
    const svc = new UndeliveredDetectorService(
      prismaBoom as never,
      guardrail as never,
      config as never,
    );

    const out = await svc.sweep();

    expect(out).toEqual([]);
    expect(guardrail.calls).toEqual([]);
  });
});
