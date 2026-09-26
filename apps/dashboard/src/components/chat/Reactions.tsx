import type { MessageReactionDto } from '@contracts';
import { reactionChips } from '../../lib/live-events';
import { formatPhone, isPhoneJid, numberFromJid } from '../../lib/jid';

// Pílula de reações abaixo do balão (FAQ do WhatsApp: os emojis ficam abaixo da mensagem, com a
// contagem; uma reação por pessoa). Até 3 emojis + total; a lista completa vai no title e no
// texto para leitor de tela.
function who(r: MessageReactionDto): string {
  if (r.fromMe) return 'Você';
  if (r.senderJid && isPhoneJid(r.senderJid))
    return formatPhone(numberFromJid(r.senderJid));
  return 'Contato';
}

export function Reactions({
  reactions,
  align,
}: {
  reactions: MessageReactionDto[] | undefined;
  align: 'left' | 'right';
}) {
  const { chips, total } = reactionChips(reactions);
  if (!total) return null;
  const mine = chips.some((c) => c.mine);
  const summary = chips.map((c) => `${c.emoji} ${c.count}`).join(', ');
  const title = (reactions ?? [])
    .filter((r) => r.emoji)
    .map((r) => `${r.emoji} ${who(r)}`)
    .join('\n');
  return (
    <span
      title={title}
      className={`absolute -bottom-3.5 ${align === 'right' ? 'right-2' : 'left-2'} inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs leading-none shadow ${
        mine ? 'border-emerald-700 bg-zinc-800' : 'border-zinc-950 bg-zinc-800'
      }`}
    >
      <span aria-hidden="true">{chips.slice(0, 3).map((c) => c.emoji)}</span>
      {total > 1 && (
        <span aria-hidden="true" className="ml-0.5 text-[11px] text-zinc-300">
          {total}
        </span>
      )}
      <span className="sr-only">
        Reações: {summary}
        {mine ? ' (inclui a sua)' : ''}
      </span>
    </span>
  );
}
