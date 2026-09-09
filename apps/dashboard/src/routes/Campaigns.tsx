import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { CampaignDto, CampaignMessageType, SessionDto } from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-zinc-600/30 text-zinc-300',
  RUNNING: 'bg-emerald-500/15 text-emerald-400',
  PAUSED: 'bg-amber-500/15 text-amber-400',
  DONE: 'bg-sky-500/15 text-sky-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

export function Campaigns() {
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<CampaignMessageType>('text');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [recipients, setRecipients] = useState('');
  const [minDelaySec, setMinDelaySec] = useState(8);
  const [maxDelaySec, setMaxDelaySec] = useState(25);
  const [typingPreview, setTypingPreview] = useState(true);
  const [firstContact, setFirstContact] = useState(true);
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    api.sessions
      .list()
      .then(setSessions)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (sessionId) return;
    const w = sessions.find((s) => s.status === 'WORKING');
    if (w) setSessionId(w.id);
  }, [sessions, sessionId]);

  async function refresh() {
    try {
      setCampaigns(await api.campaigns.list());
    } catch {
      /* noop */
    }
  }
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000); // mostra progresso ao vivo
    return () => clearInterval(id);
  }, []);

  function flash(m: string) {
    setInfo(m);
    setTimeout(() => setInfo(null), 3000);
  }
  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const list = recipients
      .split(/[\s,;]+/)
      .map((r) => r.trim())
      .filter(Boolean);
    if (!sessionId) return setError('Selecione uma sessão conectada');
    if (!name.trim()) return setError('Informe o nome da campanha');
    if (list.length === 0) return setError('Informe ao menos um destinatário');
    if (type === 'text' && !text.trim())
      return setError('Mensagem de texto vazia');
    if (type !== 'text' && !mediaUrl.trim())
      return setError('Informe a URL da mídia');
    if (maxDelaySec < minDelaySec)
      return setError('Atraso máximo deve ser ≥ mínimo');
    setBusy(true);
    try {
      await api.campaigns.create({
        sessionId,
        name: name.trim(),
        messageType: type,
        text: text.trim() || undefined,
        mediaUrl: type !== 'text' ? mediaUrl.trim() : undefined,
        recipients: list,
        minDelaySec,
        maxDelaySec,
        typingPreview,
        firstContact,
        autostart,
      });
      setName('');
      setText('');
      setMediaUrl('');
      setRecipients('');
      flash(
        autostart ? 'Campanha criada e iniciada' : 'Campanha criada (rascunho)',
      );
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const working = sessions.filter((s) => s.status === 'WORKING');
  const sessionName = (id: string) =>
    sessions.find((s) => s.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Campanhas{' '}
            <span className="text-zinc-500">· disparo + anti-ban</span>
          </h1>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Sair
        </button>
      </header>

      <main className="grid gap-6 p-6 lg:grid-cols-[400px_1fr]">
        <section>
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          {info && <p className="mb-3 text-sm text-emerald-400">{info}</p>}
          <form
            onSubmit={onCreate}
            className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <p className="text-sm font-medium">Nova campanha</p>
            <label className="space-y-1">
              <span className="block text-xs text-zinc-400">Sessão</span>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none"
              >
                <option value="">selecione…</option>
                {working.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da campanha"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CampaignMessageType)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none"
              >
                <option value="text">Texto</option>
                <option value="image">Imagem</option>
                <option value="video">Vídeo</option>
                <option value="audio">Áudio</option>
                <option value="document">Documento</option>
              </select>
              {type !== 'text' && (
                <input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="URL da mídia"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={type === 'text' ? 'Mensagem' : 'Legenda (opcional)'}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              rows={3}
              placeholder="Destinatários (números por vírgula/linha)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500"
            />
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="block text-xs text-zinc-400">
                  Atraso mín (s)
                </span>
                <input
                  type="number"
                  min={1}
                  value={minDelaySec}
                  onChange={(e) => setMinDelaySec(Number(e.target.value) || 1)}
                  className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-xs text-zinc-400">
                  Atraso máx (s)
                </span>
                <input
                  type="number"
                  min={1}
                  value={maxDelaySec}
                  onChange={(e) => setMaxDelaySec(Number(e.target.value) || 1)}
                  className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={typingPreview}
                  onChange={(e) => setTypingPreview(e.target.checked)}
                />
                <span className="text-zinc-300">“digitando…”</span>
              </label>
              <label
                className="flex items-center gap-1.5"
                title="1º contato: passa pelo guard-rail (quarentena/pausa manual) e conta como cold no reply-rate. Desmarque só para contatos que já conversam com a sessão."
              >
                <input
                  type="checkbox"
                  checked={firstContact}
                  onChange={(e) => setFirstContact(e.target.checked)}
                />
                <span className="text-zinc-300">1º contato (guard-rail)</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={autostart}
                  onChange={(e) => setAutostart(e.target.checked)}
                />
                <span className="text-zinc-300">iniciar já</span>
              </label>
            </div>
            <p className="text-xs text-zinc-500">
              Anti-ban: cada envio é espaçado aleatoriamente entre {minDelaySec}
              s e {maxDelaySec}s.
            </p>
            <button
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              Criar campanha
            </button>
          </form>
        </section>

        <section className="space-y-3">
          {campaigns.length === 0 && (
            <p className="text-sm text-zinc-500">Nenhuma campanha ainda.</p>
          )}
          {campaigns.map((c) => {
            const done = c.sentCount + c.failedCount;
            const pct = c.total ? Math.round((done / c.total) * 100) : 0;
            return (
              <div
                key={c.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-zinc-500">
                      {sessionName(c.sessionId)} · {c.messageType} ·{' '}
                      {c.minDelaySec}–{c.maxDelaySec}s
                      {c.typingPreview ? ' · digitando' : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[c.status] ?? ''}`}
                  >
                    {c.status.toLowerCase()}
                  </span>
                </div>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-emerald-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mb-3 flex justify-between text-xs text-zinc-500">
                  <span>
                    {done}/{c.total} ({c.sentCount} ok, {c.failedCount} falhas)
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {(c.status === 'DRAFT' || c.status === 'PAUSED') && (
                    <BtnEmerald
                      onClick={() =>
                        act(() =>
                          c.status === 'PAUSED'
                            ? api.campaigns.resume(c.id)
                            : api.campaigns.start(c.id),
                        )
                      }
                    >
                      {c.status === 'PAUSED' ? 'Retomar' : 'Iniciar'}
                    </BtnEmerald>
                  )}
                  {c.status === 'RUNNING' && (
                    <Btn onClick={() => act(() => api.campaigns.pause(c.id))}>
                      Pausar
                    </Btn>
                  )}
                  {(c.status === 'RUNNING' || c.status === 'PAUSED') && (
                    <Btn
                      danger
                      onClick={() => {
                        if (confirm('Cancelar a campanha?'))
                          act(() => api.campaigns.cancel(c.id));
                      }}
                    >
                      Cancelar
                    </Btn>
                  )}
                  {(c.status === 'DONE' ||
                    c.status === 'CANCELLED' ||
                    c.status === 'DRAFT') && (
                    <Btn
                      danger
                      onClick={() => {
                        if (confirm('Excluir a campanha?'))
                          act(() => api.campaigns.remove(c.id));
                      }}
                    >
                      Excluir
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function Btn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs ${
        danger
          ? 'border-red-900/60 text-red-400 hover:bg-red-950/40'
          : 'border-zinc-700 hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

function BtnEmerald({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500"
    >
      {children}
    </button>
  );
}
