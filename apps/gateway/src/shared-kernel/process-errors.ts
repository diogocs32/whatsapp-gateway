// Contadores de erros de processo (auditoria 09/2026, ABE-19). Os handlers globais de
// `uncaughtException`/`unhandledRejection` em main.ts logam e seguem (isolamento de falhas entre
// sessões — F7.2). Isso é uma rede de segurança, não estado saudável: sem um contador, esses erros
// só existem no log e ninguém alarma. O MetricsService expõe os totais em
// `gateway_process_errors_total{kind}` para o Prometheus/alerta.

const totals = new Map<string, number>();

export function recordProcessError(kind: string): void {
  totals.set(kind, (totals.get(kind) ?? 0) + 1);
}

export function processErrorTotals(): Record<string, number> {
  return Object.fromEntries(totals);
}
