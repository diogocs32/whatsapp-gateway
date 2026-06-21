import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { WEBHOOK_EVENTS, type WebhookDto } from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export function Webhooks() {
  const { signOut } = useAuth();
  const [webhooks, setWebhooks] = useState<WebhookDto[]>([]);
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['*']);
  const [secret, setSecret] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [tested, setTested] = useState<string | null>(null);

  async function refresh() {
    try {
      setWebhooks(await api.webhooks.list());
    } catch {
      /* noop */
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  function toggleEvent(ev: string) {
    setEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    );
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (events.length === 0) {
      setError('Selecione ao menos um evento');
      return;
    }
    try {
      await api.webhooks.create({
        url: url.trim(),
        events,
        secret: secret.trim() || undefined,
        maxAttempts,
      });
      setUrl('');
      setSecret('');
      setEvents(['*']);
      setCreating(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function doTest(id: string) {
    try {
      await api.webhooks.test(id);
      setTested(id);
      setTimeout(() => setTested(null), 2500);
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
            Webhooks <span className="text-zinc-500">· integrações</span>
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
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            {webhooks.length} webhook(s) — entrega com HMAC SHA-512 + retries
          </p>
          <button
            onClick={() => setCreating((v) => !v)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Novo webhook
          </button>
        </div>

        {creating && (
          <form
            onSubmit={onCreate}
            className="mb-4 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <label className="block space-y-1">
              <span className="text-xs text-zinc-400">URL de destino</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://seu-servico.com/webhook"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <div className="space-y-1">
              <span className="text-xs text-zinc-400">Eventos</span>
              <div className="flex flex-wrap gap-3">
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={events.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                    />
                    <span className="font-mono text-xs">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="space-y-1">
                <span className="block text-xs text-zinc-400">
                  Secret HMAC (opcional)
                </span>
                <input
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="≥ 8 caracteres"
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-xs text-zinc-400">
                  Máx. tentativas
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value) || 5)}
                  className="w-28 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
            </div>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
              Criar
            </button>
          </form>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Eventos</th>
                <th className="px-4 py-3 font-medium">HMAC</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {webhooks.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    Nenhum webhook. Crie um para receber eventos.
                  </td>
                </tr>
              )}
              {webhooks.map((w) => (
                <tr key={w.id} className="hover:bg-zinc-900/40">
                  <td className="max-w-xs truncate px-4 py-3 font-mono text-xs">
                    {w.url}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {w.events.join(', ')}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {w.hasSecret ? 'sim' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        w.enabled
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-zinc-600/30 text-zinc-300'
                      }`}
                    >
                      {w.enabled ? 'ativo' : 'inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => doTest(w.id)}
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                      >
                        {tested === w.id ? 'enviado ✓' : 'Testar'}
                      </button>
                      <button
                        onClick={() =>
                          act(() =>
                            w.enabled
                              ? api.webhooks.disable(w.id)
                              : api.webhooks.enable(w.id),
                          )
                        }
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                      >
                        {w.enabled ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Excluir este webhook?'))
                            act(() => api.webhooks.remove(w.id));
                        }}
                        className="rounded-md border border-red-900/60 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/40"
                      >
                        Excluir
                      </button>
                    </div>
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
