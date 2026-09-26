import { TICK_LABEL, tickFor } from '../../lib/live-events';
import { CheckIcon, DoubleCheckIcon } from './icons';

// Tique ✓ / ✓✓ / ✓✓ azul (P-072 — SÓ exibição: o painel nunca manda recibo de leitura). Nada quando
// não há confirmação (null), em mensagem recebida e em grupo — ver tickFor.
export function Ticks(props: {
  fromMe: boolean;
  chatJid: string;
  status?: string | null;
}) {
  const tick = tickFor(props);
  if (tick === 'none') return null;
  const label = TICK_LABEL[tick];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 ${tick === 'read' ? 'text-sky-300' : 'text-zinc-300'}`}
    >
      {tick === 'sent' ? (
        <CheckIcon className="h-3 w-3.5" />
      ) : (
        <DoubleCheckIcon className="h-3 w-4" />
      )}
    </span>
  );
}
