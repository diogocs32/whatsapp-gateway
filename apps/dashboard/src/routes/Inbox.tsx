import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import type { MessageDto, SessionDto } from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export function Inbox() {
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [sessionId, setSessionId] = useState('');
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

  function openChat(e: FormEvent) {
    e.preventDefault();
    setMessages([]);
    setChat(contact.trim());
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !chat || !sessionId) return;
    setError(null);
    try {
      await api.sessions.sendText(sessionId, chat, text.trim());
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
      await api.sessions.sendMedia(sessionId, chat, file, {
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

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
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

      <div className="flex flex-wrap items-end gap-3 border-b border-zinc-800 px-6 py-3">
        <label className="space-y-1 text-sm">
          <span className="block text-xs text-zinc-400">
            Sessão (conectada)
          </span>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none"
          >
            <option value="">selecione…</option>
            {working.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={openChat} className="flex items-end gap-2">
          <label className="space-y-1 text-sm">
            <span className="block text-xs text-zinc-400">
              Contato (número)
            </span>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="5511999999999"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <button className="rounded-lg bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600">
            Abrir
          </button>
        </form>
        {working.length === 0 && (
          <span className="text-sm text-amber-400">
            Nenhuma sessão conectada — conecte uma em Sessões.
          </span>
        )}
      </div>

      <main className="flex flex-1 flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto p-6">
          {!chat && (
            <p className="text-center text-sm text-zinc-500">
              Escolha uma sessão e abra um contato para conversar.
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
              placeholder={`Mensagem para ${chat} (vira legenda do anexo)`}
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
