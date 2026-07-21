import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ProxyDto, SessionDto, SessionStatus } from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const STATUS_META: Record<SessionStatus, { label: string; cls: string }> = {
  WORKING: { label: 'Conectado', cls: 'bg-emerald-500/15 text-emerald-400' },
  SCAN_QR_CODE: {
    label: 'Aguardando QR',
    cls: 'bg-amber-500/15 text-amber-400',
  },
  PAIRING_CODE: {
    label: 'Código de pareamento',
    cls: 'bg-amber-500/15 text-amber-400',
  },
  STARTING: { label: 'Iniciando', cls: 'bg-sky-500/15 text-sky-400' },
  STOPPED: { label: 'Parado', cls: 'bg-zinc-600/30 text-zinc-300' },
  FAILED: { label: 'Falhou', cls: 'bg-red-500/15 text-red-400' },
  DEGRADED: { label: 'Degradado', cls: 'bg-orange-500/15 text-orange-400' },
};

function StatusBadge({ status }: { status: SessionStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function ConnectModal({
  session,
  onClose,
}: {
  session: SessionDto;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>(session.status);
  const [phone, setPhone] = useState(session.phoneNumber ?? '');
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;
    const tick = async () => {
      try {
        const r = await api.sessions.qr(session.id);
        if (closedRef.current) return;
        setQr(r.qr);
        setStatus(r.status);
      } catch {
        /* ignora durante o boot do socket */
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      closedRef.current = true;
      clearInterval(id);
    };
  }, [session.id]);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setCode(null);
    try {
      const r = await api.sessions.pairingCode(session.id, phone);
      setCode(r.code);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  // Credencial nova + socket novo → QR novo. Restart puro não serve aqui: se a sessão foi
  // desconectada pelo celular, ele reconecta com as credenciais mortas e nunca gera QR.
  async function regenerate() {
    setRegenerating(true);
    setErr(null);
    setCode(null);
    try {
      await api.sessions.newQr(session.id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setTimeout(() => setRegenerating(false), 1500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">
            Conectar <span className="text-zinc-400">{session.name}</span>
          </h2>
          <StatusBadge status={status} />
        </div>

        {status === 'WORKING' ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-2xl text-emerald-400">
              ✓
            </div>
            <p className="text-emerald-400">Conectado com sucesso!</p>
            <button
              onClick={onClose}
              className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Concluir
            </button>
          </div>
        ) : (
          <>
            <div className="grid place-items-center rounded-xl bg-white p-3">
              {qr ? (
                <img src={qr} alt="QR Code" className="h-64 w-64" />
              ) : (
                <div className="grid h-64 w-64 place-items-center text-sm text-zinc-500">
                  Gerando QR…
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-zinc-400">
              Abra o WhatsApp → Aparelhos conectados → Conectar aparelho e
              escaneie.
            </p>

            <details className="mt-4 rounded-lg border border-zinc-800 p-3">
              <summary className="cursor-pointer text-sm text-zinc-300">
                Ou parear por número (código de 8 dígitos)
              </summary>
              <form onSubmit={requestCode} className="mt-3 flex gap-2">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5511999999999"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <button className="rounded-lg bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600">
                  Gerar
                </button>
              </form>
              {code && (
                <p className="mt-3 text-center font-mono text-2xl tracking-widest text-emerald-400">
                  {code}
                </p>
              )}
              {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
            </details>

            <div className="mt-4 flex gap-2">
              <button
                onClick={regenerate}
                disabled={regenerating}
                className="flex-1 rounded-lg bg-zinc-700 py-2 text-sm hover:bg-zinc-600 disabled:opacity-50"
              >
                {regenerating ? 'Gerando…' : 'Gerar novo QR'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Sessions() {
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [engine, setEngine] = useState<'BAILEYS' | 'WWEBJS'>('BAILEYS');
  // D-008 — proxy opcional na criação: '' = sem proxy; senão, id de um proxy LIVRE.
  const [proxyId, setProxyId] = useState('');
  const [availableProxies, setAvailableProxies] = useState<ProxyDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connect, setConnect] = useState<SessionDto | null>(null);

  async function refresh() {
    try {
      setSessions(await api.sessions.list());
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);

  // Carrega os proxies livres ao abrir o formulário (a lista muda conforme sessões usam proxies).
  useEffect(() => {
    if (!creating) return;
    api.proxies
      .listAvailable()
      .then(setAvailableProxies)
      .catch(() => setAvailableProxies([]));
  }, [creating]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const s = await api.sessions.create({
        name: name.trim(),
        engine,
        ...(proxyId ? { proxyId } : {}),
      });
      setName('');
      setProxyId('');
      setCreating(false);
      await refresh();
      setConnect(s);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function doAction(fn: () => Promise<unknown>) {
    try {
      await fn();
      await refresh();
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
            Sessões <span className="text-zinc-500">· WhatsApp</span>
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
          <p className="text-sm text-zinc-400">{sessions.length} sessão(ões)</p>
          <button
            onClick={() => setCreating((v) => !v)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Nova sessão
          </button>
        </div>

        {creating && (
          <form
            onSubmit={onCreate}
            className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <label className="space-y-1">
              <span className="text-xs text-zinc-400">
                Nome (a-z, 0-9, _ , -)
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="vendas-01"
                className="block rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-400">Engine</span>
              <select
                value={engine}
                onChange={(e) =>
                  setEngine(e.target.value as 'BAILEYS' | 'WWEBJS')
                }
                className="block rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                <option value="BAILEYS">Baileys (recomendado)</option>
                <option value="WWEBJS">WhatsApp Web.js</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-400">
                Proxy (só os livres aparecem)
              </span>
              <select
                value={proxyId}
                onChange={(e) => setProxyId(e.target.value)}
                className="block rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">Sem proxy (padrão)</option>
                {availableProxies.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.position} · {p.label ?? `${p.host}:${p.port}`}
                    {p.country ? ` · ${p.country}` : ''} · {p.status}
                  </option>
                ))}
              </select>
            </label>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
              Criar e conectar
            </button>
          </form>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Engine</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sessions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    Nenhuma sessão ainda. Crie a primeira.
                  </td>
                </tr>
              )}
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-900/40">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                    {s.lastError && s.status !== 'WORKING' && (
                      <span className="ml-2 text-xs text-zinc-500">
                        {s.lastError}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {s.mePushName ? `${s.mePushName} · ` : ''}
                    {s.meJid ? s.meJid.split(':')[0].split('@')[0] : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{s.engine}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {s.status !== 'WORKING' && (
                        <button
                          onClick={() =>
                            doAction(() => api.sessions.start(s.id)).then(() =>
                              setConnect(s),
                            )
                          }
                          className="rounded-md bg-emerald-600/90 px-2.5 py-1 text-xs text-white hover:bg-emerald-500"
                        >
                          Conectar
                        </button>
                      )}
                      {s.status === 'WORKING' && (
                        <button
                          onClick={() =>
                            doAction(() => api.sessions.stop(s.id))
                          }
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                        >
                          Parar
                        </button>
                      )}
                      <button
                        onClick={() =>
                          doAction(() => api.sessions.restart(s.id))
                        }
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                      >
                        Reiniciar
                      </button>
                      <button
                        onClick={() =>
                          doAction(() => api.sessions.logout(s.id))
                        }
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                      >
                        Logout
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir a sessão "${s.name}"?`))
                            doAction(() => api.sessions.remove(s.id));
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

      {connect && (
        <ConnectModal
          session={connect}
          onClose={() => {
            setConnect(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
