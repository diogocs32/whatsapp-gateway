import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { GroupDto, GroupParticipantAction, SessionDto } from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export function Groups() {
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [selected, setSelected] = useState<GroupDto | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [subject, setSubject] = useState('');
  const [participants, setParticipants] = useState('');
  const [addNumber, setAddNumber] = useState('');

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

  async function loadGroups() {
    if (!sessionId) return;
    const g = await guard(() => api.groups.list(sessionId));
    if (g) setGroups(g.sort((a, b) => a.subject.localeCompare(b.subject)));
  }
  useEffect(() => {
    setSelected(null);
    setGroups([]);
    if (sessionId) void loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function openGroup(jid: string) {
    setInvite(null);
    const g = await guard(() => api.groups.info(sessionId, jid));
    if (g) setSelected(g);
  }

  async function createGroup(e: FormEvent) {
    e.preventDefault();
    const parts = participants
      .split(/[\s,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!subject.trim() || parts.length === 0) {
      setError('Informe o nome e ao menos um participante');
      return;
    }
    const g = await guard(() =>
      api.groups.create(sessionId, subject.trim(), parts),
    );
    if (g) {
      setSubject('');
      setParticipants('');
      flash(`Grupo "${g.subject}" criado`);
      await loadGroups();
      setSelected(g);
    }
  }

  async function participantAction(
    action: GroupParticipantAction,
    targets: string[],
  ) {
    if (!selected) return;
    const ok = await guard(() =>
      api.groups.participants(sessionId, selected.id, action, targets),
    );
    if (ok) {
      flash('Participantes atualizados');
      await openGroup(selected.id);
      await loadGroups();
    }
  }

  async function getInvite(revoke = false) {
    if (!selected) return;
    const r = await guard(() =>
      revoke
        ? api.groups.revokeInvite(sessionId, selected.id)
        : api.groups.invite(sessionId, selected.id),
    );
    if (r) {
      setInvite(r.url);
      flash(revoke ? 'Link revogado e regenerado' : 'Link gerado');
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
            Grupos <span className="text-zinc-500">· gestão</span>
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
        <button
          onClick={() => void loadGroups()}
          disabled={!sessionId || busy}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-40"
        >
          Atualizar
        </button>
        {working.length === 0 && (
          <span className="text-sm text-amber-400">
            Nenhuma sessão conectada — conecte uma em Sessões.
          </span>
        )}
      </div>

      <main className="grid gap-6 p-6 lg:grid-cols-[360px_1fr]">
        <section className="space-y-4">
          <form
            onSubmit={createGroup}
            className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <p className="text-sm font-medium">Criar grupo</p>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Nome do grupo"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <textarea
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              rows={2}
              placeholder="Participantes (números separados por vírgula)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              Criar
            </button>
          </form>

          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-400">
              {groups.length} grupo(s)
            </div>
            <ul className="max-h-[60vh] divide-y divide-zinc-800 overflow-y-auto">
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => void openGroup(g.id)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-zinc-900/60 ${
                      selected?.id === g.id ? 'bg-zinc-900' : ''
                    }`}
                  >
                    <span className="truncate">
                      {g.subject || '(sem nome)'}
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-zinc-500">
                      {g.size}👤
                    </span>
                  </button>
                </li>
              ))}
              {groups.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-zinc-500">
                  Nenhum grupo carregado.
                </li>
              )}
            </ul>
          </div>
        </section>

        <section>
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          {info && <p className="mb-3 text-sm text-emerald-400">{info}</p>}
          {!selected ? (
            <p className="text-sm text-zinc-500">
              Selecione um grupo para ver participantes e ações.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-medium">{selected.subject}</h2>
                    <p className="font-mono text-xs text-zinc-500">
                      {selected.id}
                    </p>
                    {selected.desc && (
                      <p className="mt-2 text-sm text-zinc-400">
                        {selected.desc}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => void getInvite(false)}
                      disabled={busy}
                      className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                    >
                      Link convite
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Sair do grupo "${selected.subject}"?`))
                          void guard(() =>
                            api.groups.leave(sessionId, selected.id),
                          ).then(() => {
                            setSelected(null);
                            void loadGroups();
                          });
                      }}
                      className="rounded-md border border-red-900/60 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/40"
                    >
                      Sair
                    </button>
                  </div>
                </div>
                {invite && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs">
                    <a
                      href={invite}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-emerald-400 underline"
                    >
                      {invite}
                    </a>
                    <button
                      onClick={() =>
                        void navigator.clipboard?.writeText(invite)
                      }
                      className="ml-auto rounded border border-zinc-700 px-2 py-0.5"
                    >
                      copiar
                    </button>
                    <button
                      onClick={() => void getInvite(true)}
                      className="rounded border border-zinc-700 px-2 py-0.5"
                    >
                      revogar
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="mb-3 flex items-end gap-2">
                  <input
                    value={addNumber}
                    onChange={(e) => setAddNumber(e.target.value)}
                    placeholder="Adicionar número"
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => {
                      if (addNumber.trim()) {
                        void participantAction('add', [addNumber.trim()]);
                        setAddNumber('');
                      }
                    }}
                    disabled={busy}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
                  >
                    Adicionar
                  </button>
                </div>
                <ul className="max-h-[50vh] divide-y divide-zinc-800 overflow-y-auto text-sm">
                  {selected.participants.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="min-w-0 truncate text-xs">
                        <span className="font-medium">
                          {p.name ?? p.phone ?? p.id.split('@')[0]}
                        </span>
                        {p.phone && p.name && (
                          <span className="ml-2 font-mono text-zinc-500">
                            {p.phone}
                          </span>
                        )}
                        {!p.phone && !p.name && (
                          <span className="ml-2 font-mono text-zinc-600">
                            (LID — nº oculto)
                          </span>
                        )}
                        {p.role !== 'member' && (
                          <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400">
                            {p.role}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        {p.role === 'member' ? (
                          <ActionBtn
                            onClick={() =>
                              void participantAction('promote', [p.id])
                            }
                          >
                            promover
                          </ActionBtn>
                        ) : (
                          <ActionBtn
                            onClick={() =>
                              void participantAction('demote', [p.id])
                            }
                          >
                            rebaixar
                          </ActionBtn>
                        )}
                        <ActionBtn
                          danger
                          onClick={() =>
                            void participantAction('remove', [p.id])
                          }
                        >
                          remover
                        </ActionBtn>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ActionBtn({
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
      className={`rounded-md border px-2 py-0.5 text-xs ${
        danger
          ? 'border-red-900/60 text-red-400 hover:bg-red-950/40'
          : 'border-zinc-700 hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}
