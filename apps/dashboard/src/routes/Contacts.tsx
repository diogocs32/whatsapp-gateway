import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type {
  ChannelDto,
  ContactCheckDto,
  ContactDirectoryDto,
  SessionDto,
} from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export function Contacts() {
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [numbers, setNumbers] = useState('');
  const [results, setResults] = useState<ContactCheckDto[]>([]);
  const [pics, setPics] = useState<Record<string, string | null>>({});

  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelJid, setChannelJid] = useState('');
  const [channel, setChannel] = useState<ChannelDto | null>(null);

  const [directory, setDirectory] = useState<ContactDirectoryDto[]>([]);
  const [dirSearch, setDirSearch] = useState('');

  async function loadDirectory() {
    const r = await guard(() =>
      api.contacts.directory(sessionId, dirSearch.trim() || undefined),
    );
    if (r) setDirectory(r);
  }

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

  function flash(m: string) {
    setInfo(m);
    setTimeout(() => setInfo(null), 3000);
  }
  async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setError(null);
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function check(e: FormEvent) {
    e.preventDefault();
    const list = numbers
      .split(/[\s,;]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    const r = await guard(() => api.contacts.check(sessionId, list));
    if (r) {
      setResults(r);
      // busca fotos dos que existem
      for (const c of r) {
        if (c.exists && c.jid) {
          void api.contacts
            .profilePicture(sessionId, c.jid)
            .then((p) =>
              setPics((prev) => ({ ...prev, [c.jid as string]: p.url })),
            )
            .catch(() => {});
        }
      }
    }
  }

  async function block(jid: string, action: 'block' | 'unblock') {
    const ok = await guard(() => api.contacts.block(sessionId, jid, action));
    if (ok)
      flash(action === 'block' ? 'Contato bloqueado' : 'Contato desbloqueado');
  }

  async function createChannel(e: FormEvent) {
    e.preventDefault();
    if (!channelName.trim()) return;
    const c = await guard(() =>
      api.channels.create(
        sessionId,
        channelName.trim(),
        channelDesc.trim() || undefined,
      ),
    );
    if (c) {
      setChannel(c);
      setChannelName('');
      setChannelDesc('');
      flash(`Canal "${c.name}" criado`);
    }
  }

  const working = sessions.filter((s) => s.status === 'WORKING');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Contatos <span className="text-zinc-500">· verificar & canais</span>
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
        {working.length === 0 && (
          <span className="text-sm text-amber-400">
            Nenhuma sessão conectada — conecte uma em Sessões.
          </span>
        )}
      </div>

      <main className="grid gap-6 p-6 lg:grid-cols-2">
        <section>
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          {info && <p className="mb-3 text-sm text-emerald-400">{info}</p>}
          <form
            onSubmit={check}
            className="mb-4 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <p className="text-sm font-medium">Verificar números no WhatsApp</p>
            <textarea
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              rows={3}
              placeholder="Números separados por vírgula ou linha"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              disabled={busy || !sessionId}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              Verificar
            </button>
          </form>

          <ul className="space-y-2">
            {results.map((c) => (
              <li
                key={c.number}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm"
              >
                {c.exists && c.jid && pics[c.jid] ? (
                  <img
                    src={pics[c.jid] as string}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-800 text-xs text-zinc-500">
                    {c.exists ? '👤' : '—'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate">{c.number}</p>
                  <p className="truncate font-mono text-xs text-zinc-500">
                    {c.exists ? c.jid : 'não está no WhatsApp'}
                  </p>
                </div>
                {c.exists && c.jid && (
                  <span className="flex gap-1">
                    <button
                      onClick={() => void block(c.jid as string, 'block')}
                      className="rounded-md border border-red-900/60 px-2 py-0.5 text-xs text-red-400 hover:bg-red-950/40"
                    >
                      bloquear
                    </button>
                    <button
                      onClick={() => void block(c.jid as string, 'unblock')}
                      className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800"
                    >
                      desbloquear
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="mb-1 text-sm font-medium">
              Canais <span className="text-zinc-500">· beta</span>
            </p>
            <p className="mb-3 text-xs text-zinc-500">
              Newsletter/Canais do WhatsApp. Depende de suporte da conta.
            </p>
            <form onSubmit={createChannel} className="space-y-2">
              <input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Nome do canal"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                value={channelDesc}
                onChange={(e) => setChannelDesc(e.target.value)}
                placeholder="Descrição (opcional)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <button
                disabled={busy || !sessionId}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                Criar canal
              </button>
            </form>

            <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
              <div className="flex items-end gap-2">
                <input
                  value={channelJid}
                  onChange={(e) => setChannelJid(e.target.value)}
                  placeholder="JID do canal (…@newsletter)"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() =>
                    channelJid.trim() &&
                    void guard(() =>
                      api.channels.info(sessionId, channelJid.trim()),
                    ).then((c) => c && setChannel(c))
                  }
                  disabled={busy}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-40"
                >
                  Ver
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    channelJid.trim() &&
                    void guard(() =>
                      api.channels.follow(sessionId, channelJid.trim()),
                    ).then(() => flash('Seguindo canal'))
                  }
                  disabled={busy}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-40"
                >
                  Seguir
                </button>
                <button
                  onClick={() =>
                    channelJid.trim() &&
                    void guard(() =>
                      api.channels.unfollow(sessionId, channelJid.trim()),
                    ).then(() => flash('Deixou de seguir'))
                  }
                  disabled={busy}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-40"
                >
                  Deixar de seguir
                </button>
              </div>
              {channel && (
                <div className="rounded-lg bg-zinc-800 p-3 text-sm">
                  <p className="font-medium">{channel.name}</p>
                  <p className="font-mono text-xs text-zinc-500">
                    {channel.id}
                  </p>
                  {channel.description && (
                    <p className="mt-1 text-zinc-400">{channel.description}</p>
                  )}
                  {channel.subscribers != null && (
                    <p className="mt-1 text-xs text-zinc-500">
                      {channel.subscribers} inscritos
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Diretório de contatos</p>
              <span className="text-xs text-zinc-500">
                (LID↔telefone + metadados, persistido — base p/ automações)
              </span>
              <input
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
                placeholder="buscar nome/telefone"
                className="ml-auto rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => void loadDirectory()}
                disabled={busy || !sessionId}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-40"
              >
                Carregar
              </button>
              <span className="text-xs text-zinc-500">{directory.length}</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-left text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Telefone</th>
                    <th className="px-3 py-2 font-medium">LID</th>
                    <th className="px-3 py-2 font-medium">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {directory.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-zinc-500"
                      >
                        Vazio — clique em Carregar (preenche conforme a sessão
                        interage/sincroniza).
                      </td>
                    </tr>
                  )}
                  {directory.map((c) => (
                    <tr key={c.waId} className="hover:bg-zinc-900/40">
                      <td className="px-3 py-2">
                        {c.name ?? c.pushName ?? '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {c.phone ?? '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                        {c.lid ? c.lid.split('@')[0] : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {c.source ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
