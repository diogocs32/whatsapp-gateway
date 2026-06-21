import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BASE, getToken } from '../lib/api';
import { useAuth } from '../lib/auth';

interface EventItem {
  id: string;
  timestamp: number;
  event: string;
  session: string;
  payload: unknown;
}

export function Monitor() {
  const { signOut } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const es = new EventSource(
      `${BASE}/api/events/stream?token=${encodeURIComponent(token)}`,
    );
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as EventItem;
        setEvents((prev) => [data, ...prev].slice(0, 200));
      } catch {
        /* ignora */
      }
    };
    return () => es.close();
  }, []);

  const filtered = filter
    ? events.filter(
        (e) =>
          e.event.includes(filter) ||
          (e.session ?? '').includes(filter) ||
          JSON.stringify(e.payload).includes(filter),
      )
    : events;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Event Monitor <span className="text-zinc-500">· tempo real</span>
          </h1>
          <span
            className={`ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${
              connected
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}
            />
            {connected ? 'conectado (SSE)' : 'desconectado'}
          </span>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Sair
        </button>
      </header>

      <div className="flex items-center justify-between px-6 py-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filtrar por evento, sessão ou conteúdo…"
          className="w-80 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <span className="text-sm text-zinc-500">
          {filtered.length} evento(s)
        </span>
      </div>

      <main className="px-6 pb-6">
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Hora</th>
                <th className="px-4 py-2 font-medium">Evento</th>
                <th className="px-4 py-2 font-medium">Sessão</th>
                <th className="px-4 py-2 font-medium">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 font-mono text-xs">
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    Aguardando eventos… (conecte/envie/receba mensagens em uma
                    sessão)
                  </td>
                </tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id} className="align-top hover:bg-zinc-900/40">
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300">
                      {e.event}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-300">{e.session}</td>
                  <td className="max-w-md truncate px-4 py-2 text-zinc-400">
                    {JSON.stringify(e.payload)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
