import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type { MessageDto } from '@contracts';
import { isGroupJid, stripDevice } from '../../lib/jid';
import { MessageBubble } from './MessageBubble';
import { ThreadContext } from './thread-context';

// Conversa aberta — mesma no Inbox e na aba Conversa do Atendimento (E23). Agrupa balões seguidos
// do mesmo lado/remetente (o nome do participante só no 1º) e rola até o fim SÓ quando chega
// mensagem nova E o operador já estava perto do fim: tique, reação e o polling de 2,5 s do Inbox
// não puxam mais a tela para baixo enquanto ele lê/ouve algo antigo. Exceção: o envio do PRÓPRIO
// operador — o pai muda `stickKey` e a conversa vai ao fim (a mensagem enviada tem de aparecer). O pai
// troca a `key` ao trocar de conversa (estado de rolagem novo).
const NEAR_BOTTOM_PX = 120;

export function ChatThread({
  messages,
  chatJid,
  empty,
  stickKey = 0,
}: {
  messages: MessageDto[];
  chatJid: string;
  empty?: ReactNode;
  stickKey?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const isGroup = isGroupJid(chatJid);
  const lastId = messages.length ? messages[messages.length - 1].id : null;

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  const keepBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    keepBottom();
  }, [lastId, keepBottom]);

  useLayoutEffect(() => {
    if (!stickKey) return;
    atBottom.current = true;
    keepBottom();
  }, [stickKey, keepBottom]);

  const ctx = useMemo(() => ({ scrollRef, keepBottom }), [keepBottom]);

  return (
    <ThreadContext.Provider value={ctx}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && empty}
        {messages.map((m, i) => {
          const prev = i > 0 ? messages[i - 1] : null;
          const sameRun =
            !!prev &&
            prev.fromMe === m.fromMe &&
            (!isGroup ||
              m.fromMe ||
              stripDevice(prev.senderJid ?? '') ===
                stripDevice(m.senderJid ?? ''));
          return (
            <MessageBubble
              key={m.id}
              m={m}
              isGroup={isGroup}
              firstInRun={!sameRun}
            />
          );
        })}
      </div>
    </ThreadContext.Provider>
  );
}
