// E26 · P-084 · D-038 — ProxyService.suggestionFor / markReleased com repositório falso em memória.
import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Proxy } from '../domain/proxy.entity';
import type { ReleasedAssignment } from '../domain/proxy-suggestion';
import type { ProxyStatus } from '../domain/proxy-types';
import { ProxyService } from './proxy.service';

function makeProxy(
  id: string,
  opts: { enabled?: boolean; status?: ProxyStatus; position?: number } = {},
): Proxy {
  return new Proxy(
    id,
    opts.position ?? 3,
    'BR-01',
    'HTTP',
    '10.0.0.3',
    8080,
    'u',
    'p',
    'MANUAL',
    'BR',
    null,
    null,
    opts.status ?? 'ALIVE',
    opts.enabled ?? true,
  );
}

// Repositório em memória só com o que a sugestão usa. `findReleasedByName` imita o SQL
// (igualdade em minúsculas, só linhas com proxy, mais recentes primeiro).
class FakeProxyRepo {
  proxies = new Map<string, Proxy>();
  owners = new Map<string, string>(); // proxyId → nome da sessão viva que usa
  released: ReleasedAssignment[] = [];
  markReleasedResult: number | Error | string = 1;

  findReleasedByName = vi.fn(async (name: string) =>
    this.released
      .filter(
        (r) =>
          r.currentProxyId !== null &&
          r.releasedSessionName.toLowerCase() === name.toLowerCase(),
      )
      .sort(
        (a, b) =>
          b.releasedAt.getTime() - a.releasedAt.getTime() ||
          (b.sessionId > a.sessionId ? 1 : -1),
      ),
  );

  findById = vi.fn(async (id: string) => this.proxies.get(id) ?? null);

  proxyOwnerName = vi.fn(
    async (proxyId: string) => this.owners.get(proxyId) ?? null,
  );

  markReleased = vi.fn(async (_id: string, _name: string, _at: Date) => {
    const r = this.markReleasedResult;
    if (r instanceof Error || typeof r === 'string') throw r;
    return r;
  });
}

function setup() {
  const repo = new FakeProxyRepo();
  const service = new ProxyService(repo as never, {} as never, {} as never);
  return { repo, service };
}

const RELEASED_AT = new Date('2026-09-27T09:30:00.000Z');

function released(
  sessionId: string,
  name: string,
  proxyId: string | null,
  at: Date = RELEASED_AT,
): ReleasedAssignment {
  return {
    sessionId,
    releasedSessionName: name,
    releasedAt: at,
    currentProxyId: proxyId,
  };
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ProxyService.suggestionFor', () => {
  it('sem linhas carimbadas → null, sem buscar proxy nem dono', async () => {
    const { repo, service } = setup();
    await expect(service.suggestionFor('vendas')).resolves.toBeNull();
    expect(repo.findReleasedByName).toHaveBeenCalledWith('vendas');
    expect(repo.findById).not.toHaveBeenCalled();
    expect(repo.proxyOwnerName).not.toHaveBeenCalled();
  });

  it('linha de outro nome que o repositório devolva é descartada → null', async () => {
    const { repo, service } = setup();
    repo.proxies.set('p3', makeProxy('p3'));
    repo.findReleasedByName.mockResolvedValueOnce([
      released('01A', 'vendas-02', 'p3'),
    ]);
    await expect(service.suggestionFor('vendas')).resolves.toBeNull();
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('proxy livre → disponível, com o proxy e inUseBySession null', async () => {
    const { repo, service } = setup();
    const p3 = makeProxy('p3');
    repo.proxies.set('p3', p3);
    repo.released.push(released('01A', 'vendas', 'p3'));

    const s = await service.suggestionFor('vendas');
    expect(s).toEqual({
      proxy: p3,
      fromSession: 'vendas',
      releasedAt: RELEASED_AT,
      available: true,
      reason: null,
      inUseBySession: null,
    });
    expect(repo.findById).toHaveBeenCalledWith('p3');
    expect(repo.proxyOwnerName).toHaveBeenCalledWith('p3');
  });

  it('proxy UNTESTED e livre também é disponível', async () => {
    const { repo, service } = setup();
    repo.proxies.set('p3', makeProxy('p3', { status: 'UNTESTED' }));
    repo.released.push(released('01A', 'vendas', 'p3'));
    const s = await service.suggestionFor('vendas');
    expect(s?.available).toBe(true);
    expect(s?.reason).toBeNull();
  });

  it('proxy em uso por outra sessão viva → IN_USE com o nome do dono', async () => {
    const { repo, service } = setup();
    const p3 = makeProxy('p3');
    repo.proxies.set('p3', p3);
    repo.owners.set('p3', 'vendas-02');
    repo.released.push(released('01A', 'vendas', 'p3'));

    const s = await service.suggestionFor('vendas');
    expect(s).toEqual({
      proxy: p3,
      fromSession: 'vendas',
      releasedAt: RELEASED_AT,
      available: false,
      reason: 'IN_USE',
      inUseBySession: 'vendas-02',
    });
  });

  it('proxy DEAD → indisponível com reason DEAD', async () => {
    const { repo, service } = setup();
    const p3 = makeProxy('p3', { status: 'DEAD' });
    repo.proxies.set('p3', p3);
    repo.released.push(released('01A', 'vendas', 'p3'));

    const s = await service.suggestionFor('vendas');
    expect(s).toMatchObject({
      proxy: p3,
      available: false,
      reason: 'DEAD',
      inUseBySession: null,
    });
  });

  it('proxy desabilitado → DISABLED (mesmo DEAD)', async () => {
    const { repo, service } = setup();
    const p3 = makeProxy('p3', { enabled: false, status: 'DEAD' });
    repo.proxies.set('p3', p3);
    repo.released.push(released('01A', 'vendas', 'p3'));

    const s = await service.suggestionFor('vendas');
    expect(s).toMatchObject({
      proxy: p3,
      available: false,
      reason: 'DISABLED',
      inUseBySession: null,
    });
  });

  // Revisão do diff (E26): proxy DEAD/desabilitado ainda preso a outra sessão viva → IN_USE com o
  // dono (testar/habilitar não o liberaria); inUseBySession só vem com IN_USE.
  it('proxy DEAD e desabilitado mas com dono vivo → IN_USE com o nome do dono', async () => {
    const { repo, service } = setup();
    const p3 = makeProxy('p3', { enabled: false, status: 'DEAD' });
    repo.proxies.set('p3', p3);
    repo.owners.set('p3', 'loja2');
    repo.released.push(released('01A', 'loja1', 'p3'));

    const s = await service.suggestionFor('loja1');
    expect(s).toMatchObject({
      available: false,
      reason: 'IN_USE',
      inUseBySession: 'loja2',
    });
  });

  it('proxy excluído do pool → REMOVED com proxy null, sem consultar o dono', async () => {
    const { repo, service } = setup();
    repo.released.push(released('01A', 'vendas', 'p-apagado'));

    const s = await service.suggestionFor('vendas');
    expect(s).toEqual({
      proxy: null,
      fromSession: 'vendas',
      releasedAt: RELEASED_AT,
      available: false,
      reason: 'REMOVED',
      inUseBySession: null,
    });
    expect(repo.findById).toHaveBeenCalledWith('p-apagado');
    expect(repo.proxyOwnerName).not.toHaveBeenCalled();
  });

  it('fromSession é o nome como a sessão foi apagada (caixa original) e releasedAt o do carimbo', async () => {
    const { repo, service } = setup();
    repo.proxies.set('p7', makeProxy('p7'));
    const at = new Date('2026-09-26T18:05:07.123Z');
    repo.released.push(released('01A', 'Vendas', 'p7', at));

    const s = await service.suggestionFor('vendas');
    expect(s?.fromSession).toBe('Vendas');
    expect(s?.releasedAt).toBe(at);
    expect(s?.proxy?.id).toBe('p7');
  });

  it('com várias exclusões, usa a de caixa idêntica e busca o proxy dela', async () => {
    const { repo, service } = setup();
    repo.proxies.set('p-exato', makeProxy('p-exato'));
    repo.proxies.set('p-caixa', makeProxy('p-caixa'));
    const oldExact = new Date('2026-09-01T10:00:00Z');
    repo.released.push(
      released('01A', 'Vendas', 'p-exato', oldExact),
      released('01B', 'VENDAS', 'p-caixa', new Date('2026-09-27T10:00:00Z')),
    );

    const s = await service.suggestionFor('Vendas');
    expect(s?.proxy?.id).toBe('p-exato');
    expect(s?.fromSession).toBe('Vendas');
    expect(s?.releasedAt).toBe(oldExact);
    expect(repo.findById).toHaveBeenCalledTimes(1);
    expect(repo.findById).toHaveBeenCalledWith('p-exato');
  });

  it('entre exclusões com o mesmo nome, usa a mais recente', async () => {
    const { repo, service } = setup();
    repo.proxies.set('p-velho', makeProxy('p-velho'));
    repo.proxies.set('p-novo', makeProxy('p-novo'));
    repo.released.push(
      released('01A', 'vendas', 'p-velho', new Date('2026-09-20T10:00:00Z')),
      released('01B', 'vendas', 'p-novo', new Date('2026-09-27T10:00:00Z')),
    );
    const s = await service.suggestionFor('vendas');
    expect(s?.proxy?.id).toBe('p-novo');
  });

  it('linha sem currentProxyId que escape do SQL é ignorada → null', async () => {
    const { repo, service } = setup();
    repo.findReleasedByName.mockResolvedValueOnce([
      released('01A', 'vendas', null),
    ]);
    await expect(service.suggestionFor('vendas')).resolves.toBeNull();
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('erro do repositório na busca propaga (o controller devolve 500)', async () => {
    const { repo, service } = setup();
    repo.findReleasedByName.mockRejectedValueOnce(new Error('db fora'));
    await expect(service.suggestionFor('vendas')).rejects.toThrow('db fora');
  });
});

describe('ProxyService.markReleased', () => {
  it('chama o repositório com sessionId, nome e a data de agora', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-09-27T12:34:56.789Z');
    vi.setSystemTime(now);
    const { repo, service } = setup();

    await expect(
      service.markReleased('01SESSAO', 'vendas'),
    ).resolves.toBeUndefined();

    expect(repo.markReleased).toHaveBeenCalledTimes(1);
    const [id, name, at] = repo.markReleased.mock.calls[0];
    expect(id).toBe('01SESSAO');
    expect(name).toBe('vendas');
    expect(at).toBeInstanceOf(Date);
    expect(at.getTime()).toBe(now.getTime());
  });

  it('carimbou ≥1 linha → loga sucesso com o nome, sem erro', async () => {
    const { repo, service } = setup();
    repo.markReleasedResult = 1;
    await service.markReleased('01SESSAO', 'vendas');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0][0])).toContain('"vendas"');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('0 linhas (sessão sem proxy fixo) → não loga sucesso nem erro', async () => {
    const { repo, service } = setup();
    repo.markReleasedResult = 0;
    await expect(
      service.markReleased('01SESSAO', 'vendas'),
    ).resolves.toBeUndefined();
    expect(repo.markReleased).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('repositório lança Error → não lança e loga erro com sessionId, mensagem e stack', async () => {
    const { repo, service } = setup();
    const boom = new Error('timeout do banco');
    repo.markReleasedResult = boom;

    await expect(
      service.markReleased('01SESSAO', 'vendas'),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [msg, stack] = errorSpy.mock.calls[0];
    expect(String(msg)).toContain('01SESSAO');
    expect(String(msg)).toContain('timeout do banco');
    expect(stack).toBe(boom.stack);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('repositório rejeita com não-Error → ainda não lança e loga erro', async () => {
    const { repo, service } = setup();
    repo.markReleasedResult = 'falha crua';

    await expect(
      service.markReleased('01SESSAO', 'vendas'),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toContain('01SESSAO');
  });
});
