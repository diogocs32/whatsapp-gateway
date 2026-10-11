// E28 · P-107 · D-051 — ProxyService: uso por proxy, exclusão em lote e compartilhamento opt-in
// (`allowShared`), com repositório falso em memória.
import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Proxy } from '../domain/proxy.entity';
import type { ProxyStatus } from '../domain/proxy-types';
import type { ProxyUsageSession } from '../domain/proxy-usage';
import type {
  DeletedProxy,
  SetAssignmentInput,
} from '../domain/proxy.repository';
import { ProxyService } from './proxy.service';
import { ProxyUnavailableError } from './proxy-unavailable.error';

function makeProxy(
  id: string,
  position: number,
  opts: { enabled?: boolean; status?: ProxyStatus } = {},
): Proxy {
  return new Proxy(
    id,
    position,
    null,
    'HTTP',
    `10.0.0.${position}`,
    8080,
    null,
    null,
    'MANUAL',
    'BR',
    null,
    null,
    opts.status ?? 'ALIVE',
    opts.enabled ?? true,
  );
}

// Só o que estes caminhos usam. `usage` = mapa do domínio (proxyId → sessões vivas);
// `usedProxyIds` imita a régua do repositório (todas as sessões menos a própria); `singlePins` =
// SINGLE atual de cada sessão viva; `deleteMany` devolve o uso do momento da exclusão (sob o lock).
class FakeProxyRepo {
  proxies = new Map<string, Proxy>();
  usage = new Map<string, ProxyUsageSession[]>();
  singlePins = new Map<string, string>();
  calls: string[] = [];

  list = vi.fn(async () =>
    [...this.proxies.values()].sort((a, b) => a.position - b.position),
  );
  findById = vi.fn(async (id: string) => this.proxies.get(id) ?? null);
  proxyUsage = vi.fn(async () => {
    this.calls.push('proxyUsage');
    return new Map(this.usage);
  });
  usedProxyIds = vi.fn(async (excludeSessionId?: string) =>
    [...this.usage.entries()]
      .filter(([, sessions]) => sessions.some((s) => s.id !== excludeSessionId))
      .map(([proxyId]) => proxyId),
  );
  deleteMany = vi.fn(async (ids: readonly string[]) => {
    this.calls.push('deleteMany');
    const out: DeletedProxy[] = [];
    for (const p of [...this.proxies.values()].sort(
      (a, b) => a.position - b.position,
    )) {
      if (ids.includes(p.id)) {
        out.push({
          id: p.id,
          position: p.position,
          sessions: this.usage.get(p.id) ?? [],
        });
        this.proxies.delete(p.id);
      }
    }
    return out;
  });
  liveSinglePin = vi.fn(
    async (sessionId: string) => this.singlePins.get(sessionId) ?? null,
  );
  setAssignment = vi.fn(async (input: SetAssignmentInput) => ({
    sessionId: input.sessionId,
    mode: input.mode,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    strategy: input.strategy,
    currentProxyId: input.currentProxyId ?? null,
  }));
}

function setup() {
  const repo = new FakeProxyRepo();
  const service = new ProxyService(repo as never, {} as never, {} as never);
  return { repo, service };
}

let logSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProxyService.listWithUsage', () => {
  it('cada proxy do pool, em ordem de posição, com as sessões que o usam', async () => {
    const { repo, service } = setup();
    repo.proxies.set('P2', makeProxy('P2', 2));
    repo.proxies.set('P1', makeProxy('P1', 1));
    repo.usage.set('P2', [
      { id: 'S1', name: 'alfa' },
      { id: 'S2', name: 'beta' },
    ]);

    const out = await service.listWithUsage();

    expect(out.map((x) => x.proxy.id)).toEqual(['P1', 'P2']);
    expect(out[0].sessions).toEqual([]);
    expect(out[1].sessions.map((s) => s.name)).toEqual(['alfa', 'beta']);
  });

  it('proxy usado só por atribuição órfã não aparece no mapa → sessões vazias', async () => {
    const { repo, service } = setup();
    repo.proxies.set('P1', makeProxy('P1', 1));
    // o domínio já descartou a órfã: o mapa não tem P1
    const out = await service.listWithUsage();
    expect(out).toEqual([{ proxy: repo.proxies.get('P1'), sessions: [] }]);
  });
});

describe('ProxyService.removeMany', () => {
  it('apaga os existentes, devolve a contagem e os inexistentes em notFound', async () => {
    const { repo, service } = setup();
    repo.proxies.set('P1', makeProxy('P1', 1));
    repo.proxies.set('P2', makeProxy('P2', 2));
    repo.proxies.set('P3', makeProxy('P3', 3));

    const r = await service.removeMany(['P3', 'X', 'P1']);

    expect(r).toEqual({ deleted: 2, notFound: ['X'] });
    expect([...repo.proxies.keys()]).toEqual(['P2']);
  });

  it('ids repetidos contam uma vez (o repositório recebe a lista sem repetição, na ordem)', async () => {
    const { repo, service } = setup();
    repo.proxies.set('P1', makeProxy('P1', 1));

    const r = await service.removeMany(['P1', 'P1', 'X', 'X']);

    expect(repo.deleteMany).toHaveBeenCalledExactlyOnceWith(['P1', 'X']);
    expect(r).toEqual({ deleted: 1, notFound: ['X'] });
  });

  it('o aviso usa o uso devolvido pela própria exclusão (lido sob o lock), sem leitura separada', async () => {
    const { repo, service } = setup();
    repo.proxies.set('P1', makeProxy('P1', 1));
    await service.removeMany(['P1']);
    expect(repo.calls).toEqual(['deleteMany']);
    expect(repo.proxyUsage).not.toHaveBeenCalled();
  });

  it('loga as posições apagadas e avisa, nomeando as sessões, quando algum estava em uso', async () => {
    const { repo, service } = setup();
    repo.proxies.set('P1', makeProxy('P1', 1));
    repo.proxies.set('P4', makeProxy('P4', 4));
    repo.proxies.set('P7', makeProxy('P7', 7));
    repo.usage.set('P4', [
      { id: 'S1', name: 'suporte' },
      { id: 'S2', name: 'vendas-01' },
    ]);
    repo.usage.set('P9', [{ id: 'S3', name: 'fora-do-lote' }]);

    await service.removeMany(['P7', 'P4', 'P1']);

    expect(logSpy).toHaveBeenCalledExactlyOnceWith(
      'Exclusão em lote: 3 proxy(s) apagado(s) — #1, #4, #7',
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const warn = String(warnSpy.mock.calls[0][0]);
    expect(warn).toContain('#4 (suporte, vendas-01)');
    expect(warn).not.toContain('#1');
    expect(warn).not.toContain('fora-do-lote');
    expect(warn).toContain('proxy fixo');
  });

  it('nenhum em uso → só o log do lote, sem aviso', async () => {
    const { repo, service } = setup();
    repo.proxies.set('P1', makeProxy('P1', 1));
    await service.removeMany(['P1']);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('nada apagado (todos inexistentes) → sem log nem aviso', async () => {
    const { service } = setup();
    const r = await service.removeMany(['X', 'Y']);
    expect(r).toEqual({ deleted: 0, notFound: ['X', 'Y'] });
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('ProxyService.ensureAvailable — exclusividade padrão × allowShared (D-051)', () => {
  function inUse() {
    const ctx = setup();
    ctx.repo.proxies.set('P1', makeProxy('P1', 1));
    ctx.repo.usage.set('P1', [{ id: 'OUTRA', name: 'outra' }]);
    return ctx;
  }

  it('padrão: proxy de outra sessão → 400 "em uso" (D-008/D-041 intactos)', async () => {
    const { service } = inUse();
    await expect(service.ensureAvailable('P1')).rejects.toThrow(
      new ProxyUnavailableError('Proxy já está em uso por outra sessão'),
    );
    await expect(
      service.ensureAvailable('P1', undefined, { allowShared: false }),
    ).rejects.toThrow('em uso');
  });

  it('padrão: o próprio pin da sessão continua aceito', async () => {
    const { service } = inUse();
    await expect(service.ensureAvailable('P1', 'OUTRA')).resolves.toMatchObject(
      { id: 'P1' },
    );
  });

  it('allowShared: proxy de outra sessão é aceito sem consultar o uso', async () => {
    const { repo, service } = inUse();
    await expect(
      service.ensureAvailable('P1', undefined, { allowShared: true }),
    ).resolves.toMatchObject({ id: 'P1' });
    expect(repo.usedProxyIds).not.toHaveBeenCalled();
  });

  it.each([
    ['inexistente', null, 'Proxy não encontrado'],
    [
      'desabilitado',
      makeProxy('P1', 1, { enabled: false }),
      'Proxy está desabilitado',
    ],
    [
      'DEAD',
      makeProxy('P1', 1, { status: 'DEAD' }),
      'Proxy está DEAD — teste-o ou escolha outro',
    ],
  ])('allowShared NÃO libera proxy %s', async (_label, proxy, message) => {
    const { repo, service } = setup();
    if (proxy) repo.proxies.set('P1', proxy);
    await expect(
      service.ensureAvailable('P1', undefined, { allowShared: true }),
    ).rejects.toThrow(new ProxyUnavailableError(message));
  });
});

describe('ProxyService.setAssignment / assignSingle — allowShared chega ao repositório', () => {
  function inUse() {
    const ctx = setup();
    ctx.repo.proxies.set('P1', makeProxy('P1', 1));
    ctx.repo.usage.set('P1', [{ id: 'OUTRA', name: 'outra' }]);
    return ctx;
  }

  it('SINGLE com allowShared → grava compartilhado (o lock do repositório pula o dono)', async () => {
    const { repo, service } = inUse();
    await service.setAssignment('S1', {
      mode: 'SINGLE',
      rangeStart: null,
      rangeEnd: null,
      strategy: 'STICKY',
      proxyId: 'P1',
      allowShared: true,
    });
    expect(repo.setAssignment).toHaveBeenCalledExactlyOnceWith({
      sessionId: 'S1',
      mode: 'SINGLE',
      rangeStart: null,
      rangeEnd: null,
      strategy: 'STICKY',
      currentProxyId: 'P1',
      allowShared: true,
    });
  });

  it('SINGLE sem allowShared → 400 antes de gravar', async () => {
    const { repo, service } = inUse();
    await expect(
      service.setAssignment('S1', {
        mode: 'SINGLE',
        rangeStart: null,
        rangeEnd: null,
        strategy: 'STICKY',
        proxyId: 'P1',
      }),
    ).rejects.toThrow('em uso');
    expect(repo.setAssignment).not.toHaveBeenCalled();
  });

  it('SINGLE com proxy livre e sem a flag → repositório recebe allowShared false', async () => {
    const { repo, service } = setup();
    repo.proxies.set('P2', makeProxy('P2', 2));
    await service.setAssignment('S1', {
      mode: 'SINGLE',
      rangeStart: null,
      rangeEnd: null,
      strategy: 'STICKY',
      proxyId: 'P2',
    });
    expect(repo.setAssignment.mock.calls[0][0]).toMatchObject({
      currentProxyId: 'P2',
      allowShared: false,
    });
  });

  it.each(['RANGE', 'GLOBAL_ROUND_ROBIN', 'NONE'] as const)(
    '%s ignora allowShared (não é SINGLE)',
    async (mode) => {
      const { repo, service } = setup();
      await service.setAssignment('S1', {
        mode,
        rangeStart: mode === 'RANGE' ? 1 : null,
        rangeEnd: mode === 'RANGE' ? 5 : null,
        strategy: 'STICKY',
        proxyId: null,
        allowShared: true,
      });
      expect(repo.setAssignment.mock.calls[0][0]).not.toHaveProperty(
        'allowShared',
      );
    },
  );

  it('assignSingle padrão continua exclusivo', async () => {
    const { repo, service } = inUse();
    await expect(service.assignSingle('NOVA', 'P1')).rejects.toThrow('em uso');
    expect(repo.setAssignment).not.toHaveBeenCalled();
  });

  it('assignSingle com allowShared grava SINGLE/STICKY compartilhado', async () => {
    const { repo, service } = inUse();
    await service.assignSingle('NOVA', 'P1', { allowShared: true });
    expect(repo.setAssignment).toHaveBeenCalledExactlyOnceWith({
      sessionId: 'NOVA',
      mode: 'SINGLE',
      rangeStart: null,
      rangeEnd: null,
      strategy: 'STICKY',
      currentProxyId: 'P1',
      allowShared: true,
    });
  });
});

describe('ProxyService.setAssignment — repetir o próprio SINGLE (achado da revisão E28)', () => {
  function shared() {
    // S1 e OUTRA dividem P1 (OUTRA entrou com allowSharedProxy); S1 é SINGLE em P1.
    const ctx = setup();
    ctx.repo.proxies.set('P1', makeProxy('P1', 1));
    ctx.repo.usage.set('P1', [
      { id: 'OUTRA', name: 'outra' },
      { id: 'S1', name: 's1' },
    ]);
    ctx.repo.singlePins.set('S1', 'P1');
    ctx.repo.singlePins.set('OUTRA', 'P1');
    return ctx;
  }
  const single = (proxyId: string) => ({
    mode: 'SINGLE' as const,
    rangeStart: null,
    rangeEnd: null,
    strategy: 'STICKY' as const,
    proxyId,
  });

  it('o mesmo SINGLE sem a flag passa (não é compartilhar de novo) e o repositório reconfere sob lock', async () => {
    const { repo, service } = shared();
    await expect(
      service.setAssignment('S1', single('P1')),
    ).resolves.toMatchObject({ currentProxyId: 'P1' });
    expect(repo.liveSinglePin).toHaveBeenCalledWith('S1');
    // só a flag EXPLÍCITA desce; o "próprio pin" o repositório decide de novo dentro da transação
    expect(repo.setAssignment.mock.calls[0][0]).toMatchObject({
      allowShared: false,
    });
  });

  it('vale para as duas sessões que dividem o proxy', async () => {
    const { service } = shared();
    await expect(
      service.setAssignment('OUTRA', single('P1')),
    ).resolves.toBeTruthy();
  });

  it('sessão sem SINGLE nesse proxy (ex.: RANGE com afinidade nele) continua precisando da flag', async () => {
    const { repo, service } = shared();
    repo.usage.set('P1', [
      { id: 'OUTRA', name: 'outra' },
      { id: 'FAIXA', name: 'faixa' },
    ]);
    await expect(service.setAssignment('FAIXA', single('P1'))).rejects.toThrow(
      'em uso',
    );
    expect(repo.setAssignment).not.toHaveBeenCalled();
  });

  it('trocar o próprio SINGLE para OUTRO proxy em uso continua precisando da flag', async () => {
    const { repo, service } = shared();
    repo.proxies.set('P2', makeProxy('P2', 2));
    repo.usage.set('P2', [{ id: 'X', name: 'x' }]);
    await expect(service.setAssignment('S1', single('P2'))).rejects.toThrow(
      'em uso',
    );
  });

  it('o próprio pin não libera proxy que ficou DEAD', async () => {
    const { repo, service } = shared();
    repo.proxies.set('P1', makeProxy('P1', 1, { status: 'DEAD' }));
    await expect(service.setAssignment('S1', single('P1'))).rejects.toThrow(
      'DEAD',
    );
  });
});
