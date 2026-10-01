import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignQueue } from '../infrastructure/campaign-queue';
import type { CampaignRepository } from '../infrastructure/campaign.repository';
import { CampaignService } from './campaign.service';

type Campaign = Awaited<ReturnType<CampaignRepository['findByIdOrThrow']>>;
type Recipient = Awaited<
  ReturnType<CampaignRepository['listPendingRecipients']>
>[number];
type Method = 'start' | 'resume';
type AsyncPort<T> = T extends (...args: infer Args) => infer Result
  ? (...args: Args) => Promise<Awaited<Result>>
  : never;

const NOW = new Date('2026-10-01T04:00:00.000Z');
const ID = 'synthetic-campaign';
const METHODS: Method[] = ['start', 'resume'];
// A ordem vem do repositório, sem uma segunda ordenação por ID no serviço.
const RECIPIENT_IDS = ['recipient-z', 'recipient-a', 'recipient-m'];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function setup(
  method: Method,
  overrides: Partial<Campaign> = {},
  recipientIds = RECIPIENT_IDS,
  epoch: number | null = 17,
) {
  const campaign: Campaign = {
    id: ID,
    sessionId: 'synthetic-session',
    name: 'Campanha sintética',
    messageType: 'text',
    text: 'Fixture de agendamento sem transporte',
    mediaUrl: null,
    mediaMime: null,
    fileName: null,
    minDelaySec: 8,
    maxDelaySec: 10,
    dailyCap: null,
    typingPreview: false,
    firstContact: false,
    status: method === 'start' ? 'DRAFT' : 'PAUSED',
    scheduleEpoch: 41,
    total: recipientIds.length,
    sentCount: 0,
    failedCount: 0,
    scheduledAt: null,
    startedAt: null,
    finishedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  const pending: Recipient[] = recipientIds.map((id) => ({
    id,
    campaignId: ID,
    to: `synthetic-${id}`,
    status: 'PENDING',
    keyId: null,
    error: null,
    sentAt: null,
    reservedAt: null,
    attempts: 0,
    createdAt: NOW,
  }));
  const repo = {
    findByIdOrThrow: vi.fn<AsyncPort<CampaignRepository['findByIdOrThrow']>>(
      async () => campaign,
    ),
    transitionToRunning: vi.fn<
      AsyncPort<CampaignRepository['transitionToRunning']>
    >(async () => epoch),
    listPendingRecipients: vi.fn<
      AsyncPort<CampaignRepository['listPendingRecipients']>
    >(async () => pending),
    pauseIfRunning: vi.fn<AsyncPort<CampaignRepository['pauseIfRunning']>>(
      async () => ({ count: 1 }),
    ),
    updateStatus: vi.fn<AsyncPort<CampaignRepository['updateStatus']>>(
      async () => campaign,
    ),
  };
  const queue = {
    enqueueSend: vi.fn<CampaignQueue['enqueueSend']>(async () => undefined),
  };
  // Somente as portas são falsas: start/resume e o scheduler privado são os reais.
  const service = new CampaignService(
    repo as unknown as CampaignRepository,
    queue as unknown as CampaignQueue,
  );
  return {
    service,
    repo,
    queue,
    campaign,
    pending,
    run: () => service[method](ID),
  };
}

function expectedCalls(delays: number[]) {
  return [
    [
      { campaignId: ID, recipientId: 'recipient-z', scheduleEpoch: 17 },
      delays[0],
      'campaign-synthetic-campaign-e17-recipient-z',
    ],
    [
      { campaignId: ID, recipientId: 'recipient-a', scheduleEpoch: 17 },
      delays[1],
      'campaign-synthetic-campaign-e17-recipient-a',
    ],
    [
      { campaignId: ID, recipientId: 'recipient-m', scheduleEpoch: 17 },
      delays[2],
      'campaign-synthetic-campaign-e17-recipient-m',
    ],
  ];
}

describe('CampaignService — agendamento por start/resume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe.each(METHODS)('%s', (method) => {
    it.each([
      {
        name: 'futuro acrescenta offset fixo',
        scheduledAt: new Date('2026-10-01T04:01:00.000Z'),
        delays: [68_000, 78_000, 87_000],
      },
      {
        name: 'passado usa offset zero',
        scheduledAt: new Date('2026-10-01T03:59:00.000Z'),
        delays: [8_000, 18_000, 27_000],
      },
      {
        name: 'igual ao relógio usa offset zero',
        scheduledAt: NOW,
        delays: [8_000, 18_000, 27_000],
      },
      {
        name: 'null usa offset zero',
        scheduledAt: null,
        delays: [8_000, 18_000, 27_000],
      },
    ])(
      '$name; primeiro destinatário tem jitter e os demais acumulam',
      async ({ scheduledAt, delays }) => {
        vi.mocked(Math.random)
          .mockReturnValueOnce(0)
          .mockReturnValueOnce(1 - 2 ** -53)
          .mockReturnValueOnce(0.5);
        const h = setup(method, { scheduledAt });

        await expect(h.run()).resolves.toBeUndefined();

        expect(h.repo.findByIdOrThrow).toHaveBeenCalledExactlyOnceWith(ID);
        expect(h.repo.transitionToRunning).toHaveBeenCalledExactlyOnceWith(
          ID,
          NOW,
        );
        expect(h.repo.listPendingRecipients).toHaveBeenCalledExactlyOnceWith(
          ID,
        );
        expect(h.queue.enqueueSend.mock.calls).toEqual(expectedCalls(delays));
        expect(Math.random).toHaveBeenCalledTimes(3);
        expect(h.repo.pauseIfRunning).not.toHaveBeenCalled();
        expect(h.repo.updateStatus).not.toHaveBeenCalled();
      },
    );

    it.each([
      { random: 0, delay: 2_000 },
      { random: 0.2, delay: 2_000 },
      { random: 0.32, delay: 2_000 },
      { random: 1 / 3 - Number.EPSILON, delay: 2_000 },
      { random: 1 / 3, delay: 3_000 },
      { random: 0.34, delay: 3_000 },
      { random: 0.6, delay: 3_000 },
      { random: 0.66, delay: 3_000 },
      { random: 2 / 3 - Number.EPSILON, delay: 3_000 },
      { random: 2 / 3, delay: 4_000 },
      { random: 0.67, delay: 4_000 },
      { random: 1 - 2 ** -53, delay: 4_000 },
    ])(
      'jitter inteiro inclusivo: random=$random produz $delay ms',
      async ({ random, delay }) => {
        vi.mocked(Math.random).mockReturnValue(random);
        const h = setup(method, { minDelaySec: 2, maxDelaySec: 4 }, [
          'recipient-z',
        ]);

        await h.run();

        expect(h.queue.enqueueSend).toHaveBeenCalledExactlyOnceWith(
          { campaignId: ID, recipientId: 'recipient-z', scheduleEpoch: 17 },
          delay,
          'campaign-synthetic-campaign-e17-recipient-z',
        );
        expect(Math.random).toHaveBeenCalledOnce();
      },
    );

    it('min=max conserva intervalo fixo mesmo nos extremos do RNG', async () => {
      vi.mocked(Math.random)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(1 - 2 ** -53)
        .mockReturnValueOnce(0.6);
      const h = setup(method, { minDelaySec: 12, maxDelaySec: 12 });

      await h.run();

      expect(h.queue.enqueueSend.mock.calls).toEqual(
        expectedCalls([12_000, 24_000, 36_000]),
      );
      expect(Math.random).toHaveBeenCalledTimes(3);
    });

    it('lista vazia não agenda, não sorteia nem marca DONE', async () => {
      const h = setup(method, {}, []);

      await expect(h.run()).resolves.toBeUndefined();

      expect(h.repo.transitionToRunning).toHaveBeenCalledExactlyOnceWith(
        ID,
        NOW,
      );
      expect(h.repo.listPendingRecipients).toHaveBeenCalledExactlyOnceWith(ID);
      expect(h.queue.enqueueSend).not.toHaveBeenCalled();
      expect(Math.random).not.toHaveBeenCalled();
      expect(h.repo.pauseIfRunning).not.toHaveBeenCalled();
      expect(h.repo.updateStatus).not.toHaveBeenCalled();
    });

    it('offset futuro permanece fixo mesmo se o relógio avançar entre enqueues', async () => {
      vi.mocked(Math.random)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(1 - 2 ** -53)
        .mockReturnValueOnce(0.5);
      const h = setup(method, {
        scheduledAt: new Date('2026-10-01T04:01:00.000Z'),
      });
      h.queue.enqueueSend.mockImplementationOnce(async () => {
        vi.setSystemTime(new Date('2026-10-01T04:00:20.000Z'));
      });

      await h.run();

      expect(h.queue.enqueueSend.mock.calls).toEqual(
        expectedCalls([68_000, 78_000, 87_000]),
      );
      expect(Math.random).toHaveBeenCalledTimes(3);
    });

    it('offset usa o relógio após a listagem pendente resolver', async () => {
      vi.mocked(Math.random)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(1 - 2 ** -53)
        .mockReturnValueOnce(0.5);
      const h = setup(method, {
        scheduledAt: new Date('2026-10-01T04:01:00.000Z'),
      });
      const listing = deferred<void>();
      const listed = deferred<Recipient[]>();
      h.repo.listPendingRecipients.mockImplementationOnce(() => {
        listing.resolve(undefined);
        return listed.promise;
      });
      const running = h.run();
      await listing.promise;

      expect(h.queue.enqueueSend).not.toHaveBeenCalled();
      expect(Math.random).not.toHaveBeenCalled();
      vi.setSystemTime(new Date('2026-10-01T04:00:20.000Z'));
      listed.resolve(h.pending);
      await running;

      expect(h.queue.enqueueSend.mock.calls).toEqual(
        expectedCalls([48_000, 58_000, 67_000]),
      );
      expect(h.repo.transitionToRunning).toHaveBeenCalledExactlyOnceWith(
        ID,
        NOW,
      );
      expect(Math.random).toHaveBeenCalledTimes(3);
    });

    it('época zero devolvida pelo CAS é válida e substitui a do snapshot', async () => {
      const h = setup(method, { scheduleEpoch: 41 }, ['recipient-z'], 0);

      await h.run();

      expect(h.queue.enqueueSend).toHaveBeenCalledExactlyOnceWith(
        { campaignId: ID, recipientId: 'recipient-z', scheduleEpoch: 0 },
        9_000,
        'campaign-synthetic-campaign-e0-recipient-z',
      );
      expect(h.repo.pauseIfRunning).not.toHaveBeenCalled();
    });

    it.each([
      { name: 'sem startedAt usa o relógio atual', startedAt: null },
      {
        name: 'startedAt existente é conservado',
        startedAt: new Date('2026-09-28T03:00:00.000Z'),
      },
    ])('$name na transição', async ({ startedAt }) => {
      const h = setup(method, { startedAt }, []);

      await h.run();

      expect(h.repo.transitionToRunning).toHaveBeenCalledExactlyOnceWith(
        ID,
        startedAt ?? NOW,
      );
    });

    it('CAS perdida encerra antes de consultar pendentes/sortear/agendar', async () => {
      const h = setup(method, {}, RECIPIENT_IDS, null);

      await expect(h.run()).resolves.toBeUndefined();

      expect(h.repo.transitionToRunning).toHaveBeenCalledExactlyOnceWith(
        ID,
        NOW,
      );
      expect(h.repo.listPendingRecipients).not.toHaveBeenCalled();
      expect(h.queue.enqueueSend).not.toHaveBeenCalled();
      expect(Math.random).not.toHaveBeenCalled();
      expect(h.repo.pauseIfRunning).not.toHaveBeenCalled();
    });

    it('dois pedidos concorrentes que veem o mesmo snapshot agendam só o vencedor do CAS', async () => {
      const h = setup(method);
      const winner = deferred<number | null>();
      const loser = deferred<number | null>();
      const bothEntered = deferred<void>();
      h.repo.transitionToRunning
        .mockImplementationOnce(() => winner.promise)
        .mockImplementationOnce(() => {
          bothEntered.resolve(undefined);
          return loser.promise;
        });
      const first = h.run();
      const second = h.run();
      await bothEntered.promise;

      loser.resolve(null);
      await second;
      expect(h.repo.listPendingRecipients).not.toHaveBeenCalled();
      expect(h.queue.enqueueSend).not.toHaveBeenCalled();
      winner.resolve(17);
      await first;

      expect(h.repo.findByIdOrThrow).toHaveBeenCalledTimes(2);
      expect(h.repo.transitionToRunning).toHaveBeenCalledTimes(2);
      expect(h.repo.listPendingRecipients).toHaveBeenCalledExactlyOnceWith(ID);
      expect(h.queue.enqueueSend.mock.calls).toEqual(
        expectedCalls([9_000, 18_000, 27_000]),
      );
      expect(Math.random).toHaveBeenCalledTimes(3);
      expect(h.repo.pauseIfRunning).not.toHaveBeenCalled();
    });

    it.each(['lookup', 'transition'] as const)(
      'erro de %s antes do agendamento propaga sem tentar pausar',
      async (source) => {
        const h = setup(method);
        const error = new Error(`Falha sintética: ${source}`);
        if (source === 'lookup')
          h.repo.findByIdOrThrow.mockRejectedValueOnce(error);
        else h.repo.transitionToRunning.mockRejectedValueOnce(error);

        await expect(h.run()).rejects.toBe(error);

        expect(h.repo.findByIdOrThrow).toHaveBeenCalledExactlyOnceWith(ID);
        expect(h.repo.transitionToRunning).toHaveBeenCalledTimes(
          source === 'lookup' ? 0 : 1,
        );
        expect(h.repo.listPendingRecipients).not.toHaveBeenCalled();
        expect(h.queue.enqueueSend).not.toHaveBeenCalled();
        expect(Math.random).not.toHaveBeenCalled();
        expect(h.repo.pauseIfRunning).not.toHaveBeenCalled();
      },
    );

    it('erro ao listar pendentes pausa a época adquirida e propaga a mesma falha', async () => {
      const h = setup(method);
      const error = new Error('Falha sintética na listagem');
      h.repo.listPendingRecipients.mockRejectedValueOnce(error);

      await expect(h.run()).rejects.toBe(error);

      expect(h.repo.pauseIfRunning).toHaveBeenCalledExactlyOnceWith(ID, 17);
      expect(h.queue.enqueueSend).not.toHaveBeenCalled();
      expect(Math.random).not.toHaveBeenCalled();
    });

    it.each([1, 2])(
      'falha no enqueue %i pausa a mesma época e interrompe o restante',
      async (failureAt) => {
        const h = setup(method);
        const error = new Error('Redis sintético indisponível');
        if (failureAt === 2)
          h.queue.enqueueSend.mockResolvedValueOnce(undefined);
        h.queue.enqueueSend.mockRejectedValueOnce(error);

        await expect(h.run()).rejects.toBe(error);

        expect(h.queue.enqueueSend.mock.calls).toEqual(
          expectedCalls([9_000, 18_000, 27_000]).slice(0, failureAt),
        );
        expect(Math.random).toHaveBeenCalledTimes(failureAt);
        expect(h.repo.pauseIfRunning).toHaveBeenCalledExactlyOnceWith(ID, 17);
        expect(h.repo.updateStatus).not.toHaveBeenCalled();
      },
    );

    it('aguarda o enqueue de um destinatário antes de sortear/enfileirar o próximo', async () => {
      const h = setup(method);
      const firstQueued = deferred<void>();
      const firstEnqueue = deferred<unknown>();
      h.queue.enqueueSend.mockImplementationOnce(() => {
        firstQueued.resolve(undefined);
        return firstEnqueue.promise;
      });
      const running = h.run();
      await firstQueued.promise;

      expect(h.queue.enqueueSend.mock.calls).toEqual(
        expectedCalls([9_000, 18_000, 27_000]).slice(0, 1),
      );
      expect(Math.random).toHaveBeenCalledOnce();
      firstEnqueue.resolve(undefined);
      await running;

      expect(h.queue.enqueueSend.mock.calls).toEqual(
        expectedCalls([9_000, 18_000, 27_000]),
      );
      expect(Math.random).toHaveBeenCalledTimes(3);
    });

    it('aguarda a pausa cercada, inclusive CAS sem efeito, antes de propagar a falha', async () => {
      const h = setup(method);
      const error = new Error('Falha sintética de enqueue');
      const pausing = deferred<void>();
      const paused = deferred<{ count: number }>();
      let outcome: unknown = 'pending';
      h.queue.enqueueSend.mockRejectedValueOnce(error);
      h.repo.pauseIfRunning.mockImplementationOnce(() => {
        pausing.resolve(undefined);
        return paused.promise;
      });
      const running = h.run().then(
        () => {
          outcome = 'resolved';
        },
        (reason: unknown) => {
          outcome = reason;
        },
      );
      await pausing.promise;
      // Permite propagar uma rejeição prematura antes de verificar a barreira,
      // sem resolver a porta de pausa nem alterar o relógio.
      await vi.advanceTimersByTimeAsync(0);

      expect(h.repo.pauseIfRunning).toHaveBeenCalledExactlyOnceWith(ID, 17);
      expect(outcome).toBe('pending');
      expect(h.queue.enqueueSend).toHaveBeenCalledOnce();
      paused.resolve({ count: 0 });
      await running;

      expect(outcome).toBe(error);
      expect(h.queue.enqueueSend).toHaveBeenCalledOnce();
    });

    it('se a própria pausa falhar, propaga essa falha conforme política atual', async () => {
      const h = setup(method);
      const enqueueError = new Error('Falha sintética de enqueue');
      const pauseError = new Error('Falha sintética de pausa');
      h.queue.enqueueSend.mockRejectedValueOnce(enqueueError);
      h.repo.pauseIfRunning.mockRejectedValueOnce(pauseError);

      await expect(h.run()).rejects.toBe(pauseError);

      expect(h.repo.pauseIfRunning).toHaveBeenCalledExactlyOnceWith(ID, 17);
      expect(h.queue.enqueueSend).toHaveBeenCalledOnce();
    });
  });

  it('start aceita campanha PAUSED e usa a época devolvida pela transição', async () => {
    const h = setup('start', { status: 'PAUSED' }, ['recipient-z']);

    await h.run();

    expect(h.repo.transitionToRunning).toHaveBeenCalledExactlyOnceWith(ID, NOW);
    expect(h.queue.enqueueSend).toHaveBeenCalledExactlyOnceWith(
      { campaignId: ID, recipientId: 'recipient-z', scheduleEpoch: 17 },
      9_000,
      'campaign-synthetic-campaign-e17-recipient-z',
    );
  });

  it.each([
    { method: 'start' as const, status: 'RUNNING' as const },
    { method: 'resume' as const, status: 'DRAFT' as const },
    { method: 'resume' as const, status: 'RUNNING' as const },
    { method: 'resume' as const, status: 'DONE' as const },
    { method: 'resume' as const, status: 'CANCELLED' as const },
  ])('$method em $status é no-op antes do CAS', async ({ method, status }) => {
    const h = setup(method, { status });

    await expect(h.run()).resolves.toBeUndefined();

    expect(h.repo.findByIdOrThrow).toHaveBeenCalledExactlyOnceWith(ID);
    expect(h.repo.transitionToRunning).not.toHaveBeenCalled();
    expect(h.repo.listPendingRecipients).not.toHaveBeenCalled();
    expect(h.queue.enqueueSend).not.toHaveBeenCalled();
    expect(Math.random).not.toHaveBeenCalled();
    expect(h.repo.pauseIfRunning).not.toHaveBeenCalled();
  });

  it.each(['DONE', 'CANCELLED'] as const)(
    'start rejeita %s antes do CAS e de qualquer agendamento',
    async (status) => {
      const h = setup('start', { status });

      await expect(h.run()).rejects.toThrow(
        'Campanha finalizada — não pode reiniciar',
      );

      expect(h.repo.findByIdOrThrow).toHaveBeenCalledExactlyOnceWith(ID);
      expect(h.repo.transitionToRunning).not.toHaveBeenCalled();
      expect(h.repo.listPendingRecipients).not.toHaveBeenCalled();
      expect(h.queue.enqueueSend).not.toHaveBeenCalled();
      expect(Math.random).not.toHaveBeenCalled();
      expect(h.repo.pauseIfRunning).not.toHaveBeenCalled();
    },
  );

  it('resume após falha parcial agenda todos os PENDING com época e IDs novos', async () => {
    const h = setup('start');
    const error = new Error('Falha sintética no segundo enqueue');
    h.queue.enqueueSend
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error);
    await expect(h.service.start(ID)).rejects.toBe(error);
    expect(h.repo.pauseIfRunning).toHaveBeenCalledExactlyOnceWith(ID, 17);

    // A porta devolve o estado PAUSED observado e uma nova época; a transação SQL
    // e o consumo/no-op dos jobs antigos continuam provados nos e2e existentes.
    h.repo.findByIdOrThrow.mockResolvedValueOnce({
      ...h.campaign,
      status: 'PAUSED',
      scheduleEpoch: 17,
      startedAt: NOW,
    });
    h.repo.transitionToRunning.mockResolvedValueOnce(18);
    await h.service.resume(ID);

    expect(h.repo.listPendingRecipients).toHaveBeenCalledTimes(2);
    expect(h.repo.transitionToRunning.mock.calls).toEqual([
      [ID, NOW],
      [ID, NOW],
    ]);
    expect(h.queue.enqueueSend.mock.calls).toEqual([
      ...expectedCalls([9_000, 18_000, 27_000]).slice(0, 2),
      [
        { campaignId: ID, recipientId: 'recipient-z', scheduleEpoch: 18 },
        9_000,
        'campaign-synthetic-campaign-e18-recipient-z',
      ],
      [
        { campaignId: ID, recipientId: 'recipient-a', scheduleEpoch: 18 },
        18_000,
        'campaign-synthetic-campaign-e18-recipient-a',
      ],
      [
        { campaignId: ID, recipientId: 'recipient-m', scheduleEpoch: 18 },
        27_000,
        'campaign-synthetic-campaign-e18-recipient-m',
      ],
    ]);
    expect(Math.random).toHaveBeenCalledTimes(5);
    expect(h.repo.pauseIfRunning).toHaveBeenCalledOnce();
  });
});
