import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import type { ConversationDto, MessageDto, SessionDto } from '@contracts';
import { ChatThread } from '../components/chat/ChatThread';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { displayName, isGroupJid, sendTarget } from '../lib/jid';
import { stabilize } from '../lib/live-events';
import { conversationPreview } from '../lib/message-format';
import { deviceBlockReason, sendErrorMessage } from '../lib/send-feedback';
import { listTime } from '../lib/time-format';

export function Inbox() {
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [contact, setContact] = useState('');
  const [chat, setChat] = useState('');
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  // UP-02 (auditoria 09/2026): uma intenção de envio por vez. `sending` trava o formulário
  // enquanto a requisição está em voo; `intentRef` guarda a idempotencyKey da intenção corrente
  // para um retry (mesmo texto, mesmo chat) reusar a MESMA chave — o gateway dedupa.
  const [sending, setSending] = useState(false);
  const intentRef = useRef<{ key: string; chat: string; text: string } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  // Conversa aberta AGORA (E23): o envio termina segundos depois e o operador pode já estar noutra
  // conversa — a releitura pós-envio só vale se ainda for a mesma (sessão + chat).
  const openRef = useRef({ sessionId, chat });
  openRef.current = { sessionId, chat };
  // Envio do próprio operador → a conversa vai ao fim (ChatThread `stickKey`).
  const [stickKey, setStickKey] = useState(0);

  function intentKey(kind: 'text' | 'media', payload: string): string {
    const cur = intentRef.current;
    if (cur && cur.chat === chat && cur.text === `${kind}:${payload}`) {
      return cur.key; // retry da mesma intenção → mesma chave
    }
    const key = `painel-${crypto.randomUUID()}`;
    intentRef.current = { key, chat, text: `${kind}:${payload}` };
    return key;
  }

  useEffect(() => {
    const tick = () =>
      api.sessions
        .list()
        .then(setSessions)
        .catch(() => {});
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (sessionId) return;
    const working = sessions.find((s) => s.status === 'WORKING');
    if (working) setSessionId(working.id);
  }, [sessions, sessionId]);

  // Troca de sessão de origem: limpa chat/histórico/rascunho — sem isto o compositor mantinha o
  // destinatário e o histórico da conta anterior (UP-03: o usuário confirma origem+destino).
  useEffect(() => {
    setChat('');
    setMessages([]);
    setContact('');
    intentRef.current = null;
  }, [sessionId]);

  // Lista de conversas (contatos que abriram conversa) da sessão selecionada.
  // UP-03: `alive` descarta respostas que chegam DEPOIS da troca de sessão (a resposta lenta da
  // conta anterior não sobrescreve a lista da conta atual).
  useEffect(() => {
    if (!sessionId) {
      setConversations([]);
      return;
    }
    let alive = true;
    let inFlight = false;
    const tick = () => {
      if (inFlight) return; // uma leitura pendente por recurso (UP-06)
      inFlight = true;
      api.sessions
        .conversations(sessionId)
        .then((list) => {
          if (alive) setConversations(list);
        })
        .catch(() => {})
        .finally(() => {
          inFlight = false;
        });
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !chat) return;
    let alive = true;
    let inFlight = false;
    const tick = () => {
      if (inFlight) return;
      inFlight = true;
      api.sessions
        .messages(sessionId, chat)
        .then((list) => {
          // A mediaUrl pré-assinada muda a cada leitura: `stabilize` mantém os objetos que não
          // mudaram (balões memorizados não re-renderizam; a mídia vem do cache por mensagem).
          if (alive) setMessages((prev) => stabilize(prev, list));
        })
        .catch(() => {})
        .finally(() => {
          inFlight = false;
        });
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [sessionId, chat]);

  function selectChat(jid: string) {
    if (jid === chat) return;
    setMessages([]);
    setChat(jid);
    setContact('');
  }

  function openChat(e: FormEvent) {
    e.preventDefault();
    const target = contact.trim();
    if (!target) return;
    setMessages([]);
    setChat(target);
  }

  const deviceName = () =>
    sessions.find((s) => s.id === sessionId)?.name ?? sessionId;

  function reloadAfterSend(sid: string, jid: string) {
    const same = () =>
      openRef.current.sessionId === sid && openRef.current.chat === jid;
    if (same()) setStickKey((k) => k + 1);
    api.sessions
      .messages(sid, jid)
      .then((list) => {
        if (same()) setMessages((prev) => stabilize(prev, list));
      })
      .catch(() => {});
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !chat || !sessionId || sending) return;
    setError(null);
    setSending(true);
    const target = sendTarget(chat);
    const key = intentKey('text', `${target}:${body}`);
    try {
      await api.sessions.sendText(sessionId, target, body, {
        idempotencyKey: key,
      });
      intentRef.current = null; // intenção concluída — próximo envio ganha chave nova
      // Só limpa se o campo ainda tem o texto enviado (o operador pode ter começado outra mensagem).
      setText((t) => (t.trim() === body ? '' : t));
      // Falha ao reler o histórico NÃO é falha do envio (UP-02).
      reloadAfterSend(sessionId, chat);
    } catch (e) {
      setError(sendErrorMessage(e as { status?: number }, deviceName()));
    } finally {
      setSending(false);
    }
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !chat || !sessionId || sending) return;
    setError(null);
    setSending(true);
    const target = sendTarget(chat);
    const caption = text.trim() || undefined;
    const key = intentKey(
      'media',
      `${target}:${file.name}:${file.size}:${caption ?? ''}`,
    );
    try {
      await api.sessions.sendMedia(sessionId, target, file, {
        caption,
        idempotencyKey: key,
      });
      intentRef.current = null;
      if (caption) setText((t) => (t.trim() === caption ? '' : t));
      if (fileRef.current) fileRef.current.value = '';
      reloadAfterSend(sessionId, chat);
    } catch (e) {
      setError(sendErrorMessage(e as { status?: number }, deviceName()));
    } finally {
      setSending(false);
    }
  }

  const working = sessions.filter((s) => s.status === 'WORKING');
  const device = sessions.find((s) => s.id === sessionId);
  const activeConv = conversations.find((c) => c.chatJid === chat);
  const activeName = activeConv ? displayName(activeConv) : chat;

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Inbox <span className="text-zinc-500">· mensagens</span>
          </h1>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Sair
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col border-r border-zinc-800">
          <div className="space-y-2 border-b border-zinc-800 p-3">
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none"
            >
              <option value="">Sessão: selecione…</option>
              {working.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <form onSubmit={openChat} className="flex gap-2">
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Novo contato: 5511999999999"
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <button className="shrink-0 rounded-lg bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600">
                Abrir
              </button>
            </form>
            {working.length === 0 && (
              <p className="text-xs text-amber-400">
                Nenhuma sessão conectada — conecte uma em Sessões.
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!sessionId && (
              <p className="p-4 text-center text-xs text-zinc-500">
                Selecione uma sessão para ver as conversas.
              </p>
            )}
            {sessionId && conversations.length === 0 && (
              <p className="p-4 text-center text-xs text-zinc-500">
                Nenhuma conversa ainda.
              </p>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.chatJid}
                onClick={() => selectChat(conv.chatJid)}
                className={`flex w-full items-center gap-3 border-b border-zinc-900 px-3 py-2.5 text-left hover:bg-zinc-900 ${
                  chat === conv.chatJid ? 'bg-zinc-900' : ''
                }`}
              >
                <Avatar conv={conv} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {displayName(conv)}
                    </span>
                    <span className="shrink-0 text-[10px] text-zinc-500">
                      {listTime(conv.lastTimestamp)}
                    </span>
                  </div>
                  <div className="truncate text-xs text-zinc-400">
                    {conversationPreview(conv)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {chat && (
            <div className="border-b border-zinc-800 px-4 py-3 text-sm font-medium">
              {activeName}
              {isGroupJid(chat) && (
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  grupo
                </span>
              )}
            </div>
          )}
          {!chat && (
            <p className="flex-1 p-6 text-center text-sm text-zinc-500">
              Escolha uma conversa à esquerda ou abra um novo contato.
            </p>
          )}
          {chat && (
            <ChatThread
              key={`${sessionId}|${chat}`}
              messages={messages}
              chatJid={chat}
              stickKey={stickKey}
              empty={
                <p className="py-6 text-center text-sm text-zinc-500">
                  Sem mensagens ainda. Envie a primeira.
                </p>
              }
              // E25: ⌄ Encaminhar / atalho ↪ — conversas da MESMA sessão; o modo seleção troca a
              // caixa de resposta (footer) pela barra de seleção.
              forward={{
                sessionId,
                deviceName: deviceName(),
                blockedReason: deviceBlockReason(device, 'encaminhe'),
              }}
              footer={
                <>
                  <form
                    onSubmit={send}
                    className="flex gap-2 border-t border-zinc-800 p-4"
                  >
                    <input
                      type="file"
                      ref={fileRef}
                      className="hidden"
                      onChange={onPickFile}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      title="Anexar arquivo (imagem, áudio, vídeo, documento)"
                      className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
                    >
                      📎
                    </button>
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={`Mensagem para ${activeName} (vira legenda do anexo)`}
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!text.trim() || sending}
                      aria-busy={sending}
                      title={
                        !text.trim()
                          ? 'Escreva a mensagem para enviar'
                          : undefined
                      }
                      className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      {sending ? 'Enviando…' : 'Enviar'}
                    </button>
                  </form>
                  {error && (
                    <p role="alert" className="px-4 pb-3 text-sm text-red-400">
                      {error}
                    </p>
                  )}
                </>
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}

function Avatar({ conv }: { conv: ConversationDto }) {
  if (conv.imgUrl) {
    return (
      <img
        src={conv.imgUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initial = displayName(conv).charAt(0).toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-200">
      {initial || '?'}
    </div>
  );
}
