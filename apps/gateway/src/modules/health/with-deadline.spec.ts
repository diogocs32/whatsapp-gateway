import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withDeadline } from './health.service';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('withDeadline — prazo dos probes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it.each([
    { name: 'false', value: false },
    { name: 'zero', value: 0 },
    { name: 'string vazia', value: '' },
    { name: 'null', value: null },
    { name: 'undefined', value: undefined },
    { name: 'NaN', value: NaN },
  ])('preserva resolução $name e limpa o timer', async ({ value }) => {
    const fallback = Symbol('fallback');
    const result = withDeadline<unknown>(Promise.resolve(value), 100, fallback);

    expect(vi.getTimerCount()).toBe(1);
    await expect(result).resolves.toBe(value);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('entrega o objeto original quando resolve 1ms antes do prazo', async () => {
    const operation = deferred<object>();
    const original = { database: true };
    const fallback = { database: false };
    const result = withDeadline(operation.promise, 100, fallback);
    const settled = vi.fn();
    const observation = result.then(settled);

    await vi.advanceTimersByTimeAsync(99);
    expect(settled).not.toHaveBeenCalled();
    operation.resolve(original);

    await expect(result).resolves.toBe(original);
    await observation;
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toHaveBeenCalledExactlyOnceWith(original);
  });

  it('entrega fallback por identidade quando rejeita antes do prazo e limpa o timer', async () => {
    const operation = deferred<object>();
    const fallback = { redis: false };
    const result = withDeadline(operation.promise, 100, fallback);

    await vi.advanceTimersByTimeAsync(99);
    operation.reject(new Error('falha sintética do probe'));

    await expect(result).resolves.toBe(fallback);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('encerra a espera exatamente no prazo e não antecipa o fallback', async () => {
    const operation = deferred<object>();
    const fallback = { storage: false };
    const result = withDeadline(operation.promise, 100, fallback);
    const settled = vi.fn();
    const observation = result.then(settled);

    await vi.advanceTimersByTimeAsync(99);
    expect(settled).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe(fallback);
    await observation;
    expect(settled).toHaveBeenCalledExactlyOnceWith(fallback);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('prazo zero devolve fallback ao executar o timer sem esperar a operação', async () => {
    const operation = deferred<boolean>();
    const result = withDeadline(operation.promise, 0, false);

    await vi.advanceTimersByTimeAsync(0);

    await expect(result).resolves.toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('não cancela a operação que resolve depois do fallback', async () => {
    const completed = vi.fn();
    const operation = new Promise<object>((resolve) => {
      setTimeout(() => {
        completed();
        resolve({ storage: true });
      }, 200);
    });
    const fallback = { storage: false };
    const result = withDeadline(operation, 100, fallback);

    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toBe(fallback);
    expect(completed).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(100);

    expect(completed).toHaveBeenCalledOnce();
    await expect(operation).resolves.toEqual({ storage: true });
    await expect(result).resolves.toBe(fallback);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('consome rejeição tardia sem mudar o fallback já entregue', async () => {
    const rejected = vi.fn();
    const operation = new Promise<boolean>((_resolve, reject) => {
      setTimeout(() => {
        rejected();
        reject(new Error('probe rejeitou depois do prazo'));
      }, 200);
    });
    const result = withDeadline(operation, 100, false);

    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe(false);
    expect(rejected).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(100);
    // Sem catch no teste: uma rejeição não consumida é erro da própria run do Vitest.
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(rejected).toHaveBeenCalledOnce();
    await expect(result).resolves.toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('isola timers e resultados de operações simultâneas com prazos diferentes', async () => {
    const fast = deferred<boolean>();
    const slow = deferred<boolean>();
    const first = withDeadline(fast.promise, 100, false);
    const second = withDeadline(slow.promise, 200, false);
    const settled = vi.fn();
    const observation = second.then(settled);

    expect(vi.getTimerCount()).toBe(2);
    fast.resolve(true);
    await expect(first).resolves.toBe(true);
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(199);
    expect(settled).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1);

    await expect(second).resolves.toBe(false);
    await observation;
    expect(settled).toHaveBeenCalledExactlyOnceWith(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
