// Início do dia civil num fuso IANA (auditoria 09/2026, ABE-05/ABE-25): o teto diário de uma
// campanha é "por dia local da empresa", não por dia UTC nem "total acumulado". Usa só Intl
// (sem dependência): lê o relógio de parede no fuso e recua até a meia-noite local.
//
// Limite conhecido: assume que o offset do fuso à meia-noite é o mesmo do instante atual —
// na madrugada de virada de horário de verão o resultado pode deslocar 1h. Aceitável para um
// orçamento diário; instante absoluto de envio continua sendo o do banco.
export function startOfLocalDay(
  timeZone: string,
  now: Date = new Date(),
): Date {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(now);
  } catch {
    // Fuso inválido → dia UTC (não derruba o envio por configuração errada).
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  const y = get('year');
  const m = get('month');
  const d = get('day');
  const wallAsUtc = Date.UTC(
    y,
    m - 1,
    d,
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  // offset = (relógio de parede lido como UTC) − instante real; meia-noite local = 00:00 de
  // parede − offset. Arredondado ao minuto (formatToParts descarta milissegundos).
  const offsetMs = Math.round((wallAsUtc - now.getTime()) / 60_000) * 60_000;
  return new Date(Date.UTC(y, m - 1, d) - offsetMs);
}
