// A versão vem da API ou do catálogo wa-version; nunca pode virar um caminho no cache HTML.
export function isWwebjsVersionMode(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value === 'auto' ||
      value === 'live' ||
      /^\d+(?:\.\d+)+(?:-alpha)?$/.test(value))
  );
}
