import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  HealthResponse,
  ObservabilitySummary,
  SessionDto,
  TimelineEvent,
} from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

function Dot({ up }: { up: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${up ? 'bg-emerald-500' : 'bg-red-500'}`}
    />
  );
}

function mb(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

function statusColor(s: string): string {
  if (s === 'ok' || s === 'WORKING') return 'text-emerald-400';
  if (
    s === 'degraded' ||
    s === 'STARTING' ||
    s === 'SCAN_QR_CODE' ||
    s === 'PAIRING_CODE'
  )
    return 'text-amber-400';
  return 'text-red-400';
}

// Tela "Logs & saúde" (F7 — Observability). Saúde + métricas (5s) + timeline por sessão.
export function Health() {
  const { signOut } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [summary, setSummary] = useState<ObservabilitySummary | null>(null);
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [selected, setSelected] = useState('');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const tick = () => {
      api
        .health()
        .then(setHealth)
        .catch(() => setHealth(null));
      api.observability
        .summary()
        .then(setSummary)
        .catch(() => setSummary(null));
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.sessions
      .list()
      .then((s) => {
        setSessions(s);
        setSelected((prev) => prev || s[0]?.id || '');
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const tick = () =>
      api.observability
        .timeline(selected, 50)
        .then(setTimeline)
        .catch(() => setTimeline([]));
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [selected]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Logs &amp; saúde{' '}
            <span className="text-zinc-500">· observability</span>
          </h1>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Sair
        </button>
      </header>

      <main className="grid gap-6 p-6 lg:grid-cols-3">
        {/* Saúde */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Saúde do sistema</h2>
            <Dot up={health?.status === 'ok'} />
          </div>
          {health ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-400">Status</dt>
                <dd className={`font-medium ${statusColor(health.status)}`}>
                  {health.status}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-400">PostgreSQL</dt>
                <dd className="flex items-center gap-2">
                  {health.checks.database ? 'ok' : 'falha'}
                  <Dot up={health.checks.database} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-400">Redis</dt>
                <dd className="flex items-center gap-2">
                  {health.checks.redis ? 'ok' : 'falha'}
                  <Dot up={health.checks.redis} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Heap V8</dt>
                <dd>{Math.round(health.checks.heapUsedPct * 100)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Memória (RAM)</dt>
                <dd>
                  {Math.round(health.checks.memoryUsedPct * 100)}% ·{' '}
                  {mb(health.checks.rssBytes)} RSS
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Uptime</dt>
                <dd>{health.uptimeSeconds}s</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-zinc-500">Sem conexão com o gateway…</p>
          )}
        </section>

        {/* Métricas */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-3 font-medium">Métricas</h2>
          {summary ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-400">Mensagens (saída)</dt>
                <dd>{summary.messages.out}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Mensagens (entrada)</dt>
                <dd>{summary.messages.in}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Heap / RSS</dt>
                <dd>
                  {mb(summary.heapUsedBytes)} / {mb(summary.rssBytes)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">RAM / limite</dt>
                <dd>
                  {Math.round(summary.memoryUsedPct * 100)}%
                  {summary.containerLimitBytes
                    ? ` de ${mb(summary.containerLimitBytes)}`
                    : ' (sem limite)'}
                </dd>
              </div>
              <div className="pt-2">
                <dt className="mb-1 text-zinc-400">Sessões por status</dt>
                <dd className="flex flex-wrap gap-2">
                  {Object.entries(summary.sessions).length === 0 && (
                    <span className="text-zinc-500">nenhuma</span>
                  )}
                  {Object.entries(summary.sessions).map(([s, n]) => (
                    <span
                      key={s}
                      className="rounded bg-zinc-800 px-2 py-0.5 text-xs"
                    >
                      <span className={statusColor(s)}>{s}</span> {n}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-zinc-500">…</p>
          )}
          <p className="mt-3 text-xs text-zinc-600">
            Scrape Prometheus em <code className="text-zinc-400">/metrics</code>
          </p>
        </section>

        {/* Timeline */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:row-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-medium">Timeline da sessão</h2>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm outline-none focus:border-emerald-500"
            >
              {sessions.length === 0 && <option value="">(sem sessões)</option>}
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <ul className="space-y-2 text-sm">
            {timeline.length === 0 && (
              <li className="text-zinc-500">Sem eventos ainda.</li>
            )}
            {timeline.map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-2 border-b border-zinc-800/60 pb-2"
              >
                <span className="whitespace-nowrap text-xs text-zinc-500">
                  {new Date(t.at).toLocaleTimeString()}
                </span>
                <span
                  className={`text-xs font-medium ${statusColor(t.status ?? t.type)}`}
                >
                  {t.status ?? t.type}
                </span>
                {t.detail && (
                  <span className="text-xs text-zinc-400">{t.detail}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
