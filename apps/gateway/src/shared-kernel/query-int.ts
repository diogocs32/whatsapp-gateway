// Parse de inteiros vindos da query string com clamp (auditoria 09/2026, ABE-24).
// `Math.min(Number(limit) || def, max)` aceitava negativo/fração ("limit=-5" virava take=-5 e
// estourava no Prisma). Aqui: ausente/inválido → default; fora da faixa → clamp; fração → floor.
export function clampInt(
  raw: string | number | undefined,
  def: number,
  min: number,
  max: number,
): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  const base = Number.isFinite(n) && raw !== '' && raw !== undefined ? n : def;
  return Math.min(Math.max(Math.floor(base), min), max);
}
