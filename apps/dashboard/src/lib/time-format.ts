// Horários do painel (E23) — antes duplicados em Inbox.tsx (formatTime) e Atendimento.tsx
// (hhmm/since). `now` injetável para teste.

// "14:05" — a hora do balão, como o WhatsApp Web (sem segundos).
export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Data e hora completas (tooltip do balão).
export function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Lista de conversas: hora se for hoje, senão dia/mês.
export function listTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  return d.toDateString() === now.toDateString()
    ? clock(iso)
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// "agora", "há 3 min", "há 2 h", "há 4 d" — há quanto tempo o contato espera.
export function since(iso: string, now: number = Date.now()): string {
  const min = Math.floor((now - Date.parse(iso)) / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}
