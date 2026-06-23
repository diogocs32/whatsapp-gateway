import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuditLogDto } from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const PAGE = 100;

function statusColor(code: number): string {
  if (code < 300) return 'text-emerald-400';
  if (code < 500) return 'text-amber-400';
  return 'text-red-400';
}

export function Audit() {
  const { signOut } = useAuth();
  const [rows, setRows] = useState<AuditLogDto[]>([]);
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(off: number) {
    try {
      const batch = await api.audit.list(PAGE, off);
      setRows((prev) => (off === 0 ? batch : [...prev, ...batch]));
      setDone(batch.length < PAGE);
      setOffset(off + batch.length);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load(0);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Auditoria <span className="text-zinc-500">· quem fez o quê</span>
          </h1>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Sair
        </button>
      </header>

      <main className="p-6">
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <p className="mb-4 text-sm text-zinc-400">
          {rows.length} registro(s) — ações que alteram estado (exceto envio de
          mensagens).
        </p>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Ator</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                    Nenhum registro ainda.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-900/40">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-400">
                    {new Date(r.at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5">{r.actor}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    <span className="text-zinc-500">{r.method}</span> {r.path}
                  </td>
                  <td className={`px-4 py-2.5 ${statusColor(r.statusCode)}`}>
                    {r.statusCode}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500">{r.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!done && rows.length > 0 && (
          <button
            onClick={() => load(offset)}
            className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Carregar mais
          </button>
        )}
      </main>
    </div>
  );
}
