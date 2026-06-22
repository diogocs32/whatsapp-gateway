import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Role, UsersListResponse } from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const ROLE_OPTIONS: Role[] = ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'];

function fmt(s: string): string {
  return new Date(s).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function Users() {
  const { signOut, user: me } = useAuth();
  const [data, setData] = useState<UsersListResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('OPERATOR');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setData(await api.users.list());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

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
    await act(async () => {
      await api.users.create({
        username: username.trim(),
        name: name.trim(),
        password,
        role,
      });
      setUsername('');
      setName('');
      setPassword('');
      setRole('OPERATOR');
      setCreating(false);
    });
  }

  function resetPwd(id: string, uname: string) {
    const pwd = prompt(`Nova senha para "${uname}" (mínimo 6 caracteres):`);
    if (!pwd) return;
    act(() => api.users.resetPassword(id, pwd));
  }

  function remove(id: string, uname: string) {
    if (!confirm(`Remover o usuário "${uname}"? Esta ação é irreversível.`)) return;
    act(() => api.users.remove(id));
  }

  const full = data ? data.usedSeats >= data.maxSeats : false;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Usuários <span className="text-zinc-500">· equipe</span>
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
            {data
              ? `${data.usedSeats}/${data.maxSeats} assentos usados`
              : 'carregando…'}{' '}
            — papéis: OWNER (gere tudo) · ADMIN (administra) · OPERATOR (opera) ·
            VIEWER (lê)
          </p>
          <button
            onClick={() => {
              setCreating((v) => !v);
              setError(null);
            }}
            disabled={full}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Novo usuário
          </button>
        </div>

        {full && (
          <p className="mb-3 text-xs text-amber-400">
            Limite de assentos atingido — remova um usuário ou aumente MAX_SEATS
            no servidor.
          </p>
        )}

        {creating && (
          <form
            onSubmit={onCreate}
            className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <label className="space-y-1">
              <span className="block text-xs text-zinc-400">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="joao.silva"
                className="w-44 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-zinc-400">Nome</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="João Silva"
                className="w-48 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-zinc-400">
                Senha (mín. 6)
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-40 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-zinc-400">Papel</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Criado</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data?.users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                    Nenhum usuário.
                  </td>
                </tr>
              )}
              {data?.users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-900/40">
                  <td className="px-4 py-3 font-mono text-xs">
                    {u.username}
                    {me?.id === u.id && (
                      <span className="ml-1 text-zinc-500">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        act(() =>
                          api.users.update(u.id, {
                            role: e.target.value as Role,
                          }),
                        )
                      }
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{fmt(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => resetPwd(u.id, u.username)}
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                      >
                        Senha
                      </button>
                      <button
                        onClick={() => remove(u.id, u.username)}
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
