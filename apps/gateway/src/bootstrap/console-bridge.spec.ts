import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bridgeConsoleToLogger,
  CONSOLE_BRIDGE_MAX_CHARS,
  renderConsoleArgs,
} from './console-bridge';

function fakeLogger() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  };
}

describe('console-bridge', () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('console.info com objeto (dump do libsignal) vira UMA chamada de debug, texto único', () => {
    const logger = fakeLogger();
    restore = bridgeConsoleToLogger(logger);
    console.info('Closing session:', {
      registrationId: 1,
      baseKey: Buffer.from('abc'),
    });
    expect(logger.debug).toHaveBeenCalledTimes(1);
    const [text, context] = logger.debug.mock.calls[0] as [string, string];
    expect(context).toBe('console');
    expect(text).toContain('Closing session:');
    expect(text).toContain('registrationId: 1');
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('warn/error mapeiam para o nível equivalente; log/debug/trace para debug', () => {
    const logger = fakeLogger();
    restore = bridgeConsoleToLogger(logger);
    console.warn('aviso %s', 'x');
    console.error('falhou', new Error('boom'));
    console.log('a');
    console.debug('b');
    console.trace('c');
    expect(logger.warn).toHaveBeenCalledWith('aviso x', 'console');
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect((logger.error.mock.calls[0] as string[])[0]).toMatch(
      /falhou Error: boom/,
    );
    expect(logger.debug).toHaveBeenCalledTimes(3);
  });

  it('trunca textos gigantes e informa quanto cortou', () => {
    const text = renderConsoleArgs(['x'.repeat(CONSOLE_BRIDGE_MAX_CHARS + 50)]);
    expect(text.length).toBeLessThan(CONSOLE_BRIDGE_MAX_CHARS + 40);
    expect(text).toMatch(/\[\+50 chars\]$/);
    expect(renderConsoleArgs(['curto'])).toBe('curto');
  });

  it('logger que lança não propaga para quem chamou console.*', () => {
    const logger = fakeLogger();
    logger.warn.mockImplementation(() => {
      throw new Error('logger morto');
    });
    restore = bridgeConsoleToLogger(logger);
    expect(() => console.warn('x')).not.toThrow();
  });

  it('restaura o console original', () => {
    const before = console.log;
    const logger = fakeLogger();
    const undo = bridgeConsoleToLogger(logger);
    expect(console.log).not.toBe(before);
    undo();
    expect(console.log).toBe(before);
  });
});
