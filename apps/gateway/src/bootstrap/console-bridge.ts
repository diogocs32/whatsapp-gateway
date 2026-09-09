import type { LoggerService } from '@nestjs/common';
import { format } from 'node:util';

// Roteia `console.*` para o logger estruturado (auditoria de logs 09/09 — P-042).
//
// Libs sem logger injetável escrevem direto no console: o libsignal (Baileys) despeja o registro
// inteiro da sessão Signal em `console.info("Closing session:", session)` — dezenas de linhas
// soltas com Buffers, fora do JSON, misturadas às linhas do pino; o BullMQ usa `console.error` no
// fallback quando o evento 'error' não tem listener. No Dokploy isso vira ruído que esconde erro
// de verdade e ainda foge de qualquer grep por `"level":50`.
//
// Mapeamento: log/info/debug/trace → debug (chatter de lib não é log nosso; aparece com
// LOG_LEVEL=debug), warn → warn, error → error. Uma chamada = UMA linha JSON, texto formatado como
// o console faria (util.format) e truncado em MAX chars. Devolve a função que restaura o console.
export const CONSOLE_BRIDGE_MAX_CHARS = 4_000;
const CONTEXT = 'console';

type ConsoleMethod = 'log' | 'info' | 'debug' | 'trace' | 'warn' | 'error';
const METHODS: ConsoleMethod[] = [
  'log',
  'info',
  'debug',
  'trace',
  'warn',
  'error',
];

export function renderConsoleArgs(
  args: unknown[],
  max = CONSOLE_BRIDGE_MAX_CHARS,
): string {
  let text: string;
  try {
    text = format(...args);
  } catch {
    text = args.map((a) => String(a)).join(' ');
  }
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… [+${text.length - max} chars]`;
}

export function bridgeConsoleToLogger(
  logger: LoggerService,
  max = CONSOLE_BRIDGE_MAX_CHARS,
): () => void {
  const original = Object.fromEntries(
    METHODS.map((m) => [m, console[m]]),
  ) as Record<ConsoleMethod, (...args: unknown[]) => void>;
  // Nunca deixar o log derrubar quem chamou console.*: qualquer falha do logger é engolida.
  const safe = (fn: () => void) => {
    try {
      fn();
    } catch {
      /* logger indisponível — silêncio é melhor que um throw dentro de uma lib */
    }
  };
  const debug = (...args: unknown[]) =>
    safe(() => logger.debug?.(renderConsoleArgs(args, max), CONTEXT));
  console.log = debug;
  console.info = debug;
  console.debug = debug;
  console.trace = debug;
  console.warn = (...args: unknown[]) =>
    safe(() => logger.warn(renderConsoleArgs(args, max), CONTEXT));
  console.error = (...args: unknown[]) =>
    safe(() => logger.error(renderConsoleArgs(args, max), CONTEXT));
  return () => {
    for (const m of METHODS) console[m] = original[m];
  };
}
