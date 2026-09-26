import { forwardBadge } from '../../lib/message-format';
import { ForwardIcon } from './icons';

// Selo no topo do balão: "↪ Encaminhada" / "↪↪ Encaminhada com frequência" (5+ conversas — FAQ).
export function ForwardedTag(props: {
  isForwarded?: boolean | null;
  forwardingScore?: number | null;
}) {
  const badge = forwardBadge(props);
  if (!badge) return null;
  return (
    <div className="mb-0.5 flex items-center gap-1 text-xs italic opacity-75">
      <ForwardIcon
        double={badge.frequent}
        className={badge.frequent ? 'h-3 w-4' : 'h-3 w-3'}
      />
      {badge.label}
    </div>
  );
}
