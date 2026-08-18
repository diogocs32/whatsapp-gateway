import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ApiKeyDto, CreatedApiKeyDto } from '@contracts';
import { api, BASE } from '../lib/api';
import { useAuth } from '../lib/auth';

function fmt(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ApiKeys() {
  const { signOut } = useAuth();
  const [keys, setKeys] = useState<ApiKeyDto[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<CreatedApiKeyDto | null>(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    try {
      setKeys(await api.apiKeys.list());
    } catch {
      /* noop */
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Informe um nome para a chave');
      return;
    }
    try {
      const created = await api.apiKeys.create({ name: name.trim() });
      setJustCreated(created);
      setName('');
      setCreating(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function revoke(id: string) {
    if (
      !confirm(
        'Revogar esta chave? Integrações que a usam vão parar de funcionar.',
      )
    )
      return;
    try {
      await api.apiKeys.revoke(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function copyKey(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível (http) — usuário copia manualmente */
    }
  }

  const active = keys.filter((k) => !k.revokedAt).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            API keys <span className="text-zinc-500">· integrações</span>
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
            {active} chave(s) ativa(s) — autentique chamadas externas (n8n etc.)
            com o header{' '}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs">
              X-Api-Key
            </code>
          </p>
          <button
            onClick={() => {
              setCreating((v) => !v);
              setError(null);
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Nova chave
          </button>
        </div>

        {/* Chave recém-criada — exibida UMA ÚNICA VEZ */}
        {justCreated && (
          <div className="mb-4 rounded-xl border border-emerald-700/60 bg-emerald-950/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-300">
                Chave “{justCreated.name}” criada — copie agora, ela não será
                exibida de novo
              </p>
              <button
                onClick={() => setJustCreated(null)}
                className="text-zinc-400 hover:text-zinc-200"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-emerald-200">
                {justCreated.key}
              </code>
              <button
                onClick={() => copyKey(justCreated.key)}
                className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                {copied ? 'Copiado ✓' : 'Copiar'}
              </button>
            </div>
            <p className="mt-2 font-mono text-xs text-zinc-500">
              Ex.: curl -H &quot;X-Api-Key: {justCreated.key}&quot; {BASE}
              /api/sessions/&lt;nome-da-sessao&gt;/messages/text
            </p>
          </div>
        )}

        {creating && (
          <form
            onSubmit={onCreate}
            className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <label className="space-y-1">
              <span className="block text-xs text-zinc-400">
                Nome da chave (identifica a integração)
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex.: n8n-producao"
                maxLength={60}
                className="w-72 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
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
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Prefixo</th>
                <th className="px-4 py-3 font-medium">Último uso</th>
                <th className="px-4 py-3 font-medium">Criada</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {keys.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    Nenhuma chave. Crie uma para autenticar integrações
                    externas.
                  </td>
                </tr>
              )}
              {keys.map((k) => {
                const revoked = !!k.revokedAt;
                return (
                  <tr key={k.id} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-3">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                      {k.prefix}…
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {fmt(k.lastUsedAt)}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {fmt(k.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          revoked
                            ? 'bg-zinc-600/30 text-zinc-300'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {revoked ? 'revogada' : 'ativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {!revoked && (
                          <button
                            onClick={() => revoke(k.id)}
                            className="rounded-md border border-red-900/60 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/40"
                          >
                            Revogar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
