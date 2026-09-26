import { memo } from 'react';
import type { MessageDto } from '@contracts';
import { canForward, canQuickForward } from '../../lib/forward';
import { groupSenderLabel, senderColor } from '../../lib/jid';
import {
  UNSUPPORTED_TEXT,
  bubbleContent,
  labelText,
  messagePreview,
  type BubbleContent,
} from '../../lib/message-format';
import { clock, fullDateTime } from '../../lib/time-format';
import { useForwardActions } from './forward-context';
import { ForwardedTag } from './ForwardedTag';
import { CheckIcon, ForwardIcon } from './icons';
import { MediaView } from './MediaView';
import { MessageMenu } from './MessageMenu';
import { Reactions } from './Reactions';
import { Ticks } from './Ticks';

// Balão compartilhado por Inbox e Atendimento (E23 · P-067/P-072/P-074): nome do participante em
// grupo, selo "Encaminhada", corpo por tipo (sem "…"), hora + "aparelho" + tique, reações abaixo.
// Texto sempre como TEXTO (sem dangerouslySetInnerHTML, sem linkificar): o único link é o do mapa,
// reconstruído dos números validados (message-format.ts).
//
// Encaminhar (E25): menu ⌄ no canto do balão e, em foto/vídeo/documento/localização/contato, o atalho
// ↪ "Encaminhar mídia" ao lado (os dois aparecem no hover/foco; sem mouse, sempre). No modo seleção,
// a linha inteira vira um "checkbox": o clique marca/troca a mensagem e o conteúdo do balão fica
// inerte (não abre imagem nem toca áudio).
export const MessageBubble = memo(function MessageBubble({
  m,
  isGroup,
  firstInRun,
  selecting = false,
  selected = false,
}: {
  m: MessageDto;
  isGroup: boolean;
  firstInRun: boolean;
  selecting?: boolean;
  selected?: boolean;
}) {
  const actions = useForwardActions();
  const content = bubbleContent(m);
  const sender = isGroup && firstInRun ? groupSenderLabel(m) : null;
  const hasReactions = (m.reactions ?? []).some((r) => r.emoji);
  const sticker = content.kind === 'media' && content.mediaType === 'sticker';
  const forwardable = !!actions && canForward(m);
  const quick = !!actions && !selecting && canQuickForward(m);
  const bubbleCls = sticker
    ? 'bg-transparent px-0 pt-0'
    : m.fromMe
      ? 'bg-emerald-800 text-white shadow-sm'
      : 'bg-zinc-800 text-zinc-100 shadow-sm';

  const shortcut = quick && (
    <button
      type="button"
      onClick={() => actions!.quickForward(m)}
      aria-label="Encaminhar mídia"
      title="Encaminhar mídia"
      className="shrink-0 self-center rounded-full bg-zinc-800 p-1.5 text-zinc-300 opacity-0 shadow ring-1 ring-zinc-700 transition-opacity group-hover/msg:opacity-100 group-has-[:focus-visible]/msg:opacity-100 hover:bg-zinc-700 hover:text-zinc-100 focus-visible:opacity-100 not-pointer-fine:opacity-100"
    >
      <ForwardIcon className="h-3.5 w-4" />
    </button>
  );

  return (
    <div
      className={`group/msg relative flex items-center gap-2 ${firstInRun ? 'mt-2' : 'mt-0.5'} ${hasReactions ? 'mb-4' : ''} ${
        selecting
          ? `-mx-2 rounded-md px-2 ${selected ? 'bg-emerald-500/10' : ''}`
          : ''
      }`}
    >
      {selecting && (
        <>
          {/* A linha inteira é o alvo do clique; o quadrado à esquerda é só o desenho. */}
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            // O balão fica inert (fora da árvore de acessibilidade): o nome diz de quem, quando e o quê.
            aria-label={`Selecionar ${m.fromMe ? 'sua mensagem' : 'mensagem'} das ${clock(m.timestamp)}: ${
              messagePreview(m) || labelText(m.type, m.mediaType)
            }`}
            disabled={!forwardable}
            title={
              forwardable
                ? undefined
                : 'Esta mensagem não pode ser encaminhada pelo painel'
            }
            onClick={() => actions?.select(m)}
            className="absolute inset-0 z-20 rounded-md hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          />
          <span
            aria-hidden="true"
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
              selected
                ? 'border-emerald-500 bg-emerald-600 text-white'
                : forwardable
                  ? 'border-zinc-500'
                  : 'border-zinc-700 opacity-40'
            }`}
          >
            {selected && <CheckIcon className="h-2.5 w-3" />}
          </span>
        </>
      )}
      <div
        className={`flex min-w-0 flex-1 items-center gap-1.5 ${m.fromMe ? 'justify-end' : 'justify-start'}`}
      >
        {m.fromMe && shortcut}
        <div
          inert={selecting}
          // Sem mouse o ⌄ fica sempre à vista: reserva o canto em vez de cobrir o fim da 1ª linha.
          className={`relative max-w-[75%] min-w-[4.5rem] rounded-lg px-2.5 pt-1.5 pb-1 text-sm ${bubbleCls} ${
            forwardable && !selecting && !sticker ? 'not-pointer-fine:pr-8' : ''
          }`}
        >
          {forwardable && !selecting && (
            <MessageMenu
              tone={sticker ? 'sticker' : m.fromMe ? 'out' : 'in'}
              onForward={() => actions!.startSelect(m)}
            />
          )}
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
        {!m.fromMe && shortcut}
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
