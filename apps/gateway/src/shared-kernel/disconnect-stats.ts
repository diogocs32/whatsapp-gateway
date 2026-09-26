// Contagem em memória desde o boot. A engine vê o código bruto no `close`; o scrape copia os
// totais para seu Registry. Os rótulos são finitos para não aceitar cardinalidade arbitrária.
const knownCodes = new Set([401, 403, 405, 408, 411, 428, 440, 500, 503, 515]);
const totals = new Map<string, number>();

export function disconnectCodeLabel(code: number | null): string {
  return code !== null && knownCodes.has(code) ? String(code) : 'other';
}

export function recordDisconnect(
  engine: 'baileys' | 'wwebjs',
  code: number | null,
): void {
  const key = `${engine}:${disconnectCodeLabel(code)}`;
  totals.set(key, (totals.get(key) ?? 0) + 1);
}

export function disconnectTotals(): Array<{
  engine: string;
  code: string;
  total: number;
}> {
  return [...totals].map(([key, total]) => {
    const [engine, code] = key.split(':');
    return { engine, code, total };
  });
}
