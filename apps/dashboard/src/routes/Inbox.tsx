import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import type { ConversationDto, MessageDto, SessionDto } from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

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
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Lista de conversas (contatos que abriram conversa) da sessão selecionada.
  useEffect(() => {
    if (!sessionId) {
      setConversations([]);
      return;
    }
    const tick = () =>
      api.sessions
        .conversations(sessionId)
        .then(setConversations)
        .catch(() => {});
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !chat) return;
    const tick = () =>
      api.sessions
        .messages(sessionId, chat)
        .then(setMessages)
        .catch(() => {});
    tick();
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [sessionId, chat]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !chat || !sessionId) return;
    setError(null);
    try {
      await api.sessions.sendText(sessionId, sendTarget(chat), text.trim());
      setText('');
      setMessages(await api.sessions.messages(sessionId, chat));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !chat || !sessionId) return;
    setError(null);
    try {
      await api.sessions.sendMedia(sessionId, sendTarget(chat), file, {
        caption: text.trim() || undefined,
      });
      setText('');
      if (fileRef.current) fileRef.current.value = '';
      setMessages(await api.sessions.messages(sessionId, chat));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const working = sessions.filter((s) => s.status === 'WORKING');
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
                      {formatTime(conv.lastTimestamp)}
                    </span>
                  </div>
                  <div className="truncate text-xs text-zinc-400">
                    {previewText(conv)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex flex-1 flex-col">
          {chat && (
            <div className="border-b border-zinc-800 px-4 py-3 text-sm font-medium">
              {activeName}
            </div>
          )}
          <div className="flex-1 space-y-2 overflow-y-auto p-6">
            {!chat && (
              <p className="text-center text-sm text-zinc-500">
                Escolha uma conversa à esquerda ou abra um novo contato.
              </p>
            )}
            {chat &&
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                      m.fromMe
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-800 text-zinc-100'
                    }`}
                  >
                    {m.mediaType ? (
                      <div className="space-y-1">
                        <MediaBubble m={m} />
                        {m.text && <div>{m.text}</div>}
                      </div>
                    ) : (
                      <div>
                        {m.text ?? <em className="opacity-60">[{m.type}]</em>}
                      </div>
                    )}
                    <div className="mt-1 text-right text-[10px] opacity-60">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            {chat && messages.length === 0 && (
              <p className="text-center text-sm text-zinc-500">
                Sem mensagens ainda. Envie a primeira.
              </p>
            )}
            <div ref={endRef} />
          </div>

          {chat && (
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
                disabled={!text.trim()}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Enviar
              </button>
            </form>
          )}
          {error && <p className="px-4 pb-3 text-sm text-red-400">{error}</p>}
        </main>
      </div>
    </div>
  );
}

// Número/identificador exibível a partir do JID (parte antes do @).
function numberFromJid(jid: string): string {
  return jid.split('@')[0] || jid;
}

// Para envio, usa o número quando o JID é de telefone (@s.whatsapp.net / @c.us);
// caso contrário (lid/grupo) usa o id como veio.
function sendTarget(chat: string): string {
  if (chat.endsWith('@s.whatsapp.net') || chat.endsWith('@c.us')) {
    return numberFromJid(chat);
  }
  return chat;
}

function displayName(conv: ConversationDto): string {
  return conv.name?.trim() || numberFromJid(conv.chatJid);
}

// Rótulo do preview quando a última mensagem não tem texto (mídia).
function mediaLabel(type: string): string {
  switch (type) {
    case 'image':
      return '📷 Imagem';
    case 'video':
      return '🎥 Vídeo';
    case 'audio':
      return '🎵 Áudio';
    case 'document':
      return '📄 Documento';
    case 'sticker':
      return '🩷 Figurinha';
    default:
      return '';
  }
}

function previewText(conv: ConversationDto): string {
  const body = conv.lastText?.trim() || mediaLabel(conv.lastType) || '…';
  return conv.lastFromMe ? `Você: ${body}` : body;
}

// Hora (se hoje) ou data curta da última mensagem.
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
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

// Renderiza a mídia conforme o tipo, usando a URL pré-assinada (mediaUrl) do gateway.
function MediaBubble({ m }: { m: MessageDto }) {
  const url = m.mediaUrl ?? undefined;
  if (m.mediaType === 'image' || m.mediaType === 'sticker') {
    return url ? (
      <img
        src={url}
        alt={m.fileName ?? 'imagem'}
        className="max-h-64 rounded-lg"
      />
    ) : (
      <em className="opacity-60">[imagem]</em>
    );
  }
  if (m.mediaType === 'video') {
    return url ? (
      <video src={url} controls className="max-h-64 rounded-lg" />
    ) : (
      <em className="opacity-60">[vídeo]</em>
    );
  }
  if (m.mediaType === 'audio') {
    return url ? (
      <audio src={url} controls className="w-56" />
    ) : (
      <em className="opacity-60">[áudio]</em>
    );
  }
  if (m.mediaType === 'document') {
    return url ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 underline"
      >
        📄 {m.fileName ?? 'documento'}
      </a>
    ) : (
      <em className="opacity-60">[documento]</em>
    );
  }
  return <em className="opacity-60">[{m.type}]</em>;
}
