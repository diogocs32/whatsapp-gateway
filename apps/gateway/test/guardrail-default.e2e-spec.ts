import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../src/bootstrap/config';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { GuardrailService } from '../src/modules/guardrail/guardrail.service';
import { ReplyRateService } from '../src/modules/observability/reply-rate.service';
import { EventBus } from '../src/shared-kernel/event-bus/event-bus';
import { createGuardrailFixture } from './guardrail-c10.fixture';

// P-104: bootstrap recebe sentinela explícita, sem depender de now(). O controle
// ORM sem eventTs ainda demonstra now() do cliente7.10; INSERT SQL omitindo
// eventTs prova o default do banco, sem sleep nem relógio produtivo.
describe('E21/P-022 C10 — origem do default eventTs (Prisma/SQL)', () => {
  let fixture: Awaited<ReturnType<typeof createGuardrailFixture>>;
  const nodeTime = new Date('2001-02-03T04:05:06.007Z');
  const config = new ConfigService<Env, true>({
    GUARDRAIL_ENFORCE: true,
    GUARDRAIL_NMIN: 20,
    GUARDRAIL_THROTTLE_MULT: 0.75,
    GUARDRAIL_QUARANTINE_MULT: 0.6,
    GUARDRAIL_TARGET_REPLY_RATE: 0.35,
    GUARDRAIL_COOLDOWN_HOURS: 48,
  });

  function service(port: PrismaService) {
    return new GuardrailService(
      port,
      new ReplyRateService(port, config),
      new EventBus(),
      config,
    );
  }

  beforeAll(async () => {
    fixture = await createGuardrailFixture();
  });
  afterEach(() => vi.useRealTimers());
  afterAll(async () => fixture?.dispose());

  it('migration mantém eventTs TIMESTAMP(3) sem fuso e DEFAULT CURRENT_TIMESTAMP', async () => {
    const columns = await fixture.prisma.$queryRaw<
      Array<{
        column_name: string;
        data_type: string;
        datetime_precision: number;
        column_default: string | null;
      }>
    >`
      SELECT column_name, data_type, datetime_precision, column_default
      FROM information_schema.columns
      WHERE table_schema = ${fixture.schema} AND table_name = 'session_guardrail'
        AND column_name IN ('eventTs', 'updatedAt') ORDER BY column_name`;
    expect(columns).toEqual([
      {
        column_name: 'eventTs',
        data_type: 'timestamp without time zone',
        datetime_precision: 3,
        column_default: 'CURRENT_TIMESTAMP',
      },
      {
        column_name: 'updatedAt',
        data_type: 'timestamp without time zone',
        datetime_precision: 3,
        column_default: null,
      },
    ]);
  });

  for (const timeZone of ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo']) {
    for (const mode of ['autocommit', 'transaction'] as const) {
      it(`${timeZone}/${mode}: getState persiste sentinela; ORM omitido materializa now Node`, async () => {
        const sessionId = `prisma-${timeZone}-${mode}`;
        const controlId = `control-${timeZone}-${mode}`;
        await fixture.seedSession(sessionId);
        await fixture.seedSession(controlId);
        const client = await fixture.client(timeZone);
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(nodeTime);

        async function probe(port: PrismaService) {
          if (mode === 'transaction') {
            await port.$queryRaw`SELECT set_config('TimeZone', ${timeZone}, true)`;
          }
          const [db] = await port.$queryRaw<
            Array<{ timezone: string; schema: string; clock: Date }>
          >`
            SELECT current_setting('TimeZone') AS timezone, current_schema() AS schema,
              (transaction_timestamp() AT TIME ZONE 'UTC')::timestamp(3) AS clock`;
          expect(db.timezone).toBe(timeZone);
          expect(db.schema).toBe(fixture.schema);
          expect(db.clock.getTime()).not.toBe(nodeTime.getTime());
          const row = await service(port).getState(sessionId);
          const [persisted] = await port.$queryRaw<
            Array<{ eventTs: Date; updatedAt: Date; state: string }>
          >`
            SELECT "eventTs", "updatedAt", state::text FROM session_guardrail
            WHERE "sessionId" = ${sessionId}`;
          expect(row.eventTs).toEqual(new Date(0));
          expect(row.updatedAt).toEqual(nodeTime);
          expect(persisted).toEqual({
            eventTs: new Date(0),
            updatedAt: nodeTime,
            state: 'ativa',
          });
          const control = await port.sessionGuardrail.create({
            data: { id: controlId, sessionId: controlId, state: 'ativa' },
          });
          expect(control.eventTs).toEqual(nodeTime);
          const [controlSql] = await port.$queryRaw<Array<{ eventTs: Date }>>`
            SELECT "eventTs" FROM session_guardrail WHERE "sessionId" = ${controlId}`;
          expect(controlSql.eventTs).toEqual(nodeTime);
        }

        if (mode === 'transaction') {
          await client.$transaction((tx) =>
            probe(tx as unknown as PrismaService),
          );
        } else {
          await probe(client as unknown as PrismaService);
        }

        const insert = fixture.queries.find(
          (query) =>
            query.query.startsWith('INSERT INTO') &&
            query.query.includes('"session_guardrail"') &&
            JSON.parse(query.params).includes(sessionId),
        );
        expect(
          insert,
          'consulta SQL real do upsert deve ter sido capturada',
        ).toBeDefined();
        const columns = insert!.query
          .match(/\(([^)]+)\) VALUES/)![1]
          .split(',')
          .map((column) => column.trim().replaceAll('"', ''));
        const params = JSON.parse(insert!.params) as unknown[];
        expect(columns).toContain('eventTs');
        expect(params[columns.indexOf('eventTs')]).toBe(
          new Date(0).toISOString(),
        );
        expect(params[columns.indexOf('updatedAt')]).toBe(
          nodeTime.toISOString(),
        );
        const controlInsert = fixture.queries.find(
          (query) =>
            query.query.startsWith('INSERT INTO') &&
            query.query.includes('"session_guardrail"') &&
            JSON.parse(query.params).includes(controlId),
        );
        expect(controlInsert).toBeDefined();
        const controlColumns = controlInsert!.query
          .match(/\(([^)]+)\) VALUES/)![1]
          .split(',')
          .map((column) => column.trim().replaceAll('"', ''));
        expect(
          JSON.parse(controlInsert!.params)[controlColumns.indexOf('eventTs')],
        ).toBe(nodeTime.toISOString());
      });
    }

    it(`${timeZone}: SQL omitindo eventTs usa relógio da transação e fuso do banco`, async () => {
      const sessionId = `sql-${timeZone}`;
      await fixture.seedSession(sessionId);
      const client = await fixture.client(timeZone);
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(nodeTime);

      await client.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('TimeZone', ${timeZone}, true)`;
        const [db] = await tx.$queryRaw<
          Array<{ timezone: string; schema: string; local: Date; utc: Date }>
        >`
          SELECT current_setting('TimeZone') AS timezone, current_schema() AS schema,
            transaction_timestamp()::timestamp(3) AS local,
            (transaction_timestamp() AT TIME ZONE 'UTC')::timestamp(3) AS utc`;
        expect(db.timezone).toBe(timeZone);
        expect(db.schema).toBe(fixture.schema);
        const [inserted] = await tx.$queryRaw<Array<{ eventTs: Date }>>`
          INSERT INTO session_guardrail (id, "sessionId", "updatedAt")
          VALUES (${`raw-${sessionId}`}, ${sessionId}, ${nodeTime}) RETURNING "eventTs"`;
        expect(inserted.eventTs).toEqual(db.local);
        expect(inserted.eventTs.getTime()).not.toBe(nodeTime.getTime());
        const row = await tx.sessionGuardrail.findUniqueOrThrow({
          where: { sessionId },
        });
        expect(row.eventTs).toEqual(db.local);
        expect(row.updatedAt).toEqual(nodeTime);
        // Adapter pg interpreta TIMESTAMP sem fuso como UTC. Deslocamento do controle
        // SQL direto, não do getState que envia o parâmetro do relógio Node.
        const offset =
          timeZone === 'UTC' ? 0 : timeZone === 'America/Sao_Paulo' ? -3 : 9;
        expect(row.eventTs.getTime() - db.utc.getTime()).toBe(
          offset * 3_600_000,
        );
      });
    });
  }
});
