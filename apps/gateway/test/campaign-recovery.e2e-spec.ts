import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { Env } from '../src/bootstrap/config';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { redisConnection } from '../src/infra/redis/redis-connection';
import { CampaignService } from '../src/modules/campaigns/application/campaign.service';
import {
  CampaignQueue,
  type CampaignJob,
} from '../src/modules/campaigns/infrastructure/campaign-queue';
import { CampaignRepository } from '../src/modules/campaigns/infrastructure/campaign.repository';
import { GuardrailService } from '../src/modules/guardrail/guardrail.service';
import {
  SessionManager,
  SessionNotWorkingError,
} from '../src/modules/sessions/application/session-manager.service';
import {
  LeaseLostError,
  PostgresSessionLease,
} from '../src/modules/sessions/infrastructure/postgres-session-lease';
import { createTestApp } from './setup-app';

// Redis DB 14 isola a fila real destes e2e dos Workers HTTP (NODE_ENV=test) e dos demais
// testes. O Postgres é o mesmo do gateway; sendText é sempre falso, sem conta/QR/rede WhatsApp.
describe('E14/P-057 — recuperação de campanhas no Postgres e Redis', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let repo: CampaignRepository;
  let queue: CampaignQueue | undefined;
  let inspect: Queue<CampaignJob> | undefined;
  let sessionId: string | undefined;
  let campaignId: string | undefined;
  let caseNo = 0;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    repo = new CampaignRepository(prisma);
  });

  afterEach(async () => {
    await queue?.onModuleDestroy();
    await inspect?.obliterate({ force: true });
    await inspect?.close();
    if (sessionId) {
      await prisma.waSession.deleteMany({ where: { id: sessionId } });
    }
    queue = undefined;
    inspect = undefined;
    sessionId = undefined;
    campaignId = undefined;
  });

  afterAll(async () => {
    await app?.close();
  });

  function testConfig(): ConfigService<Env, true> {
    const source = app.get(ConfigService<Env, true>);
    const redisUrl = source.get('REDIS_URL', { infer: true });
    if (!redisUrl) throw new Error('e2e precisa de REDIS_URL');
    const url = new URL(redisUrl);
    url.pathname = '/14';
    return {
      get: (key: string, options?: unknown) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'REDIS_URL') return url.toString();
        return source.get(key as never, options as never);
      },
    } as ConfigService<Env, true>;
  }

  async function setup(
    sendText: (to: string) => Promise<{ keyId: string; jid: string }>,
    readiness = Promise.resolve(),
    sendMedia?: (to: string) => Promise<{ keyId: string; jid: string }>,
  ): Promise<CampaignService> {
    caseNo += 1;
    sessionId = `e14-campaign-${caseNo}`;
    await prisma.waSession.deleteMany({ where: { id: sessionId } });
    await prisma.waSession.create({
      data: { id: sessionId, name: sessionId, autostart: false },
    });
    const config = testConfig();
    inspect = new Queue<CampaignJob>('campaigns', {
      connection: redisConnection(config),
    });
    await inspect.obliterate({ force: true });
    const manager = {
      whenRehydrated: () => readiness,
      sendText: vi.fn(async (_session: string, to: string) => sendText(to)),
      sendMedia: vi.fn(async (_session: string, to: string) =>
        sendMedia
          ? sendMedia(to)
          : { keyId: `fake-${to}`, jid: `${to}@s.whatsapp.net` },
      ),
      sendPresence: vi.fn(async () => undefined),
    } as unknown as SessionManager;
    queue = new CampaignQueue(config, repo, manager, app.get(GuardrailService));
    await queue.onModuleInit();
    queue.onApplicationBootstrap();
    return new CampaignService(repo, queue);
  }

  async function create(
    service: CampaignService,
    recipients: string[],
    mediaUrl?: string,
  ) {
    const c = await service.create(
      {
        sessionId: sessionId!,
        name: `e14-campaign-${caseNo}`,
        messageType: mediaUrl ? 'image' : 'text',
        text: 'teste sem envio',
        mediaUrl: mediaUrl ?? null,
        mediaMime: mediaUrl ? 'image/png' : null,
        fileName: null,
        minDelaySec: 1,
        maxDelaySec: 1,
        dailyCap: null,
        typingPreview: false,
        scheduledAt: null,
        recipients,
        firstContact: false,
      },
      false,
    );
    campaignId = c.id;
    return c;
  }

  async function recipients() {
    return repo.listRecipients(campaignId!);
  }

  it('PAUSED não cria laço; resume invalida jobs antigos e envia com intervalo global', async () => {
    const sendAt: number[] = [];
    const service = await setup(async (to) => {
      sendAt.push(Date.now());
      return { keyId: `fake-${to}`, jid: `${to}@s.whatsapp.net` };
    });
    const c = await create(service, ['5511999990001', '5511999990002']);
    await service.start(c.id);
    expect((await repo.findByIdOrThrow(c.id)).scheduleEpoch).toBe(1);
    await service.pause(c.id);

    // Pelo menos um job PAUSED passou pelo Worker real; ele não criou outro job de 30 s.
    await vi.waitFor(
      async () => {
        const counts = await inspect!.getJobCounts('completed');
        expect(counts.completed).toBeGreaterThanOrEqual(1);
      },
      { timeout: 15_000, interval: 250 },
    );
    const remaining = await inspect!.getJobCounts('wait', 'delayed', 'active');
    expect(
      remaining.wait + remaining.delayed + remaining.active,
    ).toBeLessThanOrEqual(1);
    expect(sendAt).toHaveLength(0);
    expect((await recipients()).every((r) => r.status === 'PENDING')).toBe(
      true,
    );

    await service.resume(c.id);
    expect((await repo.findByIdOrThrow(c.id)).scheduleEpoch).toBe(2);
    await vi.waitFor(
      async () => {
        expect(
          (await recipients()).filter((r) => r.status === 'SENT'),
        ).toHaveLength(2);
      },
      { timeout: 50_000, interval: 250 },
    );
    expect(sendAt).toHaveLength(2);
    expect(sendAt[1] - sendAt[0]).toBeGreaterThanOrEqual(7_500);
    expect((await recipients()).every((r) => r.attempts === 1)).toBe(true);
  }, 60_000);

  it('não consome antes da reidratação; sessão ainda fora de WORKING não vira FAILED', async () => {
    let releaseBoot!: () => void;
    const readiness = new Promise<void>((resolve) => {
      releaseBoot = resolve;
    });
    let working = false;
    const calls = vi.fn(async (to: string) => {
      if (!working)
        throw new SessionNotWorkingError('Sessão não está conectada');
      return { keyId: `fake-${to}`, jid: `${to}@s.whatsapp.net` };
    });
    const service = await setup(calls, readiness);
    const c = await create(service, ['5511999990003']);
    await service.start(c.id);
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    expect(calls).not.toHaveBeenCalled();
    expect((await recipients())[0]).toMatchObject({
      status: 'PENDING',
      attempts: 0,
      reservedAt: null,
    });

    releaseBoot();
    await vi.waitFor(
      async () => {
        expect(calls).toHaveBeenCalledOnce();
        expect((await inspect!.getJobCounts('delayed')).delayed).toBe(1);
      },
      { timeout: 12_000, interval: 250 },
    );
    expect((await recipients())[0]).toMatchObject({
      status: 'PENDING',
      attempts: 0,
      reservedAt: null,
      error: null,
    });
    working = true;
    await vi.waitFor(
      async () => {
        expect((await recipients())[0].status).toBe('SENT');
      },
      { timeout: 20_000, interval: 250 },
    );
    expect(calls).toHaveBeenCalledTimes(2);
  }, 35_000);

  it('réplica sem lease libera reserva; após takeover, o mesmo destinatário é enviado uma vez', async () => {
    const first = new PostgresSessionLease(prisma);
    const standby = new PostgresSessionLease(prisma);
    const send = vi.fn(async (to: string) => {
      if (
        !standbyEpoch ||
        !(await standby.isCurrent(sessionId!, standbyEpoch))
      ) {
        throw new LeaseLostError();
      }
      return { keyId: `fake-${to}`, jid: `${to}@s.whatsapp.net` };
    });
    let standbyEpoch: bigint | null = null;
    const service = await setup(send);
    const c = await create(service, ['5511999990004']);
    const firstFence = await first.acquire(sessionId!);
    expect(firstFence).not.toBeNull();
    expect(await standby.acquire(sessionId!)).toBeNull();
    await service.start(c.id);
    await vi.waitFor(
      async () => {
        expect(send).toHaveBeenCalledOnce();
        expect((await inspect!.getJobCounts('delayed')).delayed).toBe(1);
      },
      { timeout: 12_000, interval: 250 },
    );
    expect((await recipients())[0]).toMatchObject({
      status: 'PENDING',
      attempts: 0,
      reservedAt: null,
    });
    await first.release(sessionId!, firstFence!.epoch);
    standbyEpoch = (await standby.acquire(sessionId!))?.epoch ?? null;
    expect(standbyEpoch).not.toBeNull();
    await vi.waitFor(
      async () => {
        expect((await recipients())[0].status).toBe('SENT');
      },
      { timeout: 20_000, interval: 250 },
    );
    expect(send).toHaveBeenCalledTimes(2);
    expect((await recipients())[0].keyId).toBe('fake-5511999990004');
  }, 35_000);

  it('reserva ainda em voo permanece pendente até expirar e não perde o job da retomada', async () => {
    const send = vi.fn(async (to: string) => ({
      keyId: `fake-${to}`,
      jid: `${to}@s.whatsapp.net`,
    }));
    const service = await setup(send);
    const c = await create(service, ['5511999990005']);
    const recipient = (await recipients())[0];
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        reservedAt: new Date(Date.now() - 590_000),
        attempts: 1,
      },
    });
    await service.start(c.id);
    const jobId = `campaign-${c.id}-e1-${recipient.id}`;
    await vi.waitFor(
      async () => {
        const job = await inspect!.getJob(jobId);
        expect(job?.attemptsStarted).toBeGreaterThanOrEqual(1);
        expect((await inspect!.getJobCounts('delayed')).delayed).toBe(1);
      },
      { timeout: 12_000, interval: 250 },
    );
    expect(send).not.toHaveBeenCalled();
    expect((await recipients())[0]).toMatchObject({
      status: 'PENDING',
      attempts: 1,
      error: null,
    });
    await vi.waitFor(
      async () => {
        expect((await recipients())[0].status).toBe('SENT');
      },
      { timeout: 20_000, interval: 250 },
    );
    expect(send).toHaveBeenCalledOnce();
    expect((await recipients())[0].attempts).toBe(2);
  }, 30_000);

  it('falha parcial no enfileiramento pausa e permite reagendar todos os pendentes', async () => {
    const send = vi.fn(async (to: string) => ({
      keyId: `fake-${to}`,
      jid: `${to}@s.whatsapp.net`,
    }));
    const service = await setup(send);
    const c = await create(service, ['5511999990006', '5511999990007']);
    const enqueue = queue!.enqueueSend.bind(queue!);
    const broken = vi
      .spyOn(queue!, 'enqueueSend')
      .mockImplementationOnce(enqueue)
      .mockRejectedValueOnce(new Error('Redis indisponível'));
    await expect(service.start(c.id)).rejects.toThrow('Redis indisponível');
    broken.mockRestore();
    expect(await repo.findByIdOrThrow(c.id)).toMatchObject({
      status: 'PAUSED',
      scheduleEpoch: 1,
    });
    expect((await recipients()).every((r) => r.status === 'PENDING')).toBe(
      true,
    );

    await service.resume(c.id);
    await vi.waitFor(
      async () => {
        expect(
          (await recipients()).filter((r) => r.status === 'SENT'),
        ).toHaveLength(2);
      },
      { timeout: 30_000, interval: 250 },
    );
    expect((await repo.findByIdOrThrow(c.id)).scheduleEpoch).toBe(2);
    expect(send).toHaveBeenCalledTimes(2);
    expect((await recipients()).every((r) => r.attempts === 1)).toBe(true);
  }, 35_000);

  it('pausa durante download de mídia não envia nem falha o destinatário', async () => {
    const oldAllowHosts = process.env.EGRESS_ALLOW_HOSTS;
    process.env.EGRESS_ALLOW_HOSTS = '127.0.0.1';
    let release!: () => void;
    let requested!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const requestSeen = new Promise<void>((resolve) => (requested = resolve));
    const server = createServer(async (_req, res) => {
      requested();
      await held;
      res.writeHead(200, { 'content-type': 'image/png' });
      res.end(Buffer.from('fake-image'));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    try {
      const mediaUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/image`;
      const sendMedia = vi.fn(async (to: string) => ({
        keyId: `fake-${to}`,
        jid: `${to}@s.whatsapp.net`,
      }));
      const service = await setup(
        async () => {
          throw new Error('não deveria enviar texto');
        },
        Promise.resolve(),
        sendMedia,
      );
      const c = await create(service, ['5511999990008'], mediaUrl);
      await service.start(c.id);
      await requestSeen;
      await service.pause(c.id);
      release();
      await vi.waitFor(
        async () => {
          expect((await inspect!.getJobCounts('completed')).completed).toBe(1);
        },
        { timeout: 10_000, interval: 250 },
      );
      expect(sendMedia).not.toHaveBeenCalled();
      expect((await recipients())[0]).toMatchObject({
        status: 'PENDING',
        attempts: 0,
        reservedAt: null,
      });
      await service.resume(c.id);
      await vi.waitFor(
        async () => expect((await recipients())[0].status).toBe('SENT'),
        { timeout: 20_000, interval: 250 },
      );
      expect(sendMedia).toHaveBeenCalledOnce();
    } finally {
      release();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (oldAllowHosts === undefined) delete process.env.EGRESS_ALLOW_HOSTS;
      else process.env.EGRESS_ALLOW_HOSTS = oldAllowHosts;
    }
  }, 35_000);

  it('downloads concorrentes de mídia ainda espaçam os envios efetivos', async () => {
    const oldAllowHosts = process.env.EGRESS_ALLOW_HOSTS;
    process.env.EGRESS_ALLOW_HOSTS = '127.0.0.1';
    let release!: () => void;
    let bothRequested!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const both = new Promise<void>((resolve) => (bothRequested = resolve));
    let requests = 0;
    const server = createServer(async (_req, res) => {
      requests += 1;
      if (requests === 2) bothRequested();
      await held;
      res.writeHead(200, { 'content-type': 'image/png' });
      res.end(Buffer.from('fake-image'));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    try {
      const mediaUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/image`;
      const sendAt: number[] = [];
      const service = await setup(
        async () => {
          throw new Error('não deveria enviar texto');
        },
        Promise.resolve(),
        async (to) => {
          sendAt.push(Date.now());
          return { keyId: `fake-${to}`, jid: `${to}@s.whatsapp.net` };
        },
      );
      const c = await create(
        service,
        ['5511999990009', '5511999990010'],
        mediaUrl,
      );
      await service.start(c.id);
      await both;
      release();
      await vi.waitFor(
        async () =>
          expect(
            (await recipients()).filter((r) => r.status === 'SENT'),
          ).toHaveLength(2),
        { timeout: 30_000, interval: 250 },
      );
      expect(sendAt).toHaveLength(2);
      expect(sendAt[1] - sendAt[0]).toBeGreaterThanOrEqual(7_500);
    } finally {
      release();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (oldAllowHosts === undefined) delete process.env.EGRESS_ALLOW_HOSTS;
      else process.env.EGRESS_ALLOW_HOSTS = oldAllowHosts;
    }
  }, 45_000);
});
