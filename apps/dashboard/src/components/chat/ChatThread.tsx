import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { MessageDto } from '@contracts';
import { canForward, forwardedNotice } from '../../lib/forward';
import { isGroupJid, stripDevice } from '../../lib/jid';
import { ForwardContext, type ForwardActions } from './forward-context';
import { ForwardDialog } from './ForwardDialog';
import { ForwardIcon } from './icons';
import { MessageBubble } from './MessageBubble';
import { SelectionBar } from './SelectionBar';
import { ThreadContext } from './thread-context';

// Conversa aberta — mesma no Inbox e na aba Conversa do Atendimento (E23). Agrupa balões seguidos
// do mesmo lado/remetente (o nome do participante só no 1º) e rola até o fim SÓ quando chega
// mensagem nova E o operador já estava perto do fim: tique, reação e o polling de 2,5 s do Inbox
// não puxam mais a tela para baixo enquanto ele lê/ouve algo antigo. Exceção: o envio do PRÓPRIO
// operador — o pai muda `stickKey` e a conversa vai ao fim (a mensagem enviada tem de aparecer). O pai
// troca a `key` ao trocar de conversa (estado de rolagem novo).
//
// Encaminhar (E25 · P-068): com `forward`, cada balão encaminhável ganha o menu ⌄ ("Encaminhar" →
// modo seleção) e as mídias o atalho ↪ (direto ao diálogo). No modo seleção o rodapé vira a barra
// de seleção no lugar de `footer` (a caixa de resposta do pai). Só 1 mensagem por vez.
const NEAR_BOTTOM_PX = 120;
const NOTICE_MS = 5000;

export interface ForwardConfig {
  sessionId: string;
  deviceName: string; // aparelho (nome da sessão) — mensagens de erro
  blockedReason: string | null; // aparelho desconectado → o ➤ trava com o motivo
}

export function ChatThread({
  messages,
  chatJid,
  empty,
  stickKey = 0,
  forward,
  footer,
}: {
  messages: MessageDto[];
  chatJid: string;
  empty?: ReactNode;
  stickKey?: number;
  forward?: ForwardConfig;
  footer?: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const isGroup = isGroupJid(chatJid);
  const lastId = messages.length ? messages[messages.length - 1].id : null;

  const [selecting, setSelecting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogMsg, setDialogMsg] = useState<MessageDto | null>(null);
  // Um encaminhamento por vez: o diálogo fechado à força (Esc repetido) segue montado até o pedido
  // terminar — abrir outro agora desmontaria o primeiro e perderia o resultado dele.
  const dialogOpenRef = useRef(false);
  dialogOpenRef.current = !!dialogMsg;
  const [notice, setNotice] = useState<string | null>(null);
  const openDialog = useCallback((m: MessageDto) => {
    if (dialogOpenRef.current) {
      // Só acontece com o diálogo fechado à força e o pedido ainda em voo: avisa em vez de ignorar.
      setNotice(
        'Um encaminhamento ainda está em andamento — aguarde ele terminar.',
      );
      return;
    }
    setDialogMsg(m);
  }, []);
  // Mensagem marcada no modo seleção, lida no fim do pedido (closeDialog).
  const selectedIdRef = useRef<string | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);

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

  // Ações estáveis (só setState): o valor do contexto nunca muda → os balões memorizados não
  // re-renderizam por causa dele.
  const actions = useMemo<ForwardActions>(
    () => ({
      startSelect: (m) => {
        setSelecting(true);
        setSelectedId(m.id);
      },
      select: (m) => {
        if (!canForward(m)) return;
        setSelectedId((cur) => (cur === m.id ? null : m.id));
      },
      quickForward: openDialog,
    }),
    [openDialog],
  );

  // O rodapé troca de altura (caixa de resposta ↔ barra de seleção, aviso "Você encaminhou…"): quem
  // estava no fim continua no fim.
  useLayoutEffect(() => {
    keepBottom();
  }, [selecting, notice, keepBottom]);

  // Saiu do modo seleção (✕, Esc ou encaminhou): a barra com o foco desmontou — o foco vai para o 1º
  // controle da caixa de resposta em vez de cair no <body> (APG: o foco nunca some).
  const wasSelecting = useRef(false);
  useLayoutEffect(() => {
    if (wasSelecting.current && !selecting) {
      const active = document.activeElement;
      if (!active || active === document.body) {
        // A caixa de texto primeiro (no Inbox o 📎 vem antes dela); aparelho desconectado deixa tudo
        // desabilitado → o foco vai para a própria conversa (tabIndex -1), nunca para o <body>.
        const footer = footerRef.current;
        const target =
          footer?.querySelector<HTMLElement>(
            'input:not([type="file"]):not([type="hidden"]):not(:disabled), textarea:not(:disabled)',
          ) ??
          footer?.querySelector<HTMLElement>('button:not(:disabled)') ??
          scrollRef.current;
        target?.focus({ preventScroll: true });
      }
    }
    wasSelecting.current = selecting;
  }, [selecting]);

  const cancelSelect = useCallback(() => {
    setSelecting(false);
    setSelectedId(null);
  }, []);

  // Esc sai do modo seleção. Com um <dialog> aberto (encaminhar, lightbox) o Esc é dele; com o do
  // encaminhar fechado à força e o pedido em voo, o Esc volta a valer aqui.
  useEffect(() => {
    if (!selecting) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !e.defaultPrevented &&
        !document.querySelector('dialog[open]')
      )
        cancelSelect();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selecting, cancelSelect]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [notice]);

  // A marcada sumiu da lista (saiu da janela das últimas mensagens) → nada marcado.
  const selectedMsg = selectedId
    ? (messages.find((m) => m.id === selectedId) ?? null)
    : null;
  selectedIdRef.current = selecting ? selectedId : null;

  const closeDialog = useCallback(
    (msgId: string, done?: { names: string[] }) => {
      setDialogMsg(null);
      if (done) {
        // Encaminhou → sai do modo seleção, como o WhatsApp Web — só se a marcada ainda é a que foi
        // encaminhada (com o diálogo fechado à força o operador pode ter marcado outra no meio).
        if (selectedIdRef.current === msgId) cancelSelect();
        setNotice(forwardedNotice(done.names));
      }
    },
    [cancelSelect],
  );

  return (
    <ThreadContext.Provider value={ctx}>
      <ForwardContext.Provider value={forward ? actions : null}>
        <div
          ref={scrollRef}
          onScroll={onScroll}
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-4 py-3 outline-none"
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
                selecting={selecting}
                selected={selecting && selectedId === m.id}
              />
            );
          })}
        </div>
        {/* Região viva sempre montada (só o texto muda): anúncio confiável no leitor de tela. */}
        <p
          role="status"
          className={
            notice
              ? 'flex items-center gap-2 border-t border-zinc-800 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300'
              : 'sr-only'
          }
        >
          {notice && <ForwardIcon className="h-3.5 w-4 shrink-0" />}
          {notice ?? ''}
        </p>
        {selecting ? (
          <SelectionBar
            count={selectedMsg ? 1 : 0}
            onCancel={cancelSelect}
            onForward={() => {
              if (selectedMsg) openDialog(selectedMsg);
            }}
          />
        ) : (
          // `contents`: o invólucro não entra no layout do pai (flex-col) — só dá a referência do foco.
          <div ref={footerRef} className="contents">
            {footer}
          </div>
        )}
        {forward && dialogMsg && (
          <ForwardDialog
            key={dialogMsg.id}
            msg={dialogMsg}
            sessionId={forward.sessionId}
            deviceName={forward.deviceName}
            blockedReason={forward.blockedReason}
            onClose={(done) => closeDialog(dialogMsg.id, done)}
          />
        )}
      </ForwardContext.Provider>
    </ThreadContext.Provider>
  );
}
