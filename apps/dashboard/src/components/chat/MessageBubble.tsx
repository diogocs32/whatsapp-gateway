import { memo } from 'react';
import type { MessageDto } from '@contracts';
import { groupSenderLabel, senderColor } from '../../lib/jid';
import {
  UNSUPPORTED_TEXT,
  bubbleContent,
  type BubbleContent,
} from '../../lib/message-format';
import { clock, fullDateTime } from '../../lib/time-format';
import { ForwardedTag } from './ForwardedTag';
import { MediaView } from './MediaView';
import { Reactions } from './Reactions';
import { Ticks } from './Ticks';

// Balão compartilhado por Inbox e Atendimento (E23 · P-067/P-072/P-074): nome do participante em
// grupo, selo "Encaminhada", corpo por tipo (sem "…"), hora + "aparelho" + tique, reações abaixo.
// Texto sempre como TEXTO (sem dangerouslySetInnerHTML, sem linkificar): o único link é o do mapa,
// reconstruído dos números validados (message-format.ts).
export const MessageBubble = memo(function MessageBubble({
  m,
  isGroup,
  firstInRun,
}: {
  m: MessageDto;
  isGroup: boolean;
  firstInRun: boolean;
}) {
  const content = bubbleContent(m);
  const sender = isGroup && firstInRun ? groupSenderLabel(m) : null;
  const hasReactions = (m.reactions ?? []).some((r) => r.emoji);
  const sticker = content.kind === 'media' && content.mediaType === 'sticker';
  const bubbleCls = sticker
    ? 'bg-transparent px-0 pt-0'
    : m.fromMe
      ? 'bg-emerald-800 text-white shadow-sm'
      : 'bg-zinc-800 text-zinc-100 shadow-sm';

  return (
    <div
      className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'} ${firstInRun ? 'mt-2' : 'mt-0.5'} ${hasReactions ? 'mb-4' : ''}`}
    >
      <div
        className={`relative max-w-[75%] min-w-[4.5rem] rounded-lg px-2.5 pt-1.5 pb-1 text-sm ${bubbleCls}`}
      >
        {sender && (
          <div
            className={`mb-0.5 max-w-full truncate text-xs font-medium ${senderColor(sender.key)}`}
            title={m.senderJid ?? undefined}
          >
            {sender.text}
          </div>
        )}
        <ForwardedTag
          isForwarded={m.isForwarded}
          forwardingScore={m.forwardingScore}
        />
        <Body m={m} content={content} />
        <div
          className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] ${
            sticker
              ? 'w-fit ml-auto rounded-full bg-black/50 px-1.5 text-zinc-200'
              : m.fromMe
                ? 'text-emerald-100/80'
                : 'text-zinc-400'
          }`}
        >
          {m.fromMe && m.source === 'phone' && (
            <span title="Enviada pelo celular">aparelho ·</span>
          )}
          <time dateTime={m.timestamp} title={fullDateTime(m.timestamp)}>
            {clock(m.timestamp)}
          </time>
          <Ticks fromMe={m.fromMe} chatJid={m.chatJid} status={m.status} />
        </div>
        <Reactions
          reactions={m.reactions}
          align={m.fromMe ? 'right' : 'left'}
        />
      </div>
    </div>
  );
});

const TEXT = 'whitespace-pre-wrap [overflow-wrap:anywhere]';

function Body({ m, content }: { m: MessageDto; content: BubbleContent }) {
  switch (content.kind) {
    case 'text':
      return <p className={TEXT}>{content.text}</p>;
    case 'media':
      return (
        <div className="space-y-1">
          <MediaView
            m={m}
            mediaType={content.mediaType}
            label={content.label}
          />
          {content.caption && <p className={TEXT}>{content.caption}</p>}
        </div>
      );
    case 'location':
      return (
        <div className="space-y-1">
          <div className={`${TEXT} font-medium`}>
            📍 {content.label ?? 'Localização'}
          </div>
          {content.mapUrl && (
            <a
              href={content.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-300 underline hover:text-sky-200"
            >
              Abrir no mapa
            </a>
          )}
        </div>
      );
    case 'contact':
      return (
        <div className="space-y-1.5">
          {content.contacts.length === 0 && <p>👤 Contato</p>}
          {content.contacts.map((c, i) => (
            <div key={i} className="flex gap-2">
              <span aria-hidden="true">👤</span>
              <div className="min-w-0">
                {c.name && <div className="font-medium">{c.name}</div>}
                {c.phones.map((p, j) => (
                  <div key={j} className="text-xs opacity-90">
                    {p}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case 'poll':
      return (
        <div className="space-y-1">
          <div className="text-xs opacity-80">📊 Enquete</div>
          {content.question && (
            <div className={`${TEXT} font-medium`}>{content.question}</div>
          )}
          <ul className="space-y-0.5">
            {content.options.map((o, i) => (
              <li key={i} className={`flex gap-2 ${TEXT}`}>
                <span aria-hidden="true" className="opacity-70">
                  ○
                </span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'event':
      return (
        <div className="space-y-0.5">
          <div className="text-xs opacity-80">📅 Evento</div>
          {content.name && (
            <div className={`${TEXT} font-medium`}>{content.name}</div>
          )}
          {content.description && <p className={TEXT}>{content.description}</p>}
        </div>
      );
    case 'group_invite':
      return (
        <div className="space-y-0.5">
          <div className="text-xs opacity-80">👥 Convite para grupo</div>
          {content.groupName && (
            <div className={`${TEXT} font-medium`}>{content.groupName}</div>
          )}
          {content.caption && <p className={TEXT}>{content.caption}</p>}
        </div>
      );
    case 'poll_vote':
      return <p className="italic opacity-90">{content.label}</p>;
    case 'unsupported':
      return (
        <div className="space-y-0.5">
          {content.summary && <p className={TEXT}>{content.summary}</p>}
          <p className="text-xs italic opacity-75">{UNSUPPORTED_TEXT}</p>
        </div>
      );
  }
}
