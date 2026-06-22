import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { LicenseStatus } from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

function fmtDate(s: string | null): string {
  return s ? new Date(s).toLocaleDateString('pt-BR') : '—';
}

export function License() {
  const { signOut } = useAuth();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function refresh() {
    try {
      setStatus(await api.license.status());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function onInstall(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      const s = await api.license.install(token.trim());
      setStatus(s);
      setToken('');
      setOk(`Licença instalada: ${s.customer}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onRemove() {
    if (
      !confirm(
        'Remover a licença? O sistema volta ao modo comunidade (limites mínimos).',
      )
    )
      return;
    setError(null);
    setOk(null);
    try {
      setStatus(await api.license.remove());
      setOk('Licença removida — modo comunidade.');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Licença <span className="text-zinc-500">· licenciamento</span>
          </h1>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Sair
        </button>
      </header>

      <main className="max-w-3xl p-6">
        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Status</h2>
            {status && (
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  status.valid
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                {status.valid ? 'licença ativa' : 'modo comunidade'}
              </span>
            )}
          </div>
          {status ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-zinc-400">Cliente</dt>
              <dd>{status.customer}</dd>
              <dt className="text-zinc-400">Assentos (usuários)</dt>
              <dd>{status.maxSeats}</dd>
              <dt className="text-zinc-400">Sessões</dt>
              <dd>{status.maxSessions}</dd>
              <dt className="text-zinc-400">Módulos</dt>
              <dd>
                {status.features.length ? status.features.join(', ') : '—'}
              </dd>
              <dt className="text-zinc-400">Emitida</dt>
              <dd>{fmtDate(status.issuedAt)}</dd>
              <dt className="text-zinc-400">Expira</dt>
              <dd>
                {status.expiresAt ? fmtDate(status.expiresAt) : 'sem expiração'}
              </dd>
              {status.community && status.reason && (
                <>
                  <dt className="text-zinc-400">Motivo</dt>
                  <dd className="text-amber-400">{status.reason}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="text-sm text-zinc-500">carregando…</p>
          )}
          {status && !status.community && (
            <button
              onClick={onRemove}
              className="mt-4 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/40"
            >
              Remover licença
            </button>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-3 font-medium">Instalar / atualizar licença</h2>
          <form onSubmit={onInstall} className="space-y-3">
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole aqui o token da licença (CZL1...)"
              rows={4}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500"
            />
            <button
              disabled={!token.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Instalar
            </button>
          </form>
          {ok && <p className="mt-3 text-sm text-emerald-400">{ok}</p>}
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </section>
      </main>
    </div>
  );
}
