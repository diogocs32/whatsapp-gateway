import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMediaCache, type MediaLoader } from './media-cache';

class HttpErr extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Loader controlável: cada chamada devolve uma promise que o teste resolve/rejeita.
function controllable() {
  const calls: {
    resolve: (b: Blob) => void;
    reject: (e: unknown) => void;
    signal: AbortSignal;
  }[] = [];
  const load: MediaLoader = (signal) =>
    new Promise<Blob>((resolve, reject) => {
      calls.push({ resolve, reject, signal });
    });
  return { calls, load };
}

const flush = () => new Promise<void>((r) => queueMicrotask(r)).then(() => {});

function setup(opts: { maxBytes?: number; maxConcurrent?: number } = {}) {
  let n = 0;
  const revoked: string[] = [];
  const cache = createMediaCache({
    createObjectURL: () => `blob:fake/${++n}`,
    revokeObjectURL: (u) => revoked.push(u),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    now: () => Date.now(),
    releaseDelayMs: 30_000,
    rateLimitPauseMs: 60_000,
    ...opts,
  });
  return { cache, revoked };
}

const blob = (size: number, type = 'image/jpeg') =>
  new Blob([new Uint8Array(size)], { type });

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('media-cache (E23 · P-067)', () => {
  it('um download por mensagem, compartilhado; pronto → object URL e aviso aos ouvintes', async () => {
    const { cache } = setup();
    const { calls, load } = controllable();
    const seen = vi.fn();
    cache.subscribe('S|1', seen);
    const rel1 = cache.retain('S|1');
    const rel2 = cache.retain('S|1'); // dois balões / StrictMode
    cache.request('S|1', load);
    cache.request('S|1', load);
    expect(calls).toHaveLength(1);
    expect(cache.snapshot('S|1').status).toBe('loading');
    calls[0].resolve(blob(10));
    await flush();
    const snap = cache.snapshot('S|1');
    expect(snap).toMatchObject({
      status: 'ready',
      url: 'blob:fake/1',
      type: 'image/jpeg',
    });
    expect(cache.snapshot('S|1')).toBe(snap); // referência estável p/ useSyncExternalStore
    expect(seen).toHaveBeenCalled();
    cache.request('S|1', load); // já pronto: não baixa de novo
    expect(calls).toHaveLength(1);
    rel1();
    rel2();
  });

  it('StrictMode (retain → release → retain logo em seguida) não revoga nem baixa de novo', async () => {
    const { cache, revoked } = setup();
    const { calls, load } = controllable();
    const rel = cache.retain('S|1');
    cache.request('S|1', load);
    calls[0].resolve(blob(5));
    await flush();
    rel(); // cleanup do StrictMode
    const rel2 = cache.retain('S|1'); // setup de novo
    vi.advanceTimersByTime(60_000);
    expect(revoked).toEqual([]);
    expect(cache.snapshot('S|1').status).toBe('ready');
    rel2();
    vi.advanceTimersByTime(29_999);
    expect(revoked).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(revoked).toEqual(['blob:fake/1']); // liberado ao desmontar (depois da carência)
    expect(cache.snapshot('S|1').status).toBe('idle');
    expect(cache.stats().bytes).toBe(0);
  });

  it('a carência recomeça a cada saída (retain cancela o timer pendente)', async () => {
    const { cache, revoked } = setup();
    const { calls, load } = controllable();
    const rel = cache.retain('S|1');
    cache.request('S|1', load);
    calls[0].resolve(blob(5));
    await flush();
    rel(); // t=0: agenda a liberação para t=30 s
    vi.advanceTimersByTime(20_000);
    const rel2 = cache.retain('S|1'); // t=20 s: volta → cancela o timer
    rel2(); // sai de novo → nova carência até t=50 s
    vi.advanceTimersByTime(25_000); // t=45 s: o timer antigo (t=30 s) não pode ter disparado
    expect(revoked).toEqual([]);
    vi.advanceTimersByTime(5_000); // t=50 s
    expect(revoked).toEqual(['blob:fake/1']);
  });

  it('saiu da tela durante o download → aborta depois da carência', async () => {
    const { cache } = setup();
    const { calls, load } = controllable();
    const rel = cache.retain('S|1');
    cache.request('S|1', load);
    rel();
    expect(calls[0].signal.aborted).toBe(false);
    vi.advanceTimersByTime(30_000);
    expect(calls[0].signal.aborted).toBe(true);
    calls[0].resolve(blob(5)); // chegou depois do abort: ignorado
    await flush();
    expect(cache.snapshot('S|1').status).toBe('idle');
    expect(cache.stats()).toMatchObject({ entries: 0, active: 0, bytes: 0 });
  });

  it('teto de memória: revoga primeiro o que ninguém usa (mais antigo antes)', async () => {
    const { cache, revoked } = setup({ maxBytes: 100 });
    const { calls, load } = controllable();
    const relA = cache.retain('A');
    cache.request('A', load);
    calls[0].resolve(blob(60));
    await flush();
    relA(); // A sem uso (ainda na carência)
    const relB = cache.retain('B');
    cache.request('B', load);
    calls[1].resolve(blob(60)); // 120 > 100 → A (sem uso) sai
    await flush();
    expect(revoked).toEqual(['blob:fake/1']);
    expect(cache.snapshot('A').status).toBe('idle');
    expect(cache.snapshot('B').status).toBe('ready');
    const relC = cache.retain('C');
    cache.request('C', load);
    calls[2].resolve(blob(60)); // B e C em uso: passa do teto, mas nada em uso é revogado
    await flush();
    expect(revoked).toEqual(['blob:fake/1']);
    relB();
    relC();
  });

  it('teto de memória: com várias sem uso, revoga do mais antigo e só o necessário', async () => {
    const { cache, revoked } = setup({ maxBytes: 100 });
    const { calls, load } = controllable();
    const keys = ['A', 'B', 'C'];
    for (const [i, k] of keys.entries()) {
      const r = cache.retain(k);
      cache.request(k, load);
      calls[i].resolve(blob(30));
      await flush();
      vi.advanceTimersByTime(1000); // usos em horários diferentes: A mais antiga
      r();
    }
    expect(revoked).toEqual([]); // 90 ≤ 100
    const relD = cache.retain('D');
    cache.request('D', load);
    calls[3].resolve(blob(50)); // 140 > 100 → sai A (30) e B (30) = 80; C fica
    await flush();
    expect(revoked).toEqual(['blob:fake/1', 'blob:fake/2']);
    expect(cache.snapshot('C').status).toBe('ready');
    expect(cache.stats().bytes).toBe(80);
    relD();
  });

  it('404 = sem arquivo, permanente: não pede de novo, nem depois de sair e voltar', async () => {
    const { cache } = setup();
    const { calls, load } = controllable();
    const rel = cache.retain('S|1');
    cache.request('S|1', load);
    calls[0].reject(new HttpErr(404, 'Mídia não disponível'));
    await flush();
    expect(cache.snapshot('S|1')).toMatchObject({
      status: 'missing',
      message: 'Mídia não disponível',
    });
    cache.request('S|1', load);
    rel();
    vi.advanceTimersByTime(60_000);
    const rel2 = cache.retain('S|1');
    cache.request('S|1', load);
    expect(calls).toHaveLength(1);
    rel2();
  });

  it('erro (500/rede) → "tentar de novo" baixa outra vez', async () => {
    const { cache } = setup();
    const { calls, load } = controllable();
    const rel = cache.retain('S|1');
    cache.request('S|1', load);
    calls[0].reject(new HttpErr(500, 'boom'));
    await flush();
    expect(cache.snapshot('S|1')).toMatchObject({
      status: 'error',
      message: 'boom',
    });
    cache.request('S|1', load);
    expect(calls).toHaveLength(2);
    calls[1].resolve(blob(1));
    await flush();
    expect(cache.snapshot('S|1').status).toBe('ready');
    rel();
  });

  it('429 → pausa global: nada novo começa até passar a pausa', async () => {
    const { cache } = setup();
    const { calls, load } = controllable();
    const r1 = cache.retain('A');
    const r2 = cache.retain('B');
    cache.request('A', load);
    calls[0].reject(new HttpErr(429, 'Rate limit exceeded'));
    await flush();
    expect(cache.snapshot('A').status).toBe('error');
    cache.request('B', load);
    expect(calls).toHaveLength(1);
    expect(cache.snapshot('B').status).toBe('queued');
    vi.advanceTimersByTime(60_000);
    expect(calls).toHaveLength(2);
    expect(cache.snapshot('B').status).toBe('loading');
    r1();
    r2();
  });

  it('no máximo N downloads simultâneos (fila)', async () => {
    const { cache } = setup({ maxConcurrent: 3 });
    const { calls, load } = controllable();
    const rels = ['a', 'b', 'c', 'd', 'e'].map((k) => {
      const r = cache.retain(k);
      cache.request(k, load);
      return r;
    });
    expect(calls).toHaveLength(3);
    expect(cache.snapshot('d').status).toBe('queued');
    calls[0].resolve(blob(1));
    await flush();
    expect(calls).toHaveLength(4);
    rels.forEach((r) => r());
  });

  it('clear (saída do painel) revoga tudo e aborta o que está em voo', async () => {
    const { cache, revoked } = setup();
    const { calls, load } = controllable();
    cache.retain('A');
    cache.request('A', load);
    calls[0].resolve(blob(3));
    await flush();
    cache.retain('B');
    cache.request('B', load);
    cache.clear();
    expect(revoked).toEqual(['blob:fake/1']);
    expect(calls[1].signal.aborted).toBe(true);
    expect(cache.stats()).toMatchObject({ entries: 0, bytes: 0 });
  });
});
